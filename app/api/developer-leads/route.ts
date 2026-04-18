import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isRateLimited } from "@/lib/rate-limit";
import { isValidEmail } from "@/lib/validate-email";
import { logger } from "@/lib/logger";
import { extractUtm, utmForInsert } from "@/lib/utm";

const log = logger("developer-leads");

/**
 * POST /api/developer-leads
 *
 * Captures a registered-interest lead from a fund detail page,
 * investment listing, or SIV hub form. Writes to developer_leads.
 *
 * Body:
 * {
 *   fund_id?: number,             // fund_listings.id (optional)
 *   listing_id?: number,          // investment_listings.id (optional)
 *   full_name: string,            // required
 *   email: string,                // required
 *   phone?: string,
 *   investment_amount_range?: string,
 *   investor_type: 'retail'|'wholesale'|'smsf'|'foreign',
 *   message?: string
 * }
 *
 * Rate-limited per IP. Admin notification is a soft dependency —
 * if RESEND_API_KEY is set, we fire and forget; otherwise we log.
 */

const ALLOWED_INVESTOR_TYPES = [
  "retail",
  "wholesale",
  "smsf",
  "foreign",
] as const;

type InvestorType = (typeof ALLOWED_INVESTOR_TYPES)[number];

interface LeadPayload {
  fund_id?: number | null;
  listing_id?: number | null;
  report_slug?: string | null;
  full_name: string;
  email: string;
  phone?: string | null;
  investment_amount_range?: string | null;
  investor_type: InvestorType;
  message?: string | null;
}

function validate(
  body: Record<string, unknown>,
): { ok: true; data: LeadPayload } | { ok: false; error: string } {
  const full_name =
    typeof body.full_name === "string" ? body.full_name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const investor_type =
    typeof body.investor_type === "string" ? body.investor_type : "";

  if (!full_name || full_name.length < 2 || full_name.length > 120) {
    return { ok: false, error: "Invalid name" };
  }
  if (!isValidEmail(email)) {
    return { ok: false, error: "Invalid email" };
  }
  if (!ALLOWED_INVESTOR_TYPES.includes(investor_type as InvestorType)) {
    return { ok: false, error: "Invalid investor_type" };
  }

  const phone =
    typeof body.phone === "string" && body.phone.length <= 40
      ? body.phone.trim() || null
      : null;
  const message =
    typeof body.message === "string" && body.message.length <= 2000
      ? body.message.trim() || null
      : null;
  const investment_amount_range =
    typeof body.investment_amount_range === "string" &&
    body.investment_amount_range.length <= 60
      ? body.investment_amount_range.trim() || null
      : null;
  const fund_id =
    typeof body.fund_id === "number" && Number.isFinite(body.fund_id)
      ? body.fund_id
      : null;
  const listing_id =
    typeof body.listing_id === "number" && Number.isFinite(body.listing_id)
      ? body.listing_id
      : null;
  const report_slug =
    typeof body.report_slug === "string" && body.report_slug.length <= 200
      ? body.report_slug.trim() || null
      : null;

  return {
    ok: true,
    data: {
      fund_id,
      listing_id,
      report_slug,
      full_name,
      email,
      phone,
      investment_amount_range,
      investor_type: investor_type as InvestorType,
      message,
    },
  };
}

export async function POST(req: NextRequest) {
  // Rate limit by IP: 5 submissions per 10-minute window.
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (await isRateLimited(`developer-leads:${ip}`, 5, 10)) {
    return NextResponse.json(
      { success: false, error: "Too many requests" },
      { status: 429 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON" },
      { status: 400 },
    );
  }

  const validated = validate(body);
  if (!validated.ok) {
    return NextResponse.json(
      { success: false, error: validated.error },
      { status: 400 },
    );
  }

  const utm = extractUtm(body, new URL(req.url));
  const utmFields = utmForInsert(utm);

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("developer_leads").insert({
      fund_id: validated.data.fund_id,
      listing_id: validated.data.listing_id,
      report_slug: validated.data.report_slug,
      full_name: validated.data.full_name,
      email: validated.data.email,
      phone: validated.data.phone,
      investment_amount_range: validated.data.investment_amount_range,
      investor_type: validated.data.investor_type,
      message: validated.data.message,
      utm_source: utmFields.utm_source ?? null,
      utm_medium: utmFields.utm_medium ?? null,
    });

    if (error) {
      log.error("insert_failed", { error: error.message });
      return NextResponse.json(
        { success: false, error: "Database error" },
        { status: 500 },
      );
    }

    // Fire-and-forget admin notification. If RESEND_API_KEY is not
    // set, skip silently — the lead is captured regardless.
    void notifyAdmin(validated.data).catch((err) =>
      log.warn("admin_notify_failed", { err: String(err) }),
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    log.error("unexpected_error", { err: String(err) });
    return NextResponse.json(
      { success: false, error: "Unexpected error" },
      { status: 500 },
    );
  }
}

async function notifyAdmin(lead: LeadPayload): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.LEADS_NOTIFY_EMAIL;
  if (!key || !to) return;

  const subject = `New ${lead.investor_type} lead: ${lead.full_name}`;
  const html = `
    <h2>New investor lead</h2>
    <p><strong>Name:</strong> ${escapeHtml(lead.full_name)}</p>
    <p><strong>Email:</strong> ${escapeHtml(lead.email)}</p>
    ${lead.phone ? `<p><strong>Phone:</strong> ${escapeHtml(lead.phone)}</p>` : ""}
    <p><strong>Investor type:</strong> ${lead.investor_type}</p>
    ${lead.investment_amount_range ? `<p><strong>Investment size:</strong> ${escapeHtml(lead.investment_amount_range)}</p>` : ""}
    ${lead.fund_id ? `<p><strong>Fund ID:</strong> ${lead.fund_id}</p>` : ""}
    ${lead.listing_id ? `<p><strong>Listing ID:</strong> ${lead.listing_id}</p>` : ""}
    ${lead.report_slug ? `<p><strong>Report:</strong> ${escapeHtml(lead.report_slug)}</p>` : ""}
    ${lead.message ? `<p><strong>Message:</strong><br>${escapeHtml(lead.message).replace(/\n/g, "<br>")}</p>` : ""}
  `;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "leads@invest.com.au",
      to: [to],
      subject,
      html,
    }),
  });
}

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (ch) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[ch] || ch,
  );
}
