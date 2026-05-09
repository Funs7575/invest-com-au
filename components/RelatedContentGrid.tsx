import Link from "next/link";

export interface RelatedItem {
  id: string | number;
  href: string;
  title: string;
  /** Coloured badge text (e.g. article category). Optional. */
  badgeText?: string;
  /** Tailwind classes for the badge (e.g. "bg-blue-100 text-blue-700"). */
  badgeClass?: string;
  /** Small footer line beneath the title (e.g. "5 min read", "Sponsored by X"). */
  meta?: string;
}

interface Props {
  items: RelatedItem[];
  heading?: string;
  /** Tailwind classes applied to each card. Defaults to a neutral border+shadow card. */
  cardClass?: string;
}

/**
 * KK-02: Reusable related-content grid used at the bottom of article, research,
 * and advisor-guide content pages to improve internal linking coverage.
 *
 * Renders a responsive 1→3 column grid of linked cards. Data mapping (category
 * colours, read_time, sponsor name) stays in the caller to keep this component
 * data-agnostic.
 */
export default function RelatedContentGrid({
  items,
  heading = "Related Content",
  cardClass = "border border-slate-200 rounded-xl p-4 md:p-5 hover:shadow-md transition-all bg-white flex flex-col",
}: Props) {
  if (items.length === 0) return null;

  return (
    <div className="mt-8 md:mt-12">
      <h3 className="text-lg md:text-xl font-bold mb-3 md:mb-6">{heading}</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-5">
        {items.map((item) => (
          <Link key={item.id} href={item.href} className={cardClass}>
            {item.badgeText && (
              <span
                className={`text-[0.69rem] md:text-xs font-semibold px-2 md:px-2.5 py-0.5 rounded-full self-start mb-1.5 md:mb-2 ${item.badgeClass ?? "bg-slate-100 text-slate-700"}`}
              >
                {item.badgeText}
              </span>
            )}
            <h4 className="text-sm font-bold mb-1 md:mb-2 line-clamp-2 flex-1">
              {item.title}
            </h4>
            {item.meta && (
              <span className="text-[0.69rem] md:text-xs text-slate-400">
                {item.meta}
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
