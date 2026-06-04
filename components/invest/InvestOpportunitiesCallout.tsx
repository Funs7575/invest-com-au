import Link from "next/link";
import Icon from "@/components/Icon";

/**
 * Reusable cross-product callout that links a calculator / hub / guide
 * INTO a filtered /invest marketplace view (Wave 6 cross-product wiring).
 *
 * The gap audit found /invest was orphaned from ~70% of upstream
 * discovery flows — calculators, hubs and the concierge never surfaced a
 * single listing. This callout is the connective tissue: drop it at the
 * bottom of a tool or hub with a context-appropriate deep-link.
 *
 * Server component — pure presentation, no client state.
 */
export default function InvestOpportunitiesCallout({
  heading,
  blurb,
  href,
  ctaLabel = "Browse opportunities",
  icon = "trending-up",
  secondary,
  tone = "emerald",
}: {
  heading: string;
  blurb: string;
  href: string;
  ctaLabel?: string;
  icon?: string;
  secondary?: { label: string; href: string };
  tone?: "emerald" | "amber" | "blue";
}) {
  const tones = {
    emerald: { card: "from-emerald-50 to-white border-emerald-200", chip: "bg-emerald-100 text-emerald-700", cta: "bg-emerald-600 hover:bg-emerald-700" },
    amber: { card: "from-amber-50 to-white border-amber-200", chip: "bg-amber-100 text-amber-700", cta: "bg-amber-600 hover:bg-amber-700" },
    blue: { card: "from-blue-50 to-white border-blue-200", chip: "bg-blue-100 text-blue-700", cta: "bg-blue-600 hover:bg-blue-700" },
  }[tone];

  return (
    <aside className={`bg-gradient-to-br ${tones.card} border rounded-2xl p-5 md:p-6`}>
      <div className="flex items-start gap-3">
        <span className={`shrink-0 rounded-lg p-2 ${tones.chip}`}>
          <Icon name={icon} size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-base md:text-lg font-bold text-slate-900">{heading}</h3>
          <p className="text-sm text-slate-600 mt-1 leading-relaxed">{blurb}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Link
              href={href}
              className={`inline-flex items-center gap-1.5 rounded-lg ${tones.cta} text-white font-bold text-sm px-4 py-2 transition-colors`}
            >
              {ctaLabel}
              <Icon name="arrow-right" size={14} />
            </Link>
            {secondary && (
              <Link
                href={secondary.href}
                className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-slate-900 px-2 py-2"
              >
                {secondary.label}
                <Icon name="arrow-right" size={13} />
              </Link>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
