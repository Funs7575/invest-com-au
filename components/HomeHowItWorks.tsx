import Link from "next/link";

const STEPS = [
  {
    n: "1",
    heading: "Tell us what you need",
    description: "Describe your situation in 2 minutes via the brief form — goals, timeframe, and what you're looking for.",
  },
  {
    n: "2",
    heading: "Get matched with advisors",
    description: "Our matching engine finds licensed advisors who specialise in exactly what you need.",
  },
  {
    n: "3",
    heading: "Compare and connect",
    description: "Review profiles, ratings, and proposals side by side — then choose who to work with.",
  },
] as const;

export default function HomeHowItWorks() {
  return (
    <section
      style={{
        background: "#f8fafc",
        borderTop: "1px solid #e5e7eb",
        borderBottom: "1px solid #e5e7eb",
        padding: "52px 36px",
      }}
    >
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        {/* Section header */}
        <div style={{ marginBottom: 32, textAlign: "center" }}>
          <span
            className="iv2-mini"
            style={{ color: "var(--color-teal-700)" }}
          >
            ● Advisor matching · How it works
          </span>
          <h2
            className="font-display"
            style={{
              fontSize: 30,
              letterSpacing: "-.028em",
              fontWeight: 800,
              margin: "6px 0 8px",
              lineHeight: 1.1,
              color: "var(--color-ink-900)",
              textWrap: "balance",
            }}
          >
            Get matched with the right advisor in minutes.
          </h2>
          <p
            style={{
              fontSize: 14,
              color: "var(--color-ink-500)",
              margin: "0 auto",
              maxWidth: 520,
              lineHeight: 1.55,
            }}
          >
            No cold calls. No guesswork. Tell us what you need and we&apos;ll
            surface the right licensed professionals for your situation.
          </p>
        </div>

        {/* Step cards */}
        <div
          className="how-it-works-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 16,
            marginBottom: 32,
          }}
        >
          {STEPS.map(({ n, heading, description }) => (
            <div
              key={n}
              className="iv2-card"
              style={{
                padding: "24px 22px 22px",
                display: "flex",
                flexDirection: "column",
                gap: 12,
                borderTop: "3px solid var(--color-teal-400)",
              }}
            >
              {/* Numbered badge */}
              <span
                aria-hidden
                className="font-mono"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 99,
                  background: "var(--color-teal-600)",
                  color: "white",
                  fontWeight: 800,
                  fontSize: 13,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {n}
              </span>

              <div>
                <h3
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: "var(--color-ink-900)",
                    margin: "0 0 6px",
                    lineHeight: 1.25,
                  }}
                >
                  {heading}
                </h3>
                <p
                  style={{
                    fontSize: 13.5,
                    color: "var(--color-ink-500)",
                    margin: 0,
                    lineHeight: 1.55,
                  }}
                >
                  {description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ textAlign: "center" }}>
          <Link
            href="/briefs/new"
            className="iv2-cta"
            style={{ fontSize: 15, padding: "13px 26px", borderRadius: 11 }}
          >
            Get matched with an advisor →
          </Link>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .how-it-works-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}
