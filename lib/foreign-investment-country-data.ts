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
import type { PlatformType } from "./types";

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

export interface CtaLink {
  label: string;
  href: string;
  /** Primary CTAs render solid; secondary render bordered. */
  primary?: boolean;
}

export interface JumpToCard {
  emoji: string;
  title: string;
  body: string;
  /** In-page anchor (e.g. "#property") or absolute href. */
  href: string;
}

export interface CriticalWarning {
  title: string;
  body: string;
}

export interface PathCard {
  /** Eyebrow tag, e.g. "Path 1 — UK-side platforms". */
  eyebrow: string;
  /** Tailwind colour family for the eyebrow text. */
  eyebrowColor: "blue" | "amber" | "emerald" | "slate" | "red";
  title: string;
  body: string;
  pros: ReadonlyArray<string>;
  cons: ReadonlyArray<string>;
  /** When set, renders the card with a thicker amber border. */
  highlight?: boolean;
}

export interface InvestmentOption {
  label: string;
  /** "open" tints emerald + tick, "blocked" tints red + cross. */
  state: "open" | "blocked";
  body: string;
  href: string;
}

export interface FxOption {
  name: string;
  /** Pill text shown above the title. */
  badge: string;
  badgeAccent: "red" | "emerald" | "blue" | "amber" | "slate";
  cost: string;
  speed: string;
  note: string;
}

export interface AccordionEntry {
  summary: string;
  /** Lines rendered as a bulleted <ul>. May contain **bold** markdown. */
  bullets: ReadonlyArray<string>;
}

export interface CardItem {
  /** Optional eyebrow / kicker label rendered above the title. */
  eyebrow?: string;
  title: string;
  body: string;
}

export interface VisaPathway {
  name: string;
  note: string;
}

export interface ThresholdItem {
  title: string;
  threshold: string;
  desc: string;
}

export interface QuickAction {
  /** Emoji shown on the left of the row. */
  emoji: string;
  /** Bold action label, e.g. "Brokers that accept Chinese residents". */
  label: string;
  /** Single-line description shown under the label. */
  sublabel: string;
  /**
   * Where the action lands. Should be a pre-filtered URL where possible
   * — that's the whole point of these actions: drop the user into the
   * slice that matches them, not on a generic landing page.
   */
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

  /**
   * Quick-action menu rendered in the header flag-button popover when
   * this country is selected/detected. Each entry is a pre-filtered
   * landing target — broker subset, property subset, FX corridor, etc.
   * 4–6 items per country. Lets a returning user jump straight to the
   * filtered slice that matches them instead of re-deriving the path
   * through the country guide every visit.
   *
   * Also re-used as the homepage popular-starting-points strip when this
   * country is selected — Country Mode keeps a single source of truth
   * for the country's headline links rather than duplicating copy.
   */
  defaultActions?: ReadonlyArray<QuickAction>;

  // ─── Country Mode hooks (optional) ───────────────────────────────────
  //
  // Read by surfaces *other* than this country's foreign-investment hub
  // — the homepage country-mode preview strips, the quiz prefill, the
  // soft GeoIP prompt, Phase-5 language routing. All optional with
  // global-feed fallbacks: a half-populated config produces the global
  // homepage, never a broken or fake-supply one.

  /**
   * Filters the homepage listings preview when this country is the
   * resolved Country Mode. `verticals` are slugs from `lib/verticals.ts`
   * (e.g. "property", "shares"). `firb: true` further narrows to FIRB-
   * eligible listings — meaningful for inbound property corridors. When
   * omitted, the homepage falls through to the global listings feed.
   */
  homepageListingFilters?: {
    verticals: ReadonlyArray<string>;
    firb?: boolean;
  };

  /**
   * Filters the homepage experts preview. `specialties` are advisor-type
   * strings stored on `professionals` rows (free-text — e.g. "tax",
   * "buyers-agent", "mortgage-broker"). `languages` is a list of ISO
   * 639-1 codes (e.g. "zh", "ar") that narrows to experts who can serve
   * the user in the target language. When omitted, falls through to
   * the global experts feed.
   */
  homepageExpertFilters?: {
    specialties: ReadonlyArray<string>;
    languages?: ReadonlyArray<string>;
  };

  /**
   * Filters the homepage compare-platforms preview. `types` are the
   * `PlatformType` enum values to surface (typically share_broker for
   * inbound corridors, plus crypto_exchange for crypto-active markets).
   * `nonResidentsOnly: true` narrows to platforms with
   * `accepts_non_residents = true` — meaningful for share_broker /
   * cfd_forex / crypto_exchange where the column is populated. When
   * omitted, falls through to the global compare grid.
   */
  homepagePlatformFilters?: {
    types: ReadonlyArray<PlatformType>;
    nonResidentsOnly?: boolean;
  };

  /**
   * Tools to surface first in the homepage tools strip when this
   * country is selected. Each entry is a tool slug plus optional URL
   * params to pre-fill (e.g. `{ from: "GBP" }` on the FX-corridor
   * calculator). The full tools list still renders — country mode
   * re-ranks, it doesn't replace.
   */
  homepageFeaturedTools?: ReadonlyArray<{
    slug: string;
    label: string;
    deeplinkParams?: Record<string, string>;
  }>;

  /**
   * Languages the country-mode user is likely to read/speak — drives
   * expert-language filtering today and Phase-5 language routing
   * tomorrow. ISO 639-1 codes (e.g. ["en", "zh"], ["ar", "en"]).
   */
  preferredLanguages?: ReadonlyArray<string>;

  // ─── Phase-5 language hooks (scaffolding only, not read yet) ─────────
  //
  // Reserved for the Language Mode work in Phase 5. Defining the shape
  // now lets country configs declare language intent (RTL, default,
  // route map) without restructuring later. Nothing reads these in
  // Phase 1 — they exist purely so Phase 5 plugs into a stable
  // interface.

  /** Whether any of this country's supported languages is right-to-left (Arabic). */
  hasRtlLanguage?: boolean;
  /** Default language code for users in this country (ISO 639-1). */
  defaultLanguage?: string;
  /** All languages a user from this country may want (ISO 639-1 codes). */
  supportedLanguages?: ReadonlyArray<string>;
  /**
   * Map from language code to the localised version of this country's
   * hub (e.g. `{ "zh-Hans": "/zh/foreign-investment/china" }`). Phase 5
   * will read this to emit hreflang and language-switcher links.
   */
  languageRoutes?: Record<string, string>;
  /**
   * Phase-5 readiness flag: true once translations + RTL pass exist
   * for this country. Phase 1 ships this as undefined/false everywhere.
   */
  rtlReady?: boolean;

  /** Optional red-banner callout above the audiences section (e.g. US worldwide-tax warning). */
  criticalWarning?: CriticalWarning;

