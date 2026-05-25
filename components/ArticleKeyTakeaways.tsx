/**
 * ArticleKeyTakeaways — answer-first summary block for article pages.
 *
 * GEO rationale: AI answer engines prefer pages whose direct answer appears at
 * the very top, before elaboration. This component renders the article excerpt
 * (or explicit bullets) as a scannable bulleted list right after the article
 * title and cover image — matching the pattern already established on Q&A pages
 * by `QuestionKeyTakeaways`.
 *
 * The outer `<section>` carries `id="article-key-takeaways"` so the speakable
 * CSS selector in `articleAnswerFirstJsonLd` can reference it and voice/AI
 * systems can extract just the takeaways without parsing surrounding prose.
 *
 * Content rules:
 *   - Derived from the article `excerpt` (factual, AFSL-safe).
 *   - Never fabricated; auto-split on ". " sentence boundaries for bullets.
 *   - Shows only when `excerpt` is present — no empty/placeholder blocks.
 */

import React from "react";

interface Props {
  /** The article excerpt / lead paragraph. Auto-split into bullets. */
  excerpt: string;
  /**
   * Optional override: provide explicit bullet-point sentences.
   * When absent, `excerpt` is split on sentence boundaries into up to 4 bullets.
   */
  bullets?: string[];
}

function deriveBullets(excerpt: string): string[] {
  // Split on ". " (sentence) boundaries, keep trailing full stop, trim, drop empties.
  const raw = excerpt
    .split(/(?<=\.)\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  // Cap at 4 bullets so the block stays tight above the fold.
  return raw.slice(0, 4);
}

export function ArticleKeyTakeaways({ excerpt, bullets }: Props) {
  const items = bullets && bullets.length > 0 ? bullets : deriveBullets(excerpt);

  if (items.length === 0) return null;

  return (
    <section
      id="article-key-takeaways"
      aria-label="Key takeaways"
      className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-5 py-4"
    >
      <p className="mb-2 text-sm font-semibold text-amber-800">Key takeaways</p>
      <ul className="space-y-1.5 pl-0">
        {items.map((item, i) => (
          <li
            key={i}
            className="flex items-start gap-2 text-slate-800 text-sm leading-relaxed"
          >
            {/* Decorative bullet tick */}
            <svg
              className="mt-0.5 h-4 w-4 shrink-0 text-amber-600"
              viewBox="0 0 16 16"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M12.354 4.646a.5.5 0 0 1 0 .708l-5.5 5.5a.5.5 0 0 1-.708 0l-2.5-2.5a.5.5 0 0 1 .708-.708L6.5 9.793l5.146-5.147a.5.5 0 0 1 .708 0z"
                clipRule="evenodd"
              />
            </svg>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
