import type { Metadata } from "next";
import { Suspense } from "react";
import AccountClient from "./AccountClient";
import AccountKindCards from "./AccountKindCards";
import AccountActionPlansTiles from "./AccountActionPlansTiles";
import AccountHero from "./_components/AccountHero";
import AccountActivityFeed from "./_components/AccountActivityFeed";
import { createClient } from "@/lib/supabase/server";
import { getKindsForUser, type KindMembership } from "@/lib/account-kinds";
import { listPlansForUser } from "@/lib/getmatched/action-plans";
import { listForUser as listSavedSearchesForUser } from "@/lib/saved-searches";
import { loadDashboardState, type DashboardState } from "@/lib/account/dashboard-state";
import type { ActionPlan } from "@/lib/getmatched/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My Account",
  robots: "noindex, nofollow",
};

export default async function AccountPage() {
  // Fetch the user's kind memberships server-side so the cards render
  // without a client-side waterfall. AccountClient stays as-is below for
  // the existing legacy account UX (subscription, notification prefs).
  let memberships: KindMembership[] = [];
  let plans: ActionPlan[] = [];
  let savedSearchCount = 0;
  let dashboard: DashboardState | null = null;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const [m, p, s, d] = await Promise.all([
        getKindsForUser(user.id),
        listPlansForUser(user.id),
        listSavedSearchesForUser(user.id),
        loadDashboardState({ authUserId: user.id, email: user.email ?? null }),
      ]);
      memberships = m;
      plans = p;
      savedSearchCount = s.length;
      dashboard = d;
    }
  } catch {
    /* fall through with empty data — AccountClient still renders */
  }

  return (
    <>
      {dashboard && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 space-y-4">
          <AccountHero hero={dashboard.hero} />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Kpi label="Action plans" value={String(dashboard.kpis.plans)} />
            <Kpi label="Match Requests" value={String(dashboard.kpis.briefs)} />
            <Kpi
              label="Quotes awaiting"
              value={String(dashboard.kpis.quotes_awaiting)}
              tone={dashboard.kpis.quotes_awaiting > 0 ? "amber" : "slate"}
            />
          </div>
          <AccountActivityFeed items={dashboard.feed} />
        </div>
      )}
      {plans.length > 0 && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-8">
          <AccountActionPlansTiles plans={plans} />
        </div>
      )}
      {(memberships.length > 0 || savedSearchCount > 0) && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-8">
          <AccountKindCards
            memberships={memberships}
            savedSearchCount={savedSearchCount}
          />
        </div>
      )}
      <Suspense fallback={<div className="py-16 text-center animate-pulse"><div className="h-8 w-48 bg-slate-200 rounded mx-auto" /></div>}>
        <AccountClient />
      </Suspense>
    </>
  );
}

function Kpi({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: string;
  tone?: "slate" | "amber";
}) {
  const cls = tone === "amber"
    ? "bg-amber-50 border-amber-200 text-amber-900"
    : "bg-white border-slate-200 text-slate-900";
  return (
    <div className={`rounded-xl border p-4 ${cls}`}>
      <p className="text-[10px] uppercase tracking-widest mb-1 opacity-80">{label}</p>
      <p className="text-2xl font-extrabold">{value}</p>
    </div>
  );
}
