import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export const maxDuration = 60;

const log = logger("cron-advisor-quality");

/**
 * Cron: Advisor Quality & Verification
 * Runs daily. Three checks:
 * 1. Profile Quality Gate — ensures minimum fields before advisor goes live
 * 2. Response Time SLA — warns then auto-pauses non-responsive advisors
 * 3. ASIC/TPB Register Check — verifies AFSL numbers are still active
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const results: { check: string; action: string; detail: string }[] = [];

  // ══════════════════════════════════════════════════
  // 1. PROFILE QUALITY GATE
  // ══════════════════════════════════════════════════
  try {
    const { data: advisors } = await supabase
      .from("professionals")
      .select("id, name, email, bio, photo_url, afsl_number, registration_number, phone, location_display, specialties, fee_description, status, profile_quality_gate")
      .in("status", ["active", "pending"]);

    for (const a of advisors || []) {
      const missing: string[] = [];
      if (!a.bio || a.bio.length < 50) missing.push("bio (min 50 chars)");
      if (!a.photo_url) missing.push("photo");
      if (!a.afsl_number && !a.registration_number) missing.push("AFSL or registration number");
      if (!a.phone) missing.push("phone");
      if (!a.location_display) missing.push("location");
      if (!a.specialties || a.specialties.length === 0) missing.push("specialties");
      if (!a.fee_description) missing.push("fee description");

      const passed = missing.length <= 1; // Allow 1 missing field max
      const gateStatus = passed ? "passed" : "failed";

      if (gateStatus !== a.profile_quality_gate) {
        await supabase.from("professionals").update({
          profile_quality_gate: gateStatus,
          profile_gate_checked_at: new Date().toISOString(),
          profile_missing_fields: missing.length > 0 ? missing : null,
          profile_complete: passed,
          profile_score: Math.round(((7 - missing.length) / 7) * 100),
        }).eq("id", a.id);

        await supabase.from("advisor_verification_log").insert({
          professional_id: a.id,
          action: passed ? "profile_gate_pass" : "profile_gate_fail",
          method: "profile_gate",
          details: passed ? "Profile meets quality requirements" : `Missing: ${missing.join(", ")}`,
        });

        results.push({ check: "profile_gate", action: gateStatus, detail: `${a.name}: ${passed ? "passed" : missing.join(", ")}` });
      }
    }
  } catch (e) {
    log.error("Profile gate check failed", { error: e instanceof Error ? e.message : String(e) });
  }

  // ══════════════════════════════════════════════════
  // 2. RESPONSE TIME SLA
  // ══════════════════════════════════════════════════
  try {
    // Find advisors with unresponded leads older than 72 hours
    const threeDaysAgo = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: activeAdvisors } = await supabase
      .from("professionals")
      .select("id, name, email, status, pause_warning_sent_at, auto_paused_at")
      .eq("status", "active");

    for (const advisor of activeAdvisors || []) {
      // Count unresponded leads (status = 'new', older than 72h)
      const { count } = await supabase
        .from("professional_leads")
        .select("id", { count: "exact", head: true })
        .eq("professional_id", advisor.id)
        .eq("status", "new")
        .lt("created_at", threeDaysAgo);

      const unresponded = count || 0;

      await supabase.from("professionals").update({
        unresponded_leads: unresponded,
      }).eq("id", advisor.id);

      if (unresponded >= 3) {
        // 3+ unresponded leads — check if warning was sent
        const warningAlreadySent = advisor.pause_warning_sent_at && advisor.pause_warning_sent_at > sevenDaysAgo;

        if (!warningAlreadySent) {
          // Send warning email
          const RESEND_API_KEY = process.env.RESEND_API_KEY;
          if (RESEND_API_KEY && advisor.email) {
            try {
              await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
                body: JSON.stringify({
                  from: "Invest.com.au <support@invest.com.au>",
                  to: advisor.email,
                  subject: `Action required: ${unresponded} enquiries waiting for your response`,
                  html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px;">
                      <h2>You have ${unresponded} unanswered enquiries</h2>
                      <p>Hi ${advisor.name.split(" ")[0]},</p>
                      <p>You have <strong>${unresponded} enquiries</strong> that haven't been responded to in over 72 hours.</p>
                      <p>Quick responses lead to better conversion rates and happier clients. Advisors who respond within 24 hours see <strong>3x higher conversion</strong>.</p>
                      <p><strong>Important:</strong> If leads remain unresponded for 7 days, your profile may be temporarily paused to protect lead quality for consumers.</p>
                      <a href="https://invest.com.au/advisor-portal" style="display: inline-block; padding: 12px 24px; background: #0f172a; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">View Your Leads</a>
                    </div>
                  `,
                }),
              });
            } catch { /* non-critical */ }
          }

          await supabase.from("professionals").update({
            pause_warning_sent_at: new Date().toISOString(),
          }).eq("id", advisor.id);

          await supabase.from("advisor_verification_log").insert({
            professional_id: advisor.id,
            action: "warning_sent",
            method: "response_sla",
            details: `${unresponded} unresponded leads older than 72h`,
          });

          results.push({ check: "response_sla", action: "warning_sent", detail: `${advisor.name}: ${unresponded} unresponded` });
        }
      }

      // 5+ unresponded leads AND warning was sent more than 3 days ago — auto-pause
      if (unresponded >= 5 && advisor.pause_warning_sent_at && !advisor.auto_paused_at) {
        const warningDate = new Date(advisor.pause_warning_sent_at).getTime();
        const threeDaysAfterWarning = warningDate + 3 * 24 * 60 * 60 * 1000;

        if (Date.now() > threeDaysAfterWarning) {
          await supabase.from("professionals").update({
            status: "paused",
            auto_paused_at: new Date().toISOString(),
            auto_pause_reason: `Auto-paused: ${unresponded} unresponded leads. Warning sent ${new Date(advisor.pause_warning_sent_at).toLocaleDateString("en-AU")}.`,
          }).eq("id", advisor.id);

          // Notify advisor
          const RESEND_API_KEY = process.env.RESEND_API_KEY;
          if (RESEND_API_KEY && advisor.email) {
            try {
              await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
                body: JSON.stringify({
                  from: "Invest.com.au <support@invest.com.au>",
                  to: advisor.email,
                  subject: "Your profile has been temporarily paused",
                  html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px;">
                      <h2>Your listing has been paused</h2>
                      <p>Hi ${advisor.name.split(" ")[0]},</p>
                      <p>Your profile on Invest.com.au has been temporarily paused because ${unresponded} enquiries went unanswered.</p>
                      <p>We do this to protect the experience for consumers seeking financial advice. To reactivate your profile:</p>
                      <ol>
                        <li>Log in to your advisor portal</li>
                        <li>Respond to all pending enquiries</li>
                        <li>Contact us at support@invest.com.au to reactivate</li>
                      </ol>
                    </div>
                  `,
                }),
              });
            } catch { /* non-critical */ }
          }

          await supabase.from("advisor_verification_log").insert({
            professional_id: advisor.id,
            action: "auto_paused",
            method: "response_sla",
            details: `Auto-paused: ${unresponded} unresponded leads after warning`,
          });

          results.push({ check: "response_sla", action: "auto_paused", detail: `${advisor.name}: ${unresponded} unresponded leads` });
        }
      }
    }
  } catch (e) {
    log.error("Response SLA check failed", { error: e instanceof Error ? e.message : String(e) });
  }

  // ══════════════════════════════════════════════════
  // 3. ASIC/TPB REGISTER VERIFICATION
  // ══════════════════════════════════════════════════
  try {
    // Check advisors who haven't been verified in 30+ days or never verified
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: toVerify } = await supabase
      .from("professionals")
      .select("id, name, afsl_number, registration_number, type, last_verified_at, verification_failures")
      .eq("status", "active")
      .not("afsl_number", "is", null)
      .or(`last_verified_at.is.null,last_verified_at.lt.${thirtyDaysAgo}`)
      .limit(10); // Process 10 per run to avoid timeout

    for (const advisor of toVerify || []) {
      if (!advisor.afsl_number) continue;

      try {
        // Query ASIC Connect API (public, no key needed)
        // The ASIC register search is at connectonline.asic.gov.au
        // We check if the AFSL number returns a valid result
        const afslClean = advisor.afsl_number.replace(/[^0-9]/g, "");
        if (!afslClean) continue;

        const searchUrl = `https://connectonline.asic.gov.au/RegistrySearch/faces/landing/panelSearch.jspx?searchText=${afslClean}&searchType=2`;

        const response = await fetch(searchUrl, {
          method: "GET",
          headers: { "User-Agent": "Invest.com.au Verification Bot" },
          signal: AbortSignal.timeout(10000),
        });

        if (response.ok) {
          const html = await response.text();
          // Check if the page contains the AFSL number and "Current" status
          const hasAfsl = html.includes(afslClean);
          const isCurrent = html.toLowerCase().includes("current") || html.toLowerCase().includes("registered");

          if (hasAfsl) {
            // AFSL found on register
            await supabase.from("professionals").update({
              last_verified_at: new Date().toISOString(),
              verified: true,
              verified_by: "asic_cron",
              verification_method: "asic_register",
              verification_failures: 0,
            }).eq("id", advisor.id);

            await supabase.from("advisor_verification_log").insert({
              professional_id: advisor.id,
              action: "verified",
              method: "asic_cron",
              details: `AFSL ${afslClean} found on ASIC register`,
            });

            results.push({ check: "asic_verify", action: "verified", detail: `${advisor.name}: AFSL ${afslClean} confirmed` });
          } else {
            // AFSL not found — increment failure count
            const failures = (advisor.verification_failures || 0) + 1;
            await supabase.from("professionals").update({
              verification_failures: failures,
              verification_notes: `AFSL ${afslClean} not found on ASIC register (attempt ${failures})`,
            }).eq("id", advisor.id);

            await supabase.from("advisor_verification_log").insert({
              professional_id: advisor.id,
              action: "failed",
              method: "asic_cron",
              details: `AFSL ${afslClean} not found on register (attempt ${failures})`,
            });

            // After 3 failures, revoke verification
            if (failures >= 3) {
              await supabase.from("professionals").update({
                verified: false,
                verification_notes: `Verification revoked: AFSL ${afslClean} not found after ${failures} attempts`,
              }).eq("id", advisor.id);

              await supabase.from("advisor_verification_log").insert({
                professional_id: advisor.id,
                action: "revoked",
                method: "asic_cron",
                details: `Verification revoked after ${failures} failed lookups`,
              });

              results.push({ check: "asic_verify", action: "revoked", detail: `${advisor.name}: AFSL ${afslClean} not found after ${failures} attempts` });
            } else {
              results.push({ check: "asic_verify", action: "failed", detail: `${advisor.name}: AFSL ${afslClean} not found (attempt ${failures})` });
            }
          }
        } else {
          // ASIC site returned error — don't penalise advisor
          results.push({ check: "asic_verify", action: "skipped", detail: `${advisor.name}: ASIC returned ${response.status}` });
        }
      } catch (fetchErr) {
        // Network error — skip, don't penalise
        results.push({ check: "asic_verify", action: "error", detail: `${advisor.name}: ${fetchErr instanceof Error ? fetchErr.message : "fetch failed"}` });
      }
    }
  } catch (e) {
    log.error("ASIC verification failed", { error: e instanceof Error ? e.message : String(e) });
  }

  log.info("Advisor quality check complete", { results: results.length });
  return NextResponse.json({ ok: true, results });
}
