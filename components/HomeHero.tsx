import Link from "next/link";
import { DesignIcon } from "@/components/design/DesignIcon";

export default function HomeHero() {
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

      <div style={{ position: "relative", maxWidth: 920, margin: "0 auto" }}>
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
          Independent &middot; ASIC-registered &middot; No commission incentive &middot; Est. 1996
        </span>

        <h1
          className="font-display"
          style={{
            fontSize: "clamp(38px, 5.5vw, 60px)",
            lineHeight: 0.98,
            letterSpacing: "-.04em",
            fontWeight: 800,
            margin: "18px 0 0",
            color: "white",
            maxWidth: 820,
            textWrap: "balance",
          }}
        >
          Australia&apos;s front door for{" "}
          <span style={{ color: "var(--color-coral-400)" }}>investment decisions.</span>
        </h1>

        <p
          style={{
            fontSize: 17,
            lineHeight: 1.55,
            color: "rgba(255,255,255,.78)",
            maxWidth: 700,
            margin: "20px 0 0",
          }}
        >
          Compare platforms, browse opportunities, find experts or get matched to the right next
          step &mdash; without getting lost in financial jargon.
        </p>

        <div
          style={{
            marginTop: 28,
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            alignItems: "center",
          }}
        >
          <Link
            href="#routes"
            className="iv2-cta"
            style={{
              fontSize: 16,
              fontWeight: 700,
              padding: "14px 24px",
              borderRadius: 12,
              background: "var(--color-coral-400)",
              color: "white",
              boxShadow: "0 8px 24px rgba(242,88,34,.32)",
            }}
          >
            Choose a route <DesignIcon name="arrow-right" size={16} strokeWidth={2.6} />
          </Link>
          <Link
            href="/quiz"
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
            Use the 60-second pathfinder <DesignIcon name="arrow-right" size={14} strokeWidth={2.4} />
          </Link>
        </div>

        <p style={{ marginTop: 24, fontSize: 11, color: "rgba(255,255,255,.45)" }}>
          General information only. Always check licensing, fees, risks and suitability before proceeding.
        </p>
      </div>
    </section>
  );
}
