import Link from "next/link";
import type { Metadata } from "next";
import { absoluteUrl, breadcrumbJsonLd, CURRENT_YEAR } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import { readFeeIndex } from "@/lib/fee-index";
import {
  getRecentFeeChanges,
  fetchBrokerNameMap,
  formatFeeValue,
  FEE_METRIC_LABELS,
  FEE_CHANGE_LOOKBACK_DAYS,
  type FeeChangeEvent,
  type FeeChangeDirection,
} from "@/lib/fee-changes";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Fee Changes Today — Australian Broker & Platform Fees | Invest.com.au",
  description:
    "Which Australian trading platforms changed their brokerage, US-share or FX fees recently, plus the current AU Brokerage Fee Index snapshot. Updated from daily fee snapshots.",
  alternates: { canonical: "/fees/today" },
  openGraph: {
    title: "Fee Changes Today — Invest.com.au",
    description:
      "Which Australian trading platforms changed their fees recently, plus today's brokerage fee index snapshot.",
    url: "/fees/today",
    images: [
      {
        url: `/api/og?title=${encodeURIComponent("Fee Changes Today")}&sub=${encodeURIComponent("Brokerage · US Fees · FX Spreads · Daily Updates · " + CURRENT_YEAR)}`,
        width: 1200,
        height: 630,
      },
    ],
  },
};

const DIRECTION_CONFIG: Record<FeeChangeDirection, { label: string; color: string; bg: string; arrow: string }> = {
  up:   { label: "Fee up",   color: "#dc2626", bg: "#fef2f2", arrow: "↑" },
  down: { label: "Fee down", color: "#16a34a", bg: "#f0fdf4", arrow: "↓" },
};

