"use client";

interface Props {
  dealExpiry: string | null | undefined;
  /** compact (default): "3d left" — standard: "Ends in 3 days" / "3 days left" */
  variant?: "compact" | "standard";
}

/**
 * Renders a coloured urgency pill for deal countdowns.
 * Red ≤ 7 days, amber ≤ 30 days, emerald otherwise.
 * Renders nothing when expiry is absent or already passed.
 */
export default function DealExpiryCountdown({ dealExpiry, variant = "compact" }: Props) {
  if (!dealExpiry) return null;

  // eslint-disable-next-line react-hooks/purity
  const ms = new Date(dealExpiry).getTime() - Date.now();
  const daysLeft = Math.ceil(ms / 86_400_000);

  if (daysLeft <= 0) return null;

  const colorCls =
    daysLeft <= 7
      ? "bg-red-100 text-red-600"
      : daysLeft <= 30
      ? "bg-amber-100 text-amber-600"
      : "bg-emerald-100 text-emerald-700";

  let label: string;
  if (variant === "standard") {
    if (daysLeft <= 7) {
      label = `Ends in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`;
    } else {
      label = `${daysLeft} days left`;
    }
  } else {
    label = `${daysLeft}d left`;
  }

  return (
    <span className={`text-[0.55rem] shrink-0 font-bold px-1.5 py-0.5 rounded-full ${colorCls}`}>
      {label}
    </span>
  );
}