  /** Optional "jump to your situation" persona-style 4-card grid. */
  jumpToCards?: ReadonlyArray<JumpToCard>;

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
    ctaLinks: ReadonlyArray<CtaLink>;
  };

  /** Optional "three paths to ASX shares" 3-card section (UK shape). */
  pathsToShares?: {
    eyebrow: string;
    title: string;
    sub: string;
    cards: ReadonlyArray<PathCard>;
    ctaLinks: ReadonlyArray<CtaLink>;
  };

  /** Optional "what country investors can access" tick/cross grid (US shape). */
  investmentOptions?: {
    eyebrow: string;
    title: string;
    sub?: string;
    items: ReadonlyArray<InvestmentOption>;
  };

  /** Optional FX corridor 3-card section. */
  fxCorridor?: {
    eyebrow: string;
    title: string;
    sub: string;
    options: ReadonlyArray<FxOption>;
    ctaLabel: string;
    ctaHref: string;
  };

  dta: {
    eyebrow: string;
    title: string;
    sub: string;
    rows: ReadonlyArray<DtaRow>;
    /** Header for the country-side-treatment column ("UK tax treatment", "US tax treatment", etc.). */
    countrySideHeading: string;
    countryReportingHeading: string;
    countryReporting: ReadonlyArray<string>;
    ctaLabel: string;
    ctaHref: string;
  };

  /** Optional "compliance / reporting obligations" 2-card section (US FBAR/FATCA, etc.). */
  reportingObligations?: {
    eyebrow: string;
    title: string;
    sub: string;
    cards: ReadonlyArray<{ title: string; bullets: ReadonlyArray<string> }>;
  };

  /** Optional "fund-trap" warning (US PFIC, etc.) — heavy red callout + recommendation. */
  fundTrap?: {
    eyebrow: string;
    title: string;
    sub: string;
    warningTitle: string;
    bullets: ReadonlyArray<string>;
    recommendation?: string;
  };

  /** Optional FTA / treaty thresholds 4-card section (US AUSFTA, UK FTA, etc.). */
  treatyThresholds?: {
    eyebrow: string;
    title: string;
    sub: string;
    items: ReadonlyArray<ThresholdItem>;
  };

  /** Optional retirement / pension transfer section (UK QROPS, etc.). */
  retirementTransfer?: {
    eyebrow: string;
    title: string;
    sub: string;
    /** Amber callout text above the accordion pair. */
    callout?: string;
    accordions: ReadonlyArray<AccordionEntry>;
    ctaLinks: ReadonlyArray<CtaLink>;
  };

  /** Optional inheritance / estate tax 3-card section (UK IHT, JP inheritance tax, etc.). */
  inheritance?: {
    eyebrow: string;
    title: string;
    sub: string;
    cards: ReadonlyArray<CardItem>;
    ctaLink?: CtaLink;
  };

  /** Optional "Australian expat in <country>" 3-card section. */
  expat?: {
    eyebrow: string;
    title: string;
    sub: string;
    cards: ReadonlyArray<CardItem>;
  };

  /** Optional permanent-migration visa pathways grid. */
  migration?: {
    eyebrow: string;
    title: string;
    sub: string;
    pathways: ReadonlyArray<VisaPathway>;
    ctaLink: CtaLink;
  };

  /** Optional sector-opportunity gradient block (Critical minerals, etc.). */
  sectorOpportunity?: {
    eyebrow: string;
    title: string;
    body: string;
    /** Optional 3-stat row at the top of the block. */
    stats?: ReadonlyArray<HeroStat>;
    ctaLinks: ReadonlyArray<CtaLink>;
  };

  /** Optional config overrides for the brokers section. Falls back to sensible defaults. */
  brokers?: {
    eyebrow?: string;
    title: string;
    sub: string;
  };

  /**
   * Cross-vertical conversion sections — each entry renders a card grid
   * of active platforms of the given type. Lets a country page surface
   * crypto exchanges, robo-advisors, savings accounts and the like (not
   * just share brokers) as pre-filtered listings for the AU-expat
   * audience as well as country-resident users with AUD income.
   *
   * `nonResidentsOnly` filters by `accepts_non_residents = true` —
   * meaningful for share_broker / cfd_forex / crypto_exchange where the
   * column is populated. Other platform types ignore the flag.
   *
   * `compareHref` is the "compare all" link rendered below the cards.
   */
  opportunities?: ReadonlyArray<{
    platformType: PlatformType;
    eyebrow: string;
    title: string;
    sub: string;
    nonResidentsOnly?: boolean;
    /** Optional cap on cards rendered (default 6). */
    limit?: number;
    /** "Compare all" link target — typically a /best/<slug> or /compare route. */
    compareHref: string;
    compareLabel: string;
  }>;

  /** Optional advisor-anchor full-width callout. */
  advisorAnchor?: {
    eyebrow: string;
    title: string;
    body: string;
    ctaLabel: string;
    ctaHref: string;
    /** "dark" = slate-900 background; "light" = amber-50 background. */
    theme: "dark" | "light";
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
  defaultActions: [
    { emoji: "🇬🇧", label: "Investing in Australia from the UK", sublabel: "Country-specific guide: tax, FIRB, QROPS, brokers", href: "/foreign-investment/united-kingdom" },
    { emoji: "📈", label: "Brokers that accept UK residents", sublabel: "Pre-filtered to non-resident-friendly platforms", href: "/compare/non-residents" },
    { emoji: "🏠", label: "FIRB-eligible new properties", sublabel: "New dwellings + commercial only — established homes blocked till 2027", href: "/invest?firb=eligible" },
    { emoji: "💱", label: "GBP → AUD transfers", sublabel: "Specialist FX vs UK retail bank — typical saving 2–4%", href: "/foreign-investment/send-money-australia" },
    { emoji: "🧾", label: "UK-AU pension transfer (QROPS)", sublabel: "Specialist advisors for the highest-risk cross-border decision", href: "/advisors/international-tax-specialists" },
    { emoji: "👤", label: "Find a UK-AU specialist", sublabel: "HMRC SA106, IHT, FIRB — cross-border advisors", href: "/advisors/international-tax-specialists" },
  ],
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
    { id: "retirement", label: "UK pension transfer" },
    { id: "inheritance", label: "UK Inheritance Tax" },
    { id: "expat", label: "Aussie expat in UK" },
    { id: "migration", label: "Permanent move to AU" },
    { id: "sector", label: "Critical minerals" },
    { id: "opportunities", label: "Platforms" },
    { id: "brokers", label: "Brokers" },
    { id: "faq", label: "FAQ" },
  ],

  jumpToCards: [
    { emoji: "🇬🇧", title: "I live in the UK", body: "ASX shares, FX, AU tax, IHT.", href: "#audiences" },
    { emoji: "🇦🇺", title: "I'm an Aussie expat in UK", body: "Super, CGT rebasing, tax residency.", href: "#expat" },
    { emoji: "✈️", title: "I'm moving to Australia", body: "QROPS, IHT, visa pathways.", href: "#retirement" },
    { emoji: "🏠", title: "I want AU property", body: "FIRB ban, new dwellings, FX.", href: "#property" },
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
    countrySideHeading: "UK tax treatment",
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

  pathsToShares: {
    eyebrow: "ASX Shares",
    title: "Three paths for UK investors to access Australian shares",
    sub: "The right path depends on portfolio size, whether you want individual ASX stocks or just market exposure, and whether you're using ISA / SIPP wrappers.",
    cards: [
      {
        eyebrow: "Path 1 — UK-side platforms",
        eyebrowColor: "blue",
        title: "Use your existing UK broker",
        body: "Hargreaves Lansdown, AJ Bell, Vanguard UK and Trading 212 don't offer direct ASX trading, but they do hold Australian dual-listings (BHP, Rio Tinto) on the LSE and Australian-themed ETFs. This keeps your UK ISA / SIPP wrapper intact — best for small balances.",
        pros: ["ISA / SIPP-eligible (UK tax shelter preserved)", "No new account needed"],
        cons: ["Limited ASX coverage — dual-listings + ETFs only", "No exposure to small/mid-cap ASX"],
      },
      {
        eyebrow: "Path 2 — UK broker, AU access",
        eyebrowColor: "amber",
        title: "Open an international broker (UK entity)",
        body: "Interactive Brokers UK, Saxo UK and IG UK are FCA-regulated and let you buy individual ASX-listed shares from a UK account. You're investing as a UK resident with full DTA benefits applied, in a UK-regulated wrapper. Most popular path for serious UK investors.",
        pros: ["Full ASX universe (small / mid / large cap)", "FCA-regulated UK broker", "DTA WHT applied automatically"],
        cons: ["Outside ISA / SIPP wrapper (held in GIA)"],
        highlight: true,
      },
      {
        eyebrow: "Path 3 — Australian broker direct",
        eyebrowColor: "emerald",
        title: "Open an Australian broker that accepts UK",
        body: "A handful of Australian brokers accept UK residents directly. You hold AU-domiciled investments under CHESS sponsorship, but you're subject to UK reporting on the worldwide income. Useful if you have an Australian bank account already (e.g. Aussie expat returning often, or property income).",
        pros: ["CHESS-sponsored, AU-domiciled", "AUD-denominated; no constant FX hop"],
        cons: ["Need an AU bank account to fund", "Still report AU income on HMRC SA106"],
      },
    ],
    ctaLinks: [
      { label: "Compare brokers that accept UK residents", href: "/compare/non-residents", primary: true },
      { label: "ASX shares for non-residents — guide", href: "/foreign-investment/shares" },
    ],
  },

  fxCorridor: {
    eyebrow: "GBP → AUD",
    title: "Sending money from a UK bank to Australia",
    sub: "On a £100k transfer, the difference between a high-street bank and a specialist provider is typically £2,000–£4,000. This is usually the highest-cost touchpoint UK investors hit.",
    options: [
      {
        name: "High-street UK bank (Lloyds, HSBC, Barclays)",
        cost: "2.5–4% margin",
        speed: "1–3 business days",
        note: "Default route; expensive on FX but feels safe. Consider only for ≤£5k transfers where margin matters less.",
        badge: "Avoid for large amounts",
        badgeAccent: "red",
      },
      {
        name: "Wise / OFX / MoneyMatch",
        cost: "0.4–1% margin",
        speed: "Same day to 2 days",
        note: "Specialist FX providers — significantly tighter spreads, fixed rates available, regulated.",
        badge: "Recommended",
        badgeAccent: "emerald",
      },
      {
        name: "Multi-currency account (Wise, Revolut)",
        cost: "0.3–0.6% margin",
        speed: "Instant balance hold",
        note: "Hold GBP/AUD in one account; convert when timing is favourable. Good for repeated transfers (e.g. property settlement deposits).",
        badge: "For active FX",
        badgeAccent: "blue",
      },
    ],
    ctaLabel: "Compare GBP → AUD live rates",
    ctaHref: "/foreign-investment/send-money-australia",
  },

  retirementTransfer: {
    eyebrow: "UK Pension Transfer",
    title: "QROPS — transferring a UK pension to Australian super",
    sub: "The single biggest cross-border financial decision UK→AU migrants face. Get this wrong and HMRC can tax up to 55% of the transfer.",
    callout:
      "**Don't self-direct this.** QROPS is one of a small handful of cross-border decisions where DIY is genuinely high-risk — both sides of the trade need specialist input.",
    accordions: [
      {
        summary: "When QROPS makes sense",
        bullets: [
          "You've permanently migrated to Australia and don't plan to return to the UK",
          "Your UK pension is a defined-contribution scheme (SIPP / personal pension)",
          "You're aged 55+ (UK access age) — unauthorised-payment risk is lower",
          "You've modelled the long-term tax outcome with a UK-AU pension specialist",
        ],
      },
      {
        summary: "Rules to know (OTC, age 55, QROPS list)",
        bullets: [
          "**Only QROPS-listed AU schemes** qualify. Specialist SMSFs can be QROPS-registered.",
          "**Overseas Transfer Charge (OTC)** 25% may apply unless exemptions are met.",
          "**Age 55 rule** — non-QROPS transfers may trigger up to 55% HMRC tax.",
          "**Reporting window** — receiving scheme must stay QROPS-listed for 5 years.",
        ],
      },
    ],
    ctaLinks: [
      { label: "Speak to a UK-AU pension specialist", href: "/advisors/international-tax-specialists", primary: true },
      { label: "Australian super for non-residents", href: "/foreign-investment/super" },
    ],
  },

  inheritance: {
    eyebrow: "UK Inheritance Tax",
    title: "IHT exposure on your Australian assets",
    sub: "Australia abolished inheritance tax in 1979. The UK didn't. If you're UK domiciled, HMRC taxes your worldwide estate — including Australian property, shares and super — at up to 40%.",
    cards: [
      {
        eyebrow: "Domicile of origin",
        title: "",
        body: "Follows you from birth (typically your father's domicile). Hard to shed without genuine permanent move + cutting UK ties.",
      },
      {
        eyebrow: "Deemed domicile",
        title: "",
        body: "UK resident for 15 of last 20 tax years → deemed domicile, even if not domiciled originally. Catches many long-term migrants.",
      },
      {
        eyebrow: "7-year rule",
        title: "",
        body: "Lifetime gifts taper out of the IHT estate over 7 years. A common planning lever for AU-bound migrants.",
      },
    ],
    ctaLink: { label: "Speak to a UK IHT planner", href: "/advisors/international-tax-specialists" },
  },

  expat: {
    eyebrow: "Australian Expat",
    title: "If you're an Australian living in the UK",
    sub: "Different rules. UK taxes worldwide income. Your Australian super is preserved but locked. CGT rebasing applies on return.",
    cards: [
      {
        title: "Tax residency",
        body: "Once UK tax resident under SRT (Statutory Residence Test), the UK taxes your worldwide income. AU income still taxed in Australia (foreign-sourced rules apply to AU residency). DTA prevents double taxation.",
      },
      {
        title: "Australian super while away",
        body: "Preserved. Cannot contribute (unless still tied to AU employment). Cannot access until preservation age. Ineligible for DASP if you're AU citizen / PR — DASP is only for ex-temp-visa holders.",
      },
      {
        title: "Returning home — CGT rebasing",
        body: "Becoming AU tax resident again triggers a deemed acquisition of overseas assets at market value at re-entry. UK gains accrued during your UK period typically aren't AU-taxable, but plan disposals carefully around the move.",
      },
    ],
  },

  migration: {
    eyebrow: "Permanent move",
    title: "Moving permanently to Australia from the UK",
    sub: "If your goal is permanent migration, most of the cross-border tax problems above resolve themselves. The visa pathway determines timing and which tax-side issues bite.",
    pathways: [
      {
        name: "Skilled Independent (189) / Skilled Nominated (190)",
        note: "Points-tested skilled migration. UK passport-holders are common applicants in shortage occupations (medicine, engineering, trades).",
      },
      {
        name: "Employer Sponsored (482 → 186)",
        note: "Temporary skilled visa converting to PR. Employer sponsors; 2–4 year pathway.",
      },
      {
        name: "Parent visa (143 contributory / 173 temporary)",
        note: "Common pathway for retiring UK parents joining AU-resident adult children. Long processing times.",
      },
      {
        name: "Investor / Business Innovation (188)",
        note: "For HNW UK investors deploying capital into AU. Coordinates with FIRB and SIV-aligned structures.",
      },
    ],
    ctaLink: { label: "Find a UK-AU migration specialist", href: "/advisors/migration-agents" },
  },

  sectorOpportunity: {
    eyebrow: "2026 Opportunity — UK angle",
    title: "UK demand for Australian critical minerals",
    body:
      "The UK-Australia FTA (in force 2023) eliminated tariffs on Australian mineral exports. UK defence procurement and clean-energy manufacturing both drive structural demand for Australian lithium, rare earths, cobalt and nickel. Investment-side: the FTA raises FIRB screening thresholds for UK direct investment in non-sensitive Australian assets (currently A$1.339B for non-sensitive sectors), making UK-side mining acquisitions materially easier than for non-FTA countries.",
    ctaLinks: [
      { label: "Browse mining opportunities", href: "/invest/mining/listings", primary: true },
      { label: "Read the full guide", href: "/article/australias-critical-minerals-boom-how-to-invest" },
    ],
  },

  brokers: {
    title: "ASX brokers that accept UK residents",
    sub: "Verify eligibility and current account-opening conditions directly with each broker before applying.",
  },

  advisorAnchor: {
    eyebrow: "Cross-border specialist",
    title: "Get the UK-AU bit right",
    body:
      "The Australian side is usually straightforward. The UK side — HMRC reporting, IHT exposure, QROPS rules, CGT on return — is where most UK investors get hurt. A cross-border specialist who handles both UK and Australian tax in the same conversation is worth the fee.",
    ctaLabel: "Find a UK-AU specialist",
    ctaHref: "/advisors/international-tax-specialists",
    theme: "dark",
  },

  opportunities: [
    {
      platformType: "crypto_exchange",
      eyebrow: "AUD Crypto",
      title: "Australian crypto exchanges (for AUD-earning investors)",
      sub: "If you're an Australian expat in the UK with AUD income, or a UK resident running an AUD-denominated portfolio, these AU-regulated exchanges accept Australian residents. UK residents should check eligibility per exchange.",
      compareHref: "/best/crypto",
      compareLabel: "Compare all Australian crypto exchanges",
    },
    {
      platformType: "robo_advisor",
      eyebrow: "Set-and-forget",
      title: "Australian robo-advisors",
      sub: "If you hold an Australian bank account and want passive ASX exposure with auto-rebalancing, these robo-advisors accept Australian-resident accounts.",
      compareHref: "/best/robo-advisors",
      compareLabel: "Compare all Australian robo-advisors",
    },
    {
      platformType: "savings_account",
      eyebrow: "AUD savings",
      title: "High-interest AUD savings accounts",
      sub: "For Australian expats holding AUD reserves, or UK migrants planning their move — competitive AUD-denominated savings.",
      compareHref: "/best/savings-accounts",
      compareLabel: "Compare all AUD savings accounts",
    },
  ],

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

// ─── United States ─────────────────────────────────────────────────

export const US_CONFIG: CountryConfig = {
  code: "us",
  defaultActions: [
    { emoji: "🇺🇸", label: "Americans investing in Australia", sublabel: "FBAR, FATCA, PFIC, AUSFTA — full guide", href: "/foreign-investment/united-states" },
    { emoji: "📈", label: "Brokers that accept US persons", sublabel: "IBKR is the working option — most AU retail brokers won't onboard", href: "/compare/non-residents" },
    { emoji: "⚠️", label: "PFIC-safe investment options", sublabel: "Individual ASX stocks + US-listed AU ETFs — avoid the trap", href: "/foreign-investment/shares" },
    { emoji: "🏠", label: "FIRB-eligible new properties", sublabel: "AUSFTA raises commercial thresholds — residential rules unchanged", href: "/invest?firb=eligible" },
    { emoji: "💱", label: "USD → AUD transfers", sublabel: "Wise/OFX vs US wires — saves 1.5–3% on size", href: "/foreign-investment/send-money-australia" },
    { emoji: "👤", label: "Find a US-AU CPA", sublabel: "FBAR/FATCA/PFIC + Forms 8938, 8621, 3520 — specialist territory", href: "/advisors/international-tax-specialists" },
  ],
  slug: "united-states",
  countryName: "United States",
  countryShort: "US",
  adjective: "American",
  flag: "🇺🇸",
  currency: "USD",
  currencySymbol: "$",

  metadata: {
    title:
      "Americans Investing in Australia (2026) — FIRB, Tax & US Person Rules",
    description:
      "US citizens investing in Australia: FBAR/FATCA obligations, PFIC rules for Australian funds, US-AU DTA (15% dividend WHT), AUSFTA thresholds, IBKR for US persons, and super complexity. Updated 2026.",
    ogTitle: "Americans Investing in Australia — 2026 Guide",
    ogSub: "FBAR · FATCA · PFIC · FIRB · AUSFTA · 2026",
  },

  hero: {
    flagPillText: "United States · AUSFTA · US-AU DTA · Most Complex Rules · 2026",
    h1Plain: "Americans Investing",
    h1Highlight: "in Australia",
    h1Sub: "FBAR, FATCA, PFIC & FIRB Rules for 2026",
    paragraph:
      "US citizens and green card holders face the most complex foreign investor situation of any nationality. The United States taxes its citizens on worldwide income — meaning your Australian investments have US tax implications regardless of where you live. FBAR, FATCA, and the PFIC rules for Australian managed funds create a uniquely challenging environment.",
    stats: [
      { label: "Dividend WHT", value: "15%", sub: "Under US-AU DTA" },
      { label: "Interest WHT", value: "10%", sub: "Under US-AU DTA" },
      { label: "Royalties WHT", value: "5%", sub: "Under US-AU DTA" },
      { label: "FBAR threshold", value: "$10K", sub: "FinCEN 114 filing" },
    ],
  },

  toc: [
    { id: "audiences", label: "Two audiences" },
    { id: "property", label: "Property + FIRB" },
    { id: "reporting", label: "FBAR / FATCA" },
    { id: "fund-trap", label: "PFIC trap" },
    { id: "tax", label: "DTA + IRS" },
    { id: "treaty", label: "AUSFTA" },
    { id: "investment-options", label: "What you can invest in" },
    { id: "fx", label: "USD → AUD" },
    { id: "expat", label: "Aussie expat in US" },
    { id: "sector", label: "Critical minerals" },
    { id: "opportunities", label: "Platforms" },
    { id: "brokers", label: "Brokers" },
    { id: "faq", label: "FAQ" },
  ],

  criticalWarning: {
    title: "Critical: US Citizens Must File US Taxes on Global Income",
    body:
      "Unlike almost every other country, the United States taxes its citizens and green card holders on their **worldwide income** — regardless of where they live. If you are a US citizen or green card holder investing in Australia, you must report your Australian income, gains, and account balances to the IRS and FinCEN. Penalties for non-compliance can be severe. Strongly recommend engaging a **US-qualified CPA with international tax experience**.",
  },

  jumpToCards: [
    { emoji: "🇺🇸", title: "I live in the US", body: "ASX shares, PFIC, FBAR/FATCA, IRS.", href: "#audiences" },
    { emoji: "🇦🇺", title: "I'm an Aussie expat in US", body: "Super, FEIE, US tax filing.", href: "#expat" },
    { emoji: "🏠", title: "I want AU property", body: "FIRB, AUSFTA thresholds, US tax.", href: "#property" },
    { emoji: "⚠️", title: "I hold ASX ETFs", body: "PFIC trap — read this first.", href: "#fund-trap" },
  ],

  audiences: {
    heading: "US investor in America, or American expat in Australia?",
    sub: "Both situations carry US worldwide tax obligations — but Australian rules differ.",
    cards: [
      {
        flagEmoji: "🇺🇸",
        title: "US Resident investing in Australia from the US",
        accent: "blue",
        bullets: [
          "15% Australian dividend WHT applies (under DTA)",
          "Report Australian income on US Form 1040",
          "FBAR required if AU accounts exceed $10K at any point",
          "FATCA Form 8938 may be required",
          "Australian ETFs and managed funds may be PFICs (complex US treatment)",
          "FIRB required for property; AUSFTA gives higher thresholds for business",
        ],
      },
      {
        flagEmoji: "🇦🇺",
        title: "American Expat living in Australia",
        accent: "amber",
        bullets: [
          "Australian tax resident — pay Australian income tax",
          "Still must file US taxes annually (worldwide income)",
          "Foreign Earned Income Exclusion (FEIE) may reduce US liability",
          "Australian super: complex US treatment — not directly equivalent to 401k",
          "No FIRB needed for property while an Australian tax resident",
          "Consider Foreign Tax Credit to avoid double taxation",
        ],
      },
    ],
  },

  property: {
    eyebrow: "Property + FIRB",
    title: "Australian property as a US buyer",
    sub: "AUSFTA helps for business investment, but does not exempt US persons from FIRB or the established-dwelling ban for residential.",
    banHeadline: "Established Dwelling Ban: Active until 31 March 2027",
    banDetail:
      "US residents who are non-residents of Australia cannot purchase existing Australian homes until at least 31 March 2027. New properties remain available.",
    banLink: { label: "Full details", href: "/foreign-investment/guides/property-ban-2025" },
    tiles: [
      {
        label: "New dwelling / off-the-plan",
        state: "open",
        note: "FIRB approval required. AUSFTA does not exempt residential — all non-resident purchases need FIRB.",
      },
      {
        label: "Established home",
        state: "blocked",
        note: "Banned for foreign buyers until 31 March 2027 (applies to US persons).",
      },
      {
        label: "Commercial property",
        state: "open",
        note: "Open to US buyers; AUSFTA raises FIRB screening thresholds materially.",
      },
    ],
    countrySideRemindersHeading: "US-side reminders (worldwide income, FTC, FBAR)",
    countrySideReminders: [
      "**US worldwide income** — rental income from Australian property is reported on US Form 1040 Schedule E. Foreign Tax Credit (Form 1116) offsets Australian income tax paid.",
      "**FBAR** applies if escrow or property-management trust accounts in Australia exceed $10K USD aggregate.",
      "**Capital gains on disposal** are taxable in both Australia and the US. Foreign Tax Credit relieves double tax — but the FTC limitation can leave residual US tax exposure.",
    ],
    ctaLinks: [
      { label: "Browse commercial property listings", href: "/invest/commercial-property", primary: true },
      { label: "Buy AU property as a foreigner — full guide", href: "/foreign-investment/guides/buy-property-australia-foreigner" },
      { label: "Speak to a US-AU property tax specialist", href: "/advisors/international-tax-specialists" },
    ],
  },

  reportingObligations: {
    eyebrow: "US Reporting Obligations",
    title: "FBAR, FATCA, and US reporting for Australian accounts",
    sub: "US persons with Australian financial accounts have significant US reporting obligations.",
    cards: [
      {
        title: "FBAR — FinCEN Form 114",
        bullets: [
          "Required if your Australian financial accounts (bank, brokerage, super) have an aggregate balance exceeding $10,000 USD at any point during the calendar year",
          "File electronically via FinCEN BSA E-Filing System by April 15 (automatic extension to Oct 15)",
          "Penalties: Up to $10,000 per violation (non-willful); up to $100,000+ or 50% of account value for willful violations",
          "Australian superannuation: FBAR reporting required for AU super accounts",
        ],
      },
      {
        title: "FATCA — Form 8938 & Australian compliance",
        bullets: [
          "IRS Form 8938: Required if foreign financial assets exceed $50K (single/MFS) or $100K (MFJ) at year-end",
          "Australia-US FATCA IGA: Australian financial institutions automatically report US account holders to the ATO, who shares with IRS",
          "Result: IRS may already have data on your Australian accounts before you file",
          "Affects why some Australian brokers/banks may ask for US citizenship/green card status",
        ],
      },
    ],
  },

  fundTrap: {
    eyebrow: "PFIC Warning",
    title: "Australian ETFs and managed funds: PFIC rules for US investors",
    sub: "This is one of the most significant tax traps for US persons investing in Australian markets.",
    warningTitle: "What is a PFIC and why does it matter?",
    bullets: [
      "**PFIC definition:** A Passive Foreign Investment Company is a non-US corporation where 75%+ of income is passive OR 50%+ of assets produce passive income. Most Australian managed funds and ETFs qualify as PFICs.",
      "**Tax treatment:** Without a QEF (Qualified Electing Fund) election, PFIC gains are taxed at the highest ordinary income rate (currently 37%) plus interest charges — significantly worse than capital gains treatment.",
      "**Common PFIC traps:** Vanguard Australia ETFs (e.g., VAS), iShares Australia ETFs, Betashares ETFs, and most Australian managed funds are PFICs for US tax purposes.",
      "**What to do:** US persons investing in ASX should generally use individual stocks (not ETFs/managed funds) or US-listed ETFs that provide ASX exposure (e.g., EWA — iShares MSCI Australia ETF listed on NYSE).",
      "**Annual reporting:** Each PFIC requires Form 8621 filed with your US return — adding significant compliance cost.",
    ],
    recommendation:
      "**Recommendation for US investors:** Consider investing in individual ASX stocks rather than Australian ETFs or managed funds to avoid PFIC complexity. Alternatively, use US-listed ETFs with Australian exposure (such as EWA) which are not PFICs.",
  },

  dta: {
    eyebrow: "DTA Rates",
    title: "US-Australia Double Tax Agreement rates",
    sub: "The US-Australia DTA reduces withholding on Australian income for US residents. But US persons still report global income.",
    countrySideHeading: "US tax treatment",
    rows: [
      { type: "Unfranked dividends", noTreaty: "30%", withTreaty: "15%", countrySideNote: "Also taxed in US — Foreign Tax Credit offsets AU WHT" },
      { type: "Fully franked dividends", noTreaty: "0%", withTreaty: "0%", countrySideNote: "Franking credits have limited benefit for US persons" },
      { type: "Interest", noTreaty: "10%", withTreaty: "10%", countrySideNote: "Also taxed in US — Foreign Tax Credit may apply" },
      { type: "Royalties", noTreaty: "30%", withTreaty: "5%", countrySideNote: "Significant DTA benefit — but US tax still applies" },
      { type: "Capital gains (listed shares)", noTreaty: "0% (exempt AU)", withTreaty: "0% (exempt AU)", countrySideNote: "IRS taxes US persons on AU share gains — DTA article 13" },
      { type: "Capital gains (AU property)", noTreaty: "Taxable in AU", withTreaty: "Taxable in AU", countrySideNote: "Both US and AU may tax — Foreign Tax Credit used to offset" },
    ],
    countryReportingHeading: "IRS reporting essentials",
    countryReporting: [
      "AU dividends, interest, royalties → Form 1040 + Schedule B; foreign tax credit on Form 1116",
      "AU rental property → Schedule E; depreciation under US rules (different schedule from ATO)",
      "PFIC holdings → one Form 8621 per PFIC, per year",
      "FBAR → FinCEN 114 if aggregate AU accounts > $10K USD anytime in year",
      "FATCA → Form 8938 with the 1040 if assets > $50K/$100K thresholds",
      "Filing deadline: April 15 (auto extension to Oct 15 via Form 4868)",
    ],
    ctaLabel: "Find a US-AU cross-border tax CPA",
    ctaHref: "/advisors/international-tax-specialists",
  },

  treatyThresholds: {
    eyebrow: "AUSFTA & FIRB",
    title: "Australia-US Free Trade Agreement investment rules",
    sub: "AUSFTA (2005) gives US investors higher FIRB screening thresholds for private business investment.",
    items: [
      {
        title: "Private Business Investment",
        threshold: "$1.339B",
        desc: "Under AUSFTA, US investors get a higher threshold (indexed) for private business acquisitions — significantly above the general $339M threshold.",
      },
      {
        title: "Agricultural Land",
        threshold: "$15M",
        desc: "AUSFTA does not increase the agricultural land threshold. The standard $15M cumulative threshold applies to US investors.",
      },
      {
        title: "New Residential Property",
        threshold: "All purchases",
        desc: "AUSFTA does not exempt US investors from FIRB for residential property. All non-resident residential purchases require FIRB.",
      },
      {
        title: "Established Dwellings",
        threshold: "BANNED",
        desc: "The established dwelling ban (2025–2027) applies to US investors despite AUSFTA. New dwellings available with FIRB.",
      },
    ],
  },

  investmentOptions: {
    eyebrow: "Investment Options",
    title: "What US investors can access in Australia",
    items: [
      { label: "Individual ASX Stocks", state: "open", body: "Direct ASX shares are not PFICs. Best approach for US persons wanting Australian equities exposure. IBKR is the primary broker.", href: "/foreign-investment/shares" },
      { label: "US-Listed AU ETFs (e.g. EWA)", state: "open", body: "iShares MSCI Australia ETF (EWA on NYSE) provides ASX exposure without PFIC issues. Not subject to AU PFIC rules.", href: "/foreign-investment/shares" },
      { label: "New Australian Property", state: "open", body: "New dwellings available with FIRB. Australian property gains taxable in both AU and US (Foreign Tax Credit applies).", href: "/foreign-investment/guides/buy-property-australia-foreigner" },
      { label: "Australian ETFs (ASX-listed)", state: "blocked", body: "PFIC TRAP — Australian-listed ETFs (VAS, NDQ, etc.) are PFICs for US persons. Avoid unless prepared for complex Form 8621 filings.", href: "/foreign-investment/shares" },
      { label: "Australian Managed Funds", state: "blocked", body: "PFIC TRAP — Most Australian managed funds are PFICs. The unfavourable PFIC tax regime makes these unsuitable for US persons.", href: "/foreign-investment/shares" },
      { label: "Australian Superannuation", state: "blocked", body: "Complex — AU super not directly equivalent to US 401k or IRA. Contributions and earnings may not be tax-deferred under US rules. Specialised advice essential.", href: "/foreign-investment/super" },
    ],
  },

  fxCorridor: {
    eyebrow: "USD → AUD",
    title: "Sending money from a US bank to Australia",
    sub: "On a US$100k transfer, the difference between a high-street bank and a specialist provider is typically US$1,500–US$3,500. Wires from US retail banks are generally the worst-priced corridor a US investor faces.",
    options: [
      {
        name: "US bank wire (BoA, Chase, Wells Fargo)",
        cost: "1.5–3% margin + flat $30–$50 wire",
        speed: "1–3 business days",
        note: "Default for most Americans. Margin gets worse on smaller amounts; wire fees apply both ends.",
        badge: "Avoid for large amounts",
        badgeAccent: "red",
      },
      {
        name: "Wise / OFX / XE",
        cost: "0.4–0.9% margin",
        speed: "Same day to 2 days",
        note: "Specialist providers — significantly tighter spreads, fixed-rate options, FinCEN-regulated.",
        badge: "Recommended",
        badgeAccent: "emerald",
      },
      {
        name: "Multi-currency account (Wise USD/AUD)",
        cost: "0.3–0.6% margin",
        speed: "Instant balance hold",
        note: "Hold USD/AUD in one account; convert when timing is favourable. Useful for repeated property settlements.",
        badge: "For active FX",
        badgeAccent: "blue",
      },
    ],
    ctaLabel: "Compare USD → AUD live rates",
    ctaHref: "/foreign-investment/send-money-australia",
  },

  expat: {
    eyebrow: "Australian Expat",
    title: "If you're an Australian living in the US",
    sub: "Different rules. US taxes worldwide income — even on AU-sourced earnings. Australian super is preserved but not equivalent to a 401k under US tax law.",
    cards: [
      {
        title: "US tax residency + FEIE",
        body: "As a US tax resident (substantial-presence test or green card), you file Form 1040 on worldwide income. Foreign Earned Income Exclusion (~US$120K) can shelter earned income while abroad — not investment income. Foreign Tax Credit relieves double tax on AU-sourced income.",
      },
      {
        title: "Australian super while in the US",
        body: "Preserved. Cannot generally contribute. Most US-AU tax positions treat AU super as a foreign grantor trust — annual reporting (Forms 3520, 3520-A) may apply. Specialist advice essential before making any super decisions while a US tax resident.",
      },
      {
        title: "Returning home — CGT rebasing",
        body: "Becoming AU tax resident again triggers a deemed acquisition of overseas assets at market value at re-entry. US gains accrued during your US period typically aren't AU-taxable, but plan disposals carefully around the move — and unwind PFIC exposure first if possible.",
      },
    ],
  },

  sectorOpportunity: {
    eyebrow: "2026 Opportunity",
    title: "US-Australia Critical Minerals Framework",
    body:
      "The bilateral framework signed at the White House mobilises $8.5B+ in critical minerals investment — creating a direct pipeline for US investors into Australian mining. The Pentagon is directly funding gallium refining capacity in Western Australia. US EXIM Bank has issued letters of interest for over $2.2 billion in Australian critical mineral project financing. Key commodities: lithium, rare earths, cobalt, nickel, vanadium, and gallium.",
    stats: [
      { label: "Joint Investment Pipeline", value: "$8.5B+", sub: "" },
      { label: "US EXIM Bank Letters of Interest", value: "$2.2B", sub: "" },
      { label: "Projects in Government Prospectus", value: "78", sub: "" },
    ],
    ctaLinks: [
      { label: "Browse Mining Opportunities", href: "/invest/mining/listings", primary: true },
      { label: "Read the Full Guide", href: "/article/australias-critical-minerals-boom-how-to-invest" },
    ],
  },

  brokers: {
    title: "ASX brokers that accept US persons",
    sub: "Interactive Brokers (IBKR) is the primary option for US persons investing in ASX due to FATCA compliance. Most Australian retail brokers do not accept US persons.",
  },

  advisorAnchor: {
    eyebrow: "Cross-border specialist",
    title: "US persons: get a specialist cross-border advisor",
    body:
      "Investing in Australia as a US citizen or green card holder involves some of the most complex cross-border tax rules in the world — FBAR, FATCA, PFIC, Foreign Tax Credits, and super treatment. We strongly recommend a CPA or tax attorney with specific US-Australia cross-border expertise.",
    ctaLabel: "Find a US-AU Tax Specialist",
    ctaHref: "/advisors/international-tax-specialists",
    theme: "light",
  },

  opportunities: [
    {
      platformType: "crypto_exchange",
      eyebrow: "AUD Crypto",
      title: "Australian crypto exchanges",
      sub: "For Australian expats in the US holding AUD-denominated crypto, or US residents accessing the Australian market. Verify US-person eligibility per exchange.",
      compareHref: "/best/crypto",
      compareLabel: "Compare all Australian crypto exchanges",
    },
    {
      platformType: "robo_advisor",
      eyebrow: "Set-and-forget",
      title: "Australian robo-advisors",
      sub: "PFIC-aware investors should be cautious — most AU robo-advisor portfolios contain PFIC ETFs. AU expats with US tax exposure should review the underlying holdings.",
      compareHref: "/best/robo-advisors",
      compareLabel: "Compare all Australian robo-advisors",
    },
    {
      platformType: "savings_account",
      eyebrow: "AUD savings",
      title: "High-interest AUD savings accounts",
      sub: "For AU expats holding AUD reserves, or US-based investors planning a property settlement — competitive AUD-denominated savings.",
      compareHref: "/best/savings-accounts",
      compareLabel: "Compare all AUD savings accounts",
    },
  ],

  faq: [
    {
      q: "Can I buy ASX shares as a US citizen?",
      a: "Yes — most commonly through Interactive Brokers (IBKR), which accepts US persons and offers full ASX market access. Most Australian retail brokers will not accept US persons due to FATCA reporting burden. US persons should generally avoid Australian-domiciled ETFs and managed funds because of PFIC tax treatment, and instead hold individual ASX stocks or use US-listed Australia ETFs like EWA.",
    },
    {
      q: "What is the PFIC trap and how do I avoid it?",
      a: "A PFIC (Passive Foreign Investment Company) is any non-US corporation where 75%+ of income or 50%+ of assets are passive — which captures essentially all Australian ETFs and managed funds. PFIC holdings are taxed punitively under US rules (top marginal rate plus interest charges) and require annual Form 8621 filing per PFIC. The simplest avoidance: hold individual ASX stocks instead of Australian ETFs, or use US-listed AU exposure (EWA on NYSE).",
    },
    {
      q: "Do I have to file FBAR for my Australian super?",
      a: "Yes. FBAR (FinCEN Form 114) applies to any foreign financial account — including Australian super — where your aggregate foreign balances exceed US$10,000 at any point in the calendar year. Australian super accounts are explicitly reportable. Penalties for non-filing are severe: up to US$10,000 per non-willful violation, much more for willful.",
    },
    {
      q: "What withholding tax do US residents pay on Australian dividends?",
      a: "Under the US-Australia Double Tax Agreement, unfranked Australian dividends are subject to 15% withholding (vs the 30% default). Fully franked dividends carry 0% Australian withholding but the franking credit is not refundable to US persons. All Australian-source income is also reportable on US Form 1040 — Foreign Tax Credit (Form 1116) offsets the Australian tax paid.",
    },
    {
      q: "Can I still buy an established Australian home as a US resident?",
      a: "No — not until 31 March 2027 at the earliest. The foreign-buyer ban on established dwellings applies to US persons despite AUSFTA. New properties (off-the-plan, new dwellings) and commercial property remain available with FIRB approval.",
    },
    {
      q: "How does AUSFTA help US investors?",
      a: "AUSFTA (in force 2005) raises FIRB screening thresholds for US private business investment to A$1.339B (indexed) — significantly above the general A$339M threshold. It does not change tax treatment (the DTA governs that), and does not exempt US investors from residential FIRB or the established-dwelling ban.",
    },
    {
      q: "I'm an Australian expat in the US — can I keep contributing to my Australian super?",
      a: "Generally no, while you're a US tax resident. Australian super is preserved and grows, but most US tax positions treat it as a foreign grantor trust — meaning Forms 3520/3520-A may apply, contributions may not be tax-deferred under US rules, and earnings may be currently taxable. Specialist US-AU advice is essential before any super decisions while you're a US tax resident.",
    },
    {
      q: "Should I use Interactive Brokers or open an Australian broker?",
      a: "For most US persons, Interactive Brokers is the path of least resistance — they accept US persons under FATCA, offer full ASX access, and handle the cross-border reporting infrastructure. Australian retail brokers typically refuse US persons because of the FATCA compliance cost. If you have an Australian bank account and want CHESS sponsorship, IBKR Australia (with its CHESS option) is the closest available equivalent.",
    },
  ],

  related: [
    { title: "Buy Property in Australia as a Foreigner", href: "/foreign-investment/guides/buy-property-australia-foreigner" },
    { title: "Foreign Buyer Property Ban 2025–2027", href: "/foreign-investment/guides/property-ban-2025" },
    { title: "ASX Brokers for Non-Residents", href: "/compare/non-residents" },
    { title: "Send Money to Australia (USD to AUD)", href: "/foreign-investment/send-money-australia" },
    { title: "Australian Super Guide for Expats", href: "/foreign-investment/super" },
    { title: "Tax Guide for Non-Residents", href: "/foreign-investment/tax" },
  ],

  leadForms: {
    pdfChecklist: {
      title: "Free US→AU 2026 Tax + PFIC checklist",
      body: "A 14-page PDF covering FBAR/FATCA filing, the PFIC traps to avoid, US-AU DTA mechanics, Foreign Tax Credit basics, and a US-domicile compliance cheat sheet for AU investments.",
      ctaLabel: "Send me the PDF",
      successHeading: "Sent — check your inbox.",
      successBody:
        "The PDF is in your inbox now. We'll add you to the US-investor monthly digest with new IRS guidance, FATCA notices and broker offers. Unsubscribe anytime.",
      accent: "amber",
      extraFields: [
        {
          name: "audience",
          label: "Which describes you?",
          type: "select",
          required: false,
          options: [
            { value: "us-resident", label: "US resident (not Australian)" },
            { value: "aussie-expat-us", label: "Australian expat in the US" },
            { value: "us-au-migrating", label: "Moving from US to Australia" },
            { value: "us-au-returning", label: "Australian moving back from US" },
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
      ],
    },
    fxQuote: {
      title: "Personalised USD → AUD quote",
      body: "Tell us your transfer amount and we'll match you with the cheapest specialist provider for your size. Typical saving vs a US wire: 1.5–3% (US$1,500–US$3,000 on a US$100k transfer).",
      ctaLabel: "Get a personalised quote",
      successHeading: "On its way.",
      successBody:
        "A specialist provider will email you a live, locked-in rate quote within 1 business day.",
      accent: "blue",
      extraFields: [
        {
          name: "transfer_amount_usd",
          label: "Transfer amount (US$)",
          type: "select",
          required: true,
          options: [
            { value: "under-10k", label: "Under US$10,000" },
            { value: "10k-50k", label: "US$10,000 – US$50,000" },
            { value: "50k-250k", label: "US$50,000 – US$250,000" },
            { value: "250k-1m", label: "US$250,000 – US$1,000,000" },
            { value: "1m-plus", label: "US$1,000,000+" },
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
            { value: "ongoing", label: "Ongoing transfers (rent / salary / pension)" },
            { value: "other", label: "Something else" },
          ],
        },
      ],
    },
    pensionTransfer: null,
  },
};

// ─── Shared opportunities builder ─────────────────────────────────

/**
 * Cross-vertical conversion blocks rendered on every country page.
 * Crypto, robo-advisors and savings accounts apply to every audience —
 * AU expats with AUD income on one side and country-resident investors
 * with AUD-denominated portfolios on the other. The brokers section
 * (above) handles share_broker; this list handles everything else.
 */
function defaultOpportunities(audienceLabel: string): CountryConfig["opportunities"] {
  return [
    {
      platformType: "crypto_exchange",
      eyebrow: "AUD Crypto",
      title: "Australian crypto exchanges",
      sub: `For ${audienceLabel} with AUD income or AUD-denominated portfolios. Verify residency eligibility per exchange before applying.`,
      compareHref: "/best/crypto",
      compareLabel: "Compare all Australian crypto exchanges",
    },
    {
      platformType: "robo_advisor",
      eyebrow: "Set-and-forget",
      title: "Australian robo-advisors",
      sub: "Auto-rebalanced AU-listed ETF portfolios. Best for AU-resident accounts (AU expats with home addresses) — country-resident investors should check eligibility.",
      compareHref: "/best/robo-advisors",
      compareLabel: "Compare all Australian robo-advisors",
    },
    {
      platformType: "savings_account",
      eyebrow: "AUD savings",
      title: "High-interest AUD savings accounts",
      sub: `For ${audienceLabel} holding AUD reserves or planning a property settlement — competitive AUD-denominated savings.`,
      compareHref: "/best/savings-accounts",
      compareLabel: "Compare all AUD savings accounts",
    },
  ];
}

// ─── China ─────────────────────────────────────────────────────────

export const CN_CONFIG: CountryConfig = {
  code: "cn",
  defaultActions: [
    { emoji: "🇨🇳", label: "Investing in Australia from China", sublabel: "DTA, FIRB, capital outflow rules — full guide", href: "/foreign-investment/china" },
    { emoji: "📈", label: "Brokers accessible from China", sublabel: "Some platforms restricted from mainland — IBKR works", href: "/compare/non-residents" },
    { emoji: "🏠", label: "FIRB-eligible new properties", sublabel: "New dwellings + commercial — established homes blocked till 2027", href: "/invest?firb=eligible" },
    { emoji: "💱", label: "CNY → AUD via SAFE-compliant routes", sublabel: "USD 50K/year individual quota — plan property settlements around it", href: "/foreign-investment/send-money-australia" },
    { emoji: "🛂", label: "Significant Investor Visa pathway", sublabel: "$5M+ removes FIRB and foreign-buyer constraints permanently", href: "/foreign-investment/siv" },
    { emoji: "👤", label: "Find a Mandarin-speaking advisor", sublabel: "Cross-border tax + FIRB + capital structuring", href: "/advisors" },
  ],
  slug: "china",
  countryName: "China",
  countryShort: "China",
  adjective: "Chinese",
  flag: "🇨🇳",
  currency: "CNY",
  currencySymbol: "¥",
  metadata: {
    title: "Investing in Australia from China — Tax Rates, Property & Brokers 2026",
    description: "Chinese residents investing in Australia: DTA dividend WHT 15%, FIRB property rules, established dwelling ban 2025–2027, capital outflow controls (USD 50K/year), and ASX broker access. Updated March 2026.",
    ogTitle: "Investing in Australia from China — 2026 Guide",
    ogSub: "DTA · FIRB · Capital Transfer · 2026",
  },
  hero: {
    flagPillText: "China · DTA effective 1990 · Updated March 2026",
    h1Plain: "Investing in Australia",
    h1Highlight: "from China",
    h1Sub: "Tax Rates, Capital Controls & How to Start in 2026",
    paragraph:
      "China is Australia's largest trading partner and a major source of property investment. The China–Australia DTA (effective 1990) reduces dividend withholding to 15%. The bigger practical challenge: China's strict capital outflow controls (USD 50,000 per person per year without SAFE approval) often determine the speed of moving money offshore — not the Australian rules.",
    stats: [
      { label: "Dividend WHT", value: "15%", sub: "Under CN-AU DTA" },
      { label: "Interest WHT", value: "10%", sub: "Standard ATO rate" },
      { label: "Royalties WHT", value: "10%", sub: "Under CN-AU DTA" },
    ],
  },
  toc: [
    { id: "audiences", label: "Two audiences" },
    { id: "property", label: "Property + FIRB" },
    { id: "capital-controls", label: "Capital outflow" },
    { id: "tax", label: "DTA + tax" },
    { id: "fx", label: "CNY → AUD" },
    { id: "expat", label: "Aussie expat in China" },
    { id: "migration", label: "Migration" },
    { id: "opportunities", label: "Platforms" },
    { id: "brokers", label: "Brokers" },
    { id: "faq", label: "FAQ" },
  ],
  criticalWarning: {
    title: "China Capital Outflow Controls: The Practical Bottleneck",
    body: "Individual residents can transfer up to **USD 50,000 per year** without special SAFE approval. Larger amounts require SAFE documentation. This is often the gating factor — not the Australian tax rules. Common workarounds: family members transferring separately, or wealth-management structures via Hong Kong or Singapore.",
  },
  audiences: {
    heading: "Mainland Chinese resident or Australian-Chinese?",
    sub: "Capital control rules apply to mainland residents; AU citizens/PRs are exempt.",
    cards: [
      {
        flagEmoji: "🇨🇳",
        title: "Mainland Chinese resident",
        accent: "blue",
        bullets: [
          "15% dividend WHT (DTA), 10% interest, 10% royalties",
          "FIRB required for all property purchases",
          "Established dwelling ban applies until 31 March 2027",
          "USD 50K/year individual outflow limit (SAFE)",
          "No AU CGT on listed shares (portfolio holdings <10%)",
          "Some international platforms restricted from mainland China",
        ],
      },
      {
        flagEmoji: "🇦🇺",
        title: "Australian citizen/PR (living in China)",
        accent: "amber",
        bullets: [
          "No FIRB needed (Australian citizen/PR)",
          "AU tax residency depends on length of stay + ties",
          "Can access AU super at preservation age",
          "DTA prevents double tax on Chinese-source income",
          "May lose 50% CGT discount if non-resident at sale",
        ],
      },
    ],
  },
  property: {
    eyebrow: "Property + FIRB",
    title: "Australian property as a Chinese buyer",
    sub: "Mainland Chinese residents face the same FIRB rules as other foreign buyers, plus the established-dwelling ban. New dwellings and commercial property remain open.",
    banHeadline: "Established Dwelling Ban: Active until 31 March 2027",
    banDetail: "Chinese residents cannot purchase existing Australian homes until at least 31 March 2027. New off-the-plan and new developments remain available with FIRB approval.",
    banLink: { label: "Full details", href: "/foreign-investment/guides/property-ban-2025" },
    tiles: [
      { label: "New dwelling / off-the-plan", state: "open", note: "FIRB approval required. Stamp duty surcharges apply (NSW/VIC 8%, QLD/WA/SA 7%)." },
      { label: "Established home", state: "blocked", note: "Banned for foreign buyers until 31 March 2027." },
      { label: "Commercial property", state: "open", note: "Open to Chinese buyers with FIRB approval. Popular with Chinese business investors." },
    ],
    countrySideRemindersHeading: "China-side reminders (SAFE, capital controls)",
    countrySideReminders: [
      "**SAFE approval** needed for any individual transfer above USD 50K/year — plan settlement timelines around this.",
      "**Family member transfers** are a common legitimate workaround — each family member uses their own annual quota.",
      "**HK/SG wealth structures** are sometimes used for larger commitments. Specialist cross-border structuring advice essential.",
    ],
    ctaLinks: [
      { label: "Browse commercial property listings", href: "/invest/commercial-property", primary: true },
      { label: "Buy AU property as a foreigner — full guide", href: "/foreign-investment/guides/buy-property-australia-foreigner" },
      { label: "Find a Mandarin-speaking buyer's agent", href: "/advisors" },
    ],
  },
  fxCorridor: {
    eyebrow: "CNY → AUD",
    title: "Sending money from China to Australia",
    sub: "Capital controls dominate the corridor — the binding constraint is SAFE compliance, not FX margin. Specialist providers can still save 1–2% on the actual conversion.",
    options: [
      {
        name: "Chinese banks (ICBC, BoC, CCB)",
        cost: "1–2% margin + fees",
        speed: "1–5 business days",
        note: "Default route for SAFE-approved transfers. Documentation overhead can be significant.",
        badge: "Default route",
        badgeAccent: "slate",
      },
      {
        name: "Wise / OFX (with HK/SG bridge)",
        cost: "0.5–1% margin",
        speed: "1–2 days",
        note: "Often used post-SAFE-approval via HK/SG accounts to compress FX cost.",
        badge: "Lower margin",
        badgeAccent: "emerald",
      },
      {
        name: "HK/SG private bank",
        cost: "Negotiable",
        speed: "Same-day",
        note: "For HNW investors with established offshore banking — preferred for property settlements.",
        badge: "HNW",
        badgeAccent: "blue",
      },
    ],
    ctaLabel: "Compare CNY → AUD live rates",
    ctaHref: "/foreign-investment/send-money-australia",
  },
  dta: {
    eyebrow: "China-Australia DTA",
    title: "China–Australia DTA withholding rates",
    sub: "The DTA (1990) reduces dividend WHT to 15% and royalties to 10%. Interest stays at the standard 10% rate.",
    countrySideHeading: "China tax treatment",
    rows: [
      { type: "Unfranked dividends", noTreaty: "30%", withTreaty: "15%", countrySideNote: "Reportable on Chinese individual income tax with credit for AU WHT" },
      { type: "Fully franked dividends", noTreaty: "0%", withTreaty: "0%", countrySideNote: "Subject to Chinese individual income tax" },
      { type: "Interest", noTreaty: "10%", withTreaty: "10%", countrySideNote: "Reportable in China; FTC available" },
      { type: "Royalties", noTreaty: "30%", withTreaty: "10%", countrySideNote: "DTA benefit; FTC available in China" },
      { type: "Capital gains (listed shares <10%)", noTreaty: "0% AU (exempt)", withTreaty: "0% AU (exempt)", countrySideNote: "Chinese individual income tax may apply" },
      { type: "Capital gains (AU property)", noTreaty: "Taxable in AU", withTreaty: "Taxable in AU", countrySideNote: "AU CGT applies; DTA credit in China" },
    ],
    countryReportingHeading: "China-side reporting essentials",
    countryReporting: [
      "Individual residents must declare worldwide income to Chinese tax authorities (since 2019 reform)",
      "AU dividends, interest and capital gains reportable on annual reconciliation",
      "Foreign tax credit available for AU WHT paid",
      "Most mainland brokerage holdings disclosed via CRS reporting between AU and China",
    ],
    ctaLabel: "Find a China-AU cross-border tax accountant",
    ctaHref: "/advisors/international-tax-specialists",
  },
  expat: {
    eyebrow: "Australian Expat",
    title: "If you're an Australian living in China",
    sub: "Chinese tax residency depends on length of stay and home ties. Most long-term residents become Chinese tax residents — and Chinese rules now reach worldwide income.",
    cards: [
      { title: "Tax residency", body: "183-day rule + permanent home test. Long-term residents become Chinese tax residents and report worldwide income (post-2019 reform). DTA prevents double taxation." },
      { title: "Australian super while away", body: "Preserved. Cannot contribute. Cannot access until preservation age. DASP not available to AU citizens/PRs (only to ex-temp-visa holders)." },
      { title: "Returning home — CGT rebasing", body: "Becoming AU tax resident again triggers a deemed acquisition of overseas assets at market value at re-entry. Plan disposals carefully around the move." },
    ],
  },
  migration: {
    eyebrow: "Permanent move",
    title: "Pathways from China to Australian residency",
    sub: "Common for Chinese investors seeking exemption from foreign-buyer rules — once you hold AU residency, FIRB and the dwelling ban no longer apply.",
    pathways: [
      { name: "Significant Investor Visa (188C → 888C)", note: "$5M+ in complying investments. No age limit. Permanent residence after 4 years on PR pathway." },
      { name: "Business Innovation (188A → 888A)", note: "$800K turnover business + $625K net assets. State nomination required. Under-55 generally." },
      { name: "Investor stream (188B → 888B)", note: "$1.5M in designated investments for 4 years; state-nominated." },
      { name: "Skilled migration (189/190)", note: "Points-tested; common for Chinese professionals in shortage occupations." },
    ],
    ctaLink: { label: "Find a China-AU migration agent", href: "/advisors/migration-agents" },
  },
  brokers: {
    title: "ASX brokers accessible from China",
    sub: "Note: access to some international platforms may be restricted from Mainland China. Verify before applying. IBKR is the primary working option.",
  },
  advisorAnchor: {
    eyebrow: "Cross-border specialist",
    title: "Find a Mandarin-speaking advisor",
    body: "Capital transfer structuring, FIRB applications and Chinese-side tax reporting all benefit from specialist input. Our directory includes Mandarin-speaking cross-border tax accountants and FIRB-experienced buyer's agents.",
    ctaLabel: "Find an Advisor",
    ctaHref: "/advisors",
    theme: "light",
  },
  opportunities: defaultOpportunities("Chinese investors and Australian-Chinese expats"),
  faq: [
    { q: "Can I buy ASX shares as a Chinese resident?", a: "Yes, through Interactive Brokers or another non-resident-friendly broker. Some Chinese-domestic platforms also offer ASX access. Once invested, your dividends are taxed at 15% AU WHT under the DTA, and listed-share capital gains under 10% are generally exempt from AU CGT." },
    { q: "What's the practical limit on moving money from China to Australia?", a: "Each individual can transfer up to USD 50,000 per year out of China without special SAFE approval. Larger amounts require SAFE documentation, often including evidence of the legitimate use of funds. Family members transferring separately, or working through HK/SG wealth-management structures, are common practical solutions." },
    { q: "Can I still buy an established Australian home from China?", a: "No — not until 31 March 2027 at the earliest. The foreign-buyer ban applies to mainland Chinese residents. New properties (off-the-plan, new dwellings) remain available with FIRB approval." },
    { q: "Do Chinese citizens pay Chinese tax on their Australian investments?", a: "Since the 2019 individual income tax reform, Chinese tax residents must declare worldwide income — including AU-source dividends, interest, royalties and capital gains. The China-Australia DTA prevents double taxation by allowing credit in China for AU withholding tax paid." },
    { q: "Is the Significant Investor Visa worth it?", a: "For HNW Chinese investors who want to remove the FIRB and foreign-buyer constraints permanently, the SIV ($5M into complying investments) is the most direct path. It bypasses the points-tested skilled stream and has no age limit. Specialist migration advice essential — eligible-investment criteria are strict." },
    { q: "What's CRS and does it apply to me?", a: "Australia and China both participate in the Common Reporting Standard. AU financial institutions automatically report account information about Chinese tax residents to the ATO, which shares with Chinese tax authorities. Practical effect: assume your AU holdings are visible to Chinese authorities for tax compliance purposes." },
  ],
  related: [
    { title: "Buy Property in Australia as a Foreigner", href: "/foreign-investment/guides/buy-property-australia-foreigner" },
    { title: "Foreign Buyer Property Ban 2025–2027", href: "/foreign-investment/guides/property-ban-2025" },
    { title: "FIRB Application Guide", href: "/foreign-investment/guides/firb-application-guide" },
    { title: "Send Money to Australia (CNY to AUD)", href: "/foreign-investment/send-money-australia" },
    { title: "Stamp Duty by State", href: "/foreign-investment/guides/stamp-duty-foreign-buyers" },
    { title: "Significant Investor Visa pathway", href: "/foreign-investment/siv" },
  ],
  leadForms: {
    pdfChecklist: null,
    propertyShortlist: null,
    fxQuote: null,
    pensionTransfer: null,
  },
};

// ─── India ─────────────────────────────────────────────────────────

export const IN_CONFIG: CountryConfig = {
  code: "in",
  defaultActions: [
    { emoji: "🇮🇳", label: "NRI guide to investing in Australia", sublabel: "DTA, ECTA, FIRB, DASP — NRI/OCI/temp-visa rules covered", href: "/foreign-investment/india" },
    { emoji: "📈", label: "Brokers that accept Indian residents", sublabel: "IBKR + Saxo work for NRIs; most AU retail brokers do not", href: "/compare/non-residents" },
    { emoji: "🏠", label: "FIRB-eligible new properties", sublabel: "Sydney/Melbourne off-the-plan most popular with NRI buyers", href: "/invest?firb=eligible" },
    { emoji: "💱", label: "INR → AUD (within LRS)", sublabel: "US$250K/year LRS limit — Wise/Instarem typically beats banks", href: "/foreign-investment/send-money-australia" },
    { emoji: "💰", label: "Claim your stranded super (DASP)", sublabel: "If you worked in AU on a temp visa — 35% tax but worth claiming", href: "/foreign-investment/super" },
    { emoji: "👤", label: "Find an India-AU tax specialist", sublabel: "Schedule FA reporting, DASP, FIRB, ECTA expertise", href: "/advisors/international-tax-specialists" },
  ],
  slug: "india",
  countryName: "India",
  countryShort: "India",
  adjective: "Indian",
  flag: "🇮🇳",
  currency: "INR",
  currencySymbol: "₹",
  metadata: {
    title: "Investing in Australia from India (2026) — NRI Guide to Tax, Property & Shares",
    description: "NRI guide to investing in Australia: India-Australia DTA (15% WHT all categories), ECTA 2022, FIRB rules for non-resident Indians, ASX shares, super DASP for ex-temp-visa holders, brokers and visa pathways.",
    ogTitle: "Investing in Australia from India — 2026 NRI Guide",
    ogSub: "NRI · DTA · ECTA · FIRB · DASP · 2026",
  },
  hero: {
    flagPillText: "India · ECTA 2022 · DTA in force · Updated 2026",
    h1Plain: "Investing in Australia",
    h1Highlight: "from India",
    h1Sub: "NRI Guide: Tax, Property & Shares in 2026",
    paragraph:
      "India is Australia's 5th largest source of foreign investment, and the Indian diaspora is Australia's third largest immigrant group. Whether you are an NRI investing from India, an Indian-Australian on a temporary visa, or an Australian citizen of Indian origin living abroad — the rules are different in each case. This guide covers them all.",
    stats: [
      { label: "Dividend WHT", value: "15%", sub: "Under India-AU DTA" },
      { label: "Interest WHT", value: "15%", sub: "Under India-AU DTA" },
      { label: "Royalties WHT", value: "15%", sub: "Under India-AU DTA" },
      { label: "FIRB Threshold", value: "$310M", sub: "General business" },
    ],
  },
  toc: [
    { id: "audiences", label: "Three audiences" },
    { id: "property", label: "FIRB + property" },
    { id: "tax", label: "DTA + ECTA" },
    { id: "retirement", label: "Stranded super (DASP)" },
    { id: "fx", label: "INR → AUD" },
    { id: "expat", label: "Aussie expat in India" },
    { id: "migration", label: "Visa pathways" },
    { id: "opportunities", label: "Platforms" },
    { id: "brokers", label: "Brokers" },
    { id: "faq", label: "FAQ" },
  ],
  audiences: {
    heading: "NRI, Indian-Australian, or temporary visa holder?",
    sub: "Your Australian tax residency status determines which rules apply.",
    cards: [
      {
        flagEmoji: "🇮🇳",
        title: "NRI in India (non-resident)",
        accent: "blue",
        bullets: [
          "15% dividend WHT on unfranked ASX dividends",
          "FIRB required for all property purchases",
          "Established dwelling ban applies",
          "No AU CGT on listed ASX shares (portfolio)",
          "Capital gains from AU property taxed in Australia",
          "LRS US$250K/year cap on outbound transfers from India",
        ],
      },
      {
        flagEmoji: "🇦🇺",
        title: "Australian citizen/PR (living in India)",
        accent: "amber",
        bullets: [
          "No FIRB needed for property",
          "May lose AU tax residency if living in India long-term",
          "Can access Australian super at preservation age",
          "CGT 50% discount may be lost if non-resident at sale",
          "India–Australia DTA prevents double taxation",
          "Australian citizenship is the cleanest exit from FIRB rules",
        ],
      },
    ],
  },
  property: {
    eyebrow: "FIRB Rules",
    title: "FIRB property rules for Indian investors",
    sub: "FIRB rules depend on your residency status — not your nationality. Indian-Australian citizens and PRs are exempt; NRIs are not.",
    banHeadline: "Established Dwelling Ban: Active until 31 March 2027",
    banDetail: "Non-resident NRIs cannot purchase existing Australian homes until at least 31 March 2027. Australian citizens of Indian origin — even living in India — are exempt.",
    banLink: { label: "Full details", href: "/foreign-investment/guides/property-ban-2025" },
    tiles: [
      { label: "New dwelling / off-the-plan", state: "open", note: "FIRB approval required for NRIs. Sydney/Melbourne off-the-plan apartments particularly popular." },
      { label: "Established home", state: "blocked", note: "Banned for non-resident NRIs until 31 March 2027." },
      { label: "Commercial property", state: "open", note: "Open with FIRB approval — separate thresholds. Popular with Indian business investors." },
    ],
    countrySideRemindersHeading: "India-side reminders (LRS, FEMA, RBI)",
    countrySideReminders: [
      "**Liberalised Remittance Scheme (LRS)** caps individual outbound transfers at US$250,000 per financial year (April–March).",
      "**FEMA + RBI** governance applies to overseas property purchases. Document all transfers.",
      "**Rental income** earned in Australia by NRIs is taxable in India under the DTA, with credit for AU tax paid.",
    ],
    ctaLinks: [
      { label: "Use our FIRB property guide", href: "/foreign-investment/property", primary: true },
      { label: "Buy AU property as a foreigner — full guide", href: "/foreign-investment/guides/buy-property-australia-foreigner" },
      { label: "Find an India-AU property tax specialist", href: "/advisors/international-tax-specialists" },
    ],
  },
  fxCorridor: {
    eyebrow: "INR → AUD",
    title: "Sending money from India to Australia",
    sub: "LRS limits dominate the corridor (US$250K/year per individual). On a US$200K transfer, the difference between a high-street bank and a specialist provider is ~US$3,000–US$6,000.",
    options: [
      {
        name: "Indian banks (HDFC, ICICI, SBI)",
        cost: "1.5–3% margin",
        speed: "2–5 business days",
        note: "Default route. LRS-compliant, but margin and fees stack up on larger transfers.",
        badge: "Default route",
        badgeAccent: "slate",
      },
      {
        name: "Wise / Instarem / Remitly",
        cost: "0.5–1% margin",
        speed: "Same-day to 2 days",
        note: "Specialist providers — significantly tighter spreads. RBI-licensed, LRS-compliant.",
        badge: "Recommended",
        badgeAccent: "emerald",
      },
      {
        name: "Multi-currency NRE/NRO accounts",
        cost: "0.4–0.8% margin",
        speed: "Instant balance hold",
        note: "For NRIs with NRE/NRO accounts — useful for ongoing AU income flows (rental, dividends).",
        badge: "For NRIs",
        badgeAccent: "blue",
      },
    ],
    ctaLabel: "Compare INR → AUD live rates",
    ctaHref: "/foreign-investment/send-money-australia",
  },
  dta: {
    eyebrow: "DTA + ECTA",
    title: "India–Australia DTA & ECTA 2022",
    sub: "The India-Australia DTA prevents double taxation. The 2022 ECTA also includes investment provisions and reduces tariffs on Australian exports to India.",
    countrySideHeading: "India tax treatment",
    rows: [
      { type: "Unfranked dividends", noTreaty: "30%", withTreaty: "15%", countrySideNote: "Taxed in India with credit for AU WHT" },
      { type: "Fully franked dividends", noTreaty: "0%", withTreaty: "0%", countrySideNote: "Indian income tax may apply" },
      { type: "Interest", noTreaty: "10%", withTreaty: "15%", countrySideNote: "Taxed in India with credit for AU WHT" },
      { type: "Royalties", noTreaty: "30%", withTreaty: "15%", countrySideNote: "Taxed in India with credit for AU WHT" },
      { type: "Capital gains (listed shares)", noTreaty: "0% (exempt)", withTreaty: "0% (exempt)", countrySideNote: "Indian CGT may apply" },
      { type: "Capital gains (AU property)", noTreaty: "Taxable in AU", withTreaty: "Taxable in AU", countrySideNote: "AU CGT applies — no exemption" },
    ],
    countryReportingHeading: "India-side reporting essentials",
    countryReporting: [
      "AU dividends, interest, royalties → Schedule FA + Schedule TR (Indian Income Tax Return)",
      "Foreign assets above ₹20L disclosure threshold under the Black Money Act",
      "AU rental income reported under 'Income from House Property' with FTC for AU tax",
      "Capital gains on AU property → Indian CGT with credit for AU CGT under DTA",
      "Filing deadline: typically 31 July for individual ITR (Indian financial year ends 31 March)",
    ],
    ctaLabel: "Find an India-AU cross-border tax CA",
    ctaHref: "/advisors/international-tax-specialists",
  },
  retirementTransfer: {
    eyebrow: "Stranded super",
    title: "Departing Australia Superannuation Payment (DASP)",
    sub: "Many Indians who worked in Australia on temporary visas have superannuation funds they may be able to claim. DASP is one of the most-overlooked windfalls for ex-temp-visa holders.",
    callout: "**DASP is for ex-temp-visa holders only**, not Australian citizens or PRs. If you became a citizen or PR, your super stays in the AU system until preservation age.",
    accordions: [
      {
        summary: "When DASP applies",
        bullets: [
          "You worked in Australia on a temporary visa (457, 482, 417 WHV, student) and your employer contributed to super",
          "You have permanently departed Australia and your visa has expired or been cancelled",
          "You have no intention to return as a resident",
          "Apply through the ATO's online DASP system after departure",
        ],
      },
      {
        summary: "DASP tax rates (2026)",
        bullets: [
          "**35%** on the taxable component for most ex-temporary visa holders",
          "**65%** for ex-Working Holiday Maker (WHV) visa holders — high but still claimable",
          "**0%** on tax-free component (rare for short-stay workers)",
          "Higher than ordinary super tax — but still worthwhile for balances above ~AUD 5K",
        ],
      },
    ],
    ctaLinks: [
      { label: "Learn more about DASP", href: "/foreign-investment/super", primary: true },
      { label: "Speak to a DASP claim specialist", href: "/advisors/international-tax-specialists" },
    ],
  },
  expat: {
    eyebrow: "Australian Expat",
    title: "If you're an Australian living in India",
    sub: "Australian citizens of Indian origin living in India face a different set of rules — no FIRB, but Indian residency may apply for tax purposes.",
    cards: [
      { title: "Tax residency", body: "Indian tax residency triggered by 182+ days/year. Indian residents pay tax on worldwide income, with DTA credit for AU tax paid. Non-residents in India are taxed only on Indian-source income." },
      { title: "Australian super", body: "Preserved. Cannot make personal contributions while non-resident. Can access at AU preservation age. Indian-side tax treatment of AU super lump sums is complex — specialist advice essential." },
      { title: "Returning home", body: "Becoming AU tax resident again triggers a deemed acquisition of overseas (Indian) assets at market value at re-entry. Plan major disposals around the move." },
    ],
  },
  migration: {
    eyebrow: "Visa Pathways",
    title: "Visa options for Indian investors",
    sub: "Australia offers business and investment streams attractive to HNW Indian investors. Skilled migration is the most common pathway for working-age applicants.",
    pathways: [
      { name: "Significant Investor Visa (188C/888C)", note: "$5M+ in complying investments. Popular with HNW Indian individuals. Permanent residence via 888C." },
      { name: "Business Innovation (188A → 888A)", note: "$800K turnover business + $625K net assets. State nomination required. Age limit ~55." },
      { name: "Investor stream (188B → 888B)", note: "$1.5M in designated investments for 4 years; state-nominated." },
      { name: "Skilled migration (189/190)", note: "Points-tested. Most common pathway for Indian professionals in shortage occupations." },
    ],
    ctaLink: { label: "Find a specialist migration agent", href: "/advisors/migration-agents" },
  },
  brokers: {
    title: "ASX brokers that accept Indian residents",
    sub: "IBKR and Saxo are the primary options for Indian residents investing in ASX. Verify eligibility directly before applying.",
  },
  advisorAnchor: {
    eyebrow: "Cross-border specialist",
    title: "Find an advisor for Indian investors",
    body: "India–Australia cross-border tax, FIRB property rules, DASP claims and investment visas each require specialist expertise. An advisor experienced with Indian clients can save you significant time and money.",
    ctaLabel: "Find a Tax Specialist",
    ctaHref: "/advisors/international-tax-specialists",
    theme: "light",
  },
  opportunities: defaultOpportunities("Indian investors and NRIs"),
  faq: [
    { q: "Can I buy ASX shares as an NRI in India?", a: "Yes — through Interactive Brokers, Saxo, or another non-resident-friendly broker. You'll be taxed at 15% AU WHT on unfranked dividends under the DTA. Indian-side tax (with FTC for AU WHT) applies on your annual ITR." },
    { q: "What's the LRS limit for sending money to Australia?", a: "Under India's Liberalised Remittance Scheme, individual residents can transfer up to US$250,000 per Indian financial year (April–March) for permitted purposes including investment in foreign assets and property. Property purchase is a permitted purpose; capital flows beyond LRS need RBI approval." },
    { q: "Do I need FIRB approval as an NRI buying Australian property?", a: "Yes. Non-resident NRIs (not Australian citizens or PRs) need FIRB approval for any Australian property purchase. New dwellings are generally approved; established dwellings are banned for foreign buyers until 31 March 2027." },
    { q: "Can I claim my Australian super as an NRI?", a: "Only if you previously worked in Australia on a temporary visa (DASP). DASP is not available to Australian citizens or PRs — only to ex-temp-visa holders who have permanently departed. The DASP tax rate is 35% for most ex-temp visas, 65% for Working Holiday Makers." },
    { q: "What's the ECTA and does it affect investment?", a: "The Australia–India Economic Cooperation and Trade Agreement (in force December 2022) reduces tariffs on Australian exports to India and includes some investment-friendly provisions. It does not change DTA rates, FIRB thresholds or property rules — but it improves the broader investment relationship." },
    { q: "Does India tax my AU rental income?", a: "Yes. Indian tax residents must declare AU-source rental income on their ITR under 'Income from House Property'. The India-Australia DTA permits a foreign tax credit for the AU tax paid on the same income — preventing double taxation." },
  ],
  related: [
    { title: "Buy Property in Australia as a Foreigner", href: "/foreign-investment/guides/buy-property-australia-foreigner" },
    { title: "Foreign Buyer Property Ban 2025–2027", href: "/foreign-investment/guides/property-ban-2025" },
    { title: "ASX Brokers for Non-Residents", href: "/compare/non-residents" },
    { title: "Departing Australia Super (DASP)", href: "/foreign-investment/super" },
    { title: "Send Money to Australia (INR to AUD)", href: "/foreign-investment/send-money-australia" },
    { title: "Tax Guide for Non-Residents", href: "/foreign-investment/tax" },
  ],
  leadForms: {
    pdfChecklist: null,
    propertyShortlist: null,
    fxQuote: null,
    pensionTransfer: null,
  },
};

// ─── Hong Kong ─────────────────────────────────────────────────────

export const HK_CONFIG: CountryConfig = {
  code: "hk",
  defaultActions: [
    { emoji: "🤝", label: "Get matched for HK investors", sublabel: "60-second quiz — broker, advisor, or property strategy", href: "/quiz?country=hong-kong" },
    { emoji: "🇭🇰", label: "Investing in Australia from Hong Kong", sublabel: "DTA, no HK CGT, FIRB, ASX brokers — full guide", href: "/foreign-investment/hong-kong" },
    { emoji: "📈", label: "Brokers that accept HK residents", sublabel: "IBKR HK + Saxo HK most common", href: "/compare/non-residents" },
    { emoji: "🏠", label: "FIRB-eligible new properties", sublabel: "Sydney/Melbourne CBD apartments most popular with HK buyers", href: "/invest?firb=eligible" },
    { emoji: "💱", label: "HKD → AUD transfers", sublabel: "Specialist FX vs HK retail bank — saves 1–2%", href: "/foreign-investment/send-money-australia" },
    { emoji: "🛂", label: "HK → AU pathway visas", sublabel: "BN(O)/SAR/HKBN holders have a reserved migration stream", href: "/advisors/migration-agents" },
    { emoji: "👤", label: "Find an HK-AU advisor", sublabel: "Cross-border tax + AU residency + FIRB", href: "/advisors" },
  ],
  // Phase 1 model country for Country Mode homepage personalisation.
  // The other 11 country configs fall back to global until Phase 2 fills
  // them in. Numbers are conservative — supply thresholds (2 listings,
  // 2 experts, 3 platforms) gate visibility regardless.
  homepageListingFilters: {
    // HK investors most often consider AU commercial property, business
    // acquisitions, and private-market funds (per addendum module copy).
    // These map to existing investment_listings.vertical slugs.
    verticals: ["commercial-property", "buy-business", "funds"],
    firb: false,
  },
  homepageExpertFilters: {
    // Cross-border tax, buyer's agents, mortgage brokers — the three
    // most-asked expert types for HK→AU investors. languages includes
    // zh (Chinese, encompasses both Mandarin and Cantonese readers via
    // ISO 639-1) and the Cantonese-specific yue tag where the
    // `professionals.languages` jsonb has it.
    specialties: ["tax", "buyers-agent", "mortgage-broker"],
    languages: ["zh", "yue", "en"],
  },
  homepagePlatformFilters: {
    // ASX shares + crypto are the active inbound corridors. Non-residents
    // flag is on so we surface only brokers explicitly accepting HK IDs.
    types: ["share_broker", "crypto_exchange"],
    nonResidentsOnly: true,
  },
  // Featured tools for the global tools-strip re-rank. `slug` is the
  // tool's href — HomeToolsStrip hoists the matching entries to the
  // front of the existing list (no replacement, no shrinkage). FIRB
  // cost + CGT + mortgage are the three calculators most relevant to
  // HK property + ASX investors. WHT calculator and FX-corridor
  // calculator are flagged for Phase 2 once they land in the global
  // tools list — adding them to homepageFeaturedTools today would be
  // a no-op because there's nothing for the rerank to hoist.
  homepageFeaturedTools: [
    { slug: "/property/foreign-investment", label: "FIRB cost (HK buyers)" },
    { slug: "/cgt-calculator", label: "CGT for non-residents" },
    { slug: "/mortgage-calculator", label: "Mortgage repayments" },
  ],
  preferredLanguages: ["en", "zh", "yue"],
  slug: "hong-kong",
  countryName: "Hong Kong",
  countryShort: "HK",
  adjective: "Hong Kong",
  flag: "🇭🇰",
  currency: "HKD",
  currencySymbol: "HK$",
  metadata: {
    title: "Investing in Australia from Hong Kong — Tax Rates, Brokers & Property 2026",
    description: "Hong Kong residents investing in Australia: HK-AU DTA (15% dividend WHT, 5% royalties), zero HK CGT advantage, FIRB property rules, established dwelling ban 2025–2027, ASX broker eligibility. Updated March 2026.",
    ogTitle: "Investing in Australia from Hong Kong — 2026 Guide",
    ogSub: "DTA · No HK CGT · FIRB · ASX Brokers · 2026",
  },
  hero: {
    flagPillText: "Hong Kong · DTA effective 2011 · Updated March 2026",
    h1Plain: "Investing in Australia",
    h1Highlight: "from Hong Kong",
    h1Sub: "Tax-Efficient Strategies for HK Investors in 2026",
    paragraph:
      "Hong Kong is a major source of capital for Australian real estate and shares. The HK–AU DTA (effective 2011) reduces dividend withholding to 15% and royalty WHT to just 5%. Combined with Hong Kong's zero personal CGT and territorial tax system, this can mean near-zero total tax on Australian share gains for HK-resident investors.",
    stats: [
      { label: "Dividend WHT", value: "15%", sub: "Under HK-AU DTA" },
      { label: "Interest WHT", value: "10%", sub: "Standard ATO rate" },
      { label: "Royalties WHT", value: "5%", sub: "Under HK-AU DTA" },
    ],
  },
  toc: [
    { id: "audiences", label: "Two audiences" },
    { id: "property", label: "Property + FIRB" },
    { id: "tax", label: "DTA + HK tax" },
    { id: "fx", label: "HKD → AUD" },
    { id: "expat", label: "Aussie expat in HK" },
    { id: "migration", label: "Migration" },
    { id: "opportunities", label: "Platforms" },
    { id: "brokers", label: "Brokers" },
    { id: "faq", label: "FAQ" },
  ],
  audiences: {
    heading: "HK resident investing from HK, or Australian expat in HK?",
    sub: "Both audiences benefit from HK's tax-efficient regime. The DTA helps both.",
    cards: [
      {
        flagEmoji: "🇭🇰",
        title: "Hong Kong resident",
        accent: "blue",
        bullets: [
          "15% dividend WHT, 10% interest, 5% royalties (DTA)",
          "HK has no personal CGT — AU exempt CGT on listed shares means near-zero total tax",
          "FIRB approval required for property",
          "Foreign-buyer surcharges still apply on AU property",
          "HK's territorial system: foreign-source income generally not taxed in HK",
        ],
      },
      {
        flagEmoji: "🇦🇺",
        title: "Australian expat in HK",
        accent: "amber",
        bullets: [
          "Often retain AU tax residency (ATO test based on permanent home, ties)",
          "AU super preserved; cannot contribute personally while non-resident",
          "DTA prevents double taxation",
          "On return: CGT rebasing applies; plan disposals around the move",
          "Can use HK structures for property purchases — specialist advice essential",
        ],
      },
    ],
  },
  property: {
    eyebrow: "Property + FIRB",
    title: "Australian property as a Hong Kong buyer",
    sub: "HK residents face standard foreign-buyer rules. The 2025–2027 ban applies; new dwellings and commercial property remain open.",
    banHeadline: "Established Dwelling Ban: Active until 31 March 2027",
    banDetail: "Hong Kong residents cannot purchase existing Australian homes until at least 31 March 2027. New developments and off-the-plan properties remain available with FIRB approval.",
    banLink: { label: "Full details", href: "/foreign-investment/guides/property-ban-2025" },
    tiles: [
      { label: "New dwelling / off-the-plan", state: "open", note: "FIRB approval required. Stamp duty surcharges apply (NSW/VIC 8%, QLD/WA/SA 7%)." },
      { label: "Established home", state: "blocked", note: "Banned for foreign buyers until 31 March 2027." },
      { label: "Commercial property", state: "open", note: "Open to HK buyers with FIRB approval. Higher thresholds for commercial than residential." },
    ],
    countrySideRemindersHeading: "HK-side reminders (territorial tax, no CGT)",
    countrySideReminders: [
      "**HK has no CGT** on personal investment gains — AU exempt CGT on listed shares can mean total CGT of zero.",
      "**Territorial tax** — HK only taxes HK-source income; AU dividends and rental income are foreign-source and generally not taxable in HK.",
      "**Stamp duty surcharges** still apply at the AU state level — check state-specific rates before purchase.",
    ],
    ctaLinks: [
      { label: "Browse commercial property listings", href: "/invest/commercial-property", primary: true },
      { label: "Buy AU property as a foreigner — full guide", href: "/foreign-investment/guides/buy-property-australia-foreigner" },
      { label: "Find a Cantonese/Mandarin advisor", href: "/advisors" },
    ],
  },
  fxCorridor: {
    eyebrow: "HKD → AUD",
    title: "Sending money from Hong Kong to Australia",
    sub: "HKD-AUD is one of the most liquid corridors. Specialist providers consistently beat HK retail banks by 1–2% on FX margin.",
    options: [
      {
        name: "HK retail banks (HSBC, BoC, Hang Seng)",
        cost: "1–2% margin + fees",
        speed: "1–3 business days",
        note: "Default for many; HSBC HK ↔ HSBC AU is convenient but not cheapest.",
        badge: "Default route",
        badgeAccent: "slate",
      },
      {
        name: "Wise / OFX / Currencies Direct",
        cost: "0.3–0.7% margin",
        speed: "Same-day to 2 days",
        note: "Specialist providers — tightest spreads. Regulated; LRS-style limits don't apply in HK.",
        badge: "Recommended",
        badgeAccent: "emerald",
      },
      {
        name: "HK private banking",
        cost: "Negotiable",
        speed: "Same-day",
        note: "For HNW investors with established HK private bank relationships — often best for property settlements.",
        badge: "HNW",
        badgeAccent: "blue",
      },
    ],
    ctaLabel: "Compare HKD → AUD live rates",
    ctaHref: "/foreign-investment/send-money-australia",
  },
  dta: {
    eyebrow: "HK-AU DTA",
    title: "Hong Kong–Australia DTA: tax-efficient combination",
    sub: "The DTA effective from 2011 plus HK's territorial system + zero CGT can produce near-zero total tax on AU-source share gains for HK residents.",
    countrySideHeading: "HK tax treatment",
    rows: [
      { type: "Unfranked dividends", noTreaty: "30%", withTreaty: "15%", countrySideNote: "HK does not tax foreign-source dividends — 15% AU WHT is final tax" },
      { type: "Fully franked dividends", noTreaty: "0%", withTreaty: "0%", countrySideNote: "0% AU + 0% HK = total 0% tax on franked AU dividends" },
      { type: "Interest", noTreaty: "10%", withTreaty: "10%", countrySideNote: "HK does not tax foreign-source interest — 10% AU WHT is final tax" },
      { type: "Royalties", noTreaty: "30%", withTreaty: "5%", countrySideNote: "Significant DTA benefit; final tax in most cases" },
      { type: "Capital gains (listed shares)", noTreaty: "0% AU (exempt)", withTreaty: "0% AU (exempt)", countrySideNote: "HK has no personal CGT — total CGT on listed AU shares: zero" },
      { type: "Capital gains (AU property)", noTreaty: "Taxable in AU", withTreaty: "Taxable in AU", countrySideNote: "AU CGT applies (foreign-resident); no HK CGT" },
    ],
    countryReportingHeading: "HK-side reporting essentials",
    countryReporting: [
      "Hong Kong's territorial tax system means foreign-source income is generally not subject to HK profits tax or salaries tax",
      "HK does not require declaration of foreign investment income on individual tax returns (no equivalent of Schedule FA / SA106)",
      "Result: AU source income ends with the AU WHT in most cases — no second-layer HK tax",
      "HK does participate in CRS — AU financial institution reporting flows back to HK Inland Revenue Department",
    ],
    ctaLabel: "Find an HK-AU cross-border tax accountant",
    ctaHref: "/advisors/international-tax-specialists",
  },
  expat: {
    eyebrow: "Australian Expat",
    title: "If you're an Australian living in Hong Kong",
    sub: "AU tax residency depends on the permanent-home test, not just days. Many AU expats in HK retain AU tax residency unintentionally — and pay AU tax on worldwide income.",
    cards: [
      { title: "AU tax residency test", body: "ATO uses a multi-factor test: permanent home, family ties, employment, intention. Many AU expats in HK technically remain AU tax residents and owe AU tax on worldwide income. Specialist advice essential before assuming non-resident status." },
      { title: "AU super while in HK", body: "Preserved. Cannot make personal contributions as non-resident. Can access at preservation age. HK does not tax AU super lump sums (territorial system)." },
      { title: "Returning home", body: "Becoming AU tax resident again triggers a deemed acquisition of overseas assets at market value at re-entry. HK gains accrued during your HK period typically aren't AU-taxable, but plan disposals carefully." },
    ],
  },
  migration: {
    eyebrow: "Permanent move",
    title: "Pathways from Hong Kong to Australia",
    sub: "Hong Kong has been a major source of Australia-bound migrants since 2020. Several pathways exist for HK passport-holders and residents.",
    pathways: [
      { name: "Skilled visas (189/190/491)", note: "Points-tested. HK-trained professionals (medicine, finance, IT) commonly qualify in shortage occupations." },
      { name: "HK pathway visas (191/189 reserved stream)", note: "Reserved places for HK residents who hold or held HK BN(O), SAR or HKBN passports — pathway to PR after 4 years on a temporary stream." },
      { name: "Significant Investor (188C/888C)", note: "$5M+ in complying investments. Popular with HK HNW migrants." },
      { name: "Employer Sponsored (482 → 186)", note: "Temporary skilled visa converting to PR. Common for HK finance/tech professionals." },
    ],
    ctaLink: { label: "Find an HK-AU migration specialist", href: "/advisors/migration-agents" },
  },
  brokers: {
    title: "ASX brokers that accept Hong Kong residents",
    sub: "Verify eligibility directly with the broker before applying. IBKR HK and Saxo HK are common.",
  },
  advisorAnchor: {
    eyebrow: "Cross-border specialist",
    title: "Find an advisor for Hong Kong investors",
    body: "Some Australian advisors specialise in Hong Kong clients and speak Cantonese or Mandarin. The HK-AU bit usually comes down to AU tax residency, FIRB and stamp duty — all worth getting right with a specialist.",
    ctaLabel: "Find an Advisor",
    ctaHref: "/advisors",
    theme: "light",
  },
  opportunities: defaultOpportunities("Hong Kong investors and Australian expats in HK"),
  faq: [
    { q: "Can I buy ASX shares as a Hong Kong resident?", a: "Yes — through any non-resident-friendly broker (IBKR, Saxo, etc.). Under the HK-AU DTA, unfranked dividends are taxed at 15% AU WHT (rather than 30%); fully franked dividends are 0% WHT. Hong Kong's territorial system means no second-layer HK tax on AU dividends, and HK has no personal CGT — so total tax on AU listed-share gains can be near zero." },
    { q: "What is the established-dwelling ban and does it apply to me?", a: "Yes — the foreign-buyer ban applies to HK residents. Until 31 March 2027 at the earliest, foreign persons cannot purchase established Australian homes. New properties (off-the-plan, new dwellings) remain available with FIRB approval." },
    { q: "Does Hong Kong tax my Australian dividends?", a: "Generally no. HK uses a territorial tax system — foreign-source income (including AU dividends, interest and rental income) is not subject to HK profits tax or salaries tax. The 15% AU dividend WHT is typically your final tax on the income." },
    { q: "I'm an Australian living in Hong Kong — am I still an AU tax resident?", a: "Probably yes, in many cases. The ATO uses a multi-factor test (permanent home, family ties, employment, intention) — not just a days-based test. Many AU expats in HK technically remain AU tax residents and owe AU tax on worldwide income. Engage a specialist before assuming non-resident status." },
    { q: "What pathways exist from HK to AU residency?", a: "Skilled migration (189/190/491), the HK-specific pathway visa stream for HK BN(O)/SAR/HKBN passport holders, and the Significant Investor Visa (188C → 888C) at $5M+. Recent years have seen high HK→AU migration; specialist migration advice strongly recommended." },
  ],
  related: [
    { title: "Buy Property in Australia as a Foreigner", href: "/foreign-investment/guides/buy-property-australia-foreigner" },
    { title: "Foreign Buyer Property Ban 2025–2027", href: "/foreign-investment/guides/property-ban-2025" },
    { title: "ASX Brokers for Non-Residents", href: "/compare/non-residents" },
    { title: "Send Money to Australia (HKD to AUD)", href: "/foreign-investment/send-money-australia" },
    { title: "Tax Guide for Non-Residents", href: "/foreign-investment/tax" },
    { title: "HK pathway visas", href: "/advisors/migration-agents" },
  ],
  leadForms: {
    pdfChecklist: null,
    propertyShortlist: null,
    fxQuote: null,
    pensionTransfer: null,
  },
};

// ─── Singapore ─────────────────────────────────────────────────────

export const SG_CONFIG: CountryConfig = {
  code: "sg",
  defaultActions: [
    { emoji: "🇸🇬", label: "Investing in Australia from Singapore", sublabel: "DTA, FTA, territorial tax, no SG CGT — full guide", href: "/foreign-investment/singapore" },
    { emoji: "📈", label: "Brokers that accept SG residents", sublabel: "IBKR Singapore + Saxo Singapore primary options", href: "/compare/non-residents" },
    { emoji: "🏠", label: "FIRB-eligible new properties", sublabel: "FTA gives higher commercial thresholds — residential rules unchanged", href: "/invest?firb=eligible" },
    { emoji: "💱", label: "SGD → AUD transfers", sublabel: "Wise/OFX vs DBS/OCBC/UOB — saves 1–2% on size", href: "/foreign-investment/send-money-australia" },
    { emoji: "👤", label: "Find an SG-AU specialist", sublabel: "Multilingual cross-border tax + FIRB advisors", href: "/advisors" },
  ],
  slug: "singapore",
  countryName: "Singapore",
  countryShort: "Singapore",
  adjective: "Singapore",
  flag: "🇸🇬",
  currency: "SGD",
  currencySymbol: "S$",
  metadata: {
    title: "Investing in Australia from Singapore — Tax Rates, Brokers & Property Guide 2026",
    description: "Singapore residents investing in Australia: SG-AU DTA (15% dividend WHT), Singapore territorial tax + zero CGT advantage, FTA property thresholds, FIRB rules, ASX broker access. Updated March 2026.",
    ogTitle: "Investing in Australia from Singapore — 2026 Guide",
    ogSub: "DTA · FTA · No SG CGT · FIRB · 2026",
  },
  hero: {
    flagPillText: "Singapore · DTA effective 2010 · FTA · Updated March 2026",
    h1Plain: "Investing in Australia",
    h1Highlight: "from Singapore",
    h1Sub: "Tax-Efficient Investing for SG Residents",
    paragraph:
      "Singapore is one of Australia's top five sources of foreign investment. The SG-AU DTA (effective 2010) reduces dividend WHT to 15%, and Singapore's FTA status gives SG residents higher FIRB property thresholds. Singapore's territorial tax system + zero personal CGT means AU dividend WHT is often the only tax on your AU portfolio.",
    stats: [
      { label: "Dividend WHT", value: "15%", sub: "Under SG-AU DTA" },
      { label: "Interest WHT", value: "10%", sub: "Standard ATO rate" },
      { label: "Royalties WHT", value: "10%", sub: "Under SG-AU DTA" },
    ],
  },
  toc: [
    { id: "audiences", label: "Two audiences" },
    { id: "property", label: "Property + FIRB" },
    { id: "tax", label: "DTA + SG tax" },
    { id: "fx", label: "SGD → AUD" },
    { id: "expat", label: "Aussie expat in SG" },
    { id: "migration", label: "Migration" },
    { id: "opportunities", label: "Platforms" },
    { id: "brokers", label: "Brokers" },
    { id: "faq", label: "FAQ" },
  ],
  audiences: {
    heading: "Singapore resident investing from SG, or Australian expat in Singapore?",
    sub: "Both audiences benefit from SG's tax-efficient regime + the AU-SG DTA + AU non-resident CGT exemption.",
    cards: [
      {
        flagEmoji: "🇸🇬",
        title: "Singapore resident",
        accent: "blue",
        bullets: [
          "15% dividend WHT, 10% interest, 10% royalties (DTA)",
          "SG has no personal CGT — total share-CGT can be near-zero",
          "FIRB approval still needed; FTA gives higher commercial thresholds",
          "SG territorial system: foreign-source income generally not taxed in SG",
          "Foreign-buyer stamp duty still applies at AU state level",
        ],
      },
      {
        flagEmoji: "🇦🇺",
        title: "Australian expat in Singapore",
        accent: "amber",
        bullets: [
          "AU tax residency depends on permanent home + ties (not just days)",
          "AU super preserved; cannot contribute personally while non-resident",
          "DTA prevents double taxation",
          "On return: CGT rebasing applies; plan disposals around the move",
          "Common pattern: SG-employed, AU-domiciled investments",
        ],
      },
    ],
  },
  property: {
    eyebrow: "Property + FIRB",
    title: "Australian property as a Singapore buyer",
    sub: "Singapore-AU FTA gives higher FIRB thresholds for commercial investment. Residential rules are unchanged from general non-resident rules.",
    banHeadline: "Established Dwelling Ban: Active until 31 March 2027",
    banDetail: "Singapore residents, like all foreign persons, cannot purchase existing Australian homes until at least 31 March 2027. New dwellings, off-the-plan and vacant land remain available.",
    banLink: { label: "Full details", href: "/foreign-investment/guides/property-ban-2025" },
    tiles: [
      { label: "New dwelling / off-the-plan", state: "open", note: "FIRB approval required. SG-AU FTA does not exempt residential — standard rules apply." },
      { label: "Established home", state: "blocked", note: "Banned for foreign buyers until 31 March 2027." },
      { label: "Commercial property", state: "open", note: "FTA-elevated screening thresholds for commercial investment. SG investors active in CBD office and logistics." },
    ],
    countrySideRemindersHeading: "Singapore-side reminders (territorial tax, no CGT)",
    countrySideReminders: [
      "**SG has no personal CGT** on shares — the AU non-resident CGT exemption means total CGT on listed AU shares can be zero.",
      "**Territorial tax** — SG only taxes SG-source income; AU dividends and rental income are foreign-source and generally not subject to SG income tax.",
      "**Stamp duty surcharges** still apply at the AU state level — NSW/VIC 8%, QLD/WA/SA 7%.",
    ],
    ctaLinks: [
      { label: "Browse commercial property listings", href: "/invest/commercial-property", primary: true },
      { label: "Buy AU property as a foreigner — full guide", href: "/foreign-investment/guides/buy-property-australia-foreigner" },
      { label: "Find a multilingual SG-AU advisor", href: "/advisors" },
    ],
  },
  fxCorridor: {
    eyebrow: "SGD → AUD",
    title: "Sending money from Singapore to Australia",
    sub: "SGD-AUD is a deeply liquid corridor. Specialist providers consistently beat SG retail banks by 1–2% on FX margin — meaningful on property settlement amounts.",
    options: [
      {
        name: "SG retail banks (DBS, OCBC, UOB)",
        cost: "0.5–1.5% margin + fees",
        speed: "Same-day to 2 days",
        note: "Default route. Convenient if you bank with the AU subsidiary, but rarely the cheapest.",
        badge: "Default route",
        badgeAccent: "slate",
      },
      {
        name: "Wise / OFX / DBS Multi-Currency",
        cost: "0.2–0.6% margin",
        speed: "Same-day to 2 days",
        note: "Tight spreads. MAS-regulated. Multi-currency accounts useful for repeated transfers.",
        badge: "Recommended",
        badgeAccent: "emerald",
      },
      {
        name: "SG private banking",
        cost: "Negotiable",
        speed: "Same-day",
        note: "For HNW investors — often best for property settlements above S$1M.",
        badge: "HNW",
        badgeAccent: "blue",
      },
    ],
    ctaLabel: "Compare SGD → AUD live rates",
    ctaHref: "/foreign-investment/send-money-australia",
  },
  dta: {
    eyebrow: "SG-AU DTA",
    title: "Singapore–Australia DTA: tax-efficient combination",
    sub: "Combined with SG's territorial system + zero CGT, the DTA can produce near-zero total tax on AU-source gains for SG residents.",
    countrySideHeading: "Singapore tax treatment",
    rows: [
      { type: "Unfranked dividends", noTreaty: "30%", withTreaty: "15%", countrySideNote: "SG does not tax foreign-source dividends in most cases — 15% AU WHT is final tax" },
      { type: "Fully franked dividends", noTreaty: "0%", withTreaty: "0%", countrySideNote: "0% AU + 0% SG = total 0% tax on franked AU dividends" },
      { type: "Interest", noTreaty: "10%", withTreaty: "10%", countrySideNote: "SG does not tax foreign-source interest in most cases — 10% AU WHT is final tax" },
      { type: "Royalties", noTreaty: "30%", withTreaty: "10%", countrySideNote: "DTA benefit; final tax in most cases" },
      { type: "Capital gains (listed shares)", noTreaty: "0% AU (exempt)", withTreaty: "0% AU (exempt)", countrySideNote: "SG has no personal CGT — total CGT on listed AU shares: zero" },
      { type: "Capital gains (AU property)", noTreaty: "Taxable in AU", withTreaty: "Taxable in AU", countrySideNote: "AU CGT applies; no SG CGT" },
    ],
    countryReportingHeading: "Singapore-side reporting essentials",
    countryReporting: [
      "Singapore's territorial tax system means foreign-source income is generally not subject to SG income tax",
      "Foreign-source income remitted into SG can be taxable in some cases — check exemption rules per income type",
      "SG does not require declaration of foreign investment income on individual tax returns (no equivalent of Schedule FA / SA106)",
      "SG participates in CRS — AU financial institution data flows to IRAS",
    ],
    ctaLabel: "Find an SG-AU cross-border tax accountant",
    ctaHref: "/advisors/international-tax-specialists",
  },
  expat: {
    eyebrow: "Australian Expat",
    title: "If you're an Australian living in Singapore",
    sub: "Many AU expats in SG retain AU tax residency unintentionally. SG's tax efficiency only applies if you are SG tax resident — and not concurrently AU resident.",
    cards: [
      { title: "AU tax residency test", body: "ATO uses a multi-factor test (permanent home, family ties, employment, intention) — not just days. Many AU expats in SG retain AU residency and owe AU tax on worldwide income. Get specialist advice." },
      { title: "AU super while in SG", body: "Preserved. Cannot make personal contributions as non-resident. Access at preservation age. SG does not tax AU super lump sums (territorial system, foreign-source)." },
      { title: "Returning home", body: "Becoming AU tax resident again triggers a deemed acquisition of overseas assets at market value at re-entry. SG gains accrued during your SG period typically aren't AU-taxable." },
    ],
  },
  migration: {
    eyebrow: "Permanent move",
    title: "Pathways from Singapore to Australia",
    sub: "Skilled migration is the most common; SG passport holders are well-represented in shortage occupations.",
    pathways: [
      { name: "Skilled visas (189/190/491)", note: "Points-tested. SG-trained professionals (medicine, finance, IT) commonly qualify in shortage occupations." },
      { name: "Significant Investor (188C → 888C)", note: "$5M+ in complying investments. SG-AU FTA does not change SIV criteria." },
      { name: "Employer Sponsored (482 → 186)", note: "Temporary skilled visa converting to PR. Common for SG finance/tech professionals." },
      { name: "Business Innovation (188A → 888A)", note: "$800K turnover business + $625K net assets. State nomination required." },
    ],
    ctaLink: { label: "Find an SG-AU migration agent", href: "/advisors/migration-agents" },
  },
  brokers: {
    title: "ASX brokers that accept Singapore residents",
    sub: "These brokers have confirmed they accept non-Australian residents. Verify directly before opening an account.",
  },
  advisorAnchor: {
    eyebrow: "Cross-border specialist",
    title: "Find a specialist for Singapore investors",
    body: "Some Australian advisors specialise in Singapore residents and speak Mandarin, Malay, or Tamil. Our directory includes cross-border tax accountants, FIRB specialists and buyer's agents experienced with SG clients.",
    ctaLabel: "Find an Advisor",
    ctaHref: "/advisors",
    theme: "light",
  },
  opportunities: defaultOpportunities("Singapore investors and Australian expats in SG"),
  faq: [
    { q: "Can I buy ASX shares as a Singapore resident?", a: "Yes — through Interactive Brokers, Saxo or another non-resident-friendly broker. Under the SG-AU DTA, unfranked dividends are taxed at 15% AU WHT; fully franked dividends 0%. Singapore's territorial system + zero personal CGT means AU listed-share returns are highly tax-efficient for SG residents." },
    { q: "Does the SG-AU FTA help me buy AU property?", a: "It helps for commercial investment (higher FIRB screening thresholds), but does not exempt SG residents from FIRB approval for residential property. The 2025–2027 established-dwelling ban also applies to SG residents." },
    { q: "Does Singapore tax my AU dividends?", a: "Generally no. Singapore's territorial tax system means foreign-source income (including AU dividends, interest, royalties and rental income) is generally not subject to SG income tax. The 15% AU dividend WHT is typically your final tax." },
    { q: "I'm an Australian living in Singapore — am I still an AU tax resident?", a: "Probably yes in many cases. The ATO uses a multi-factor test (permanent home, family ties, employment, intention) — not just days. Many AU expats in SG retain AU tax residency and owe AU tax on worldwide income. Engage a specialist before assuming non-resident status." },
    { q: "What's the best AU broker for a Singapore resident?", a: "Interactive Brokers (Singapore-regulated) is the most-used option for serious investors — full ASX access, multi-currency support, MAS-regulated. Saxo Singapore is the alternative with a more polished UI. Verify eligibility directly before opening." },
  ],
  related: [
    { title: "Buy Property in Australia as a Foreigner", href: "/foreign-investment/guides/buy-property-australia-foreigner" },
    { title: "Foreign Buyer Property Ban 2025–2027", href: "/foreign-investment/guides/property-ban-2025" },
    { title: "ASX Brokers for Non-Residents", href: "/compare/non-residents" },
    { title: "Send Money to Australia (SGD to AUD)", href: "/foreign-investment/send-money-australia" },
    { title: "Withholding Tax Guide", href: "/foreign-investment/tax" },
    { title: "DTA rates by country", href: "/foreign-investment/from/sg" },
  ],
  leadForms: {
    pdfChecklist: null,
    propertyShortlist: null,
    fxQuote: null,
    pensionTransfer: null,
  },
};

// ─── New Zealand ───────────────────────────────────────────────────

export const NZ_CONFIG: CountryConfig = {
  code: "nz",
  defaultActions: [
    { emoji: "🇳🇿", label: "Trans-Tasman investing guide", sublabel: "No FIRB, KiwiSaver portability, ASX vs NZX — full guide", href: "/foreign-investment/new-zealand" },
    { emoji: "🏠", label: "Browse Australian property (no FIRB)", sublabel: "NZ citizens skip FIRB approval entirely", href: "/foreign-investment/property" },
    { emoji: "📈", label: "ASX brokers for NZ residents", sublabel: "IBKR + NZ-based platforms (Sharesies, Hatch) all work", href: "/compare/non-residents" },
    { emoji: "🏦", label: "KiwiSaver ↔ Australian super", sublabel: "Trans-Tasman portability scheme — 15% exit tax beats DASP's 35%", href: "/foreign-investment/super" },
    { emoji: "💱", label: "NZD → AUD transfers", sublabel: "One of the most liquid corridors — Wise/OFX wins", href: "/foreign-investment/send-money-australia" },
    { emoji: "👤", label: "Find a Trans-Tasman tax specialist", sublabel: "FIF rules, AU CGT, super vs KiwiSaver", href: "/advisors/international-tax-specialists" },
  ],
  slug: "new-zealand",
  countryName: "New Zealand",
  countryShort: "NZ",
  adjective: "NZ",
  flag: "🇳🇿",
  currency: "NZD",
  currencySymbol: "NZ$",
  metadata: {
    title: "Investing in Australia from New Zealand (2026) — Trans-Tasman Guide",
    description: "NZ citizens investing in Australia: no FIRB required (SCV 444 holders), NZ-AU DTA rates, KiwiSaver portability, ASX vs NZX, CGT differences, and Trans-Tasman tax planning. Updated 2026.",
    ogTitle: "Investing in Australia from New Zealand — 2026 Trans-Tasman Guide",
    ogSub: "Trans-Tasman · No FIRB · KiwiSaver · ASX · 2026",
  },
  hero: {
    flagPillText: "New Zealand · Trans-Tasman · SCV 444 · No FIRB · 2026",
    h1Plain: "Investing in Australia",
    h1Highlight: "from New Zealand",
    h1Sub: "Trans-Tasman Guide for 2026",
    paragraph:
      "NZ citizens have a uniquely close relationship with Australia. Under the Trans-Tasman Travel Arrangement, NZ citizens can live, work and invest in Australia — and importantly, NZ citizens in Australia do not need FIRB approval for property. Whether you live in NZ and invest in AU, or you're a Kiwi living in Australia, this is the full guide.",
    stats: [
      { label: "Dividend WHT", value: "15%", sub: "Under NZ-AU DTA" },
      { label: "Interest WHT", value: "10%", sub: "Under NZ-AU DTA" },
      { label: "Royalties WHT", value: "10%", sub: "Under NZ-AU DTA" },
      { label: "FIRB (NZ citizens)", value: "None", sub: "SCV 444 exemption" },
    ],
  },
  toc: [
    { id: "audiences", label: "Two audiences" },
    { id: "property", label: "Property (no FIRB)" },
    { id: "tax", label: "NZ-AU DTA" },
    { id: "retirement", label: "KiwiSaver portability" },
    { id: "fx", label: "NZD → AUD" },
    { id: "expat", label: "Kiwi in Australia" },
    { id: "opportunities", label: "Platforms" },
    { id: "brokers", label: "Brokers" },
    { id: "faq", label: "FAQ" },
  ],
  criticalWarning: {
    title: "NZ Citizens: No FIRB Required for Property",
    body: "NZ citizens holding a Special Category Visa (SCV 444) are treated similarly to AU permanent residents for FIRB purposes. You can buy AU residential and commercial property without FIRB approval. Foreign-buyer stamp duty surcharges may still apply in some states if you are not an AU PR/citizen — check state rules.",
  },
  audiences: {
    heading: "Kiwi in NZ investing in Australia, or Kiwi living in Australia?",
    sub: "Tax treatment differs depending on where you are tax resident.",
    cards: [
      {
        flagEmoji: "🇳🇿",
        title: "NZ resident investing in AU from NZ",
        accent: "blue",
        bullets: [
          "No FIRB required for property (NZ citizen rights)",
          "15% dividend WHT on unfranked ASX dividends (DTA)",
          "NZ has no general CGT — but AU CGT applies on AU property",
          "Franking credits accessible under DTA",
          "Can invest via NZ-based brokers (Sharesies, Hatch) or international",
          "NZ residents pay NZ tax on worldwide income",
        ],
      },
      {
        flagEmoji: "🇦🇺",
        title: "Kiwi living in Australia (SCV 444)",
        accent: "amber",
        bullets: [
          "Australian tax resident — full resident rates apply",
          "Employer SG contributions to AU super at 11.5%",
          "CGT 50% discount on assets held 12+ months",
          "No FIRB required for property as SCV holder",
          "Can use any AU broker (same as residents)",
          "KiwiSaver → AU super portability scheme available",
        ],
      },
    ],
  },
  property: {
    eyebrow: "Property (No FIRB)",
    title: "Australian property as a New Zealand citizen",
    sub: "Trans-Tasman rules give NZ citizens broad access to Australian property without FIRB. The 2025–2027 dwelling ban does not apply to NZ-citizen non-residents in the same way.",
    banHeadline: null,
    banDetail: null,
    banLink: null,
    tiles: [
      { label: "New dwelling / off-the-plan", state: "open", note: "Fully open. Standard stamp duty applies; surcharge may apply if not AU PR/citizen — check state rules." },
      { label: "Established home", state: "open", note: "Available to NZ citizens with SCV 444 in Australia. Check state stamp-duty surcharges." },
      { label: "Commercial property", state: "open", note: "Open. NZ-AU CER FTA is one of the world's most comprehensive trade agreements." },
    ],
    countrySideRemindersHeading: "NZ-side reminders (worldwide income, no CGT)",
    countrySideReminders: [
      "**NZ has no general CGT** on shares — but AU property gains are AU-taxable; foreign tax credit available in NZ.",
      "**NZ residents** pay NZ tax on worldwide income; AU-source income comes with the AU WHT, then NZ tax with credit.",
      "**Stamp duty surcharges** at the AU state level may still apply if you are not an AU PR/citizen at the time of purchase.",
    ],
    ctaLinks: [
      { label: "Browse Australian property", href: "/foreign-investment/property", primary: true },
      { label: "AU property guide", href: "/foreign-investment/guides/buy-property-australia-foreigner" },
      { label: "Find a Trans-Tasman tax specialist", href: "/advisors/international-tax-specialists" },
    ],
  },
  fxCorridor: {
    eyebrow: "NZD → AUD",
    title: "Sending money from New Zealand to Australia",
    sub: "NZD-AUD is one of the most liquid corridors globally. Specialist providers can save 1% vs NZ retail banks — meaningful on settlement amounts.",
    options: [
      {
        name: "NZ retail banks (ANZ, BNZ, Westpac, ASB)",
        cost: "0.5–1.5% margin + fees",
        speed: "Same-day to 2 days",
        note: "Convenient if you bank with the AU sister-bank. ANZ/Westpac NZ ↔ AU is seamless but rarely cheapest.",
        badge: "Default route",
        badgeAccent: "slate",
      },
      {
        name: "Wise / OFX",
        cost: "0.2–0.5% margin",
        speed: "Same-day to 2 days",
        note: "Tightest spreads on NZD-AUD. RBNZ-licensed. Best for one-off large transfers.",
        badge: "Recommended",
        badgeAccent: "emerald",
      },
      {
        name: "Sharesies / Hatch direct AUD funding",
        cost: "0.5–0.7% margin",
        speed: "Instant",
        note: "If investing in ASX via NZ-based platforms, in-app FX is competitive and removes a step.",
        badge: "For investing",
        badgeAccent: "blue",
      },
    ],
    ctaLabel: "Compare NZD → AUD live rates",
    ctaHref: "/foreign-investment/send-money-australia",
  },
  dta: {
    eyebrow: "NZ-AU DTA",
    title: "New Zealand–Australia DTA",
    sub: "One of the world's most comprehensive bilateral DTAs. Combined with NZ's no-CGT regime, total tax burden on AU-source income can be very low.",
    countrySideHeading: "NZ tax treatment",
    rows: [
      { type: "Unfranked dividends", noTreaty: "30%", withTreaty: "15%", countrySideNote: "Taxed in NZ with credit for AU WHT" },
      { type: "Fully franked dividends", noTreaty: "0%", withTreaty: "0%", countrySideNote: "Franking credits accessible under DTA Article 10A" },
      { type: "Interest", noTreaty: "10%", withTreaty: "10%", countrySideNote: "Taxed in NZ with credit for AU WHT" },
      { type: "Royalties", noTreaty: "30%", withTreaty: "10%", countrySideNote: "Significant DTA benefit" },
      { type: "Capital gains (listed shares)", noTreaty: "0% (exempt)", withTreaty: "0% (exempt)", countrySideNote: "NZ has no general CGT on shares" },
      { type: "Capital gains (AU property)", noTreaty: "Taxable in AU", withTreaty: "Taxable in AU", countrySideNote: "AU CGT applies; FTC in NZ" },
    ],
    countryReportingHeading: "NZ-side reporting essentials",
    countryReporting: [
      "AU dividends and interest reportable in NZ IR3 if NZ tax resident",
      "Foreign tax credit available for AU WHT paid",
      "FIF (Foreign Investment Fund) rules may apply to AU shares above NZ$50K — common AU shares often qualify for FIF exemption",
      "AU rental property → reportable in NZ; FTC for AU tax paid",
    ],
    ctaLabel: "Find a Trans-Tasman tax accountant",
    ctaHref: "/advisors/international-tax-specialists",
  },
  retirementTransfer: {
    eyebrow: "Trans-Tasman Retirement",
    title: "KiwiSaver vs Australian Super — portability scheme",
    sub: "NZ and AU operate a Trans-Tasman portability scheme. You can transfer between KiwiSaver and AU super in either direction.",
    callout: "**KiwiSaver portability** — once funds are transferred, they are subject to the receiving country's preservation rules. This is a one-way decision in practice.",
    accordions: [
      {
        summary: "KiwiSaver → Australian Super",
        bullets: [
          "Transfer your NZ KiwiSaver balance to an Australian APRA-regulated fund",
          "Funds are 'locked in' under Australian preservation rules once transferred",
          "Transferred funds classified as 'member contributions' (no AU employer match)",
          "Access follows AU preservation age rules (60–65)",
          "The Australian Tax Office (ATO) administers the AU side of the scheme",
        ],
      },
      {
        summary: "Australian Super → KiwiSaver",
        bullets: [
          "Kiwis leaving Australia permanently can transfer AU super to KiwiSaver",
          "Alternative: claim DASP (Departing AU Super Payment) — but high tax rate (35%)",
          "Transfer to KiwiSaver preserves retirement savings in NZ tax environment",
          "**15% exit tax** applies on transfers vs DASP's 35% — usually the better option",
          "Only to a KiwiSaver scheme that accepts transfers",
        ],
      },
    ],
    ctaLinks: [
      { label: "Australian super guide", href: "/foreign-investment/super", primary: true },
      { label: "Speak to a Trans-Tasman retirement specialist", href: "/advisors/international-tax-specialists" },
    ],
  },
  expat: {
    eyebrow: "Kiwi in Australia",
    title: "If you're a Kiwi living in Australia (SCV 444)",
    sub: "SCV 444 holders are AU tax residents. You can use any AU broker, contribute to super, and buy property without FIRB.",
    cards: [
      { title: "AU tax residency", body: "Full AU tax resident from arrival. Pay AU income tax at resident rates. NZ-AU DTA prevents double taxation on NZ-source income. Worldwide income reportable in Australia." },
      { title: "Super and KiwiSaver", body: "Employer must contribute to AU super at 11.5% SG. You can transfer KiwiSaver into AU super under the portability scheme — but funds become subject to AU preservation rules." },
      { title: "Property and investments", body: "No FIRB required as SCV holder. Foreign-buyer surcharges may not apply (state-dependent — check NSW/VIC rules). Can use any AU broker; same access as Australian-born residents." },
    ],
  },
  brokers: {
    title: "ASX brokers for NZ residents investing in Australia",
    sub: "NZ residents have broader broker access than most other nationalities due to the Trans-Tasman relationship. NZ-based platforms (Sharesies, Hatch) also offer ASX access.",
  },
  advisorAnchor: {
    eyebrow: "Trans-Tasman specialist",
    title: "Find an advisor specialising in Trans-Tasman tax",
    body: "NZ–Australia cross-border tax involves CGT differences, super vs KiwiSaver, DTA optimisation and residency rules. A specialist in Trans-Tasman taxation can ensure you don't pay tax twice and maximise your returns.",
    ctaLabel: "Find a Tax Specialist",
    ctaHref: "/advisors/international-tax-specialists",
    theme: "light",
  },
  opportunities: defaultOpportunities("New Zealand investors and Kiwis in Australia"),
  faq: [
    { q: "Do NZ citizens need FIRB approval to buy Australian property?", a: "No. NZ citizens holding a Special Category Visa (SCV 444) — automatically granted to NZ citizens entering Australia — are treated like AU permanent residents for FIRB purposes. You can buy any type of property without FIRB approval. Foreign-buyer stamp duty surcharges may still apply in some states if you are not an AU PR/citizen — check state-by-state rules." },
    { q: "Can I transfer my KiwiSaver to AU super?", a: "Yes, under the Trans-Tasman retirement savings portability scheme. Transferred funds become subject to AU preservation rules. The reverse direction (AU super → KiwiSaver) attracts 15% exit tax — much better than DASP's 35%." },
    { q: "Are franking credits accessible to NZ residents?", a: "Yes — under the NZ-AU DTA Article 10A, NZ residents can access AU franking credits attached to fully franked dividends. This effectively eliminates AU tax on franked dividends. Practical implementation depends on your NZ tax position." },
    { q: "What's the best NZ-based broker for ASX shares?", a: "Sharesies, Hatch and InvestNow all offer ASX access from NZ with NZD funding. For active traders, Interactive Brokers' NZ entity offers full ASX exposure with tighter spreads. Cross-listed stocks (NZX + ASX) are also a path for NZX-only investors." },
    { q: "Do NZ FIF rules apply to my Australian shares?", a: "Possibly. NZ's Foreign Investment Fund (FIF) regime applies to overseas portfolio investments above NZ$50,000 — but most ASX-listed shares qualify for the Australian Resident exemption. Direct AU listed shares typically aren't FIF; AU-domiciled funds and ETFs may be. Specialist NZ tax advice essential." },
  ],
  related: [
    { title: "Australian Superannuation Guide", href: "/foreign-investment/super" },
    { title: "ASX Brokers for Non-Residents", href: "/compare/non-residents" },
    { title: "Buy Property in Australia", href: "/foreign-investment/property" },
    { title: "Send Money to Australia (NZD to AUD)", href: "/foreign-investment/send-money-australia" },
    { title: "Tax Guide for Non-Residents", href: "/foreign-investment/tax" },
    { title: "ASX vs NZX — Where to Invest", href: "/foreign-investment/shares" },
  ],
  leadForms: {
    pdfChecklist: null,
    propertyShortlist: null,
    fxQuote: null,
    pensionTransfer: null,
  },
};

// ─── Japan ─────────────────────────────────────────────────────────

export const JP_CONFIG: CountryConfig = {
  code: "jp",
  defaultActions: [
    { emoji: "🇯🇵", label: "Investing in Australia from Japan", sublabel: "DTA, JAEPA, FIRB, inheritance tax — full guide", href: "/foreign-investment/japan" },
    { emoji: "⛏️", label: "Critical minerals + mining opportunities", sublabel: "Lithium, rare earths, hydrogen — Japan's strategic AU partnership", href: "/invest/mining/listings" },
    { emoji: "📈", label: "Brokers that accept Japanese residents", sublabel: "IBKR + Saxo + CMC most common", href: "/compare/non-residents" },
    { emoji: "🏠", label: "FIRB-eligible new properties", sublabel: "Sydney/Melbourne CBD office popular with Japanese institutionals", href: "/invest?firb=eligible" },
    { emoji: "💱", label: "JPY → AUD transfers", sublabel: "Wise/GoRemit vs MUFG/SMBC/Mizuho — saves 1.5–2.5%", href: "/foreign-investment/send-money-australia" },
    { emoji: "👤", label: "Find a Japan-AU tax specialist", sublabel: "Inheritance tax exposure + DTA optimisation", href: "/advisors/international-tax-specialists" },
  ],
  slug: "japan",
  countryName: "Japan",
  countryShort: "Japan",
  adjective: "Japanese",
  flag: "🇯🇵",
  currency: "JPY",
  currencySymbol: "¥",
  metadata: {
    title: "Investing in Australia from Japan (2026) — Tax, FIRB & Broker Guide",
    description: "Japanese investors in Australia: Japan-AU DTA (10–15% dividend WHT, 5% royalties), JAEPA investment provisions, mining/LNG/critical minerals partnership, FIRB rules, ASX brokers. Updated 2026.",
    ogTitle: "Investing in Australia from Japan — 2026 Guide",
    ogSub: "DTA · JAEPA · Mining · Critical Minerals · 2026",
  },
  hero: {
    flagPillText: "Japan · DTA since 1970 · JAEPA in force · Updated 2026",
    h1Plain: "Investing in Australia",
    h1Highlight: "from Japan",
    h1Sub: "Tax, FIRB & Resources Strategy in 2026",
    paragraph:
      "Japan is Australia's #2 trading partner and the single largest foreign investor in Australian mining and resources. The Japan-Australia DTA (in force since 1970) reduces dividend withholding to 10–15%, and Japanese companies collectively represent billions in iron ore, LNG and critical minerals. JAEPA (2015) adds investment-chapter protections.",
    stats: [
      { label: "Dividend WHT", value: "10–15%", sub: "Under Japan-AU DTA" },
      { label: "Interest WHT", value: "10%", sub: "Under Japan-AU DTA" },
      { label: "Royalties WHT", value: "5%", sub: "Under Japan-AU DTA" },
      { label: "FIRB Threshold", value: "$310M", sub: "General business" },
    ],
  },
  toc: [
    { id: "audiences", label: "Two audiences" },
    { id: "property", label: "FIRB + property" },
    { id: "tax", label: "DTA + JAEPA" },
    { id: "fx", label: "JPY → AUD" },
    { id: "expat", label: "Aussie expat in Japan" },
    { id: "migration", label: "Visa pathways" },
    { id: "sector", label: "Critical minerals" },
    { id: "opportunities", label: "Platforms" },
    { id: "brokers", label: "Brokers" },
    { id: "faq", label: "FAQ" },
  ],
  audiences: {
    heading: "Japanese corporate investor or individual?",
    sub: "Japan-AU investment splits cleanly into the corporate (mining, LNG, critical minerals) and individual (ASX portfolio, property) audiences.",
    cards: [
      {
        flagEmoji: "🏭",
        title: "Japanese corporate investor",
        accent: "blue",
        bullets: [
          "Mitsui, Mitsubishi, Sumitomo — major iron ore/coal/LNG stakes",
          "10% dividend WHT for 10%+ company shareholders (DTA)",
          "FIRB corporate thresholds apply ($310M general)",
          "JAEPA Chapter 11 investment protections",
          "Critical minerals partnerships (lithium, rare earths) accelerating",
        ],
      },
      {
        flagEmoji: "👤",
        title: "Japanese individual investor",
        accent: "amber",
        bullets: [
          "15% dividend WHT on unfranked ASX dividends (portfolio holdings)",
          "No AU CGT on listed ASX shares (portfolio <10%)",
          "FIRB required for residential property",
          "Capital gains from AU property taxed in Japan (DTA Article 13)",
          "Japanese inheritance tax may apply on AU assets in your estate",
        ],
      },
    ],
  },
  property: {
    eyebrow: "FIRB Rules",
    title: "FIRB rules for Japanese investors",
    sub: "FIRB screens foreign investment; agricultural land has lower thresholds. JAEPA does not exempt Japanese investors from screening but provides treaty-level protections.",
    banHeadline: "Established Dwelling Ban: Active until 31 March 2027",
    banDetail: "Japanese non-residents cannot purchase existing Australian homes until at least 31 March 2027. New off-the-plan properties remain available with FIRB approval.",
    banLink: { label: "Full details", href: "/foreign-investment/guides/property-ban-2025" },
    tiles: [
      { label: "New dwelling / off-the-plan", state: "open", note: "FIRB approval required for individuals. Sydney/Melbourne CBD apartments common." },
      { label: "Established home", state: "blocked", note: "Banned for foreign buyers until 31 March 2027." },
      { label: "Commercial property", state: "open", note: "Open with FIRB approval. Japanese institutional investors active in Sydney/Melbourne CBD office and logistics." },
    ],
    countrySideRemindersHeading: "Japan-side reminders (inheritance tax, worldwide reporting)",
    countrySideReminders: [
      "**Japanese inheritance tax** applies to Japanese tax residents' worldwide assets — including AU property and shares.",
      "**Worldwide income reporting** required for Japanese tax residents staying 5+ years (out of last 10).",
      "**Capital gains on AU property** taxable in Japan as well as AU under DTA Article 13 — credit available for AU CGT paid.",
    ],
    ctaLinks: [
      { label: "Use FIRB property guide", href: "/foreign-investment/property", primary: true },
      { label: "Buy AU property as a foreigner — full guide", href: "/foreign-investment/guides/buy-property-australia-foreigner" },
      { label: "Find a Japan-AU tax specialist", href: "/advisors/international-tax-specialists" },
    ],
  },
  fxCorridor: {
    eyebrow: "JPY → AUD",
    title: "Sending money from Japan to Australia",
    sub: "JPY-AUD volatility is high. On a ¥10M transfer, FX margin difference between a Japanese bank and a specialist provider can be ¥100K–¥200K. Larger amounts magnify the impact.",
    options: [
      {
        name: "Japanese banks (MUFG, SMBC, Mizuho)",
        cost: "1.5–2.5% margin + fees",
        speed: "1–3 business days",
        note: "Default for most. Process can be slow with paper documentation.",
        badge: "Default route",
        badgeAccent: "slate",
      },
      {
        name: "Wise / GoRemit / SBI Remit",
        cost: "0.5–1% margin",
        speed: "Same-day to 2 days",
        note: "Specialist providers — significantly tighter spreads and faster KYC.",
        badge: "Recommended",
        badgeAccent: "emerald",
      },
      {
        name: "Multi-currency account (Wise, Revolut)",
        cost: "0.4–0.6% margin",
        speed: "Instant balance hold",
        note: "Hold JPY/AUD; convert when timing favourable. Useful for repeated property settlements.",
        badge: "For active FX",
        badgeAccent: "blue",
      },
    ],
    ctaLabel: "Compare JPY → AUD live rates",
    ctaHref: "/foreign-investment/send-money-australia",
  },
  dta: {
    eyebrow: "DTA Rates",
    title: "Japan–Australia DTA rates",
    sub: "The Japan-Australia DTA has been in force since 1970 — one of Australia's longest-standing tax treaties.",
    countrySideHeading: "Japan tax treatment",
    rows: [
      { type: "Unfranked dividends (10%+ ownership)", noTreaty: "30%", withTreaty: "10%", countrySideNote: "Beneficial rate for substantial corporate shareholders" },
      { type: "Unfranked dividends (other)", noTreaty: "30%", withTreaty: "15%", countrySideNote: "Taxed in Japan with credit for AU WHT" },
      { type: "Fully franked dividends", noTreaty: "0%", withTreaty: "0%", countrySideNote: "Subject to Japanese income tax" },
      { type: "Interest", noTreaty: "10%", withTreaty: "10%", countrySideNote: "Taxed in Japan with credit for AU WHT" },
      { type: "Royalties", noTreaty: "30%", withTreaty: "5%", countrySideNote: "Significant DTA benefit for IP/tech licensing" },
      { type: "Capital gains (listed shares)", noTreaty: "0% (exempt)", withTreaty: "0% (exempt)", countrySideNote: "Japanese CGT rules apply" },
      { type: "Capital gains (AU property)", noTreaty: "Taxable in AU", withTreaty: "Taxable in AU", countrySideNote: "DTA Article 13 — AU source, taxed in AU" },
    ],
    countryReportingHeading: "Japan-side reporting essentials",
    countryReporting: [
      "AU dividends, interest, royalties → Japanese 確定申告 (kakutei shinkoku) annual return",
      "Foreign tax credit available for AU WHT paid",
      "Overseas asset reporting (OARS) for Japanese residents with overseas assets above ¥50M",
      "Inheritance tax exposure on worldwide assets for Japanese tax residents",
    ],
    ctaLabel: "Find a Japan-AU cross-border tax accountant",
    ctaHref: "/advisors/international-tax-specialists",
  },
  expat: {
    eyebrow: "Australian Expat",
    title: "If you're an Australian living in Japan",
    sub: "Japanese tax residency rules are complex and time-based. Long-term residents face Japanese inheritance tax exposure on worldwide assets.",
    cards: [
      { title: "Japanese tax residency", body: "Non-permanent residents (under 5 years) taxed only on Japan-source income + remitted income. Permanent residents (5+ years out of last 10) pay Japanese tax on worldwide income — including AU dividends, interest and gains." },
      { title: "AU super while in Japan", body: "Preserved. Cannot make personal contributions while non-resident. Can access at preservation age. Japanese tax treatment of AU super lump sums depends on residency status — specialist advice essential." },
      { title: "Returning home", body: "Becoming AU tax resident again triggers a deemed acquisition of overseas assets at market value. Japanese inheritance tax may apply to assets gifted or inherited around the move — plan carefully." },
    ],
  },
  migration: {
    eyebrow: "Visa Pathways",
    title: "Visa options for Japanese investors",
    sub: "Japanese citizens have access to several investment and business migration streams.",
    pathways: [
      { name: "Significant Investor (188C → 888C)", note: "$5M+ in complying investments. Popular with HNW Japanese individuals." },
      { name: "Investor stream (188B → 888B)", note: "$1.5M in designated investments for 4 years; state-nominated." },
      { name: "Business Innovation (188A → 888A)", note: "$800K turnover business + $625K net assets. State nomination required." },
      { name: "Working Holiday (subclass 417)", note: "Available to Japanese citizens under 31. Common entry point for younger Japanese." },
    ],
    ctaLink: { label: "Find a Japan-AU migration specialist", href: "/advisors/migration-agents" },
  },
  sectorOpportunity: {
    eyebrow: "2026 Opportunity — Japan angle",
    title: "Critical minerals: Japan's strategic partnership with Australia",
    body:
      "The Tokyo Minerals Ministerial (March 2026) confirmed both governments have mobilised $1B+ each in critical minerals financing. Japanese companies (Mitsui, Mitsubishi, Sumitomo, Toyota Tsusho, Panasonic Energy) are deeply engaged in Australian lithium, rare earths, hydrogen and LNG. JOGMEC provides government-backed exploration financing.",
    stats: [
      { label: "Joint investment pipeline", value: "$2B+", sub: "" },
      { label: "Major Japanese groups active", value: "10+", sub: "" },
      { label: "Critical minerals projects", value: "78", sub: "" },
    ],
    ctaLinks: [
      { label: "Browse mining opportunities", href: "/invest/mining/listings", primary: true },
      { label: "Read the full guide", href: "/article/australias-critical-minerals-boom-how-to-invest" },
    ],
  },
  brokers: {
    title: "ASX brokers that accept Japanese residents",
    sub: "Interactive Brokers, Saxo and CMC Markets are the primary options for Japanese investors. Verify eligibility directly before applying.",
  },
  advisorAnchor: {
    eyebrow: "Cross-border specialist",
    title: "Find a Japan-AU tax specialist",
    body: "Japan-Australia cross-border tax is complex, especially for corporate investors with resource-sector positions. A specialist can help optimise DTA benefits, manage FIRB applications, and structure investments tax-efficiently.",
    ctaLabel: "Find a Tax Specialist",
    ctaHref: "/advisors/international-tax-specialists",
    theme: "light",
  },
  opportunities: defaultOpportunities("Japanese investors and Australian expats in Japan"),
  faq: [
    { q: "Can I buy ASX shares as a Japanese resident?", a: "Yes — through Interactive Brokers Japan, Saxo Japan or another non-resident-friendly broker. Under the DTA, unfranked dividends are taxed at 15% AU WHT (10% if you are a substantial corporate shareholder); fully franked 0%. Japanese-side tax (with FTC for AU WHT) applies on your annual 確定申告." },
    { q: "What's the AUSFTA-equivalent for Japan? Does JAEPA help?", a: "JAEPA (2015) includes investment-chapter protections (national treatment, MFN, ISDS). It does not raise FIRB screening thresholds materially compared to general foreign investor rules. Japanese investors follow the standard $310M general business threshold." },
    { q: "Does Japan tax my AU rental income?", a: "Yes if you are a Japanese permanent tax resident (5+ years out of last 10). AU rental income is reportable on the Japanese 確定申告; foreign tax credit available for AU income tax paid. Non-permanent residents (under 5 years) only pay Japanese tax on Japan-source + remitted income." },
    { q: "Does Japanese inheritance tax apply to AU property?", a: "Yes for Japanese tax residents. Japan taxes Japanese tax residents' worldwide estates on death — including AU property and shares. Australia abolished inheritance tax in 1979, so the Japanese inheritance tax is the entire exposure. Long-term Japanese residents should plan around this with a specialist." },
    { q: "What's the Japan critical minerals story?", a: "Japan's battery, EV and clean-energy industries depend on Australian lithium, rare earths, cobalt and nickel. POSCO, Mitsui, Toyota Tsusho and others have multi-billion-dollar AU mining stakes. The Tokyo Minerals Ministerial (March 2026) has accelerated joint financing — making this one of the more active corporate investment themes for Japanese investors." },
  ],
  related: [
    { title: "Buy Property in Australia as a Foreigner", href: "/foreign-investment/guides/buy-property-australia-foreigner" },
    { title: "Foreign Buyer Property Ban 2025–2027", href: "/foreign-investment/guides/property-ban-2025" },
    { title: "ASX Brokers for Non-Residents", href: "/compare/non-residents" },
    { title: "Send Money to Australia (JPY to AUD)", href: "/foreign-investment/send-money-australia" },
    { title: "Tax Guide for Non-Residents", href: "/foreign-investment/tax" },
    { title: "FIRB Property Guide", href: "/foreign-investment/property" },
  ],
  leadForms: {
    pdfChecklist: null,
    propertyShortlist: null,
    fxQuote: null,
    pensionTransfer: null,
  },
};

// ─── South Korea ───────────────────────────────────────────────────

export const KR_CONFIG: CountryConfig = {
  code: "kr",
  defaultActions: [
    { emoji: "🇰🇷", label: "Investing in Australia from South Korea", sublabel: "KAFTA, DTA, lithium supply chain, exit tax — full guide", href: "/foreign-investment/south-korea" },
    { emoji: "⚡", label: "Lithium + battery supply chain", sublabel: "POSCO, Samsung SDI, SK On territory — AU mining opportunities", href: "/invest/mining/listings" },
    { emoji: "📈", label: "Brokers that accept Korean residents", sublabel: "IBKR + Saxo confirmed; verify Korean exit-tax position first", href: "/compare/non-residents" },
    { emoji: "🏠", label: "FIRB-eligible new properties", sublabel: "Sydney/Melbourne commercial property active with Korean institutions", href: "/invest?firb=eligible" },
    { emoji: "💱", label: "KRW → AUD transfers", sublabel: "Wise/Sentbe vs Korean retail banks — saves 1–2%", href: "/foreign-investment/send-money-australia" },
    { emoji: "👤", label: "Find a Korea-AU tax specialist", sublabel: "KAFTA, exit tax, DTA optimisation", href: "/advisors/international-tax-specialists" },
  ],
  slug: "south-korea",
  countryName: "South Korea",
  countryShort: "Korea",
  adjective: "Korean",
  flag: "🇰🇷",
  currency: "KRW",
  currencySymbol: "₩",
  metadata: {
    title: "Investing in Australia from South Korea (2026) — FIRB, Tax & Broker Guide",
    description: "Korean investors in Australia: KAFTA investment chapter, Korea-Australia DTA (15% WHT), lithium and critical minerals supply chain, FIRB rules, ASX brokers for Korean residents. Updated 2026.",
    ogTitle: "Investing in Australia from South Korea — 2026 Guide",
    ogSub: "KAFTA · DTA · Lithium · Critical Minerals · 2026",
  },
  hero: {
    flagPillText: "South Korea · KAFTA since 2014 · Updated 2026",
    h1Plain: "Investing in Australia",
    h1Highlight: "from South Korea",
    h1Sub: "KAFTA, Tax Rates & Critical Minerals in 2026",
    paragraph:
      "South Korean companies are among the most active foreign investors in Australia's critical minerals sector. POSCO, Samsung SDI, SK Innovation and LG Energy Solution have all invested heavily in Australian lithium, cobalt and nickel — the raw materials for Korean battery manufacturing. KAFTA (2014) provides investment-chapter protections.",
    stats: [
      { label: "Dividend WHT", value: "15%", sub: "Under Korea-AU DTA" },
      { label: "Interest WHT", value: "15%", sub: "Under Korea-AU DTA" },
      { label: "Royalties WHT", value: "15%", sub: "Under Korea-AU DTA" },
      { label: "FIRB Threshold", value: "$310M", sub: "General business" },
    ],
  },
  toc: [
    { id: "audiences", label: "Two audiences" },
    { id: "property", label: "FIRB + property" },
    { id: "tax", label: "DTA + KAFTA" },
    { id: "fx", label: "KRW → AUD" },
    { id: "expat", label: "Aussie expat in Korea" },
    { id: "migration", label: "Visa pathways" },
    { id: "sector", label: "Critical minerals" },
    { id: "opportunities", label: "Platforms" },
    { id: "brokers", label: "Brokers" },
    { id: "faq", label: "FAQ" },
  ],
  audiences: {
    heading: "Korean corporate investor or individual?",
    sub: "Korea-AU investment is dominated by battery supply-chain corporates (POSCO, Samsung SDI, SK, LG); individual Korean investors increasingly active in ASX shares.",
    cards: [
      {
        flagEmoji: "⚡",
        title: "Korean corporate investor",
        accent: "blue",
        bullets: [
          "POSCO, Samsung SDI, SK On, LG Energy — major lithium investments",
          "Australia supplies ~50% of global lithium — critical for Korean EV batteries",
          "FIRB corporate thresholds apply ($310M general)",
          "KAFTA Chapter 11 investment protections",
          "Most-favoured-nation: Korea benefits from any AU concession to other FTA partners",
        ],
      },
      {
        flagEmoji: "👤",
        title: "Korean individual investor",
        accent: "amber",
        bullets: [
          "15% WHT on unfranked dividends (DTA)",
          "No AU CGT on listed ASX shares (portfolio <10%)",
          "FIRB required for residential property",
          "Korean global income tax may apply on AU income",
          "Korean exit tax on overseas asset migration",
        ],
      },
    ],
  },
  property: {
    eyebrow: "FIRB Rules",
    title: "FIRB property rules for Korean investors",
    sub: "Korean investors follow standard FIRB thresholds. KAFTA does not exempt residential property; the dwelling ban applies.",
    banHeadline: "Established Dwelling Ban: Active until 31 March 2027",
    banDetail: "Korean non-residents cannot purchase existing Australian homes until at least 31 March 2027. New off-the-plan properties remain available with FIRB approval.",
    banLink: { label: "Full details", href: "/foreign-investment/guides/property-ban-2025" },
    tiles: [
      { label: "New dwelling / off-the-plan", state: "open", note: "FIRB approval required. Korean construction firms also active in residential development." },
      { label: "Established home", state: "blocked", note: "Banned for foreign buyers until 31 March 2027." },
      { label: "Commercial property", state: "open", note: "Open with FIRB approval. Korean institutional investors active in Sydney/Melbourne CBD." },
    ],
    countrySideRemindersHeading: "Korea-side reminders (worldwide income, exit tax)",
    countrySideReminders: [
      "**Korean global income tax** applies to Korean tax residents — including AU dividends, interest and rental income.",
      "**Korean exit tax** may apply when Korean residents move overseas, on unrealised gains in stock holdings.",
      "**FX outflow controls** — large overseas remittances require Korean bank documentation; not as restrictive as China but worth planning around.",
    ],
    ctaLinks: [
      { label: "Use FIRB property guide", href: "/foreign-investment/property", primary: true },
      { label: "Buy AU property as a foreigner — full guide", href: "/foreign-investment/guides/buy-property-australia-foreigner" },
      { label: "Find a Korea-AU tax specialist", href: "/advisors/international-tax-specialists" },
    ],
  },
  fxCorridor: {
    eyebrow: "KRW → AUD",
    title: "Sending money from Korea to Australia",
    sub: "KRW-AUD is commodity-correlated. Specialist providers can save 1–2% vs Korean retail banks.",
    options: [
      {
        name: "Korean banks (KEB Hana, Shinhan, KB)",
        cost: "1–2% margin + fees",
        speed: "1–3 business days",
        note: "Default. Documentation required for large amounts under FX outflow rules.",
        badge: "Default route",
        badgeAccent: "slate",
      },
      {
        name: "Wise / Sentbe / Cross Border Remit",
        cost: "0.4–0.9% margin",
        speed: "Same-day to 2 days",
        note: "Specialist providers — tighter spreads. Korean fintechs active in this corridor.",
        badge: "Recommended",
        badgeAccent: "emerald",
      },
      {
        name: "Multi-currency account",
        cost: "0.5–1% margin",
        speed: "Instant balance hold",
        note: "Hold KRW/AUD; convert when favourable. For ongoing flows.",
        badge: "For active FX",
        badgeAccent: "blue",
      },
    ],
    ctaLabel: "Compare KRW → AUD live rates",
    ctaHref: "/foreign-investment/send-money-australia",
  },
  dta: {
    eyebrow: "Korea-AU DTA",
    title: "Korea–Australia DTA rates + KAFTA investment chapter",
    sub: "DTA prevents double taxation; KAFTA Chapter 11 adds investment protections (national treatment, MFN, ISDS).",
    countrySideHeading: "Korea tax treatment",
    rows: [
      { type: "Unfranked dividends", noTreaty: "30%", withTreaty: "15%", countrySideNote: "Taxed in Korea with credit for AU WHT" },
      { type: "Fully franked dividends", noTreaty: "0%", withTreaty: "0%", countrySideNote: "Korean income tax may apply" },
      { type: "Interest", noTreaty: "10%", withTreaty: "15%", countrySideNote: "Taxed in Korea with credit for AU WHT" },
      { type: "Royalties", noTreaty: "30%", withTreaty: "15%", countrySideNote: "Taxed in Korea with credit for AU WHT" },
      { type: "Capital gains (listed shares)", noTreaty: "0% (exempt)", withTreaty: "0% (exempt)", countrySideNote: "Korean CGT rules may apply" },
      { type: "Capital gains (AU property)", noTreaty: "Taxable in AU", withTreaty: "Taxable in AU", countrySideNote: "AU CGT applies — DTA credit in Korea" },
    ],
    countryReportingHeading: "Korea-side reporting essentials",
    countryReporting: [
      "Korean tax residents declare worldwide income on annual NTS return",
      "Foreign tax credit available for AU WHT paid",
      "Overseas financial account reporting (해외금융계좌신고) for accounts above KRW 500M",
      "Korean exit tax may apply to unrealised gains on emigration",
    ],
    ctaLabel: "Find a Korea-AU cross-border tax accountant",
    ctaHref: "/advisors/international-tax-specialists",
  },
  expat: {
    eyebrow: "Australian Expat",
    title: "If you're an Australian living in Korea",
    sub: "Korean tax residency triggered by 183+ days/year. Worldwide income reportable; DTA prevents double taxation.",
    cards: [
      { title: "Korean tax residency", body: "183+ days/year triggers Korean tax residency. Worldwide income reportable to NTS; DTA credit for AU tax paid. Long-stay residents may face Korean exit tax on unrealised gains when leaving." },
      { title: "AU super while in Korea", body: "Preserved. Cannot make personal contributions while non-resident. Access at preservation age. Korean tax treatment of AU super lump sums depends on residency status." },
      { title: "Returning home", body: "Becoming AU tax resident triggers deemed acquisition of overseas assets at market value. Korean exit tax may apply to unrealised gains in Korean holdings — model the timing carefully." },
    ],
  },
  migration: {
    eyebrow: "Visa Pathways",
    title: "Visa options for Korean investors",
    sub: "Common pathways for Korean professionals and HNW investors.",
    pathways: [
      { name: "Significant Investor (188C → 888C)", note: "$5M+ in complying investments. Popular with HNW Korean individuals." },
      { name: "Investor stream (188B → 888B)", note: "$1.5M in designated investments for 4 years; state-nominated." },
      { name: "Skilled migration (189/190)", note: "Points-tested. Korean professionals (engineering, medical, IT) common in shortage occupations." },
      { name: "Working Holiday (subclass 417)", note: "Available to Korean citizens under 31." },
    ],
    ctaLink: { label: "Find a Korea-AU migration specialist", href: "/advisors/migration-agents" },
  },
  sectorOpportunity: {
    eyebrow: "2026 Opportunity — Korea angle",
    title: "Korean battery supply-chain investment in Australia",
    body:
      "Australia supplies ~50% of global lithium. Korean battery makers (Samsung SDI, LG Energy Solution, SK On) and trading companies (POSCO Holdings) are deeply engaged in AU lithium hydroxide processing partnerships. The 78-project AU Critical Minerals Prospectus specifically targets Korean co-investors. Lithium demand for Korean EV batteries is projected to grow 500-700% by 2030.",
    stats: [
      { label: "Australian global lithium share", value: "~50%", sub: "" },
      { label: "Major Korean groups invested", value: "5+", sub: "" },
      { label: "AU critical minerals projects", value: "78", sub: "" },
    ],
    ctaLinks: [
      { label: "Browse mining opportunities", href: "/invest/mining/listings", primary: true },
      { label: "Read the full guide", href: "/article/australias-critical-minerals-boom-how-to-invest" },
    ],
  },
  brokers: {
    title: "ASX brokers that accept Korean residents",
    sub: "Interactive Brokers and Saxo Bank accept Korean residents for ASX investing. Verify eligibility before applying.",
  },
  advisorAnchor: {
    eyebrow: "Cross-border specialist",
    title: "Find a Korea-AU tax specialist",
    body: "Korea-Australia investment involves KAFTA rules, FIRB applications, DTA tax optimisation and critical-minerals sector expertise. A specialist advisor can structure your investment for maximum efficiency.",
    ctaLabel: "Find a Tax Specialist",
    ctaHref: "/advisors/international-tax-specialists",
    theme: "light",
  },
  opportunities: defaultOpportunities("Korean investors and Australian expats in Korea"),
  faq: [
    { q: "Can I buy ASX shares as a Korean resident?", a: "Yes — through Interactive Brokers, Saxo or another non-resident-friendly broker. Under the Korea-AU DTA, unfranked dividends are taxed at 15% AU WHT; fully franked 0%. Korean-side tax (with FTC for AU WHT) applies on your annual NTS return." },
    { q: "How does KAFTA help Korean investors?", a: "KAFTA (2014) Chapter 11 provides investment protections: national treatment (Korean investors treated no less favourably than Australian), most-favoured-nation, protection against expropriation without compensation, and ISDS. It does not raise FIRB screening thresholds materially. Critical-minerals partnerships also benefit from broader bilateral cooperation." },
    { q: "Does Korea tax my AU rental income?", a: "Yes if you are a Korean tax resident. Worldwide income is declared on the annual NTS return, with foreign tax credit available for AU tax paid. Foreign accounts above KRW 500M must be reported separately." },
    { q: "What's the Korean exit tax and does it affect AU emigration?", a: "Korea imposes an exit tax on unrealised capital gains in major Korean stock holdings when residents emigrate. If you're moving from Korea to Australia long-term, model the exit tax impact carefully — it may bite on Korean equity positions even before any AU transactions." },
    { q: "What's the lithium / critical minerals investment story?", a: "Korean battery makers (Samsung SDI, LG Energy Solution, SK On) need lithium hydroxide for EV cathodes. Australia supplies ~50% of global lithium. POSCO has built lithium hydroxide capacity with AU partners; SK Innovation has off-take agreements; LG Energy has joint ventures. The 78-project AU Critical Minerals Prospectus targets Korean co-investors specifically." },
  ],
  related: [
    { title: "Buy Property in Australia as a Foreigner", href: "/foreign-investment/guides/buy-property-australia-foreigner" },
    { title: "ASX Mining & Resources Stocks", href: "/foreign-investment/shares" },
    { title: "FIRB Property Guide", href: "/foreign-investment/property" },
    { title: "ASX Brokers for Non-Residents", href: "/compare/non-residents" },
    { title: "Send Money to Australia (KRW to AUD)", href: "/foreign-investment/send-money-australia" },
    { title: "Tax Guide for Non-Residents", href: "/foreign-investment/tax" },
  ],
  leadForms: {
    pdfChecklist: null,
    propertyShortlist: null,
    fxQuote: null,
    pensionTransfer: null,
  },
};

// ─── Malaysia ──────────────────────────────────────────────────────

export const MY_CONFIG: CountryConfig = {
  code: "my",
  defaultActions: [
    { emoji: "🇲🇾", label: "Investing in Australia from Malaysia", sublabel: "DTA, state stamp duty, BNM rules, MM2H — full guide", href: "/foreign-investment/malaysia" },
    { emoji: "📈", label: "Brokers that accept Malaysian residents", sublabel: "IBKR + Saxo + Tiger Brokers all confirmed", href: "/compare/non-residents" },
    { emoji: "🏠", label: "FIRB-eligible new properties", sublabel: "Melbourne off-the-plan top destination for Malaysian buyers", href: "/invest?firb=eligible" },
    { emoji: "📊", label: "State stamp duty surcharge guide", sublabel: "VIC/NSW 8%, QLD/WA/SA 7%, ACT 0% — calculate before you commit", href: "/foreign-investment/guides/stamp-duty-foreign-buyers" },
    { emoji: "💱", label: "MYR → AUD transfers", sublabel: "Wise/Instarem vs Maybank/CIMB — saves 1–2%", href: "/foreign-investment/send-money-australia" },
    { emoji: "👤", label: "Find a Malaysia-AU specialist", sublabel: "Cross-border tax + Labuan structuring", href: "/advisors/international-tax-specialists" },
  ],
  slug: "malaysia",
  countryName: "Malaysia",
  countryShort: "Malaysia",
  adjective: "Malaysian",
  flag: "🇲🇾",
  currency: "MYR",
  currencySymbol: "RM",
  metadata: {
    title: "Investing in Australia from Malaysia (2026) — Property, Shares & Tax Guide",
    description: "Malaysian investors in Australia: Malaysia-AU DTA (15% WHT), state stamp duty surcharges (NSW/VIC 8%), MYR/AUD currency planning, FIRB rules, ASX brokers for Malaysian residents. Updated 2026.",
    ogTitle: "Investing in Australia from Malaysia — 2026 Guide",
    ogSub: "DTA · Stamp Duty · FIRB · ASX Brokers · 2026",
  },
  hero: {
    flagPillText: "Malaysia · DTA in force · Updated 2026",
    h1Plain: "Investing in Australia",
    h1Highlight: "from Malaysia",
    h1Sub: "Property, Shares & Tax Guide for 2026",
    paragraph:
      "Malaysia is one of Australia's largest sources of foreign students and has a deep diaspora connection — particularly with Melbourne and Sydney. Many Malaysians own Australian investment properties, and Malaysian investors are active in ASX shares. State foreign-buyer stamp duty surcharges (NSW/VIC 8%, QLD/WA/SA 7%) often dominate the total cost.",
    stats: [
      { label: "Dividend WHT", value: "15%", sub: "Under Malaysia-AU DTA" },
      { label: "Interest WHT", value: "15%", sub: "Under Malaysia-AU DTA" },
      { label: "Royalties WHT", value: "15%", sub: "Under Malaysia-AU DTA" },
      { label: "VIC/NSW Surcharge", value: "8%", sub: "Foreign buyer stamp duty" },
    ],
  },
  toc: [
    { id: "audiences", label: "Two audiences" },
    { id: "property", label: "Property + FIRB" },
    { id: "tax", label: "DTA + Malaysia tax" },
    { id: "treaty", label: "State stamp duty" },
    { id: "fx", label: "MYR → AUD" },
    { id: "expat", label: "Aussie expat in MY" },
    { id: "migration", label: "Migration" },
    { id: "opportunities", label: "Platforms" },
    { id: "brokers", label: "Brokers" },
    { id: "faq", label: "FAQ" },
  ],
  audiences: {
    heading: "Malaysian resident or Malaysian-Australian?",
    sub: "Australian residency status determines whether foreign-buyer surcharges and FIRB apply.",
    cards: [
      {
        flagEmoji: "🇲🇾",
        title: "Malaysian resident (not AU PR/citizen)",
        accent: "blue",
        bullets: [
          "15% dividend WHT, 15% interest, 15% royalties (DTA)",
          "FIRB required for all property purchases",
          "Foreign-buyer stamp duty surcharges (up to 8%)",
          "No AU CGT on listed ASX shares (portfolio <10%)",
          "BNM (Bank Negara) ringgit outflow rules apply",
          "Labuan IBFC structures common for HNW investors",
        ],
      },
      {
        flagEmoji: "🇦🇺",
        title: "Malaysian-Australian (citizen or PR)",
        accent: "amber",
        bullets: [
          "No FIRB required (Australian citizen/PR)",
          "AU tax resident rules apply if living in Australia",
          "No foreign-buyer stamp duty surcharges",
          "Access to Australian super",
          "DTA prevents double taxation on Malaysia-source income",
        ],
      },
    ],
  },
  property: {
    eyebrow: "Property + FIRB",
    title: "Australian property as a Malaysian buyer",
    sub: "Malaysians often target Melbourne and Sydney. Stamp duty surcharges + FIRB add 8–10% to the headline price for non-residents.",
    banHeadline: "Established Dwelling Ban: Active until 31 March 2027",
    banDetail: "Malaysian citizens who are non-residents of Australia cannot purchase existing Australian homes until at least 31 March 2027. New off-the-plan remains available.",
    banLink: { label: "Full details", href: "/foreign-investment/guides/property-ban-2025" },
    tiles: [
      { label: "New dwelling / off-the-plan", state: "open", note: "FIRB approval required. NSW/VIC stamp duty surcharge 8% on top of standard duty." },
      { label: "Established home", state: "blocked", note: "Banned for non-residents until 31 March 2027." },
      { label: "Commercial property", state: "open", note: "Open with FIRB. Labuan-based structures sometimes used for HNW investors." },
    ],
    countrySideRemindersHeading: "Malaysia-side reminders (BNM, Labuan)",
    countrySideReminders: [
      "**Bank Negara Malaysia (BNM)** has rules on ringgit outflows. Verify documentation for large transfers.",
      "**Labuan IBFC** structures sometimes used by HNW Malaysian investors for international property; specialist advice essential.",
      "**Capital gains on AU property** taxable in AU; Malaysian residents can claim DTA credit for AU CGT paid.",
    ],
    ctaLinks: [
      { label: "Browse new property listings", href: "/foreign-investment/property", primary: true },
      { label: "Buy AU property as a foreigner — full guide", href: "/foreign-investment/guides/buy-property-australia-foreigner" },
      { label: "Find a Malaysia-AU property tax specialist", href: "/advisors/international-tax-specialists" },
    ],
  },
  treatyThresholds: {
    eyebrow: "Stamp Duty Surcharges",
    title: "Foreign buyer stamp duty surcharges by state",
    sub: "On top of standard stamp duty, foreign buyers pay an additional surcharge. These are state/territory taxes — not FIRB fees.",
    items: [
      { title: "Victoria (VIC)", threshold: "8%", desc: "Melbourne — most popular with Malaysian buyers. Annual land tax surcharge 4%." },
      { title: "New South Wales (NSW)", threshold: "8%", desc: "Sydney — high demand from Malaysian investors. Annual land tax surcharge 4%." },
      { title: "Queensland (QLD)", threshold: "7%", desc: "Brisbane, Gold Coast — growing interest. Land tax surcharge 3%." },
      { title: "Western Australia (WA)", threshold: "7%", desc: "Perth — lower property prices. No annual land tax surcharge." },
      { title: "South Australia (SA)", threshold: "7%", desc: "Adelaide — emerging market. No annual land tax surcharge." },
      { title: "ACT", threshold: "Nil", desc: "No foreign-buyer surcharge in ACT — comparatively cheaper for foreign buyers." },
    ],
  },
  fxCorridor: {
    eyebrow: "MYR → AUD",
    title: "Sending money from Malaysia to Australia",
    sub: "MYR-AUD has been volatile. Specialist providers consistently beat retail Malaysian banks by 1–2%.",
    options: [
      {
        name: "Malaysian banks (Maybank, CIMB, RHB)",
        cost: "1.5–2.5% margin + fees",
        speed: "1–3 business days",
        note: "Default. BNM documentation may be required for large amounts.",
        badge: "Default route",
        badgeAccent: "slate",
      },
      {
        name: "Wise / Instarem / IME",
        cost: "0.4–0.9% margin",
        speed: "Same-day to 2 days",
        note: "Specialist providers — significantly tighter spreads.",
        badge: "Recommended",
        badgeAccent: "emerald",
      },
      {
        name: "Multi-currency account",
        cost: "0.5–1% margin",
        speed: "Instant balance hold",
        note: "Hold MYR/AUD; convert when timing favourable.",
        badge: "For active FX",
        badgeAccent: "blue",
      },
    ],
    ctaLabel: "Compare MYR → AUD live rates",
    ctaHref: "/foreign-investment/send-money-australia",
  },
  dta: {
    eyebrow: "Malaysia-AU DTA",
    title: "Malaysia–Australia DTA rates",
    sub: "The DTA prevents double taxation; Malaysian residents pay 15% across most categories.",
    countrySideHeading: "Malaysia tax treatment",
    rows: [
      { type: "Unfranked dividends", noTreaty: "30%", withTreaty: "15%", countrySideNote: "Taxed in Malaysia with credit for AU WHT" },
      { type: "Fully franked dividends", noTreaty: "0%", withTreaty: "0%", countrySideNote: "Malaysian income tax may apply" },
      { type: "Interest", noTreaty: "10%", withTreaty: "15%", countrySideNote: "Taxed in Malaysia with credit for AU WHT" },
      { type: "Royalties", noTreaty: "30%", withTreaty: "15%", countrySideNote: "Taxed in Malaysia with credit for AU WHT" },
      { type: "Capital gains (listed shares)", noTreaty: "0% (exempt)", withTreaty: "0% (exempt)", countrySideNote: "Malaysia has no general CGT on shares" },
      { type: "Capital gains (AU property)", noTreaty: "Taxable in AU", withTreaty: "Taxable in AU", countrySideNote: "AU CGT applies — no DTA exemption" },
    ],
    countryReportingHeading: "Malaysia-side reporting essentials",
    countryReporting: [
      "Malaysian individual income tax return: AU dividends, interest, rental reportable",
      "Foreign tax credit available for AU WHT paid",
      "Capital gains generally not taxed in Malaysia (limited exceptions for property)",
      "Labuan structures have separate reporting under Labuan tax regime",
    ],
    ctaLabel: "Find a Malaysia-AU cross-border tax specialist",
    ctaHref: "/advisors/international-tax-specialists",
  },
  expat: {
    eyebrow: "Australian Expat",
    title: "If you're an Australian living in Malaysia",
    sub: "Malaysian tax residency triggered by 183+ days/year. Common for AU expats on MM2H or working visas.",
    cards: [
      { title: "Malaysian tax residency", body: "183+ days/year triggers Malaysian tax residency. Malaysia generally taxes on territorial basis (Malaysia-source income), but reform has narrowed exemptions on remitted foreign income for individuals." },
      { title: "AU super while in MY", body: "Preserved. Cannot make personal contributions while non-resident. Access at preservation age. Malaysian tax treatment of AU super lump sums depends on residency status." },
      { title: "Returning home", body: "Becoming AU tax resident again triggers deemed acquisition of overseas assets at market value. Malaysian gains accrued during your MY period typically aren't AU-taxable." },
    ],
  },
  migration: {
    eyebrow: "Migration",
    title: "Pathways from Malaysia to Australia",
    sub: "Malaysian-trained professionals are common in AU shortage occupations.",
    pathways: [
      { name: "Skilled migration (189/190/491)", note: "Points-tested. Common for Malaysian professionals in shortage occupations." },
      { name: "Significant Investor (188C → 888C)", note: "$5M+ in complying investments. Popular with HNW Malaysian individuals." },
      { name: "Business Innovation (188A → 888A)", note: "$800K turnover business + $625K net assets. State nomination required." },
      { name: "Student-to-skilled pathway", note: "Common path for Malaysian students who graduate from AU universities and transition to skilled visas." },
    ],
    ctaLink: { label: "Find a Malaysia-AU migration agent", href: "/advisors/migration-agents" },
  },
  brokers: {
    title: "ASX brokers that accept Malaysian residents",
    sub: "IBKR, Saxo and Tiger Brokers accept Malaysian residents. Verify eligibility before applying.",
  },
  advisorAnchor: {
    eyebrow: "Cross-border specialist",
    title: "Find a specialist advisor for Malaysian investors",
    body: "Malaysia-Australia property investment involves FIRB, state stamp duty surcharges, DTA optimisation and currency management. A specialist advisor can navigate all of these.",
    ctaLabel: "Find a Tax Specialist",
    ctaHref: "/advisors/international-tax-specialists",
    theme: "light",
  },
  opportunities: defaultOpportunities("Malaysian investors and Malaysian-Australians"),
  faq: [
    { q: "Can I buy ASX shares as a Malaysian resident?", a: "Yes — through Interactive Brokers, Saxo, Tiger Brokers or another non-resident-friendly broker. Under the Malaysia-AU DTA, unfranked dividends are taxed at 15% AU WHT; fully franked 0%. Malaysia-side tax (with FTC for AU WHT) applies." },
    { q: "What are the foreign-buyer surcharges by state?", a: "Victoria 8%, NSW 8%, Queensland 7%, WA 7%, SA 7%, ACT 0%. These are paid on top of standard stamp duty and apply to non-resident foreigners. Australian citizens or PRs of Malaysian origin do NOT pay these surcharges." },
    { q: "Do I need FIRB approval as a Malaysian non-resident?", a: "Yes. Non-resident Malaysians need FIRB approval for any AU property purchase. New dwellings are generally approved; established dwellings are banned for foreign buyers until 31 March 2027." },
    { q: "What's a Labuan IBFC structure and is it useful?", a: "Labuan International Business and Financial Centre is a Malaysian offshore jurisdiction with low tax rates and access to Malaysia's DTA network. Some Malaysian HNW investors use Labuan entities for international investment structuring. Specialist advice is essential — Labuan structures must satisfy substance and beneficial-ownership requirements to access DTA benefits." },
    { q: "Does Malaysia tax my AU rental income?", a: "Recent reforms have narrowed Malaysia's territorial exemption for individuals on remitted foreign income. AU rental income remitted to Malaysia may now be taxable in some cases — specialist Malaysian tax advice essential." },
  ],
  related: [
    { title: "Buy Property in Australia as a Foreigner", href: "/foreign-investment/guides/buy-property-australia-foreigner" },
    { title: "Foreign Buyer Property Ban 2025–2027", href: "/foreign-investment/guides/property-ban-2025" },
    { title: "FIRB Property Guide", href: "/foreign-investment/property" },
    { title: "ASX Brokers for Non-Residents", href: "/compare/non-residents" },
    { title: "Send Money to Australia (MYR to AUD)", href: "/foreign-investment/send-money-australia" },
    { title: "Tax Guide for Non-Residents", href: "/foreign-investment/tax" },
  ],
  leadForms: {
    pdfChecklist: null,
    propertyShortlist: null,
    fxQuote: null,
    pensionTransfer: null,
  },
};

// ─── United Arab Emirates ──────────────────────────────────────────

export const AE_CONFIG: CountryConfig = {
  code: "ae",
  defaultActions: [
    { emoji: "🇦🇪", label: "Investing in Australia from UAE/Dubai", sublabel: "No DTA, franked-dividend strategy, FIRB — full guide", href: "/foreign-investment/united-arab-emirates" },
    { emoji: "💎", label: "High-franking ASX dividend strategy", sublabel: "0% AU WHT on franked dividends — your lever vs the no-DTA penalty", href: "/foreign-investment/shares" },
    { emoji: "📈", label: "Brokers that accept UAE residents", sublabel: "IBKR ME + Saxo most common", href: "/compare/non-residents" },
    { emoji: "🏠", label: "FIRB-eligible new properties", sublabel: "New dwellings + commercial only — established homes blocked till 2027", href: "/invest?firb=eligible" },
    { emoji: "💱", label: "AED → AUD transfers", sublabel: "Wise/OFX vs Emirates NBD/ADCB — saves 1–2%", href: "/foreign-investment/send-money-australia" },
    { emoji: "👤", label: "Find a UAE-AU specialist", sublabel: "No-DTA structuring + Arabic-speaking advisors", href: "/advisors" },
  ],
  slug: "united-arab-emirates",
  countryName: "United Arab Emirates",
  countryShort: "UAE",
  adjective: "UAE",
  flag: "🇦🇪",
  currency: "AED",
  currencySymbol: "AED",
  metadata: {
    title: "Investing in Australia from UAE / Dubai — Tax Rates & Property Guide 2026",
    description: "UAE residents (Dubai, Abu Dhabi) investing in Australia: no DTA — 30% dividend WHT applies. Franked-dividend strategies, FIRB property rules, established dwelling ban 2025–2027, ASX broker access. Updated March 2026.",
    ogTitle: "Investing in Australia from UAE / Dubai — 2026 Guide",
    ogSub: "No DTA · Franked Dividends · FIRB · 2026",
  },
  hero: {
    flagPillText: "UAE / Dubai · No DTA · Updated March 2026",
    h1Plain: "Investing in Australia",
    h1Highlight: "from UAE / Dubai",
    h1Sub: "No DTA — Here's What That Means in 2026",
    paragraph:
      "Australia and the UAE have no Double Tax Agreement, which means UAE residents pay full Australian withholding rates on unfranked dividends (30%) and royalties (30%). However, fully franked dividends remain at 0% WHT, interest is still 10%, and non-residents are generally exempt from AU CGT on listed shares. The UAE's zero personal income tax means the AU WHT is your only tax layer.",
    stats: [
      { label: "Dividend WHT", value: "30%", sub: "No DTA — full rate" },
      { label: "Interest WHT", value: "10%", sub: "Standard ATO rate" },
      { label: "Royalties WHT", value: "30%", sub: "No DTA — full rate" },
    ],
  },
  toc: [
    { id: "audiences", label: "Two audiences" },
    { id: "property", label: "Property + FIRB" },
    { id: "no-dta", label: "No DTA — what it means" },
    { id: "tax", label: "Withholding rates" },
    { id: "fx", label: "AED → AUD" },
    { id: "expat", label: "Aussie expat in UAE" },
    { id: "migration", label: "Migration" },
    { id: "opportunities", label: "Platforms" },
    { id: "brokers", label: "Brokers" },
    { id: "faq", label: "FAQ" },
  ],
  criticalWarning: {
    title: "No Double Tax Agreement: 30% WHT on Unfranked Dividends",
    body: "Australia and the UAE have no DTA. Unfranked dividends attract the maximum 30% AU withholding tax rate. **Fully franked dividends remain at 0% WHT** — prioritising franked ASX shares is the single most important strategy decision for UAE investors.",
  },
  audiences: {
    heading: "UAE resident investing from Dubai, or Australian expat in UAE?",
    sub: "Both audiences benefit from UAE's zero personal income tax. The no-DTA disadvantage is real but largely solvable through franked-dividend strategies.",
    cards: [
      {
        flagEmoji: "🇦🇪",
        title: "UAE resident",
        accent: "blue",
        bullets: [
          "30% WHT on unfranked dividends — no DTA reduction",
          "0% WHT on fully franked dividends — same as DTA countries",
          "10% interest WHT, 30% royalties (no DTA reduction)",
          "UAE has no personal income tax — AU WHT is final tax",
          "No AU CGT on listed shares (portfolio <10%)",
          "FIRB required for property; foreign-buyer surcharges apply",
        ],
      },
      {
        flagEmoji: "🇦🇺",
        title: "Australian expat in UAE",
        accent: "amber",
        bullets: [
          "AU tax residency depends on permanent home + ties (not just days)",
          "If non-resident: AU WHT only; no AU income tax on worldwide income",
          "AU super preserved; cannot contribute personally while non-resident",
          "On return: CGT rebasing applies; plan disposals around the move",
          "Common pattern: UAE-employed, AU-domiciled investments",
        ],
      },
    ],
  },
  property: {
    eyebrow: "Property + FIRB",
    title: "Australian property as a UAE buyer",
    sub: "Standard FIRB and foreign-buyer rules apply. UAE-resident citizens (other than AU citizens/PRs) face state stamp-duty surcharges.",
    banHeadline: "Established Dwelling Ban: Active until 31 March 2027",
    banDetail: "UAE residents cannot purchase existing Australian homes until at least 31 March 2027. New off-the-plan and new developments remain available with FIRB approval.",
    banLink: { label: "Full details", href: "/foreign-investment/guides/property-ban-2025" },
    tiles: [
      { label: "New dwelling / off-the-plan", state: "open", note: "FIRB approval required. State stamp duty surcharges 7–8% on top of standard." },
      { label: "Established home", state: "blocked", note: "Banned for foreign buyers until 31 March 2027." },
      { label: "Commercial property", state: "open", note: "Open to UAE buyers with FIRB approval. Higher thresholds for commercial than residential." },
    ],
    countrySideRemindersHeading: "UAE-side reminders (zero income tax, no CGT)",
    countrySideReminders: [
      "**UAE has no personal income tax** — AU WHT is the only tax on AU dividends, interest and rental income.",
      "**UAE has no personal CGT** — AU exempt CGT on listed shares means total CGT can be zero for UAE residents.",
      "**Stamp duty surcharges** still apply at the AU state level — NSW/VIC 8%, QLD/WA/SA 7%.",
    ],
    ctaLinks: [
      { label: "Browse Australian property", href: "/foreign-investment/property", primary: true },
      { label: "Buy AU property as a foreigner — full guide", href: "/foreign-investment/guides/buy-property-australia-foreigner" },
      { label: "Find an Arabic-speaking advisor", href: "/advisors" },
    ],
  },
  fundTrap: {
    eyebrow: "No DTA",
    title: "What 'no DTA' means for UAE investors",
    sub: "Without a Double Tax Agreement, full Australian withholding rates apply. But the UAE's zero personal income tax means the AU WHT is the only tax — and franked dividends still come through at 0%.",
    warningTitle: "Disadvantages of no DTA",
    bullets: [
      "**30% WHT on unfranked dividends** — significantly reduces yield vs DTA countries (15% rate elsewhere)",
      "**30% WHT on royalties** — affects IP-holding structures and licensing income",
      "**No formal mechanism** to avoid double taxation — but UAE has no income tax, so this is less impactful",
      "**Higher effective cost** for unfranked dividend strategies",
    ],
    recommendation:
      "**Strategy tip — focus on fully franked ASX dividends.** Australian blue-chip companies (banks, retailers, established industrials) pay high levels of franked dividends. For UAE residents, fully franked dividends carry **0% Australian withholding tax** — equivalent to DTA countries. A portfolio focused on high-franking ASX companies is highly tax-efficient. UAE has no personal income tax, so 0% WHT = 0% total tax.",
  },
  fxCorridor: {
    eyebrow: "AED → AUD",
    title: "Sending money from UAE to Australia",
    sub: "AED is pegged to USD, making AED-AUD effectively a USD-AUD transfer. Specialist providers consistently beat retail UAE banks by 1–2%.",
    options: [
      {
        name: "UAE banks (Emirates NBD, ADCB, FAB)",
        cost: "1–2% margin + fees",
        speed: "1–3 business days",
        note: "Default. Online banking transfers convenient but rarely cheapest.",
        badge: "Default route",
        badgeAccent: "slate",
      },
      {
        name: "Wise / OFX / TransferGo",
        cost: "0.3–0.7% margin",
        speed: "Same-day to 2 days",
        note: "Specialist providers — tightest spreads. UAE Central Bank-licensed.",
        badge: "Recommended",
        badgeAccent: "emerald",
      },
      {
        name: "Multi-currency account",
        cost: "0.4–0.7% margin",
        speed: "Instant balance hold",
        note: "Hold AED/USD/AUD; convert when timing favourable. Useful for property settlements.",
        badge: "For active FX",
        badgeAccent: "blue",
      },
    ],
    ctaLabel: "Compare AED → AUD live rates",
    ctaHref: "/foreign-investment/send-money-australia",
  },
  dta: {
    eyebrow: "Withholding Rates",
    title: "Australian withholding rates for UAE investors (no DTA)",
    sub: "Without a DTA, full ATO rates apply. UAE has no personal income tax — so the AU WHT is your only tax.",
    countrySideHeading: "UAE tax treatment",
    rows: [
      { type: "Unfranked dividends", noTreaty: "30%", withTreaty: "30% (no DTA)", countrySideNote: "UAE has no personal income tax — AU WHT is final tax" },
      { type: "Fully franked dividends", noTreaty: "0%", withTreaty: "0% (same)", countrySideNote: "0% AU + 0% UAE = total 0% tax" },
      { type: "Interest", noTreaty: "10%", withTreaty: "10% (same)", countrySideNote: "10% AU WHT is final tax" },
      { type: "Royalties", noTreaty: "30%", withTreaty: "30% (no DTA)", countrySideNote: "UAE has no personal income tax — AU WHT is final" },
      { type: "Capital gains (listed shares)", noTreaty: "0% (exempt)", withTreaty: "0% (exempt)", countrySideNote: "UAE has no CGT — total CGT on listed AU shares: zero" },
      { type: "Capital gains (AU property)", noTreaty: "Taxable in AU", withTreaty: "Taxable in AU", countrySideNote: "AU CGT applies; no UAE CGT" },
    ],
    countryReportingHeading: "UAE-side reporting essentials",
    countryReporting: [
      "UAE has no personal income tax — no individual reporting required for personal investment income",
      "UAE participates in CRS — AU financial institution data flows back via reciprocal exchange",
      "UAE corporate tax (introduced 2023) applies to UAE businesses but not individual investors",
      "Practical effect: AU WHT is the entire tax burden for UAE-resident individual investors",
    ],
    ctaLabel: "Find a UAE-AU cross-border tax accountant",
    ctaHref: "/advisors/international-tax-specialists",
  },
  expat: {
    eyebrow: "Australian Expat",
    title: "If you're an Australian living in UAE",
    sub: "Many AU expats in UAE retain AU tax residency unintentionally. The UAE's zero income tax only benefits you if you become non-resident for AU tax purposes.",
    cards: [
      { title: "AU tax residency test", body: "ATO uses a multi-factor test (permanent home, family ties, employment, intention) — not just days. Many AU expats in UAE retain AU residency and owe AU tax on worldwide income — losing the UAE zero-tax advantage." },
      { title: "AU super while in UAE", body: "Preserved. Cannot make personal contributions as non-resident. Access at preservation age. UAE does not tax AU super lump sums." },
      { title: "Returning home", body: "Becoming AU tax resident again triggers deemed acquisition of overseas assets at market value at re-entry. UAE earnings during your UAE period typically aren't AU-taxable." },
    ],
  },
  migration: {
    eyebrow: "Migration",
    title: "Pathways from UAE to Australia",
    sub: "Common for HNW UAE residents and expats; investor streams are particularly attractive given UAE's tax-free environment.",
    pathways: [
      { name: "Significant Investor (188C → 888C)", note: "$5M+ in complying investments. No age limit. Popular with UAE-based HNW migrants." },
      { name: "Skilled migration (189/190/491)", note: "Points-tested. Common for AU expats returning, or third-country expats in UAE." },
      { name: "Business Innovation (188A → 888A)", note: "$800K turnover business + $625K net assets. State nomination required." },
      { name: "Investor stream (188B → 888B)", note: "$1.5M in designated investments for 4 years; state-nominated." },
    ],
    ctaLink: { label: "Find a UAE-AU migration specialist", href: "/advisors/migration-agents" },
  },
  brokers: {
    title: "ASX brokers available to UAE residents",
    sub: "Verify eligibility directly before applying. IBKR Middle East and Saxo are common.",
  },
  advisorAnchor: {
    eyebrow: "Cross-border specialist",
    title: "Specialist advice for UAE investors",
    body: "UAE investors may benefit from specialist cross-border tax structuring advice to optimise their Australian investment strategy given the no-DTA situation. Our advisor directory includes international tax specialists and Arabic-speaking advisors.",
    ctaLabel: "Find an Advisor",
    ctaHref: "/advisors",
    theme: "light",
  },
  opportunities: defaultOpportunities("UAE investors and Australian expats in UAE"),
  faq: [
    { q: "What does 'no DTA' mean for UAE investors in Australia?", a: "Without a Double Tax Agreement, UAE residents pay full ATO withholding rates: 30% on unfranked dividends, 30% on royalties, 10% on interest. Fully franked dividends remain at 0% WHT regardless. The UAE has no personal income tax — so the AU WHT is your only tax burden." },
    { q: "What's the franked-dividend strategy?", a: "Australian blue-chip companies (banks, retailers, established industrials) pay high levels of franked dividends. For UAE residents, fully franked dividends carry 0% AU withholding tax — the same as DTA countries. A portfolio focused on high-franking ASX companies is highly tax-efficient (0% AU WHT + 0% UAE personal income tax = 0% total)." },
    { q: "Can I still buy AU property as a UAE resident?", a: "New dwellings yes (with FIRB approval). Established dwellings are banned for foreign buyers until 31 March 2027. State foreign-buyer stamp duty surcharges (7–8%) apply on top of standard stamp duty." },
    { q: "I'm an Australian living in UAE — am I still an AU tax resident?", a: "Often yes, despite living in UAE. The ATO uses a multi-factor test (permanent home, family ties, employment, intention) — not just days. Many AU expats in UAE retain AU residency and owe AU tax on worldwide income — losing the UAE zero-tax advantage. Engage a specialist before assuming non-resident status." },
    { q: "Does the UAE corporate tax (introduced 2023) affect individual investors?", a: "Generally no for personal investment income. UAE corporate tax applies to UAE-licensed businesses with profits above AED 375K. Personal investment income (dividends, interest, capital gains) earned by individual UAE residents is not subject to corporate or personal tax." },
  ],
  related: [
    { title: "Buy Property in Australia as a Foreigner", href: "/foreign-investment/guides/buy-property-australia-foreigner" },
    { title: "Foreign Buyer Property Ban 2025–2027", href: "/foreign-investment/guides/property-ban-2025" },
    { title: "ASX Brokers for Non-Residents", href: "/compare/non-residents" },
    { title: "Send Money to Australia (AED to AUD)", href: "/foreign-investment/send-money-australia" },
    { title: "Withholding Tax Guide", href: "/foreign-investment/tax" },
    { title: "Saudi Arabia investors page", href: "/foreign-investment/saudi-arabia" },
  ],
  leadForms: {
    pdfChecklist: null,
    propertyShortlist: null,
    fxQuote: null,
    pensionTransfer: null,
  },
};

// ─── Saudi Arabia ──────────────────────────────────────────────────

export const SA_CONFIG: CountryConfig = {
  code: "sa",
  defaultActions: [
    { emoji: "🇸🇦", label: "Saudi investors in Australia", sublabel: "No DTA, Vision 2030, Islamic finance, FIRB — full guide", href: "/foreign-investment/saudi-arabia" },
    { emoji: "💎", label: "High-franking ASX dividend strategy", sublabel: "0% AU WHT on franked dividends + 0% Saudi income tax = 0% total", href: "/foreign-investment/shares" },
    { emoji: "🕌", label: "Shariah-compliant investment options", sublabel: "MCCA + Hejaz + screened ASX equity portfolios", href: "/foreign-investment/shares" },
    { emoji: "⛏️", label: "Critical minerals + Vision 2030", sublabel: "PIF-aligned themes — lithium, cobalt, agricultural assets", href: "/invest/mining/listings" },
    { emoji: "🏠", label: "FIRB-eligible new properties", sublabel: "Government-linked investors face additional national-interest review", href: "/invest?firb=eligible" },
    { emoji: "👤", label: "Find a Saudi-AU specialist", sublabel: "No-DTA structuring + Islamic finance + Arabic-speaking advisors", href: "/advisors" },
  ],
  slug: "saudi-arabia",
  countryName: "Saudi Arabia",
  countryShort: "Saudi Arabia",
  adjective: "Saudi",
  flag: "🇸🇦",
  currency: "SAR",
  currencySymbol: "SAR",
  metadata: {
    title: "Saudi Arabian Investors in Australia (2026) — FIRB, Tax & Investment Guide",
    description: "Saudi investors in Australia: no DTA (standard 30% WHT on unfranked dividends), FIRB rules, agricultural opportunities, critical minerals, Islamic finance options, PIF activity. Updated 2026.",
    ogTitle: "Saudi Arabian Investors in Australia — 2026 Guide",
    ogSub: "FIRB · No DTA · Islamic Finance · Vision 2030 · 2026",
  },
  hero: {
    flagPillText: "Saudi Arabia · No DTA · Vision 2030 · Updated 2026",
    h1Plain: "Saudi Arabian Investors",
    h1Highlight: "in Australia",
    h1Sub: "FIRB, Tax & Investment Guide 2026",
    paragraph:
      "Saudi Arabia is one of Australia's fastest-growing investment partners, driven by the Public Investment Fund's global diversification mandate and Vision 2030. There is no Double Tax Agreement between Australia and Saudi Arabia — meaning standard Australian withholding rates apply. Franked dividends and Islamic finance structures offer significant advantages for Saudi investors.",
    stats: [
      { label: "Dividend WHT", value: "30%", sub: "No DTA" },
      { label: "FIRB Agricultural", value: "$15M", sub: "Threshold" },
      { label: "PIF AUM", value: "$750B+", sub: "Saudi sovereign wealth" },
      { label: "Islamic Finance", value: "Available", sub: "Halal structures" },
    ],
  },
  toc: [
    { id: "audiences", label: "Two audiences" },
    { id: "property", label: "Property + FIRB" },
    { id: "no-dta", label: "No DTA" },
    { id: "tax", label: "Withholding rates" },
    { id: "fx", label: "SAR → AUD" },
    { id: "migration", label: "Visa pathways" },
    { id: "sector", label: "Critical minerals" },
    { id: "opportunities", label: "Platforms" },
    { id: "brokers", label: "Brokers" },
    { id: "faq", label: "FAQ" },
  ],
  criticalWarning: {
    title: "No DTA — Standard 30% WHT Applies to Unfranked Dividends",
    body: "Australia and Saudi Arabia have no DTA. Unfranked dividends attract the maximum 30% withholding tax rate. **Fully franked dividends remain at 0% WHT** — prioritising franked ASX shares is critical for Saudi investors. Saudi has no personal income tax — the AU WHT is your only tax layer.",
  },
  audiences: {
    heading: "Saudi sovereign / institutional, or individual investor?",
    sub: "PIF and Aramco-linked deals receive separate national interest review; individual Saudi investors face standard non-resident rules.",
    cards: [
      {
        flagEmoji: "🏦",
        title: "Saudi sovereign / corporate",
        accent: "blue",
        bullets: [
          "PIF — $750B+ sovereign wealth fund, increasingly active in AU",
          "Saudi Aramco — strategic interest in AU LNG and energy assets",
          "FIRB review of all government-linked acquisitions regardless of size",
          "Vision 2030 diversification mandate driving global allocation",
          "Critical minerals partnerships emerging",
        ],
      },
      {
        flagEmoji: "👤",
        title: "Saudi individual investor",
        accent: "amber",
        bullets: [
          "30% WHT on unfranked dividends — no DTA reduction",
          "0% WHT on fully franked dividends — major advantage",
          "Saudi has no personal income tax — AU WHT is final tax",
          "No AU CGT on listed shares (portfolio <10%)",
          "Islamic finance structures available for property",
          "FIRB required for property; foreign-buyer surcharges apply",
        ],
      },
    ],
  },
  property: {
    eyebrow: "Property + FIRB",
    title: "Australian property as a Saudi buyer",
    sub: "Standard FIRB rules apply; agricultural land has lower thresholds. Government-linked Saudi investors face additional national-interest review.",
    banHeadline: "Established Dwelling Ban: Active until 31 March 2027",
    banDetail: "Saudi non-residents cannot purchase existing Australian homes until at least 31 March 2027. New off-the-plan properties remain available with FIRB approval.",
    banLink: { label: "Full details", href: "/foreign-investment/guides/property-ban-2025" },
    tiles: [
      { label: "New dwelling / off-the-plan", state: "open", note: "FIRB approval required. State stamp duty surcharges 7–8% on top of standard." },
      { label: "Established home", state: "blocked", note: "Banned for foreign buyers until 31 March 2027." },
      { label: "Commercial / agricultural", state: "open", note: "Agricultural land threshold $15M (cumulative). Strategic agricultural assets may face additional review." },
    ],
    countrySideRemindersHeading: "Saudi-side reminders (zero income tax, Islamic finance)",
    countrySideReminders: [
      "**Saudi Arabia has no personal income tax** — AU WHT is the only tax on AU dividends, interest and rental income.",
      "**Islamic finance structures** (Ijarah, diminishing Musharakah) are available in Australia through MCCA, Hejaz and others — Shariah-compliant property purchases possible.",
      "**Government-linked investors** (PIF, Aramco) require separate FIRB review regardless of deal size — plan for longer approval timelines.",
    ],
    ctaLinks: [
      { label: "Browse Australian property", href: "/foreign-investment/property", primary: true },
      { label: "Find an Arabic-speaking advisor", href: "/advisors" },
      { label: "Speak to an Islamic-finance specialist", href: "/advisors/international-tax-specialists" },
    ],
  },
  fxCorridor: {
    eyebrow: "SAR → AUD",
    title: "Sending money from Saudi Arabia to Australia",
    sub: "SAR is pegged to USD. Specialist providers can save 1–2% vs Saudi retail banks on large transfers.",
    options: [
      {
        name: "Saudi banks (Al Rajhi, SNB, Riyad Bank)",
        cost: "1–2% margin + fees",
        speed: "1–3 business days",
        note: "Default route. Documentation typically required for large transfers.",
        badge: "Default route",
        badgeAccent: "slate",
      },
      {
        name: "Wise / OFX (via UAE bridge)",
        cost: "0.5–1% margin",
        speed: "Same-day to 2 days",
        note: "Specialist providers — often routed via UAE entities for SAR-USD conversion.",
        badge: "Lower margin",
        badgeAccent: "emerald",
      },
      {
        name: "Saudi private banking",
        cost: "Negotiable",
        speed: "Same-day",
        note: "For HNW investors with established private bank relationships — often best for property settlements.",
        badge: "HNW",
        badgeAccent: "blue",
      },
    ],
    ctaLabel: "Compare SAR → AUD live rates",
    ctaHref: "/foreign-investment/send-money-australia",
  },
  dta: {
    eyebrow: "Withholding Rates",
    title: "Australian withholding rates for Saudi investors (no DTA)",
    sub: "Without a DTA, full ATO rates apply. Saudi has no personal income tax — so the AU WHT is the entire tax burden.",
    countrySideHeading: "Saudi tax treatment",
    rows: [
      { type: "Unfranked dividends", noTreaty: "30%", withTreaty: "30% (no DTA)", countrySideNote: "Saudi has no personal income tax — AU WHT is final tax" },
      { type: "Fully franked dividends", noTreaty: "0%", withTreaty: "0% (same)", countrySideNote: "0% AU + 0% Saudi = total 0% tax" },
      { type: "Interest", noTreaty: "10%", withTreaty: "10% (same)", countrySideNote: "10% AU WHT is final tax" },
      { type: "Royalties", noTreaty: "30%", withTreaty: "30% (no DTA)", countrySideNote: "Saudi has no personal income tax — AU WHT is final" },
      { type: "Capital gains (listed shares)", noTreaty: "0% AU (exempt)", withTreaty: "0% AU (exempt)", countrySideNote: "Saudi has no personal CGT — total CGT zero" },
      { type: "Capital gains (AU property)", noTreaty: "Taxable in AU", withTreaty: "Taxable in AU", countrySideNote: "AU CGT applies; no Saudi CGT" },
    ],
    countryReportingHeading: "Saudi-side reporting essentials",
    countryReporting: [
      "Saudi Arabia has no personal income tax — no individual reporting required for personal investment income",
      "Saudi Zakat (2.5%) applies to net assets for Muslims — religious obligation, not state-imposed tax",
      "Saudi participates in CRS — AU financial institution data flows back",
      "Practical effect: AU WHT is the entire tax burden for individual Saudi investors",
    ],
    ctaLabel: "Find a Saudi-AU cross-border tax specialist",
    ctaHref: "/advisors/international-tax-specialists",
  },
  migration: {
    eyebrow: "Visa Pathways",
    title: "Visa options for Saudi investors",
    sub: "Australia offers several pathways for HNW investors seeking residency through capital deployment.",
    pathways: [
      { name: "Significant Investor (188C → 888C)", note: "$5M+ in complying investments. No age limit. Popular with Saudi HNW migrants." },
      { name: "Premium Investor (188D)", note: "$15M+ in complying investments. Faster pathway to PR. Very limited annual places." },
      { name: "Business Innovation (188A → 888A)", note: "$800K turnover business + $625K net assets. State nomination required." },
      { name: "Business Talent (132)", note: "For high-calibre business owners. State nomination + significant business history required." },
    ],
    ctaLink: { label: "Find a Saudi-AU migration agent", href: "/advisors/migration-agents" },
  },
  sectorOpportunity: {
    eyebrow: "2026 Opportunity — Saudi angle",
    title: "Vision 2030 and Australian critical minerals",
    body:
      "PIF's diversification mandate is driving Saudi capital toward AU agriculture (food security), critical minerals (lithium, cobalt for battery supply chains), commercial property and infrastructure. Saudi Aramco maintains strategic interest in AU LNG. The energy transition creates new minerals investment opportunities aligned with Vision 2030 industrial diversification.",
    ctaLinks: [
      { label: "Browse mining opportunities", href: "/invest/mining/listings", primary: true },
      { label: "Read the full guide", href: "/article/australias-critical-minerals-boom-how-to-invest" },
    ],
  },
  brokers: {
    title: "ASX brokers that accept Saudi residents",
    sub: "IBKR, Saxo and CMC Markets accept Saudi residents. KYC typically requires passport, proof of address, and source-of-funds documentation.",
  },
  advisorAnchor: {
    eyebrow: "Cross-border specialist",
    title: "Specialist advice for Saudi investors",
    body: "No DTA means careful tax structuring is essential. Find an accountant experienced in Saudi-Australia cross-border investment, plus an Islamic-finance specialist for halal-compliant property purchases.",
    ctaLabel: "Find a Tax Specialist",
    ctaHref: "/advisors/international-tax-specialists",
    theme: "light",
  },
  opportunities: defaultOpportunities("Saudi investors and Saudi expats"),
  faq: [
    { q: "Why is there no DTA between Saudi Arabia and Australia?", a: "Australia and Saudi Arabia have not concluded a Double Tax Agreement. Saudi has DTAs with many countries but not Australia. Practical impact for Saudi investors: full 30% AU withholding on unfranked dividends and royalties — but the UAE has no personal income tax, so AU WHT is the only tax." },
    { q: "What's the franked-dividend strategy?", a: "Fully franked Australian dividends carry 0% AU withholding tax (corporate tax already paid). For Saudi residents, this matches DTA-country treatment. A portfolio focused on high-franking ASX companies is highly tax-efficient: 0% AU + 0% Saudi personal income tax = 0% total." },
    { q: "What Islamic finance options are available in Australia?", a: "MCCA (Muslim Community Co-operative Australia) and Hejaz Financial Services are the longest-established providers of Shariah-compliant home finance (Ijarah, diminishing Musharakah). Shariah-screened ASX equity portfolios and Islamic managed funds also available. The Australian sukuk market is less developed than Malaysia or UAE." },
    { q: "Does PIF's Australian activity affect individual Saudi investors?", a: "Indirectly. PIF's growing AU presence improves diplomatic and investment relationships, supporting continued AU openness to Saudi capital. PIF's deals require separate FIRB national-interest review regardless of size; individual Saudi investors face standard non-resident rules without this additional layer." },
    { q: "Can I get an Australian visa through investment?", a: "Yes — the Significant Investor Visa (188C → 888C) requires $5M+ in complying investments and has no age limit; the Premium Investor (188D) requires $15M+ for a faster path. Both popular with Saudi HNW migrants. Specialist migration advice essential — eligible-investment criteria are strict." },
  ],
  related: [
    { title: "UAE investors in Australia", href: "/foreign-investment/united-arab-emirates" },
    { title: "Buy Property in Australia as a Foreigner", href: "/foreign-investment/guides/buy-property-australia-foreigner" },
    { title: "Foreign Buyer Property Ban 2025–2027", href: "/foreign-investment/guides/property-ban-2025" },
    { title: "ASX Brokers for Non-Residents", href: "/compare/non-residents" },
    { title: "Tax Guide for Non-Residents", href: "/foreign-investment/tax" },
    { title: "Send Money to Australia", href: "/foreign-investment/send-money-australia" },
  ],
  leadForms: {
    pdfChecklist: null,
    propertyShortlist: null,
    fxQuote: null,
    pensionTransfer: null,
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
  us: US_CONFIG,
  cn: CN_CONFIG,
  in: IN_CONFIG,
  hk: HK_CONFIG,
  sg: SG_CONFIG,
  nz: NZ_CONFIG,
  jp: JP_CONFIG,
  kr: KR_CONFIG,
  my: MY_CONFIG,
  ae: AE_CONFIG,
  sa: SA_CONFIG,
};

export function getCountryConfig(
  code: IntentCountryCode,
): CountryConfig | undefined {
  return COUNTRY_CONFIGS[code];
}
