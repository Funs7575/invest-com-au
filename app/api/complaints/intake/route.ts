import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { isValidEmail } from "@/lib/validate-email";
import { logger } from "@/lib/logger";
import { enqueueJob } from "@/lib/job-queue";
import { getSiteUrl } from "@/lib/url";
import { escapeHtml } from "@/lib/html-escape";
import crypto from "node:crypto";

const log = logger("complaints-intake");

export const runtime = "nodejs";

/**
 * POST /api/complaints/intake
 *
 * Body: {
 *   complainant_email, complainant_name?, complainant_phone?,
 *   subject, body, category, severity?,
 *   related_advisor_id?, related_broker_slug?, related_lead_id?
 * }
 *
 * Public endpoint — anyone can submit. Required by ASIC RG 271
 * (Internal Dispute Resolution). The SLA clock starts at
 * submitted_at: we have 30 days to respond, otherwise escalation
 * to AFCA.
 *
 * On submit:
 *   1. Insert row to complaints_register
 *   2. Generate a user-facing reference ID (e.g. "IVST-2025-03-0042")
 *   3. Email the complainant with the reference
 *   4. Email the admin distribution list with a deep link
 */
const VALID_CATEGORIES = new Set([
  "lead_billing",
  "advisor_conduct",
  "data_privacy",
  "platform",
  "other",
]);

const VALID_SEVERITIES = new Set(["low", "standard", "high", "critical"]);

const SLA_DAYS = 30;

export async function POST(request: NextRequest) {
  // Stricter rate limit — 3 complaints per IP per day is plenty
  // for a real user; abuse = rejection
  if (!(await isAllowed("complaints_intake", ipKey(request), { max: 3, refillPerSec: 3 / 86400 }))) {
    return NextResponse.json(
      { error: "Too many submissions — please email privacy@invest.com.au directly" },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const email = typeof body.complainant_email === "string" ? body.complainant_email.trim().toLowerCase() : null;
  const name = typeof body.complainant_name === "string" ? body.complainant_name.trim().slice(0, 120) : null;
  const phone = typeof body.complainant_phone === "string" ? body.complainant_phone.trim().slice(0, 40) : null;
  const subject = typeof body.subject === "string" ? body.subject.trim().slice(0, 200) : null;
  const bodyText = typeof body.body === "string" ? body.body.trim().slice(0, 10_000) : null;
  const category = typeof body.category === "string" && VALID_CATEGORIES.has(body.category) ? body.category : null;
  const severity =
    typeof body.severity === "string" && VALID_SEVERITIES.has(body.severity) ? body.severity : "standard";

  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }
  if (!subject || subject.length < 5) {
    return NextResponse.json({ error: "Subject too short" }, { status: 400 });
  }
  if (!bodyText || bodyText.length < 20) {
    return NextResponse.json(
      { error: "Please describe your complaint in at least 20 characters" },
      { status: 400 },
    );
  }
  if (!category) {
    return NextResponse.json({ error: "Category is required" }, { status: 400 });
  }

  const now = new Date();
  const slaDue = new Date(now.getTime() + SLA_DAYS * 24 * 60 * 60 * 1000);
  const referenceId = generateReferenceId(now);

  const supabase = createAdminClient();
  const { data: inserted, error } = await supabase
    .from("complaints_register")
    .insert({
      complainant_email: email,
      complainant_name: name,
      complainant_phone: phone,
      subject,
      body: bodyText,
      category,
      severity,
      status: "submitted",
      reference_id: referenceId,
      sla_due_at: slaDue.toISOString(),
      related_advisor_id: typeof body.related_advisor_id === "number" ? body.related_advisor_id : null,
      related_broker_slug: typeof body.related_broker_slug === "string" ? body.related_broker_slug : null,
      related_lead_id: typeof body.related_lead_id === "number" ? body.related_lead_id : null,
    })
    .select("id, reference_id")
    .single();

  if (error || !inserted) {
    log.error("complaints_register insert failed", { error: error?.message });
    return NextResponse.json({ error: "Failed to record complaint" }, { status: 500 });
  }

  // Acknowledgement email to the complainant (RG 271 requires
  // acknowledgement within 24 hours — we do it immediately)
  const complainantHtml = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:560px;margin:0 auto;padding:24px">
      <h2 style="color:#0f172a;font-size:18px">We've received your complaint</h2>
      <p style="color:#334155;font-size:14px;line-height:1.6">
        Thank you for getting in touch. Your reference is:
      </p>
      <p style="background:#f1f5f9;border-radius:8px;padding:12px;font-family:monospace;font-size:14px;text-align:center">
        ${escapeHtml(inserted.reference_id as string)}
      </p>
      <p style="color:#334155;font-size:14px;line-height:1.6">
        Under ASIC Regulatory Guide 271, we will respond to your
        complaint within 30 calendar days. Most complaints are
        resolved sooner. If we can't resolve it within 30 days,
        you have the right to escalate to the Australian Financial
        Complaints Authority (AFCA) at
        <a href="https://www.afca.org.au">afca.org.au</a>.
      </p>
      <p style="color:#334155;font-size:14px;line-height:1.6">
        We'll contact you at this email with our response.
      </p>
      <p style="color:#94a3b8;font-size:11px;margin-top:24px">
        Invest.com.au — Privacy &amp; complaints
      </p>
    </div>`;
  await enqueueJob("send_email", {
    to: email,
    subject: `Your complaint — ${inserted.reference_id}`,
    html: complainantHtml,
    from: "Invest.com.au <privacy@invest.com.au>",
  });

  // Internal notification
  const internalHtml = `
    <h2>New complaint ${escapeHtml(inserted.reference_id as string)}</h2>
    <p>Category: <strong>${escapeHtml(category)}</strong> · Severity: <strong>${escapeHtml(severity)}</strong></p>
    <p>From: ${escapeHtml(email)}${name ? " · " + escapeHtml(name) : ""}${phone ? " · " + escapeHtml(phone) : ""}</p>
    <p>Subject: ${escapeHtml(subject)}</p>
    <pre style="background:#f8fafc;padding:12px;border-radius:8px;white-space:pre-wrap">${escapeHtml(bodyText)}</pre>
    <p>SLA due: <strong>${slaDue.toLocaleString("en-AU")}</strong></p>
    <p><a href="${getSiteUrl()}/admin/complaints">Open in admin</a></p>`;
  const adminDistro = process.env.COMPLAINTS_ADMIN_EMAIL || "admin@invest.com.au";
  await enqueueJob("send_email", {
    to: adminDistro,
    subject: `[Complaint] ${inserted.reference_id} — ${subject}`,
    html: internalHtml,
    from: "Invest.com.au <privacy@invest.com.au>",
  });

  log.info("Complaint intake", {
    reference_id: inserted.reference_id,
    category,
    severity,
  });

  return NextResponse.json({
    ok: true,
    reference_id: inserted.reference_id,
    message:
      "We've received your complaint and will respond within 30 days. Check your email for confirmation.",
  });
}

/**
 * User-facing reference: IVST-YYYYMM-XXXX
 * The XXXX is a 4-char random alphanumeric suffix so two
 * simultaneous submissions don't collide.
 */
function generateReferenceId(at: Date): string {
  const yyyymm = `${at.getUTCFullYear()}${String(at.getUTCMonth() + 1).padStart(2, "0")}`;
  const suffix = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `IVST-${yyyymm}-${suffix}`;
}
