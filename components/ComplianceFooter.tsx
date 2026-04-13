import {
  GENERAL_ADVICE_WARNING,
  ADVERTISER_DISCLOSURE_SHORT,
  CFD_WARNING,
  CRYPTO_WARNING,
} from "@/lib/compliance";

type Variant = "default" | "cfd" | "crypto" | "calculator";

interface Props {
  /**
   * Which compliance variant to render. Selects the headline warning
   * shown above the fold:
   *   - default: general advice warning + advertiser disclosure (most pages)
   *   - cfd: CFD-specific risk warning + general advice (CFD/forex pages)
   *   - crypto: crypto risk warning + general advice (crypto pages)
   *   - calculator: calculator-specific phrasing + general advice
   */
  variant?: Variant;
  /**
   * Compact rendering for header bars / above-fold strips. Default is
   * the longer footer-style block.
   */
  compact?: boolean;
  /** Optional extra className for layout fitting */
  className?: string;
}

/**
 * Shared compliance + advertiser disclosure block.
 *
 * Single source of truth for visible compliance text on every monetised
 * or financial-content page. Use this on:
 *   - All /compare/* pages
 *   - All /calculators/*
 *   - All /broker/[slug] and /advisor/[slug] reviews
 *   - All /quiz/, /scenario/, /best/, /versus/ pages
 *   - All /invest/* listing pages
 *   - The home page
 *   - All /article/[slug] pages with product recommendations
 *
 * For CFD and crypto pages, pass variant="cfd" or "crypto" to surface
 * the additional ASIC-required risk warning.
 *
 * The text comes from /lib/compliance.ts — never hardcode wording here.
 */
export default function ComplianceFooter({
  variant = "default",
  compact = false,
  className = "",
}: Props) {
  const extraWarning =
    variant === "cfd"
      ? CFD_WARNING
      : variant === "crypto"
        ? CRYPTO_WARNING
        : variant === "calculator"
          ? "Calculations are indicative estimates only based on the figures you provide. Actual returns, fees and tax outcomes may differ. We do not guarantee accuracy."
          : null;

  if (compact) {
    return (
      <div
        className={`bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[0.65rem] text-slate-500 leading-relaxed ${className}`}
        role="note"
        aria-label="General advice warning"
      >
        <strong className="text-slate-600">General Advice Warning:</strong>{" "}
        {GENERAL_ADVICE_WARNING}
      </div>
    );
  }

  return (
    <div
      className={`mt-8 pt-6 border-t border-slate-100 space-y-3 ${className}`}
      role="contentinfo"
      aria-label="Compliance disclosures"
    >
      {extraWarning && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 leading-relaxed">
          <strong className="font-bold">
            {variant === "cfd"
              ? "CFD Risk Warning:"
              : variant === "crypto"
                ? "Cryptocurrency Risk Warning:"
                : "Calculator Disclaimer:"}
          </strong>{" "}
          {extraWarning}
        </div>
      )}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-[0.7rem] text-slate-500 leading-relaxed">
        <p className="mb-1.5">
          <strong className="text-slate-600">General Advice Warning:</strong>{" "}
          {GENERAL_ADVICE_WARNING}
        </p>
        <p className="text-slate-400">{ADVERTISER_DISCLOSURE_SHORT}</p>
      </div>
    </div>
  );
}
