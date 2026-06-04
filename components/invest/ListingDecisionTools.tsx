import type { DecisionToolListing } from "@/lib/invest-decision-tools";
import { deriveListingKind } from "@/lib/listing-kind";
import AfterTaxReturnPanel from "@/components/invest/AfterTaxReturnPanel";
import FirbFeeEstimate from "@/components/invest/FirbFeeEstimate";

/**
 * Bundle of decision tools for a single listing's detail page (Wave 5).
 * Server component — renders the FIRB estimate (server) and the
 * after-tax return panel (client island). Drop it into any listing
 * detail sidebar; it self-selects which tools are relevant for the
 * listing's kind:
 *
 *   - After-tax return panel: every kind except pure listed_security
 *     (where the broker-side after-tax story lives on /compare). Listed
 *     securities still get it because franking matters there.
 *   - FIRB fee estimate: only foreign-investor-relevant kinds (handled
 *     inside FirbFeeEstimate, which returns null when out of scope).
 */
export default function ListingDecisionTools({ listing }: { listing: DecisionToolListing }) {
  const kind = deriveListingKind(listing);

  // Equity raises and physical collectibles are pure-growth / illiquid
  // enough that an annualised after-tax-return panel is misleading — skip
  // it for those, keep the FIRB estimate where relevant.
  const showAfterTax = kind !== "equity_raise";

  return (
    <div className="space-y-5">
      {showAfterTax && <AfterTaxReturnPanel listing={listing} />}
      <FirbFeeEstimate listing={listing} />
    </div>
  );
}
