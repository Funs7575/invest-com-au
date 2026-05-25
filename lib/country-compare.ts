/**
 * Country-vs-Country comparison engine for the /foreign-investment/compare/[pair] pages.
 *
 * Extracts a structured set of "comparison dimensions" from two CountryConfig
 * objects — DTA/withholding rates, FIRB thresholds, residency signals, FX
 * corridor availability, pension-transfer eligibility, migration pathways, and
 * key critical warnings. Drives the SSG pair pages.
 *
 * AFSL safety: all data is factual (sourced from COUNTRY_CONFIGS which is
 * verified against ATO/Treasury March 2026). No personal recommendations, no
 * ranking of which country is "better". Callers MUST display
 * GENERAL_ADVICE_WARNING + FOREIGN_INVESTOR_GENERAL_DISCLAIMER.
 *
 * Pair slug format: "<slug-a>-vs-<slug-b>" (always alphabetically sorted by
 * country short name to prevent a-vs-b / b-vs-a duplication).
 *
 * Tests: __tests__/lib/country-compare.test.ts
 */

import type { CountryConfig } from "./foreign-investment-country-data";
import { COUNTRY_CONFIGS } from "./foreign-investment-country-data";
import { intentCountryMeta } from "./intent-context";
import type { IntentCountryCode } from "./intent-context";

// ─── Public Types ────────────────────────────────────────────────────────────

export interface CompareRow {
  /** Short dimension label shown in the table header column. */
  dimension: string;
  /** Value for country A. */
  valueA: string;
  /** Value for country B. */
  valueB: string;
  /**
   * Optional note (displayed in a collapse / tooltip) giving additional
   * context for the row. Factual only.
   */
  note?: string;
}

