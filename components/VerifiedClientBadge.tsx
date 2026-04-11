"use client";

interface VerifiedClientBadgeProps {
  isVerified: boolean;
  verifiedVia?: string;
}

const TOOLTIP_TEXT =
  "This reviewer used an enquiry or signed up via Invest.com.au";

export default function VerifiedClientBadge({
  isVerified,
  verifiedVia,
}: VerifiedClientBadgeProps) {
  if (!isVerified) return null;

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200 cursor-default"
      title={TOOLTIP_TEXT}
      aria-label={`Verified Client${verifiedVia ? ` (${verifiedVia.replace(/_/g, " ")})` : ""}`}
    >
      <svg
        viewBox="0 0 20 20"
        fill="currentColor"
        className="w-3.5 h-3.5 shrink-0"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M16.403 12.652a3 3 0 010-5.304 3 3 0 00-1.39-1.39 3 3 0 01-5.305 0 3 3 0 00-1.39 1.39 3 3 0 010 5.304 3 3 0 001.39 1.39 3 3 0 015.305 0 3 3 0 001.39-1.39zM13.768 7.632a.75.75 0 10-1.036-1.084l-3.5 3.346-1.464-1.399a.75.75 0 00-1.036 1.084l1.982 1.895a.75.75 0 001.036 0l4.018-3.842z"
          clipRule="evenodd"
        />
      </svg>
      Verified Client
    </span>
  );
}
