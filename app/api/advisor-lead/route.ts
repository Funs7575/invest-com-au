import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isRateLimited } from "@/lib/rate-limit";
import { isValidEmail } from "@/lib/validate-email";
import { isValidAuPhone } from "@/lib/validate-phone";
import { logger } from "@/lib/logger";
import { extractUtm, utmForInsert } from "@/lib/utm";
import { captureServerEvent } from "@/lib/posthog/server";

const log = logger("advisor-lead");

/**
 * Body schema. Field-level guards (AU phone, email format, consent flag)
 * stay below so the existing per-error 400 messages and ordering are
 * preserved bit-for-bit. Schema only types the shape, replacing the
 * previous `body as { ... }` cast.
 *
 * `.passthrough()` keeps `utm_source`, `referrer`, `distinct_id` and similar
 * extras visible to `extractUtm()` and the PostHog capture below — those
 * are intentionally not enumerated here so adding a new tracking field
 * doesn't require a schema bump.
 */
const AdvisorLeadSchema = z
  .object({
    name: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
    advisor_type: z.string().optional(),
    quiz_answers: z.record(z.string(), z.string()).optional(),
    consent: z.boolean().optional(),
    is_international: z.boolean().optional(),
    investor_country: z.string().optional(),
    visa_status: z.string().optional(),
    investor_goal_intl: z.string().optional(),
    source_page: z.string().optional(),
  })
  .passthrough();

const ADVISOR_LABELS: Record<string, string> = {
  "mortgage-broker": "Mortgage Broker",
  "buyers-agent": "Buyer's Agent",
  "financial-planner": "Financial Planner",
  "smsf-accountant": "SMSF Accountant",
  "tax-agent": "Tax Agent",
  "insurance-broker": "Insurance Broker",
  "estate-planner": "Estate Planner",
  "not-sure": "Financial Advisor",
};

