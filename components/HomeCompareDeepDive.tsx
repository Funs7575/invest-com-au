"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { DesignIcon } from "@/components/design/DesignIcon";
import { SponsorChip } from "@/components/design/Atoms";
import { Logo } from "@/components/design/Atoms";

export interface CompareBroker {
  id: number | string;
  slug: string;
  name: string;
  platform_type: string | null;
  logo_url: string | null;
  color: string | null;
  rating: number | null;
  asx_fee: string | null;
  asx_fee_value: number | null;
  sponsorship_tier: string | null;
  promoted_placement: boolean | null;
  editors_pick: boolean | null;
}

const CAT_META: Record<string, { label: string; color: string; criterion: string; href: string; valueLabel: string }> = {
  share_broker:    { label: "Stock brokers",  color: "#60a5fa", criterion: "by total cost on $200/month DCA", href: "/share-trading", valueLabel: "Trade" },
  super_fund:      { label: "Super funds",    color: "#34d399", criterion: "by 10-yr balanced return net of fees", href: "/super",       valueLabel: "Fee" },
  savings_account: { label: "Savings",        color: "#fbbf24", criterion: "by max bonus rate (conditions met)",   href: "/savings",     valueLabel: "Rate" },
  crypto_exchange: { label: "Crypto",         color: "#a78bfa", criterion: "by maker/taker fee on AUD pairs",      href: "/crypto",      valueLabel: "Fee" },
  term_deposit:    { label: "Term deposits",  color: "#f59e0b", criterion: "by 12-month rate at $50k",             href: "/term-deposits", valueLabel: "Rate" },
  robo_advisor:    { label: "Robo / managed", color: "#94a3b8", criterion: "by all-in fee on $50k portfolio",      href: "/robo-advisors", valueLabel: "Fee" },
};

interface HomeCompareDeepDiveProps {
  brokers: ReadonlyArray<CompareBroker>;
}

