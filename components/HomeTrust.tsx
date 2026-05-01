import Link from "next/link";

// Trust / commercial transparency block. v5 copy per spec: avoids absolute
// claims, frames the model as transparent rather than virtuous, and gives
// three concise cards that explain (1) we don't take a cut, (2) commercial
// placements should be disclosed, (3) the visitor stays in control.
export default function HomeTrust() {
  const cards: ReadonlyArray<{ title: string; copy: string }> = [
    {
      title: "No cut of your investment",
      copy: "We do not take a percentage of what you invest, buy or sell.",
    },
    {
      title: "Commercial placements disclosed",
      copy: "Advertising, referral, listing or introduction revenue should be clearly labelled where it appears.",
    },
    {
      title: "You choose what happens next",
      copy: "We help you compare, browse and connect. We do not make decisions for you.",
    },
  ];

  return (
    <section
      style={{
        background: "var(--color-ink-900)",
        color: "white",
        padding: "56px 36px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div aria-hidden className="iv2-dotgrid" style={{ position: "absolute", inset: 0, opacity: 0.4, pointerEvents: "none" }} />
      <div style={{ position: "relative", maxWidth: 1080, margin: "0 auto" }}>
        <span className="iv2-mini" style={{ color: "var(--color-coral-300)" }}>
          ● Free for investors · Commercial model disclosed
        </span>
        <h2
          className="font-display"
          style={{
            fontSize: 30,
            letterSpacing: "-.028em",
            fontWeight: 800,
            margin: "6px 0 8px",
            lineHeight: 1.1,
            color: "white",
            textWrap: "balance",
          }}
        >
          Free for investors. Commercial model disclosed.
        </h2>
        <p
          style={{
            fontSize: 14,
            color: "rgba(255,255,255,.72)",
            margin: "0 0 28px",
            maxWidth: 720,
            lineHeight: 1.55,
          }}
        >
          Invest.com.au may earn advertising, referral, listing or professional-introduction revenue,
          but it does not take a percentage of your investment and does not provide personal
          financial advice.
        </p>

        <div
          className="home-trust-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 14,
          }}
        >
          {cards.map((c) => (
            <div
              key={c.title}
              style={{
                background: "rgba(255,255,255,.04)",
                border: "1px solid rgba(255,255,255,.08)",
                borderRadius: 12,
                padding: "20px 22px",
              }}
            >
              <div
                aria-hidden
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 99,
                  background: "var(--color-coral-400)",
                  marginBottom: 12,
                }}
              />
              <div
                className="font-display"
                style={{
                  fontSize: 17,
                  fontWeight: 800,
                  color: "white",
                  marginBottom: 8,
                  letterSpacing: "-.018em",
                  lineHeight: 1.2,
                }}
              >
                {c.title}
              </div>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,.68)", lineHeight: 1.55, margin: 0 }}>
                {c.copy}
              </p>
            </div>
          ))}
        </div>

        <p style={{ fontSize: 11.5, color: "rgba(255,255,255,.45)", marginTop: 22, maxWidth: 720, lineHeight: 1.5 }}>
          General information only &mdash; not personal financial advice. Always check licensing,
          fees, risks and suitability before proceeding. See our{" "}
          <Link href="/methodology" style={{ color: "rgba(255,255,255,.78)", textDecoration: "underline" }}>
            methodology
          </Link>{" "}
          and{" "}
          <Link href="/how-we-earn" style={{ color: "rgba(255,255,255,.78)", textDecoration: "underline" }}>
            how we earn
          </Link>
          .
        </p>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .home-trust-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}
