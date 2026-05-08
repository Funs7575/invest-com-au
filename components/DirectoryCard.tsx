/**
 * <DirectoryCard> — reusable professional-directory card.
 *
 * Renders a single `DirectoryItem` as an article card. Pure component —
 * no client state, no hooks. Accepts a pre-shaped item so the caller
 * controls what data is displayed without this component knowing about
 * any specific professional type or DB schema.
 *
 * W-08 — hub foundation stream (REMEDIATION_QUEUE.md).
 */
import Link from "next/link";
import Icon from "@/components/Icon";

/** Minimal shape required by <DirectoryCard>. */
export interface DirectoryItem {
  /** Stable DB primary key (used as React key by the grid). */
  id: number;
  /** Profile slug — used to build the CTA href if `ctaHref` not given. */
  slug: string;
  /** Primary display name (person or business). */
  name: string;
  /** Secondary line: firm name, credential, or tagline. */
  subtitle?: string | null;
  /** State abbreviation for state-equality filtering (e.g. "NSW"). */
  locationState?: string | null;
  /** Human-readable location (e.g. "Sydney, NSW"). */
  locationDisplay?: string | null;
  /** Bio / description — caller should keep this short (line-clamp applied). */
  bio?: string | null;
  /** Shows a "Verified" emerald badge when true. */
  isVerified?: boolean | null;
  /**
   * Short registration badge text, e.g. "SAN: 12345678" or "AFSL 123".
   * Renders beneath the location with a shield icon.
   */
  registrationBadge?: string | null;
  /**
   * Flat fee in cents used for fee-band filtering inside <DirectoryGrid>.
   * Not displayed directly — use `feeLabels` for display.
   */
  feeCents?: number | null;
  /** Pre-formatted fee strings rendered as badges, e.g. ["Flat: $800"]. */
  feeLabels?: string[];
  /** Full URL for the CTA button. */
  ctaHref: string;
  /** CTA button label. Defaults to "View Profile". */
  ctaLabel?: string;
  /** When true, renders a "Sponsored" amber badge on the card. */
  isSponsored?: boolean;
}

interface DirectoryCardProps {
  item: DirectoryItem;
}

export default function DirectoryCard({ item }: DirectoryCardProps) {
  return (
    <article
      className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow"
      data-testid="directory-card"
      data-sponsored={item.isSponsored ?? undefined}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <h3 className="text-base font-extrabold text-slate-900 leading-tight" data-testid="directory-card-name">
            {item.name}
          </h3>
          {item.subtitle && (
            <p className="text-xs text-slate-500 mt-0.5" data-testid="directory-card-subtitle">
              {item.subtitle}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {item.isSponsored && (
            <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
              Sponsored
            </span>
          )}
          {item.isVerified && (
            <span
              className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800"
              data-testid="directory-card-verified"
            >
              Verified
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600 mb-3">
        {item.locationDisplay && (
          <span className="inline-flex items-center gap-1" data-testid="directory-card-location">
            <Icon name="map-pin" size={11} />
            {item.locationDisplay}
          </span>
        )}
        {item.registrationBadge && (
          <span className="inline-flex items-center gap-1" data-testid="directory-card-registration">
            <Icon name="shield-check" size={11} />
            {item.registrationBadge}
          </span>
        )}
      </div>

      {item.bio && (
        <p className="text-xs text-slate-600 leading-relaxed mb-3 line-clamp-3" data-testid="directory-card-bio">
          {item.bio}
        </p>
      )}

      {item.feeLabels && item.feeLabels.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4" data-testid="directory-card-fees">
          {item.feeLabels.map((label) => (
            <span
              key={label}
              className="text-[11px] font-bold px-2 py-1 rounded-md bg-slate-100 text-slate-700"
            >
              {label}
            </span>
          ))}
        </div>
      )}

      <Link
        href={item.ctaHref}
        className="inline-flex items-center justify-center gap-1.5 w-full bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm px-4 py-2.5 rounded-lg transition-colors"
        data-testid="directory-card-cta"
      >
        {item.ctaLabel ?? "View Profile"}
        <Icon name="arrow-right" size={14} />
      </Link>
    </article>
  );
}