function esc(s: string | null | undefined): string {
  if (!s) return "";
  return s.replace(/[&<>"']/g, (ch) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch] || ch)
  );
}

async function sendAdminNotification(
  name: string,
  phone: string,
  email: string,
  advisorType: string,
  quizAnswers: Record<string, string>,
  intlContext?: { investorCountry?: string; visaStatus?: string; investorGoalIntl?: string }
): Promise<void> {
  const resendApiKey = process.env.RESEND_API_KEY;
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || "leads@invest.com.au";
  if (!resendApiKey) return;

  const advisorLabel = ADVISOR_LABELS[advisorType] || "Financial Advisor";
  const isIntl = Boolean(intlContext);
  const answersHtml = Object.entries(quizAnswers)
    .map(([k, v]) => `<tr><td style="padding:6px 12px;color:#64748b;font-size:13px;">${esc(k)}</td><td style="padding:6px 12px;font-weight:600;font-size:13px;">${esc(v)}</td></tr>`)
    .join("");

  const intlHtml = isIntl && intlContext ? `
    <tr style="background:#eff6ff;"><td colspan="2" style="padding:8px 12px;font-weight:700;font-size:12px;color:#1e40af;text-transform:uppercase;letter-spacing:0.5px;">🌏 International Lead</td></tr>
    ${intlContext.investorCountry ? `<tr style="background:#eff6ff;"><td style="padding:6px 12px;color:#64748b;font-size:13px;">Country</td><td style="padding:6px 12px;font-weight:600;font-size:13px;">${esc(intlContext.investorCountry)}</td></tr>` : ""}
    ${intlContext.visaStatus ? `<tr style="background:#eff6ff;"><td style="padding:6px 12px;color:#64748b;font-size:13px;">Visa Status</td><td style="padding:6px 12px;font-weight:600;font-size:13px;">${esc(intlContext.visaStatus)}</td></tr>` : ""}
    ${intlContext.investorGoalIntl ? `<tr style="background:#eff6ff;"><td style="padding:6px 12px;color:#64748b;font-size:13px;">Goal</td><td style="padding:6px 12px;font-weight:600;font-size:13px;">${esc(intlContext.investorGoalIntl)}</td></tr>` : ""}
  ` : "";

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:24px 16px;">
    <div style="background:linear-gradient(135deg,${isIntl ? "#1d4ed8 0%,#1e3a8a 100%" : "#d97706 0%,#b45309 100%"});border-radius:12px 12px 0 0;padding:24px;text-align:center;">
      <h1 style="color:#fff;font-size:20px;margin:0 0 4px;font-weight:800;">${isIntl ? "🌏 International Advisor Lead" : "New Advisor Lead"}</h1>
      <p style="color:${isIntl ? "#bfdbfe" : "#fde68a"};font-size:13px;margin:0;">Invest.com.au — Unified Quiz${isIntl ? " · International Track" : ""}</p>
    </div>
    <div style="background:#fff;padding:24px;border-radius:0 0 12px 12px;box-shadow:0 1px 3px rgba(0,0,0,.1);">
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:8px 12px;color:#64748b;font-size:13px;">Name</td><td style="padding:8px 12px;font-weight:700;font-size:14px;">${esc(name)}</td></tr>
        <tr style="background:#f8fafc;"><td style="padding:8px 12px;color:#64748b;font-size:13px;">Phone</td><td style="padding:8px 12px;font-weight:700;font-size:14px;"><a href="tel:${esc(phone)}" style="color:#d97706;">${esc(phone)}</a></td></tr>
        <tr><td style="padding:8px 12px;color:#64748b;font-size:13px;">Email</td><td style="padding:8px 12px;font-weight:700;font-size:14px;"><a href="mailto:${esc(email)}" style="color:#d97706;">${esc(email)}</a></td></tr>
        <tr style="background:#f8fafc;"><td style="padding:8px 12px;color:#64748b;font-size:13px;">Advisor Type</td><td style="padding:8px 12px;font-weight:700;font-size:14px;">${esc(advisorLabel)}</td></tr>
        ${intlHtml}
      </table>
      <h3 style="font-size:13px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin:20px 0 8px;">Quiz Answers</h3>
      <table style="width:100%;border-collapse:collapse;">${answersHtml}</table>
      <div style="margin-top:20px;text-align:center;">
        <a href="https://invest.com.au/admin" style="display:inline-block;padding:10px 24px;background:#d97706;color:#fff;font-weight:700;font-size:13px;border-radius:8px;text-decoration:none;">View in Admin →</a>
      </div>
      <p style="color:#94a3b8;font-size:11px;text-align:center;margin:16px 0 0;">
        Lead captured via Unified Quiz · ${new Date().toLocaleString("en-AU", { timeZone: "Australia/Sydney" })}
      </p>
    </div>
  </div>
</body>
</html>`;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Invest.com.au Leads <leads@invest.com.au>",
        to: [adminEmail],
        reply_to: email,
        subject: `New ${advisorLabel} lead — ${name}`,
        html,
      }),
    });
  } catch (err) {
    log.error("Admin notification failed", { error: String(err) });
  }
}

async function syncToResendContacts(email: string, name: string): Promise<void> {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) return;
  const [firstName, ...rest] = name.trim().split(" ");
  try {
    await fetch("https://api.resend.com/contacts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        first_name: firstName || undefined,
        last_name: rest.join(" ") || undefined,
        unsubscribed: false,
        properties: { source: "advisor-lead", signed_up: new Date().toISOString().split("T")[0] },
      }),
    });
  } catch (err) {
    log.warn("CRM sync failed", { err: err instanceof Error ? err.message : String(err) });
  }
}

export async function POST(request: NextRequest) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch (err) {
    log.warn("advisor-lead invalid JSON", { err: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsedBody = AdvisorLeadSchema.safeParse(raw);
  if (!parsedBody.success) {
    // Hard schema mismatch (e.g. `name: 123`) — surface the same generic
    // 400 the field-level guards below would have produced.
    return NextResponse.json({ error: "Full name is required" }, { status: 400 });
  }
  const body = parsedBody.data;
  const {
    name,
    phone,
    email,
    advisor_type,
    quiz_answers,
    consent,
    is_international,
    investor_country,
    visa_status,
    investor_goal_intl,
  } = body;

  // Validation
  if (!name || name.trim().length < 2) {
    return NextResponse.json({ error: "Full name is required" }, { status: 400 });
  }
  // International users may have non-AU phone numbers — only validate AU format for domestic leads
  if (!is_international && (!phone || !isValidAuPhone(phone))) {
    return NextResponse.json({ error: "Valid Australian phone number is required" }, { status: 400 });
  }
  if (is_international && (!phone || phone.trim().length < 6)) {
    return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
  }
  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ error: "Valid email address is required" }, { status: 400 });
  }
  if (!consent) {
    return NextResponse.json({ error: "Consent is required" }, { status: 400 });
  }

  // Rate limiting by IP
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";
  if (await isRateLimited(`advisor_lead:${ip}`, 3, 10)) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  // `raw` is the un-narrowed JSON object so utm/distinct_id passthrough fields
  // (not part of the declared schema) remain visible to extractors below.
  const utm = extractUtm(raw as Record<string, unknown>);
  const supabase = createAdminClient();

  const sanitizedName = name.trim().slice(0, 100);
  const sanitizedPhone = (phone || "").trim().slice(0, 30);
  const sanitizedEmail = email.trim().toLowerCase().slice(0, 254);
  const sanitizedAdvisorType = (advisor_type || "not-sure").slice(0, 50);
  const sanitizedAnswers = quiz_answers ?? {};
  const isIntl = Boolean(is_international);

  // Store lead in email_captures with rich context
  const { error } = await supabase.from("email_captures").insert({
    email: sanitizedEmail,
    name: sanitizedName,
    source: isIntl ? "advisor-lead-international" : "advisor-lead",
    context: {
      phone: sanitizedPhone,
      advisor_type: sanitizedAdvisorType,
      quiz_answers: sanitizedAnswers,
      lead_type: "advisor",
      is_international: isIntl,
      ...(isIntl && {
        investor_country: (investor_country || "").slice(0, 50),
        visa_status: (visa_status || "").slice(0, 50),
        investor_goal_intl: (investor_goal_intl || "").slice(0, 50),
        lead_tier: "international",
      }),
    },
    ...utmForInsert(utm),
  });

  if (error) {
    // Duplicate email is OK — still fire notification
    if (!error.message?.includes("duplicate") && !error.code?.includes("23505")) {
      log.error("advisor-lead insert error", { error: error.message });
      return NextResponse.json({ error: "Failed to save lead" }, { status: 500 });
    }
  }

  // Fire admin notification and Resend contact sync in parallel (non-blocking)
  Promise.all([
    sendAdminNotification(
      sanitizedName, sanitizedPhone, sanitizedEmail, sanitizedAdvisorType, sanitizedAnswers,
      isIntl ? {
        investorCountry: (investor_country || "").slice(0, 50),
        visaStatus: (visa_status || "").slice(0, 50),
        investorGoalIntl: (investor_goal_intl || "").slice(0, 50),
      } : undefined
    ),
    syncToResendContacts(sanitizedEmail, sanitizedName),
  ]).catch((err) => log.error("Post-lead tasks failed", { error: String(err) }));

  const rawObj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const distinctId = typeof rawObj.distinct_id === "string"
    ? rawObj.distinct_id
    : `anonymous-lead-${crypto.randomUUID()}`;
  captureServerEvent(distinctId, "lead_submitted", {
    lead_source: isIntl ? "advisor-lead-international" : "advisor-lead",
    source_page: typeof rawObj.source_page === "string" ? rawObj.source_page : null,
    advisor_match_count: Object.keys(sanitizedAnswers).length,
    quiz_completed: !!quiz_answers,
    utm_source: utm.utm_source ?? null,
    utm_campaign: utm.utm_campaign ?? null,
  }).catch((err) => log.warn("posthog capture failed", { err: String(err) }));

  return NextResponse.json({ success: true });
}
