/**
 * Side-effect side of the advisor application auto-verification.
 *
 * The classifier in `./advisor-application-classifier.ts` is pure and
 * knows nothing about HTTP, Supabase or email. This file wires it up
 * to the real world:
 *
 *   1. Loads the advisor_applications row
 *   2. Runs AFSL + ABN public register lookups
 *   3. Calls classifyApplication()
 *   4. Applies the verdict (approve → create professionals row;
 *      reject → stamp rejection_reason; escalate → leave pending)
 *   5. Fires the appropriate email (welcome / rejection / escalation)
 *
 * Every path is idempotent — the load step bails if the application
 * is not in `pending` status so a retry after partial failure is a
 * no-op. Matches the pattern used by the lead dispute resolver.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { ADMIN_EMAIL } from "@/lib/admin";
import { escapeHtml } from "@/lib/html-escape";
import { getSiteUrl } from "@/lib/url";
import {
  classifyApplication,
  type AbnLookupResult,
  type AfslLookupResult,
  type ApplicationForClassifier,
  type ApplicationVerificationResult,
} from "@/lib/advisor-application-classifier";

const log = logger("advisor-application-resolver");

/**
 * Lookup AFSL on the ASIC Financial Services Register.
 *
 * The register has no clean public JSON API. Operators with a paid
 * subscription can use the SFTP bulk extract. For v1 we expose a
 * stub that returns `performed: false` — the classifier treats
 * that as "escalate for human review", so applications never
 * auto-approve without a real lookup configured.
 *
 * To activate real lookups, wire one of:
 *   - A scraped-cache lookup against the register HTML
 *   - A paid data provider (e.g. Moneysmart API, SearchSmarter)
 *   - A manual allowlist CSV loaded into Supabase
 *
 * When you do, replace this function's implementation with a call
 * that returns the actual status/name/licence type.
 */
export async function lookupAfsl(
  afslNumber: string | null,
): Promise<AfslLookupResult> {
  if (!afslNumber) {
    return {
      performed: false,
      afslNumber: null,
      registeredName: null,
      status: null,
      licenceType: null,
    };
  }

  // ── Hook point for real ASIC register lookup ──
  // When AFSL_LOOKUP_URL is set to an endpoint that accepts a GET
  // with ?afsl=XXXXX and returns {status, registeredName, licenceType},
  // we call it. Otherwise this function is a clean no-op and every
  // application escalates to a human.
  const endpoint = process.env.AFSL_LOOKUP_URL;
  if (!endpoint) {
    return {
      performed: false,
      afslNumber,
      registeredName: null,
      status: null,
      licenceType: null,
    };
  }

  try {
    const url = `${endpoint}?afsl=${encodeURIComponent(afslNumber)}`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "invest.com.au advisor verification",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      log.warn("AFSL lookup HTTP error", { afslNumber, status: res.status });
      return {
        performed: false,
        afslNumber,
        registeredName: null,
        status: null,
        licenceType: null,
      };
    }
    const body = (await res.json()) as {
      status?: AfslLookupResult["status"];
      registeredName?: string | null;
      licenceType?: string | null;
    };
    return {
      performed: true,
      afslNumber,
      registeredName: body.registeredName || null,
      status: body.status || "not_found",
      licenceType: body.licenceType || null,
    };
  } catch (err) {
    log.error("AFSL lookup threw", {
      afslNumber,
      err: err instanceof Error ? err.message : String(err),
    });
    return {
      performed: false,
      afslNumber,
      registeredName: null,
      status: null,
      licenceType: null,
    };
  }
}

/**
 * Lookup ABN via the public ABR (Australian Business Register) API.
 *
 * The ABR offers a free JSON endpoint at
 *   https://abr.business.gov.au/json/AbnDetails.aspx?abn=<abn>&guid=<GUID>
 * that returns entity name + status. Requires a free GUID from
 *   https://abr.business.gov.au/Tools/WebServices
 *
 * If ABN_LOOKUP_GUID isn't set we return `performed: false` and the
 * classifier escalates.
 */
