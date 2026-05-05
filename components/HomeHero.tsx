import Link from "next/link";
import { DesignIcon } from "@/components/design/DesignIcon";
import HomeHeroReel, {
  type ReelBroker,
  type ReelListing,
  type ReelAdvisor,
} from "@/components/HomeHeroReel";

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
        padding: "72px 36px 64px",
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
          gap: 36,
          alignItems: "start",
        }}
      >
        <div style={{ minWidth: 0, maxWidth: 720 }}>
          <span
            className="iv2-pill"
            style={{
              background: "rgba(255,255,255,.06)",
              color: "white",
              border: "1px solid rgba(255,255,255,.14)",
              fontSize: 11.5,
              padding: "5px 12px",
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
            Australia / overseas &middot; Compare &middot; Listings &middot; Experts &middot; Guided matching
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
            Australia&apos;s front door for investment decisions.
          </h1>

          <p
            style={{
              fontSize: 16.5,
              lineHeight: 1.55,
              color: "rgba(255,255,255,.78)",
              maxWidth: 640,
              margin: "22px 0 0",
            }}
          >
            Compare platforms, browse opportunities, find experts or get matched to the right
            next step &mdash; whether you&apos;re investing from Australia or overseas.
          </p>

          <p style={{ marginTop: 36, fontSize: 11, color: "rgba(255,255,255,.45)" }}>
            General information only. Always check licensing, fees, risks and suitability before proceeding.
          </p>
        </div>

        <div
          className="hero-right"
          style={{
            position: "relative",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: 28,
            justifySelf: "end",
          }}
        >
          <HomeHeroReel
            brokers={topBrokers}
            listings={topListings}
            advisors={topAdvisors}
            brokerCount={brokerCount}
            listingCount={listingCount}
            advisorCount={advisorCount}
          />

          <div
            className="hero-ctas"
            style={{
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
              Browse manually <DesignIcon name="arrow-right" size={14} strokeWidth={2.4} />
            </Link>
            <Link
              href="/quiz"
              className="hero-cta-pokie"
              style={{
                fontSize: 16,
                fontWeight: 700,
                padding: "14px 24px",
                borderRadius: 12,
                background:
                  "linear-gradient(180deg, var(--color-coral-400), var(--color-coral-500))",
                color: "white",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                whiteSpace: "nowrap",
              }}
            >
              Get matched in 60 seconds <DesignIcon name="arrow-right" size={16} strokeWidth={2.6} />
            </Link>
          </div>
        </div>
      </div>

      <style>{`
        @media (min-width: 1024px) {
          .hero-shell { grid-template-columns: minmax(0, 1fr) minmax(360px, 420px) !important; }
        }
        @media (max-width: 1023px) {
          .hero-right { justify-self: stretch !important; }
          .hero-ctas { justify-content: flex-start !important; }
        }

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
          .hero-cta-pokie:hover { transform: none; }
          .hero-cta-pokie:hover svg { transform: none; }
        }
      `}</style>
    </section>
  );
}
