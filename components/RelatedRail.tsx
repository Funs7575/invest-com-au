/**
 * RelatedRail — content-discovery rail for article, broker, and advisor pages.
 *
 * Renders a responsive grid of related items drawn from existing data.
 * Accepts an optional `jsonLd` block (ItemList JSON-LD) emitted as a
 * <script type="application/ld+json"> block alongside the visual rail.
 *
 * AFSL note: all copy is factual-discovery framing ("Related content",
 * "Similar brokers") — never advice framing ("Recommended for you").
 */

import Link from "next/link";
import type { RelatedItem } from "@/lib/related-content";

interface Props {
  /** Section heading displayed above the grid. */
  heading: string;
  /**
   * Primary items (articles, brokers, or advisors).
   * The rail renders nothing when this array is empty.
   */
  items: RelatedItem[];
  /**
   * Optional secondary items shown in a separate sub-section below.
   * Typically calculator/guide links (articles page) or directory links
   * (advisor page). Hidden when the array is empty.
   */
  secondaryItems?: RelatedItem[];
  /** Label for the secondary items sub-section. */
  secondaryHeading?: string;
  /**
   * Optional pre-serialised JSON-LD block (ItemList). When provided
   * it is emitted as a <script type="application/ld+json"> alongside
   * the visual rail.
   */
  jsonLd?: object | null;
  /** Tailwind utility classes added to the section wrapper. */
  className?: string;
}

/**
 * A single card in the rail.
 */
function RailCard({ item }: { item: RelatedItem }) {
  return (
    <Link
      href={item.href}
      className="group flex flex-col border border-slate-200 rounded-xl p-4 bg-white hover:shadow-md hover:border-slate-300 transition-all"
    >
      {item.badgeText && (
        <span
          className={`self-start text-[0.69rem] font-semibold px-2 py-0.5 rounded-full mb-2 ${item.badgeClass ?? "bg-slate-100 text-slate-700"}`}
        >
          {item.badgeText}
        </span>
      )}
      <span className="text-sm font-bold text-slate-900 leading-snug line-clamp-2 flex-1 group-hover:text-slate-700 transition-colors">
        {item.title}
      </span>
      {item.meta && (
        <span className="mt-2 text-[0.69rem] text-slate-400">{item.meta}</span>
      )}
    </Link>
  );
}

export default function RelatedRail({
  heading,
  items,
  secondaryItems,
  secondaryHeading,
  jsonLd,
  className = "",
}: Props) {
  if (items.length === 0 && (!secondaryItems || secondaryItems.length === 0)) {
    return null;
  }

  return (
    <section
      aria-labelledby="related-rail-heading"
      className={`mt-8 md:mt-12 ${className}`}
    >
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}

      <h3
        id="related-rail-heading"
        className="text-lg md:text-xl font-bold mb-4"
      >
        {heading}
      </h3>

      {items.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {items.map((item) => (
            <RailCard key={item.id} item={item} />
          ))}
        </div>
      )}

      {secondaryItems && secondaryItems.length > 0 && (
        <div className="mt-5">
          {secondaryHeading && (
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              {secondaryHeading}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {secondaryItems.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium transition-colors ${item.badgeClass ? `${item.badgeClass} border-transparent` : "border-slate-200 text-slate-700 hover:border-slate-400 bg-white"}`}
              >
                {item.badgeText && (
                  <span className="text-[0.69rem] font-bold opacity-70">
                    {item.badgeText}
                  </span>
                )}
                {item.title}
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
