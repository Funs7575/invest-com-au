"use client";

interface Props {
  source: string;
  onDismiss: () => void;
}

const CALC_LABELS: Record<string, string> = {
  savings_calculator: "Savings Calculator",
  mortgage_calculator: "Mortgage Calculator",
  tco: "TCO Calculator",
  borrowing_power_calculator: "Borrowing Power Calculator",
  fire_calculator: "FIRE Calculator",
};

function labelFor(source: string): string {
  return CALC_LABELS[source] ?? source.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function CalcPrefillBanner({ source, onDismiss }: Props) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="mb-4 flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800"
    >
      <span className="shrink-0" aria-hidden="true">↩</span>
      <span>
        Some fields prefilled from your <strong>{labelFor(source)}</strong> session.
      </span>
      <button
        onClick={onDismiss}
        className="ml-auto text-xs text-blue-600 hover:text-blue-900 underline underline-offset-2"
        aria-label="Dismiss prefill notification"
      >
        Dismiss
      </button>
    </div>
  );
}
