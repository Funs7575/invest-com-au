import type { Metadata } from "next";
import ProfileStrengthCard, { type ProfileField } from "@/components/account/ProfileStrengthCard";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { enforcePortalKind } from "@/lib/portal-gate";
import { getInvestorProfile, type InvestorProfile } from "@/lib/investor-profiles";
import {
  loadMoneyProfileForUser,
  moneyProfileCoverage,
  type MoneyProfileQueryClient,
} from "@/lib/money-profile";
import { getInvestorAccountType, type InvestorAccountType } from "@/lib/account-types";
import SmartRecommendationsStrip from "@/components/SmartRecommendationsStrip";
import { isFlagEnabled } from "@/lib/feature-flags";
import QuestShelf from "@/app/account/_components/QuestShelf";
import OptInBlock from "@/components/open-to-offers/OptInBlock";

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

function countByKey<T extends Record<string, unknown>>(
  rows: T[],
  key: keyof T,
): Map<unknown, number> {
  const m = new Map<unknown, number>();
  for (const r of rows) {
    const k = r[key];
    if (k == null) continue;
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1]! + sorted[mid]!) / 2)
    : (sorted[mid] ?? 0);
}

function percentile(value: number, distribution: number[]): number | null {
  if (distribution.length === 0) return null;
  const lessOrEqual = distribution.filter((n) => n <= value).length;
  return Math.round((lessOrEqual / distribution.length) * 100);
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

function missingProfileFields(profile: UserProfile | null): ProfileField[] {
  const all: [ProfileField, boolean][] = [
    ["display_name", !!profile?.display_name],
    ["investing_experience", !!profile?.investing_experience],
    ["investment_goals", !!profile?.investment_goals],
    ["portfolio_size", !!profile?.portfolio_size],
    ["interested_in", !!(profile?.interested_in && profile.interested_in.length > 0)],
  ];
  return all.filter(([, present]) => !present).map(([key]) => key);
}

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

type AdvisorMatch = {
  id: number;
  slug: string;
  name: string;
  type: string;
  firm_name: string | null;
  location_display: string | null;
  photo_url: string | null;
  rating: number | null;
  review_count: number | null;
  verified: boolean | null;
};

const BUDGET_MAX: Record<string, number | null> = {
  small: 500_000,
  medium: 5_000_000,
  large: 10_000_000,
  whale: null,
};

async function fetchMatchedAdvisors(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profile: InvestorProfile | null,
): Promise<{ advisors: AdvisorMatch[]; matchBasis: string }> {
  let typeFilter: string | null = null;
  let specialtyFilter: string | null = null;
  let internationalFilter: boolean | null = null;
  let matchBasis = "Top-rated advisors";

  if (profile?.isFhb) {
    typeFilter = "mortgage_broker";
    matchBasis = "First home buyer specialists";
  } else if (profile?.isPreRetiree) {
    specialtyFilter = "retirement_planning";
    matchBasis = "Retirement planning specialists";
  } else if (profile?.isHnw) {
    specialtyFilter = "investment_advice";
    matchBasis = "Wealth management specialists";
  } else if (profile?.isBusinessOwner) {
    specialtyFilter = "business_advisory";
    matchBasis = "Business advisory specialists";
  } else if (profile?.isCrossBorder) {
    internationalFilter = true;
    matchBasis = "International investor specialists";
  }

  const budgetMax =
    profile?.budgetBand ? (BUDGET_MAX[profile.budgetBand] ?? null) : null;

  let query = supabase
    .from("professionals")
    .select("id, slug, name, type, firm_name, location_display, photo_url, rating, review_count, verified")
    .eq("status", "active")
    .eq("accepts_new_clients", true)
    .order("rating", { ascending: false, nullsFirst: false })
    .limit(3);

  if (typeFilter) query = query.eq("type", typeFilter);
  if (specialtyFilter) query = query.contains("specialties", [specialtyFilter]);
  if (internationalFilter) query = query.eq("accepts_international", true);
  if (budgetMax !== null) {
    query = query.or(`min_investment_cents.is.null,min_investment_cents.lte.${budgetMax}`);
  }

  const { data } = await query;
  return { advisors: (data ?? []) as AdvisorMatch[], matchBasis };
}

type SnapshotCardProps = {
  title: string;
  value: string | number;
  sub: string;
  href: string;
  emptyHint?: string;
};

interface BenchmarkRowProps {
  label: string;
  user: number;
  median: number;
  pct: number | null;
}
function BenchmarkRow({ label, user, median, pct }: BenchmarkRowProps) {
  const diff = user - median;
  const callout =
    pct !== null
      ? pct >= 80
        ? `Top ${100 - pct}% of investors`
        : pct >= 50
          ? "Above median"
          : pct >= 20
            ? "Below median — room to grow"
            : "Just getting started — that's normal"
      : null;
  return (
    <div className="flex flex-col">
      <p className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">
        {label}
      </p>
      <div className="flex items-baseline gap-2 mt-1">
        <p className="text-xl font-extrabold text-violet-900">{user}</p>
        <p className="text-[11px] text-slate-500">
          most have {median}
          {diff !== 0 && (
            <span
              className={
                diff > 0
                  ? "text-emerald-700 font-semibold ml-1"
                  : "text-slate-500 ml-1"
              }
            >
              ({diff > 0 ? "+" : ""}
              {diff})
            </span>
          )}
        </p>
      </div>
      {callout && (
        <p className="text-[11px] text-violet-700 mt-1">{callout}</p>
      )}
    </div>
  );
}

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

  const [
    profileRes,
    goalsRes,
    holdingsRes,
    watchlistRes,
    investorProfile,
    briefsRes,
    moneyProfile,
  ] = await Promise.all([
    supabase.from("user_profiles").select("display_name, investing_experience, investment_goals, portfolio_size, interested_in, state, onboarding_completed").eq("id", user.id).maybeSingle(),
    supabase.from("investor_goals").select("id, label, goal_type, target_cents, current_balance_cents, target_date").order("target_date", { ascending: true }),
    supabase.from("investor_holdings").select("id", { count: "exact", head: true }),
    supabase.from("user_watchlist_items").select("id", { count: "exact", head: true }),
    getInvestorProfile(user.id),
    // Cross-kind "My Briefs" tile — counts every Match Request filed
    // under this auth user's email regardless of which account kind was
    // active at filing time. Email match handles the legacy anonymous
    // brief flow that doesn't write `auth_user_id`.
    user.email
      ? supabase
          .from("advisor_auctions")
          .select("id, tracker_status", { count: "exact" })
          .eq("contact_email", user.email)
      : Promise.resolve({ data: [], count: 0 }),
    loadMoneyProfileForUser(user.id, supabase as unknown as MoneyProfileQueryClient),
  ]);
  const moneyCoverage = moneyProfileCoverage(moneyProfile);

  const profile = profileRes.data as UserProfile | null;
  const goals = (goalsRes.data ?? []) as GoalRow[];
  const holdingsCount = holdingsRes.count ?? 0;
  const watchlistCount = watchlistRes.count ?? 0;
  const briefsCount = briefsRes.count ?? 0;
  const briefs = (briefsRes.data ?? []) as {
    id: number;
    tracker_status: string;
  }[];
  const briefsActive = briefs.filter(
    (b) => b.tracker_status && !["won", "lost", "withdrawn"].includes(b.tracker_status),
  ).length;
  const completeness = profileCompleteness(profile);

  // LL-02: fetch profile-matched advisors after profile is resolved
  const { advisors: matchedAdvisors, matchBasis: advisorMatchBasis } =
    await fetchMatchedAdvisors(supabase, investorProfile);

  // Benchmarking — anonymised aggregate stats so the user can see "where
  // they stand" vs other investors. Pure counts + medians; no PII leaves
  // the joins. Service-role queries; investor_profiles and
  // investor_holdings are RLS-isolated, so aggregate reads need admin.
  // Fail-soft to nulls — strip hides itself when no signal.
  type Benchmark = {
    median_goals: number;
    median_holdings: number;
    median_watchlist: number;
    investor_total: number;
    user_pct_goals: number | null;
    user_pct_holdings: number | null;
    user_pct_watchlist: number | null;
  };
  let benchmark: Benchmark | null = null;
  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();
    const [
      { count: investorTotal },
      { data: goalsAgg },
      { data: holdingsAgg },
      { data: watchlistAgg },
    ] = await Promise.all([
      admin
        .from("investor_profiles")
        .select("auth_user_id", { count: "exact", head: true }),
      // Use a window of recent active investors to keep aggregates fresh.
      admin
        .from("investor_goals")
        .select("auth_user_id")
        .limit(5000),
      admin.from("investor_holdings").select("auth_user_id").limit(5000),
      admin.from("user_watchlist_items").select("user_id").limit(5000),
    ]);
    const goalCounts = countByKey(
      (goalsAgg ?? []) as { auth_user_id: string }[],
      "auth_user_id",
    );
    const holdingsCounts = countByKey(
      (holdingsAgg ?? []) as { auth_user_id: string }[],
      "auth_user_id",
    );
    const watchlistCounts = countByKey(
      (watchlistAgg ?? []) as { user_id: string }[],
      "user_id",
    );
    benchmark = {
      median_goals: median(Array.from(goalCounts.values())),
      median_holdings: median(Array.from(holdingsCounts.values())),
      median_watchlist: median(Array.from(watchlistCounts.values())),
      investor_total: investorTotal ?? 0,
      user_pct_goals: percentile(goals.length, Array.from(goalCounts.values())),
      user_pct_holdings: percentile(
        holdingsCount,
        Array.from(holdingsCounts.values()),
      ),
      user_pct_watchlist: percentile(
        watchlistCount,
        Array.from(watchlistCounts.values()),
      ),
    };
  } catch {
    /* fail-soft */
  }

  const displayName = profile?.display_name ?? investorProfile?.displayName ?? null;
  const firstName = displayName?.split(" ")[0] ?? null;

  // Monthly Money Review tile — flag-gated; renders nothing when off.
  const monthlyReviewOn = await isFlagEnabled("monthly_review", {
    userKey: user.email ?? user.id,
    segment: "user",
  });

  // Open to Offers block — flag-gated; OptInBlock self-fetches status and
  // renders nothing until the flag is on AND a status resolves.
  const openToOffersOn = await isFlagEnabled("open_to_offers", {
    userKey: user.email ?? user.id,
    segment: "user",
  });

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
  if (actions.length === 0) actions.push({ label: "Take our platform quiz to get personalised picks", href: "/get-matched" });
  actions.push({ label: "Find a financial advisor near you", href: "/find-advisor" });

  // AT-02..04: account-type-specific resource hub
  const investorAccountType: InvestorAccountType = getInvestorAccountType(investorProfile?.meta ?? {});
  type HubResource = { emoji: string; label: string; desc: string; href: string };
  const ACCOUNT_TYPE_HUBS: Partial<Record<InvestorAccountType, { heading: string; resources: HubResource[] }>> = {
    couple: {
      heading: "Joint finance hub",
      resources: [
        { emoji: "🎯", label: "Shared financial goals", desc: "Set joint savings targets together", href: "/account/goals" },
        { emoji: "🏠", label: "First home buyer guide", desc: "FHSS, FHBG, and stamp duty concessions", href: "/first-home-buyer" },
        { emoji: "🔄", label: "Should you buy or rent?", desc: "Interactive decision tree for your situation", href: "/tools/buy-vs-rent" },
        { emoji: "👥", label: "Find a financial planner", desc: "Couples + household specialists near you", href: "/find-advisor?need=financial_planner&context=joint_finances" },
      ],
    },
    family: {
      heading: "Family wealth hub",
      resources: [
        { emoji: "🎓", label: "Education savings options", desc: "Investment bonds, scholarships & more", href: "/invest" },
        { emoji: "🏡", label: "First Home Guarantee for your children", desc: "How to help kids enter the market", href: "/first-home-buyer" },
        { emoji: "📜", label: "Estate planning essentials", desc: "Wills, trusts & intergenerational transfer", href: "/find-advisor?need=estate_planner&context=family_wealth" },
        { emoji: "🗓️", label: "Financial calendar & deadlines", desc: "FY dates relevant to family finances", href: "/account/calendar" },
      ],
    },
    business: {
      heading: "Business & SMSF hub",
      resources: [
        { emoji: "🏦", label: "Should you set up an SMSF?", desc: "Cost-effectiveness decision tree", href: "/tools/smsf-setup" },
        { emoji: "✅", label: "SMSF compliance checklist", desc: "Annual obligations & audit prep", href: "/smsf/checklist" },
        { emoji: "💼", label: "Sell your business", desc: "Valuation, CGT concessions, M&A process", href: "/sell-business" },
        { emoji: "🧑‍💼", label: "Find a business advisor", desc: "SMSF specialists & tax accountants", href: "/find-advisor?need=financial_planner&context=smsf,business_advisory" },
      ],
    },
  };
  const accountTypeHub = investorAccountType !== "individual" ? ACCOUNT_TYPE_HUBS[investorAccountType] ?? null : null;

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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
          <SnapshotCard
            title="My Briefs"
            value={briefsCount}
            sub={
              briefsActive > 0
                ? `${briefsActive} active`
                : briefsCount === 1
                  ? "Match Request filed"
                  : "Match Requests filed"
            }
            href="/briefs"
            emptyHint="File your first brief"
          />
        </div>

        {/* Money Profile coverage — the data that powers calculator prefill.
            Hidden once complete; each missing chip deep-links to the single
            place that field is maintained. */}
        {moneyCoverage.missing.length > 0 && (
          <div className="mt-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <p className="text-xs text-slate-600">
                <span className="font-semibold text-slate-800">
                  Money Profile {moneyCoverage.pct}% complete.
                </span>{" "}
                Calculators across the site pre-fill from it — add the rest:
              </p>
              {moneyCoverage.missing.slice(0, 5).map((m) => (
                <Link
                  key={m.label}
                  href={m.href}
                  className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100"
                >
                  + {m.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Open to Offers (flag: open_to_offers). Small isolated block; the
          client component self-hides until the flag-gated API resolves a
          status. */}
      {openToOffersOn && (
        <section aria-label="Open to offers" className="mb-8">
          <OptInBlock variant="dashboard" />
        </section>
      )}

      {/* Monthly Money Review tile (flag: monthly_review). Self-contained,
          rendered only when the flag is on. */}
      {monthlyReviewOn && (
        <section aria-labelledby="monthly-review-heading" className="mb-8">
          <Link
            href="/account/review"
            className="block bg-gradient-to-br from-violet-600 to-violet-700 rounded-xl p-5 text-white hover:from-violet-700 hover:to-violet-800 transition-colors group"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2
                  id="monthly-review-heading"
                  className="text-base font-extrabold flex items-center gap-2"
                >
                  <span aria-hidden="true">🗓️</span> Your Monthly Money Review
                </h2>
                <p className="text-sm text-violet-100 mt-1">
                  10 minutes — net worth, goals, rates and open decisions, with
                  a completion streak.
                </p>
              </div>
              <span
                aria-hidden="true"
                className="shrink-0 text-2xl group-hover:translate-x-0.5 transition-transform"
              >
                →
              </span>
            </div>
          </Link>
        </section>
      )}

      {/* Setup milestones (Consumer Quests, idea #19). Self-gating server
          component: renders nothing when the `consumer_quests` flag is off
          or the table is absent. Isolated single block — do not merge other
          dashboard tiles into this one. */}
      <QuestShelf userId={user.id} />

      {/* Benchmarking strip — "how you compare" against anonymised
          aggregate community stats. Hidden when no signal (new
          install) or when neither user nor community has data. */}
      {benchmark && benchmark.investor_total > 5 && (
        <section
          aria-labelledby="benchmark-heading"
          className="mb-8"
        >
          <h2
            id="benchmark-heading"
            className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3"
          >
            How you compare
          </h2>
          <div className="bg-gradient-to-br from-violet-50 via-white to-violet-50 border border-violet-100 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <BenchmarkRow
              label="Goals tracked"
              user={goals.length}
              median={benchmark.median_goals}
              pct={benchmark.user_pct_goals}
            />
            <BenchmarkRow
              label="Holdings entered"
              user={holdingsCount}
              median={benchmark.median_holdings}
              pct={benchmark.user_pct_holdings}
            />
            <BenchmarkRow
              label="Watchlist items"
              user={watchlistCount}
              median={benchmark.median_watchlist}
              pct={benchmark.user_pct_watchlist}
            />
          </div>
          <p className="text-[10px] text-slate-500 mt-2">
            Aggregated across {benchmark.investor_total.toLocaleString()}{" "}
            investor profiles · refreshed on page load · no personal data
            leaves these comparisons.
          </p>
        </section>
      )}

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

      {/* Profile strength ring + visible unlocks (Northstar D5). Fires the
          profile_complete milestone client-side when it reaches 100. */}
      <ProfileStrengthCard completeness={completeness} missing={missingProfileFields(profile)} />

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
              <svg className="w-4 h-4 text-slate-500 group-hover:text-violet-600 shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>
      </section>

      {/* Smart personalised recommendations — brokers or advisors matched
          to the user's quiz profile / investor profile / intent country.
          Returns null when there is no signal or supply is too sparse. */}
      <SmartRecommendationsStrip />

      {/* AT-02..04 — account-type-specific resource hub */}
      {accountTypeHub && (
        <section aria-labelledby="account-type-hub-heading" className="mb-8">
          <h2 id="account-type-hub-heading" className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
            {accountTypeHub.heading}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {accountTypeHub.resources.map((r) => (
              <Link
                key={r.href}
                href={r.href}
                className="flex items-start gap-3 p-4 bg-white border border-slate-200 rounded-xl hover:border-violet-300 hover:shadow-sm transition-all group"
              >
                <span className="text-xl shrink-0 mt-0.5">{r.emoji}</span>
                <div>
                  <div className="text-sm font-semibold text-slate-800 group-hover:text-violet-700 transition-colors">{r.label}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{r.desc}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Profile-matched advisors (LL-02) */}
      {matchedAdvisors.length > 0 && (
        <section aria-labelledby="advisors-heading" className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 id="advisors-heading" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {advisorMatchBasis}
            </h2>
            <Link href="/find-advisor" className="text-xs text-violet-600 font-semibold hover:underline">
              See all →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {matchedAdvisors.map((adv) => (
              <Link
                key={adv.id}
                href={`/advisor/${adv.slug}`}
                className="flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-xl hover:border-violet-300 hover:shadow-sm transition-all group"
              >
                <div className="relative w-10 h-10 shrink-0">
                  {adv.photo_url ? (
                    <Image
                      src={adv.photo_url}
                      alt={adv.name}
                      fill
                      className="rounded-full object-cover"
                      sizes="40px"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 text-sm font-bold">
                      {adv.name.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900 truncate group-hover:text-violet-700 transition-colors">
                    {adv.name}
                  </div>
                  {adv.firm_name && (
                    <div className="text-xs text-slate-500 truncate">{adv.firm_name}</div>
                  )}
                  {adv.location_display && (
                    <div className="text-xs text-slate-500 truncate mt-0.5">{adv.location_display}</div>
                  )}
                  {adv.rating !== null && (
                    <div className="flex items-center gap-1 mt-1">
                      <svg className="w-3 h-3 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <span className="text-xs font-semibold text-slate-700">{adv.rating.toFixed(1)}</span>
                      {adv.review_count !== null && (
                        <span className="text-xs text-slate-500">({adv.review_count})</span>
                      )}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

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
          <NavCard href="/account/net-worth" emoji="💰" label="Net Worth" desc="Holdings + goals + manual balances" />
          <NavCard href="/account/watchlist" emoji="📈" label="Watchlist" desc="Stocks, ETFs, funds on your radar" />
          <NavCard href="/account/alerts" emoji="📉" label="Alerts" desc="Rate & fee alerts you've set" />
          <NavCard href="/account/bookmarks" emoji="🔖" label="Reading List" desc="Saved articles and guides" />
          <NavCard href="/account/advisers" emoji="🤝" label="My Advisers" desc="Relationships from your Match Requests" />
          <NavCard href="/account/quizzes" emoji="📝" label="Quiz History" desc="Platform quiz results" />
          <NavCard href="/account/notifications" emoji="🔔" label="Notifications" desc="Email preferences and alerts" />
          <NavCard href="/account/referrals" emoji="🎁" label="Referrals" desc="Invite friends, earn rewards" />
          <NavCard href="/account/privacy" emoji="🔒" label="Privacy & Data" desc="Export, delete, GDPR rights" />
          <NavCard href="/account/annual-check" emoji="📅" label="Annual Check-up" desc="FY checklist: super, tax, insurance" />
          <NavCard href="/wrapped" emoji="🎬" label="FY Money Wrapped" desc="Your year in money, recapped" />
          <NavCard href="/account/calendar" emoji="🗓️" label="Financial Calendar" desc="Key tax dates and deadlines" />
          <NavCard href="/account/vault" emoji="🗂️" label="Document Vault" desc="Store super, tax, insurance docs securely" />
          <NavCard href="/account/wholesale-cert" emoji="🏅" label="Wholesale Certification" desc="s708 or professional investor status" />
          <NavCard href="/account/startup-thesis" emoji="🚀" label="Startup Thesis" desc="Sectors, stage, ticket size for deal feed" />
          <NavCard href="/invest/startups/for-you" emoji="✨" label="Startup Deal Feed" desc="Open rounds matched to your thesis" />
        </div>
      </section>
    </main>
  );
}
