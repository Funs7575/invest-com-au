import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { absoluteUrl, breadcrumbJsonLd } from "@/lib/seo";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Rate Changes Today — Australian Savings & Term Deposit Rates | Invest.com.au",
  description: "See which Australian savings accounts and term deposits changed their rates today. Updated automatically as rates move.",
  alternates: { canonical: "/rates/today" },
  openGraph: {
    title: "Rate Changes Today — Invest.com.au",
    description: "Which Australian savings accounts and term deposits changed rates today.",
    url: "/rates/today",
  },
};

type Direction = "up" | "down" | "new";

interface ChangeRow {
  id: string;
  broker_slug: string;
  broker_name: string;
  product_kind: string;
  old_rate_bps: number | null;
  new_rate_bps: number;
  delta_bps: number;
  direction: Direction;
  snapshot_captured_at: string;
  logged_at: string;
}

const PRODUCT_LABELS: Record<string, string> = {
  savings_account: "Savings Account",
  term_deposit: "Term Deposit",
};

const DIRECTION_CONFIG: Record<Direction, { label: string; color: string; bg: string; arrow: string }> = {
  up:   { label: "Rate up",   color: "#16a34a", bg: "#f0fdf4", arrow: "↑" },
  down: { label: "Rate down", color: "#dc2626", bg: "#fef2f2", arrow: "↓" },
  new:  { label: "New",       color: "#1d4ed8", bg: "#eff6ff", arrow: "★" },
};

function bpsToPercent(bps: number): string {
  return (bps / 100).toFixed(2) + "%";
}

function groupByDate(changes: ChangeRow[]): Map<string, ChangeRow[]> {
  const map = new Map<string, ChangeRow[]>();
  for (const c of changes) {
    const date = new Date(c.snapshot_captured_at).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    if (!map.has(date)) map.set(date, []);
    map.get(date)!.push(c);
  }
  return map;
}

export default async function RatesTodayPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("rate_change_log")
    .select("id, broker_slug, broker_name, product_kind, old_rate_bps, new_rate_bps, delta_bps, direction, snapshot_captured_at, logged_at")
    .order("logged_at", { ascending: false })
    .limit(100);

  const changes = (data ?? []) as ChangeRow[];

  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Rates", url: absoluteUrl("/rates") },
    { name: "Today's Changes" },
  ]);

  const byDate = groupByDate(changes);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />

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
                      const productLabel = PRODUCT_LABELS[c.product_kind] ?? c.product_kind;
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
          </div>
        </div>
      </div>
    </>
  );
}
