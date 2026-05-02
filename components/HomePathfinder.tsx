import Link from "next/link";
import { DesignIcon } from "@/components/design/DesignIcon";

// Pathfinder section — secondary affordance for visitors who don't know
// which route to pick. Per v5 spec the quiz lives BELOW the route cards
// (not as the dominant hero card), so it helps users who are unsure
// without overwhelming everyone else.
export default function HomePathfinder() {
  return (
    <section style={{ padding: "40px 36px", maxWidth: 1280, margin: "0 auto" }}>
      <div
        style={{
          background: "linear-gradient(135deg, var(--color-sand-50), white)",
          border: "1px solid #e5e7eb",
          borderRadius: 16,
          padding: "32px 32px 28px",
          display: "grid",
          gridTemplateColumns: "1.4fr 1fr",
          gap: 32,
          alignItems: "center",
        }}
        className="home-pathfinder-card"
      >
        <div>
          <span className="iv2-mini" style={{ color: "var(--color-coral-600)" }}>
            ● Get matched · 60-second flow
          </span>
          <h2
            className="font-display"
            style={{
              fontSize: 28,
              letterSpacing: "-.028em",
              fontWeight: 800,
              margin: "6px 0 8px",
              lineHeight: 1.1,
              color: "var(--color-ink-900)",
              textWrap: "balance",
            }}
          >
            Not sure where to start? Get matched.
          </h2>
          <p
            style={{
              fontSize: 14,
              color: "var(--color-ink-600)",
              lineHeight: 1.55,
              margin: 0,
              maxWidth: 540,
            }}
          >
            Answer a few quick questions and we&apos;ll show the best next step &mdash; compare
            platforms, browse investments for sale, find an expert, or post a request.
          </p>
          <p
            style={{
              fontSize: 12.5,
              color: "var(--color-ink-500)",
              fontStyle: "italic",
              margin: "10px 0 0",
            }}
          >
            Best if you&apos;re not sure where to start.
          </p>
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: "16px 0 22px",
              display: "flex",
              gap: 16,
              flexWrap: "wrap",
              fontSize: 12.5,
              color: "var(--color-ink-500)",
            }}
          >
            <li style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              <span aria-hidden style={{ width: 5, height: 5, borderRadius: 99, background: "var(--color-emerald-600)", display: "inline-block" }} />
              No email needed
            </li>
            <li style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              <span aria-hidden style={{ width: 5, height: 5, borderRadius: 99, background: "var(--color-emerald-600)", display: "inline-block" }} />
              Skip anytime
            </li>
            <li style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              <span aria-hidden style={{ width: 5, height: 5, borderRadius: 99, background: "var(--color-emerald-600)", display: "inline-block" }} />
              Clear next step
            </li>
          </ul>
          <Link
            href="/quiz"
            className="iv2-cta"
            style={{ fontSize: 14, padding: "12px 22px", borderRadius: 11 }}
          >
            Get matched in 60 seconds <DesignIcon name="arrow-right" size={13} strokeWidth={2.6} />
          </Link>
        </div>

        <ol
          className="home-pathfinder-steps"
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {(
            [
              ["1", "Answer a few prompts", "What you're trying to do, your situation, your timeframe."],
              ["2", "We route you", "Comparison, listing, expert directory or matched enquiry — whatever fits."],
              ["3", "You decide", "Always your call. We don't recommend personal investments."],
            ] as const
          ).map(([n, title, sub]) => (
            <li
              key={n}
              style={{
                background: "white",
                border: "1px solid #e5e7eb",
                borderRadius: 11,
                padding: "12px 14px",
                display: "flex",
                gap: 12,
                alignItems: "flex-start",
              }}
            >
              <span
                aria-hidden
                className="font-mono"
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 99,
                  background: "var(--color-coral-100)",
                  color: "var(--color-coral-700)",
                  fontWeight: 800,
                  fontSize: 11,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {n}
              </span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-ink-900)" }}>{title}</div>
                <div style={{ fontSize: 11.5, color: "var(--color-ink-500)", marginTop: 2, lineHeight: 1.45 }}>{sub}</div>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .home-pathfinder-card {
            grid-template-columns: 1fr !important;
            gap: 20px !important;
          }
        }
      `}</style>
    </section>
  );
}
