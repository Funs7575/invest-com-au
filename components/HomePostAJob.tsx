import Link from "next/link";
import { DesignIcon } from "@/components/design/DesignIcon";

export default function HomePostAJob() {
  return (
    <section
      style={{
        background: "var(--color-sand-50)",
        borderTop: "1px solid #e5e7eb",
        borderBottom: "1px solid #e5e7eb",
        padding: "52px 36px",
      }}
    >
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        <div
          className="home-postjob-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "1.2fr 1fr",
            gap: 40,
            alignItems: "center",
          }}
        >
          <div>
            <span className="iv2-mini" style={{ color: "var(--color-coral-600)" }}>
              ● Post a request · free
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
              Post a request.
            </h2>
            <p
              style={{
                fontSize: 15,
                lineHeight: 1.55,
                color: "var(--color-ink-600)",
                margin: "14px 0 0",
                maxWidth: 560,
              }}
            >
              Describe what you need and have specialists come to you with proposals &mdash; like
              Airtasker for investing decisions. Most requests hear back within a day.
            </p>
            <p
              style={{
                fontSize: 13,
                color: "var(--color-ink-500)",
                fontStyle: "italic",
                margin: "10px 0 0",
              }}
            >
              Best if you want specialists to come back with options.
            </p>

            <div style={{ display: "flex", gap: 10, marginTop: 22, flexWrap: "wrap", alignItems: "center" }}>
              <Link
                href="/quotes/post"
                className="iv2-cta"
                style={{ fontSize: 14, padding: "12px 22px" }}
              >
                Post a request <DesignIcon name="arrow-right" size={13} strokeWidth={2.4} />
              </Link>
              <Link
                href="/quotes/recent-wins"
                className="iv2-cta-ghost"
                style={{ fontSize: 13 }}
              >
                See recent requests
              </Link>
            </div>
          </div>

          <ol
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {(
              [
                ["1", "Describe your need", "A short brief. No email until you're ready to send."],
                ["2", "Specialists respond", "Relevant pros come to you with quotes or proposals."],
                ["3", "You pick", "Compare responses on your terms. Introductions only."],
              ] as const
            ).map(([n, title, sub]) => (
              <li
                key={n}
                style={{
                  display: "flex",
                  gap: 14,
                  alignItems: "flex-start",
                  padding: "14px 16px",
                  background: "white",
                  borderRadius: 12,
                  border: "1px solid #e5e7eb",
                  boxShadow: "0 1px 2px rgba(11,20,34,.04)",
                }}
              >
                <span
                  className="font-mono"
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 99,
                    background: "var(--color-coral-100)",
                    color: "var(--color-coral-700)",
                    fontWeight: 800,
                    fontSize: 12,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                  aria-hidden
                >
                  {n}
                </span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-ink-900)" }}>
                    {title}
                  </div>
                  <div
                    style={{ fontSize: 12, color: "var(--color-ink-500)", marginTop: 2, lineHeight: 1.45 }}
                  >
                    {sub}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .home-postjob-grid {
            grid-template-columns: 1fr !important;
            gap: 24px !important;
          }
        }
      `}</style>
    </section>
  );
}
