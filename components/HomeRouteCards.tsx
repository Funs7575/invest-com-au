import Link from "next/link";
import Image from "next/image";
import { DesignIcon } from "@/components/design/DesignIcon";

type PreviewBroker = {
  name: string;
  asx_fee: string | null;
};

type PreviewListing = {
  id: number | string;
  title: string;
  image: string | null;
};

type PreviewAdvisor = {
  name: string;
  photo_url: string | null;
};

interface RouteCardsProps {
  brokerCount: number;
  listingCount: number;
  professionalCount: number;
  topBrokers: ReadonlyArray<PreviewBroker>;
  topListings: ReadonlyArray<PreviewListing>;
  topAdvisors: ReadonlyArray<PreviewAdvisor>;
}

type RouteKind = "compare" | "browse" | "find" | "matched";

interface RouteConfig {
  kind: RouteKind;
  audienceEyebrow: string;
  title: string;
  subtitle: string;
  categories: ReadonlyArray<string>;
  cta: string;
  href: string;
  icon: string;
  accent: string;
  badge: string;
  featured?: boolean;
}

export default function HomeRouteCards({
  brokerCount,
  listingCount,
  professionalCount,
  topBrokers,
  topListings,
  topAdvisors,
}: RouteCardsProps) {
  const routes: ReadonlyArray<RouteConfig> = [
    {
      kind: "compare",
      audienceEyebrow: "If you know what you want",
      title: "Compare investing platforms",
      subtitle: "Side-by-side fees, features and ratings.",
      categories: ["Share brokers", "Crypto", "Robo", "Super", "Savings", "CFDs", "ETFs"],
      cta: "Compare now",
      href: "/compare",
      icon: "trending-down",
      accent: "#2563eb",
      badge: `9 categories · ${brokerCount.toLocaleString("en-AU")}+ platforms`,
    },
    {
      kind: "browse",
      audienceEyebrow: "If you want real opportunities",
      title: "Browse investments for sale",
      subtitle: "Real Australian businesses, projects and assets — listed by owners and operators.",
      categories: [
        "Businesses",
        "Farmland",
        "Mining",
        "Commercial property",
        "Franchises",
        "Renewables",
        "IPOs",
      ],
      cta: "Browse opportunities",
      href: "/invest",
      icon: "map-pin",
      accent: "#059669",
      badge: `28 categories · ${listingCount.toLocaleString("en-AU")} live`,
    },
    {
      kind: "find",
      audienceEyebrow: "If you need a pro",
      title: "Find an Australian expert",
      subtitle: "Verified advisers and specialists — by region, fee and specialty.",
      categories: [
        "Financial advisers",
        "SMSF accountants",
        "Mortgage brokers",
        "Buyer's agents",
        "Tax agents",
        "FIRB",
        "Cross-border",
      ],
      cta: "Find an expert",
      href: "/advisors",
      icon: "users",
      accent: "#7c3aed",
      badge: `9 specialties · ${professionalCount.toLocaleString("en-AU")} verified`,
    },
    {
      kind: "matched",
      audienceEyebrow: "If you're not sure where to start",
      title: "Match me to the right step",
      subtitle: "4 quick questions. We route you to the platform, opportunity, expert or guide that fits.",
      categories: [],
      cta: "Start the 4-question quiz",
      href: "/quiz",
      icon: "sparkles",
      accent: "#f25822",
      badge: "60 seconds · Free · No email",
      featured: true,
    },
  ];

  const previewBrokers = topBrokers.slice(0, 3);
  const previewListings = topListings.filter((l) => l.image).slice(0, 3);
  const previewAdvisors = topAdvisors.filter((a) => a.photo_url).slice(0, 5);

  function renderPreview(kind: RouteKind, featured: boolean) {
    if (kind === "compare") {
      if (previewBrokers.length === 0) return null;
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 14 }}>
          {previewBrokers.map((b) => (
            <div
              key={b.name}
              className="font-mono"
              style={{
                fontSize: 11,
                display: "flex",
                justifyContent: "space-between",
                gap: 8,
                color: "var(--color-ink-700)",
                background: "color-mix(in oklch, #2563eb 4%, white)",
                border: "1px solid color-mix(in oklch, #2563eb 12%, transparent)",
                borderRadius: 6,
                padding: "5px 8px",
              }}
            >
              <span style={{ fontWeight: 700, color: "var(--color-ink-900)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {b.name}
              </span>
              <span style={{ color: "#2563eb", fontWeight: 800, flexShrink: 0 }}>
                {b.asx_fee ?? "—"}
              </span>
            </div>
          ))}
        </div>
      );
    }

    if (kind === "browse") {
      if (previewListings.length === 0) return null;
      return (
        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          {previewListings.map((l) => (
            <div
              key={l.id}
              aria-hidden
              style={{
                position: "relative",
                width: 64,
                height: 48,
                borderRadius: 6,
                overflow: "hidden",
                border: "1px solid color-mix(in oklch, #059669 18%, transparent)",
                background: "color-mix(in oklch, #059669 6%, white)",
                flexShrink: 0,
              }}
            >
              {l.image ? (
                <Image
                  src={l.image}
                  alt=""
                  fill
                  sizes="64px"
                  style={{ objectFit: "cover" }}
                  unoptimized
                />
              ) : null}
            </div>
          ))}
        </div>
      );
    }

    if (kind === "find") {
      if (previewAdvisors.length === 0) return null;
      const overflow = Math.max(0, professionalCount - previewAdvisors.length);
      return (
        <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
          <div style={{ display: "flex" }}>
            {previewAdvisors.map((a, i) => (
              <div
                key={a.name + i}
                aria-hidden
                style={{
                  position: "relative",
                  width: 32,
                  height: 32,
                  borderRadius: 99,
                  overflow: "hidden",
                  border: "2px solid white",
                  marginLeft: i === 0 ? 0 : -8,
                  background: "color-mix(in oklch, #7c3aed 14%, white)",
                  zIndex: previewAdvisors.length - i,
                  flexShrink: 0,
                }}
              >
                {a.photo_url ? (
                  <Image
                    src={a.photo_url}
                    alt=""
                    fill
                    sizes="32px"
                    style={{ objectFit: "cover" }}
                    unoptimized
                  />
                ) : null}
              </div>
            ))}
          </div>
          {overflow > 0 && (
            <span
              className="font-mono"
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: "#7c3aed",
                background: "color-mix(in oklch, #7c3aed 10%, white)",
                border: "1px solid color-mix(in oklch, #7c3aed 24%, transparent)",
                padding: "3px 8px",
                borderRadius: 99,
                marginLeft: 8,
              }}
            >
              +{overflow.toLocaleString("en-AU")} more
            </span>
          )}
        </div>
      );
    }

    if (kind === "matched") {
      return (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 14,
          }}
        >
          <div style={{ display: "flex", gap: 6 }}>
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                aria-hidden
                className="route-pulse-dot"
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 99,
                  background: featured ? "rgba(255,255,255,.95)" : "currentColor",
                  display: "inline-block",
                  animationDelay: `${i * 0.18}s`,
                }}
              />
            ))}
          </div>
          <span
            className="font-mono"
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: featured ? "rgba(255,255,255,.78)" : "var(--color-ink-600)",
              letterSpacing: ".01em",
            }}
          >
            4 quick questions
          </span>
        </div>
      );
    }

    return null;
  }

  const totalCovered = brokerCount + listingCount + professionalCount;

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
            lineHeight: 1.1,
            textWrap: "balance",
            maxWidth: 820,
          }}
        >
          Whichever way you want to invest in Australia, we cover it.
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
              minHeight: 420,
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

            <div style={{ padding: "18px 20px 22px", display: "flex", flexDirection: "column", flex: 1 }}>
              <div
                className="font-mono"
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: ".07em",
                  color: r.featured ? "rgba(255,255,255,.62)" : r.accent,
                  marginBottom: 8,
                }}
              >
                {r.audienceEyebrow}
              </div>

              <div
                className="font-display"
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  lineHeight: 1.12,
                  letterSpacing: "-.02em",
                  marginBottom: 6,
                  color: r.featured ? "white" : "var(--color-ink-900)",
                }}
              >
                {r.title}
              </div>

              <div
                style={{
                  fontSize: 13,
                  lineHeight: 1.4,
                  color: r.featured ? "rgba(255,255,255,.72)" : "var(--color-ink-600)",
                  marginBottom: 12,
                }}
              >
                {r.subtitle}
              </div>

              {r.categories.length > 0 && (
                <div
                  className="route-cat-strip"
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 4,
                    marginBottom: 14,
                  }}
                >
                  {r.categories.map((c, i) => (
                    <span
                      key={c}
                      data-idx={i}
                      className="route-cat-chip"
                      style={{
                        fontSize: 10.5,
                        fontWeight: 700,
                        padding: "2px 7px",
                        borderRadius: 99,
                        background: r.featured
                          ? "rgba(255,255,255,.08)"
                          : `color-mix(in oklch, ${r.accent} 7%, white)`,
                        color: r.featured ? "rgba(255,255,255,.78)" : "var(--color-ink-700)",
                        border: r.featured
                          ? "1px solid rgba(255,255,255,.14)"
                          : `1px solid color-mix(in oklch, ${r.accent} 18%, transparent)`,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {c}
                    </span>
                  ))}
                </div>
              )}

              {renderPreview(r.kind, !!r.featured)}

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

      <div
        style={{
          marginTop: 18,
          padding: "12px 18px",
          background: "var(--color-sand-50)",
          border: "1px solid #e5e7eb",
          borderRadius: 10,
          display: "flex",
          flexWrap: "wrap",
          gap: "10px 18px",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div
          className="font-mono"
          style={{
            fontSize: 11.5,
            fontWeight: 700,
            color: "var(--color-ink-500)",
            letterSpacing: ".02em",
            display: "flex",
            flexWrap: "wrap",
            gap: "4px 14px",
            alignItems: "center",
          }}
        >
          <span aria-hidden style={{ width: 6, height: 6, borderRadius: 99, background: "#10b981", display: "inline-block" }} />
          <span>Updated weekly</span>
          <span aria-hidden>·</span>
          <span>{brokerCount.toLocaleString("en-AU")} platforms tracked</span>
          <span aria-hidden>·</span>
          <span>{listingCount.toLocaleString("en-AU")} live opportunities</span>
          <span aria-hidden>·</span>
          <span>{professionalCount.toLocaleString("en-AU")} verified experts</span>
          <span aria-hidden>·</span>
          <span style={{ color: "var(--color-ink-700)", fontWeight: 800 }}>
            Free for users — we earn from listings, not from clicks
          </span>
        </div>
        <Link
          href="/methodology"
          className="font-mono"
          style={{
            fontSize: 11.5,
            fontWeight: 800,
            color: "var(--color-ink-700)",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            whiteSpace: "nowrap",
          }}
        >
          How we rank ({totalCovered.toLocaleString("en-AU")} entries) <DesignIcon name="arrow-right" size={11} strokeWidth={2.4} />
        </Link>
      </div>

      <style>{`
        @media (max-width: 1024px) {
          .home-routes-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 640px) {
          .home-routes-grid { grid-template-columns: 1fr !important; }
          .route-cat-chip[data-idx="4"],
          .route-cat-chip[data-idx="5"],
          .route-cat-chip[data-idx="6"] { display: none; }
        }
        @keyframes routePulse {
          0%, 100% { opacity: 0.35; transform: scale(0.85); }
          50% { opacity: 1; transform: scale(1); }
        }
        .route-pulse-dot {
          animation: routePulse 1.4s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .route-pulse-dot { animation: none; opacity: 0.85; }
        }
      `}</style>
    </section>
  );
}
