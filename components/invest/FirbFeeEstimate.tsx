import { firbFeeForListing } from "@/lib/invest-decision-tools";
import type { DecisionToolListing } from "@/lib/invest-decision-tools";
import Icon from "@/components/Icon";
import Link from "next/link";

/**
 * FIRB application-fee estimate for a foreign buyer evaluating a listing.
 * Server-rendered (no interactivity) — reads the fee from the unit-tested
 * lib helper. Renders nothing for out-of-scope kinds (listed securities,
 * fund units) so it doesn't add noise to listings where FIRB doesn't bite.
 */
export default function FirbFeeEstimate({ listing }: { listing: DecisionToolListing }) {
  const est = firbFeeForListing(listing);
  if (!est.applicable) return null;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
      <div className="flex items-start gap-2">
        <span className="shrink-0 mt-0.5 text-blue-600"><Icon name="globe" size={15} /></span>
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-blue-900">Foreign buyer? Estimated FIRB fee</h3>
          <p className="text-xl font-extrabold text-blue-700 mt-0.5">
            ${est.feeAud.toLocaleString("en-AU")}
          </p>
          <p className="text-[0.65rem] text-blue-700/80 mt-0.5 leading-snug">
            FIRB application fee on a ${est.valueAud.toLocaleString("en-AU")} acquisition (non-refundable, indexed annually).
            State stamp-duty surcharges may also apply.{" "}
            <Link href="/property/foreign-investment" className="font-semibold underline underline-offset-2 hover:text-blue-900">
              FIRB guide
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