export interface CountryComparison {
  /** Slug used in the URL, e.g. "uk-vs-us". */
  pairSlug: string;
  countryA: {
    code: IntentCountryCode;
    name: string;
    short: string;
    flag: string;
    currency: string;
    slug: string;
    hasDta: boolean;
  };
  countryB: {
    code: IntentCountryCode;
    name: string;
    short: string;
    flag: string;
    currency: string;
    slug: string;
    hasDta: boolean;
  };
  /** Main comparison table rows — DTA, tax, FIRB, FX, pension, migration. */
  rows: ReadonlyArray<CompareRow>;
  /**
   * Critical warnings from either country's config that must be surfaced
   * prominently (e.g. US FATCA, CN capital controls).
   */
  warnings: ReadonlyArray<{ country: string; title: string; body: string }>;
  /** True when at least one country has a `retirementTransfer` section. */
  hasPensionTransfer: boolean;
  /** True when at least one country has an `fxCorridor` section. */
  hasFxCorridor: boolean;
  /** True when both countries have a DTA with Australia. */
  bothHaveDta: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Extract the unfranked dividend WHT rate from the first relevant DTA row. */
function dividendRate(config: CountryConfig, hasDta: boolean): string {
  const row = config.dta.rows.find((r) =>
    r.type.toLowerCase().includes("unfranked"),
  );
  if (!row) return hasDta ? "15%*" : "30%";
  return hasDta ? row.withTreaty : row.noTreaty;
}

/** Extract the interest WHT rate. */
function interestRate(config: CountryConfig, hasDta: boolean): string {
  const row = config.dta.rows.find((r) =>
    r.type.toLowerCase().includes("interest"),
  );
  if (!row) return "10%";
  return hasDta ? row.withTreaty : row.noTreaty;
}

/** Extract the royalties WHT rate. */
function royaltiesRate(config: CountryConfig, hasDta: boolean): string {
  const row = config.dta.rows.find((r) =>
    r.type.toLowerCase().includes("royalt"),
  );
  if (!row) return hasDta ? "5%–10%*" : "30%";
  return hasDta ? row.withTreaty : row.noTreaty;
}

/** Whether FIRB is required (heuristic: NZ doesn't need it). */
function firbRequired(config: CountryConfig): string {
  const warn = config.criticalWarning?.title ?? "";
  if (warn.toLowerCase().includes("no firb")) return "No (Trans-Tasman exemption)";
  return "Yes — FIRB approval required";
}

/** Established dwelling ban status. */
function dwellingBan(config: CountryConfig): string {
  return config.property.banHeadline
    ? "Banned until 31 March 2027"
    : "No ban (NZ Trans-Tasman exemption applies)";
}

/** FX corridor availability label. */
function fxLabel(config: CountryConfig): string {
  if (!config.fxCorridor) return "Not specifically covered";
  return config.fxCorridor.eyebrow || `${config.currencySymbol} → AUD corridor available`;
}

/** Pension transfer availability label. */
function pensionLabel(config: CountryConfig): string {
  if (!config.retirementTransfer) return "No specific AU pension-transfer pathway";
  return config.retirementTransfer.title.slice(0, 80);
}

/** Migration pathways label — count + first pathway. */
function migrationLabel(config: CountryConfig): string {
  if (!config.migration) return "Standard visa pathways — see AHC website";
  const count = config.migration.pathways.length;
  const first = config.migration.pathways[0];
  return first
    ? `${count} pathway${count !== 1 ? "s" : ""} — inc. ${first.name}`
    : `${count} pathway${count !== 1 ? "s" : ""}`;
}

/** Reporting obligations label (FBAR/FATCA, SAFE controls, etc.). */
function reportingLabel(config: CountryConfig): string {
  if (!config.reportingObligations) return "Standard ATO non-resident reporting";
  return config.reportingObligations.title;
}

// ─── Core Builder ─────────────────────────────────────────────────────────────

/**
 * Build a `CountryComparison` from two `CountryConfig` objects.
 *
 * Country order is normalised: A is whichever comes first alphabetically by
 * `countryShort` so a-vs-b and b-vs-a produce identical output.
 */
export function buildCountryComparison(
  cfgX: CountryConfig,
  cfgY: CountryConfig,
): CountryComparison {
  // Canonical order: alphabetical by short name
  const [cfgA, cfgB] =
    cfgX.countryShort.localeCompare(cfgY.countryShort) <= 0
      ? [cfgX, cfgY]
      : [cfgY, cfgX];

  const metaA = intentCountryMeta(cfgA.code);
  const metaB = intentCountryMeta(cfgB.code);
  const dtaA = metaA.hasDta;
  const dtaB = metaB.hasDta;

  const rows: CompareRow[] = [
    {
      dimension: "Double Tax Agreement (DTA) with Australia",
      valueA: dtaA ? `Yes — ${cfgA.dta.title.slice(0, 60)}` : "No DTA",
      valueB: dtaB ? `Yes — ${cfgB.dta.title.slice(0, 60)}` : "No DTA",
      note:
        "A DTA reduces Australian withholding tax on dividends, interest, and royalties. Without a DTA, standard ATO rates apply (30% unfranked dividends, 30% royalties).",
    },
    {
      dimension: "Unfranked dividend withholding tax (AU)",
      valueA: dividendRate(cfgA, dtaA),
      valueB: dividendRate(cfgB, dtaB),
      note:
        "Fully franked dividends carry an attached imputation credit and are generally 0% WHT regardless of DTA. Rate shown is for unfranked dividends.",
    },
    {
      dimension: "Interest withholding tax (AU)",
      valueA: interestRate(cfgA, dtaA),
      valueB: interestRate(cfgB, dtaB),
      note:
        "Standard ATO rate for non-residents on Australian interest income is 10%. Some DTAs keep this at 10%; others may vary.",
    },
    {
      dimension: "Royalties withholding tax (AU)",
      valueA: royaltiesRate(cfgA, dtaA),
      valueB: royaltiesRate(cfgB, dtaB),
      note:
        "Without a DTA, royalties are taxed at 30% in Australia. DTA rates are typically 5%–10%. Applies to intellectual property and licensing income sourced in Australia.",
    },
    {
      dimension: "FIRB approval required for AU property",
      valueA: firbRequired(cfgA),
      valueB: firbRequired(cfgB),
      note:
        "FIRB (Foreign Investment Review Board) approval is generally required for non-residents purchasing Australian property. NZ citizens under the Trans-Tasman arrangement are exempt.",
    },
    {
      dimension: "Established dwelling ban (2025–2027)",
      valueA: dwellingBan(cfgA),
      valueB: dwellingBan(cfgB),
      note:
        "The Australian Government banned foreign persons from purchasing existing (established) dwellings from 1 April 2025 to 31 March 2027. New dwellings, off-the-plan, and commercial property remain available.",
    },
    {
      dimension: "FX corridor to AUD",
      valueA: fxLabel(cfgA),
      valueB: fxLabel(cfgB),
      note:
        "FX corridors vary by volume and competitive pressure. Specialist FX providers typically offer 2–4% better rates than retail bank wire transfers for large sums.",
    },
    {
      dimension: "Pension / super transfer pathway",
      valueA: pensionLabel(cfgA),
      valueB: pensionLabel(cfgB),
      note:
        "Overseas pension transfers to Australian super are generally restricted. UK has a specific QROPS pathway; NZ has a KiwiSaver-to-super exemption. Most other countries have no direct transfer pathway — lump-sum withdrawal and re-contribution rules apply.",
    },
    {
      dimension: "AU migration pathways",
      valueA: migrationLabel(cfgA),
      valueB: migrationLabel(cfgB),
      note:
        "Visa pathway availability affects tax residency timing, FIRB exemption eligibility, and super access. Permanent residency removes FIRB requirements.",
    },
    {
      dimension: "Cross-border reporting obligations",
      valueA: reportingLabel(cfgA),
      valueB: reportingLabel(cfgB),
      note:
        "Reporting obligations vary significantly. US persons face FBAR/FATCA; Chinese residents face SAFE controls. All non-residents must report Australian income in their home country per local tax law.",
    },
  ];

  // Surface critical warnings from both configs
  const warnings: { country: string; title: string; body: string }[] = [];
  if (cfgA.criticalWarning) {
    warnings.push({
      country: cfgA.countryShort,
      title: cfgA.criticalWarning.title,
      body: cfgA.criticalWarning.body,
    });
  }
  if (cfgB.criticalWarning) {
    warnings.push({
      country: cfgB.countryShort,
      title: cfgB.criticalWarning.title,
      body: cfgB.criticalWarning.body,
    });
  }

  const pairSlug = `${cfgA.slug}-vs-${cfgB.slug}`;

  return {
    pairSlug,
    countryA: {
      code: cfgA.code,
      name: cfgA.countryName,
      short: cfgA.countryShort,
      flag: cfgA.flag,
      currency: cfgA.currency,
      slug: cfgA.slug,
      hasDta: dtaA,
    },
    countryB: {
      code: cfgB.code,
      name: cfgB.countryName,
      short: cfgB.countryShort,
      flag: cfgB.flag,
      currency: cfgB.currency,
      slug: cfgB.slug,
      hasDta: dtaB,
    },
    rows,
    warnings,
    hasPensionTransfer: Boolean(cfgA.retirementTransfer ?? cfgB.retirementTransfer),
    hasFxCorridor: Boolean(cfgA.fxCorridor ?? cfgB.fxCorridor),
    bothHaveDta: dtaA && dtaB,
  };
}

// ─── Static Params ─────────────────────────────────────────────────────────

/**
 * All deduplicated country pairs for `generateStaticParams`.
 *
 * Pairs are canonical (A before B alphabetically by countryShort), so
 * uk-vs-us is generated but NOT us-vs-uk. The route handler canonicalises
 * any reverse-order slug via redirect.
 *
 * With 12 hub countries: C(12,2) = 66 unique pairs.
 */
export function allComparePairs(): ReadonlyArray<{
  pair: string;
  codeA: IntentCountryCode;
  codeB: IntentCountryCode;
}> {
  const codes = Object.keys(COUNTRY_CONFIGS) as IntentCountryCode[];
  const pairs: { pair: string; codeA: IntentCountryCode; codeB: IntentCountryCode }[] = [];

  for (let i = 0; i < codes.length; i++) {
    for (let j = i + 1; j < codes.length; j++) {
      const codeX = codes[i]!;
      const codeY = codes[j]!;
      const cfgX = COUNTRY_CONFIGS[codeX];
      const cfgY = COUNTRY_CONFIGS[codeY];
      if (!cfgX || !cfgY) continue;

      // Normalise: A = alphabetically-first short name
      const [cfgA, cfgB] =
        cfgX.countryShort.localeCompare(cfgY.countryShort) <= 0
          ? [cfgX, cfgY]
          : [cfgY, cfgX];

      const codeA = cfgA.code;
      const codeB = cfgB.code;

      pairs.push({
        pair: `${cfgA.slug}-vs-${cfgB.slug}`,
        codeA,
        codeB,
      });
    }
  }

  return pairs;
}

/**
 * Parse a `[pair]` slug into the two CountryConfig objects.
 *
 * Handles canonical and reverse-order slugs — callers should redirect to
 * canonical if `reversed` is true.
 *
 * Returns null if either country slug is unrecognised.
 */
export function parsePairSlug(pairSlug: string): {
  cfgA: CountryConfig;
  cfgB: CountryConfig;
  reversed: boolean;
  canonicalSlug: string;
} | null {
  const vsIdx = pairSlug.lastIndexOf("-vs-");
  if (vsIdx === -1) return null;

  const slugX = pairSlug.slice(0, vsIdx);
  const slugY = pairSlug.slice(vsIdx + 4);

  // Build slug → code map from COUNTRY_CONFIGS
  const configs = Object.values(COUNTRY_CONFIGS).filter(Boolean) as CountryConfig[];
  const cfgX = configs.find((c) => c.slug === slugX);
  const cfgY = configs.find((c) => c.slug === slugY);

  if (!cfgX || !cfgY) return null;

  // Canonical order
  const [cfgA, cfgB] =
    cfgX.countryShort.localeCompare(cfgY.countryShort) <= 0
      ? [cfgX, cfgY]
      : [cfgY, cfgX];

  const canonicalSlug = `${cfgA.slug}-vs-${cfgB.slug}`;
  const reversed = pairSlug !== canonicalSlug;

  return { cfgA, cfgB, reversed, canonicalSlug };
}
