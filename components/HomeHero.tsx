import Link from "next/link";
import { DesignIcon } from "@/components/design/DesignIcon";

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
  return (
    <section
      style={{
        background: "var(--color-ink-900)",
        color: "white",
        padding: "64px 36px 56px",
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
          maxWidth: 920,
          margin: "0 auto",
        }}
      >
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
          Independent · ASIC-registered · No commission incentive · Est. 1996
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
            maxWidth: 780,
          }}
        >
          Where Australians figure out{" "}
          <span style={{ color: "var(--color-coral-400)" }}>where their money should go.</span>
        </h1>

        <p
          style={{
            fontSize: 18,
            lineHeight: 1.5,
            color: "rgba(255,255,255,.78)",
            maxWidth: 720,
            margin: "20px 0 0",
          }}
        >
          Compare {brokerCount || 0} platforms, find {professionalCount.toLocaleString("en-AU")} advisors,
          post a job, or browse {listingCount || 0} private deals — all in one place.
          <br />
          Take the 60-second quiz, or skip and explore.
        </p>

        <div style={{ marginTop: 32, display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-start" }}>
          <Link
            href="/quiz"
            className="iv2-cta"
            style={{
              fontSize: 17,
              fontWeight: 700,
              padding: "16px 28px",
              borderRadius: 12,
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              background: "var(--color-coral-400)",
              color: "white",
              boxShadow: "0 8px 24px rgba(242,88,34,.35)",
            }}
          >
            Take the 60-second quiz <DesignIcon name="arrow-right" size={18} strokeWidth={2.6} />
          </Link>
          <span style={{ fontSize: 12.5, color: "rgba(255,255,255,.5)", letterSpacing: ".01em" }}>
            No email needed · Skip anytime
          </span>
        </div>
      </div>

      <div
        style={{
          position: "relative",
          maxWidth: 920,
          margin: "44px auto 0",
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
    </section>
  );
}
