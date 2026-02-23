"use client";

export function FeesFreshnessIndicator({
  lastChecked,
  variant = "badge",
}: {
  lastChecked: string | null;
  variant?: "badge" | "inline";
}) {
  if (!lastChecked) return null;

  const now = Date.now();
  const checked = new Date(lastChecked).getTime();
  const diffMs = now - checked;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  let label: string;
  if (diffMins < 60) label = `${diffMins}m ago`;
  else if (diffHours < 48) label = `${diffHours}h ago`;
  else label = `${diffDays}d ago`;

  // green < 12h, amber < 48h, red >= 48h
  let dotColor: string;
  let textColor: string;
  let bgColor: string;
  if (diffHours < 12) {
    dotColor = "bg-green-500";
    textColor = "text-slate-700";
    bgColor = "bg-slate-50 border-slate-200";
  } else if (diffHours < 48) {
    dotColor = "bg-amber-500";
    textColor = "text-amber-700";
    bgColor = "bg-amber-50 border-amber-200";
  } else {
    dotColor = "bg-red-500";
    textColor = "text-red-700";
    bgColor = "bg-red-50 border-red-200";
  }

  if (variant === "inline") {
    return (
      <span className={`inline-flex items-center gap-1.5 ${textColor}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${dotColor} animate-pulse`} />
        <span className="text-xs">Fees checked {label}</span>
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${bgColor} ${textColor}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor} animate-pulse`} />
      Fees checked {label}
    </span>
  );
}
