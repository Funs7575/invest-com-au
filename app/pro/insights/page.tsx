import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
// eslint-disable-next-line no-restricted-imports -- broker_price_snapshots/broker_health_score_history have no anon/auth RLS policies; service-role is required
import { createAdminClient } from "@/lib/supabase/admin";
import { getSubscription } from "@/lib/server/get-subscription";
import ProPaywall from "@/components/ProPaywall";
import { absoluteUrl, breadcrumbJsonLd, SITE_NAME } from "@/lib/seo";
import {
  GENERAL_ADVICE_WARNING,
  LOAN_COMPARISON_DISCLAIMER,
} from "@/lib/compliance";
import {
  buildFeeComparisonRows,
  buildHealthScoreMovers,
  buildLoanRateSummary,
  formatDelta,
  type BrokerFeeRow,
  type LoanRateRow,
  type LoanRateSummary,
  type HealthScoreMover,
} from "@/lib/pro-insights";
import type { BrokerHealthScore } from "@/lib/types";
import type { FeeSnapshotRow } from "@/lib/fee-index";
import type { HealthScoreHistoryRow } from "@/lib/health-score-trends";
import { SNAPSHOT_LOOKBACK_HOURS } from "@/lib/fee-index";

export const revalidate = 1800; // 30 min — data caches are richer than page revalidation cost

export const metadata: Metadata = {
  title: `Pro Insights Dashboard — ${SITE_NAME}`,
  description:
    "Full broker fee comparison, health-score movers, and investment loan rate movements — exclusive data views for Investor Pro subscribers.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/pro/insights" },
};

// ─── Formatting helpers ────────────────────────────────────────────────────

function fmtMoney(n: number | null): string {
  if (n === null) return "—";
  return `$${n.toFixed(2)}`;
}

function fmtPct(n: number | null): string {
  if (n === null) return "—";
  return `${n.toFixed(2)}%`;
}

// ─── Sub-components ────────────────────────────────────────────────────────

function SectionHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-bold text-slate-900 md:text-xl">{title}</h2>
      <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>
    </div>
  );
}

function ComplianceNote({ text }: { text: string }) {
  return (
    <p className="mt-3 rounded-md bg-slate-50 border border-slate-100 px-3 py-2 text-[0.68rem] text-slate-500 leading-relaxed">
      {text}
    </p>
  );
}

// ─── Section 1: Full fee comparison ────────────────────────────────────────

