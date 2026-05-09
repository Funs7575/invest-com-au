import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isRateLimited } from "@/lib/rate-limit";
import { isValidEmail } from "@/lib/validate-email";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import { escapeHtml } from "@/lib/html-escape";

const log = logger("claim-listing");

/**
 * POST /api/claim-listing
 *
 * Captures a claim request from a broker or advisor profile page.
 * Body:
 *   {
 *     claim_type: 'broker' | 'advisor' | 'listing',
 *     target_slug: string,
 *     full_name: string,
 *     email: string,
 *     company_role?: string,
 *     phone?: string,
 *     message?: string
 *   }
 */

const BodySchema = z.object({
  claim_type: z.enum(["broker", "advisor", "listing"]),
  target_slug: z.string().trim().min(1).max(200),
  full_name: z.string().trim().min(2).max(120),
  email: z.string().trim().refine(isValidEmail, "Invalid email"),
  company_role: z.string().trim().max(120).nullish(),
  phone: z.string().trim().max(40).nullish(),
  message: z.string().trim().max(2000).nullish(),
});

export const POST = withValidatedBody(BodySchema, async (req: NextRequest, body) => {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (await isRateLimited(`claim-listing:${ip}`, 3, 10)) {
    return NextResponse.json(
      { success: false, error: "Too many requests" },
      { status: 429 },
    );
  }

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("listing_claims").insert({
      claim_type: body.claim_type,
      target_slug: body.target_slug,
      full_name: body.full_name,
      email: body.email,
      company_role: body.company_role ?? null,
      phone: body.phone ?? null,
      message: body.message ?? null,
    });
    if (error) {
      log.error("insert_failed", { error: error.message });
      return NextResponse.json(
        { success: false, error: "Database error" },
        { status: 500 },
      );
    }

    void notifyAdmin({
      claim_type: body.claim_type,
      target_slug: body.target_slug,
      full_name: body.full_name,
      email: body.email,
      company_role: body.company_role ?? null,
      phone: body.phone ?? null,
      message: body.message ?? null,
    }).catch((err) =>
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

type ClaimData = { claim_type: string; target_slug: string; full_name: string; email: string; company_role: string | null; phone: string | null; message: string | null };
async function notifyAdmin(claim: ClaimData): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.LEADS_NOTIFY_EMAIL;
  if (!key || !to) return;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "claims@invest.com.au",
      to: [to],
      subject: `New ${claim.claim_type} claim: ${claim.target_slug}`,
      html: `
        <h2>New ${claim.claim_type} profile claim</h2>
        <p><strong>Target:</strong> ${escapeHtml(claim.target_slug)}</p>
        <p><strong>Name:</strong> ${escapeHtml(claim.full_name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(claim.email)}</p>
        ${claim.company_role ? `<p><strong>Role:</strong> ${escapeHtml(claim.company_role)}</p>` : ""}
        ${claim.phone ? `<p><strong>Phone:</strong> ${escapeHtml(claim.phone)}</p>` : ""}
        ${claim.message ? `<p><strong>Message:</strong><br>${escapeHtml(claim.message).replace(/\n/g, "<br>")}</p>` : ""}
        <hr>
        <p><small>Review in /admin/listing-claims.</small></p>
      `,
    }),
  });
}
