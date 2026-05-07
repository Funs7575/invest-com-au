import type { IntentCountryCode } from "@/lib/intent-context";

/**
 * AUD-primary currency display with an optional secondary in the
 * user's intent currency. Shows e.g. "A$500,000 ≈ ¥2.4M CNY" when
 * `intentCountry="cn"` is passed in, falls back to plain AUD otherwise.
 *
 * Usage:
 *   <Money amount={500_000} />                     // "A$500,000"
 *   <Money amount={500_000} intentCountry="cn" />  // "A$500,000 ≈ ¥2.4M"
 *
 * Server-friendly. For pages that already resolve the intent country
 * from cookies, pass it through as a prop:
 *   const intent = await getIntentCountry();
 *   <Money amount={…} intentCountry={intent} />
 *
 * **Caveat**: the FX table is hardcoded and approximate — daily moves
 * make any baked-in rate stale within hours. The secondary value is
 * advisory; the disclaimer copy tells users not to plan settlements
 * around it. For real quotes, the FX corridor section routes to
 * /foreign-investment/send-money-australia.
 */

const APPROX_FX_PER_AUD: Partial<Record<IntentCountryCode, { code: string; symbol: string; rate: number; locale: string }>> = {
  uk: { code: "GBP", symbol: "£", rate: 0.5, locale: "en-GB" },
  us: { code: "USD", symbol: "US$", rate: 0.65, locale: "en-US" },
  cn: { code: "CNY", symbol: "¥", rate: 4.7, locale: "zh-CN" },
  in: { code: "INR", symbol: "₹", rate: 55, locale: "en-IN" },
  hk: { code: "HKD", symbol: "HK$", rate: 5.0, locale: "en-HK" },
  sg: { code: "SGD", symbol: "S$", rate: 0.85, locale: "en-SG" },
  nz: { code: "NZD", symbol: "NZ$", rate: 1.1, locale: "en-NZ" },
  jp: { code: "JPY", symbol: "¥", rate: 95, locale: "ja-JP" },
  kr: { code: "KRW", symbol: "₩", rate: 870, locale: "ko-KR" },
  my: { code: "MYR", symbol: "RM", rate: 3.0, locale: "en-MY" },
  ae: { code: "AED", symbol: "AED", rate: 2.4, locale: "en-AE" },
  sa: { code: "SAR", symbol: "SAR", rate: 2.4, locale: "en-SA" },
};

interface Props {
  /** AUD amount. */
  amount: number;
  /** Reader's intent country — when present and non-AUD, shows secondary value. */
  intentCountry?: IntentCountryCode | null;
  /** Compact display ("$1.5M" vs "$1,500,000"). Defaults to compact for amounts ≥ 1M. */
  compact?: boolean;
  /** Optional class on the wrapper. */
  className?: string;
}

export default function Money({ amount, intentCountry, compact, className }: Props) {
  const useCompact = compact ?? amount >= 1_000_000;
  const audLabel = formatAUD(amount, useCompact);

  const secondary = intentCountry ? APPROX_FX_PER_AUD[intentCountry] : null;
  if (!secondary) {
    return <span className={className}>{audLabel}</span>;
  }

  const converted = amount * secondary.rate;
  const altLabel = formatLocale(converted, secondary, useCompact);

  return (
    <span className={className}>
      {audLabel}
      <span
        className="ml-1.5 text-slate-500 text-[0.85em] font-normal"
        title={`Approximate ${secondary.code} equivalent — for indication only, not a settlement rate.`}
      >
        ≈ {altLabel}
      </span>
    </span>
  );
}

function formatAUD(amount: number, compact: boolean): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: compact ? 1 : 0,
  }).format(amount);
}

function formatLocale(
  amount: number,
  cur: { code: string; symbol: string; locale: string },
  compact: boolean,
): string {
  // Some browsers / Node Intl data don't render every minor symbol the
  // way we want (e.g. "CN¥" vs "¥"). Fall back to manual symbol +
  // number-only formatting if the rendered string doesn't start with
  // the desired symbol.
  const numberOnly = new Intl.NumberFormat(cur.locale, {
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: compact ? 1 : 0,
  }).format(amount);
  return `${cur.symbol}${numberOnly}`;
}
