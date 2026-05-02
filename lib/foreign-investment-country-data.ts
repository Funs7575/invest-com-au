/**
 * Foreign-investment country hub configuration.
 *
 * Each country page (e.g. /foreign-investment/united-kingdom) is
 * structured around the same ~12 sections — hero, two audiences, DTA
 * rate table, property + FIRB tiles, FX corridor, pension transfer,
 * inheritance / equivalent, expat case, migration pathways, FAQ,
 * related links, lead-capture forms.
 *
 * Rather than duplicating ~600 lines of JSX 12 times (and growing
 * drift between countries as we update sections), each country
 * exports a config object from this file. The country page pulls it
 * in and renders sections from primitive components.
 *
 * Adding a new country = one config object below + a thin route
 * file that imports it. Replicating UK-level depth to the other 11
 * existing countries = one config object per country.
 *
 * This file is the single source of truth for country-specific
 * facts. If a DTA rate changes, change it here and every country
 * page picks it up. Keep this in sync with ATO.gov.au and
 * Treasury.gov.au — last bulk verified March 2026.
 */

import type { IntentCountryCode } from "./intent-context";

// ─── Shared types ────────────────────────────────────────────────────

export interface HeroStat {
  label: string;
  value: string;
  sub: string;
}

export interface AudienceCard {
  flagEmoji: string;
  title: string;
  bullets: ReadonlyArray<string>;
  /** Tailwind colour family — "blue" or "amber" — for the card border. */
  accent: "blue" | "amber";
}

export interface PropertyTile {
  label: string;
  /** "open" tints the tile emerald. "blocked" tints it red. */
  state: "open" | "blocked";
  note: string;
}

export interface DtaRow {
  type: string;
  noTreaty: string;
  withTreaty: string;
  /** Country-side tax treatment — e.g. "Taxed in UK with FTCR; SA106 box 9". */
  countrySideNote: string;
}

export interface FaqEntry {
  q: string;
  a: string;
}

export interface RelatedLink {
  title: string;
  href: string;
}

export interface LeadFormExtraField {
  name: string;
  label: string;
  type?: "text" | "tel" | "number" | "select";
  options?: ReadonlyArray<{ value: string; label: string }>;
  placeholder?: string;
  required?: boolean;
}

export interface LeadFormConfig {
  title: string;
  body: string;
  ctaLabel: string;
  successHeading: string;
  successBody: string;
  extraFields?: ReadonlyArray<LeadFormExtraField>;
  accent: "amber" | "emerald" | "blue" | "slate";
}

export interface CountryConfig {
  /** Two-letter intent code matching IntentCountryCode (e.g. "uk"). */
  code: IntentCountryCode;
  /** URL slug under app/foreign-investment/. */
  slug: string;
  /** Long-form name (e.g. "United Kingdom"). */
  countryName: string;
  /** Short form ("UK", "US"). */
  countryShort: string;
  /** Adjective ("UK", "US", "Singapore" — for "X investors", "X residents"). */
  adjective: string;
  /** Emoji flag. */
  flag: string;
  /** ISO 4217 currency. */
  currency: string;
  /** Currency symbol prefix used in copy. */
  currencySymbol: string;

  metadata: {
    title: string;
    description: string;
    ogTitle: string;
    ogSub: string;
  };

  hero: {
    flagPillText: string;
    h1Plain: string;
    h1Highlight: string;
    h1Sub: string;
    paragraph: string;
    stats: ReadonlyArray<HeroStat>;
  };

  toc: ReadonlyArray<{ id: string; label: string }>;

  audiences: {
    heading: string;
    sub: string;
    cards: ReadonlyArray<AudienceCard>;
  };

  property: {
    eyebrow: string;
    title: string;
    sub: string;
    /** When non-null, renders the red "ban" callout. */
    banHeadline: string | null;
    banDetail: string | null;
    banLink: { label: string; href: string } | null;
    tiles: ReadonlyArray<PropertyTile>;
    countrySideRemindersHeading: string;
    countrySideReminders: ReadonlyArray<string>;
    ctaLinks: ReadonlyArray<{ label: string; href: string; primary?: boolean }>;
  };

