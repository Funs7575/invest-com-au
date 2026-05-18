import Link from "next/link";

export interface RelatedCalc {
  name: string;
  description: string;
  href: string;
  /** Short label shown in the chip, e.g. "Free tool" */
  tag?: string;
}

interface Props {
  items: RelatedCalc[];
  heading?: string;
}

/**
 * Cross-calculator navigation strip. Shown at the bottom of each calculator
 * page to surface 2–3 contextually related tools (LX-03).
 */
export default function RelatedCalculators({
  items,
  heading = "Also useful",
}: Props) {
  if (items.length === 0) return null;
  return (
    <section className="mt-10 mb-2" aria-label="Related calculators">
      <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
        {heading}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((calc) => (
          <Link
            key={calc.href}
            href={calc.href}
            className="group flex flex-col gap-1 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300 hover:shadow-sm p-4 transition-all"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-slate-800 group-hover:text-indigo-700 leading-snug">
                {calc.name}
              </span>
              {calc.tag && (
                <span className="shrink-0 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-full px-2 py-0.5">
                  {calc.tag}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">{calc.description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
