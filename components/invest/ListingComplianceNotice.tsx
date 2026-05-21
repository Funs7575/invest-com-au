import { RISK_WARNING_CTA } from "@/lib/compliance";

/**
 * Wholesale-investor (s708) gate + general-advice notice for investment-listing
 * verticals whose assets are (or may be) regulated financial products.
 *
 * Mirrors the s708 notice shown on the private-equity/hedge-fund listings page,
 * extracted so the carbon, aquaculture and livestock pages share one source of
 * truth rather than copying the block. Resolves new-features audit §5 flag #1.
 */
export default function ListingComplianceNotice({
  /** What the listed assets are, e.g. "Australian Carbon Credit Units (ACCUs)". */
  productLabel,
  /** Classification sentence specific to the vertical. */
  classification,
}: {
  productLabel: string;
  classification: string;
}) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg mx-4 mt-6 p-4 text-sm text-amber-900">
      <p className="font-semibold mb-1">
        ⚠️ Wholesale Investor Access (s708 Corporations Act)
      </p>
      <p className="mb-2">
        {classification} {productLabel} are generally available to{" "}
        <strong>wholesale (sophisticated) investors</strong> only under s708 of
        the Corporations Act 2001. To qualify you must meet one of:
      </p>
      <ul className="list-disc pl-5 space-y-1">
        <li>
          Net assets of at least <strong>$2.5 million</strong>; or
        </li>
        <li>
          Gross income of at least <strong>$250,000</strong> per year for each
          of the last 2 financial years; or
        </li>
        <li>
          A certificate from a <strong>qualified accountant</strong> confirming
          wholesale investor status (valid ≤ 2 years).
        </li>
      </ul>
      <p className="mt-2 text-xs text-amber-700">{RISK_WARNING_CTA}</p>
    </div>
  );
}
