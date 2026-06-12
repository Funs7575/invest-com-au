/**
 * GET /api/advisor-portal/firm-leads
 *
 * Returns all professional_leads rows for every member of the calling
 * advisor's firm. Restricted to firm admins (is_firm_admin = true).
 *
 * Query params:
 *   status  — filter by lead status (optional)
 *   search  — search name/email (optional)
 *
 * PATCH /api/advisor-portal/firm-leads
 *
 * Reassigns a lead to a different firm member.
 * Body: { lead_id: number, professional_id: number }
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { logger } from "@/lib/logger";
import { notifyUserByEmail } from "@/lib/notifications";
import { sendEmail } from "@/lib/resend";

const log = logger("api:advisor-portal:firm-leads");

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!await isAllowed("advisor_firm_leads_get", ipKey(request), { max: 30, refillPerSec: 0.5 })) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const advisorId = await requireAdvisorSession(request);
  if (!advisorId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const admin = createAdminClient();

  // Verify caller is a firm admin
  const { data: advisor } = await admin
    .from("professionals")
    .select("id, firm_id, is_firm_admin")
    .eq("id", advisorId)
    .maybeSingle();

  if (!advisor?.is_firm_admin || !advisor.firm_id) {
    return NextResponse.json({ error: "Firm admin access required." }, { status: 403 });
  }

  // Fetch all members of the firm
  const { data: members } = await admin
    .from("professionals")
    .select("id, name, slug")
    .eq("firm_id", advisor.firm_id)
    .eq("status", "active");

  if (!members || members.length === 0) {
    return NextResponse.json({ leads: [], members: [] });
  }

  const memberIds = members.map((m) => m.id);

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const search = url.searchParams.get("search")?.toLowerCase();

  let query = admin
    .from("professional_leads")
    .select("id, professional_id, user_name, user_email, user_phone, message, source_page, status, advisor_notes, contacted_at, converted_at, created_at, quality_score, bill_amount_cents, billed")
    .in("professional_id", memberIds)
    .order("created_at", { ascending: false })
    .limit(200);

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data: leads, error } = await query;

  if (error) {
    log.error("firm-leads fetch failed", { error: error.message });
    return NextResponse.json({ error: "Failed to fetch." }, { status: 500 });
  }

  // Attach member name to each lead
  const memberMap = new Map(members.map((m) => [m.id, m]));
  const enriched = (leads ?? [])
    .filter((l) => {
      if (!search) return true;
      return (
        l.user_name?.toLowerCase().includes(search) ||
        l.user_email?.toLowerCase().includes(search) ||
        (l.user_phone ?? "").includes(search)
      );
    })
    .map((l) => ({
      ...l,
      professional_name: memberMap.get(l.professional_id)?.name ?? "Unknown",
      professional_slug: memberMap.get(l.professional_id)?.slug ?? null,
    }));

  return NextResponse.json({ leads: enriched, members });
}

const AssignBody = z.object({
  lead_id: z.number().int().positive(),
  professional_id: z.number().int().positive(),
});

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  if (!await isAllowed("advisor_firm_leads_patch", ipKey(request), { max: 20, refillPerSec: 0.2 })) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const advisorId = await requireAdvisorSession(request);
  if (!advisorId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = AssignBody.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid body." },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  // Verify caller is firm admin and target professional is in same firm
  const { data: caller } = await admin
    .from("professionals")
    .select("firm_id, is_firm_admin")
    .eq("id", advisorId)
    .maybeSingle();

  if (!caller?.is_firm_admin || !caller.firm_id) {
    return NextResponse.json({ error: "Firm admin access required." }, { status: 403 });
  }

  const { data: target } = await admin
    .from("professionals")
    .select("id, firm_id")
    .eq("id", parsed.data.professional_id)
    .eq("firm_id", caller.firm_id)
    .maybeSingle();

  if (!target) {
    return NextResponse.json({ error: "Target advisor not in your firm." }, { status: 403 });
  }

  // Capture the lead's CURRENT assignee before we overwrite it, so the audit
  // row can record reassigned_from. Also confirms the lead exists + belongs
  // to a member of this firm (a firm admin must not move another firm's lead).
  const { data: existingLead } = await admin
    .from("professional_leads")
    .select("professional_id")
    .eq("id", parsed.data.lead_id)
    .maybeSingle();

  const previousProfessionalId =
    (existingLead as { professional_id: number } | null)?.professional_id ?? null;

  // Verify the lead currently belongs to a member of the caller's firm.
  if (previousProfessionalId !== null) {
    const { data: prevOwner } = await admin
      .from("professionals")
      .select("id")
      .eq("id", previousProfessionalId)
      .eq("firm_id", caller.firm_id)
      .maybeSingle();
    if (!prevOwner) {
      return NextResponse.json({ error: "Lead not in your firm." }, { status: 403 });
    }
  }

  const { error } = await admin
    .from("professional_leads")
    .update({ professional_id: parsed.data.professional_id })
    .eq("id", parsed.data.lead_id);

  if (error) {
    log.error("lead reassign failed", { error: error.message });
    return NextResponse.json({ error: "Failed to reassign." }, { status: 500 });
  }

  // ── Assignment audit trail (mega-session #13) ──
  // Record the manual reassignment. Best-effort: a missing audit row must not
  // fail the reassignment that already succeeded.
  try {
    const { writeAssignment } = await import("@/lib/firm-routing-runtime");
    await writeAssignment(admin, {
      firmId: caller.firm_id,
      leadRef: String(parsed.data.lead_id),
      professionalId: parsed.data.professional_id,
      assignedBy: "manual",
      reassignedFrom:
        previousProfessionalId !== null &&
        previousProfessionalId !== parsed.data.professional_id
          ? previousProfessionalId
          : null,
    });
  } catch (auditErr) {
    log.warn("lead reassign audit write failed", {
      error: auditErr instanceof Error ? auditErr.message : String(auditErr),
      leadId: parsed.data.lead_id,
    });
  }

  // ── Best-effort: notify the newly assigned advisor ───────────────────
  // Fetch the target advisor details and the lead so we can send a useful
  // notification. Errors here are caught and logged — they MUST NOT fail
  // the reassignment response.
  void (async () => {
    try {
      // Fetch target advisor name and email.
      const { data: targetAdvisor } = await admin
        .from("professionals")
        .select("name, email")
        .eq("id", parsed.data.professional_id)
        .maybeSingle();

      if (!targetAdvisor?.email) {
        log.warn("lead reassign notify: no email for target advisor", {
          professionalId: parsed.data.professional_id,
        });
        return;
      }

      // Fetch lead details for the notification body.
      const { data: lead } = await admin
        .from("professional_leads")
        .select("user_name, user_email, user_phone, source_page, message, status")
        .eq("id", parsed.data.lead_id)
        .maybeSingle();

      const leadName = lead?.user_name ?? "A new lead";
      const portalUrl = "https://invest.com.au/advisor-portal";
      const advisorFirst =
        (targetAdvisor.name ?? "Advisor").trim().split(" ")[0] ?? "Advisor";

      // In-app notification (fire-and-forget; deduped by delivery key).
      const deliveryKey = `firm-lead-assign:${parsed.data.lead_id}:${parsed.data.professional_id}`;
      await notifyUserByEmail(targetAdvisor.email, {
        type: "deal",
        title: `New lead assigned to you: ${leadName}`,
        body: `A firm admin has assigned a lead from ${leadName} to your queue. Log in to the advisor portal to follow up.`,
        linkUrl: portalUrl,
        emailDeliveryKey: deliveryKey,
      });

      // Email notification.
      const html = `<div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;color:#334155">
        <div style="background:#0f172a;padding:20px 24px;border-radius:12px 12px 0 0">
          <h1 style="color:white;margin:0;font-size:18px">Lead Assigned to You</h1>
        </div>
        <div style="background:#f8fafc;padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px">
          <p style="font-size:15px">Hi ${advisorFirst},</p>
          <p style="font-size:14px;color:#64748b">A lead has been reassigned to you by your firm admin.</p>
          <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:16px;margin:16px 0">
            <table style="width:100%;font-size:14px;color:#334155;border-collapse:collapse">
              <tr><td style="padding:4px 8px 4px 0;font-weight:600">Lead:</td><td style="padding:4px 0">${leadName}</td></tr>
              ${lead?.user_email ? `<tr><td style="padding:4px 8px 4px 0;font-weight:600">Email:</td><td style="padding:4px 0"><a href="mailto:${lead.user_email}" style="color:#2563eb">${lead.user_email}</a></td></tr>` : ""}
              ${lead?.user_phone ? `<tr><td style="padding:4px 8px 4px 0;font-weight:600">Phone:</td><td style="padding:4px 0"><a href="tel:${lead.user_phone}" style="color:#2563eb">${lead.user_phone}</a></td></tr>` : ""}
              ${lead?.source_page ? `<tr><td style="padding:4px 8px 4px 0;font-weight:600">Source:</td><td style="padding:4px 0">${lead.source_page}</td></tr>` : ""}
            </table>
          </div>
          <p style="font-size:14px;color:#64748b"><strong>Please follow up promptly.</strong></p>
          <div style="text-align:center;margin:24px 0">
            <a href="${portalUrl}" style="display:inline-block;padding:12px 32px;background:#f59e0b;color:white;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600">View in Portal →</a>
          </div>
          <p style="font-size:12px;color:#94a3b8;margin-top:20px">Manage your leads in the <a href="${portalUrl}" style="color:#2563eb">advisor portal</a>.</p>
        </div>
      </div>`;

      const { ok: emailOk } = await sendEmail({
        to: targetAdvisor.email,
        subject: `Lead assigned to you: ${leadName} — Invest.com.au`,
        html,
        from: "Invest.com.au <hello@invest.com.au>",
      });

      if (!emailOk) {
        log.warn("lead reassign notify: email send failed", {
          to: targetAdvisor.email,
          leadId: parsed.data.lead_id,
        });
      } else {
        log.info("lead reassign notify: sent", {
          to: targetAdvisor.email,
          leadId: parsed.data.lead_id,
          professionalId: parsed.data.professional_id,
        });
      }
    } catch (notifyErr) {
      // Best-effort: do NOT propagate — the reassignment already succeeded.
      log.error("lead reassign notify: unexpected error", {
        error: notifyErr instanceof Error ? notifyErr.message : String(notifyErr),
        leadId: parsed.data.lead_id,
        professionalId: parsed.data.professional_id,
      });
    }
  })();

  return NextResponse.json({ ok: true });
}
