/**
 * <HubDeepDiveGrid> — reusable deep-dive sub-page link grid for hub pages.
 *
 * Extracted from the duplicated inline-array + grid pattern in
 * app/smsf/page.tsx ("SMSF deep-dives") and app/dividends/page.tsx.
 * Accepts pre-defined link items and renders a responsive grid of
 * title + description cards, with an optional "Read guide" CTA per card.
 *
 * Unlike HubServiceGrid (W-03), cards here carry no icon — they are
 * pure text navigation cards linking to sub-pages or deep-dive articles.
 *
 * W-05 — hub foundation stream (REMEDIATION_QUEUE.md).
 */
import Link from "next/link";
import Icon from "@/components/Icon";

export interface HubDeepDiveItem {
  title: string;
  desc: string;
  href: string;
}

interface HubDeepDiveGridProps {
  /** Section heading rendered as an <h2>. */
  heading: string;
  /** Optional subheading rendered as a small paragraph below the <h2>. */
  subheading?: string;
  /** Array of deep-dive link items. */
  items: HubDeepDiveItem[];
  /**
   * Column count at lg breakpoint.
   * 3 (default) matches /smsf; 4 matches /dividends.
   */
  columns?: 2 | 3 | 4;
  /**
   * CTA label shown at the bottom of each card (e.g. "Read guide").
   * When omitted, no CTA is rendered — cards end after the description.
   */
  cta?: string;
  /** Optional className applied to the root <section>. */
  className?: string;
}

const GRID_CLASS: Record<NonNullable<HubDeepDiveGridProps["columns"]>, string> = {
  2: "grid grid-cols-1 md:grid-cols-2 gap-4",
  3: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4",
  4: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4",
};

export default function HubDeepDiveGrid({
  heading,
  subheading,
  items,
  columns = 3,
  cta,
  className,
}: HubDeepDiveGridProps) {
  return (
    <section
      className={className ?? "py-12 bg-white border-t border-slate-200"}
      data-testid="hub-deep-dive-grid"
    >
      <div className="container-custom max-w-6xl">
        <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">
          {heading}
        </h2>
        {subheading && (
          <p className="text-sm text-slate-600 mb-6">{subheading}</p>
        )}
        {!subheading && <div className="mb-6" />}
        <div className={GRID_CLASS[columns]}>
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl p-5 transition-colors"
              data-testid="hub-deep-dive-grid-item"
            >
              <h3 className="text-base font-extrabold text-slate-900 group-hover:text-amber-700 mb-1.5">
                {item.title}
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-3">
                {item.desc}
              </p>
              {cta && (
                <span className="inline-flex items-center gap-1.5 text-sm font-bold text-amber-600 group-hover:underline">
                  {cta}
                  <Icon name="arrow-right" size={14} />
                </span>
              )}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
