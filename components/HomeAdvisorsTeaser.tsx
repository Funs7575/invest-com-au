"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { DesignIcon } from "@/components/design/DesignIcon";
import { PROFESSIONAL_TYPE_LABELS, type ProfessionalType } from "@/lib/types";

export interface HomeAdvisor {
  slug: string;
  name: string;
  firm_name: string | null;
  type: string | null;
  location_display: string | null;
  location_state: string | null;
  rating: number | null;
  review_count: number | null;
  photo_url: string | null;
  fee_description: string | null;
  specialties: string[] | null;
  verified: boolean | null;
}

// Look up a human label for any advisor type. Falls back to a Title-cased
// version of the raw enum (e.g. "real_estate_agent" → "Real Estate Agent")
// rather than letting the raw snake_case key leak into the UI when a new
// type lands in the DB before PROFESSIONAL_TYPE_LABELS is updated.
function formatAdvisorType(key: string): string {
  if (key in PROFESSIONAL_TYPE_LABELS) {
    return PROFESSIONAL_TYPE_LABELS[key as ProfessionalType];
  }
  return key
    .split("_")
    .map((w) => (w.length > 0 ? w[0]!.toUpperCase() + w.slice(1) : w))
    .join(" ");
}

interface HomeAdvisorsTeaserProps {
  advisors: ReadonlyArray<HomeAdvisor>;
  totalCount: number;
}

export default function HomeAdvisorsTeaser({ advisors, totalCount }: HomeAdvisorsTeaserProps) {
  const filters = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of advisors) {
      if (a.type) counts.set(a.type, (counts.get(a.type) ?? 0) + 1);
    }
    const entries = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    return [{ key: "All", label: "All", n: totalCount }, ...entries.map(([k, n]) => ({ key: k, label: formatAdvisorType(k), n }))];
  }, [advisors, totalCount]);

  const [filter, setFilter] = useState<string>("All");
  const visible = (filter === "All" ? advisors : advisors.filter((a) => a.type === filter)).slice(0, 4);

  return (
    <section style={{ padding: "52px 36px", maxWidth: 1280, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 18, gap: 16, flexWrap: "wrap" }}>
        <div>
          <span className="iv2-mini" style={{ color: "var(--color-coral-600)" }}>
            ● Advisors · {totalCount.toLocaleString("en-AU")} verified
          </span>
          <h2
            className="font-display"
            style={{
              fontSize: 30,
              letterSpacing: "-.028em",
              fontWeight: 800,
              margin: "4px 0 0",
              lineHeight: 1.05,
            }}
          >
            Find a human who actually fits your situation.
          </h2>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/advisors" className="iv2-cta-ghost" style={{ fontSize: 12.5 }}>
            Browse all {totalCount.toLocaleString("en-AU")}
          </Link>
          <Link href="/quotes/post" className="iv2-cta" style={{ fontSize: 12.5 }}>
            Post a job — free
          </Link>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 14,
          paddingBottom: 14,
          borderBottom: "1px solid #e5e7eb",
          flexWrap: "wrap",
        }}
      >
        {filters.map((f) => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              style={{
                padding: "7px 12px",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                borderRadius: 99,
                border: "1px solid",
                borderColor: active ? "var(--color-ink-900)" : "#e5e7eb",
                background: active ? "var(--color-ink-900)" : "white",
                color: active ? "white" : "var(--color-ink-500)",
                fontFamily: "inherit",
              }}
            >
              {f.label}
              <span style={{ fontSize: 10, opacity: 0.6, marginLeft: 3 }}>{f.n}</span>
            </button>
          );
        })}
      </div>

      <div className="home-advisors-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {visible.length === 0 && (
          <div style={{ gridColumn: "1 / -1", padding: "36px 18px", textAlign: "center", color: "var(--color-ink-400)", fontSize: 13 }}>
            No advisors in this category yet — <Link href="/advisors" style={{ color: "var(--color-coral-600)", fontWeight: 700 }}>browse all</Link>.
          </div>
        )}
        {visible.map((a) => {
          const initials = a.name
            .split(/\s+/)
            .map((p) => p[0])
            .filter(Boolean)
            .slice(0, 2)
            .join("")
            .toUpperCase();
          return (
            <Link
              key={a.slug}
              href={`/advisor/${a.slug}`}
              className="iv2-card iv2-card-hover"
              style={{ padding: 0, overflow: "hidden", textDecoration: "none", color: "inherit", display: "flex", flexDirection: "column" }}
            >
              <div style={{ display: "flex", gap: 10, padding: "12px 12px 10px" }}>
                <div
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 99,
                    overflow: "hidden",
                    flexShrink: 0,
                    background: "var(--color-ink-700)",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: 16,
                    position: "relative",
                  }}
                >
                  {a.photo_url ? (
                    <Image src={a.photo_url} alt={a.name} fill sizes="46px" style={{ objectFit: "cover" }} />
                  ) : (
                    initials
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "var(--color-ink-900)",
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                    }}
                  >
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</span>
                    {a.verified && <DesignIcon name="shield-check" size={11} style={{ color: "var(--color-emerald-600)" }} />}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--color-ink-500)", marginTop: 1 }}>
                    {a.firm_name ?? (a.type ? formatAdvisorType(a.type) : "Advisor")}
                  </div>
                  <div style={{ fontSize: 10.5, color: "var(--color-ink-400)", marginTop: 1 }}>
                    {a.location_display ?? a.location_state ?? "Australia"}
                  </div>
                </div>
              </div>
              <div style={{ padding: "0 12px 8px", display: "flex", flexWrap: "wrap", gap: 3 }}>
                {(a.specialties ?? []).slice(0, 3).map((s) => (
                  <span
                    key={s}
                    style={{
                      fontSize: 10,
                      padding: "2px 6px",
                      borderRadius: 99,
                      background: "var(--color-sand-50)",
                      color: "var(--color-ink-500)",
                      fontWeight: 600,
                    }}
                  >
                    {s}
                  </span>
                ))}
              </div>
              <div
                style={{
                  padding: "8px 12px",
                  borderTop: "1px solid #e5e7eb",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "var(--color-sand-50)",
                  marginTop: "auto",
                }}
              >
                <div>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--color-ink-900)" }}>
                    {a.fee_description ?? "Fee on enquiry"}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--color-ink-400)", marginTop: 1 }}>
                    {a.rating ? `★ ${a.rating.toFixed(1)}` : "★ —"}
                    {a.review_count ? ` · ${a.review_count}` : ""}
                  </div>
                </div>
                <span className="iv2-cta-ghost" style={{ fontSize: 11, padding: "5px 9px" }}>
                  View <DesignIcon name="arrow-right" size={10} />
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      <style>{`
        @media (max-width: 1024px) {
          .home-advisors-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 640px) {
          .home-advisors-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}
