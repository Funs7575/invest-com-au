/**
 * <HubArticleStrip> — reusable article card grid for hub pages.
 *
 * Extracted from the duplicated fetchXArticles + inline grid pattern in
 * app/smsf/page.tsx and app/grants/page.tsx. Accepts pre-fetched article
 * data and renders a responsive column grid of article cards; returns null
 * when articles is empty so callers need no conditional wrapper.
 *
 * W-04 — hub foundation stream (REMEDIATION_QUEUE.md).
 */
import Link from "next/link";
import Icon from "@/components/Icon";

export interface HubArticleItem {
  slug: string;
  title: string;
  excerpt?: string | null;
}

interface HubArticleStripProps {
  /** Section heading rendered as an <h2>. */
  heading: string;
  /** Pre-fetched article rows (empty array → component returns null). */
  articles: HubArticleItem[];
  /**
   * Column count at lg breakpoint.
   * 3 (default) matches /smsf; 4 matches /grants.
   */
  columns?: 3 | 4;
  /** Optional className applied to the root <section>. */
  className?: string;
}

const GRID_CLASS: Record<NonNullable<HubArticleStripProps["columns"]>, string> = {
  3: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4",
  4: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4",
};

const CARD_CLASS: Record<NonNullable<HubArticleStripProps["columns"]>, string> = {
  3: "block bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl p-5 transition-colors",
  4: "block bg-white hover:bg-slate-50 border border-slate-200 rounded-xl p-5 transition-colors",
};

export default function HubArticleStrip({
  heading,
  articles,
  columns = 3,
  className,
}: HubArticleStripProps) {
  if (articles.length === 0) return null;

  return (
    <section
      className={className ?? "py-12 bg-white"}
      data-testid="hub-article-strip"
    >
      <div className="container-custom max-w-6xl">
        <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">
          {heading}
        </h2>
        <div className={GRID_CLASS[columns]}>
          {articles.map((a) => (
            <Link
              key={a.slug}
              href={`/article/${a.slug}`}
              className={CARD_CLASS[columns]}
              data-testid="hub-article-strip-item"
            >
              <h3 className="text-sm font-extrabold text-slate-900 leading-tight mb-2 line-clamp-2">
                {a.title}
              </h3>
              {a.excerpt && (
                <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                  {a.excerpt}
                </p>
              )}
              <p className="text-xs font-bold text-amber-600 mt-3 inline-flex items-center gap-1">
                Read article
                <Icon name="arrow-right" size={12} />
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
