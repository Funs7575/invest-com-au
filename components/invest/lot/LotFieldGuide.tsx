import Link from "next/link";
import Icon from "@/components/Icon";
import type { VerticalIntel } from "@/lib/listings/vertical-intel";

/**
 * "New to {category}?" collapsible field guide — the due-diligence
 * checklist for first-time buyers in this asset class, rendered as a
 * native `<details>` so it costs no client JS. Content comes from the
 * vertical-intel registry: factual "what buyers check" items, never
 * advice.
 */
export default function LotFieldGuide({
  intel,
  categorySlug,
  categoryLabel,
}: {
  intel: VerticalIntel;
  categorySlug: string;
  categoryLabel: string;
}) {
  if (intel.dueDiligence.length === 0) return null;

  return (
    <details className="group bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-xl open:shadow-sm">
      <summary className="flex items-center gap-3 cursor-pointer select-none list-none p-5 [&::-webkit-details-marker]:hidden">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
          <Icon name="book-open" size={18} />
        </span>
        <span className="flex-1">
          <span className="block text-sm font-bold text-slate-900">
            New to {categoryLabel.toLowerCase()}? What buyers check
          </span>
          <span className="block text-xs text-slate-500">
            A first-timer&apos;s checklist for this asset class
          </span>
        </span>
        <Icon
          name="chevron-down"
          size={18}
          className="text-slate-400 transition-transform group-open:rotate-180"
        />
      </summary>
      <div className="px-5 pb-5 pt-1">
        <ul className="space-y-2.5">
          {intel.dueDiligence.map((item) => (
            <li key={item} className="flex gap-2.5 text-sm text-slate-700">
              <Icon
                name="check-circle"
                size={16}
                className="text-emerald-600 shrink-0 mt-0.5"
              />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        {intel.riskNote && (
          <p className="mt-4 flex gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
            <Icon name="alert-triangle" size={14} className="shrink-0 mt-0.5 text-amber-600" />
            <span>{intel.riskNote}</span>
          </p>
        )}
        <Link
          href={`/invest/${categorySlug}`}
          className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-amber-700 hover:text-amber-900"
        >
          Read the {categoryLabel.toLowerCase()} guide
          <Icon name="arrow-right" size={12} />
        </Link>
      </div>
    </details>
  );
}
