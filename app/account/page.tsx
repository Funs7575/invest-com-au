import type { Metadata } from "next";
import { Suspense } from "react";
import AccountClient from "./AccountClient";
import AccountKindCards from "./AccountKindCards";
import AccountActionPlansTiles from "./AccountActionPlansTiles";
import { createClient } from "@/lib/supabase/server";
import { getKindsForUser, type KindMembership } from "@/lib/account-kinds";
import { listPlansForUser } from "@/lib/getmatched/action-plans";
import { listForUser as listSavedSearchesForUser } from "@/lib/saved-searches";
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
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const [m, p, s] = await Promise.all([
        getKindsForUser(user.id),
        listPlansForUser(user.id),
        listSavedSearchesForUser(user.id),
      ]);
      memberships = m;
      plans = p;
      savedSearchCount = s.length;
    }
  } catch {
    /* fall through with empty memberships — AccountClient still renders */
  }

  return (
    <>
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
