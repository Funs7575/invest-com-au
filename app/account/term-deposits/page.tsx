import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { enforcePortalKind } from "@/lib/portal-gate";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import TermDepositsClient, { type TdRow } from "./TermDepositsClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Term Deposits — My Account",
  robots: "noindex, nofollow",
};

export default async function TermDepositsPage() {
  await enforcePortalKind("investor");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/account/login?redirect=/account/term-deposits");
  }

  const { data } = await supabase
    .from("user_term_deposits")
    .select(
      "id, institution_name, provider_slug, principal_cents, rate_bps, term_months, maturity_date, notes",
    )
    .order("maturity_date", { ascending: true });

  const initialItems: TdRow[] = (data ?? []).map((r) => ({
    id: r.id as number,
    institution_name: r.institution_name,
    provider_slug: r.provider_slug ?? "",
    principal_cents: Number(r.principal_cents),
    rate_bps: Number(r.rate_bps),
    term_months: Number(r.term_months),
    maturity_date: r.maturity_date,
    notes: r.notes ?? "",
  }));

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <header className="mb-6">
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
          <Link href="/account" className="hover:text-violet-600">Account</Link>
          <span aria-hidden>›</span>
          <span className="text-slate-700">Term deposits</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Term Deposits</h1>
        <p className="text-sm text-slate-600 mt-1">
          Track your term deposits and get 30/7/1-day maturity reminders by email. Log your locked-in
          rate alongside current market rates to decide whether to roll over or switch.
        </p>
      </header>

      <TermDepositsClient initialItems={initialItems} />

      <footer className="mt-8 pt-4 border-t border-slate-200">
        <p className="text-xs text-slate-500 leading-relaxed">{GENERAL_ADVICE_WARNING}</p>
        <p className="text-xs text-slate-400 mt-1">
          Reminders are sent to your account email at 07:00 UTC on the day the 30/7/1-day window opens.
          Manage notification preferences in{" "}
          <Link href="/account/notifications" className="underline hover:text-violet-600">
            account settings
          </Link>
          .
        </p>
      </footer>
    </main>
  );
}