export async function lookupAbn(
  abn: string | null,
): Promise<AbnLookupResult> {
  if (!abn) {
    return {
      performed: false,
      abn: null,
      entityName: null,
      entityStatus: null,
    };
  }

  const guid = process.env.ABN_LOOKUP_GUID;
  if (!guid) {
    return {
      performed: false,
      abn,
      entityName: null,
      entityStatus: null,
    };
  }

  // Strip spaces + validate format (11 digits)
  const cleanAbn = abn.replace(/\s+/g, "");
  if (!/^\d{11}$/.test(cleanAbn)) {
    return {
      performed: true,
      abn,
      entityName: null,
      entityStatus: "not_found",
    };
  }

  try {
    const url = `https://abr.business.gov.au/json/AbnDetails.aspx?abn=${cleanAbn}&guid=${guid}`;
    const res = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      log.warn("ABN lookup HTTP error", { abn: cleanAbn, status: res.status });
      return {
        performed: false,
        abn,
        entityName: null,
        entityStatus: null,
      };
    }
    // The ABR response is wrapped in a JSONP-style callback by default
    // but the JSON endpoint returns raw JSON. Parse defensively.
    const text = await res.text();
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) {
      return {
        performed: true,
        abn,
        entityName: null,
        entityStatus: "not_found",
      };
    }
    const body = JSON.parse(text.slice(jsonStart, jsonEnd + 1)) as {
      EntityName?: string;
      AbnStatus?: string;
      Abn?: string;
    };

    if (!body.Abn) {
      return {
        performed: true,
        abn,
        entityName: null,
        entityStatus: "not_found",
      };
    }

    const status: AbnLookupResult["entityStatus"] =
      body.AbnStatus?.toLowerCase() === "active" ? "active" : "cancelled";

    return {
      performed: true,
      abn,
      entityName: body.EntityName || null,
      entityStatus: status,
    };
  } catch (err) {
    log.error("ABN lookup threw", {
      abn,
      err: err instanceof Error ? err.message : String(err),
    });
    return {
      performed: false,
      abn,
      entityName: null,
      entityStatus: null,
    };
  }
}

/**
 * Load an application from Supabase, run the register lookups, and
 * return a classifier result. Separated from the side-effect apply
 * step so the cron can batch load many applications before applying.
 */
export async function classifyPendingApplication(
  applicationId: number,
): Promise<
  | { ok: true; app: ApplicationForClassifier; result: ApplicationVerificationResult }
  | { ok: false; reason: string }
> {
  const supabase = createAdminClient();

  const { data: app, error } = await supabase
    .from("advisor_applications")
    .select(
      "id, name, firm_name, email, phone, type, afsl_number, registration_number, abn, bio, website, location_state, years_experience, specialties, status",
    )
    .eq("id", applicationId)
    .maybeSingle();

  if (error || !app) return { ok: false, reason: "application_not_found" };
  if (app.status !== "pending") return { ok: false, reason: `already_${app.status}` };

  const application = app as ApplicationForClassifier & { status: string };

  const [afslLookup, abnLookup] = await Promise.all([
    lookupAfsl(application.afsl_number),
    lookupAbn(application.abn),
  ]);

  const result = classifyApplication({
    application,
    afslLookup,
    abnLookup,
  });

  return { ok: true, app: application, result };
}

/**
 * Apply the classifier verdict to the database.
 *
 *   approve   → status='approved', reviewed_at=now, reviewed_by='auto',
 *               create a corresponding professionals row (or mark existing).
 *               Caller is responsible for emailing the advisor welcome.
 *   reject    → status='rejected' + rejection_reason stamped
 *   escalate  → leave status='pending', stamp admin_notes with the
 *               classifier reasons so the admin has context
 */
