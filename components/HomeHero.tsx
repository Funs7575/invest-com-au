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

      <div
        className="hero-shell"
        style={{
          position: "relative",
          maxWidth: 1280,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr)",
          gap: 48,
          alignItems: "center",
        }}
      >
        <div style={{ minWidth: 0, maxWidth: 920 }}>
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
            Compare investing platforms, see what&apos;s for sale, or find an expert &mdash;{" "}
            <span style={{ color: "var(--color-coral-400)" }}>all in one place.</span>
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
            Compare brokers, crypto exchanges, super funds and savings accounts. Browse real
            Australian investment opportunities &mdash; businesses, farmland, mining, property.
            Find a verified expert. Or answer 4 questions to get matched. No jargon, no email.
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
              href="/quiz"
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
              Get matched in 60 seconds <DesignIcon name="arrow-right" size={16} strokeWidth={2.6} />
            </Link>
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
              Skip the quiz <DesignIcon name="arrow-right" size={14} strokeWidth={2.4} />
            </Link>
          </div>

          <p style={{ marginTop: 24, fontSize: 11, color: "rgba(255,255,255,.45)" }}>
            General information only. Always check licensing, fees, risks and suitability before proceeding.
          </p>
        </div>

        {/* Right-anchored visual pull — 4-question quiz preview deck */}
        <div
          aria-hidden="true"
          className="hero-pull"
          style={{
            position: "relative",
            width: "100%",
            maxWidth: 420,
            justifySelf: "end",
            display: "none",
          }}
        >
          {/* glow halo */}
          <div
            style={{
              position: "absolute",
              inset: -40,
              background:
                "radial-gradient(circle at 70% 50%, rgba(242,88,34,.22), transparent 65%)",
              pointerEvents: "none",
            }}
          />

          {/* deck of cards (tilted, behind) */}
          <div
            style={{
              position: "absolute",
              top: 24,
              right: 14,
              width: "92%",
              height: 220,
              borderRadius: 18,
              background: "rgba(255,255,255,.04)",
              border: "1px solid rgba(255,255,255,.10)",
              transform: "rotate(4deg)",
              boxShadow: "0 24px 60px -20px rgba(0,0,0,.5)",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 14,
              right: 6,
              width: "96%",
              height: 230,
              borderRadius: 18,
              background: "rgba(255,255,255,.06)",
              border: "1px solid rgba(255,255,255,.12)",
              transform: "rotate(2deg)",
              boxShadow: "0 24px 60px -20px rgba(0,0,0,.5)",
            }}
          />

          {/* foreground card — quiz preview */}
          <div
            style={{
              position: "relative",
              borderRadius: 18,
              background:
                "linear-gradient(180deg, rgba(255,255,255,.10), rgba(255,255,255,.04))",
              border: "1px solid rgba(255,255,255,.18)",
              padding: "18px 20px 20px",
              backdropFilter: "blur(6px)",
              WebkitBackdropFilter: "blur(6px)",
              boxShadow:
                "0 28px 60px -24px rgba(0,0,0,.7), inset 0 1px 0 rgba(255,255,255,.06)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 14,
              }}
            >
              <span
                className="font-mono"
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: ".09em",
                  color: "rgba(255,255,255,.5)",
                }}
              >
                4-question quiz
              </span>
              <span
                className="font-mono"
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  color: "var(--color-coral-400)",
                  letterSpacing: ".06em",
                }}
              >
                ~60s
              </span>
            </div>

            {/* progress dots — 4 questions, last one pulses */}
            <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className={i === 3 ? "hero-dot-pulse" : undefined}
                  style={{
                    flex: 1,
                    height: 6,
                    borderRadius: 99,
                    background:
                      i < 3
                        ? "rgba(255,255,255,.45)"
                        : "var(--color-coral-400)",
                  }}
                />
              ))}
            </div>

            {/* mini route preview with chevrons leading right */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { label: "Compare share brokers", tone: "rgba(96,165,250,.95)" },
                { label: "Browse businesses for sale", tone: "rgba(52,211,153,.95)" },
                { label: "Find an SMSF accountant", tone: "rgba(167,139,250,.95)" },
              ].map((row) => (
                <div
                  key={row.label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    padding: "8px 12px",
                    borderRadius: 10,
                    background: "rgba(255,255,255,.06)",
                    border: "1px solid rgba(255,255,255,.10)",
                    fontSize: 12.5,
                    fontWeight: 700,
                    color: "rgba(255,255,255,.92)",
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                    <span
                      aria-hidden
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 99,
                        background: row.tone,
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {row.label}
                    </span>
                  </span>
                  <DesignIcon name="arrow-right" size={13} strokeWidth={2.6} />
                </div>
              ))}
            </div>

            {/* terminal pull-arrow — suggests "press right" */}
            <div
              className="hero-pull-arrow"
              style={{
                marginTop: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: 8,
                fontSize: 11.5,
                fontWeight: 800,
                letterSpacing: ".04em",
                textTransform: "uppercase",
                color: "var(--color-coral-400)",
              }}
            >
              <span>Pull to start</span>
              <span
                aria-hidden
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 28,
                  height: 28,
                  borderRadius: 99,
                  background: "var(--color-coral-400)",
                  color: "white",
                  boxShadow:
                    "0 0 0 0 rgba(242,88,34,.55), 0 8px 18px -6px rgba(242,88,34,.7)",
                }}
              >
                <DesignIcon name="arrow-right" size={14} strokeWidth={3} />
              </span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (min-width: 1024px) {
          .hero-shell { grid-template-columns: minmax(0, 1.15fr) minmax(320px, 0.85fr) !important; }
          .hero-pull { display: block !important; }
        }
        @keyframes heroDotPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(242,88,34,.55); }
          50% { box-shadow: 0 0 0 6px rgba(242,88,34,0); }
        }
        .hero-dot-pulse { animation: heroDotPulse 1.6s ease-in-out infinite; }
        @keyframes heroPullArrow {
          0%, 100% { transform: translateX(0); }
          55% { transform: translateX(4px); }
        }
        .hero-pull-arrow > span:last-child {
          animation: heroPullArrow 1.6s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .hero-dot-pulse,
          .hero-pull-arrow > span:last-child { animation: none; }
        }
      `}</style>
    </section>
  );
}