export default function HomeCompareDeepDive({ brokers }: HomeCompareDeepDiveProps) {
  const groups = useMemo(() => {
    const buckets = new Map<string, CompareBroker[]>();
    for (const b of brokers) {
      if (!b.platform_type) continue;
      const arr = buckets.get(b.platform_type) ?? [];
      arr.push(b);
      buckets.set(b.platform_type, arr);
    }
    return buckets;
  }, [brokers]);

  const tabs = useMemo(() => {
    const all = Array.from(groups.entries())
      .filter(([k]) => CAT_META[k])
      .map(([k, items]) => ({ key: k, n: items.length, label: CAT_META[k]?.label ?? k }))
      .sort((a, b) => b.n - a.n);
    return all;
  }, [groups]);

  const [activeTab, setActiveTab] = useState<string>(tabs[0]?.key ?? "share_broker");

  // Show three category cards (the active tab + the next two with most rows)
  const featuredKeys = useMemo(() => {
    const pool = tabs.map((t) => t.key);
    if (pool.length === 0) return [];
    if (!pool.includes(activeTab)) return pool.slice(0, 3);
    const ordered = [activeTab, ...pool.filter((k) => k !== activeTab)];
    return ordered.slice(0, 3);
  }, [tabs, activeTab]);

  return (
    <section
      style={{
        padding: "52px 36px",
        background: "var(--color-ink-900)",
        color: "white",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div aria-hidden className="iv2-dotgrid" style={{ position: "absolute", inset: 0, opacity: 0.4, pointerEvents: "none" }} />

      <div style={{ position: "relative", maxWidth: 1280, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 18, gap: 16, flexWrap: "wrap" }}>
          <div>
            <span className="iv2-mini" style={{ color: "var(--color-coral-300)" }}>
              ● Compare · {brokers.length} platforms · verified monthly
            </span>
            <h2
              className="font-display"
              style={{
                fontSize: 30,
                letterSpacing: "-.028em",
                fontWeight: 800,
                margin: "4px 0 0",
                lineHeight: 1.05,
                color: "white",
              }}
            >
              Every fee. Seven categories. One source.
            </h2>
          </div>
          <Link href="/compare" className="iv2-cta" style={{ fontSize: 12.5 }}>
            See all comparisons <DesignIcon name="arrow-right" size={11} />
          </Link>
        </div>

        <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap", borderBottom: "1px solid rgba(255,255,255,.1)" }}>
          {tabs.map((t) => {
            const active = activeTab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setActiveTab(t.key)}
                style={{
                  padding: "9px 12px",
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: "pointer",
                  border: "none",
                  background: "none",
                  color: active ? "white" : "rgba(255,255,255,.5)",
                  borderBottom: active ? "2px solid var(--color-coral-400)" : "2px solid transparent",
                  marginBottom: -1,
                  fontFamily: "inherit",
                }}
              >
                {t.label}
                <span style={{ fontSize: 10.5, color: "rgba(255,255,255,.4)", fontWeight: 500, marginLeft: 3 }}>{t.n}</span>
              </button>
            );
          })}
        </div>

        <div className="home-compare-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {featuredKeys.map((key) => {
            const meta = CAT_META[key];
            if (!meta) return null;
            const rows = (groups.get(key) ?? []).slice(0, 3);
            if (rows.length === 0) return null;
            return (
              <div
                key={key}
                style={{
                  background: "rgba(255,255,255,.04)",
                  border: "1px solid rgba(255,255,255,.08)",
                  borderRadius: 12,
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div style={{ padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,.08)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3 }}>
                    <span aria-hidden style={{ width: 7, height: 7, borderRadius: 99, background: meta.color }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: "white" }}>{meta.label}</span>
                  </div>
                  <div style={{ fontSize: 10.5, color: "rgba(255,255,255,.5)" }}>Ranked {meta.criterion}</div>
                </div>
                {rows.map((row, j) => {
                  const isPromoted = !!row.promoted_placement || row.sponsorship_tier === "featured_partner" || row.sponsorship_tier === "deal_of_month";
                  const isEditor = !!row.editors_pick;
                  const initials = row.name
                    .split(/\s+/)
                    .map((p) => p[0])
                    .filter(Boolean)
                    .slice(0, 2)
                    .join("")
                    .toUpperCase();
                  const value = row.asx_fee ?? (row.asx_fee_value != null ? `$${row.asx_fee_value}` : "—");
                  return (
                    <div
                      key={row.id}
                      style={{
                        padding: "9px 14px",
                        display: "grid",
                        gridTemplateColumns: "22px 26px 1fr auto auto",
                        gap: 9,
                        alignItems: "center",
                        borderBottom: j < rows.length - 1 ? "1px solid rgba(255,255,255,.06)" : "none",
                        background: isPromoted ? "rgba(242,88,34,.08)" : "transparent",
                      }}
                    >
                      <span className="font-mono" style={{ fontSize: 9.5, color: "rgba(255,255,255,.4)", fontWeight: 700 }}>
                        0{j + 1}
                      </span>
                      <Logo name={initials} bg={row.color ?? "var(--color-ink-700)"} size={24} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: "white", display: "flex", alignItems: "center", gap: 5 }}>
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.name}</span>
                          {isPromoted ? <SponsorChip kind="promoted" /> : isEditor ? <SponsorChip kind="editor" /> : null}
                        </div>
                        <div className="font-mono tnum" style={{ fontSize: 10.5, color: "rgba(255,255,255,.55)", marginTop: 1 }}>
                          {meta.valueLabel} {value}
                        </div>
                      </div>
                      <span className="font-mono" style={{ fontSize: 12.5, fontWeight: 700, color: "white" }}>
                        {row.rating ? row.rating.toFixed(1) : "—"}
                      </span>
                      <DesignIcon name="arrow-right" size={10} style={{ color: "rgba(255,255,255,.4)" }} />
                    </div>
                  );
                })}
                <Link
                  href={meta.href}
                  style={{
                    padding: "10px",
                    fontSize: 11.5,
                    fontWeight: 600,
                    color: meta.color,
                    background: "transparent",
                    border: "none",
                    borderTop: "1px solid rgba(255,255,255,.06)",
                    textAlign: "center",
                    textDecoration: "none",
                  }}
                >
                  Compare all in {meta.label.toLowerCase()} →
                </Link>
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        @media (max-width: 1024px) {
          .home-compare-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}
