import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isRateLimited } from "@/lib/rate-limit";
import { isValidEmail } from "@/lib/validate-email";
import { logger } from "@/lib/logger";
import { extractUtm, utmForInsert } from "@/lib/utm";
import { z } from "zod";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import { escapeHtml } from "@/lib/html-escape";

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

const BodySchema = z.object({
  fund_id: z.number().int().finite().nullish(),
  listing_id: z.number().int().finite().nullish(),
  report_slug: z.string().max(200).nullish(),
  full_name: z.string().min(2).max(120),
  email: z.string().refine(isValidEmail, "Invalid email"),
  phone: z.string().max(40).nullish(),
  investment_amount_range: z.string().max(60).nullish(),
  investor_type: z.enum(["retail", "wholesale", "smsf", "foreign"]),
  message: z.string().max(2000).nullish(),
});

type LeadPayload = z.infer<typeof BodySchema>;

export const POST = withValidatedBody(BodySchema, async (req: NextRequest, body) => {
  // Rate limit by IP: 5 submissions per 10-minute window.
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (await isRateLimited(`developer-leads:${ip}`, 5, 10)) {
    return NextResponse.json(
      { success: false, error: "Too many requests" },
      { status: 429 },
    );
  }

  const utm = extractUtm(body as Record<string, unknown>, new URL(req.url));
  const utmFields = utmForInsert(utm);

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("developer_leads").insert({
      fund_id: body.fund_id ?? null,
      listing_id: body.listing_id ?? null,
      report_slug: body.report_slug ?? null,
      full_name: body.full_name,
      email: body.email,
      phone: body.phone ?? null,
      investment_amount_range: body.investment_amount_range ?? null,
      investor_type: body.investor_type,
      message: body.message ?? null,
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

    void notifyAdmin(body).catch((err) =>
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
});

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
