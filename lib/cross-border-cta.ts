/**
 * Country → cross-border specialty map for "Talk to a specialist" CTAs.
 *
 * Backlog #24 (FIN_NOTEBOOK 2026-05-01): cross-border leads are a 5–15× LTV
 * line vs domestic share-broker leads ($5–20k professional-fee spend per
 * UK-arrival in the first 18 months). The specialty taxonomy shipped on
 * 2026-05-02 in `lib/advisor-specialties.ts`; this helper closes the loop
 * by surfacing specialty-routed CTAs from every country surface so the
 * lead carries its specialty into /find-advisor — letting the matcher
 * (and downstream `lib/advisor-billing-multipliers.ts`) charge the 1.75×
 * premium tier instead of dumping the lead in the flat $39 pool.
 *
 * The helper accepts both:
 *   - ISO 3166-1 alpha-2 codes lowercased (e.g. "gb", "us", "in") — used
 *     by `app/foreign-investment/from/[country]` route params.
 *   - The intent-country slug used by the rich hubs (e.g. "united-kingdom",
 *     "hong-kong") — used by `app/foreign-investment/<slug>` pages.
 *   - The colloquial alias "uk" (mapped to "gb") because that's what
 *     copy/marketing actually uses.
 *
 * If a country has no specialty match the helper still returns the
 * country param so the destination page can pre-filter the geo dimension.
 * `specialty` is `null` in that case — callers decide whether to render
 * a generic "Find an advisor" CTA or skip the section entirely.
 */

export interface CrossBorderCta {
  /** Cross-border specialty from `lib/advisor-specialties.ts` lines 133-138, or null. */
  specialty:
    | "UK Pension Transfer"
    | "FATCA-Aware US Expat Planning"
    | "DASP Processing"
    | "FIRB Property (Non-Resident)"
    | null;
  /** Country dimension to forward — always lowercase ISO alpha-2 (gb, us, hk...). */
  countryParam: string;
  /** Display name for copy ("the UK", "Hong Kong", "Saudi Arabia"). */
  countryName: string;
  /**
   * CTA button label. When a specialty is matched, the button name calls it
   * out explicitly ("Talk to a UK Pension Transfer specialist") so the
   * destination is unambiguous. With no specialty match it falls back to a
   * country-scoped generic ("Talk to an advisor for HK investors").
   */
  ctaLabel: string;
  /** Sub-copy describing why the user should click. */
  ctaSub: string;
  /** Fully-qualified relative href to /find-advisor with both params populated. */
  href: string;
}

// ─── ISO alpha-2 (lowercase) → CrossBorderCta core data ─────────────────────

interface CountryMapping {
  countryParam: string;
  countryName: string;
  specialty: CrossBorderCta["specialty"];
  specialtyReason: string;
}

/**
 * Authoritative country → specialty map. Keyed by ISO alpha-2 lowercased.
 *
 * Mapping rationale (advisory; do not force a specialty where none fits):
 *  • gb → "UK Pension Transfer". The UK-arrival corridor has stranded
 *    private/state pensions — the single biggest LTV driver.
 *  • us → "FATCA-Aware US Expat Planning". US persons in Australia face
 *    FATCA + PFIC constraints on every AU portfolio choice; only specialists
 *    can structure correctly without triggering punitive US treatment.
 *  • For every other supported country the corridor is dominated by
 *    non-resident property and general-tax questions rather than one
 *    pension/citizenship-specific specialty. We surface the country
 *    dimension only — the lead lands in the broader advisor pool but
 *    the matcher still gets the country signal.
 *
 * NOT mapped: DASP Processing is an outbound (Australians leaving)
 * specialty, not an inbound corridor — it belongs on /super and /quit-aus
 * surfaces, not on /foreign-investment/from/[country]. FIRB Property
 * (Non-Resident) applies to any non-resident; we keep it generic rather
 * than per-country to avoid spamming every page with the same CTA.
 */
