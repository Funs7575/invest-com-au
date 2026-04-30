import Link from "next/link";
import { DesignIcon } from "@/components/design/DesignIcon";

interface PillarsProps {
  listingCount: number;
  professionalCount: number;
  brokerCount: number;
}

export default function HomePillarsGrid({ listingCount, professionalCount, brokerCount }: PillarsProps) {
  const pillars: ReadonlyArray<{
    tag: string;
    title: string;
    sub: string;
    cta: string;
    href: string;
    icon: string;
    accent: string;
    stats: ReadonlyArray<readonly [string, string]>;
    featured?: boolean;
  }> = [
    {
      tag: "01",
      title: `Browse ${listingCount} live listings`,
      sub: "Mining · farmland · credit · renewables · off-plan · businesses.",
      cta: "Open marketplace",
      href: "/invest/listings",
      icon: "sparkles",
      accent: "#fbbf24",
      stats: [[String(listingCount), "deals open"], ["$10k", "min from"]],
    },
    {
      tag: "02 · NEW",
      title: "Post a job — advisors come to you",
      sub: "Describe your situation. Verified advisors quote. Free to post.",
      cta: "Post your situation",
      href: "/find-advisor",
      icon: "megaphone",
      accent: "var(--color-coral-500)",
      stats: [["FREE", "to post"], ["4h", "avg response"]],
      featured: true,
    },
    {
      tag: "03",
      title: "Find a verified advisor",
      sub: "ASIC-registered. Filter by specialty, language, fee, location.",
      cta: "Browse advisors",
      href: "/advisors",
      icon: "users",
      accent: "#34d399",
      stats: [[professionalCount.toLocaleString("en-AU"), "verified"], ["12+", "specialties"]],
    },
    {
      tag: "04",
      title: `Compare ${brokerCount} platforms`,
      sub: "Brokers, super, savings, crypto, term deposits, mortgages, robo.",
      cta: "Open comparisons",
      href: "/compare",
      icon: "trending-down",
      accent: "#60a5fa",
      stats: [[String(brokerCount), "platforms"], ["7", "categories"]],
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

      <div className="home-pillars-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
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
              borderTop: p.featured ? `1.5px solid ${p.accent}` : `2px solid ${p.accent}`,
              borderRadius: 12,
              padding: "18px 18px 16px",
              textDecoration: "none",
              position: "relative",
              boxShadow: p.featured
                ? `0 8px 22px color-mix(in oklch, ${p.accent} 16%, transparent)`
                : "0 1px 0 rgba(0,0,0,.02)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: `color-mix(in oklch, ${p.accent} 18%, transparent)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: p.accent,
                }}
                aria-hidden
              >
                <DesignIcon name={p.icon} size={15} strokeWidth={2.2} />
              </div>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  color: p.accent,
                  textTransform: "uppercase",
                  letterSpacing: ".1em",
                }}
              >
                {p.tag}
              </span>
            </div>
            <div
              className="font-display"
              style={{
                fontSize: 16.5,
                fontWeight: 700,
                lineHeight: 1.18,
                letterSpacing: "-.018em",
                marginBottom: 6,
                textWrap: "balance",
              }}
            >
              {p.title}
            </div>
            <div
              style={{
                fontSize: 12,
                color: p.featured ? "rgba(255,255,255,.65)" : "var(--color-ink-500)",
                lineHeight: 1.45,
                marginBottom: 12,
                flex: 1,
              }}
            >
              {p.sub}
            </div>
            <div
              style={{
                display: "flex",
                gap: 14,
                marginBottom: 12,
                paddingTop: 10,
                borderTop: p.featured ? "1px solid rgba(255,255,255,.1)" : "1px solid #e5e7eb",
              }}
            >
              {p.stats.map(([n, l]) => (
                <div key={l}>
                  <div
                    className="font-mono"
                    style={{
                      fontSize: 14,
                      fontWeight: 800,
                      color: p.featured ? "white" : "var(--color-ink-900)",
                      lineHeight: 1,
                    }}
                  >
                    {n}
                  </div>
                  <div
                    style={{
                      fontSize: 9.5,
                      color: p.featured ? "rgba(255,255,255,.5)" : "var(--color-ink-400)",
                      marginTop: 3,
                    }}
                  >
                    {l}
                  </div>
                </div>
              ))}
            </div>
            <span
              style={{
                fontSize: 12.5,
                fontWeight: 700,
                color: p.accent,
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              {p.cta} <DesignIcon name="arrow-right" size={11} strokeWidth={2.6} />
            </span>
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
