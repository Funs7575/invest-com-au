import Link from "next/link";
import type { Metadata } from "next";
import { absoluteUrl, breadcrumbJsonLd, CURRENT_YEAR } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import {
  readRecentRateChanges,
  bpsToPercent,
  RATE_PRODUCT_LABELS,
  type RateChangeRow,
  type RateChangeDirection,
} from "@/lib/rate-changes";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Rate Changes Today — Australian Savings & Term Deposit Rates | Invest.com.au",
  description: "See which Australian savings accounts and term deposits changed their rates today. Updated automatically as rates move.",
  alternates: { canonical: "/rates/today" },
  openGraph: {
    title: "Rate Changes Today — Invest.com.au",
    description: "Which Australian savings accounts and term deposits changed rates today.",
    url: "/rates/today",
    images: [{ url: `/api/og?title=${encodeURIComponent("Rate Changes Today")}&sub=${encodeURIComponent("Savings Accounts · Term Deposits · Daily Updates · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
};

const DIRECTION_CONFIG: Record<RateChangeDirection, { label: string; color: string; bg: string; arrow: string }> = {
  up:   { label: "Rate up",   color: "#16a34a", bg: "#f0fdf4", arrow: "↑" },
  down: { label: "Rate down", color: "#dc2626", bg: "#fef2f2", arrow: "↓" },
  new:  { label: "New",       color: "#1d4ed8", bg: "#eff6ff", arrow: "★" },
};

function groupByDate(changes: RateChangeRow[]): Map<string, RateChangeRow[]> {
  const map = new Map<string, RateChangeRow[]>();
  for (const c of changes) {
    const date = new Date(c.snapshot_captured_at).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    if (!map.has(date)) map.set(date, []);
    map.get(date)!.push(c);
  }
  return map;
}

const RATES_TODAY_FAQS = [
  {
    q: "How often do Australian savings and term deposit rates change?",
    a: "Australian savings account and term deposit rates can change at any time — there is no regulatory minimum notice period for most rate changes. In practice, most institutions move rates within 1–3 business days of an RBA cash rate decision, though some move proactively ahead of expected decisions. Smaller fintechs and challenger banks tend to move faster than the major banks. This page tracks every rate change detected across all providers in Invest.com.au's database, typically updated within 24 hours of a change going live on the provider's website.",
  },
  {
    q: "Why did my bank's rate go down even though the RBA didn't cut?",
    a: "Banks and fintechs change their deposit rates independently of RBA decisions. A bank may cut a promotional savings rate when a promotional period ends, reduce a bonus rate that was only available for new customers, or adjust a term deposit rate in response to changes in wholesale funding costs. Conversely, some providers increase rates to attract deposits regardless of the RBA. The table on this page shows the actual direction and magnitude of each change — not just whether it followed an RBA move.",
  },
  {
    q: "What is the highest savings rate in Australia today?",
    a: "The highest available savings rates in Australia are listed on the /savings page, which shows current rates across all tracked savings accounts sorted by rate. As of today, the highest rates are typically offered by online-only challenger banks and fintechs rather than the major banks. High rates are often conditional on bonus conditions — minimum monthly deposits, no withdrawals, or new-customer-only periods. Always check the full product disclosure statement for the conditions that apply before selecting a savings account.",
  },
  {
    q: "Are rate changes shown on this page final?",
    a: "Rate changes shown on this page are detected by comparing daily snapshots of each provider's published rates. Changes are verified against the provider's fee schedule page before being recorded. Rates should be treated as highly likely to be accurate but always verify the current rate on the provider's own website or via their app before making decisions. Invest.com.au is not responsible for rate changes that occur between daily snapshot cycles.",
  },
];

const ratesTodayFaqLd = faqJsonLd(RATES_TODAY_FAQS);

export default async function RatesTodayPage() {
  const changes = await readRecentRateChanges(100);

  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Rates", url: absoluteUrl("/rates") },
    { name: "Today's Changes" },
  ]);

  const byDate = groupByDate(changes);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
      {ratesTodayFaqLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ratesTodayFaqLd) }}
        />
      )}

      <div style={{ background: "var(--color-ink-50)", minHeight: "100vh", paddingTop: 40, paddingBottom: 64 }}>
        <div className="container-custom" style={{ maxWidth: 840 }}>

          <nav aria-label="Breadcrumb" style={{ fontSize: 12, color: "var(--color-ink-400)", marginBottom: 24 }}>
            <Link href="/" style={{ color: "var(--color-ink-400)", textDecoration: "none" }}>Home</Link>
            <span style={{ margin: "0 6px" }}>/</span>
            <Link href="/rates" style={{ color: "var(--color-ink-400)", textDecoration: "none" }}>Rates</Link>
            <span style={{ margin: "0 6px" }}>/</span>
            <span style={{ color: "var(--color-ink-600)" }}>Today&apos;s Changes</span>
          </nav>

          <div style={{ marginBottom: 32 }}>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--color-ink-900)", marginBottom: 6 }}>Rate changes</h1>
            <p style={{ fontSize: 14, color: "var(--color-ink-500)", margin: 0 }}>
              Australian savings account and term deposit rates that moved recently, detected automatically from snapshot diffs.
              General information only — verify with the provider before acting.
            </p>
          </div>

          {changes.length === 0 ? (
            <div className="iv2-card" style={{ padding: "48px 32px", textAlign: "center" }}>
              <p style={{ fontSize: 15, color: "var(--color-ink-500)", marginBottom: 8 }}>No rate changes detected yet.</p>
              <p style={{ fontSize: 13, color: "var(--color-ink-400)" }}>Rate snapshots are diffed daily — check back tomorrow.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
              {[...byDate.entries()].map(([dateLabel, rows]) => (
                <section key={dateLabel}>
                  <h2 style={{ fontSize: 13, fontWeight: 700, color: "var(--color-ink-500)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>{dateLabel}</h2>
                  <div className="iv2-card" style={{ overflow: "hidden" }}>
                    {rows.map((c, i) => {
                      const cfg = DIRECTION_CONFIG[c.direction] ?? DIRECTION_CONFIG.up;
                      const productLabel = RATE_PRODUCT_LABELS[c.product_kind] ?? c.product_kind;
                      const brokerPath = c.product_kind === "savings_account" || c.product_kind === "term_deposit"
                        ? `/savings/${c.broker_slug}`
                        : `/broker/${c.broker_slug}`;

                      return (
                        <Link
                          key={c.id}
                          href={brokerPath}
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
                                <span style={{ fontSize: 14, fontWeight: 700, color: "var(--color-ink-900)" }}>{c.broker_name}</span>
                                <span style={{ fontSize: 11, fontWeight: 600, padding: "1px 6px", borderRadius: 4, background: "#f1f5f9", color: "var(--color-ink-500)" }}>{productLabel}</span>
                              </div>
                              <div style={{ fontSize: 12, color: "var(--color-ink-500)", marginTop: 2 }}>
                                {c.direction === "new" ? (
                                  <>New rate: <strong style={{ color: cfg.color }}>{bpsToPercent(c.new_rate_bps)}</strong> p.a.</>
                                ) : (
                                  <>
                                    {c.old_rate_bps != null ? bpsToPercent(c.old_rate_bps) : "—"} → <strong style={{ color: cfg.color }}>{bpsToPercent(c.new_rate_bps)}</strong> p.a.
                                    {" "}(<span style={{ color: cfg.color }}>{c.direction === "up" ? "+" : ""}{bpsToPercent(c.delta_bps)}</span>)
                                  </>
                                )}
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
            Rate changes are detected by comparing successive daily snapshots. Figures are in percentage per annum.
            General information only — not financial advice. Verify current rates directly with the provider.
          </p>

          <div style={{ display: "flex", gap: 12, marginTop: 20, flexWrap: "wrap" }}>
            <Link href="/rates" style={{ fontSize: 13, fontWeight: 600, color: "var(--color-ink-600)", textDecoration: "none" }}>← Rate board</Link>
            <Link href="/savings" style={{ fontSize: 13, fontWeight: 600, color: "var(--color-ink-600)", textDecoration: "none" }}>Browse savings accounts</Link>
            <Link href="/term-deposits" style={{ fontSize: 13, fontWeight: 600, color: "var(--color-ink-600)", textDecoration: "none" }}>Browse term deposits</Link>
            <Link href="/fees/today" style={{ fontSize: 13, fontWeight: 600, color: "var(--color-ink-600)", textDecoration: "none" }}>Fee changes</Link>
            <Link href="/today" style={{ fontSize: 13, fontWeight: 600, color: "var(--color-ink-600)", textDecoration: "none" }}>Today&apos;s data</Link>
          </div>

          <section className="mt-10 border-t border-slate-200 pt-8">
            <h2 className="text-lg font-extrabold text-slate-900 mb-5">Frequently asked questions</h2>
            <div className="space-y-3">
              {RATES_TODAY_FAQS.map((faq) => (
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
