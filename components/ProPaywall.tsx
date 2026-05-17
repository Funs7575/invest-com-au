import Link from "next/link";
import Icon from "@/components/Icon";

interface Props {
  title?: string;
  description?: string;
  ctaLabel?: string;
  ctaHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  variant?: "card" | "overlay" | "inline";
  bullets?: readonly string[];
}

export default function ProPaywall({
  title = "Unlock with Invest Pro",
  description = "This is premium content. Subscribe to Pro for full access plus fee alerts, market briefs, and platform health scores.",
  ctaLabel = "Upgrade to Pro",
  ctaHref = "/pro",
  secondaryLabel,
  secondaryHref,
  variant = "card",
  bullets,
}: Props) {
  const isOverlay = variant === "overlay";
  const isInline = variant === "inline";

  return (
    <div
      data-pro-paywall
      className={
        isOverlay
          ? "bg-white/95 border border-slate-200 rounded-xl p-6 text-center shadow-lg max-w-md mx-auto"
          : isInline
            ? "border border-amber-200 bg-amber-50 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center gap-4"
            : "border border-slate-200 bg-gradient-to-br from-white to-slate-50 rounded-xl p-6 md:p-8 text-center"
      }
    >
      {!isInline && (
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-bold mb-3">
          <Icon name="lock" size={12} />
          Pro Members Only
        </div>
      )}
      <div className={isInline ? "flex-1" : ""}>
        <h3 className="text-base md:text-lg font-extrabold text-slate-900 mb-1">
          {title}
        </h3>
        <p className="text-xs md:text-sm text-slate-600 leading-relaxed mb-4 max-w-md mx-auto">
          {description}
        </p>
        {bullets && bullets.length > 0 && (
          <ul className="text-xs md:text-sm text-slate-700 space-y-1.5 mb-4 max-w-md mx-auto text-left">
            {bullets.map((b) => (
              <li key={b} className="flex items-start gap-2">
                <Icon name="check" size={14} className="text-emerald-600 mt-0.5 shrink-0" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className={isInline ? "flex flex-col sm:flex-row gap-2 shrink-0" : "flex flex-col sm:flex-row gap-2 justify-center"}>
        <Link
          href={ctaHref}
          className="inline-flex items-center justify-center px-5 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-slate-800 transition-colors"
        >
          {ctaLabel}
        </Link>
        {secondaryLabel && secondaryHref && (
          <Link
            href={secondaryHref}
            className="inline-flex items-center justify-center px-5 py-2.5 border border-slate-300 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors"
          >
            {secondaryLabel}
          </Link>
        )}
      </div>
    </div>
  );
}