export async function applyApplicationVerdict(
  applicationId: number,
  result: ApplicationVerificationResult,
): Promise<{ applied: boolean; professionalId?: number }> {
  const supabase = createAdminClient();
  const nowIso = new Date().toISOString();

  if (result.verdict === "escalate") {
    await supabase
      .from("advisor_applications")
      .update({
        admin_notes:
          `Auto-verification: escalated (${result.confidence} confidence). Signals: ${result.reasons.join(", ")}`,
      })
      .eq("id", applicationId);
    return { applied: true };
  }

  if (result.verdict === "reject") {
    await supabase
      .from("advisor_applications")
      .update({
        status: "rejected",
        rejection_reason:
          result.rejectionReason || result.reasons.join("; "),
        reviewed_at: nowIso,
        reviewed_by: "auto",
        admin_notes: `Auto-rejected. Signals: ${result.reasons.join(", ")}`,
      })
      .eq("id", applicationId);

    // Fire rejection email (best-effort)
    notifyApplicantRejection(applicationId, result).catch((err) =>
      log.error("Applicant rejection email failed", {
        applicationId,
        err: err instanceof Error ? err.message : String(err),
      }),
    );
    return { applied: true };
  }

  // Approve path
  const { data: app } = await supabase
    .from("advisor_applications")
    .select(
      "id, name, firm_name, email, phone, type, afsl_number, abn, bio, website, photo_url, location_state, location_suburb, specialties, fee_description, firm_id, years_experience, languages, client_types",
    )
    .eq("id", applicationId)
    .single();

  if (!app) return { applied: false };

  // Generate a slug from the name — lowercase, hyphens, digits stripped.
  // Collisions get a timestamp suffix.
  const baseSlug = app.name
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);

  let slug = baseSlug;
  const { data: existing } = await supabase
    .from("professionals")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (existing) {
    slug = `${baseSlug}-${Date.now().toString(36).slice(-4)}`;
  }

  const { data: inserted, error: insertError } = await supabase
    .from("professionals")
    .insert({
      slug,
      name: app.name,
      firm_name: app.firm_name,
      email: app.email,
      phone: app.phone,
      type: app.type,
      afsl_number: app.afsl_number,
      acn: null,
      abn: app.abn,
      bio: app.bio,
      website: app.website,
      photo_url: app.photo_url,
      location_state: app.location_state,
      location_suburb: app.location_suburb,
      specialties: app.specialties ? app.specialties.split(",").map((s: string) => s.trim()) : [],
      fee_description: app.fee_description,
      years_experience: app.years_experience,
      languages: app.languages ? app.languages.split(",").map((s: string) => s.trim()) : [],
      firm_id: app.firm_id,
      status: "active",
      verified: true,
      verified_at: nowIso,
      verified_by: "auto",
      verification_method: "afsl_register_auto",
      rating: 0,
      review_count: 0,
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    log.error("Auto-approve insert failed — escalating", {
      applicationId,
      err: insertError?.message,
    });
    // Fall through to escalate if we can't create the professional row
    await supabase
      .from("advisor_applications")
      .update({
        admin_notes: `Auto-approve failed at insert: ${insertError?.message}. Escalated for manual review.`,
      })
      .eq("id", applicationId);
    return { applied: false };
  }

  // Stamp the application as approved and link to the new professional
  await supabase
    .from("advisor_applications")
    .update({
      status: "approved",
      professional_id: inserted.id,
      reviewed_at: nowIso,
      reviewed_by: "auto",
      admin_notes: `Auto-approved. Signals: ${result.reasons.join(", ")}`,
    })
    .eq("id", applicationId);

  // Welcome email (best-effort)
  notifyApplicantApproved(applicationId, inserted.id).catch((err) =>
    log.error("Applicant welcome email failed", {
      applicationId,
      err: err instanceof Error ? err.message : String(err),
    }),
  );

  return { applied: true, professionalId: inserted.id };
}

/**
 * End-to-end helper: classify then apply. Useful for both the cron
 * and the inline call from the application submission path.
 */
export async function verifyApplicationEndToEnd(
  applicationId: number,
): Promise<{
  applied: boolean;
  verdict: ApplicationVerificationResult["verdict"];
  reasons: string[];
}> {
  const classified = await classifyPendingApplication(applicationId);
  if (!classified.ok) {
    return {
      applied: false,
      verdict: "escalate",
      reasons: [classified.reason],
    };
  }

  const applyResult = await applyApplicationVerdict(
    applicationId,
    classified.result,
  );

  log.info("Application verification applied", {
    applicationId,
    verdict: classified.result.verdict,
    confidence: classified.result.confidence,
    reasons: classified.result.reasons,
    applied: applyResult.applied,
  });

  return {
    applied: applyResult.applied,
    verdict: classified.result.verdict,
    reasons: classified.result.reasons,
  };
}

