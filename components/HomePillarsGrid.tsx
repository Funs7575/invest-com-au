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
  }> = [
    {
      title: "Compare platforms",
      sub: "Brokers, super, crypto, savings, robo — fees side-by-side, verified monthly.",
      cta: "Open comparisons",
      href: "/compare",
      icon: "trending-down",
      accent: "#2563eb",
      badge: `${brokerCount} platforms`,
    },
    {
      title: "Find an advisor",
      sub: "ASIC-registered. Browse 30+ specialties — planners, mortgage brokers, accountants.",
      cta: "Browse advisors",
      href: "/advisors",
      icon: "users",
      accent: "var(--color-coral-500)",
      badge: `${professionalCount.toLocaleString("en-AU")} advisors`,
    },
    {
      title: "Post a job",
      sub: "Describe what you need. Up to 5 verified advisors come back with quotes — free, no email needed to start.",
      cta: "Post a job — free",
      href: "/quotes/post",
      icon: "megaphone",
      accent: "#059669",
      badge: "Quotes in 24h",
    },
    {
      title: "Browse listings",
      sub: "Funds, businesses, farmland, mining, commercial property — vetted before they list.",
      cta: "Open marketplace",
      href: "/invest/listings",
      icon: "sparkles",
      accent: "#d97706",
      badge: `${listingCount} live`,
    },
  ];

  return (
    <section style={{ padding: "56px 36px 60px", maxWidth: 1280, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <span className="iv2-mini" style={{ color: "var(--color-coral-600)" }}>
          ● Products · 4 ways to use invest.com.au
        </span>
        <h2
          className="font-display"
          style={{
            fontSize: 32,
            letterSpacing: "-.028em",
            fontWeight: 800,
            margin: "6px 0 0",
            lineHeight: 1.05,
          }}
        >
          Four products. One independent hub.
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
              background: "white",
              color: "var(--color-ink-900)",
              border: "1px solid #e5e7eb",
              borderTop: `4px solid ${p.accent}`,
              borderRadius: 14,
              padding: "30px 26px 26px",
              textDecoration: "none",
              position: "relative",
              boxShadow: "0 1px 2px rgba(11,20,34,.04)",
              minHeight: 280,
            }}
          >
            <div
              aria-hidden
              style={{
                width: 64,
                height: 64,
                borderRadius: 16,
                background: `color-mix(in oklch, ${p.accent} 14%, transparent)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: p.accent,
                marginBottom: 20,
              }}
            >
              <DesignIcon name={p.icon} size={32} strokeWidth={2.2} />
            </div>

            <div
              className="font-display"
              style={{
                fontSize: 24,
                fontWeight: 800,
                lineHeight: 1.08,
                letterSpacing: "-.024em",
                marginBottom: 10,
                textWrap: "balance",
                color: "var(--color-ink-900)",
              }}
            >
              {p.title}
            </div>
            <div
              style={{
                fontSize: 13.5,
                color: "var(--color-ink-500)",
                lineHeight: 1.5,
                marginBottom: 20,
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
                  background: `color-mix(in oklch, ${p.accent} 10%, transparent)`,
                  border: `1px solid color-mix(in oklch, ${p.accent} 28%, transparent)`,
                  padding: "4px 9px",
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
                  color: p.accent,
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
