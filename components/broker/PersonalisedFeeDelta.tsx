import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import type { Broker } from "@/lib/types";

interface Props {
  /** The broker the user is currently viewing. */
  targetBroker: Pick<Broker, "id" | "slug" | "name" | "asx_fee_value" | "us_fee_value" | "fx_rate">;
}

interface HoldingRow {
  ticker: string | null;
  exchange: string | null;
  shares: number | null;
  broker_slug: string | null;
}

interface CurrentBrokerSummary {
  slug: string;
  name: string;
  asxFee: number | null;
  usFee: number | null;
  fxRate: number | null;
}

// FIN_NOTEBOOK item 17 — personalised fee delta on /broker/[slug].
// Mounts on every broker page. For logged-in users with at least one
// holding, fetches their CURRENT broker (the most-watched `broker_slug`
// from investor_holdings) and shows "switching to {target} would save
// you ~$X/yr based on your trading pattern".
//
// Falls back to a quiet "Sign in to see your personalised delta" CTA
// when not logged in. Returns null when:
//   - user has no holdings (nothing to compare against)
//   - user is already on the target broker (no delta)
//   - target broker has no asx_fee_value in DB (can't compute)
//
// What this DOESN'T do (deliberately):
//   - Track frequency of trading per user — uses a heuristic
//     (holdings.shares × estimated 4 trades/yr per holding). Tighter
//     estimates would need a brokerage_history table.
//   - Show FX-fee deltas in detail — flagged as a +$X/yr lift but not
//     itemised.
export default async function PersonalisedFeeDelta({ targetBroker }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        <Link href="/login?next=/broker/{targetBroker.slug}" className="font-semibold text-slate-900 hover:underline">
          Sign in
        </Link>{" "}
        to see how {targetBroker.name} compares to your current broker, using your actual holdings.
      </div>
    );
  }

  const { data: holdings } = await supabase
    .from("investor_holdings")
    .select("ticker, exchange, shares, broker_slug")
    .eq("auth_user_id", user.id);

  const rows = (holdings ?? []) as HoldingRow[];
  if (rows.length === 0) return null;

  // Find the user's current dominant broker.
  const brokerCounts = new Map<string, number>();
  for (const h of rows) {
    if (!h.broker_slug) continue;
    brokerCounts.set(h.broker_slug, (brokerCounts.get(h.broker_slug) ?? 0) + 1);
  }
  if (brokerCounts.size === 0) return null;

  const currentSlug = [...brokerCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  if (!currentSlug || currentSlug === targetBroker.slug) return null;

  const { data: currentRow } = await supabase
    .from("brokers")
    .select("slug, name, asx_fee_value, us_fee_value, fx_rate")
    .eq("slug", currentSlug)
    .maybeSingle();

  if (!currentRow) return null;

  const current: CurrentBrokerSummary = {
    slug: currentRow.slug as string,
    name: currentRow.name as string,
    asxFee: (currentRow.asx_fee_value as number) ?? null,
    usFee: (currentRow.us_fee_value as number) ?? null,
    fxRate: (currentRow.fx_rate as number) ?? null,
  };

  const targetAsxFee = targetBroker.asx_fee_value ?? null;
  if (current.asxFee == null || targetAsxFee == null) return null;

  // Heuristic: 4 ASX trades per holding per year, 1 US trade per US
  // holding per year. Conservative — most users underestimate
  // trade frequency, so flagging is unlikely to overstate.
  const asxHoldings = rows.filter((h) => h.exchange === "ASX").length;
  const usHoldings = rows.filter((h) => h.exchange === "NASDAQ" || h.exchange === "NYSE").length;
  const tradesPerYear = asxHoldings * 4 + usHoldings * 1;

  const asxDelta = (current.asxFee - targetAsxFee) * (asxHoldings * 4);
  const usDelta =
    targetBroker.us_fee_value != null && current.usFee != null
      ? (current.usFee - targetBroker.us_fee_value) * usHoldings
      : 0;
  const totalDelta = asxDelta + usDelta;

  if (Math.abs(totalDelta) < 5) return null; // sub-$5/yr isn't worth surfacing

  const isSavings = totalDelta > 0;
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(Math.abs(n));

  return (
    <div
      className={`rounded-xl border p-4 ${
        isSavings ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"
      }`}
      aria-label="Personalised fee comparison"
    >
      <p className={`text-xs font-semibold uppercase tracking-wider ${isSavings ? "text-emerald-700" : "text-amber-700"}`}>
        Personalised — based on your holdings
      </p>
      <p className="mt-1 text-base text-slate-900">
        Switching from <strong>{current.name}</strong> to <strong>{targetBroker.name}</strong> would{" "}
        <strong>{isSavings ? "save" : "cost"} you about {fmt(totalDelta)}/year</strong> at your current trading pace
        (~{tradesPerYear} trades/yr).
      </p>
      <p className="mt-2 text-xs text-slate-500">
        Heuristic from {rows.length} holding{rows.length === 1 ? "" : "s"} in your account. Doesn&apos;t include FX
        spread or CHESS transfer fees. Always check the full fee schedule before switching.
      </p>
    </div>
  );
}
