import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
// eslint-disable-next-line no-restricted-imports -- rate_alert_subscriptions has no anon/auth RLS policy; service-role required for cross-user reads
import { createAdminClient } from "@/lib/supabase/admin";
import { getSubscription } from "@/lib/server/get-subscription";
import ProPaywall from "@/components/ProPaywall";
import { absoluteUrl, breadcrumbJsonLd, SITE_NAME } from "@/lib/seo";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import { getCurrentPricesBatch } from "@/lib/holdings/value";
import { listBookmarks } from "@/lib/bookmarks";
import { metricKindLabel, metricKindPath } from "@/lib/alert-thresholds";
import { SCENARIO_PLANNER_CALC_KEY, type ScenarioPlannerSnapshot } from "@/lib/scenario-engine";
import {
  assembleSavedScenarioPreviews,
  type ScenarioPreview,
} from "@/lib/scenario-deep-link";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `My Dashboard — ${SITE_NAME}`,
  description:
    "Your personal Investor Pro command center — portfolio, net worth, alerts, watchlist, saved scenarios, and deals in one view.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/pro/dashboard" },
};

// ─── Formatting helpers ────────────────────────────────────────────────────

function fmtAUD(cents: number): string {
  if (cents === 0) return "$0";
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

// ─── Summary card ──────────────────────────────────────────────────────────

function SummaryCard({
  href,
  icon,
  title,
  value,
  sub,
  ctaLabel,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  value: string;
  sub?: string;
  ctaLabel: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 hover:border-violet-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="w-9 h-9 bg-violet-50 text-violet-600 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-violet-100 transition-colors">
          {icon}
        </div>
        <span className="text-xs font-semibold text-violet-700 group-hover:text-violet-900 transition-colors">
          {ctaLabel} →
        </span>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-0.5">
          {title}
        </p>
        <p className="text-2xl font-extrabold text-slate-900 tabular-nums leading-tight">
          {value}
        </p>
        {sub && (
          <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">{sub}</p>
        )}
      </div>
    </Link>
  );
}

// ─── Icons ─────────────────────────────────────────────────────────────────

function PortfolioIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  );
}

function NetWorthIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  );
}

function WatchlistIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
    </svg>
  );
}

function ScenariosIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  );
}

function DealsIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
    </svg>
  );
}

function BookmarksIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  );
}

// ─── Re-export for tests ───────────────────────────────────────────────────
// assembleSavedScenarioPreviews is pure and lives in lib/scenario-deep-link —
// re-exported here so test files can follow the same import pattern as the
// existing assembleDashboardSummary tests.
export { assembleSavedScenarioPreviews } from "@/lib/scenario-deep-link";
export type { ScenarioPreview } from "@/lib/scenario-deep-link";

// ─── Saved scenarios inline card ───────────────────────────────────────────

/**
 * Renders the saved scenario planner card with inline previews and Resume links.
 *
 * When `previews` is empty, falls back to the same summary-card style as the
 * other dashboard tiles (count + CTA link) so the layout is consistent.
 *
 * Note: anonymous-only scenarios live in sessionStorage and cannot be read
 * server-side — users who haven't signed in when saving will see an empty
 * state with a prompt to open the planner and re-save while signed in.
 */
