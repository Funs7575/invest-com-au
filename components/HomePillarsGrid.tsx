import Link from "next/link";
import { DesignIcon } from "@/components/design/DesignIcon";

interface PillarsProps {
  listingCount: number;
  professionalCount: number;
  brokerCount: number;
}

export default function HomePillarsGrid({ listingCount, professionalCount, brokerCount }: PillarsProps) {
  const pillars: ReadonlyArray<{
    title: string;
    sub: string;
    cta: string;
    href: string;
    icon: string;
    accent: string;
    badge: string;
    featured?: boolean;
  }> = [
    {
      title: "Compare platforms",
      sub: "Brokers, super, crypto, savings, robo — fees side-by-side.",
      cta: "Open comparisons",
      href: "/compare",
      icon: "trending-down",
      accent: "#60a5fa",
      badge: `${brokerCount} platforms`,
    },
    {
      title: "Speak with an advisor",
      sub: "ASIC-registered. Free quotes from verified pros.",
      cta: "Find an advisor",
      href: "/find-advisor",
      icon: "users",
      accent: "var(--color-coral-500)",
      badge: `${professionalCount.toLocaleString("en-AU")} advisors`,
      featured: true,
    },
    {
      title: "Browse listings",
      sub: "Funds, businesses, farmland, mining, commercial property.",
      cta: "Open marketplace",
      href: "/invest/listings",
      icon: "sparkles",
      accent: "#fbbf24",
      badge: `${listingCount} live`,
    },
    {
      title: "Take the 60-sec quiz",
      sub: "Tell us your goal — we'll point you the right way.",
      cta: "Start the quiz",
      href: "/quiz",
      icon: "compass",
      accent: "#34d399",
      badge: "60 seconds",
    },
  ];

  return (
    <section style={{ padding: "44px 36px 48px", maxWidth: 1280, margin: "0 auto" }}>
      <div style={{ marginBottom: 18 }}>
        <span className="iv2-mini" style={{ color: "var(--color-coral-600)" }}>
          ● Everything you can do here
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
          Four ways to use invest.com.au.
        </h2>
      </div>

      <div className="home-pillars-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        {pillars.map((p) => (
          <Link
            key={p.href}
            href={p.href}
            className="iv2-card-hover"
            style={{
              display: "flex",
              flexDirection: "column",
              background: p.featured ? "var(--color-ink-900)" : "white",
              color: p.featured ? "white" : "var(--color-ink-900)",
              border: p.featured ? `1.5px solid ${p.accent}` : "1px solid #e5e7eb",
              borderTop: p.featured ? `1.5px solid ${p.accent}` : `3px solid ${p.accent}`,
              borderRadius: 14,
              padding: "26px 22px 22px",
              textDecoration: "none",
              position: "relative",
              boxShadow: p.featured
                ? `0 12px 32px color-mix(in oklch, ${p.accent} 20%, transparent)`
                : "0 1px 0 rgba(0,0,0,.02)",
              minHeight: 240,
            }}
          >
            <div
              aria-hidden
              style={{
                width: 56,
                height: 56,
                borderRadius: 14,
                background: `color-mix(in oklch, ${p.accent} ${p.featured ? 22 : 14}%, transparent)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: p.accent,
                marginBottom: 16,
              }}
            >
              <DesignIcon name={p.icon} size={28} strokeWidth={2.2} />
            </div>

            <div
              className="font-display"
              style={{
                fontSize: 21,
                fontWeight: 800,
                lineHeight: 1.1,
                letterSpacing: "-.022em",
                marginBottom: 8,
                textWrap: "balance",
                color: p.featured ? "white" : "var(--color-ink-900)",
              }}
            >
              {p.title}
            </div>
            <div
              style={{
                fontSize: 13,
                color: p.featured ? "rgba(255,255,255,.65)" : "var(--color-ink-500)",
                lineHeight: 1.45,
                marginBottom: 16,
                flex: 1,
              }}
            >
              {p.sub}
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <span
                className="font-mono"
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: p.accent,
                  textTransform: "uppercase",
                  letterSpacing: ".06em",
                  background: `color-mix(in oklch, ${p.accent} ${p.featured ? 18 : 10}%, transparent)`,
                  border: `1px solid color-mix(in oklch, ${p.accent} 30%, transparent)`,
                  padding: "3px 8px",
                  borderRadius: 99,
                  whiteSpace: "nowrap",
                }}
              >
                {p.badge}
              </span>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  color: p.featured ? "white" : p.accent,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {p.cta} <DesignIcon name="arrow-right" size={14} strokeWidth={2.6} />
              </span>
            </div>
          </Link>
        ))}
      </div>

      <style>{`
        @media (max-width: 1024px) {
          .home-pillars-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 640px) {
          .home-pillars-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}
