/**
 * Consumer-facing copy — single source of truth for retail labels.
 *
 * Internal DB columns + admin / provider surfaces keep the marketplace
 * terminology ("Investor Brief", "Expert Team", "Brief Tracker"). Consumer
 * surfaces import from here so we get plain-English labels everywhere a
 * retail user sees them. Lets us A/B-test labels later by swapping one
 * file and keeping everything else stable.
 *
 * Naming rationale (validated with retail-user mental models):
 *   - "Investor Brief" sounds RFP-ish — retail users don't think of
 *     themselves as issuing briefs. "Get Quotes" is action-led and
 *     immediately understood.
 *   - "Expert Team" is fine but flat — "Pro Squad" leans into the team
 *     framing without being precious.
 *   - "Brief Tracker" → "Your Quotes" — inbox metaphor everyone knows.
 *   - "Listing Brief" → "Sell with Us" — verb-led, retail-clear.
 *   - "Second Opinion Brief" → drop "Brief". "Get a Second Opinion".
 *
 * Internal slugs / DB / admin labels stay marketplace-style. Don't
 * import this from an admin component.
 */

export const RETAIL_LABELS = {
  // ── Brief / quote noun ──
  investorBrief: "Match Request",
  investorBriefShort: "Quote",
  investorBriefPlural: "Quotes",

  // ── Expert team noun ──
  expertTeam: "Pro Squad",
  expertTeamPlural: "Pro Squads",

  // ── Tracker noun ──
  briefTracker: "Your Quotes",
  briefTrackerSingular: "Quote Status",

  // ── Listing brief noun ──
  listingBrief: "Listing",

  // ── Second opinion brief noun ──
  secondOpinion: "Second Opinion",

  // ── Risk-held banner ──
  riskHeldTitle: "Quick safety check",
  riskHeldBody:
    "Your answers mention topics that need a quick safety check. If you ask for quotes from this plan, we'll confirm before sending it to the pros — usually within a business day.",
} as const;

export const RETAIL_CTAS = {
  // ── Action plan primary CTAs (route-keyed) ──
  createBrief: "Get Quotes",
  createBriefForRoute: {
    individual: "Get Quotes from Verified Experts",
    firm: "Get Quotes from Verified Firms",
    expert_team: "Get Quotes from a Pro Squad",
    investor_brief: "Get Quotes",
    listing_brief: "Sell with Us",
    second_opinion: "Get a Second Opinion",
  } as const,

  // ── Browse routes ──
  browseListings: "Browse Opportunities",
  comparePlatforms: "Compare Platforms",

  // ── Save plan strip ──
  emailMyPlan: "Email my plan",
  createAccountToSave: "Create free account to save",
  skipAndBrowse: "Skip and browse",
} as const;

export const RETAIL_BLURBS = {
  // ── Result-screen save strip ──
  savePlanPrompt:
    "Want to save this plan or send a Match Request to verified Australian professionals?",
  savePlanSubtitle:
    "We'll email you a private link. No account needed.",

  // ── Account dashboard tile descriptions ──
  yourQuotesTile: "See the verified pros who responded to your requests.",
  yourPlansTile: "Pick up where you left off, or update your action plan.",
} as const;
