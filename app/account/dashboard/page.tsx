import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { enforcePortalKind } from "@/lib/portal-gate";
import { getInvestorProfile } from "@/lib/investor-profiles";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My Dashboard — Invest.com.au",
  robots: "noindex, nofollow",
};

function pct(current: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((current / target) * 100));
}

function formatDollars(cents: number): string {
  const dollars = cents / 100;
  if (dollars >= 1_000_000) return `$${(dollars / 1_000_000).toFixed(1)}M`;
  if (dollars >= 1_000) return `$${(dollars / 1_000).toFixed(0)}K`;
  return `$${dollars.toFixed(0)}`;
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const now = new Date();
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

type GoalRow = {
  id: number;
  label: string;
  goal_type: string;
  target_cents: number;
  current_balance_cents: number;
  target_date: string;
};

type UserProfile = {
  display_name: string | null;
  investing_experience: string | null;
  investment_goals: string | null;
  portfolio_size: string | null;
  interested_in: string[] | null;
  state: string | null;
  onboarding_completed: boolean | null;
};

function profileCompleteness(profile: UserProfile | null): number {
  if (!profile) return 0;
  const checks = [
    !!profile.display_name,
    !!profile.investing_experience,
    !!profile.investment_goals,
    !!profile.portfolio_size,
    !!(profile.interested_in && profile.interested_in.length > 0),
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

type SnapshotCardProps = {
  title: string;
  value: string | number;
  sub: string;
  href: string;
  emptyHint?: string;
};

function SnapshotCard({ title, value, sub, href, emptyHint }: SnapshotCardProps) {
  return (
    <Link
      href={href}
      className="block bg-white border border-slate-200 rounded-xl p-4 hover:border-violet-300 hover:shadow-sm transition-all group"
    >
      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{title}</div>
      <div className="text-2xl font-extrabold text-slate-900 group-hover:text-violet-700 transition-colors">{value}</div>
      <div className="text-xs text-slate-500 mt-0.5">{sub}</div>
      {emptyHint && value === 0 && (
        <div className="mt-2 text-xs text-violet-600 font-medium">{emptyHint} →</div>
      )}
    </Link>
  );
}

type NavCardProps = {
  href: string;
  emoji: string;
  label: string;
  desc: string;
};

function NavCard({ href, emoji, label, desc }: NavCardProps) {
  return (
    <Link
      href={href}
      className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors group"
    >
      <span className="text-xl shrink-0 mt-0.5">{emoji}</span>
      <div>
        <div className="text-sm font-semibold text-slate-800 group-hover:text-violet-700 transition-colors">{label}</div>
        <div className="text-xs text-slate-500 mt-0.5">{desc}</div>
      </div>
    </Link>
  );
}

export default async function PersonalDashboardPage() {
  await enforcePortalKind("investor");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // user is guaranteed after enforcePortalKind; this narrows the type
  if (!user) return null;

  const [profileRes, goalsRes, holdingsRes, watchlistRes, investorProfile] = await Promise.all([
    supabase.from("user_profiles").select("display_name, investing_experience, investment_goals, portfolio_size, interested_in, state, onboarding_completed").eq("id", user.id).maybeSingle(),
    supabase.from("investor_goals").select("id, label, goal_type, target_cents, current_balance_cents, target_date").order("target_date", { ascending: true }),
    supabase.from("investor_holdings").select("id", { count: "exact", head: true }),
    supabase.from("user_watchlist_items").select("id", { count: "exact", head: true }),
    getInvestorProfile(user.id),
  ]);

  const profile = profileRes.data as UserProfile | null;
  const goals = (goalsRes.data ?? []) as GoalRow[];
  const holdingsCount = holdingsRes.count ?? 0;
  const watchlistCount = watchlistRes.count ?? 0;
  const completeness = profileCompleteness(profile);

  const displayName = profile?.display_name ?? investorProfile?.displayName ?? null;
  const firstName = displayName?.split(" ")[0] ?? null;

  // Nearest goal with a real target date
  const nearestGoal = goals.find((g) => daysUntil(g.target_date) > 0) ?? goals[0] ?? null;

  // Personalized action links based on investor profile flags
  type Action = { label: string; href: string };
  const actions: Action[] = [];
  if (investorProfile?.isFhb) actions.push({ label: "First home buyer guides + FHSS calculator", href: "/first-home-buyer" });
  if (investorProfile?.isPreRetiree) actions.push({ label: "Super & retirement planning hub", href: "/super" });
  if (investorProfile?.isBusinessOwner) actions.push({ label: "Business investor tools", href: "/account/upgrade/business" });
  if (investorProfile?.isCrossBorder) actions.push({ label: "Cross-border investing hub", href: "/foreign-investment" });
  if (investorProfile?.isHnw) actions.push({ label: "Wholesale & private markets", href: "/wholesale" });
  if (actions.length === 0) actions.push({ label: "Take our platform quiz to get personalised picks", href: "/quiz" });
  actions.push({ label: "Find a financial advisor near you", href: "/find-advisor" });

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-2xl font-extrabold text-slate-900">
          {firstName ? `Welcome back, ${firstName}` : "My Dashboard"}
        </h1>
        <p className="text-sm text-slate-500 mt-1">{user.email}</p>
      </header>

      {/* Financial snapshot */}
      <section aria-labelledby="snapshot-heading" className="mb-8">
        <h2 id="snapshot-heading" className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
          Financial snapshot
        </h2>
        <div className="grid grid-cols-3 gap-3">
          <SnapshotCard
            title="Goals"
            value={goals.length}
            sub={goals.length === 1 ? "active goal" : "active goals"}
            href="/account/goals"
            emptyHint="Add your first goal"
          />
          <SnapshotCard
            title="Holdings"
            value={holdingsCount}
            sub={holdingsCount === 1 ? "position tracked" : "positions tracked"}
            href="/account/holdings"
            emptyHint="Track a holding"
          />
          <SnapshotCard
            title="Watchlist"
            value={watchlistCount}
            sub={watchlistCount === 1 ? "item watched" : "items watched"}
            href="/account/watchlist"
            emptyHint="Add to watchlist"
          />
        </div>
      </section>

      {/* Nearest goal progress */}
      {nearestGoal && (
        <section aria-labelledby="goal-heading" className="mb-8">
          <h2 id="goal-heading" className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
            Progress towards {nearestGoal.label}
          </h2>
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-end justify-between mb-2">
              <div>
                <span className="text-lg font-extrabold text-slate-900">
                  {formatDollars(nearestGoal.current_balance_cents)}
                </span>
                <span className="text-sm text-slate-500 ml-1">
                  of {formatDollars(nearestGoal.target_cents)} target
                </span>
              </div>
              <span className="text-sm font-bold text-violet-700">
                {pct(nearestGoal.current_balance_cents, nearestGoal.target_cents)}%
              </span>
            </div>
            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-violet-500 rounded-full transition-all duration-700"
                style={{ width: `${pct(nearestGoal.current_balance_cents, nearestGoal.target_cents)}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-slate-500">
                Target date: {new Date(nearestGoal.target_date).toLocaleDateString("en-AU", { month: "long", year: "numeric" })}
              </span>
              <Link href="/account/goals" className="text-xs text-violet-600 font-semibold hover:underline">
                View all goals →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Profile completeness nudge */}
      {completeness < 100 && (
        <section aria-labelledby="completeness-heading" className="mb-8">
          <h2 id="completeness-heading" className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
            Profile completeness
          </h2>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-blue-900">
                {completeness}% complete
              </span>
              <Link href="/account/investor-profile" className="text-xs font-semibold text-blue-700 hover:underline">
                Complete profile →
              </Link>
            </div>
            <div className="h-2 bg-blue-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-700"
                style={{ width: `${completeness}%` }}
              />
            </div>
            <p className="text-xs text-blue-700 mt-2">
              A complete profile unlocks personalised advisor matches, goal projections, and tailored content.
            </p>
          </div>
        </section>
      )}

      {/* Personalised quick actions */}
      <section aria-labelledby="actions-heading" className="mb-8">
        <h2 id="actions-heading" className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
          Recommended for you
        </h2>
        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
          {actions.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors group"
            >
              <span className="text-sm text-slate-700 group-hover:text-violet-700 transition-colors">{a.label}</span>
              <svg className="w-4 h-4 text-slate-400 group-hover:text-violet-600 shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>
      </section>

      {/* Navigation grid */}
      <section aria-labelledby="nav-heading">
        <h2 id="nav-heading" className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
          Your account
        </h2>
        <div className="bg-white border border-slate-200 rounded-xl p-2 grid grid-cols-1 sm:grid-cols-2">
          <NavCard href="/account/profile" emoji="👤" label="Profile" desc="Name, avatar, email" />
          <NavCard href="/account/investor-profile" emoji="🧠" label="Investor Profile" desc="Goals, experience, interests" />
          <NavCard href="/account/goals" emoji="🎯" label="Financial Goals" desc="Set targets, track progress" />
          <NavCard href="/account/holdings" emoji="💼" label="Holdings" desc="Track your portfolio positions" />
          <NavCard href="/account/watchlist" emoji="📈" label="Watchlist" desc="Stocks, ETFs, funds on your radar" />
          <NavCard href="/account/bookmarks" emoji="🔖" label="Reading List" desc="Saved articles and guides" />
          <NavCard href="/account/quizzes" emoji="📝" label="Quiz History" desc="Platform quiz results" />
          <NavCard href="/account/notifications" emoji="🔔" label="Notifications" desc="Email preferences and alerts" />
          <NavCard href="/account/referrals" emoji="🎁" label="Referrals" desc="Invite friends, earn rewards" />
          <NavCard href="/account/privacy" emoji="🔒" label="Privacy & Data" desc="Export, delete, GDPR rights" />
        </div>
      </section>
    </main>
  );
}