const COUNTRY_MAP: Record<string, CountryMapping> = {
  gb: {
    countryParam: "gb",
    countryName: "the UK",
    specialty: "UK Pension Transfer",
    specialtyReason:
      "Specialists who handle UK pension transfers, QROPS eligibility, and the AU-UK DTA can save tens of thousands over a single transfer decision.",
  },
  us: {
    countryParam: "us",
    countryName: "the US",
    specialty: "FATCA-Aware US Expat Planning",
    specialtyReason:
      "US citizens and green-card holders in Australia need an advisor who understands FATCA, PFIC traps, and the dual-filing burden — not every planner does.",
  },
  // Country-only mappings — no specialty, just the geo dimension.
  in: {
    countryParam: "in",
    countryName: "India",
    specialty: null,
    specialtyReason: "",
  },
  hk: {
    countryParam: "hk",
    countryName: "Hong Kong",
    specialty: null,
    specialtyReason: "",
  },
  cn: {
    countryParam: "cn",
    countryName: "China",
    specialty: null,
    specialtyReason: "",
  },
  jp: {
    countryParam: "jp",
    countryName: "Japan",
    specialty: null,
    specialtyReason: "",
  },
  my: {
    countryParam: "my",
    countryName: "Malaysia",
    specialty: null,
    specialtyReason: "",
  },
  nz: {
    countryParam: "nz",
    countryName: "New Zealand",
    specialty: null,
    specialtyReason: "",
  },
  sa: {
    countryParam: "sa",
    countryName: "Saudi Arabia",
    specialty: null,
    specialtyReason: "",
  },
  kr: {
    countryParam: "kr",
    countryName: "South Korea",
    specialty: null,
    specialtyReason: "",
  },
  sg: {
    countryParam: "sg",
    countryName: "Singapore",
    specialty: null,
    specialtyReason: "",
  },
  ae: {
    countryParam: "ae",
    countryName: "the UAE",
    specialty: null,
    specialtyReason: "",
  },
};

/**
 * Alias slugs that should resolve to the same mapping as an ISO code.
 * Covers the rich-hub directory names (`united-kingdom`, `hong-kong`...)
 * and the marketing alias `uk`. Keep in sync with
 * `lib/intent-context.ts` KNOWN entries so every country surface picks
 * up the same specialty.
 */
const ALIAS_TO_ISO: Record<string, string> = {
  uk: "gb",
  "united-kingdom": "gb",
  "united-states": "us",
  usa: "us",
  india: "in",
  "hong-kong": "hk",
  hongkong: "hk",
  china: "cn",
  japan: "jp",
  malaysia: "my",
  "new-zealand": "nz",
  newzealand: "nz",
  "saudi-arabia": "sa",
  "south-korea": "kr",
  singapore: "sg",
  "united-arab-emirates": "ae",
  uae: "ae",
};

function normaliseSlug(slug: string): string {
  return slug.trim().toLowerCase();
}

/**
 * Resolve any country slug (ISO alpha-2 lowercased, rich-hub slug, or
 * marketing alias) into a `CrossBorderCta`. Returns `null` when the slug
 * is unknown so callers can short-circuit the CTA section.
 */
export function getCrossBorderCta(
  countrySlug: string | null | undefined,
): CrossBorderCta | null {
  if (!countrySlug) return null;
  const slug = normaliseSlug(countrySlug);
  const iso = ALIAS_TO_ISO[slug] ?? slug;
  const mapping = COUNTRY_MAP[iso];
  if (!mapping) return null;

  const href = mapping.specialty
    ? `/find-advisor?specialty=${encodeURIComponent(mapping.specialty)}&country=${mapping.countryParam}`
    : `/find-advisor?country=${mapping.countryParam}`;

  const ctaLabel = mapping.specialty
    ? `Talk to a ${mapping.specialty} advisor`
    : `Talk to an advisor for ${mapping.countryName} investors`;

  const ctaSub = mapping.specialty
    ? mapping.specialtyReason
    : `Matched with Australian advisors experienced in ${mapping.countryName}-corridor tax and investment questions.`;

  return {
    specialty: mapping.specialty,
    countryParam: mapping.countryParam,
    countryName: mapping.countryName,
    ctaLabel,
    ctaSub,
    href,
  };
}

/** All ISO codes (lowercase) for which a mapping exists — useful in tests/audits. */
export const CROSS_BORDER_CTA_ISO_CODES = Object.keys(COUNTRY_MAP);
