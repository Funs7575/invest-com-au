import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { isValidEmail } from "@/lib/validate-email";
import { createRateLimiter } from "@/lib/rate-limiter";
import { escapeHtml } from "@/lib/html-escape";

const log = logger("fund-review");

const checkRateLimit = createRateLimiter(300_000, 3);

function sanitize(str: unknown, maxLen: number): string {
  if (typeof str !== "string") return "";
  return str.trim().slice(0, maxLen);
}

function buildVerificationEmail(displayName: string, fundTitle: string, verifyUrl: string): string {
  // displayName + fundTitle are user-controlled (display_name from the
  // submitter; fundTitle from the fund_listings record which Stream-A
  // currently lets advisors edit). Escape both to block HTML injection.
  // verifyUrl is constructed from a UUID + getSiteUrl() — safe.
  const safeName = escapeHtml(displayName);
  const safeTitle = escapeHtml(fundTitle);
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Review</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 560px; margin: 0 auto; padding: 24px 16px;">
    <div style="background: linear-gradient(135deg, #15803d 0%, #166534 100%); border-radius: 12px 12px 0 0; padding: 24px; text-align: center;">
      <h1 style="color: #ffffff; font-size: 20px; margin: 0; font-weight: 800;">Verify Your Review</h1>
    </div>
    <div style="background: #ffffff; padding: 24px; border-radius: 0 0 12px 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <p style="color: #334155; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">
        Hi ${safeName},
      </p>
      <p style="color: #334155; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">
        Thanks for reviewing <strong>${safeTitle}</strong> on Invest.com.au. Click the button below to verify your email and submit your review for approval.
      </p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${verifyUrl}" style="display: inline-block; padding: 12px 32px; background-color: #15803d; color: #ffffff; font-weight: 700; font-size: 14px; border-radius: 8px; text-decoration: none;">
          Verify My Review
        </a>
      </div>
      <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 16px 0 0 0; line-height: 1.5;">
        If you didn't write this review, you can safely ignore this email.<br>
        This link expires in 7 days.
      </p>
      <p style="color: #94a3b8; font-size: 11px; text-align: center; margin: 16px 0 0 0;">
        <a href="https://invest.com.au" style="color: #94a3b8;">invest.com.au</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    // eslint-disable-next-line invest/no-unvalidated-req-json -- mirrors app/api/user-review/route.ts (broker reviews); field-specific error envelopes match the editorial-review contract used by the admin moderation surface
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    fund_slug,
    display_name,
    email,
    rating,
    title,
    body: reviewBody,
    pros,
    cons,
    performance_rating,
    communication_rating,
    fees_rating,
    manager_rating,
    hold_period_months,
  } = body as {
    fund_slug?: string;
    display_name?: string;
    email?: string;
    rating?: number;
    title?: string;
    body?: string;
    pros?: string | null;
    cons?: string | null;
    performance_rating?: number | null;
    communication_rating?: number | null;
    fees_rating?: number | null;
    manager_rating?: number | null;
    hold_period_months?: number | null;
  };

  if (!fund_slug || typeof fund_slug !== "string") {
    return NextResponse.json({ error: "Fund is required" }, { status: 400 });
  }
  if (!isValidEmail(email as string)) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  }
  if (!rating || typeof rating !== "number" || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
    return NextResponse.json({ error: "Rating must be 1-5" }, { status: 400 });
  }
  if (!display_name || typeof display_name !== "string" || display_name.trim().length < 2) {
    return NextResponse.json({ error: "Display name is required (min 2 characters)" }, { status: 400 });
  }
  if (!title || typeof title !== "string" || title.trim().length < 3) {
    return NextResponse.json({ error: "Review title is required (min 3 characters)" }, { status: 400 });
  }
  if (!reviewBody || typeof reviewBody !== "string" || reviewBody.trim().length < 10) {
    return NextResponse.json({ error: "Review body is required (min 10 characters)" }, { status: 400 });
  }

  for (const [fieldName, fieldValue] of [
    ["performance_rating", performance_rating],
    ["communication_rating", communication_rating],
    ["fees_rating", fees_rating],
    ["manager_rating", manager_rating],
  ] as const) {
    if (fieldValue != null && (typeof fieldValue !== "number" || !Number.isInteger(fieldValue) || fieldValue < 1 || fieldValue > 5)) {
      return NextResponse.json({ error: `${fieldName} must be 1-5 if provided` }, { status: 400 });
    }
  }

  if (hold_period_months != null && (typeof hold_period_months !== "number" || !Number.isInteger(hold_period_months) || hold_period_months < 1)) {
    return NextResponse.json({ error: "hold_period_months must be a positive integer if provided" }, { status: 400 });
  }

  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";

  if (checkRateLimit(ip)) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  const supabase = createAdminClient();

  const { data: fund } = await supabase
    .from("fund_listings")
    .select("id, title, slug")
    .eq("slug", fund_slug)
    .eq("status", "active")
    .single();

  if (!fund) {
    return NextResponse.json({ error: "Fund not found" }, { status: 404 });
  }

  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const sanitizedEmail = (email as string).trim().toLowerCase().slice(0, 254);

  const { data: existing } = await supabase
    .from("fund_reviews")
    .select("id")
    .eq("fund_slug", fund.slug)
    .eq("email", sanitizedEmail)
    .gte("created_at", ninetyDaysAgo)
    .limit(1);

  if (existing && existing.length > 0) {
    return NextResponse.json({ error: "You have already reviewed this fund recently." }, { status: 409 });
  }

  const verificationToken = crypto.randomUUID();

  const sanitizedName = sanitize(display_name, 50);
  const sanitizedTitle = sanitize(title, 120);
  const sanitizedBody = sanitize(reviewBody, 2000);
  const sanitizedPros = pros ? sanitize(pros, 500) : null;
  const sanitizedCons = cons ? sanitize(cons, 500) : null;

  const { error: insertError } = await supabase.from("fund_reviews").insert({
    fund_id: fund.id,
    fund_slug: fund.slug,
    display_name: sanitizedName,
    email: sanitizedEmail,
    rating,
    title: sanitizedTitle,
    body: sanitizedBody,
    pros: sanitizedPros,
    cons: sanitizedCons,
    performance_rating: performance_rating || null,
    communication_rating: communication_rating || null,
    fees_rating: fees_rating || null,
    manager_rating: manager_rating || null,
    hold_period_months: hold_period_months || null,
    verification_token: verificationToken,
    status: "pending",
  });

  if (insertError) {
    log.error("fund_review insert error", { error: insertError.message });
    return NextResponse.json({ error: "Failed to submit review" }, { status: 500 });
  }

  const { getSiteUrl } = await import("@/lib/url");
  const siteUrl = getSiteUrl();
  const verifyUrl = `${siteUrl}/api/fund-review/verify?token=${verificationToken}`;

  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey) {
    try {
      const html = buildVerificationEmail(sanitizedName, fund.title, verifyUrl);
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Invest.com.au <fees@invest.com.au>",
          to: [sanitizedEmail],
          subject: `Verify your review of ${fund.title} — Invest.com.au`,
          html,
        }),
      });
    } catch (err) {
      log.error("Failed to send verification email", { error: err instanceof Error ? err.message : String(err) });
    }
  }

  return NextResponse.json({ success: true });
}
