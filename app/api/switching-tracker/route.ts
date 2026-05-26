/**
 * /api/switching-tracker
 *
 * GET  — list the authenticated user's tracked products with comparison data
 * POST — add a product to track
 *
 * All results are general information only — estimates based on user-supplied
 * inputs. Not personal financial advice.
 *
 * Rate-limits: 30/min/IP
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import { createClient } from "@/lib/supabase/server";
import { ipKey, isAllowed } from "@/lib/rate-limit-db";
import { logger } from "@/lib/logger";
import {
  compareBrokerCost,
  compareSavingsCost,
  formatDollars,
  yearsHeld,
} from "@/lib/switching-tracker";

export const runtime = "nodejs";

const log = logger("api:switching-tracker");

const PRODUCT_KINDS = ["broker", "savings_account", "term_deposit", "super", "crypto"] as const;

const AddBody = z.object({
  productKind: z.enum(PRODUCT_KINDS),
  brokerId: z.coerce.number().int().positive().nullish(),
  brokerName: z.string().min(1).max(100),
  startedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  feeText: z.string().max(100).nullish(),
  estimatedTradesPa: z.coerce.number().int().min(0).max(10000).nullish(),
  estimatedBalanceCents: z.coerce.number().int().min(0).nullish(),
});

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  if (!(await isAllowed("switching_tracker_get", ipKey(req), { max: 30, refillPerSec: 0.5 }))) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: products, error } = await supabase
    .from("user_current_products")
    .select("id, product_kind, broker_id, broker_name, started_at, fee_text, estimated_trades_pa, estimated_balance_cents, status, created_at")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) {
    log.warn("switching-tracker GET failed", { error: error.message });
    return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  }

  // For each active product, look up the best-in-class for comparison
  const enriched = await Promise.all(
    (products ?? []).map(async (p) => {
      let comparison: {
        annualSavingCents: number;
        annualSavingLabel: string;
        lifetimeSavingCents: number;
        lifetimeSavingLabel: string;
        bestBrokerName: string | null;
        bestBrokerSlug: string | null;
      } | null = null;

      try {
        if (
          (p.product_kind === "broker" || p.product_kind === "crypto") &&
          p.estimated_trades_pa !== null &&
          p.estimated_trades_pa !== undefined
        ) {
          // Find the broker's current fee value
          let currentFeePerTradeCents = 299; // $2.99 default fallback
          if (p.broker_id) {
            const { data: brokerData } = await supabase
              .from("brokers")
              .select("asx_fee_value")
              .eq("id", p.broker_id)
              .single();
            if (brokerData?.asx_fee_value != null) {
              currentFeePerTradeCents = Math.round(brokerData.asx_fee_value * 100);
            }
          }

          // Find the cheapest active broker
          const { data: bestBroker } = await supabase
            .from("brokers")
            .select("name, slug, asx_fee_value")
            .eq("status", "active")
            .eq("platform_type", p.product_kind === "crypto" ? "crypto_exchange" : "share_broker")
            .not("asx_fee_value", "is", null)
            .order("asx_fee_value", { ascending: true })
            .limit(1)
            .single();

          const bestFeePerTradeCents = bestBroker?.asx_fee_value != null
            ? Math.round(bestBroker.asx_fee_value * 100)
            : 0;

          const result = compareBrokerCost({
            currentFeePerTradeCents,
            bestFeePerTradeCents,
            estimatedTradesPa: p.estimated_trades_pa ?? 0,
            yearsHeld: yearsHeld(p.started_at),
          });

          comparison = {
            annualSavingCents: result.annualSavingCents,
            annualSavingLabel: formatDollars(result.annualSavingCents),
            lifetimeSavingCents: result.lifetimeSavingCents,
            lifetimeSavingLabel: formatDollars(result.lifetimeSavingCents),
            bestBrokerName: bestBroker?.name ?? null,
            bestBrokerSlug: bestBroker?.slug ?? null,
          };
        } else if (
          (p.product_kind === "savings_account" || p.product_kind === "term_deposit") &&
          p.estimated_balance_cents !== null &&
          p.estimated_balance_cents !== undefined
        ) {
          // Find current rate for this broker
          let currentRateBps = 0;
          if (p.broker_id) {
            const { data: snap } = await supabase
              .from("savings_rate_snapshots")
              .select("rate_bps")
              .eq("broker_id", p.broker_id)
              .eq("product_kind", p.product_kind)
              .order("captured_at", { ascending: false })
              .limit(1)
              .single();
            currentRateBps = snap?.rate_bps ?? 0;
          }

          // Find best rate across all brokers
          const { data: bestSnap } = await supabase
            .from("savings_rate_snapshots")
            .select("rate_bps, brokers(name, slug)")
            .eq("product_kind", p.product_kind)
            .order("rate_bps", { ascending: false })
            .limit(1)
            .single();

          const bestRateBps = bestSnap?.rate_bps ?? currentRateBps;
          const bestBrokerData = bestSnap?.brokers as { name: string; slug: string } | null | undefined;

          const result = compareSavingsCost({
            currentRateBps,
            bestRateBps,
            estimatedBalanceCents: p.estimated_balance_cents ?? 0,
            yearsHeld: yearsHeld(p.started_at),
          });

          comparison = {
            annualSavingCents: result.annualSavingCents,
            annualSavingLabel: formatDollars(result.annualSavingCents),
            lifetimeSavingCents: result.lifetimeSavingCents,
            lifetimeSavingLabel: formatDollars(result.lifetimeSavingCents),
            bestBrokerName: (bestBrokerData as { name: string } | null)?.name ?? null,
            bestBrokerSlug: (bestBrokerData as { slug: string } | null)?.slug ?? null,
          };
        }
      } catch {
        // Comparison is non-critical
      }

      return { ...p, comparison };
    }),
  );

  return NextResponse.json({ products: enriched });
}

// ── POST ──────────────────────────────────────────────────────────────────────

export const POST = withValidatedBody(AddBody, async (req: NextRequest, body) => {
  if (!(await isAllowed("switching_tracker_post", ipKey(req), { max: 30, refillPerSec: 0.5 }))) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Cap at 20 tracked products per user
  const { count } = await supabase
    .from("user_current_products")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("status", "active");
  if ((count ?? 0) >= 20) {
    return NextResponse.json({ error: "You can track up to 20 products." }, { status: 422 });
  }

  const { data, error } = await supabase
    .from("user_current_products")
    .insert({
      user_id: user.id,
      product_kind: body.productKind,
      broker_id: body.brokerId ?? null,
      broker_name: body.brokerName,
      started_at: body.startedAt,
      fee_text: body.feeText ?? null,
      estimated_trades_pa: body.estimatedTradesPa ?? null,
      estimated_balance_cents: body.estimatedBalanceCents ?? null,
    })
    .select("id")
    .single();

  if (error || !data) {
    log.warn("switching-tracker add failed", { error: error?.message });
    return NextResponse.json({ error: "Could not save product." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
});
