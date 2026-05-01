import Link from "next/link";
import { DesignIcon } from "@/components/design/DesignIcon";

interface RouteCardsProps {
  brokerCount: number;
  listingCount: number;
  professionalCount: number;
}

// Four route cards — the primary navigational decision below the hero.
// Replaces the previous v4 HomePillarsGrid. Cards are equal-weight in size
// and breathing room, but "Get matched" gets a subtle dark-card treatment
// because per the v5 spec it's the recommended path for users who don't
// know which other route to pick (the moat product).
export default function HomeRouteCards({
  brokerCount,
  listingCount,
  professionalCount,
}: RouteCardsProps) {
  const routes: ReadonlyArray<{
    title: string;
    copy: string;
    cta: string;
    href: string;
    micro: string;
    badge: string;
    icon: string;
    accent: string;
    featured?: boolean;
  }> = [
    {
      title: "Compare platforms",
      copy: "Brokers, super, crypto and savings — sorted by key fees and features.",
      cta: "Compare platforms",
      href: "/compare",
      micro: "Lowest-friction starting point",
      badge: `${brokerCount || 0} platforms`,
      icon: "trending-down",
      accent: "#2563eb",
    },
    {
      title: "Browse opportunities",
      copy: "Property, businesses, farmland and private-market listings, shown clearly.",
      cta: "Browse listings",
      href: "/invest",
      micro: "Marketplace route",
      badge: `${listingCount || 0} listed`,
      icon: "sparkles",
      accent: "#d97706",
    },
    {
      title: "Find an expert",
      copy: "Property, lending, advice, tax, SMSF and cross-border specialists.",
      cta: "Find an expert",
      href: "/advisors",
      micro: "Human help route",
      badge: `${professionalCount.toLocaleString("en-AU")} verified`,
      icon: "users",
      accent: "var(--color-coral-500)",
    },
    {
      title: "Get matched",
      copy: "Answer a few prompts. We route you to the right next step.",
      cta: "Get matched in 60s",
      href: "/quiz",
      micro: "Best if you're unsure",
      badge: "60-sec flow · free",
      icon: "compass",
      accent: "#059669",
      featured: true,
    },
  ];

  return (
    <section
      id="routes"
      style={{ padding: "56px 36px 60px", maxWidth: 1280, margin: "0 auto" }}
    >
      <div style={{ marginBottom: 24 }}>
        <span className="iv2-mini" style={{ color: "var(--color-coral-600)" }}>
          ● Four ways to use Invest.com.au
        </span>
        <h2
          className="font-display"
          style={{
            fontSize: 32,
            letterSpacing: "-.028em",
            fontWeight: 800,
            margin: "6px 0 0",
            lineHeight: 1.05,
            textWrap: "balance",
          }}
        >
          Compare. Browse. Find. Get matched.
        </h2>
      </div>

      <div className="home-routes-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        {routes.map((r) => (
          <Link
            key={r.href}
            href={r.href}
            className="iv2-card-hover"
            style={{
              display: "flex",
              flexDirection: "column",
              background: r.featured ? "var(--color-ink-900)" : "white",
              color: r.featured ? "white" : "var(--color-ink-900)",
              border: r.featured ? `1.5px solid ${r.accent}` : "1px solid #e5e7eb",
              borderTop: r.featured ? `1.5px solid ${r.accent}` : `4px solid ${r.accent}`,
              borderRadius: 14,
              padding: "30px 26px 26px",
              textDecoration: "none",
              minHeight: 280,
              boxShadow: r.featured
                ? `0 12px 32px color-mix(in oklch, ${r.accent} 22%, transparent)`
                : "0 1px 2px rgba(11,20,34,.04)",
            }}
          >
            <div
              aria-hidden
              style={{
                width: 64,
                height: 64,
                borderRadius: 16,
                background: r.featured
                  ? `color-mix(in oklch, ${r.accent} 22%, transparent)`
                  : `color-mix(in oklch, ${r.accent} 14%, transparent)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: r.accent,
                marginBottom: 18,
              }}
            >
              <DesignIcon name={r.icon} size={32} strokeWidth={2.2} />
            </div>

            <div
              className="font-display"
              style={{
                fontSize: 22,
                fontWeight: 800,
                lineHeight: 1.1,
                letterSpacing: "-.022em",
                marginBottom: 10,
                color: r.featured ? "white" : "var(--color-ink-900)",
              }}
            >
              {r.title}
            </div>
            <div
              style={{
                fontSize: 13,
                color: r.featured ? "rgba(255,255,255,.72)" : "var(--color-ink-500)",
                lineHeight: 1.5,
                marginBottom: 16,
                flex: 1,
              }}
            >
              {r.copy}
            </div>

            <div style={{ marginBottom: 14 }}>
              <span
                className="font-mono"
                style={{
                  fontSize: 10.5,
                  fontWeight: 800,
                  color: r.accent,
                  textTransform: "uppercase",
                  letterSpacing: ".06em",
                  background: `color-mix(in oklch, ${r.accent} ${r.featured ? 18 : 10}%, transparent)`,
                  border: `1px solid color-mix(in oklch, ${r.accent} 30%, transparent)`,
                  padding: "3px 8px",
                  borderRadius: 99,
                }}
              >
                {r.badge}
              </span>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                paddingTop: 12,
                borderTop: r.featured ? "1px solid rgba(255,255,255,.08)" : "1px solid #f1f5f9",
              }}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: r.featured ? "white" : r.accent, display: "inline-flex", alignItems: "center", gap: 6 }}>
                  {r.cta} <DesignIcon name="arrow-right" size={13} strokeWidth={2.6} />
                </div>
                <div style={{ fontSize: 10.5, color: r.featured ? "rgba(255,255,255,.5)" : "var(--color-ink-400)", marginTop: 2 }}>
                  {r.micro}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <style>{`
        @media (max-width: 1024px) {
          .home-routes-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 640px) {
          .home-routes-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}
