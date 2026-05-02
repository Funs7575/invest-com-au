import SectionHeading from "@/components/SectionHeading";
import type { FaqEntry } from "@/lib/foreign-investment-country-data";

/**
 * Renders the country-page FAQ accordion. The matching FAQPage
 * JSON-LD is rendered separately by the page (it must be in <head>
 * or near the top of <body> for crawlers — easier to colocate with
 * the breadcrumb JSON-LD than to inject from this component).
 */
export default function CountryFaqSection({
  eyebrow,
  title,
  sub,
  entries,
}: {
  eyebrow: string;
  title: string;
  sub: string;
  entries: ReadonlyArray<FaqEntry>;
}) {
  return (
    <section id="faq" className="scroll-mt-20">
      <SectionHeading eyebrow={eyebrow} title={title} sub={sub} />
      <div className="space-y-3">
        {entries.map((entry) => (
          <details
            key={entry.q}
            className="group border border-slate-200 rounded-xl bg-white"
          >
            <summary className="cursor-pointer px-5 py-4 font-bold text-sm text-slate-900 flex items-center justify-between gap-3 hover:bg-slate-50">
              <span>{entry.q}</span>
              <svg
                className="w-4 h-4 text-slate-400 transition-transform group-open:rotate-180 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </summary>
            <div className="px-5 pb-4 text-sm text-slate-700 leading-relaxed">
              {entry.a}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
