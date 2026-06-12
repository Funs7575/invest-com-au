import Link from "next/link";
import { DesignIcon } from "@/components/design/DesignIcon";
import HomeHeroReel, {
  type ReelBroker,
  type ReelListing,
  type ReelAdvisor,
} from "@/components/HomeHeroReel";
import HomeHeroCTA from "@/components/HomeHeroCTA";

interface HomeHeroProps {
  topBrokers: ReadonlyArray<ReelBroker>;
  topListings: ReadonlyArray<ReelListing>;
  topAdvisors: ReadonlyArray<ReelAdvisor>;
  brokerCount: number;
  listingCount: number;
  advisorCount: number;
}

export default function HomeHero({
  topBrokers,
  topListings,
  topAdvisors,
  brokerCount,
  listingCount,
  advisorCount,
}: HomeHeroProps) {
  return (
    <section
      style={{
        background: "var(--color-ink-900)",
        color: "white",
        padding: "36px 36px 32px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        aria-hidden
        className="iv2-dotgrid"
        style={{ position: "absolute", inset: 0, opacity: 0.4, pointerEvents: "none" }}
      />
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: -200,
          right: -160,
          width: 680,
          height: 680,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(242,88,34,.18), transparent 60%)",
          pointerEvents: "none",
        }}
      />

      <div
        className="hero-shell"
        style={{
          position: "relative",
          maxWidth: 1240,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr)",
          gridTemplateAreas: '"text" "ctas" "reel"',
          gap: 24,
          alignItems: "start",
        }}
      >
        <div style={{ gridArea: "text", minWidth: 0, maxWidth: 720 }}>
          <span
            className="iv2-pill"
            style={{
              background: "rgba(255,255,255,.06)",
              color: "white",
              border: "1px solid rgba(255,255,255,.14)",
              fontSize: 11.5,
              padding: "5px 12px",
              maxWidth: "100%",
              whiteSpace: "normal",
              lineHeight: 1.45,
            }}
          >
            <span
              aria-hidden
              style={{
                width: 6,
                height: 6,
                borderRadius: 99,
                background: "var(--color-coral-400)",
                boxShadow: "0 0 0 4px rgba(242,88,34,.18)",
              }}
            />
            Independent &middot; Est. 1996 &middot; Commissions never change our rankings
          </span>

          <h1
            className="font-display"
            style={{
              fontSize: "clamp(36px, 4.6vw, 54px)",
              lineHeight: 1,
              letterSpacing: "-.035em",
              fontWeight: 800,
              margin: "20px 0 0",
              color: "white",
              maxWidth: 700,
              textWrap: "balance",
            }}
          >
            Compare investing platforms, see what&apos;s for sale, or find an expert &mdash;{" "}
            <span style={{ color: "var(--color-coral-400)" }}>all in one place.</span>
          </h1>

          {/* Full subhead (tablet/desktop) — hidden on phones where it pushed
              the CTA below the fold (Northstar F1.1). */}
          <p
            className="hero-sub-full"
            style={{
              fontSize: 16.5,
              lineHeight: 1.55,
              color: "rgba(255,255,255,.78)",
              maxWidth: 620,
              margin: "22px 0 0",
            }}
          >
            Compare brokers, crypto exchanges, super funds and savings accounts. Browse real
            Australian investment opportunities &mdash; businesses, farmland, mining, property.
            Find a verified expert. Or answer 4 questions to get matched. No jargon, no email.
          </p>
          {/* One-line phone subhead — headline + this + the CTA all fit the first screen. */}
          <p
            className="hero-sub-short"
            style={{
              display: "none",
              fontSize: 15.5,
              lineHeight: 1.5,
              color: "rgba(255,255,255,.78)",
              margin: "16px 0 0",
            }}
          >
            Brokers, super, crypto, property and experts &mdash; or answer 4 questions to get
            matched. No jargon, no email.
          </p>

          <p className="hero-compliance" style={{ marginTop: 36, fontSize: 11, color: "rgba(255,255,255,.45)" }}>
            General information only. Always check licensing, fees, risks and suitability before proceeding.
          </p>
        </div>

        {/* CTAs — desktop: right-aligned under the reel (pokies-lever position);
            phones: directly under the headline, above the fold. */}
        <div
          className="hero-ctas"
          style={{
            gridArea: "ctas",
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            alignItems: "center",
            justifyContent: "flex-end",
          }}
        >
          <Link
            href="#routes"
            style={{
              fontSize: 14,
              fontWeight: 700,
              padding: "13px 20px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,.18)",
              color: "white",
              background: "rgba(255,255,255,.04)",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            Explore options <DesignIcon name="arrow-right" size={14} strokeWidth={2.4} />
          </Link>
          <HomeHeroCTA />
        </div>

        <div className="hero-reel" style={{ gridArea: "reel", position: "relative", width: "100%" }}>
          <HomeHeroReel
            brokers={topBrokers}
            listings={topListings}
            advisors={topAdvisors}
            brokerCount={brokerCount}
            listingCount={listingCount}
            advisorCount={advisorCount}
          />
        </div>
      </div>

      <style>{`
        @media (min-width: 1024px) {
          .hero-shell {
            grid-template-columns: minmax(0, 1fr) minmax(420px, 480px) !important;
            grid-template-areas: "text reel" "text ctas" !important;
            gap: 16px 36px !important;
          }
        }
        @media (max-width: 1023px) {
          .hero-ctas { justify-content: flex-start !important; }
        }
        @media (max-width: 767px) {
          .hero-sub-full { display: none !important; }
          .hero-sub-short { display: block !important; }
          .hero-compliance { margin-top: 16px !important; }
        }

        /* Pokie-button breathing glow on the orange CTA */
        @keyframes heroPokieBreath {
          0%, 100% {
            transform: scale(1);
            box-shadow:
              0 8px 24px rgba(242,88,34,.34),
              0 0 0 0 rgba(242,88,34,.36),
              inset 0 1px 0 rgba(255,255,255,.18);
          }
          50% {
            transform: scale(1.025);
            box-shadow:
              0 12px 32px rgba(242,88,34,.5),
              0 0 0 8px rgba(242,88,34,0),
              inset 0 1px 0 rgba(255,255,255,.18);
          }
        }
        .hero-cta-pokie {
          animation: heroPokieBreath 3.2s ease-in-out infinite;
          transition: transform 0.16s ease, box-shadow 0.16s ease;
        }
        .hero-cta-pokie:hover {
          transform: scale(1.04) translateY(-1px);
          animation-play-state: paused;
        }
        .hero-cta-pokie svg { transition: transform .16s ease; }
        .hero-cta-pokie:hover svg { transform: translateX(2px); }
        @media (prefers-reduced-motion: reduce) {
          .hero-cta-pokie {
            animation: none;
            box-shadow:
              0 8px 24px rgba(242,88,34,.34),
              inset 0 1px 0 rgba(255,255,255,.18);
          }
          .hero-cta-pokie:hover {
            transform: none;
          }
          .hero-cta-pokie:hover svg { transform: none; }
        }
      `}</style>
    </section>
  );
}
