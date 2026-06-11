import Link from "next/link";
import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { absoluteUrl, breadcrumbJsonLd, CURRENT_YEAR } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import { readFeeIndex } from "@/lib/fee-index";
import {
  readRecentRateChanges,
  filterChangesWithinDays,
  bpsToPercent,
  RATE_PRODUCT_LABELS,
  type RateChangeRow,
} from "@/lib/rate-changes";
import {
  getRecentFeeChanges,
  fetchBrokerNameMap,
  formatFeeValue,
  FEE_METRIC_LABELS,
  FEE_CHANGE_LOOKBACK_DAYS,
} from "@/lib/fee-changes";
import {
  getUpcomingMarketEvents,
  nextEventOfType,
  MARKET_EVENT_TYPE_LABELS,
} from "@/lib/market-events";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Today — Australian Rates, Fees & Market Events | Invest.com.au",
  description:
    "Today's Australian investing data in one place: savings and term deposit rate changes, broker fee changes, the current brokerage fee index, and upcoming RBA and economic dates.",
  alternates: { canonical: "/today" },
  openGraph: {
    title: "Today — Australian Investing Data | Invest.com.au",
    description:
      "Rate changes, fee changes and upcoming market events — the day's Australian investing data on one page.",
    url: "/today",
    images: [
      {
        url: `/api/og?title=${encodeURIComponent("Today's Investing Data")}&sub=${encodeURIComponent("Rates · Fees · Market Events · " + CURRENT_YEAR)}`,
        width: 1200,
        height: 630,
      },
    ],
  },
};

const TLDR_WINDOW_DAYS = 7;

function fmtMoney(n: number | null): string {
  return n === null ? "—" : `$${n.toFixed(2)}`;
}

function fmtEventDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function fmtLoggedDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    timeZone: "Australia/Sydney",
  });
}

function rateChangeLine(c: RateChangeRow): string {
  const product = RATE_PRODUCT_LABELS[c.product_kind] ?? c.product_kind;
  if (c.direction === "new" || c.old_rate_bps == null) {
    return `${c.broker_name} — ${product}: new rate ${bpsToPercent(c.new_rate_bps)} p.a.`;
  }
  return `${c.broker_name} — ${product}: ${bpsToPercent(c.old_rate_bps)} → ${bpsToPercent(c.new_rate_bps)} p.a.`;
}

const TODAY_FAQS = [
  {
    q: "What does the Today page show?",
    a: "The Today page is a single factual roundup of the Australian investing data Invest.com.au tracks: (1) savings account and term deposit rate changes detected from daily snapshot diffs; (2) trading-platform fee changes detected from pricing snapshots, plus the current AU Brokerage Fee Index (average and median ASX brokerage, US-share fee and FX spread); and (3) upcoming scheduled market events — RBA cash rate decisions, ABS economic releases, ASX rebalances and other published dates. Each section links to its full dedicated page.",
  },
  {
    q: "Where do the numbers on this page come from?",
    a: "All figures are computed from Invest.com.au's own data pipeline: an hourly snapshot of each tracked platform's published pricing, a daily snapshot of published savings and term deposit rates (diffed to produce the rate-change log), and a daily fee-index aggregation across active platforms. Market event dates are sourced from the relevant authority's published schedule (RBA board meeting dates, the ABS release calendar, ASX announcements). Every figure carries the date it was computed or detected.",
  },
  {
    q: "How often is the Today page updated?",
    a: "The page re-renders at most hourly via incremental static regeneration. The underlying data moves on its own cadence: platform pricing snapshots are captured hourly, rate snapshots and the fee index are computed daily, and market events are added as authorities publish or confirm dates. A change typically appears on this page within 24 hours of being detected.",
  },
  {
    q: "Is anything on this page a recommendation?",
    a: "No. Everything on this page is a factual record — detected changes to published rates and fees, descriptive market-wide statistics, and scheduled event dates from official sources. Nothing here takes your objectives, financial situation or needs into account, and no figure is presented as a reason to choose or avoid any product. Always verify current rates, fees and event timing directly with the provider or authority before acting.",
  },
];

const todayFaqLd = faqJsonLd(TODAY_FAQS);