  dta: {
    eyebrow: string;
    title: string;
    sub: string;
    rows: ReadonlyArray<DtaRow>;
    countryReportingHeading: string;
    countryReporting: ReadonlyArray<string>;
    ctaLabel: string;
    ctaHref: string;
  };

  faq: ReadonlyArray<FaqEntry>;

  related: ReadonlyArray<RelatedLink>;

  /** In-page lead-capture forms placed at strategic flow points. */
  leadForms: {
    pdfChecklist: LeadFormConfig | null;
    propertyShortlist: LeadFormConfig | null;
    fxQuote: LeadFormConfig | null;
    pensionTransfer: LeadFormConfig | null;
  };
}

// ─── United Kingdom ────────────────────────────────────────────────

export const UK_CONFIG: CountryConfig = {
  code: "uk",
  slug: "united-kingdom",
  countryName: "United Kingdom",
  countryShort: "UK",
  adjective: "UK",
  flag: "🇬🇧",
  currency: "GBP",
  currencySymbol: "£",

  metadata: {
    title:
      "Investing in Australia from the UK — Tax, Property, Pensions & Brokers Guide 2026",
    description:
      "Complete guide for UK residents and Australian expats: UK-AU DTA (15% dividend WHT, 5% royalties), FIRB property rules, established dwelling ban, QROPS pension transfer, UK IHT exposure, GBP→AUD transfers, HMRC SA106 reporting and ASX brokers that accept UK residents.",
    ogTitle: "Investing in Australia from the UK — 2026 Guide",
    ogSub: "DTA · FIRB · QROPS · IHT · GBP→AUD · 2026",
  },

  hero: {
    flagPillText:
      "United Kingdom · DTA effective 2003 · UK-AU FTA in force · Updated March 2026",
    h1Plain: "Investing in Australia",
    h1Highlight: "from the UK",
    h1Sub: "Tax, Property, Pensions & How to Start in 2026",
    paragraph:
      "The UK-Australia DTA reduces dividend withholding to 15% and royalties to 5%. The UK-Australia FTA raises FIRB thresholds for UK direct investment. But the UK side of the trade — HMRC SA106, UK Inheritance Tax exposure, QROPS rules on pension transfers, and GBP/AUD timing — is where most UK investors trip up. This guide covers both sides.",
    stats: [
      { label: "Dividend WHT", value: "15%", sub: "UK-AU DTA" },
      { label: "Interest WHT", value: "10%", sub: "Standard ATO" },
      { label: "Royalties WHT", value: "5%", sub: "UK-AU DTA" },
    ],
  },

  toc: [
    { id: "audiences", label: "Two audiences" },
    { id: "property", label: "Property + FIRB" },
    { id: "shares", label: "ASX shares — three paths" },
    { id: "fx", label: "GBP → AUD transfers" },
    { id: "tax", label: "UK tax side (HMRC)" },
    { id: "qrops", label: "UK pension transfer" },
    { id: "iht", label: "UK Inheritance Tax" },
    { id: "expat", label: "Aussie expat in UK" },
    { id: "migration", label: "Permanent move to AU" },
    { id: "minerals", label: "Critical minerals" },
    { id: "brokers", label: "Brokers" },
    { id: "faq", label: "FAQ" },
  ],

  audiences: {
    heading: "Are you a UK resident or an Australian expat in the UK?",
    sub: "The rules differ significantly depending on your tax residency. Skim the side that applies — the rest of the page is structured around both.",
    cards: [
      {
        flagEmoji: "🇬🇧",
        title: "UK resident (not Australian)",
        accent: "blue",
        bullets: [
          "15% AU dividend WHT on unfranked dividends (DTA)",
          "Generally exempt from AU CGT on listed shares",
          "FIRB approval required for property; new dwellings only until March 2027",
          "UK CGT may apply on disposal of AU property",
          "Cannot contribute to AU super; cannot access",
          "UK IHT applies to your Australian assets if UK domiciled",
          "Report AU income on HMRC Self Assessment SA106; claim foreign tax credit",
        ],
      },
      {
        flagEmoji: "🇦🇺",
        title: "Australian expat in the UK",
        accent: "amber",
        bullets: [
          "Likely UK tax resident — UK taxes worldwide income",
          "Lose AU CGT 50% discount and AU tax-free threshold",
          "AU-sourced income still taxable in Australia",
          "No FIRB needed (AU citizen / PR)",
          "AU super preserved; cannot access as non-resident",
          "On return to AU: CGT rebasing on UK assets",
          "DASP available only for ex-temp-visa holders, not citizens/PR",
        ],
      },
    ],
  },

  property: {
    eyebrow: "Property + FIRB",
    title: "Australian property as a UK buyer",
    sub: "The 2025–2027 ban changes what's available. New dwellings, off-the-plan and commercial property remain fully open.",
    banHeadline: "Established Dwelling Ban: Active until 31 March 2027",
    banDetail:
      "UK residents (and Australian expats in the UK who are non-residents for AU tax) cannot purchase existing Australian homes until at least 31 March 2027. New properties remain available.",
    banLink: {
      label: "Full details",
      href: "/foreign-investment/guides/property-ban-2025",
    },
    tiles: [
      {
        label: "New dwelling / off-the-plan",
        state: "open",
        note: "FIRB approval required. UK-AU FTA may raise screening thresholds.",
      },
      {
        label: "Established home",
        state: "blocked",
        note: "Banned for foreign buyers until 31 March 2027.",
      },
      {
        label: "Commercial property",
        state: "open",
        note: "Open to UK buyers with FIRB approval; FTA thresholds apply.",
      },
    ],
    countrySideRemindersHeading: "UK-side reminders",
    countrySideReminders: [
      "**UK CGT** applies on disposal if you remain UK tax resident at sale, even though the property is in Australia. Foreign tax credit relief covers Australian CGT paid.",
      "**UK SDLT** (Stamp Duty Land Tax) is not relevant for Australian property — but UK-domiciled buyers pay AU stamp duty plus the foreign-buyer surcharge (which varies by state, typically 7–8%).",
      "**UK IHT** (see section below) applies to AU property in your estate if you're UK-domiciled.",
    ],
    ctaLinks: [
      {
        label: "Browse commercial property listings",
        href: "/invest/commercial-property",
        primary: true,
      },
      {
        label: "Buy AU property as a foreigner — full guide",
        href: "/foreign-investment/guides/buy-property-australia-foreigner",
      },
      {
        label: "Speak to a UK-AU property tax specialist",
        href: "/advisors/international-tax-specialists",
      },
    ],
  },

  dta: {
    eyebrow: "UK Tax Side",
    title: "UK-Australia DTA and how to report Australian income to HMRC",
    sub: "Australian withholding is only one half. The UK side is HMRC Self Assessment SA106, foreign tax credit relief, and UK CGT on disposal.",
    rows: [
      {
        type: "Unfranked dividends",
        noTreaty: "30%",
        withTreaty: "15%",
        countrySideNote: "Taxed in UK; foreign tax credit for AU WHT (SA106 box 9)",
      },
      {
        type: "Fully franked dividends",
        noTreaty: "0%",
        withTreaty: "0%",
        countrySideNote: "Subject to UK income tax; AU franking credits not refundable to UK",
      },
      {
        type: "Interest",
        noTreaty: "10%",
        withTreaty: "10%",
        countrySideNote: "Taxed in UK; FTCR for AU WHT (SA106 box 11)",
      },
      {
        type: "Royalties",
        noTreaty: "30%",
        withTreaty: "5%",
        countrySideNote: "Significant DTA benefit; FTCR available",
      },
      {
        type: "Capital gains (listed shares)",
        noTreaty: "0% AU (exempt)",
        withTreaty: "0% AU (exempt)",
        countrySideNote: "UK CGT applies on disposal; no AU CGT on listed shares for non-residents",
      },
      {
        type: "Capital gains (AU property)",
        noTreaty: "30% AU CGT",
        withTreaty: "30% AU CGT",
        countrySideNote: "Both AU and UK CGT apply; FTCR for AU CGT paid",
      },
    ],
    countryReportingHeading: "HMRC Self Assessment SA106 — what to file",
    countryReporting: [
      "AU dividend income → SA106 Box 6 (or 9 for foreign tax)",
      "AU interest → SA106 Box 11",
      "AU rental property → SA106 Box 14 onwards (separate columns for income, expenses)",
      "AU CGT events → SA108 Capital Gains pages, with FTCR claim referencing SA106",
      "Filing deadline: 31 January following the tax year (UK tax year = 6 April — 5 April)",
    ],
    ctaLabel: "Find a UK-AU cross-border tax accountant",
    ctaHref: "/advisors/international-tax-specialists",
  },

  faq: [
    {
      q: "Can I buy ASX shares as a UK resident?",
      a: "Yes — through a UK-based broker that offers international markets (Interactive Brokers UK, Saxo UK, IG UK), or by opening an account directly with an Australian broker that accepts non-residents. UK ISAs and SIPPs cannot hold ASX-listed shares directly, but they can hold UK-listed dual-ASX listings such as BHP and Rio Tinto.",
    },
    {
      q: "What withholding tax do UK residents pay on Australian dividends?",
      a: "Under the UK-Australia Double Tax Agreement (effective 2003), unfranked Australian dividends are subject to 15% withholding tax instead of the default 30%. Fully franked dividends carry 0% Australian withholding. Interest is 10%, royalties are 5%. UK residents must still report Australian-sourced income on HMRC Self Assessment SA106, and can claim foreign tax credit relief for Australian withholding paid.",
    },
    {
      q: "Can I transfer my UK pension (SIPP) to an Australian super fund?",
      a: "Only into an Australian super fund on HMRC's Recognised Overseas Pension Schemes (QROPS) list. Most Australian super funds are not on this list because Australian schemes generally allow access before age 55 in some circumstances. If you transfer to a non-QROPS scheme HMRC may treat the move as an unauthorised payment with up to 55% tax. Specialist UK-AU pension advice is essential before transferring.",
    },
    {
      q: "Can I still buy an established Australian home as a UK resident?",
      a: "No, not until 31 March 2027 at the earliest. The Foreign Acquisitions & Takeovers Amendment 2024 banned foreign persons (including UK residents) from purchasing established dwellings between April 2025 and March 2027. New properties (off-the-plan, new dwellings) remain available with FIRB approval.",
    },
    {
      q: "Do I owe UK Inheritance Tax on my Australian assets?",
      a: "If you are UK domiciled (which includes most UK-born and long-term UK residents), HMRC taxes your worldwide estate including Australian property, shares and super — currently at 40% above the £325,000 nil-rate band. Australia has no inheritance tax, so UK domicile creates the entire IHT exposure. The non-domiciled regime, the 7-year rule on lifetime gifts and the deemed-domicile test (15 of last 20 years) all interact with this and need cross-border IHT planning.",
    },
    {
      q: "How do I send money from a UK bank to an Australian broker or property purchase?",
      a: "Use a specialist money transfer service (Wise, OFX, MoneyMatch) rather than a high-street UK bank — they typically save 2–4% on the FX margin, which on a £100k transfer is £2,000–£4,000. Compare live rates at our /foreign-investment/send-money-australia page before transferring.",
    },
    {
      q: "I am an Australian expat living in the UK — can I keep contributing to my Australian super?",
      a: "No. Once you become a UK tax resident, you cannot make personal contributions to Australian super (employer contributions tied to Australian-sourced employment income are still possible but rare). Your existing super is preserved and continues to grow but cannot be accessed until preservation age. On returning to Australia, contributions can resume.",
    },
    {
      q: "What is the AUSFTA / UK-Australia FTA, and does it affect investors?",
      a: "The UK-Australia Free Trade Agreement (in force May 2023) raises the FIRB screening threshold for UK investors in non-sensitive sectors and reduces tariffs. It does not change tax treatment of investment income (DTA still governs that), but it does materially improve direct-investment terms for UK businesses acquiring Australian assets above the screening threshold.",
    },
    {
      q: "Should I hedge GBP/AUD currency exposure on my Australian investments?",
      a: "GBP/AUD has moved by 30%+ in the last decade, and FX risk often dominates equity returns over short horizons. Many UK investors with substantial Australian holdings use AUD-hedged ETFs on the LSE, or hold a portion of their portfolio in GBP to dampen volatility. This is a planning question — the right answer depends on whether you intend to spend the AUD or convert it back to GBP.",
    },
  ],

  related: [
    {
      title: "Buy Property in Australia as a Foreigner",
      href: "/foreign-investment/guides/buy-property-australia-foreigner",
    },
    {
      title: "Foreign Buyer Property Ban 2025–2027",
      href: "/foreign-investment/guides/property-ban-2025",
    },
    { title: "ASX Brokers for Non-Residents", href: "/compare/non-residents" },
    {
      title: "Send Money to Australia (GBP to AUD)",
      href: "/foreign-investment/send-money-australia",
    },
    { title: "Tax Guide for Non-Residents", href: "/foreign-investment/tax" },
    {
      title: "Australian super for non-residents",
      href: "/foreign-investment/super",
    },
  ],

  leadForms: {
    pdfChecklist: {
      title: "Free UK→AU 2026 Tax + Property checklist",
      body: "A 12-page PDF covering the UK and AU tax sides side-by-side, FIRB rules, QROPS gotchas, GBP→AUD timing and a UK-domicile IHT cheat sheet. Email it to me, then unsubscribe whenever.",
      ctaLabel: "Send me the PDF",
      successHeading: "Sent — check your inbox.",
      successBody:
        "The PDF is in your inbox now. We'll add you to the UK-investor monthly digest with new FIRB updates, broker offers and tax-year reminders. Unsubscribe anytime.",
      accent: "amber",
      extraFields: [
        {
          name: "audience",
          label: "Which describes you?",
          type: "select",
          required: false,
          options: [
            { value: "uk-resident", label: "UK resident (not Australian)" },
            { value: "aussie-expat-uk", label: "Australian expat in the UK" },
            { value: "uk-au-migrating", label: "Moving from UK to Australia" },
            { value: "uk-au-returning", label: "Australian moving back from UK" },
          ],
        },
      ],
    },
    propertyShortlist: {
      title: "FIRB-eligible new properties in your budget",
      body: "Tell us your rough budget and preferred state — we'll send a shortlist of FIRB-eligible new dwellings, off-the-plan releases and commercial property that match. No obligation.",
      ctaLabel: "Send me a shortlist",
      successHeading: "Got it.",
      successBody:
        "A specialist will email you a curated shortlist within 1–2 business days. We'll only share your details with the specialist actively matching your budget.",
      accent: "emerald",
      extraFields: [
        {
          name: "budget_band",
          label: "Budget (AUD)",
          type: "select",
          required: true,
          options: [
            { value: "under-500k", label: "Under A$500k" },
            { value: "500k-1m", label: "A$500k – A$1m" },
            { value: "1m-2m", label: "A$1m – A$2m" },
            { value: "2m-5m", label: "A$2m – A$5m" },
            { value: "5m-plus", label: "A$5m+" },
          ],
        },
        {
          name: "state_pref",
          label: "Preferred state",
          type: "select",
          required: false,
          options: [
            { value: "any", label: "Any state" },
            { value: "nsw", label: "NSW (Sydney)" },
            { value: "vic", label: "VIC (Melbourne)" },
            { value: "qld", label: "QLD (Brisbane / Gold Coast)" },
            { value: "wa", label: "WA (Perth)" },
            { value: "sa", label: "SA (Adelaide)" },
            { value: "act", label: "ACT (Canberra)" },
          ],
        },
        {
          name: "timeline",
          label: "Timeline",
          type: "select",
          required: false,
          options: [
            { value: "0-3m", label: "Buying in 0–3 months" },
            { value: "3-12m", label: "Buying in 3–12 months" },
            { value: "12m+", label: "Researching, 12+ months out" },
          ],
        },
      ],
    },
    fxQuote: {
      title: "Personalised GBP → AUD quote",
      body: "Tell us your transfer amount and we'll match you with the cheapest specialist provider for your size. Typical saving vs a high-street UK bank: 2–4% (£2,000–£4,000 on a £100k transfer).",
      ctaLabel: "Get a personalised quote",
      successHeading: "On its way.",
      successBody:
        "A specialist provider will email you a live, locked-in rate quote within 1 business day. No commitment until you're happy with the rate.",
      accent: "blue",
      extraFields: [
        {
          name: "transfer_amount_gbp",
          label: "Transfer amount (£)",
          type: "select",
          required: true,
          options: [
            { value: "under-10k", label: "Under £10,000" },
            { value: "10k-50k", label: "£10,000 – £50,000" },
            { value: "50k-250k", label: "£50,000 – £250,000" },
            { value: "250k-1m", label: "£250,000 – £1,000,000" },
            { value: "1m-plus", label: "£1,000,000+" },
          ],
        },
        {
          name: "transfer_purpose",
          label: "Purpose",
          type: "select",
          required: false,
          options: [
            { value: "broker-funding", label: "Funding an AU broker account" },
            { value: "property", label: "Property purchase / deposit" },
            { value: "moving", label: "Personal move to Australia" },
            {
              value: "ongoing",
              label: "Ongoing transfers (rent / salary / pension)",
            },
            { value: "other", label: "Something else" },
          ],
        },
      ],
    },
    pensionTransfer: {
      title: "Get 3 quotes from UK-AU pension transfer specialists",
      body: "QROPS-listed schemes only, both UK and AU sides. We'll match you with up to 3 specialists who handle the full process. No fee for the introduction.",
      ctaLabel: "Match me with specialists",
      successHeading: "Matching you now.",
      successBody:
        "Up to 3 specialists will email you within 1–2 business days. They'll review your scheme, age, residency and decide whether QROPS is the right call before quoting.",
      accent: "slate",
      extraFields: [
        {
          name: "pension_value_gbp",
          label: "Approximate pension value (£)",
          type: "select",
          required: true,
          options: [
            { value: "under-50k", label: "Under £50,000" },
            { value: "50k-150k", label: "£50,000 – £150,000" },
            { value: "150k-500k", label: "£150,000 – £500,000" },
            { value: "500k-1m", label: "£500,000 – £1,000,000" },
            { value: "1m-plus", label: "£1,000,000+" },
          ],
        },
        {
          name: "scheme_type",
          label: "UK pension type",
          type: "select",
          required: false,
          options: [
            { value: "sipp", label: "SIPP / Personal pension" },
            { value: "workplace-dc", label: "Workplace defined contribution" },
            { value: "db", label: "Defined benefit (final salary)" },
            { value: "mixed", label: "Mixed / multiple schemes" },
            { value: "unsure", label: "Not sure" },
          ],
        },
        {
          name: "age_band",
          label: "Your age",
          type: "select",
          required: false,
          options: [
            { value: "under-45", label: "Under 45" },
            { value: "45-54", label: "45–54" },
            { value: "55-64", label: "55–64" },
            { value: "65-plus", label: "65+" },
          ],
        },
      ],
    },
  },
};

// ─── Registry ─────────────────────────────────────────────────────

/**
 * Map of country code → config. Add a new country: define a
 * <CC>_CONFIG above and add the entry here. The thin route file
 * (app/foreign-investment/<slug>/page.tsx) imports the config and
 * renders via primitive components — no per-country JSX.
 */
export const COUNTRY_CONFIGS: Partial<Record<IntentCountryCode, CountryConfig>> = {
  uk: UK_CONFIG,
};

export function getCountryConfig(
  code: IntentCountryCode,
): CountryConfig | undefined {
  return COUNTRY_CONFIGS[code];
}
