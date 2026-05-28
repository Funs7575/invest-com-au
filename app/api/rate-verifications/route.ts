/**
 * /api/rate-verifications
 *
 * POST — authenticated user reports the rate they actually received
 *        on application to a savings or term-deposit product.
 *        Sends a comparison email showing how the verified rate compares
 *        to the current best in our database.
 *
 * GET  — public aggregate: count of verifications + latest verified rates
 *        for a given broker/product (no PII returned).
 *        Query: ?brokerId=<int>&productKind=savings|term_deposit
 *
 * Rate-limits:
 *   POST — 5 / 10min / IP + DB duplicate check (24h per user+broker+product)
 *   GET  — 60 / min / IP
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import { createClient } from "@/lib/supabase/server";
import { ipKey, isAllowed } from "@/lib/rate-limit-db";
import { sendEmail } from "@/lib/resend";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const log = logger("api:rate-verifications");

// ─── POST body ───────────────────────────────────────────────────────────────

const PostBody = z.object({
  brokerId: z.coerce.number().int().positive(),
  productKind: z.enum(["savings", "term_deposit"]),
  verifiedRateBps: z.coerce.number().int().min(1).max(4999),
  termMonths: z.coerce.number().int().min(1).max(120).nullish(),
  comment: z.string().max(500).nullish(),
});

// ─── POST ─────────────────────────────────────────────────────────────────────

export const POST = withValidatedBody(PostBody, async (req: NextRequest, body) => {
  if (
    !(await isAllowed("rate_verifications_post", ipKey(req), { max: 5, refillPerSec: 0.008 }))
  ) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { brokerId, productKind, verifiedRateBps, termMonths, comment } = body;

  // ── 24h duplicate check ──────────────────────────────────────────────────
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: existing } = await supabase
    .from("rate_verifications")
    .select("id")
    .eq("user_id", user.id)
    .eq("broker_id", brokerId)
    .eq("product_kind", productKind)
    .gte("created_at", since)
    .limit(1);

  if (existing && existing.length > 0) {
    return NextResponse.json(
      { error: "You've already submitted a verification for this product in the last 24 hours." },
      { status: 409 },
    );
  }

  // ── Insert verification ──────────────────────────────────────────────────
  const { error: insertErr } = await supabase.from("rate_verifications").insert({
    user_id: user.id,
    broker_id: brokerId,
    product_kind: productKind,
    verified_rate_bps: verifiedRateBps,
    term_months: termMonths ?? null,
    comment: comment ?? null,
    status: "pending",
  });

  if (insertErr) {
    log.warn("rate verification insert failed", { error: insertErr.message, userId: user.id });
    return NextResponse.json({ error: "Could not save your verification." }, { status: 500 });
  }

  // ── Fetch broker name + best current rate for comparison email ────────────
  const { data: broker } = await supabase
    .from("brokers")
    .select("name")
    .eq("id", brokerId)
    .maybeSingle();

  const { data: bestRateRow } = await supabase
    .from("savings_rate_snapshots")
    .select("rate_bps, brokers!inner(name, slug)")
    .eq("product_kind", productKind)
    .not("rate_bps", "is", null)
    .order("rate_bps", { ascending: false })
    .limit(1)
    .maybeSingle();

  // ── Post-application comparison email (fire-and-forget) ──────────────────
  const verifiedPct = (verifiedRateBps / 100).toFixed(2);
  const brokerName = broker?.name ?? "this provider";
  const productLabel = productKind === "savings" ? "savings account" : "term deposit";

  let comparisonHtml = `<p>You're getting <strong>${verifiedPct}% p.a.</strong> on your ${productLabel} with <strong>${brokerName}</strong>.</p>`;

  if (bestRateRow && (bestRateRow.rate_bps ?? 0) > verifiedRateBps) {
    const bestPct = ((bestRateRow.rate_bps ?? 0) / 100).toFixed(2);
    const bestBroker = (bestRateRow.brokers as unknown as { name: string } | null)?.name ?? "another provider";
    const diffPct = (((bestRateRow.rate_bps ?? 0) - verifiedRateBps) / 100).toFixed(2);
    comparisonHtml += `<p>The current highest ${productLabel} rate we track is <strong>${bestPct}% p.a.</strong> at ${bestBroker} — that&rsquo;s ${diffPct}% more than what you&rsquo;re getting.</p>`;
    comparisonHtml += `<p><a href="https://invest.com.au/savings">See all current ${productLabel} rates →</a></p>`;
  } else {
    comparisonHtml += `<p>That's competitive! <a href="https://invest.com.au/savings">See how other rates compare →</a></p>`;
  }

  const html = `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1e293b">
      <h2 style="font-size:20px;font-weight:700;margin-bottom:8px">Thanks for verifying your rate!</h2>
      ${comparisonHtml}
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0"/>
      <p style="font-size:12px;color:#94a3b8">
        General information only — not personal financial advice. Rates change frequently; always verify with the provider before switching.
      </p>
    </div>`;

  sendEmail({ to: user.email!, subject: "Rate verified — here's how it compares", html }).catch(
    (err) => log.warn("comparison email failed", { err }),
  );

  log.info("rate verification submitted", {
    userId: user.id,
    brokerId,
    productKind,
    verifiedRateBps,
  });

  return NextResponse.json({ ok: true });
});

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  if (!(await isAllowed("rate_verifications_get", ipKey(req), { max: 60, refillPerSec: 1 }))) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const url = new URL(req.url);
  const brokerIdRaw = url.searchParams.get("brokerId");
  const productKind = url.searchParams.get("productKind");

  const brokerId = brokerIdRaw ? parseInt(brokerIdRaw, 10) : null;
  if (!brokerId || isNaN(brokerId)) {
    return NextResponse.json({ error: "brokerId is required." }, { status: 400 });
  }
  if (productKind !== "savings" && productKind !== "term_deposit") {
    return NextResponse.json({ error: "productKind must be savings or term_deposit." }, { status: 400 });
  }

  // Only return verified (approved) verifications — no PII.
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("rate_verifications")
    .select("verified_rate_bps, term_months, created_at")
    .eq("broker_id", brokerId)
    .eq("product_kind", productKind)
    .eq("status", "verified")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    log.warn("rate verifications GET failed", { error: error.message });
    return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  }

  const rows = data ?? [];
  const count = rows.length;
  const avgRateBps =
    count > 0 ? Math.round(rows.reduce((s, r) => s + r.verified_rate_bps, 0) / count) : null;

  return NextResponse.json({
    brokerId,
    productKind,
    count,
    avgRateBps,
    recent: rows.slice(0, 5).map((r) => ({
      rateBps: r.verified_rate_bps,
      termMonths: r.term_months,
      verifiedAt: r.created_at,
    })),
  });
}