export default async function TodayPage() {
  const [rateChanges, feeChanges, { latest: feeIndex }, events] = await Promise.all([
    readRecentRateChanges(60),
    getRecentFeeChanges(FEE_CHANGE_LOOKBACK_DAYS),
    readFeeIndex(30),
    getUpcomingMarketEvents({ limit: 60 }),
  ]);
  const nameMap = await fetchBrokerNameMap(feeChanges.map((c) => c.brokerSlug));

  const recentRateChanges = filterChangesWithinDays(rateChanges, TLDR_WINDOW_DAYS);
  const rateRows = (recentRateChanges.length > 0 ? recentRateChanges : rateChanges).slice(0, 6);
  const feeRows = feeChanges.slice(0, 4);
  const upcoming = events.slice(0, 6);
  const nextRba = nextEventOfType(events, "rba");

  const dateline = new Date().toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Australia/Sydney",
  });

  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Today" },
  ]);

  const sectionHeading: CSSProperties = {
    fontSize: 13,
    fontWeight: 700,
    color: "var(--color-ink-500)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: 12,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
      {todayFaqLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(todayFaqLd) }}
        />
      )}

      <div style={{ background: "var(--color-ink-50)", minHeight: "100vh", paddingTop: 40, paddingBottom: 64 }}>
        <div className="container-custom" style={{ maxWidth: 840 }}>

          <nav aria-label="Breadcrumb" style={{ fontSize: 12, color: "var(--color-ink-400)", marginBottom: 24 }}>
            <Link href="/" style={{ color: "var(--color-ink-400)", textDecoration: "none" }}>Home</Link>
            <span style={{ margin: "0 6px" }}>/</span>
            <span style={{ color: "var(--color-ink-600)" }}>Today</span>
          </nav>

          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--color-ink-900)", marginBottom: 6 }}>Today&apos;s investing data</h1>
            <p style={{ fontSize: 14, color: "var(--color-ink-500)", margin: 0 }}>
              {dateline} — rate changes, fee changes and upcoming market events, from Invest.com.au&apos;s own
              tracking. General information only.
            </p>
          </div>

          {/* TL;DR — every number dated and linked to its source page */}
          <section className="iv2-card" style={{ padding: "18px 20px", marginBottom: 32 }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, color: "var(--color-ink-500)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 10px" }}>
              At a glance
            </h2>
            <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 8 }}>
              {feeIndex && (
                <li style={{ fontSize: 14, color: "var(--color-ink-700)" }}>
                  Average ASX brokerage is <strong>{fmtMoney(feeIndex.avg_asx_fee)}</strong> (median {fmtMoney(feeIndex.median_asx_fee)}) across {feeIndex.broker_count} tracked platforms — fee index as of {feeIndex.period}.{" "}
                  <Link href="/brokerage-fee-index" style={{ color: "var(--color-ink-600)", fontWeight: 600 }}>Index →</Link>
                </li>
              )}
              <li style={{ fontSize: 14, color: "var(--color-ink-700)" }}>
                <strong>{recentRateChanges.length}</strong> savings / term deposit rate change{recentRateChanges.length === 1 ? "" : "s"} detected in the past {TLDR_WINDOW_DAYS} days.{" "}
                <Link href="/rates/today" style={{ color: "var(--color-ink-600)", fontWeight: 600 }}>Rate changes →</Link>
              </li>
              <li style={{ fontSize: 14, color: "var(--color-ink-700)" }}>
                <strong>{feeChanges.length}</strong> platform fee change{feeChanges.length === 1 ? "" : "s"} detected in the past {FEE_CHANGE_LOOKBACK_DAYS} days.{" "}
                <Link href="/fees/today" style={{ color: "var(--color-ink-600)", fontWeight: 600 }}>Fee changes →</Link>
              </li>
              {nextRba && (
                <li style={{ fontSize: 14, color: "var(--color-ink-700)" }}>
                  Next RBA cash rate decision: <strong>{fmtEventDate(nextRba.event_date)}</strong>.{" "}
                  <Link href="/calendar" style={{ color: "var(--color-ink-600)", fontWeight: 600 }}>Calendar →</Link>
                </li>
              )}
            </ul>
          </section>

          {/* Rates */}
          <section style={{ marginBottom: 32 }}>
            <h2 style={sectionHeading}>Rate changes</h2>
            {rateRows.length === 0 ? (
              <div className="iv2-card" style={{ padding: "20px" }}>
                <p style={{ fontSize: 13, color: "var(--color-ink-500)", margin: 0 }}>
                  No rate changes detected yet — snapshots are diffed daily.{" "}
                  <Link href="/rates" style={{ color: "var(--color-ink-600)", fontWeight: 600 }}>Rate board →</Link>
                </p>
              </div>
            ) : (
              <div className="iv2-card" style={{ overflow: "hidden" }}>
                {rateRows.map((c, i) => (
                  <Link
                    key={c.id}
                    href={c.product_kind === "savings_account" || c.product_kind === "term_deposit"
                      ? `/savings/${c.broker_slug}`
                      : `/broker/${c.broker_slug}`}
                    style={{ textDecoration: "none" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", borderBottom: i < rateRows.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                      <span style={{ fontSize: 12, color: "var(--color-ink-400)", flexShrink: 0, width: 56 }}>{fmtLoggedDate(c.logged_at)}</span>
                      <span style={{ fontSize: 13, color: "var(--color-ink-700)", flex: 1, minWidth: 0 }}>{rateChangeLine(c)}</span>
                      <span style={{ fontSize: 14, color: c.direction === "down" ? "#dc2626" : "#16a34a", fontWeight: 700, flexShrink: 0 }} aria-hidden>
                        {c.direction === "down" ? "↓" : c.direction === "new" ? "★" : "↑"}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
            <p style={{ fontSize: 12, marginTop: 10 }}>
              <Link href="/rates/today" style={{ color: "var(--color-ink-600)", fontWeight: 600 }}>All rate changes →</Link>
              <span style={{ margin: "0 8px", color: "var(--color-ink-300)" }}>·</span>
              <Link href="/rates" style={{ color: "var(--color-ink-600)", fontWeight: 600 }}>Rate board</Link>
            </p>
          </section>

          {/* Fees */}
          <section style={{ marginBottom: 32 }}>
            <h2 style={sectionHeading}>Fee changes</h2>
            {feeRows.length === 0 ? (
              <div className="iv2-card" style={{ padding: "20px" }}>
                <p style={{ fontSize: 13, color: "var(--color-ink-500)", margin: 0 }}>
                  No platform fee changes detected in the past {FEE_CHANGE_LOOKBACK_DAYS} days — brokerage pricing
                  moves far less often than deposit rates.{" "}
                  <Link href="/fee-tracker" style={{ color: "var(--color-ink-600)", fontWeight: 600 }}>Verified fee timeline →</Link>
                </p>
              </div>
            ) : (
              <div className="iv2-card" style={{ overflow: "hidden" }}>
                {feeRows.map((c, i) => (
                  <Link key={`${c.brokerSlug}-${c.metric}-${c.changedAt}`} href={`/compare/${c.brokerSlug}`} style={{ textDecoration: "none" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", borderBottom: i < feeRows.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                      <span style={{ fontSize: 12, color: "var(--color-ink-400)", flexShrink: 0, width: 56 }}>{fmtLoggedDate(c.changedAt)}</span>
                      <span style={{ fontSize: 13, color: "var(--color-ink-700)", flex: 1, minWidth: 0 }}>
                        {nameMap.get(c.brokerSlug) ?? c.brokerSlug} — {FEE_METRIC_LABELS[c.metric]}: {formatFeeValue(c.metric, c.oldValue)} → {formatFeeValue(c.metric, c.newValue)}
                      </span>
                      <span style={{ fontSize: 14, color: c.direction === "up" ? "#dc2626" : "#16a34a", fontWeight: 700, flexShrink: 0 }} aria-hidden>
                        {c.direction === "up" ? "↑" : "↓"}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
            <p style={{ fontSize: 12, marginTop: 10 }}>
              <Link href="/fees/today" style={{ color: "var(--color-ink-600)", fontWeight: 600 }}>All fee changes →</Link>
              <span style={{ margin: "0 8px", color: "var(--color-ink-300)" }}>·</span>
              <Link href="/brokerage-fee-index" style={{ color: "var(--color-ink-600)", fontWeight: 600 }}>Fee index</Link>
              <span style={{ margin: "0 8px", color: "var(--color-ink-300)" }}>·</span>
              <Link href="/fee-tracker" style={{ color: "var(--color-ink-600)", fontWeight: 600 }}>Verified timeline</Link>
            </p>
          </section>

          {/* Upcoming events */}
          <section style={{ marginBottom: 32 }}>
            <h2 style={sectionHeading}>Coming up</h2>
            {upcoming.length === 0 ? (
              <div className="iv2-card" style={{ padding: "20px" }}>
                <p style={{ fontSize: 13, color: "var(--color-ink-500)", margin: 0 }}>
                  No upcoming events published yet.{" "}
                  <Link href="/calendar" style={{ color: "var(--color-ink-600)", fontWeight: 600 }}>Market events calendar →</Link>
                </p>
              </div>
            ) : (
              <div className="iv2-card" style={{ overflow: "hidden" }}>
                {upcoming.map((ev, i) => (
                  <div key={ev.id} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 20px", borderBottom: i < upcoming.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: "1px 6px", borderRadius: 4, background: "#f1f5f9", color: "var(--color-ink-500)", flexShrink: 0, marginTop: 1 }}>
                      {MARKET_EVENT_TYPE_LABELS[ev.event_type] ?? "Other"}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-ink-900)" }}>{ev.title}</div>
                      <div style={{ fontSize: 12, color: "var(--color-ink-500)", marginTop: 2 }}>
                        {fmtEventDate(ev.event_date)}
                        {ev.description ? ` — ${ev.description}` : ""}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p style={{ fontSize: 12, marginTop: 10 }}>
              <Link href="/calendar" style={{ color: "var(--color-ink-600)", fontWeight: 600 }}>Full calendar &amp; .ics subscribe →</Link>
            </p>
          </section>

          {/* More data */}
          <section style={{ marginBottom: 8 }}>
            <h2 style={sectionHeading}>More market data</h2>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link href="/market-pulse" style={{ fontSize: 13, fontWeight: 600, color: "var(--color-ink-600)", textDecoration: "none" }}>Market pulse</Link>
              <Link href="/savings" style={{ fontSize: 13, fontWeight: 600, color: "var(--color-ink-600)", textDecoration: "none" }}>Savings accounts</Link>
              <Link href="/term-deposits" style={{ fontSize: 13, fontWeight: 600, color: "var(--color-ink-600)", textDecoration: "none" }}>Term deposits</Link>
              <Link href="/compare/brokers" style={{ fontSize: 13, fontWeight: 600, color: "var(--color-ink-600)", textDecoration: "none" }}>Compare brokers</Link>
              <Link href="/insights" style={{ fontSize: 13, fontWeight: 600, color: "var(--color-ink-600)", textDecoration: "none" }}>Insights</Link>
            </div>
          </section>

          <p style={{ fontSize: 11, color: "var(--color-ink-400)", lineHeight: 1.5, marginTop: 24 }}>
            All figures are factual records computed from Invest.com.au&apos;s own snapshots of published rates and
            pricing, or sourced from the relevant authority&apos;s published schedule. {GENERAL_ADVICE_WARNING}{" "}
            Verify current rates, fees and event timing directly with the provider or authority.
          </p>

          <section className="mt-10 border-t border-slate-200 pt-8">
            <h2 className="text-lg font-extrabold text-slate-900 mb-5">Frequently asked questions</h2>
            <div className="space-y-3">
              {TODAY_FAQS.map((faq) => (
                <details key={faq.q} className="group rounded-xl border border-slate-200 bg-slate-50">
                  <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 font-semibold text-slate-900 list-none">
                    {faq.q}
                    <span className="shrink-0 text-slate-400 group-open:rotate-180 transition-transform" aria-hidden="true">▾</span>
                  </summary>
                  <p className="px-5 pb-5 text-sm text-slate-600 leading-relaxed">{faq.a}</p>
                </details>
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
