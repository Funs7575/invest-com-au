import Link from "next/link";
import { DesignIcon } from "@/components/design/DesignIcon";

interface RouteCardsProps {
  brokerCount: number;
  listingCount: number;
  professionalCount: number;
}

export default function HomeRouteCards({
  brokerCount,
  listingCount,
  professionalCount,
}: RouteCardsProps) {
  const routes: ReadonlyArray<{
    title: string;
    cta: string;
    href: string;
    icon: string;
    accent: string;
    examples: string;
    audience: string;
    badge: string;
    featured?: boolean;
  }> = [
    {
      title: "Compare platforms",
      cta: "Compare",
      href: "/compare",
      icon: "trending-down",
      accent: "#2563eb",
      examples: "Brokers · Super · Crypto · Savings",
      audience: "If you know what you want",
      badge: `${brokerCount || 0} platforms`,
    },
    {
      title: "Browse listings",
      cta: "Browse",
      href: "/invest",
      icon: "map-pin",
      accent: "#059669",
      examples: "Property · Businesses · Farmland · Funds",
      audience: "If you want real opportunities",
      badge: `${listingCount || 0} listed`,
    },
    {
      title: "Find an expert",
      cta: "Find",
      href: "/advisors",
      icon: "users",
      accent: "#7c3aed",
      examples: "Advisers · Mortgage · Tax · SMSF",
      audience: "If you need a pro",
      badge: `${professionalCount.toLocaleString("en-AU")} verified`,
    },
    {
      title: "Get matched",
      cta: "Get matched",
      href: "/quiz",
      icon: "sparkles",
      accent: "#f25822",
      examples: "60 seconds · 4 quick questions",
      audience: "If you're not sure where to start",
      badge: "Free · no email",
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
              position: "relative",
              display: "flex",
              flexDirection: "column",
              background: r.featured ? "var(--color-ink-900)" : "white",
              color: r.featured ? "white" : "var(--color-ink-900)",
              border: r.featured ? `1.5px solid ${r.accent}` : "1px solid #e5e7eb",
              borderRadius: 16,
              overflow: "hidden",
              textDecoration: "none",
              minHeight: 320,
              boxShadow: r.featured
                ? `0 14px 36px color-mix(in oklch, ${r.accent} 28%, transparent)`
                : "0 1px 2px rgba(11,20,34,.04)",
              transform: r.featured ? "translateY(-4px)" : undefined,
            }}
          >
            {r.featured && (
              <span
                aria-hidden
                style={{
                  position: "absolute",
                  top: 12,
                  right: 12,
                  zIndex: 2,
                  fontSize: 10.5,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: ".06em",
                  background: "white",
                  color: r.accent,
                  padding: "4px 10px",
                  borderRadius: 99,
                  boxShadow: "0 2px 6px rgba(0,0,0,.18)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <DesignIcon name="star" size={11} strokeWidth={2.4} fill="currentColor" /> Start here
              </span>
            )}

            <div
              aria-hidden
              style={{
                height: 88,
                background: r.featured
                  ? `linear-gradient(135deg, ${r.accent} 0%, color-mix(in oklch, ${r.accent} 70%, #ec4899) 100%)`
                  : `color-mix(in oklch, ${r.accent} 12%, white)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: r.featured ? "white" : r.accent,
                borderBottom: r.featured ? "none" : `1px solid color-mix(in oklch, ${r.accent} 18%, transparent)`,
              }}
            >
              <DesignIcon name={r.icon} size={40} strokeWidth={2.2} />
            </div>

            <div style={{ padding: "22px 22px 22px", display: "flex", flexDirection: "column", flex: 1 }}>
              <div
                className="font-display"
                style={{
                  fontSize: 21,
                  fontWeight: 800,
                  lineHeight: 1.1,
                  letterSpacing: "-.022em",
                  marginBottom: 8,
                  color: r.featured ? "white" : "var(--color-ink-900)",
                }}
              >
                {r.title}
              </div>

              <div
                className="font-mono"
                style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: r.featured ? "rgba(255,255,255,.78)" : "var(--color-ink-600)",
                  letterSpacing: ".01em",
                  marginBottom: 14,
                  lineHeight: 1.45,
                }}
              >
                {r.examples}
              </div>

              <div style={{ marginBottom: 14 }}>
                <span
                  className="font-mono"
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    color: r.featured ? "white" : r.accent,
                    textTransform: "uppercase",
                    letterSpacing: ".07em",
                    background: r.featured
                      ? "rgba(255,255,255,.12)"
                      : `color-mix(in oklch, ${r.accent} 10%, transparent)`,
                    border: r.featured
                      ? "1px solid rgba(255,255,255,.18)"
                      : `1px solid color-mix(in oklch, ${r.accent} 28%, transparent)`,
                    padding: "3px 9px",
                    borderRadius: 99,
                  }}
                >
                  {r.badge}
                </span>
              </div>

              <div style={{ flex: 1 }} />

              <div
                style={{
                  fontSize: 12,
                  color: r.featured ? "rgba(255,255,255,.62)" : "var(--color-ink-500)",
                  marginBottom: 14,
                  lineHeight: 1.4,
                  fontStyle: "italic",
                }}
              >
                {r.audience}
              </div>

              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  fontSize: 13,
                  fontWeight: 800,
                  padding: "10px 14px",
                  borderRadius: 10,
                  background: r.featured ? r.accent : "transparent",
                  color: r.featured ? "white" : r.accent,
                  border: r.featured ? `1.5px solid ${r.accent}` : `1.5px solid color-mix(in oklch, ${r.accent} 30%, transparent)`,
                }}
              >
                {r.cta} <DesignIcon name="arrow-right" size={13} strokeWidth={2.6} />
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
