/**
 * Expat Journey — builds an ordered, country-aware step list for the
 * `/foreign-investment/[country]/journey` guided page.
 *
 * Strategy: assemble EXISTING data from CountryConfig (the single source
 * of truth) into an ordered step sequence. No new data is fabricated.
 * Each step surfaces the relevant country-config facts + links to the
 * existing calculators/pages/advisor surfaces.
 *
 * Step ordering is intentionally fixed for UX consistency:
 *   1. Eligibility / residency signal — "Can I invest?"
 *   2. FIRB — property and business thresholds
 *   3. Investment options — what's open/blocked for this country
 *   4. Tax — DTA rates, withholding, home-country reporting
 *   5. FX / moving money — corridor options
 *   6. Pension / super transfer — if applicable (UK QROPS, NZ KiwiSaver, etc.)
 *   7. Reporting obligations — FBAR/FATCA, SAFE controls, etc. if applicable
 *   8. Visa / migration — if user is considering permanent move
 *   9. Advisor handoff — FIRB specialists + international tax + migration agents
 *
 * Steps are skipped (omitted) when the country config has no relevant data
 * for that topic — the list is honest, not padded.
 *
 * Everything here is factual and general in nature (AFSL general-advice
 * licence). No personal recommendations, no product placement, no fabricated
 * tax rates. All copy either quotes config data or links to the relevant
 * page/calculator for the user to verify.
 *
 * Tests: __tests__/lib/expat-journey.test.ts
 */

import type { CountryConfig } from "./foreign-investment-country-data";
import type { IntentCountryCode } from "./intent-context";
import { intentCountryMeta } from "./intent-context";

// ─── Types ──────────────────────────────────────────────────────────────────

/**
 * A single step in the cross-border investing journey.
 * id is stable — used as URL anchors on the journey page.
 */
export interface JourneyStep {
  /** Stable anchor id, e.g. "eligibility", "firb", "tax". */
  id: string;
  /** Step number (1-based) for display. */
  stepNumber: number;
  /** Short title shown in the progress rail. */
  railLabel: string;
  /** Full section heading. */
  heading: string;
  /** 1–2 sentence summary surfaced in the step card. */
  summary: string;
  /**
   * Factual bullet points extracted from the country config.
   * Each bullet may contain **bold** markdown (rendered client-side).
   */
  bullets: ReadonlyArray<string>;
  /**
   * Links to existing pages / calculators. Every link is a pre-existing
   * route — no fabricated URLs.
   */
  links: ReadonlyArray<{ label: string; href: string; primary?: boolean }>;
  /**
   * Optional amber/red callout heading — surfaces critical warnings
   * from the config (e.g. US worldwide-tax, CN capital controls, UK QROPS risk).
   */
  calloutTitle?: string;
  /** Body text for the callout. May contain **bold** markdown. */
  calloutBody?: string;
  /** "warn" (amber) or "critical" (red) — drives visual variant. Defaults to "warn". */
  calloutVariant?: "warn" | "critical";
}

