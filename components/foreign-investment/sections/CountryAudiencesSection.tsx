import SectionHeading from "@/components/SectionHeading";
import type { AudienceCard } from "@/lib/foreign-investment-country-data";

const ACCENT_BORDER: Record<AudienceCard["accent"], string> = {
  blue: "border-blue-200 bg-blue-50/50",
  amber: "border-amber-200 bg-amber-50/50",
};
const ACCENT_HEADING: Record<AudienceCard["accent"], string> = {
  blue: "text-blue-800",
  amber: "text-amber-800",
};
const ACCENT_BULLET: Record<AudienceCard["accent"], string> = {
  blue: "text-blue-700",
  amber: "text-amber-700",
};

/**
 * Renders the "two audiences" two-card layout that splits a country
 * page into UK-resident vs Aussie-expat (or analogue per country).
 * Driven entirely from CountryConfig.audiences.
 */
export default function CountryAudiencesSection({
  heading,
  sub,
  cards,
}: {
  heading: string;
  sub: string;
  cards: ReadonlyArray<AudienceCard>;
}) {
  return (
    <section id="audiences" className="scroll-mt-20">
      <SectionHeading eyebrow="Two Audiences" title={heading} sub={sub} />
      <div className="grid sm:grid-cols-2 gap-5">
        {cards.map((card, idx) => (
          <div
            key={`${card.title}-${idx}`}
            className={`border-2 rounded-2xl p-5 ${ACCENT_BORDER[card.accent]}`}
          >
            <h3 className={`font-bold mb-3 ${ACCENT_HEADING[card.accent]}`}>
              {card.flagEmoji} {card.title}
            </h3>
            <ul className={`space-y-2 text-sm ${ACCENT_BULLET[card.accent]}`}>
              {card.bullets.map((b, i) => (
                <li key={i}>• {b}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
