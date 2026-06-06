/**
 * Curated "Best {vertical} for {investor profile}" combos (Wave 8 SEO).
 *
 * Powers /invest/best-for/[combo] — high-intent landing pages that
 * intersect an opportunity vertical with an investor archetype
 * ("best commercial property for SMSF", "best funds for SIV applicants").
 * Each combo carries an authored rationale and a deep-link into the
 * pre-filtered marketplace, reusing the real filter params.
 *
 * Curated (not a full cartesian product) so every page has genuine,
 * differentiated editorial — not thin programmatic spam.
 */

export interface BestForCombo {
  /** URL slug, e.g. "commercial-property-for-smsf". */
  slug: string;
  /** /invest category slug the combo points at. */
  categorySlug: string;
  /** Human label for the vertical, e.g. "commercial property". */
  verticalLabel: string;
  /** Investor-profile label, e.g. "SMSF trustees". */
  profileLabel: string;
  /** Short page title fragment. */
  title: string;
  /** One-paragraph intro. */
  intro: string;
  /** 3–4 reasons this vertical suits this profile. */
  why: string[];
  /** Querystring (without leading ?) for the /invest deep-link. */
  filterQuery: string;
  /**
   * The category slug that `categoryForListing` returns for this combo's
   * listings, when it differs from `categorySlug`. SDA-housing listings,
   * for example, share the commercial-property bucket but are surfaced
   * under their own combo. Defaults to `categorySlug`.
   */
  matchCategory?: string;
  /** Optional sub_category to narrow the live-listing match (e.g. "sda_housing"). */
  subCategory?: string;
}