// ─── Notifications ───────────────────────────────────────────────────

async function notifyApplicantApproved(
  applicationId: number,
  professionalId: number,
): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;
  const supabase = createAdminClient();
  const { data: app } = await supabase
    .from("advisor_applications")
    .select("name, email")
    .eq("id", applicationId)
    .maybeSingle();
  if (!app?.email) return;
  const siteUrl = getSiteUrl();

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Invest.com.au <advisors@invest.com.au>",
      to: app.email,
      subject: "Your advisor profile is live on Invest.com.au",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;color:#334155">
          <h2 style="color:#0f172a;font-size:18px;margin:0 0 12px">Welcome to Invest.com.au</h2>
          <p style="font-size:14px;line-height:1.6;margin:0 0 12px">
            Hi ${escapeHtml(app.name || "there")}, your advisor profile has been verified and is now live.
          </p>
          <p style="font-size:14px;line-height:1.6;margin:0 0 16px">
            We checked your credentials against the ASIC register and the
            Australian Business Register. Everything matched — no manual
            review needed.
          </p>
          <a href="${siteUrl}/advisor-portal" style="display:inline-block;padding:12px 24px;background:#0f172a;color:white;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600">Go to your advisor portal →</a>
          <p style="font-size:11px;color:#94a3b8;margin-top:24px;border-top:1px solid #e2e8f0;padding-top:12px">
            Professional ID: ${professionalId}. If anything looks wrong, reply to this email.
          </p>
        </div>`,
    }),
  }).catch(() => {});
}

async function notifyApplicantRejection(
  applicationId: number,
  result: ApplicationVerificationResult,
): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;
  const supabase = createAdminClient();
  const { data: app } = await supabase
    .from("advisor_applications")
    .select("name, email")
    .eq("id", applicationId)
    .maybeSingle();
  if (!app?.email) return;
  const siteUrl = getSiteUrl();

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Invest.com.au <advisors@invest.com.au>",
      to: app.email,
      subject: "Your advisor application — action required",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;color:#334155">
          <h2 style="color:#0f172a;font-size:18px;margin:0 0 12px">We couldn't verify your application</h2>
          <p style="font-size:14px;line-height:1.6;margin:0 0 12px">
            Hi ${escapeHtml(app.name || "there")}, thanks for applying.
          </p>
          <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:12px 16px;margin:12px 0">
            <p style="margin:0;font-size:13px;color:#92400e"><strong>Reason:</strong> ${escapeHtml(result.rejectionReason || result.reasons.join("; "))}</p>
          </div>
          <p style="font-size:14px;line-height:1.6;margin:12px 0">
            You can re-submit with updated details whenever you're ready — just reply to this email
            or start a new application from the link below.
          </p>
          <a href="${siteUrl}/advisor-apply" style="display:inline-block;padding:12px 24px;background:#0f172a;color:white;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600">Re-apply →</a>
        </div>`,
    }),
  }).catch(() => {});
}

/** Admin email when an application escalates for human review. */
export async function notifyAdminApplicationEscalated(
  applicationId: number,
  applicantName: string,
  result: ApplicationVerificationResult,
): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;
  const siteUrl = getSiteUrl();
  const list = result.reasons.map((r) => `<li>${escapeHtml(r)}</li>`).join("");

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Invest.com.au <system@invest.com.au>",
      to: ADMIN_EMAIL,
      subject: `Advisor application [escalated]: ${applicantName}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;color:#334155">
          <h2 style="color:#0f172a;font-size:16px">Advisor application needs review</h2>
          <p>Classifier couldn't auto-decide on application <strong>#${applicationId}</strong> (${escapeHtml(applicantName)}).</p>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px 14px;margin:12px 0">
            <p style="margin:0 0 4px;font-size:12px;color:#64748b;font-weight:600">Signals:</p>
            <ul style="margin:0;padding-left:20px;font-size:12px;color:#334155">${list}</ul>
          </div>
          <a href="${siteUrl}/admin/advisors" style="display:inline-block;padding:10px 20px;background:#0f172a;color:white;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600">Review application →</a>
        </div>`,
    }),
  }).catch(() => {});
}
