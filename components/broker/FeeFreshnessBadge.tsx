import { classifyFreshness, type FreshnessTier } from "@/lib/price-snapshots";

interface Props {
  capturedAt?: string | null;
  className?: string;
  /** Optional override — mainly for tests. */
  now?: Date;
}

const BADGE_STYLE: Record<FreshnessTier, { label: string; className: string; hint: string }> = {
  fresh: {
    label: "Fees verified",
    className: "bg-emerald-100 text-emerald-800 border-emerald-300",
    hint: "Captured within the last 6 hours",
  },
  recent: {
    label: "Fees recent",
    className: "bg-amber-100 text-amber-800 border-amber-300",
    hint: "Captured within the last 36 hours",
  },
  stale: {
    label: "Fees stale",
    className: "bg-rose-100 text-rose-800 border-rose-300",
    hint: "Captured more than 36 hours ago",
  },
  unknown: {
    label: "Fees unverified",
    className: "bg-slate-100 text-slate-600 border-slate-300",
    hint: "No snapshot on record",
  },
};

/**
 * Small badge indicating how fresh a broker's fee data is. Drives
 * trust signals on broker cards and hub pages — a reader can see
 * at a glance whether the numbers they're looking at are hours
 * old or weeks old.
 *
 * The tier logic lives in `classifyFreshness()` so the badge and
 * any other consumer stay in lock-step.
 */
export default function FeeFreshnessBadge({
  capturedAt,
  className,
  now,
}: Props) {
  const tier = classifyFreshness(capturedAt, now);
  const style = BADGE_STYLE[tier];
  const timeLabel = capturedAt
    ? new Date(capturedAt).toLocaleString("en-AU", {
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${style.className} ${className || ""}`}
      title={timeLabel ? `${style.hint} · ${timeLabel}` : style.hint}
    >
      <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {style.label}
    </span>
  );
}
