import Link from "next/link";
import { DesignIcon } from "@/components/design/DesignIcon";
import { FlagChip } from "@/components/design/Atoms";

const CORRIDORS: ReadonlyArray<{
  code: string;
  title: string;
  tag: string;
  blurb: string;
  advisers: number;
  href: string;
}> = [
  {
    code: "GB",
    title: "UK → Australia",
    tag: "Migrant",
    blurb: "Pension transfers, residency rules, and how to keep your UK tax sorted.",
    advisers: 34,
    href: "/foreign-investment/united-kingdom",
  },
  {
    code: "IN",
    title: "India → Australia",
    tag: "Migrant",
    blurb: "Resident-status rules, sending money out of India, and what changes when you arrive.",
    advisers: 37,
    href: "/foreign-investment/india",
  },
  {
    code: "CN",
    title: "China → Australia",
    tag: "Migrant",
    blurb: "Moving funds across the border, mainland property, and double-tax basics.",
    advisers: 24,
    href: "/foreign-investment/china",
  },
  {
    code: "US",
    title: "US citizens in Australia",
    tag: "Dual citizen",
    blurb: "What the IRS still wants, plus the Australian funds you should and shouldn't own.",
    advisers: 28,
    href: "/foreign-investment/united-states",
  },
];

export default function HomeCrossBorder() {
  return (
    <section style={{ padding: "48px 36px", maxWidth: 1280, margin: "0 auto" }}>
      <div className="home-crossborder-header" style={{ display: "grid", gridTemplateColumns: "1.1fr 2fr", gap: 36, alignItems: "center", marginBottom: 18 }}>
        <div>
          <span className="iv2-mini" style={{ color: "var(--color-coral-600)" }}>
            ● Cross-border · 8 country guides
          </span>
          <h2
            className="font-display"
            style={{
              fontSize: 28,
              letterSpacing: "-.028em",
              fontWeight: 800,
              margin: "4px 0 6px",
              lineHeight: 1.05,
              textWrap: "balance",
            }}
          >
            Where are you investing from?
          </h2>
          <p style={{ fontSize: 12.5, color: "var(--color-ink-500)", margin: 0, maxWidth: 380, lineHeight: 1.5 }}>
            For visa holders, expats &amp; foreign investors — we&apos;ll show you the right rules, advisors and deals.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
          <Link href="/foreign-investment" className="iv2-cta-ghost" style={{ fontSize: 12.5 }}>
            All country guides
          </Link>
          <Link href="/foreign-investment" className="iv2-cta" style={{ fontSize: 12.5 }}>
            Foreign investor hub <DesignIcon name="arrow-right" size={11} />
          </Link>
        </div>
      </div>

      <div className="home-crossborder-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
        {CORRIDORS.map((p) => (
          <Link
            key={p.code}
            href={p.href}
            className="iv2-card iv2-card-hover"
            style={{ padding: "14px 14px 12px", display: "flex", flexDirection: "column", gap: 8, textDecoration: "none", color: "inherit" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <FlagChip code={p.code} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--color-ink-900)" }}>{p.title}</div>
                <div
                  style={{
                    fontSize: 9.5,
                    color: "var(--color-coral-600)",
                    textTransform: "uppercase",
                    letterSpacing: ".06em",
                    fontWeight: 700,
                    marginTop: 1,
                  }}
                >
                  {p.tag}
                </div>
              </div>
            </div>
            <p
              style={{
                fontSize: 11.5,
                color: "var(--color-ink-500)",
                margin: 0,
                lineHeight: 1.45,
              }}
            >
              {p.blurb}
            </p>
            <div
              style={{
                fontSize: 10,
                color: "var(--color-ink-400)",
                marginTop: "auto",
                paddingTop: 8,
                borderTop: "1px solid #e5e7eb",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>{p.advisers} advisers</span>
              <span style={{ color: "var(--color-coral-600)", fontWeight: 700 }}>Open →</span>
            </div>
          </Link>
        ))}
      </div>

      <div
        style={{
          marginTop: 14,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          fontSize: 11.5,
          color: "var(--color-ink-400)",
        }}
      >
        <span>
          More corridors:{" "}
          <Link href="/foreign-investment/singapore" style={{ color: "var(--color-ink-500)", textDecoration: "none", fontWeight: 600 }}>
            Singapore
          </Link>{" "}·{" "}
          <Link href="/foreign-investment/new-zealand" style={{ color: "var(--color-ink-500)", textDecoration: "none", fontWeight: 600 }}>
            NZ
          </Link>{" "}·{" "}
          <Link href="/foreign-investment/south-korea" style={{ color: "var(--color-ink-500)", textDecoration: "none", fontWeight: 600 }}>
            South Korea
          </Link>{" "}·{" "}
          <Link href="/foreign-investment/united-arab-emirates" style={{ color: "var(--color-ink-500)", textDecoration: "none", fontWeight: 600 }}>
            UAE
          </Link>
        </span>
        <Link href="/foreign-investment" style={{ color: "var(--color-coral-600)", fontWeight: 700, textDecoration: "none" }}>
          Investing <em style={{ fontStyle: "normal" }}>into</em> Australia from overseas? Switch view →
        </Link>
      </div>

      <style>{`
        @media (max-width: 1024px) {
          .home-crossborder-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .home-crossborder-header { grid-template-columns: 1fr !important; gap: 16px !important; }
        }
        @media (max-width: 640px) {
          .home-crossborder-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}
