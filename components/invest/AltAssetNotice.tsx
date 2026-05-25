/**
 * Unregulated collectibles notice for the alternatives vertical.
 *
 * Alt-assets (whisky, wine, watches, art) are tangible collectibles —
 * not regulated financial products under the Corporations Act 2001.
 * This component surfaces that fact prominently alongside the GENERAL_ADVICE_WARNING.
 *
 * Import and render near the top of every per-asset-class page.
 */

import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

export default function AltAssetNotice({
  assetLabel,
}: {
  /** Human-readable asset label, e.g. "investment-grade whisky" */
  assetLabel: string;
}) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm leading-relaxed space-y-2">
      <p className="font-bold text-amber-900">
        Not a regulated financial product
      </p>
      <p className="text-amber-800">
        {assetLabel} is a tangible collectible, not a financial product under
        the{" "}
        <em>Corporations Act 2001</em>. It is not regulated by ASIC and does
        not carry investor protections that apply to licensed financial
        products (e.g. no Compensation Scheme of Last Resort, no Product
        Disclosure Statement requirements, no regulated advice obligations).
      </p>
      <p className="text-amber-800 text-xs">
        <strong>General Advice Warning:</strong> {GENERAL_ADVICE_WARNING}
      </p>
    </div>
  );
}
