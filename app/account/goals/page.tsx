import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { enforcePortalKind } from "@/lib/portal-gate";
import { isFlagEnabled } from "@/lib/feature-flags";
import {
  HOUSEHOLDS_FLAG,
  getHouseholdContextForUser,
  getPartnerSharedRows,
  partnerLabel as buildPartnerLabel,
} from "@/lib/households";
import { getInvestorProfile } from "@/lib/investor-profiles";
import HouseholdViewToggle from "@/components/household/HouseholdViewToggle";
import GoalsClient, { type GoalRow } from "./GoalsClient";
import PartnerGoals, { type PartnerGoalRow } from "./PartnerGoals";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Goals — My Account",
  robots: "noindex, nofollow",
};

export default async function GoalsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await enforcePortalKind("investor");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/auth/login?next=/account/goals");
  }

  const sp = (await searchParams) ?? {};

  // Household mode: dormant unless flag on AND an accepted partner exists.
  const householdFlag = await isFlagEnabled(HOUSEHOLDS_FLAG, {
    userKey: user.email ?? null,
    segment: "user",
  });

  // Scope own goals explicitly — in household mode the new RLS policy would
  // otherwise surface the partner's shared goals into this owner query too.
  // Select household_id too (when the flag is on) to seed the share toggle.
  const ownGoalCols = householdFlag
    ? "id, label, goal_type, target_cents, target_date, current_balance_cents, monthly_contribution_cents, expected_return_pct, notes, household_id"
    : "id, label, goal_type, target_cents, target_date, current_balance_cents, monthly_contribution_cents, expected_return_pct, notes";
  const { data } = await supabase
    .from("investor_goals")
    .select(ownGoalCols)
    .eq("auth_user_id", user.id)
    .order("target_date", { ascending: true });

  const initialItems: GoalRow[] = ((data ?? []) as unknown as Record<string, unknown>[]).map((r) => ({
    id: r.id as number,
    label: r.label as string,
    goalType: r.goal_type as GoalRow["goalType"],
    targetCents: Number(r.target_cents),
    targetDate: r.target_date as string,
    currentBalanceCents: Number(r.current_balance_cents),
    monthlyContributionCents: Number(r.monthly_contribution_cents),
    expectedReturnPct: Number(r.expected_return_pct),
    notes: (r.notes as string | null) ?? null,
    shared: householdFlag ? r.household_id != null : false,
  }));

  const householdCtx = householdFlag
    ? await getHouseholdContextForUser(user.id)
    : null;
  const hasPartner = !!householdCtx?.partner;
  const householdMode = hasPartner && sp.view === "household";

  let partnerName: string | null = null;
  if (hasPartner && householdCtx?.partner?.user_id) {
    try {
      const profile = await getInvestorProfile(householdCtx.partner.user_id);
      partnerName = profile?.displayName ?? null;
    } catch {
      partnerName = null;
    }
  }
  const partnerLabel = buildPartnerLabel({
    displayName: partnerName,
    email: householdCtx?.partner?.invited_email ?? null,
  });

  const partnerGoals: PartnerGoalRow[] = householdMode
    ? (
        await getPartnerSharedRows<{
          id: number;
          label: string;
          goal_type: string;
          target_cents: number;
          target_date: string;
          current_balance_cents: number;
          monthly_contribution_cents: number;
          expected_return_pct: number;
        }>({
          userId: user.id,
          kind: "goal",
          columns:
            "id, label, goal_type, target_cents, target_date, current_balance_cents, monthly_contribution_cents, expected_return_pct",
        })
      ).map((p) => ({
        id: Number(p.row.id),
        label: p.row.label,
        goalType: p.row.goal_type,
        targetCents: Number(p.row.target_cents),
        targetDate: p.row.target_date,
        currentBalanceCents: Number(p.row.current_balance_cents),
        monthlyContributionCents: Number(p.row.monthly_contribution_cents),
        expectedReturnPct: Number(p.row.expected_return_pct),
      }))
    : [];

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <header className="mb-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Goals</h1>
            <p className="text-sm text-slate-600 mt-1">
              Set a target + deadline, log your current balance + monthly contribution, and see whether you&apos;re on track. Pure projection — never financial advice. See your accountant or financial planner for personalised guidance.
            </p>
          </div>
          {hasPartner && (
            <HouseholdViewToggle
              active={householdMode ? "household" : "mine"}
              partnerLabel={partnerLabel}
            />
          )}
        </div>
      </header>
      <GoalsClient initialItems={initialItems} householdEnabled={householdFlag && hasPartner} />
      {householdMode && (
        <PartnerGoals goals={partnerGoals} partnerLabel={partnerLabel} />
      )}
    </main>
  );
}
