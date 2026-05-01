import Link from "next/link";

// Popular starting points — horizontal-scroll chips of common entry queries.
// Per v5 spec these are explicit pre-defined starting points (not a free
// search), so each chip is a real route to a relevant page. Scroll only;
// not a primary nav surface.
const STARTING_POINTS: ReadonlyArray<{ label: string; href: string }> = [
  { label: "Start with $500", href: "/best/share-trading?budget=500" },
  { label: "Best platform for beginners", href: "/best/share-trading-beginners" },
  { label: "Browse property opportunities", href: "/property" },
  { label: "Find a mortgage broker", href: "/advisors/mortgage-brokers" },
  { label: "Get matched to a specialist", href: "/quotes/post" },
  { label: "Investing from overseas", href: "/foreign-investment" },
];

export default function HomePopularStarts() {
  return (
    <section
      style={{
        padding: "20px 36px 8px",
        maxWidth: 1280,
        margin: "0 auto",
      }}
    >
      <p
        style={{
          fontSize: 11,
          color: "var(--color-ink-400)",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: ".08em",
          marginBottom: 10,
        }}
      >
        Popular starting points
      </p>
      <div
        className="home-popular-starts-row"
        style={{
          display: "flex",
          gap: 8,
          overflowX: "auto",
          scrollbarWidth: "thin",
          paddingBottom: 6,
          marginInline: -36,
          paddingInline: 36,
        }}
      >
        {STARTING_POINTS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            style={{
              flex: "0 0 auto",
              padding: "8px 14px",
              borderRadius: 99,
              background: "white",
              border: "1px solid #e5e7eb",
              fontSize: 13,
              fontWeight: 600,
              color: "var(--color-ink-700)",
              textDecoration: "none",
              whiteSpace: "nowrap",
              boxShadow: "0 1px 2px rgba(11,20,34,.03)",
            }}
          >
            {s.label}
          </Link>
        ))}
      </div>
    </section>
  );
}
