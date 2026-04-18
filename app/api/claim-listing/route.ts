import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isRateLimited } from "@/lib/rate-limit";
import { isValidEmail } from "@/lib/validate-email";
import { logger } from "@/lib/logger";

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

const ALLOWED_TYPES = ["broker", "advisor", "listing"] as const;
type ClaimType = (typeof ALLOWED_TYPES)[number];

interface Payload {
  claim_type: ClaimType;
  target_slug: string;
  full_name: string;
  email: string;
  company_role: string | null;
  phone: string | null;
  message: string | null;
}

function validate(
  body: Record<string, unknown>,
): { ok: true; data: Payload } | { ok: false; error: string } {
  const claim_type =
    typeof body.claim_type === "string" ? body.claim_type : "";
  const target_slug =
    typeof body.target_slug === "string" ? body.target_slug.trim() : "";
  const full_name =
    typeof body.full_name === "string" ? body.full_name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";

  if (!ALLOWED_TYPES.includes(claim_type as ClaimType)) {
    return { ok: false, error: "Invalid claim_type" };
  }
  if (!target_slug || target_slug.length > 200) {
    return { ok: false, error: "Invalid target_slug" };
  }
  if (!full_name || full_name.length < 2 || full_name.length > 120) {
    return { ok: false, error: "Invalid name" };
  }
  if (!isValidEmail(email)) {
    return { ok: false, error: "Invalid email" };
  }

  const company_role =
    typeof body.company_role === "string" && body.company_role.length <= 120
      ? body.company_role.trim() || null
      : null;
  const phone =
    typeof body.phone === "string" && body.phone.length <= 40
      ? body.phone.trim() || null
      : null;
  const message =
    typeof body.message === "string" && body.message.length <= 2000
      ? body.message.trim() || null
      : null;

  return {
    ok: true,
    data: {
      claim_type: claim_type as ClaimType,
      target_slug,
      full_name,
      email,
      company_role,
      phone,
      message,
    },
  };
}

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (await isRateLimited(`claim-listing:${ip}`, 3, 10)) {
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

  const v = validate(body);
  if (!v.ok) {
    return NextResponse.json(
      { success: false, error: v.error },
      { status: 400 },
    );
  }

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("listing_claims").insert({
      claim_type: v.data.claim_type,
      target_slug: v.data.target_slug,
      full_name: v.data.full_name,
      email: v.data.email,
      company_role: v.data.company_role,
      phone: v.data.phone,
      message: v.data.message,
    });
    if (error) {
      log.error("insert_failed", { error: error.message });
      return NextResponse.json(
        { success: false, error: "Database error" },
        { status: 500 },
      );
    }

    // Fire-and-forget admin notification (no-op if Resend not configured)
    void notifyAdmin(v.data).catch((err) =>
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

async function notifyAdmin(claim: Payload): Promise<void> {
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
