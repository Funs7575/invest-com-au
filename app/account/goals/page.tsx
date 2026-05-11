import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { enforcePortalKind } from "@/lib/portal-gate";
import GoalsClient, { type GoalRow } from "./GoalsClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Goals — My Account",
  robots: "noindex, nofollow",
};

export default async function GoalsPage() {
  await enforcePortalKind("investor");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/account/login?redirect=/account/goals");
  }

  const { data } = await supabase
    .from("investor_goals")
    .select("id, label, goal_type, target_cents, target_date, current_balance_cents, monthly_contribution_cents, expected_return_pct, notes")
    .order("target_date", { ascending: true });

  const initialItems: GoalRow[] = (data ?? []).map((r) => ({
    id: r.id as number,
    label: r.label,
    goalType: r.goal_type as GoalRow["goalType"],
    targetCents: Number(r.target_cents),
    targetDate: r.target_date,
    currentBalanceCents: Number(r.current_balance_cents),
    monthlyContributionCents: Number(r.monthly_contribution_cents),
    expectedReturnPct: Number(r.expected_return_pct),
    notes: r.notes,
  }));

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Goals</h1>
        <p className="text-sm text-slate-600 mt-1">
          Set a target + deadline, log your current balance + monthly contribution, and see whether you're on track. Pure projection — never financial advice. See your accountant or financial planner for personalised guidance.
        </p>
      </header>
      <GoalsClient initialItems={initialItems} />
    </main>
  );
}
