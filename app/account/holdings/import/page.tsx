import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { enforcePortalKind } from "@/lib/portal-gate";
import ImportWizard from "./ImportWizard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Import holdings from CSV — My Account",
  robots: "noindex, nofollow",
};

/**
 * /account/holdings/import — CSV import wizard.
 *
 * The server's only jobs are the workspace gate, auth, and handing the
 * client the user's existing holdings (for the dedupe step). The file
 * itself is parsed entirely in the browser — nothing is uploaded until
 * the user confirms, and then only the structured rows they approved.
 */
export default async function HoldingsImportPage() {
  await enforcePortalKind("investor", "/account/holdings/import");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/auth/login?next=/account/holdings/import");
  }

  const { data: holdings } = await supabase
    .from("investor_holdings")
    .select("id, ticker, exchange, shares, cost_basis_per_share_cents, acquired_at")
    .order("acquired_at", { ascending: false });

  const existingHoldings = (holdings ?? []).map((row) => ({
    id: row.id as number,
    ticker: row.ticker as string,
    exchange: row.exchange as string,
    shares: Number(row.shares),
    costBasisPerShareCents: Number(row.cost_basis_per_share_cents),
    acquiredAt: row.acquired_at as string,
  }));

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <header className="mb-6">
        <Link
          href="/account/holdings"
          className="text-sm font-medium text-emerald-700 hover:text-emerald-900 underline underline-offset-2"
        >
          ← Back to holdings
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-2">
          Import holdings from CSV
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Upload a CSV you exported from your broker — CommSec, SelfWealth,
          Stake, Interactive Brokers, NABTrade or Sharesight — or map the
          columns of any other CSV. The file is read in your browser and
          nothing is saved until you confirm.
        </p>
      </header>
      <ImportWizard existingHoldings={existingHoldings} />
    </main>
  );
}