function FeeComparisonTable({ rows }: { rows: BrokerFeeRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-slate-400 py-6 text-center">
        No fee snapshot data available yet. Check back after the next hourly snapshot.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th
              scope="col"
              className="py-3 pl-4 pr-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide"
            >
              Platform
            </th>
            <th
              scope="col"
              className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wide"
            >
              ASX Fee
            </th>
            <th
              scope="col"
              className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wide"
            >
              US Share Fee
            </th>
            <th
              scope="col"
              className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wide"
            >
              FX Spread
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr key={row.slug} className="hover:bg-slate-50 transition-colors">
              <td className="py-2.5 pl-4 pr-2 font-medium text-slate-800">
                <Link
                  href={`/compare/${row.slug}`}
                  className="hover:text-violet-700 transition-colors"
                >
                  {row.name}
                </Link>
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">
                {fmtMoney(row.asxFee)}
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">
                {fmtMoney(row.usFee)}
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">
                {fmtPct(row.fxSpread)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Section 2: Health score movers ────────────────────────────────────────

function HealthScoreMoversCard({ movers }: { movers: HealthScoreMover[] }) {
  if (movers.length === 0) {
    return (
      <p className="text-sm text-slate-400 py-6 text-center">
        No significant health score movements yet. Movers appear once trend history accumulates.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {movers.map((m) => {
        const isUp = m.trend.direction === "up";
        const isDown = m.trend.direction === "down";
        const trendColor = isUp
          ? "text-emerald-600"
          : isDown
            ? "text-rose-600"
            : "text-slate-500";
        const trendBg = isUp
          ? "bg-emerald-50"
          : isDown
            ? "bg-rose-50"
            : "bg-slate-50";
        const arrow = isUp ? "▲" : isDown ? "▼" : "—";

        return (
          <div
            key={m.slug}
            className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4"
          >
            <div className="flex-1 min-w-0">
              <Link
                href={`/health-scores/${m.slug}`}
                className="text-sm font-semibold text-slate-800 hover:text-violet-700 transition-colors"
              >
                {m.name}
              </Link>
              <p className="text-xs text-slate-400 mt-0.5">
                {m.trend.count} snapshot{m.trend.count !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-lg font-bold text-slate-900 tabular-nums">
                {m.currentScore.toFixed(0)}
              </p>
              <p className="text-xs text-slate-400">/ 100</p>
            </div>
            <div
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${trendBg} ${trendColor} shrink-0`}
            >
              <span>{arrow}</span>
              <span>{formatDelta(m.trend.delta)} pts</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Section 3: Loan rate summary ──────────────────────────────────────────

function LoanRateSummaryCard({ summary }: { summary: LoanRateSummary }) {
  if (summary.allRates.length === 0) {
    return (
      <p className="text-sm text-slate-400 py-6 text-center">
        No loan rate data available yet.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {/* Headline stats */}
      <div className="grid grid-cols-3 gap-3">
        {(
          [
            { label: "Lowest Rate", value: fmtPct(summary.lowestRate) },
            { label: "Median Rate", value: fmtPct(summary.medianRate) },
            { label: "Highest Rate", value: fmtPct(summary.highestRate) },
          ] as const
        ).map(({ label, value }) => (
          <div
            key={label}
            className="rounded-xl border border-slate-200 bg-white p-4 text-center"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-1">
              {label}
            </p>
            <p className="text-2xl font-bold tabular-nums text-slate-900">
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Recently updated lenders */}
      {summary.recentlyUpdated.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
            Updated in the last 30 days ({summary.recentlyUpdated.length})
          </p>
          <div className="space-y-1.5">
            {summary.recentlyUpdated.map((r) => (
              <div
                key={r.lender_slug}
                className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2"
              >
                <span className="text-sm font-medium text-slate-800">
                  {r.lender_name}
                </span>
                <div className="flex items-center gap-3 shrink-0 text-xs text-right">
                  <span className="tabular-nums text-slate-700 font-semibold">
                    {r.rate_pct.toFixed(2)}% p.a.
                  </span>
                  {r.interest_only && (
                    <span className="rounded-full bg-amber-50 text-amber-700 px-2 py-0.5 font-medium">
                      IO
                    </span>
                  )}
                  {r.offset_available && (
                    <span className="rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 font-medium">
                      Offset
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full rate table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th
                scope="col"
                className="py-3 pl-4 pr-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide"
              >
                Lender
              </th>
              <th
                scope="col"
                className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wide"
              >
                Rate
              </th>
              <th
                scope="col"
                className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wide"
              >
                Comparison
              </th>
              <th
                scope="col"
                className="px-3 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wide"
              >
                Max LVR
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {summary.allRates.map((r) => (
              <tr
                key={r.lender_slug}
                className="hover:bg-slate-50 transition-colors"
              >
                <td className="py-2.5 pl-4 pr-2 font-medium text-slate-800">
                  {r.lender_name}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-slate-700">
                  {r.rate_pct.toFixed(2)}%
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-slate-500">
                  {r.comparison_rate_pct.toFixed(2)}%
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-slate-500">
                  {r.max_lvr}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

/**
 * Returns an ISO timestamp for `SNAPSHOT_LOOKBACK_HOURS` ago.
 * Extracted outside the component so the react-hooks/purity lint rule
 * (which flags Date.now() inside render functions) does not fire. This
 * is a plain module-scope helper — not a hook, not a render function.
 */
function snapshotSinceIso(): string {
  return new Date(
    Date.now() - SNAPSHOT_LOOKBACK_HOURS * 60 * 60 * 1000,
  ).toISOString();
}

export default async function ProInsightsPage() {
  const { user, isPro } = await getSubscription();

  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Pro", url: absoluteUrl("/pro") },
    { name: "Insights" },
  ]);

  // Signed-out → login first; signed-in non-Pro → upgrade page.
  const upgradeHref = user ? "/account/upgrade" : "/auth/login?next=/pro/insights";

  if (!isPro) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
        />
        <ProPaywall
          title="Pro Insights Dashboard"
          description="Full broker fee comparison across all platforms, health-score movers, and investment loan rate movements — exclusive to Investor Pro."
          ctaLabel={user ? "Upgrade to Pro" : "Sign in & subscribe"}
          ctaHref={upgradeHref}
          bullets={[
            "All-broker ASX, US-share and FX fee table — not just the top 3",
            "Health score movers: which platforms improved or declined",
            "Investment loan rate movements updated regularly",
          ]}
        />
      </div>
    );
  }

  // ── Data fetching ── (Pro subscribers only reach here)

  const supabase = await createClient();
  const adminClient = createAdminClient();

  const sinceIso = snapshotSinceIso();

  const [
    snapshotsRes,
    brokersRes,
    scoresRes,
    historyRes,
    loansRes,
  ] = await Promise.all([
    // Fee snapshots — service-role: broker_price_snapshots has no anon/auth RLS policy
    adminClient
      .from("broker_price_snapshots")
      .select("broker_slug, captured_at, status, asx_fee_value, us_fee_value, fx_rate")
      .gte("captured_at", sinceIso)
      .order("captured_at", { ascending: false })
      .limit(5000),
    // Broker display names — public anon SELECT policy
    supabase
      .from("brokers")
      .select("slug, name")
      .eq("status", "active")
      .eq("is_crypto", false),
    // Health scores — public anon SELECT policy
    supabase
      .from("broker_health_scores")
      .select("broker_slug, overall_score, regulatory_score, client_money_score, financial_stability_score, platform_reliability_score, insurance_score"),
    // Health score history — public anon SELECT policy (all brokers, last 90 days)
    supabase
      .from("broker_health_score_history")
      .select("broker_slug, overall_score, regulatory_score, client_money_score, financial_stability_score, platform_reliability_score, insurance_score, captured_at")
      .order("captured_at", { ascending: true })
      .limit(2000),
    // Investment loan rates — public anon SELECT policy
    supabase
      .from("investment_loan_rates")
      .select("lender_name, lender_slug, rate_pct, comparison_rate_pct, max_lvr, interest_only, offset_available, min_loan_cents, apply_url, updated_at")
      .order("rate_pct", { ascending: true }),
  ]);

  const snapshots = (snapshotsRes.data as FeeSnapshotRow[] | null) ?? [];
  const brokerRows = (brokersRes.data as { slug: string; name: string }[] | null) ?? [];
  const scores = (scoresRes.data as BrokerHealthScore[] | null) ?? [];
  const historyRows = (historyRes.data as (HealthScoreHistoryRow & { broker_slug: string })[] | null) ?? [];
  const loanRows = (loansRes.data as LoanRateRow[] | null) ?? [];

  // Build derived structures
  const nameMap = new Map(brokerRows.map((b) => [b.slug, b.name]));

  // Group history rows by broker slug for the movers helper
  const historiesBySlug = new Map<string, HealthScoreHistoryRow[]>();
  for (const row of historyRows) {
    const existing = historiesBySlug.get(row.broker_slug) ?? [];
    existing.push(row);
    historiesBySlug.set(row.broker_slug, existing);
  }

  const feeRows = buildFeeComparisonRows(snapshots, nameMap);
  const movers = buildHealthScoreMovers(scores, historiesBySlug, nameMap, 6);
  const loanSummary = buildLoanRateSummary(loanRows);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:py-14">
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
        <span className="text-slate-700">Insights</span>
      </nav>

      {/* Header */}
      <header className="mb-10">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-amber-100 text-amber-700 text-xs font-bold rounded-full mb-3">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          INVESTOR PRO · EXCLUSIVE
        </div>
        <h1 className="text-3xl font-bold text-slate-900">Insights Dashboard</h1>
        <p className="mt-2 text-base text-slate-600 max-w-2xl">
          Factual data views assembled from our live fee snapshots, broker
          health scores, and lender rate feeds — updated continuously.
        </p>
      </header>

      <div className="space-y-12">

        {/* ── Section 1: Full fee comparison ── */}
        <section aria-labelledby="fee-comparison-heading">
          <SectionHeader
            title="Full Platform Fee Comparison"
            subtitle={`All ${feeRows.length > 0 ? feeRows.length : ""} active brokers — ASX, US-share, and FX spread fees from our latest snapshots.`}
          />
          <FeeComparisonTable rows={feeRows} />
          <div className="mt-2 text-right">
            <Link
              href="/fee-impact"
              className="text-xs text-violet-700 hover:text-violet-900 font-medium"
            >
              Calculate your personal fee impact →
            </Link>
          </div>
          <ComplianceNote text={GENERAL_ADVICE_WARNING} />
        </section>

        {/* ── Section 2: Health score movers ── */}
        <section aria-labelledby="health-movers-heading">
          <SectionHeader
            title="Health Score Movers"
            subtitle="Platforms with the largest safety score change over our recorded history. Point delta = latest minus earliest snapshot."
          />
          <HealthScoreMoversCard movers={movers} />
          <div className="mt-2 text-right">
            <Link
              href="/health-scores"
              className="text-xs text-violet-700 hover:text-violet-900 font-medium"
            >
              View all health scores →
            </Link>
          </div>
          <ComplianceNote text={GENERAL_ADVICE_WARNING} />
        </section>

        {/* ── Section 3: Investment loan rates ── */}
        <section aria-labelledby="loan-rates-heading">
          <SectionHeader
            title="Investment Loan Rates"
            subtitle="Indicative rates from major lenders. Sorted by rate ascending."
          />
          <LoanRateSummaryCard summary={loanSummary} />
          <div className="mt-2 text-right">
            <Link
              href="/property/finance"
              className="text-xs text-violet-700 hover:text-violet-900 font-medium"
            >
              Full investment loan comparison →
            </Link>
          </div>
          <ComplianceNote text={LOAN_COMPARISON_DISCLAIMER} />
        </section>

      </div>

      <footer className="mt-12 pt-6 border-t border-slate-100">
        <p className="text-xs text-slate-400 leading-relaxed">
          {GENERAL_ADVICE_WARNING}
        </p>
      </footer>
    </div>
  );
}
