import Link from "next/link";
import { DesignIcon } from "@/components/design/DesignIcon";

interface ToolEntry {
  name: string;
  href: string;
  icon: string;
  oneLiner: string;
}

const FEATURED_TOOLS: ReadonlyArray<ToolEntry> = [
  {
    name: "Switching Calculator",
    href: "/switching-calculator",
    icon: "trending-down",
    oneLiner: "What you'd save moving brokers",
  },
  {
    name: "Trade Cost Calculator",
    href: "/trade-cost-calculator",
    icon: "calculator",
    oneLiner: "True cost per trade, all-in",
  },
  {
    name: "Portfolio X-Ray",
    href: "/portfolio-xray",
    icon: "search",
    oneLiner: "Spot fee leaks and overlap",
  },
  {
    name: "CGT Calculator",
    href: "/cgt-calculator",
    icon: "shield-check",
    oneLiner: "Capital gains tax on a sale",
  },
  {
    name: "Franking Credits",
    href: "/franking-credits-calculator",
    icon: "trending-up",
    oneLiner: "Refund from dividend franking",
  },
  {
    name: "Mortgage Calculator",
    href: "/mortgage-calculator",
    icon: "home",
    oneLiner: "Repayments + total interest",
  },
  {
    name: "Retirement Calculator",
    href: "/retirement-calculator",
    icon: "users",
    oneLiner: "Are you on track to retire?",
  },
  {
    name: "FIRB Cost Calculator",
    href: "/property/foreign-investment",
    icon: "globe",
    oneLiner: "Foreign-buyer fees + duty",
  },
];

export default function HomeToolsStrip() {
  return (
    <section
      style={{
        padding: "10px 36px 56px",
        maxWidth: 1280,
        margin: "0 auto",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 16,
        }}
      >
        <div>
          <span className="iv2-mini" style={{ color: "var(--color-coral-600)" }}>
            ● Free tools, no signup
          </span>
          <h2
            className="font-display"
            style={{
              fontSize: 22,
              letterSpacing: "-.02em",
              fontWeight: 800,
              margin: "4px 0 0",
              lineHeight: 1.15,
              color: "var(--color-ink-900)",
            }}
          >
            25 calculators and tools for Australian investors
          </h2>
        </div>
        <Link
          href="/calculators"
          className="font-mono"
          style={{
            fontSize: 12,
            fontWeight: 800,
            color: "var(--color-ink-700)",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            whiteSpace: "nowrap",
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid #e5e7eb",
            background: "white",
          }}
        >
          See all 25 <DesignIcon name="arrow-right" size={12} strokeWidth={2.4} />
        </Link>
      </div>

      <div
        className="home-tools-scroll"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(8, minmax(0, 1fr))",
          gap: 10,
        }}
      >
        {FEATURED_TOOLS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="iv2-card-hover"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              padding: "14px 12px",
              borderRadius: 12,
              background: "white",
              border: "1px solid #e5e7eb",
              textDecoration: "none",
              color: "var(--color-ink-900)",
              minHeight: 116,
            }}
          >
            <div
              aria-hidden
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: "color-mix(in oklch, var(--color-coral-400) 12%, white)",
                color: "var(--color-coral-600)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid color-mix(in oklch, var(--color-coral-400) 22%, transparent)",
              }}
            >
              <DesignIcon name={t.icon} size={14} strokeWidth={2.2} />
            </div>
            <div
              style={{
                fontSize: 12.5,
                fontWeight: 800,
                lineHeight: 1.2,
                letterSpacing: "-.005em",
              }}
            >
              {t.name}
            </div>
            <div
              style={{
                fontSize: 11,
                lineHeight: 1.35,
                color: "var(--color-ink-500)",
              }}
            >
              {t.oneLiner}
            </div>
          </Link>
        ))}
      </div>

      <style>{`
        @media (max-width: 1180px) {
          .home-tools-scroll {
            grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
          }
        }
        @media (max-width: 720px) {
          .home-tools-scroll {
            display: grid !important;
            grid-template-columns: repeat(8, 70%) !important;
            overflow-x: auto;
            scroll-snap-type: x mandatory;
            -webkit-overflow-scrolling: touch;
            padding-bottom: 6px;
          }
          .home-tools-scroll > a {
            scroll-snap-align: start;
          }
        }
      `}</style>
    </section>
  );
}
