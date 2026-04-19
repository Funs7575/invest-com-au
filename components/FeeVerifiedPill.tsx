import { computeFeeFreshness } from "@/lib/fee-freshness";

interface Props {
  verifiedDate?: string | null;
  variant?: "pill" | "inline" | "compact";
  /** Swap "Fees verified" copy for a short version on tight layouts. */
  shortLabel?: boolean;
}

/**
 * Reader-facing pill surfacing the broker's last fee-verification date.
 * Uses the human-verified date (`fee_verified_date`), not the bot check,
 * so the tier shown to readers reflects editorial trust not scrape
 * recency.
 *
 * - `pill`    : bordered rounded-full badge — default for header/hero
 * - `inline`  : dot + text only — for tight card rows
 * - `compact` : very small dot + age — for table cells
 */
export default function FeeVerifiedPill({
  verifiedDate,
  variant = "pill",
  shortLabel = false,
}: Props) {
  const fresh = computeFeeFreshness(verifiedDate ?? null);

  const label =
    shortLabel && fresh.ageDays != null
      ? fresh.ageDays <= 1
        ? "Verified today"
        : fresh.ageDays < 30
          ? `Verified ${fresh.ageDays}d ago`
          : `Verified ${Math.round(fresh.ageDays / 30)}mo ago`
      : fresh.label;

  if (variant === "compact") {
    return (
      <span
        className={`inline-flex items-center gap-1 ${fresh.classes.text}`}
        title={fresh.label}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${fresh.classes.dot}`}
        />
        <span className="text-[10px] font-semibold">
          {fresh.ageDays == null
            ? "Unverified"
            : `${fresh.ageDays}d`}
        </span>
      </span>
    );
  }

  if (variant === "inline") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${fresh.classes.text}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${fresh.classes.dot}`} />
        {label}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[11px] font-semibold rounded-full border px-2.5 py-1 ${fresh.classes.text} ${fresh.classes.bg} ${fresh.classes.border}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${fresh.classes.dot}`} />
      {label}
    </span>
  );
}