function groupByDate(changes: FeeChangeEvent[]): Map<string, FeeChangeEvent[]> {
  const map = new Map<string, FeeChangeEvent[]>();
  for (const c of changes) {
    const date = new Date(c.changedAt).toLocaleDateString("en-AU", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const arr = map.get(date) ?? [];
    arr.push(c);
    map.set(date, arr);
  }
  return map;
}

function fmtMoney(n: number | null): string {
  return n === null ? "—" : `$${n.toFixed(2)}`;
}

function fmtPct(n: number | null): string {
  return n === null ? "—" : `${n.toFixed(2)}%`;
}

function fmtPeriod(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(`${iso}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

const FEES_TODAY_FAQS = [
  {
    q: "How are broker fee changes detected?",
    a: "Invest.com.au captures a snapshot of each tracked platform's published pricing (ASX brokerage, US-share fee, FX spread) on an automated hourly cycle. This page diffs successive snapshots per platform: when a value moves from its previous level, the change is shown here with the old value, the new value and the date it was first detected. Detection is automated — the separately maintained, human-verified fee changelog lives on the /fee-tracker page, where every entry is checked against the broker's own published pricing before being recorded.",
  },
  {
    q: "Why do fee changes appear less often than rate changes?",
    a: "Brokerage fee schedules move far less frequently than deposit interest rates. Savings and term deposit rates respond to RBA cash rate decisions and funding costs, so dozens of rate changes can land in a single week. Brokerage pricing is a competitive list price that platforms typically revise a handful of times per year. An empty day on this page is the normal state — it means no tracked platform's published pricing moved in the detection window.",
  },
  {
    q: "What is the AU Brokerage Fee Index shown at the top of this page?",
    a: "The AU Brokerage Fee Index is a factual aggregate computed from Invest.com.au's own platform fee snapshots: the average and median ASX per-trade brokerage, US-share fee and FX spread across the active Australian platforms tracked. One value per platform contributes to each statistic (a platform snapshotted multiple times counts once). The full index, including quarter-on-quarter and year-on-year movement, is published at /brokerage-fee-index.",
  },
  {
    q: "Are the detected changes verified?",
    a: "Changes on this page are detected automatically by comparing successive snapshots of each platform's published pricing, so a website parsing artefact can occasionally register before it is corrected on the next cycle. The curated timeline at /fee-tracker contains only changes verified against the broker's own pricing page or PDS. Always confirm current fees directly with the platform before transacting — published pricing can change between snapshot cycles.",
  },
];

const feesTodayFaqLd = faqJsonLd(FEES_TODAY_FAQS);

export default async function FeesTodayPage() {
  const [changes, { latest }] = await Promise.all([
    getRecentFeeChanges(FEE_CHANGE_LOOKBACK_DAYS),
    readFeeIndex(30),
  ]);
  const nameMap = await fetchBrokerNameMap(changes.map((c) => c.brokerSlug));

  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Fee Tracker", url: absoluteUrl("/fee-tracker") },
    { name: "Today's Changes" },
  ]);

  const byDate = groupByDate(changes);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
      {feesTodayFaqLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(feesTodayFaqLd) }}
        />
      )}

      <div style={{ background: "var(--color-ink-50)", minHeight: "100vh", paddingTop: 40, paddingBottom: 64 }}>
        <div className="container-custom" style={{ maxWidth: 840 }}>

          <nav aria-label="Breadcrumb" style={{ fontSize: 12, color: "var(--color-ink-400)", marginBottom: 24 }}>
            <Link href="/" style={{ color: "var(--color-ink-400)", textDecoration: "none" }}>Home</Link>
            <span style={{ margin: "0 6px" }}>/</span>
            <Link href="/fee-tracker" style={{ color: "var(--color-ink-400)", textDecoration: "none" }}>Fee Tracker</Link>
            <span style={{ margin: "0 6px" }}>/</span>
            <span style={{ color: "var(--color-ink-600)" }}>Today&apos;s Changes</span>
          </nav>

          <div style={{ marginBottom: 32 }}>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--color-ink-900)", marginBottom: 6 }}>Fee changes</h1>
            <p style={{ fontSize: 14, color: "var(--color-ink-500)", margin: 0 }}>
              Australian trading-platform fees that moved in the last {FEE_CHANGE_LOOKBACK_DAYS} days, detected automatically from snapshot diffs.
              General information only — verify with the platform before acting.
            </p>
          </div>

          {latest && (
            <section style={{ marginBottom: 32 }}>
              <h2 style={{ fontSize: 13, fontWeight: 700, color: "var(--color-ink-500)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
                Fee index snapshot — {fmtPeriod(latest.period)}
              </h2>
              <div className="iv2-card" style={{ padding: "16px 20px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 12, color: "var(--color-ink-500)" }}>Avg ASX brokerage</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "var(--color-ink-900)" }}>{fmtMoney(latest.avg_asx_fee)}</div>
                    <div style={{ fontSize: 11, color: "var(--color-ink-400)" }}>median {fmtMoney(latest.median_asx_fee)} · {latest.asx_fee_sample} platforms</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: "var(--color-ink-500)" }}>Avg US-share fee</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "var(--color-ink-900)" }}>{fmtMoney(latest.avg_us_fee)}</div>
                    <div style={{ fontSize: 11, color: "var(--color-ink-400)" }}>median {fmtMoney(latest.median_us_fee)} · {latest.us_fee_sample} platforms</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: "var(--color-ink-500)" }}>Avg FX spread</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "var(--color-ink-900)" }}>{fmtPct(latest.avg_fx_spread)}</div>
                    <div style={{ fontSize: 11, color: "var(--color-ink-400)" }}>median {fmtPct(latest.median_fx_spread)} · {latest.fx_spread_sample} platforms</div>
                  </div>
                </div>
                <p style={{ fontSize: 11, color: "var(--color-ink-400)", margin: "12px 0 0" }}>
                  Computed from {latest.broker_count} active platforms&apos; published pricing.{" "}
                  <Link href="/brokerage-fee-index" style={{ color: "var(--color-ink-600)", fontWeight: 600 }}>Full index &amp; trend →</Link>
                </p>
              </div>
            </section>
          )}

          {changes.length === 0 ? (
            <div className="iv2-card" style={{ padding: "48px 32px", textAlign: "center" }}>
              <p style={{ fontSize: 15, color: "var(--color-ink-500)", marginBottom: 8 }}>
                No fee changes detected in the last {FEE_CHANGE_LOOKBACK_DAYS} days.
              </p>
              <p style={{ fontSize: 13, color: "var(--color-ink-400)" }}>
                Platform fee snapshots are diffed daily — brokerage pricing moves far less often than deposit rates.
                The verified historical timeline is on the <Link href="/fee-tracker" style={{ color: "var(--color-ink-600)", fontWeight: 600 }}>fee tracker</Link>.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
              {[...byDate.entries()].map(([dateLabel, rows]) => (
                <section key={dateLabel}>
                  <h2 style={{ fontSize: 13, fontWeight: 700, color: "var(--color-ink-500)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>{dateLabel}</h2>
                  <div className="iv2-card" style={{ overflow: "hidden" }}>
                    {rows.map((c, i) => {
                      const cfg = DIRECTION_CONFIG[c.direction];
                      const brokerName = nameMap.get(c.brokerSlug) ?? c.brokerSlug;
                      return (
                        <Link
                          key={`${c.brokerSlug}-${c.metric}-${c.changedAt}`}
                          href={`/compare/${c.brokerSlug}`}
                          style={{ textDecoration: "none" }}
                        >
                          <div style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 14,
                            padding: "14px 20px",
                            borderBottom: i < rows.length - 1 ? "1px solid #f1f5f9" : "none",
                          }}>
                            <span style={{ fontSize: 16, color: cfg.color, background: cfg.bg, width: 32, height: 32, borderRadius: 99, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontWeight: 700 }}>
                              {cfg.arrow}
                            </span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                <span style={{ fontSize: 14, fontWeight: 700, color: "var(--color-ink-900)" }}>{brokerName}</span>
                                <span style={{ fontSize: 11, fontWeight: 600, padding: "1px 6px", borderRadius: 4, background: "#f1f5f9", color: "var(--color-ink-500)" }}>{FEE_METRIC_LABELS[c.metric]}</span>
                              </div>
                              <div style={{ fontSize: 12, color: "var(--color-ink-500)", marginTop: 2 }}>
                                {formatFeeValue(c.metric, c.oldValue)} → <strong style={{ color: cfg.color }}>{formatFeeValue(c.metric, c.newValue)}</strong>
                                {" "}(<span style={{ color: cfg.color }}>{c.delta > 0 ? "+" : ""}{formatFeeValue(c.metric, c.delta)}</span>)
                              </div>
                            </div>
                            <span style={{ fontSize: 16, color: "var(--color-ink-300)", flexShrink: 0 }} aria-hidden>›</span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}

          <p style={{ fontSize: 11, color: "var(--color-ink-400)", lineHeight: 1.5, marginTop: 32 }}>
            Fee changes are detected by comparing successive snapshots of each platform&apos;s published pricing; the
            human-verified changelog is maintained on the fee tracker. {GENERAL_ADVICE_WARNING} Verify current fees
            directly with the platform.
          </p>

          <div style={{ display: "flex", gap: 12, marginTop: 20, flexWrap: "wrap" }}>
            <Link href="/today" style={{ fontSize: 13, fontWeight: 600, color: "var(--color-ink-600)", textDecoration: "none" }}>← Today&apos;s data</Link>
            <Link href="/fee-tracker" style={{ fontSize: 13, fontWeight: 600, color: "var(--color-ink-600)", textDecoration: "none" }}>Verified fee timeline</Link>
            <Link href="/brokerage-fee-index" style={{ fontSize: 13, fontWeight: 600, color: "var(--color-ink-600)", textDecoration: "none" }}>Brokerage fee index</Link>
            <Link href="/rates/today" style={{ fontSize: 13, fontWeight: 600, color: "var(--color-ink-600)", textDecoration: "none" }}>Rate changes</Link>
            <Link href="/fee-alerts" style={{ fontSize: 13, fontWeight: 600, color: "var(--color-ink-600)", textDecoration: "none" }}>Get fee alerts</Link>
          </div>

          <section className="mt-10 border-t border-slate-200 pt-8">
            <h2 className="text-lg font-extrabold text-slate-900 mb-5">Frequently asked questions</h2>
            <div className="space-y-3">
              {FEES_TODAY_FAQS.map((faq) => (
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
