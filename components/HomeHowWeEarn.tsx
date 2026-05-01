import Link from "next/link";

const ROWS: ReadonlyArray<{ label: string; pct: number; color: string }> = [
  { label: "Affiliate referrals (flat fees)", pct: 64, color: "var(--color-coral-400)" },
  { label: "Sponsored placements (badged)",   pct: 24, color: "#a78bfa" },
  { label: "Advisor lead bidding",            pct: 9,  color: "#60a5fa" },
  { label: "Newsletter & marketplace",        pct: 3,  color: "rgba(255,255,255,.4)" },
];

export default function HomeHowWeEarn() {
  return (
    <section style={{ background: "var(--color-ink-900)", color: "white", padding: "32px 36px" }}>
      <div
        className="home-earn-grid"
        style={{ maxWidth: 1280, margin: "0 auto", display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 48, alignItems: "center" }}
      >
        <div>
          <span className="iv2-mini" style={{ color: "var(--color-coral-300)" }}>
            ● How invest.com.au earns
          </span>
          <div
            className="font-display"
            style={{
              fontSize: 24,
              lineHeight: 1.1,
              letterSpacing: "-.022em",
              fontWeight: 800,
              margin: "4px 0 6px",
              color: "white",
            }}
          >
            Zero of our revenue is a commission on{" "}
            <span style={{ color: "var(--color-coral-400)" }}>what you do with your money next.</span>
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,.6)", lineHeight: 1.5, maxWidth: 600 }}>
            Revenue from flat affiliate referrals (64%), badged sponsored placements (24%), advisor lead bidding (9%), and the newsletter and marketplace (3%) — each labelled next to the listing it touches. We don&apos;t take a cut of what you invest.
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {ROWS.map((r) => (
            <div
              key={r.label}
              style={{ display: "grid", gridTemplateColumns: "1fr 90px 38px", gap: 10, alignItems: "center", fontSize: 11 }}
            >
              <span style={{ color: "rgba(255,255,255,.85)" }}>{r.label}</span>
              <div style={{ height: 5, background: "rgba(255,255,255,.08)", borderRadius: 99, overflow: "hidden" }}>
                <div style={{ width: `${r.pct}%`, height: "100%", background: r.color }} />
              </div>
              <span className="font-mono tnum" style={{ fontSize: 11.5, fontWeight: 700, color: "white", textAlign: "right" }}>
                {r.pct}%
              </span>
            </div>
          ))}
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <Link
              href="/methodology"
              className="iv2-cta-ghost"
              style={{ fontSize: 11, padding: "6px 11px", color: "white", borderColor: "rgba(255,255,255,.2)", background: "transparent" }}
            >
              Full methodology
            </Link>
            <Link
              href="/how-we-earn"
              className="iv2-cta-ghost"
              style={{ fontSize: 11, padding: "6px 11px", color: "white", borderColor: "rgba(255,255,255,.2)", background: "transparent" }}
            >
              Disclosure register
            </Link>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .home-earn-grid { grid-template-columns: 1fr !important; gap: 24px !important; }
        }
      `}</style>
    </section>
  );
}
