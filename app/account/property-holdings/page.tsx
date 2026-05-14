import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { enforcePortalKind } from "@/lib/portal-gate";
import PropertyHoldingsClient, {
  type PropertyRow,
} from "./PropertyHoldingsClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Property holdings — My Account",
  robots: "noindex, nofollow",
};

export default async function PropertyHoldingsPage() {
  await enforcePortalKind("investor");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/account/login?redirect=/account/property-holdings");
  }

  const { data } = await supabase
    .from("property_holdings")
    .select(
      "id, address_line, suburb, state, postcode, purchase_price_cents, purchase_date, current_value_estimate_cents, is_investment_property, weekly_rent_cents, loan_balance_cents, loan_rate_pct, property_type, notes",
    )
    .order("purchase_date", { ascending: false });

  const initialItems: PropertyRow[] = (data ?? []).map((r) => ({
    id: r.id as number,
    addressLine: r.address_line,
    suburb: r.suburb,
    state: r.state,
    postcode: r.postcode,
    purchasePriceCents: Number(r.purchase_price_cents),
    purchaseDate: r.purchase_date,
    currentValueEstimateCents: r.current_value_estimate_cents != null ? Number(r.current_value_estimate_cents) : null,
    isInvestmentProperty: Boolean(r.is_investment_property),
    weeklyRentCents: r.weekly_rent_cents != null ? Number(r.weekly_rent_cents) : null,
    loanBalanceCents: r.loan_balance_cents != null ? Number(r.loan_balance_cents) : null,
    loanRatePct: r.loan_rate_pct != null ? Number(r.loan_rate_pct) : null,
    propertyType: r.property_type,
    notes: r.notes,
  }));

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Property holdings</h1>
        <p className="text-sm text-slate-600 mt-1">
          Track investment + owner-occupied property in one place. Manual entry only — your estimates of current value, not market valuations. General information only — see your accountant for tax treatment.
        </p>
      </header>
      <PropertyHoldingsClient initialItems={initialItems} />
    </main>
  );
}