export const BEST_FOR_COMBOS: BestForCombo[] = [
  {
    slug: "commercial-property-for-smsf",
    categorySlug: "commercial-property",
    verticalLabel: "commercial property",
    profileLabel: "SMSF trustees",
    title: "Best commercial property for SMSF investors",
    intro: "Commercial property is one of the most popular and tax-efficient assets to hold inside a self-managed super fund — particularly business real property a member's own business can lease back at market rent.",
    why: [
      "Business real property can be acquired from a related party and leased to a related business at market rent — unique to commercial (not residential) property in super.",
      "Rental income is taxed at 15% in accumulation phase and 0% in pension phase; the CGT discount is one-third (effective 10%) after 12 months.",
      "LRBA bare-trust structures let an SMSF borrow to acquire property — many marketplace listings are flagged LRBA-compatible.",
      "Long WALE, single-tenant assets provide predictable cash flow suited to a fund's retirement objective.",
    ],
    filterQuery: "category=commercial-property",
  },
  {
    slug: "sda-housing-for-smsf",
    categorySlug: "sda-housing",
    verticalLabel: "SDA (NDIS) housing",
    profileLabel: "SMSF trustees",
    title: "Best SDA / NDIS housing for SMSF investors",
    intro: "Specialist Disability Accommodation pairs government-backed NDIS rent with the 15%/0% super tax environment — a combination that produces high, stable after-tax yields inside an SMSF.",
    why: [
      "NDIA pays Reasonable Rent Contribution directly, underpinning 10–13% gross yields.",
      "Net rent taxed at 15% (accumulation) or 0% (pension) inside super.",
      "New SDA builds carry substantial Division 43 capital-works and Division 40 plant depreciation.",
      "LRBA-compatible structures available for funds that want to gear the purchase.",
    ],
    // SDA listings live in the commercial_property vertical, distinguished
    // by sub_category — so they match the commercial-property bucket and
    // deep-link via the sub filter rather than a (non-existent) category.
    matchCategory: "commercial-property",
    subCategory: "sda_housing",
    filterQuery: "category=commercial-property&sub=sda_housing",
  },
  {
    slug: "bullion-for-smsf",
    categorySlug: "bullion",
    verticalLabel: "wholesale gold & bullion",
    profileLabel: "SMSF trustees",
    title: "Best gold & bullion for SMSF investors",
    intro: "Allocated bullion is a recognised SMSF asset class — a non-correlated store of value that satisfies the sole-purpose test when stored correctly.",
    why: [
      "Allocated metal vaulted at an APRA-approved depository satisfies the sole-purpose test.",
      "Investment-grade gold (≥99.5%), silver (≥99.9%) and platinum (≥99%) are GST-free.",
      "Non-correlated hedge against equity and property drawdowns in a concentrated fund.",
      "ASX gold ETFs (PMGOLD, GOLD) offer the same exposure with one-unit minimums and full liquidity.",
    ],
    filterQuery: "category=bullion",
  },
  {
    slug: "water-rights-for-smsf",
    categorySlug: "water-rights",
    verticalLabel: "water entitlements",
    profileLabel: "SMSF trustees",
    title: "Best water entitlements for SMSF investors",
    intro: "Water access entitlements are a long-duration, income-plus-growth real asset that SMSFs can hold subject to the sole-purpose test — uncorrelated with shares and property.",
    why: [
      "High-security entitlements deliver reliable lease income (3–5%) plus capital growth as scarcity tightens.",
      "Held subject to the sole-purpose test; income taxed at 15%/0% in super.",
      "Uncorrelated with equities — driven by rainfall cycles and agricultural demand.",
      "The 50% (⅓ in super) CGT discount applies on disposal after 12 months.",
    ],
    filterQuery: "category=water-rights",
  },
  {
    slug: "funds-for-siv-applicants",
    categorySlug: "funds",
    verticalLabel: "managed funds",
    profileLabel: "Significant Investor Visa (SIV) applicants",
    title: "Best SIV-complying funds for visa applicants",
    intro: "The Significant Investor Visa requires a $5M complying-investment portfolio with a prescribed minimum mix. SIV-complying managed funds are the core building block.",
    why: [
      "SIV-complying funds satisfy the complying-investment framework set by the Department of Home Affairs.",
      "Professional management meets the compliance and reporting demands of the visa.",
      "Filter the marketplace to SIV-complying listings to assemble a qualifying mix.",
      "Pair with the shortlist's SIV compliance score to track how close your portfolio gets to the threshold.",
    ],
    subCategory: "siv_complying",
    filterQuery: "category=funds&siv=complying",
  },
  {
    slug: "commercial-property-for-foreign-investors",
    categorySlug: "commercial-property",
    verticalLabel: "commercial property",
    profileLabel: "foreign investors",
    title: "Best commercial property for foreign investors",
    intro: "Commercial property is generally more accessible to foreign buyers than residential — but FIRB approval and state surcharges still apply. Filter to FIRB-eligible listings to start.",
    why: [
      "Commercial property faces fewer foreign-ownership restrictions than established residential dwellings.",
      "FIRB approval is still required — budget the federal application fee plus state surcharges.",
      "MIT-structured commercial assets can offer eligible foreign investors a 15% withholding rate.",
      "Each listing's after-tax estimator and the FIRB fee estimate model your true net cost.",
    ],
    filterQuery: "category=commercial-property&firb=eligible",
  },
  {
    slug: "startups-for-sophisticated-investors",
    categorySlug: "startups",
    verticalLabel: "startups",
    profileLabel: "sophisticated (wholesale) investors",
    title: "Best startup investments for sophisticated investors",
    intro: "Wholesale investors get access to priced angel rounds and ESVCLP funds — and the ESIC and ESVCLP tax concessions that make early-stage investing uniquely attractive in Australia.",
    why: [
      "ESIC-qualifying companies give a 20% non-refundable carry-forward tax offset plus a 10-year CGT exemption.",
      "ESVCLP funds pass through a flat 10% offset and a 100% CGT exemption at the fund level.",
      "Wholesale (s708) status unlocks priced rounds beyond retail equity-crowdfunding caps.",
      "Diversify across a fund rather than single deals — most startups fail.",
    ],
    filterQuery: "category=startups&esic=true",
  },
  {
    slug: "private-credit-for-retirees",
    categorySlug: "private-credit",
    verticalLabel: "private credit",
    profileLabel: "retirees & income investors",
    title: "Best private credit for retirees seeking income",
    intro: "Private credit funds target equity-like yields from senior-secured lending — attractive for income-focused investors, provided you understand the liquidity and default trade-offs.",
    why: [
      "Target yields well above term deposits, paid as regular income distributions.",
      "Senior-secured structures sit above equity in the capital stack.",
      "Inside an SMSF in pension phase, income distributions can be tax-free.",
      "Mind the liquidity: most funds have lock-ups and gated redemptions — size accordingly.",
    ],
    filterQuery: "category=private-credit&min_yield=6",
  },
  {
    slug: "funds-for-retirees",
    categorySlug: "funds",
    verticalLabel: "managed funds",
    profileLabel: "retirees & income investors",
    title: "Best income funds for retirees",
    intro: "Income-oriented managed funds — from listed REITs to private-credit and infrastructure funds — can underpin a retiree's cash flow. Filter to higher-distribution options and weigh fees.",
    why: [
      "Distribution-focused funds provide regular income to fund retirement spending.",
      "Franked-income funds add franking credits — grossed-up yield can materially exceed the cash yield.",
      "0% tax on distributions inside an SMSF pension account.",
      "Compare MER against the distribution yield — fees compound against you.",
    ],
    filterQuery: "category=funds&min_yield=5",
  },
  {
    slug: "buy-business-for-owner-operators",
    categorySlug: "buy-business",
    verticalLabel: "businesses for sale",
    profileLabel: "owner-operators",
    title: "Best businesses to buy for owner-operators",
    intro: "If you want to buy yourself a job-plus-asset, owner-operated businesses trade at lower multiples than manager-run ones — your sweat equity is the upside.",
    why: [
      "Owner-operated businesses price at lower SDE multiples than passive, manager-run ones.",
      "Going-concern transfers are GST-free, and small-business CGT concessions can apply on exit.",
      "You control operations, pricing and growth — unlike a passive financial asset.",
      "Verify the SDE add-backs survive a change of ownership before you commit.",
    ],
    filterQuery: "category=buy-business",
  },
  {
    slug: "carbon-credits-for-corporates",
    categorySlug: "carbon-credits",
    verticalLabel: "carbon & biodiversity credits",
    profileLabel: "corporates & Safeguard entities",
    title: "Best carbon credits for corporate buyers",
    intro: "Facilities covered by the reformed Safeguard Mechanism are structural buyers of ACCUs; corporates with voluntary net-zero targets buy ACCUs and certified offsets to retire.",
    why: [
      "ACCUs are tradeable into Safeguard Mechanism compliance for covered facilities.",
      "Voluntary units (Verra, Gold Standard) suit corporate net-zero retirement programs.",
      "Method matters — savanna-burning and HIR ACCUs carry different price premiums and co-benefits.",
      "Hold ACCUs via an ANREU registry account; trade via Xpansiv / CORE Markets.",
    ],
    filterQuery: "category=carbon-credits",
  },
  {
    slug: "renewable-energy-for-impact-investors",
    categorySlug: "renewable-energy",
    verticalLabel: "renewable energy",
    profileLabel: "impact & ESG investors",
    title: "Best renewable energy investments for impact investors",
    intro: "Renewable-energy project equity and clean-energy funds let impact-minded investors back the transition while targeting infrastructure-style returns.",
    why: [
      "Direct project equity in solar, wind and battery storage with contracted PPA cash flows.",
      "Listed clean-energy ETFs (FUEL, CLNE, ERTH) for diversified, liquid exposure.",
      "Measurable emissions-avoidance impact alongside financial return.",
      "Mind policy and grid-connection risk on pre-FID development equity.",
    ],
    filterQuery: "category=renewable-energy",
  },
];

export function getBestForCombo(slug: string): BestForCombo | undefined {
  return BEST_FOR_COMBOS.find((c) => c.slug === slug);
}