export interface ExpatJourney {
  /** Two-letter country code. */
  code: IntentCountryCode;
  /** Canonical country name, e.g. "United Kingdom". */
  countryName: string;
  /** Short label, e.g. "UK", "US". */
  countryShort: string;
  /** Emoji flag. */
  flag: string;
  /** ISO 4217 currency. */
  currency: string;
  /** Ordered journey steps — always >= 2 (eligibility + handoff are always present). */
  steps: ReadonlyArray<JourneyStep>;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Capitalise first letter — used when adjective starts a sentence. */
function ucFirst(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Primary DTA dividend rate from the first row of the DTA table, or "30%" fallback. */
function dividendWht(config: CountryConfig): string {
  const row = config.dta.rows.find((r) =>
    r.type.toLowerCase().includes("unfranked"),
  );
  return row?.withTreaty ?? "30%";
}

/** True when property.banHeadline is set (established dwelling ban active). */
function hasBan(config: CountryConfig): boolean {
  return Boolean(config.property.banHeadline);
}

/**
 * True for all countries except NZ (SCV 444 / trans-Tasman exemption).
 * NZ is the only case where FIRB is not required. We infer from the
 * criticalWarning text rather than adding a new config field.
 */
function requiresFirb(config: CountryConfig): boolean {
  // NZ critical warning explicitly says "No FIRB Required"
  const warn = config.criticalWarning?.title ?? "";
  return !warn.toLowerCase().includes("no firb");
}

// ─── Step builders ──────────────────────────────────────────────────────────

function buildEligibilityStep(
  config: CountryConfig,
  n: number,
): JourneyStep {
  const meta = intentCountryMeta(config.code);
  const hasDta = meta.hasDta;
  const firb = requiresFirb(config);

  const bullets: string[] = [
    `**Tax residency**: Your obligations depend on whether you are a tax resident of ${config.countryName}, Australia, or both. The country page has a two-audience breakdown.`,
    `**DTA status**: ${hasDta ? `${config.countryShort} and Australia have a Double Tax Agreement — reduced withholding rates apply (e.g. dividends at ${dividendWht(config)} rather than 30%).` : `${config.countryShort} does not have a Double Tax Agreement with Australia. Standard ATO withholding rates apply (30% on unfranked dividends).`}`,
    firb
      ? `**FIRB**: ${ucFirst(config.adjective)} residents generally need Foreign Investment Review Board (FIRB) approval to purchase Australian property. See Step 2.`
      : `**FIRB**: ${config.countryShort} citizens under the Trans-Tasman arrangement do not need FIRB approval for Australian property — one of the key advantages. See Step 2 for details.`,
  ];

  // Audience bullets from the first audience card (the inbound investor)
  const inboundCard = config.audiences.cards[0];
  if (inboundCard) {
    bullets.push(
      ...inboundCard.bullets.map((b) => `**${config.adjective} resident**: ${b}`),
    );
  }

  return {
    id: "eligibility",
    stepNumber: n,
    railLabel: "Eligibility",
    heading: `Step ${n}: Who can invest — residency and eligibility`,
    summary: `Before investing, establish your tax residency status and whether the ${config.countryShort}–Australia Double Tax Agreement applies to you. This determines withholding rates, reporting obligations, and FIRB requirements.`,
    bullets,
    links: [
      {
        label: `${config.countryShort}–Australia investing guide`,
        href: `/foreign-investment/${config.slug}`,
        primary: true,
      },
      {
        label: "Non-resident tax guide",
        href: "/foreign-investment/tax",
      },
    ],
    ...(config.criticalWarning
      ? {
          calloutTitle: config.criticalWarning.title,
          calloutBody: config.criticalWarning.body,
          calloutVariant: "critical" as const,
        }
      : {}),
  };
}

function buildFirbStep(config: CountryConfig, n: number): JourneyStep {
  const firb = requiresFirb(config);
  const ban = hasBan(config);

  const bullets: string[] = [];

  // Property tiles — open vs blocked
  for (const tile of config.property.tiles) {
    const icon = tile.state === "open" ? "Open" : "Blocked";
    bullets.push(`**${tile.label}** (${icon}): ${tile.note}`);
  }

  // Country-side reminders
  bullets.push(...config.property.countrySideReminders);

  const links = [
    ...config.property.ctaLinks.map((l) => ({
      label: l.label,
      href: l.href,
      primary: l.primary,
    })),
    {
      label: "FIRB application guide",
      href: "/foreign-investment/guides/firb-application-guide",
    },
    {
      label: "FIRB specialists",
      href: "/advisors/firb-specialists",
    },
  ];

  let callout: Pick<JourneyStep, "calloutTitle" | "calloutBody" | "calloutVariant"> = {};
  if (!firb) {
    callout = {
      calloutTitle: `${config.countryShort} citizens: No FIRB required`,
      calloutBody: config.criticalWarning?.body ?? "NZ citizens under the Trans-Tasman arrangement do not need FIRB approval for most Australian property purchases.",
      calloutVariant: "warn",
    };
  } else if (ban && config.property.banHeadline) {
    callout = {
      calloutTitle: config.property.banHeadline,
      calloutBody: config.property.banDetail ?? "The established dwelling ban is active. New dwellings and commercial property remain available.",
      calloutVariant: "critical",
    };
  }

  return {
    id: "firb",
    stepNumber: n,
    railLabel: "FIRB & Property",
    heading: `Step ${n}: FIRB rules and Australian property`,
    summary: firb
      ? `FIRB approval is required for ${config.adjective} residents purchasing most Australian property. The 2025–2027 established dwelling ban limits options — but new dwellings, off-the-plan, and commercial property remain open.`
      : `${config.countryShort} citizens under the Trans-Tasman arrangement do not need FIRB approval — a significant advantage over most other nationalities. Foreign-buyer stamp duty surcharges may still apply in some states.`,
    bullets,
    links,
    ...callout,
  };
}

function buildInvestmentOptionsStep(
  config: CountryConfig,
  n: number,
): JourneyStep | null {
  // Use investmentOptions if present, otherwise synthesise from paths-to-shares
  const items = config.investmentOptions?.items;
  const paths = config.pathsToShares?.cards;

  if (!items && !paths) return null;

  const bullets: string[] = [];

  if (items) {
    for (const item of items) {
      const icon = item.state === "open" ? "Open" : "Blocked";
      bullets.push(`**${item.label}** (${icon}): ${item.body}`);
    }
  } else if (paths) {
    for (const path of paths) {
      bullets.push(`**${path.title}**: ${path.body}`);
    }
  }

  const links: Array<{ label: string; href: string; primary?: boolean }> = [];
  if (config.investmentOptions) {
    links.push({
      label: "Compare non-resident brokers",
      href: "/compare/non-residents",
      primary: true,
    });
  } else if (config.pathsToShares?.ctaLinks) {
    links.push(
      ...config.pathsToShares.ctaLinks.map((l) => ({
        label: l.label,
        href: l.href,
        primary: l.primary,
      })),
    );
  }
  links.push({ label: "ASX shares for non-residents", href: "/foreign-investment/shares" });

  return {
    id: "investment-options",
    stepNumber: n,
    railLabel: "Investment Options",
    heading: `Step ${n}: What ${config.adjective} investors can access`,
    summary: `The investment options available to you depend on your tax residency and visa status. Here is what is open and what is restricted for ${config.adjective} residents.`,
    bullets,
    links,
  };
}

function buildTaxStep(config: CountryConfig, n: number): JourneyStep {
  const meta = intentCountryMeta(config.code);
  const hasDta = meta.hasDta;

  const bullets: string[] = [];

  // DTA rows — top 4 most relevant
  const taxRows = config.dta.rows.slice(0, 4);
  for (const row of taxRows) {
    bullets.push(
      `**${row.type}**: ${hasDta ? row.withTreaty : row.noTreaty} AU WHT. ${row.countrySideNote}`,
    );
  }

  // Country reporting obligations
  if (config.dta.countryReporting.length > 0) {
    bullets.push(
      ...config.dta.countryReporting.map(
        (r) => `**${config.countryShort} reporting**: ${r}`,
      ),
    );
  }

  const links: JourneyStep["links"] = [
    {
      label: config.dta.ctaLabel,
      href: config.dta.ctaHref,
      primary: true,
    },
    {
      label: "Non-resident CGT checker",
      href: "/non-resident-cgt-checker",
    },
    {
      label: "Non-resident dividend calculator",
      href: "/non-resident-dividend-calculator",
    },
    {
      label: "DTA search table",
      href: "/foreign-investment#dta",
    },
  ];

  // FBAR/FATCA or other reporting obligations
  let callout: Pick<JourneyStep, "calloutTitle" | "calloutBody" | "calloutVariant"> = {};
  if (config.reportingObligations) {
    callout = {
      calloutTitle: `${config.reportingObligations.title}`,
      calloutBody: config.reportingObligations.sub,
      calloutVariant: "critical",
    };
  }

  return {
    id: "tax",
    stepNumber: n,
    railLabel: "Tax",
    heading: `Step ${n}: Tax — withholding rates and ${config.countryShort}-side reporting`,
    summary: hasDta
      ? `The ${config.countryShort}–Australia Double Tax Agreement reduces withholding rates on investment income. You still need to report Australian income in ${config.countryName} — ${config.dta.countryReportingHeading} covers the key obligations.`
      : `${config.countryName} does not have a Double Tax Agreement with Australia. Standard ATO withholding rates apply. Australian income should be declared in ${config.countryName} as required by local tax law.`,
    bullets,
    links,
    ...callout,
  };
}

function buildFxStep(
  config: CountryConfig,
  n: number,
): JourneyStep | null {
  if (!config.fxCorridor) return null;

  const fx = config.fxCorridor;
  const bullets = fx.options.map(
    (opt) =>
      `**${opt.name}** (${opt.badge}): ${opt.cost} — ${opt.speed}. ${opt.note}`,
  );

  return {
    id: "fx",
    stepNumber: n,
    railLabel: "Moving Money",
    heading: `Step ${n}: Moving money — ${fx.eyebrow}`,
    summary: fx.sub,
    bullets,
    links: [
      {
        label: fx.ctaLabel,
        href: fx.ctaHref,
        primary: true,
      },
      {
        label: "Send money to Australia guide",
        href: "/foreign-investment/send-money-australia",
      },
    ],
    calloutTitle: "FX costs compound",
    calloutBody:
      "On a large transfer, the difference between a high-street bank and a specialist FX provider can be thousands of dollars. Compare before you transfer.",
    calloutVariant: "warn",
  };
}

function buildPensionStep(
  config: CountryConfig,
  n: number,
): JourneyStep | null {
  if (!config.retirementTransfer) return null;

  const ret = config.retirementTransfer;
  const bullets: string[] = [];

  for (const acc of ret.accordions) {
    bullets.push(`**${acc.summary}**:`);
    bullets.push(...acc.bullets);
  }

  if (ret.callout) {
    bullets.push(ret.callout);
  }

  return {
    id: "pension",
    stepNumber: n,
    railLabel: "Pension / Super",
    heading: `Step ${n}: ${ret.title}`,
    summary: ret.sub,
    bullets,
    links: ret.ctaLinks.map((l) => ({
      label: l.label,
      href: l.href,
      primary: l.primary,
    })),
    calloutTitle: "High-stakes decision",
    calloutBody:
      "Pension transfers across borders carry significant tax risk on both sides. Do not self-direct — engage a specialist before making any transfer.",
    calloutVariant: "critical",
  };
}

function buildReportingStep(
  config: CountryConfig,
  n: number,
): JourneyStep | null {
  if (!config.reportingObligations) return null;

  const rep = config.reportingObligations;
  const bullets: string[] = [];

  for (const card of rep.cards) {
    bullets.push(`**${card.title}**:`);
    bullets.push(...card.bullets);
  }

  return {
    id: "reporting",
    stepNumber: n,
    railLabel: "Reporting",
    heading: `Step ${n}: ${rep.title}`,
    summary: rep.sub,
    bullets,
    links: [
      {
        label: "Find a cross-border tax specialist",
        href: "/advisors/international-tax-specialists",
        primary: true,
      },
    ],
    calloutTitle: "Compliance obligations",
    calloutBody:
      "Failing to comply with cross-border reporting requirements can result in significant penalties. Seek specialist advice.",
    calloutVariant: "critical",
  };
}

function buildMigrationStep(
  config: CountryConfig,
  n: number,
): JourneyStep | null {
  if (!config.migration) return null;

  const mig = config.migration;
  const bullets = mig.pathways.map(
    (p) => `**${p.name}**: ${p.note}`,
  );

  return {
    id: "migration",
    stepNumber: n,
    railLabel: "Migration",
    heading: `Step ${n}: ${mig.title}`,
    summary: mig.sub,
    bullets,
    links: [
      {
        label: mig.ctaLink.label,
        href: mig.ctaLink.href,
        primary: true,
      },
      {
        label: "Visa and investment pathways",
        href: "/visa-investment",
      },
    ],
  };
}

function buildHandoffStep(config: CountryConfig, n: number): JourneyStep {
  // Use advisorAnchor if configured, otherwise build from defaults
  const anchor = config.advisorAnchor;

  const bullets = [
    "**FIRB specialists** — licensed to advise on FIRB applications, foreign acquisition obligations, and structuring property purchases as a non-resident.",
    "**International tax specialists** — handle dual-country reporting, DTA positions, non-resident CGT, withholding tax refund claims, and home-country filing.",
    "**Migration agents** — registered to advise on visa pathways, permanent residency options, and how migration status affects your investment and tax position.",
    ...(config.retirementTransfer
      ? [
          `**Pension transfer specialists** — essential for ${config.countryShort}–Australia pension transfers; the risks are high and advisors need specialist cross-border pension experience.`,
        ]
      : []),
  ];

  return {
    id: "handoff",
    stepNumber: n,
    railLabel: "Next Steps",
    heading: `Step ${n}: Next steps — finding the right specialist`,
    summary:
      anchor?.body ??
      `Cross-border investing from ${config.countryName} touches multiple specialist disciplines. The right advisor depends on your primary question: property, tax, pension transfer, or migration.`,
    bullets,
    links: [
      {
        label: "FIRB specialists",
        href: "/advisors/firb-specialists",
        primary: true,
      },
      {
        label: "International tax specialists",
        href: "/advisors/international-tax-specialists",
      },
      {
        label: "Migration agents",
        href: "/advisors/migration-agents",
      },
    ],
  };
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Build the ordered ExpatJourney from a CountryConfig.
 *
 * Omits any step for which no config data exists (e.g. no pension
 * transfer section → no pension step). The steps array is always
 * non-empty — eligibility + handoff are always present.
 *
 * @param config — from getCountryConfig() or COUNTRY_CONFIGS[code]
 * @returns ExpatJourney with ordered steps
 */
export function buildExpatJourney(config: CountryConfig): ExpatJourney {
  const meta = intentCountryMeta(config.code);

  // Ordered candidates — null entries are filtered out below.
  const candidates: (JourneyStep | null)[] = [];

  // Counter increments as each non-null step is accepted.
  let n = 1;

  function accept(step: JourneyStep | null): void {
    if (!step) return;
    // Renumber based on actual accepted position
    candidates.push({ ...step, stepNumber: n++ });
  }

  accept(buildEligibilityStep(config, n));
  accept(buildFirbStep(config, n));
  accept(buildInvestmentOptionsStep(config, n));
  accept(buildTaxStep(config, n));
  accept(buildFxStep(config, n));
  accept(buildPensionStep(config, n));
  accept(buildReportingStep(config, n));
  accept(buildMigrationStep(config, n));
  accept(buildHandoffStep(config, n));

  const steps = candidates.filter((s): s is JourneyStep => s !== null);

  return {
    code: config.code,
    countryName: config.countryName,
    countryShort: config.countryShort,
    flag: meta.flag,
    currency: meta.currency,
    steps,
  };
}

/**
 * Return a single step by its stable id, or undefined if not present.
 * Useful for rendering a specific step in isolation (e.g. a step-level
 * server component that fetches only what it needs).
 */
export function getJourneyStep(
  journey: ExpatJourney,
  id: string,
): JourneyStep | undefined {
  return journey.steps.find((s) => s.id === id);
}
