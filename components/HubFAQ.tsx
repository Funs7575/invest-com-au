/**
 * <HubFAQ> — reusable FAQ accordion + JSON-LD emitter for hub pages.
 *
 * Combines two concerns that always move together on hub pages:
 *   1. FAQPage Schema.org JSON-LD (emitted inline as a <script> tag so
 *      Google sees it adjacent to the FAQ content — consistent with the
 *      pattern in VerticalPillarPage, foreign-investment/page.tsx, and
 *      global-investing/page.tsx).
 *   2. Native <details>/<summary> accordion — no JS required; CSS-only
 *      open/close state via the `group-open:` variant.
 *
 * Accepts the same `FaqItem` shape ({q, a}) used throughout the codebase
 * (lib/schema-markup.ts). Returns null when the items array is empty so
 * callers need no conditional wrapper.
 *
 * Server component; no client JS required.
 *
 * W-07 — hub foundation stream (REMEDIATION_QUEUE.md).
 */
import { faqJsonLd } from "@/lib/schema-markup";
import type { FaqItem } from "@/lib/schema-markup";
import SectionHeading from "@/components/SectionHeading";

export type { FaqItem };

interface HubFAQProps {
  /** Array of question/answer pairs. Returns null when empty. */
  items: FaqItem[];
  /**
   * Section heading displayed above the accordion, e.g.
   * "Frequently asked questions about SMSFs".
   */
  heading: string;
  /** Optional eyebrow label above the heading. Defaults to "FAQ". */
  eyebrow?: string;
  /** Optional className applied to the root <section>. */
  className?: string;
}

export default function HubFAQ({
  items,
  heading,
  eyebrow = "FAQ",
  className,
}: HubFAQProps) {
  if (items.length === 0) return null;

  const ld = faqJsonLd(items);

  return (
    <>
      {ld && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
        />
      )}
      <section
        className={className ?? "py-12 bg-slate-50 border-t border-slate-200"}
        data-testid="hub-faq"
      >
        <div className="container-custom max-w-3xl">
          <SectionHeading eyebrow={eyebrow} title={heading} />
          <div
            className="space-y-3"
            data-testid="hub-faq-list"
          >
            {items.map((item) => (
              <details
                key={item.q}
                className="group bg-white border border-slate-200 rounded-xl"
                data-testid="hub-faq-item"
              >
                <summary
                  className="px-5 py-4 text-sm font-bold text-slate-900 cursor-pointer list-none flex items-center justify-between hover:bg-slate-50 rounded-xl transition-colors"
                  data-testid="hub-faq-question"
                >
                  {item.q}
                  <span
                    className="text-slate-400 group-open:rotate-180 transition-transform text-base ml-3 shrink-0"
                    aria-hidden="true"
                  >
                    ⌄
                  </span>
                </summary>
                <div
                  className="px-5 pb-4 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3"
                  data-testid="hub-faq-answer"
                >
                  {item.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
