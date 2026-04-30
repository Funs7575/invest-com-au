import HeroQuizCard from "@/components/HeroQuizCard";

interface HomeHeroProps {
  brokerCount: number;
  listingCount: number;
  professionalCount: number;
  /**
   * Reserved for future ISR-friendly "fresher than X" stamps in the
   * stat strip; currently unused but kept on the props contract so
   * callsites stay stable.
   */
  updatedMonth?: string;
}

export default function HomeHero({ brokerCount, listingCount, professionalCount }: HomeHeroProps) {
  const stats: ReadonlyArray<readonly [string, string]> = [
    [String(listingCount || 0), "live listings"],
    [professionalCount.toLocaleString("en-AU"), "advisors"],
    [String(brokerCount || 0), "platforms"],
    ["8", "countries"],
  ];

  return (
    <section
      style={{
        background: "var(--color-ink-900)",
        color: "white",
        padding: "48px 36px 56px",
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
        style={{
          position: "relative",
          maxWidth: 1280,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "1.1fr 1fr",
          gap: 56,
          alignItems: "center",
        }}
        className="home-hero-grid"
      >
        <div>
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
            Independent · ASIC-registered · Est. 1996
          </span>

          <h1
            className="font-display"
            style={{
              fontSize: "clamp(38px, 5.5vw, 64px)",
              lineHeight: 0.96,
              letterSpacing: "-.04em",
              fontWeight: 800,
              margin: "18px 0 0",
              color: "white",
            }}
          >
            Where Australians figure out{" "}
            <span style={{ color: "var(--color-coral-400)" }}>where their money should go.</span>
          </h1>

          <p
            style={{
              fontSize: 16,
              lineHeight: 1.5,
              color: "rgba(255,255,255,.72)",
              maxWidth: 520,
              margin: "18px 0 0",
            }}
          >
            {listingCount || 0} vetted listings. {professionalCount.toLocaleString("en-AU")} verified advisors. {brokerCount || 0} fee-audited platforms. One 60-second quiz to find what fits — or skip it and dive in.
          </p>

          <div
            style={{
              display: "flex",
              gap: 0,
              marginTop: 26,
              fontSize: 11,
              color: "rgba(255,255,255,.55)",
              flexWrap: "wrap",
            }}
          >
            {stats.map(([n, l], i) => (
              <span
                key={l}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  padding: i === 0 ? "0 28px 0 0" : "0 28px",
                  borderLeft: i === 0 ? "none" : "1px solid rgba(255,255,255,.1)",
                }}
              >
                <span className="font-mono tnum" style={{ fontSize: 22, color: "white", fontWeight: 700 }}>
                  {n}
                </span>
                <span style={{ marginTop: 3 }}>{l}</span>
              </span>
            ))}
          </div>
        </div>

        <HeroQuizCard />
      </div>

      <div
        style={{
          position: "relative",
          maxWidth: 1280,
          margin: "28px auto 0",
          textAlign: "center",
          color: "rgba(255,255,255,.4)",
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: ".06em",
          textTransform: "uppercase",
        }}
      >
        Or skip — explore everything you can do here
        <span aria-hidden style={{ marginLeft: 6 }}>↓</span>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .home-hero-grid {
            grid-template-columns: 1fr !important;
            gap: 32px !important;
          }
        }
      `}</style>
    </section>
  );
}
