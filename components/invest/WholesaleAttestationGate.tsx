"use client";

import { useId, useState } from "react";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

/**
 * Client-side wholesale (s708) self-attestation interstitial.
 *
 * Gates access to regulated-product detail — raise terms (valuation /
 * instrument) and the "Express Interest" enquiry form — behind an explicit
 * acknowledgement that the visitor is a wholesale / sophisticated investor
 * under s708 of the Corporations Act 2001.
 *
 * Resolves compliance audit C8 (startup equity raises) and C9 (carbon /
 * aquaculture / livestock commodity enquiries): those offers may be regulated
 * financial products / managed investment schemes that can only be marketed to
 * wholesale clients without a PDS.
 *
 * The s708 thresholds shown here mirror the read-only summary block in
 * `ListingComplianceNotice` (the directory-level notice) so the two stay in
 * sync. This component adds the interactive gate the notice cannot.
 *
 * State is in-memory only (no server attestation record) — this is a
 * client-side access gate, not a legal certification. The seller still
 * verifies wholesale status (typically via a qualified-accountant s708
 * certificate) before any capital is committed.
 */
export default function WholesaleAttestationGate({
  /** Rendered once the visitor attests — raise terms and/or the enquiry form. */
  children,
  /** What the gated assets are, e.g. "this equity raise". Used in the heading. */
  productLabel = "this opportunity",
}: {
  children: React.ReactNode;
  productLabel?: string;
}) {
  const [attested, setAttested] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const headingId = useId();
  const checkboxId = useId();

  if (attested) {
    return <>{children}</>;
  }

  return (
    <div
      role="region"
      aria-labelledby={headingId}
      className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-sm text-amber-900"
    >
      <p id={headingId} className="font-bold mb-1 flex items-center gap-1.5">
        <span aria-hidden="true">⚠️</span>
        Wholesale Investor Access (s708 Corporations Act)
      </p>
      <p className="mb-2">
        Details of {productLabel} — including raise terms and the ability to
        register interest — are restricted to{" "}
        <strong>wholesale (sophisticated) investors</strong> under s708 of the
        Corporations Act 2001. To qualify you must meet one of:
      </p>
      <ul className="list-disc pl-5 space-y-1 mb-3">
        <li>
          Net assets of at least <strong>$2.5 million</strong>; or
        </li>
        <li>
          Gross income of at least <strong>$250,000</strong> per year for each
          of the last 2 financial years; or
        </li>
        <li>
          A certificate from a <strong>qualified accountant</strong> confirming
          wholesale investor status (valid &le; 2 years).
        </li>
      </ul>

      <label
        htmlFor={checkboxId}
        className="flex items-start gap-2.5 bg-white/70 border border-amber-200 rounded-lg p-3 cursor-pointer"
      >
        <input
          id={checkboxId}
          type="checkbox"
          checked={acknowledged}
          onChange={(e) => setAcknowledged(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-amber-400 text-amber-600 focus:ring-2 focus:ring-amber-500"
        />
        <span className="text-amber-900 leading-snug">
          I confirm I am a <strong>wholesale or sophisticated investor</strong>{" "}
          who meets at least one of the s708 thresholds above, and I understand
          this material is not available to retail investors.
        </span>
      </label>

      <button
        type="button"
        disabled={!acknowledged}
        onClick={() => setAttested(true)}
        className="mt-3 w-full sm:w-auto bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300 disabled:cursor-not-allowed text-slate-900 font-bold text-sm px-5 py-2.5 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-1"
      >
        View as wholesale investor
      </button>

      <p className="mt-3 text-xs text-amber-700 leading-relaxed">
        {GENERAL_ADVICE_WARNING}
      </p>
    </div>
  );
}
