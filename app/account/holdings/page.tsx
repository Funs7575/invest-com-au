import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import HoldingsClient, { type HoldingRow } from "./HoldingsClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Holdings — My Account",
  robots: "noindex, nofollow",
};

export default async function HoldingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/account/login?redirect=/account/holdings");
  }

  // Fetch holdings + the broker fee table in parallel — the latter feeds
  // the switching coach (asx_fee_value is the comparison axis).
  const [{ data: holdings }, { data: brokers }] = await Promise.all([
    supabase
      .from("investor_holdings")
      .select(
        "id, ticker, exchange, shares, cost_basis_per_share_cents, acquired_at, broker_slug, notes",
      )
      .order("acquired_at", { ascending: false }),
    supabase
      .from("brokers")
      .select("slug, name, asx_fee_value")
      .eq("status", "active"),
  ]);

  const initialItems: HoldingRow[] = (holdings ?? []).map((r) => ({
    id: r.id as number,
    ticker: r.ticker,
    exchange: r.exchange,
    shares: Number(r.shares),
    costBasisPerShareCents: Number(r.cost_basis_per_share_cents),
    acquiredAt: r.acquired_at,
    brokerSlug: r.broker_slug,
    notes: r.notes,
  }));

  const brokerOptions = (brokers ?? []).map((b) => ({
    slug: b.slug as string,
    name: b.name as string,
    asx_fee_value: typeof b.asx_fee_value === "number" ? b.asx_fee_value : null,
  }));

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Holdings</h1>
        <p className="text-sm text-slate-600 mt-1">
          Track what you own across brokers in one place. Manual entry only —
          general information, not financial advice. See your accountant for tax
          treatment.
        </p>
      </header>
      <HoldingsClient initialItems={initialItems} brokers={brokerOptions} />
    </main>
  );
}
