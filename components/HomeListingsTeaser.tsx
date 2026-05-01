import Link from "next/link";
import Image from "next/image";
import { DesignIcon } from "@/components/design/DesignIcon";
import { SponsorChip } from "@/components/design/Atoms";

export interface HomeListing {
  id: number;
  title: string;
  slug: string;
  vertical: string;
  location_state: string | null;
  location_city: string | null;
  price_display: string | null;
  images: string[] | null;
  listing_type: string | null;
  key_metrics: Record<string, string | number | undefined> | null;
  status: string | null;
}

const VERTICAL_LABELS: Record<string, { label: string; color: string }> = {
  funds:                { label: "Funds",      color: "#60a5fa" },
  "buy-business":       { label: "Business",   color: "#f87171" },
  "commercial-property":{ label: "Commercial", color: "#a78bfa" },
  farmland:             { label: "Farmland",   color: "#84cc16" },
  "renewable-energy":   { label: "Renewables", color: "#34d399" },
  mining:               { label: "Mining",     color: "#fbbf24" },
  franchise:            { label: "Franchise",  color: "#db2777" },
  startups:             { label: "Startups",   color: "#f59e0b" },
  hydrogen:             { label: "Hydrogen",   color: "#06b6d4" },
  uranium:              { label: "Uranium",    color: "#8b5cf6" },
  "oil-gas":            { label: "Oil & Gas",  color: "#64748b" },
};

interface HomeListingsTeaserProps {
  listings: ReadonlyArray<HomeListing>;
  totalCount: number;
}

export default function HomeListingsTeaser({ listings, totalCount }: HomeListingsTeaserProps) {
  const visible = listings.slice(0, 6);

  return (
    <section
      style={{
        padding: "48px 36px 52px",
        background: "var(--color-sand-50)",
        borderTop: "1px solid #e5e7eb",
      }}
    >
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 22, gap: 16, flexWrap: "wrap" }}>
          <div>
            <span className="iv2-mini" style={{ color: "var(--color-coral-600)" }}>
              ● The Marketplace · {totalCount} live listings
            </span>
            <h2
              className="font-display"
              style={{
                fontSize: 30,
                letterSpacing: "-.028em",
                fontWeight: 800,
                margin: "4px 0 0",
                lineHeight: 1.05,
                textWrap: "balance",
              }}
            >
              Australian investment opportunities, shown clearly.
            </h2>
            <p style={{ fontSize: 13, color: "var(--color-ink-500)", margin: "6px 0 0", maxWidth: 560, lineHeight: 1.5 }}>
              Listings are not recommendations. Always perform due diligence and seek professional
              advice where required.
            </p>
          </div>
          <Link href="/invest" className="iv2-cta-ghost" style={{ fontSize: 12.5 }}>
            Browse all {totalCount} <DesignIcon name="arrow-right" size={11} />
          </Link>
        </div>

        <div className="home-listings-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {visible.length === 0 && (
            <div style={{ gridColumn: "1 / -1", padding: "36px 18px", textAlign: "center", color: "var(--color-ink-400)", fontSize: 13 }}>
              No listings yet — <Link href="/invest" style={{ color: "var(--color-coral-600)", fontWeight: 700 }}>browse all</Link>.
            </div>
          )}
          {visible.map((l) => {
            const cat = VERTICAL_LABELS[l.vertical] ?? { label: l.vertical, color: "#94a3b8" };
            const img = l.images && l.images.length > 0 ? l.images[0] : null;
            const featured = l.listing_type === "featured" || l.listing_type === "premium";
            const km = l.key_metrics ?? {};
            const yieldVal = (km["yield"] as string | undefined) ?? (km["return"] as string | undefined) ?? "—";
            const termVal = (km["term"] as string | undefined) ?? (km["duration"] as string | undefined) ?? "—";
            return (
              <Link
                key={l.id}
                href={`/invest/${l.vertical}/${l.slug}`}
                className="iv2-card iv2-card-hover"
                style={{ overflow: "hidden", display: "flex", flexDirection: "column", textDecoration: "none", color: "inherit" }}
              >
                <div style={{ height: 104, position: "relative", background: "#0b1422" }}>
                  {img ? (
                    <Image
                      src={img}
                      alt={l.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      style={{ objectFit: "cover", opacity: 0.92 }}
                    />
                  ) : (
                    <div
                      aria-hidden
                      style={{
                        position: "absolute",
                        inset: 0,
                        background: `linear-gradient(135deg, ${cat.color}33, ${cat.color}11)`,
                      }}
                    />
                  )}
                  <div
                    aria-hidden
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "linear-gradient(180deg, transparent 30%, rgba(11,20,34,.78) 100%)",
                    }}
                  />
                  <div style={{ position: "absolute", top: 8, left: 8, display: "flex", gap: 5 }}>
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 800,
                        color: "white",
                        background: `color-mix(in oklch, ${cat.color} 70%, black)`,
                        padding: "3px 7px",
                        borderRadius: 99,
                        textTransform: "uppercase",
                        letterSpacing: ".06em",
                      }}
                    >
                      {cat.label}
                    </span>
                    {featured && <SponsorChip kind="featured" />}
                  </div>
                  <div style={{ position: "absolute", bottom: 8, left: 10, right: 10, color: "white" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.18 }}>{l.title}</div>
                    <div style={{ fontSize: 10.5, color: "rgba(255,255,255,.7)", marginTop: 1 }}>
                      {[l.location_city, l.location_state].filter(Boolean).join(", ") || "Australia"}
                      {l.status && l.status !== "active" ? null : <> · ● Open</>}
                    </div>
                  </div>
                </div>
                <div style={{ padding: "9px 12px", display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
                  {(
                    [
                      ["Min", l.price_display ?? "—"],
                      ["Yield", String(yieldVal)],
                      ["Term", String(termVal)],
                    ] as const
                  ).map(([label, val]) => (
                    <div key={label}>
                      <div
                        style={{
                          fontSize: 9,
                          color: "var(--color-ink-400)",
                          textTransform: "uppercase",
                          letterSpacing: ".06em",
                          fontWeight: 700,
                        }}
                      >
                        {label}
                      </div>
                      <div className="font-mono tnum" style={{ fontSize: 12, fontWeight: 700, color: "var(--color-ink-900)", marginTop: 1 }}>
                        {val}
                      </div>
                    </div>
                  ))}
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <style>{`
        @media (max-width: 1024px) {
          .home-listings-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 640px) {
          .home-listings-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}
