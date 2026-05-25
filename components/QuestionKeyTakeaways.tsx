/**
 * QuestionKeyTakeaways — answer-first summary block for question-detail pages.
 *
 * GEO rationale: AI answer engines favour pages whose direct answer appears
 * immediately at the top of content, before any elaboration. This component
 * renders the short, factual answer (derived from `shortAnswer` in the question
 * data) in a scannable bulleted list right after the question heading.
 *
 * The outer `<section>` carries `id="question-key-takeaways"` so the
 * speakable CSS selector can reference it and voice/AI systems can extract
 * just the takeaways without parsing surrounding content.
 *
 * Content rules:
 *   - Derive from `shortAnswer` (factual, non-advice).
 *   - Never fabricate content; split on ". " to produce natural bullet points.
 *   - AFSL-safe: factual information only — no personal recommendations.
 */

import React from "react";

interface Props {
  /** The short, direct answer text (from `InvestingQuestion.shortAnswer`). */
  shortAnswer: string;
  /**
   * Optional override: provide an explicit list of bullet-point sentences.
   * When absent, `shortAnswer` is auto-split on sentence boundaries into
   * up to 4 bullets.
   */
  bullets?: string[];
}

function deriveBullets(shortAnswer: string): string[] {
  // Split on ". " boundaries, keep full stops, trim whitespace, drop empties.
  const raw = shortAnswer
    .split(/(?<=\.)\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  // Cap at 4 bullets to keep the block tight.
  return raw.slice(0, 4);
}

export function QuestionKeyTakeaways({ shortAnswer, bullets }: Props) {
  const items = bullets && bullets.length > 0 ? bullets : deriveBullets(shortAnswer);

  if (items.length === 0) return null;

  return (
    <section
      id="question-key-takeaways"
      aria-label="Key takeaways"
      className="mb-8 rounded-lg border border-emerald-200 bg-emerald-50 px-5 py-4"
    >
      <p className="mb-2 text-sm font-semibold text-emerald-800">Key takeaways</p>
      <ul className="space-y-1.5 pl-0">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-gray-800 text-sm leading-relaxed">
            {/* Decorative bullet tick */}
            <svg
              className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
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
