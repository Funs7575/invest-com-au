import Link from "next/link";
import { DesignIcon } from "@/components/design/DesignIcon";
import { FlagChip } from "@/components/design/Atoms";
import { getIntentCountry, isoForIntentCode } from "@/lib/intent-context";

// Cards on the homepage section serve audience A (inbound migrants — largest
// absolute LTV). The other three cross-border audiences (US-AU dual citizens,
// non-resident foreign investors, outbound Australians) get small footer
// escape hatches. Mixing all four into co-equal cards is what made the
// previous version read as muddled — see FIN_NOTEBOOK 2026-05-01.
const ARRIVALS: ReadonlyArray<{
  code: string;
  country: string;
  blurb: string;
  href: string;
}> = [
  {
    code: "GB",
    country: "the UK",
    blurb: "Pension transfers, residency rules, and how UK and Australian tax overlap.",
    href: "/foreign-investment/united-kingdom",
  },
  {
    code: "IN",
    country: "India",
    blurb: "NRI / ROR status, getting funds out of India, and what changes when you arrive.",
    href: "/foreign-investment/india",
  },
  {
    code: "CN",
    country: "China",
    blurb: "Moving funds across the border, mainland property, and double-tax basics.",
    href: "/foreign-investment/china",
  },
  {
    code: "US",
    country: "the US",
    blurb: "Why the IRS still wants you, and which Australian funds you should and shouldn't own.",
    href: "/foreign-investment/united-states",
  },
];

/**
 * Hoist the matching arrival card to position 1 when the user is in
 * country mode. Copy stays unchanged, no fifth card — just a small
 * "we noticed you're from here" affordance. Falls through silently for
 * countries not in the 4-card set (HK, SG, NZ, JP, KR, MY, AE, SA),
 * preserving the FIN_NOTEBOOK 2026-05-01 stance against broadening
 * the cross-border framing.
 */
function reorderForPriority(
  arrivals: ReadonlyArray<(typeof ARRIVALS)[number]>,
  priorityIso: string | null,
): ReadonlyArray<(typeof ARRIVALS)[number]> {
  if (!priorityIso) return arrivals;
  const idx = arrivals.findIndex((a) => a.code === priorityIso);
  if (idx <= 0) return arrivals; // not found, or already first
  return [arrivals[idx]!, ...arrivals.slice(0, idx), ...arrivals.slice(idx + 1)];
}

export default async function HomeCrossBorder() {
  const code = await getIntentCountry();
  const priorityIso = code ? isoForIntentCode(code) : null;
  const ordered = reorderForPriority(ARRIVALS, priorityIso);
  return <HomeCrossBorderInner arrivals={ordered} />;
}

function HomeCrossBorderInner({ arrivals }: { arrivals: ReadonlyArray<(typeof ARRIVALS)[number]> }) {
  return (
    <section style={{ padding: "56px 36px 60px", maxWidth: 1280, margin: "0 auto" }}>
      <div style={{ marginBottom: 24, maxWidth: 720 }}>
        <span className="iv2-mini" style={{ color: "var(--color-coral-600)" }}>
          ● Cross-border · pension, tax, FIRB, DASP
        </span>
        <h2
          className="font-display"
          style={{
            fontSize: 32,
            letterSpacing: "-.028em",
            fontWeight: 800,
            margin: "6px 0 8px",
            lineHeight: 1.05,
            textWrap: "balance",
          }}
        >
          Just moved to Australia?
        </h2>
        <p
          style={{
            fontSize: 14,
            color: "var(--color-ink-500)",
            margin: 0,
            maxWidth: 640,
            lineHeight: 1.55,
          }}
        >
          We&apos;ll match you with specialists for the country-specific stuff &mdash; pension transfers,
          tax overlap, FIRB property rules, DASP refunds. Pick where you&apos;re coming from.
        </p>
      </div>

      <div className="home-crossborder-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {arrivals.map((p) => (
          <Link
            key={p.code}
            href={p.href}
            className="iv2-card iv2-card-hover"
            style={{
              padding: "18px 18px 16px",
              display: "flex",
              flexDirection: "column",
              gap: 10,
              textDecoration: "none",
              color: "inherit",
              minHeight: 180,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <FlagChip code={p.code} />
              <div style={{ fontSize: 14, fontWeight: 800, color: "var(--color-ink-900)", letterSpacing: "-.012em" }}>
                Coming from {p.country}
              </div>
            </div>
            <p
              style={{
                fontSize: 12.5,
                color: "var(--color-ink-500)",
                margin: 0,
                lineHeight: 1.5,
                flex: 1,
              }}
            >
              {p.blurb}
            </p>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "var(--color-coral-600)",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                marginTop: "auto",
              }}
            >
              Find specialists <DesignIcon name="arrow-right" size={11} strokeWidth={2.6} />
            </div>
          </Link>
        ))}
      </div>

      <div
        className="home-crossborder-footer"
        style={{
          marginTop: 18,
          paddingTop: 14,
          borderTop: "1px solid #e5e7eb",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 14,
          fontSize: 12,
          color: "var(--color-ink-400)",
        }}
      >
        <span>
          Other countries:{" "}
          <Link href="/foreign-investment/singapore" style={{ color: "var(--color-ink-500)", textDecoration: "none", fontWeight: 600 }}>Singapore</Link>{" · "}
          <Link href="/foreign-investment/new-zealand" style={{ color: "var(--color-ink-500)", textDecoration: "none", fontWeight: 600 }}>NZ</Link>{" · "}
          <Link href="/foreign-investment/hong-kong" style={{ color: "var(--color-ink-500)", textDecoration: "none", fontWeight: 600 }}>Hong Kong</Link>{" · "}
          <Link href="/foreign-investment/united-arab-emirates" style={{ color: "var(--color-ink-500)", textDecoration: "none", fontWeight: 600 }}>UAE</Link>{" · "}
          <Link href="/foreign-investment" style={{ color: "var(--color-coral-600)", textDecoration: "none", fontWeight: 700 }}>see all 12 &rarr;</Link>
        </span>
        <span style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          <Link href="/foreign-investment/super" style={{ color: "var(--color-ink-500)", textDecoration: "none", fontWeight: 600 }}>
            Leaving Australia? DASP refund &rarr;
          </Link>
          <Link href="/foreign-investment" style={{ color: "var(--color-ink-500)", textDecoration: "none", fontWeight: 600 }}>
            Investing into AU from offshore &rarr;
          </Link>
        </span>
      </div>

      <style>{`
        @media (max-width: 1024px) {
          .home-crossborder-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 640px) {
          .home-crossborder-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}