function SavedScenariosCard({ previews }: { previews: ScenarioPreview[] }) {
  if (previews.length === 0) {
    // Empty-state: mirror SummaryCard appearance.
    return (
      <Link
        href="/scenarios/plan"
        className="group flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 hover:border-violet-300 hover:shadow-sm transition-all"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="w-9 h-9 bg-violet-50 text-violet-600 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-violet-100 transition-colors">
            <ScenariosIcon />
          </div>
          <span className="text-xs font-semibold text-violet-700 group-hover:text-violet-900 transition-colors">
            Open planner &rarr;
          </span>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-0.5">
            Saved scenarios
          </p>
          <p className="text-2xl font-extrabold text-slate-900 tabular-nums leading-tight">
            None saved
          </p>
          <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">
            Save up to 3 scenarios in the planner to resume them here
          </p>
        </div>
      </Link>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5">
      {/* Card header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-violet-50 text-violet-600 rounded-xl flex items-center justify-center shrink-0">
            <ScenariosIcon />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Saved scenarios
          </p>
        </div>
        <Link
          href="/scenarios/plan"
          className="text-xs font-semibold text-violet-700 hover:text-violet-900 transition-colors shrink-0"
        >
          Planner &rarr;
        </Link>
      </div>

      {/* Scenario rows */}
      <div className="space-y-2">
        {previews.map((preview, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between gap-3 bg-slate-50 rounded-xl px-3 py-2.5"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-900 truncate">
                {preview.label}
              </p>
              <p className="text-xs text-slate-500 leading-snug">
                {formatCurrency(preview.projectedSuper)} projected &middot;{" "}
                {preview.isOnTrack ? (
                  <span className="text-emerald-600 font-semibold">On track</span>
                ) : (
                  <span className="text-amber-600 font-semibold">
                    {formatCurrency(Math.abs(preview.gapToTarget))} gap
                  </span>
                )}
                {" "}&middot; {preview.drawdownYears} yrs drawdown
              </p>
            </div>
            <Link
              href={preview.resumeHref}
              className="shrink-0 text-xs font-bold px-3 py-1.5 bg-violet-100 text-violet-700 rounded-lg hover:bg-violet-200 transition-colors"
            >
              Resume
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Data assembly helpers (importable for tests) ──────────────────────────

export interface DashboardSummary {
  /** Portfolio value in cents, from priced holdings */
  portfolioValueCents: number;
  /** Count of holdings tracked */
  holdingsCount: number;
  /** Number of holdings for which a price was found */
  pricedHoldingsCount: number;
  /** Total net-worth estimate in cents */
  netWorthCents: number;
  /** Number of active rate/fee alerts */
  alertsCount: number;
  /** Whether any alert has been notified (last_notified_at is non-null) */
  hasActiveAlerts: boolean;
  /** Watchlist item count */
  watchlistCount: number;
  /** Saved comparisons count */
  savedScenariosCount: number;
  /** Active pro deals count */
  activeDealsCount: number;
  /** Saved bookmarks count */
  bookmarksCount: number;
}

interface HoldingForValue {
  ticker: string | null;
  exchange: string | null;
  shares: number | null;
  cost_basis_per_share_cents: number | null;
}

interface AlertFeedRow {
  id: string;
  metric_kind: string | null;
  product_kind: string;
  threshold_bps: number;
  direction: string;
  last_notified_at: string | null;
  last_fired_value_bps: number | null;
  notification_count: number;
  broker_slug: string | null;
  lender_slug: string | null;
  verified: boolean;
}

/**
 * Assembles the dashboard summary data from pre-fetched rows.
 * Exported so tests can exercise the logic without JSX rendering.
 */
export function assembleDashboardSummary(params: {
  holdings: HoldingForValue[];
  /** Map keyed by "TICKER|EXCHANGE". Value is null when price not available. */
  priceMap: Map<string, { priceCents: number } | null>;
  manualBalanceTotalCents: number;
  goalBalanceCents: number;
  alerts: { last_notified_at: string | null }[];
  watchlistCount: number;
  savedScenariosCount: number;
  activeDealsCount: number;
  bookmarksCount: number;
}): DashboardSummary {
  const {
    holdings,
    priceMap,
    manualBalanceTotalCents,
    goalBalanceCents,
    alerts,
    watchlistCount,
    savedScenariosCount,
    activeDealsCount,
    bookmarksCount,
  } = params;

  let portfolioValueCents = 0;
  let pricedCount = 0;
  for (const h of holdings) {
    if (!h.ticker || !h.exchange || !h.shares) continue;
    const price = priceMap.get(`${h.ticker}|${h.exchange}`);
    if (price?.priceCents != null) {
      portfolioValueCents += Math.round(h.shares * price.priceCents);
      pricedCount++;
    }
  }

  const netWorthCents = portfolioValueCents + goalBalanceCents + manualBalanceTotalCents;
  const hasActiveAlerts = alerts.some((a) => a.last_notified_at != null);

  return {
    portfolioValueCents,
    holdingsCount: holdings.length,
    pricedHoldingsCount: pricedCount,
    netWorthCents,
    alertsCount: alerts.length,
    hasActiveAlerts,
    watchlistCount,
    savedScenariosCount,
    activeDealsCount,
    bookmarksCount,
  };
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default async function ProDashboardPage() {
  const { user, isPro } = await getSubscription();

  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Pro", url: absoluteUrl("/pro") },
    { name: "My Dashboard" },
  ]);

  const upgradeHref = user
    ? "/account/upgrade"
    : "/auth/login?next=/pro/dashboard";

  if (!isPro || !user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
        />
        <ProPaywall
          title="Pro Dashboard"
          description="Your personal command center — portfolio value, net worth, fee & rate alerts, watchlist, saved scenarios, and exclusive Pro deals all in one place."
          ctaLabel={user ? "Upgrade to Pro" : "Sign in & subscribe"}
          ctaHref={upgradeHref}
          bullets={[
            "Portfolio & net-worth totals pulled from your holdings",
            "Active fee/rate alert count at a glance",
            "Watchlist, saved comparisons, and bookmarks summary",
          ]}
        />
      </div>
    );
  }

  // ── Data fetching (Pro subscribers only reach here) ──────────────────────

  const supabase = await createClient();
  const admin = createAdminClient();

  const userId = user.id;
  const email = user.email ?? "";

  const [
    holdingsRes,
    manualBalancesRes,
    goalsRes,
    watchlistRes,
    savedScenariosRes,
    activeDealsRes,
    calcStateRes,
  ] = await Promise.all([
    supabase
      .from("investor_holdings")
      .select("ticker, exchange, shares, cost_basis_per_share_cents")
      .eq("auth_user_id", userId),
    supabase
      .from("manual_balances")
      .select("amount_cents"),
    supabase
      .from("investor_goals")
      .select("current_balance_cents")
      .eq("auth_user_id", userId),
    supabase
      .from("user_watchlist_items")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("user_saved_comparisons")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("pro_deals")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    // Fetch the signed-in user's calculator state to render scenario previews.
    // user_calculator_state has RLS scoped to auth.uid()=user_id, so the
    // regular server client is correct here (not admin).
    supabase
      .from("user_calculator_state")
      .select("state")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  // rate_alert_subscriptions — fetch full rows for the alert feed section.
  // User-owned (user_id match) + legacy email-keyed rows.
  const alertsRes = await admin
    .from("rate_alert_subscriptions")
    .select(
      "id, metric_kind, product_kind, threshold_bps, direction, last_notified_at, last_fired_value_bps, notification_count, broker_slug, lender_slug, verified",
    )
    .or(`user_id.eq.${userId},email.eq.${email.toLowerCase()}`)
    .order("last_notified_at", { ascending: false, nullsFirst: false })
    .limit(20);

  // Bookmarks — uses listBookmarks which already uses admin client internally
  const bookmarks = await listBookmarks(userId);

  const holdings = (holdingsRes.data ?? []) as HoldingForValue[];
  const manualBalanceTotalCents = (manualBalancesRes.data ?? []).reduce(
    (acc: number, b: { amount_cents: number }) => acc + (b.amount_cents ?? 0),
    0,
  );
  const goalBalanceCents = (goalsRes.data ?? []).reduce(
    (acc: number, g: { current_balance_cents: number }) =>
      acc + (g.current_balance_cents ?? 0),
    0,
  );

  // Fetch current prices for holdings in one batch
  const pricePairs = holdings
    .filter(
      (h): h is HoldingForValue & { ticker: string; exchange: string } =>
        typeof h.ticker === "string" && typeof h.exchange === "string",
    )
    .map((h) => ({ ticker: h.ticker, exchange: h.exchange }));

  const priceMap = await getCurrentPricesBatch(pricePairs);

  const alertRows = (alertsRes.data ?? []) as AlertFeedRow[];

  // Parse saved scenario previews from the user_calculator_state DB row.
  // The DB row holds a JSON blob under `state[SCENARIO_PLANNER_CALC_KEY].data`
  // matching the `ScenarioPlannerSnapshot` shape. If the user has no saved
  // scenarios (or never opened the planner), `scenarioPreviews` will be empty.
  // Anonymous-only saves live in sessionStorage and cannot be read server-side
  // — that is expected and noted in the card's empty-state copy.
  const calcStateData = (
    (calcStateRes.data as { state?: unknown } | null)?.state as
      | Record<string, { data?: unknown }>
      | null
      | undefined
  )?.[SCENARIO_PLANNER_CALC_KEY]?.data as
    | ScenarioPlannerSnapshot
    | null
    | undefined;
  const scenarioPreviews = assembleSavedScenarioPreviews(calcStateData?.scenarios);

  const summary = assembleDashboardSummary({
    holdings,
    priceMap,
    manualBalanceTotalCents,
    goalBalanceCents,
    alerts: alertRows.map((a) => ({ last_notified_at: a.last_notified_at })),
    watchlistCount: watchlistRes.count ?? 0,
    savedScenariosCount: savedScenariosRes.count ?? 0,
    activeDealsCount: activeDealsRes.count ?? 0,
    bookmarksCount: bookmarks.length,
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 md:py-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-6 text-xs text-slate-500">
        <Link href="/" className="hover:text-slate-900">Home</Link>
        <span className="mx-1.5" aria-hidden="true">/</span>
        <Link href="/pro" className="hover:text-slate-900">Pro</Link>
        <span className="mx-1.5" aria-hidden="true">/</span>
        <span className="text-slate-700">My Dashboard</span>
      </nav>

      {/* Header */}
      <header className="mb-8">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-amber-100 text-amber-700 text-xs font-bold rounded-full mb-3">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          INVESTOR PRO · MY DASHBOARD
        </div>
        <h1 className="text-3xl font-bold text-slate-900">My Dashboard</h1>
        <p className="mt-2 text-base text-slate-600 max-w-2xl">
          Your personal investing overview — aggregated from your holdings,
          alerts, watchlist, and saved work. General information only.
        </p>
      </header>

      {/* Summary cards grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">

        {/* Portfolio */}
        <SummaryCard
          href="/account/holdings"
          icon={<PortfolioIcon />}
          title="Investment portfolio"
          value={
            summary.holdingsCount === 0
              ? "No holdings"
              : fmtAUD(summary.portfolioValueCents)
          }
          sub={
            summary.holdingsCount === 0
              ? "Add your first holding to see your portfolio value"
              : `${summary.pricedHoldingsCount} of ${summary.holdingsCount} holding${summary.holdingsCount === 1 ? "" : "s"} priced`
          }
          ctaLabel="Manage holdings"
        />

        {/* Net worth */}
        <SummaryCard
          href="/account/net-worth"
          icon={<NetWorthIcon />}
          title="Estimated net worth"
          value={
            summary.netWorthCents === 0
              ? "Add data"
              : fmtAUD(summary.netWorthCents)
          }
          sub="Holdings + goals + manual balances"
          ctaLabel="View breakdown"
        />

        {/* Rate & fee alerts */}
        <SummaryCard
          href="/account/alerts"
          icon={<AlertIcon />}
          title="Rate & fee alerts"
          value={
            summary.alertsCount === 0
              ? "None set"
              : `${summary.alertsCount} alert${summary.alertsCount === 1 ? "" : "s"}`
          }
          sub={
            summary.alertsCount === 0
              ? "Set alerts to be notified when rates change"
              : summary.hasActiveAlerts
              ? "At least one alert has fired"
              : "Monitoring — no change yet"
          }
          ctaLabel="Manage alerts"
        />

        {/* Watchlist */}
        <SummaryCard
          href="/account/watchlist"
          icon={<WatchlistIcon />}
          title="Watchlist"
          value={
            summary.watchlistCount === 0
              ? "Empty"
              : `${summary.watchlistCount} item${summary.watchlistCount === 1 ? "" : "s"}`
          }
          sub="Brokers and products you are tracking"
          ctaLabel="View watchlist"
        />

        {/* Saved scenarios — inline previews with Resume deep-links */}
        <SavedScenariosCard previews={scenarioPreviews} />

        {/* Pro deals */}
        <SummaryCard
          href="/pro/deals"
          icon={<DealsIcon />}
          title="Exclusive deals"
          value={
            summary.activeDealsCount === 0
              ? "Check back soon"
              : `${summary.activeDealsCount} deal${summary.activeDealsCount === 1 ? "" : "s"} live`
          }
          sub="Sign-up bonuses and reduced fees — Pro only"
          ctaLabel="Browse deals"
        />

        {/* Bookmarks */}
        <SummaryCard
          href="/account/bookmarks"
          icon={<BookmarksIcon />}
          title="Reading list"
          value={
            summary.bookmarksCount === 0
              ? "Empty"
              : `${summary.bookmarksCount} saved`
          }
          sub="Articles, brokers, and advisors you have bookmarked"
          ctaLabel="View bookmarks"
        />

      </div>

      {/* Alert feed — triggered alerts + active monitoring */}
      {alertRows.length > 0 && (
        <section className="mt-10 pt-8 border-t border-slate-100">
          <div className="flex items-baseline justify-between mb-4 gap-2 flex-wrap">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
              Rate &amp; Fee Alerts
            </h2>
            <Link
              href="/account/alerts"
              className="text-xs font-medium text-violet-700 hover:text-violet-900"
            >
              Manage alerts →
            </Link>
          </div>

          <div className="space-y-2">
            {alertRows.map((alert) => {
              const kind = (alert.metric_kind ?? alert.product_kind) as Parameters<typeof metricKindLabel>[0];
              const label = metricKindLabel(kind);
              const path = metricKindPath(kind);
              const thresholdPct = (alert.threshold_bps / 100).toFixed(2);
              const isFee = kind === "broker_fee";
              const hasFired = alert.last_notified_at !== null;
              const directionText = alert.direction === "above" ? "≥" : "≤";
              const firedValuePct =
                alert.last_fired_value_bps !== null
                  ? (alert.last_fired_value_bps / 100).toFixed(2)
                  : null;

              return (
                <Link
                  key={alert.id}
                  href={path}
                  className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 hover:border-violet-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 h-8 w-8 shrink-0 flex items-center justify-center rounded-xl ${
                        hasFired ? "bg-amber-50" : "bg-slate-50"
                      }`}
                    >
                      <svg
                        className={`w-4 h-4 ${hasFired ? "text-amber-500" : "text-slate-400"}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.8}
                          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {label}{" "}
                        <span className="text-slate-500">
                          {directionText} {isFee ? `$${thresholdPct}` : `${thresholdPct}%`}
                        </span>
                      </p>
                      {hasFired ? (
                        <p className="mt-0.5 text-xs text-amber-700 font-medium">
                          Fired
                          {firedValuePct && (
                            <>
                              {" "}at{" "}
                              {isFee ? `$${firedValuePct}` : `${firedValuePct}%`}
                            </>
                          )}
                          {" "}·{" "}
                          {new Date(alert.last_notified_at!).toLocaleDateString("en-AU")}
                          {alert.notification_count > 1 && (
                            <> · {alert.notification_count}×</>
                          )}
                        </p>
                      ) : (
                        <p className="mt-0.5 text-xs text-slate-400">
                          Monitoring — threshold not yet reached
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="shrink-0 text-[0.65rem] font-semibold text-violet-700 mt-0.5">
                    Compare →
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Quick links to Pro tools */}
      <section className="mt-10 pt-8 border-t border-slate-100">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4">
          Pro tools
        </h2>
        <div className="flex flex-wrap gap-3">
          {[
            { href: "/pro/insights", label: "Insights Dashboard" },
            { href: "/pro/research", label: "Premium Research" },
            { href: "/pro/deals", label: "Exclusive Deals" },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:border-violet-300 hover:text-violet-700 transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </section>

      <footer className="mt-10 pt-6 border-t border-slate-100">
        <p className="text-xs text-slate-400 leading-relaxed">
          {GENERAL_ADVICE_WARNING}
        </p>
      </footer>
    </div>
  );
}
