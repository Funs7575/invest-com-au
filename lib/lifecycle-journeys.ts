/**
 * Lifecycle journey graph — cross-hub routing by life-event arc.
 *
 * Each journey models a real financial life-event sequence that spans
 * multiple hubs. When a user is on hub X, we surface adjacent stages
 * ("where you might be coming from" and "where this leads") so they
 * can self-navigate the full arc without hunting through the site.
 *
 * Used by <LifecycleJourneyRail> which auto-renders on any HubPage
 * whose slug appears in at least one journey.
 *
 * L1 — lifecycle-funnel stream (BUILD-EVERYTHING-QUEUE.md)
 */

export interface JourneyStage {
  hubSlug: string;
  /** Short label shown in the rail card. */
  label: string;
  /** One-sentence description of what this stage covers. */
  tagline: string;
  /** URL path — defaults to /${hubSlug} if omitted. */
  href?: string;
}

export interface LifecycleJourney {
  id: string;
  /** Display name for the journey arc. */
  title: string;
  /** Short description shown in the rail header. */
  description: string;
  /** Ordered stages — users move through these sequentially. */
  stages: JourneyStage[];
  /** Hub slugs that act as entry points for this journey. */
  entryPoints: string[];
}

export const LIFECYCLE_JOURNEYS: LifecycleJourney[] = [
  {
    id: "founder-exit",
    title: "Founder Exit Journey",
    description:
      "From selling your business to deploying the proceeds tax-effectively across super, SMSF, and private markets.",
    entryPoints: ["sell-business"],
    stages: [
      {
        hubSlug: "sell-business",
        label: "Exit Your Business",
        tagline: "Valuation, advisers, tax strategy, and M&A process.",
      },
      {
        hubSlug: "lump-sum-investing",
        label: "Deploy Proceeds",
        tagline: "Structured plan for investing a windfall after settlement.",
      },
      {
        hubSlug: "smsf",
        label: "SMSF Setup",
        tagline: "Move proceeds into a tax-effective super vehicle you control.",
        href: "/invest/smsf",
      },
      {
        hubSlug: "private-markets",
        label: "Private Markets",
        tagline: "Pre-IPO, secondary, and wholesale deals for s708-eligible investors.",
        href: "/invest/private-equity",
      },
    ],
  },
  {
    id: "retiree-lifecycle",
    title: "Retiree Lifecycle Journey",
    description:
      "From retirement income planning through aged care decisions to estate outcomes.",
    entryPoints: ["retirement", "aged-care"],
    stages: [
      {
        hubSlug: "super",
        label: "Super Strategy",
        tagline: "Consolidate, salary-sacrifice, and maximise before retirement.",
      },
      {
        hubSlug: "retirement",
        label: "Retirement Planning",
        tagline: "Income drawdown, account-based pensions, and the age pension.",
      },
      {
        hubSlug: "aged-care",
        label: "Aged Care",
        tagline: "RAD/DAP planning, means test, and home care package navigation.",
      },
      {
        hubSlug: "inheritance",
        label: "Estate Planning",
        tagline: "Wills, probate, executor duties, and legacy transfer.",
      },
    ],
  },
  {
    id: "property-journey",
    title: "Property Journey",
    description:
      "From first home purchase through investment property and SMSF property strategy.",
    entryPoints: ["first-home-buyer", "home-loans"],
    stages: [
      {
        hubSlug: "home-loans",
        label: "Home Loan",
        tagline: "Compare rates, find a broker, and choose the right structure.",
      },
      {
        hubSlug: "first-home-buyer",
        label: "First Home",
        tagline: "FHSS, First Home Guarantee, and stamp duty concessions.",
        href: "/just/buying-first-home",
      },
      {
        hubSlug: "property",
        label: "Investment Property",
        tagline: "Negative gearing, rental yield, and property portfolio growth.",
      },
      {
        hubSlug: "smsf",
        label: "Property in SMSF",
        tagline: "LRBA borrowing rules and tax treatment in pension phase.",
        href: "/smsf/property",
      },
    ],
  },
  {
    id: "wealth-accumulation",
    title: "Wealth Accumulation Journey",
    description:
      "Building tax-effective long-term wealth across shares, super, and income assets.",
    entryPoints: ["dividends", "lump-sum-investing"],
    stages: [
      {
        hubSlug: "lump-sum-investing",
        label: "Invest a Lump Sum",
        tagline: "Deploy capital with a structured plan and DCA strategy.",
      },
      {
        hubSlug: "dividends",
        label: "Dividend Strategy",
        tagline: "Build a franking-credit income stream on the ASX.",
      },
      {
        hubSlug: "smsf",
        label: "SMSF",
        tagline: "Pension-phase tax exemption supercharges franking-credit returns.",
        href: "/invest/smsf",
      },
      {
        hubSlug: "private-markets",
        label: "Private Markets",
        tagline: "Diversify beyond listed equities into wholesale opportunities.",
        href: "/invest/private-equity",
      },
    ],
  },
  {
    id: "global-investor",
    title: "Global Investor Journey",
    description:
      "International investing from global shares through SMSF and cross-border tax planning.",
    entryPoints: ["global-investing"],
    stages: [
      {
        hubSlug: "global-investing",
        label: "Global Investing",
        tagline: "US shares, international ETFs, currency hedging, and W-8BEN.",
      },
      {
        hubSlug: "foreign-investment",
        label: "Overseas Property",
        tagline: "FIRB rules, tax treatment, and Australian structures.",
      },
      {
        hubSlug: "smsf",
        label: "Global Assets in SMSF",
        tagline: "Hold global ETFs and direct shares inside your SMSF tax-free.",
        href: "/invest/smsf",
      },
      {
        hubSlug: "tax",
        label: "Cross-Border Tax",
        tagline: "CGT, foreign income, and double-tax treaties for expats.",
      },
    ],
  },
  {
    id: "small-business",
    title: "Business Owner Journey",
    description:
      "From running a business through growth finance, succession, and exit.",
    entryPoints: ["grants", "sell-business"],
    stages: [
      {
        hubSlug: "grants",
        label: "R&D Grants",
        tagline: "R&D Tax Incentive and EMDG grants for growing businesses.",
      },
      {
        hubSlug: "smsf",
        label: "SMSF for Business",
        tagline: "Hold business premises in super for rent and asset protection.",
        href: "/invest/smsf",
      },
      {
        hubSlug: "sell-business",
        label: "Exit Your Business",
        tagline: "CGT small-business concessions and valuation before sale.",
      },
      {
        hubSlug: "lump-sum-investing",
        label: "Deploy Proceeds",
        tagline: "Put exit proceeds to work with a structured investment plan.",
      },
    ],
  },
];

/** Index: hubSlug → all journeys that include that stage. */
const JOURNEY_INDEX = new Map<string, LifecycleJourney[]>();
for (const journey of LIFECYCLE_JOURNEYS) {
  for (const stage of journey.stages) {
    const existing = JOURNEY_INDEX.get(stage.hubSlug) ?? [];
    if (!existing.includes(journey)) existing.push(journey);
    JOURNEY_INDEX.set(stage.hubSlug, existing);
  }
}

export interface JourneyContext {
  journey: LifecycleJourney;
  /** 0-based index of the current hub in journey.stages. */
  currentIndex: number;
  /** Stage before the current one, or null if first. */
  prevStage: JourneyStage | null;
  /** Stage after the current one, or null if last. */
  nextStage: JourneyStage | null;
}

/**
 * Return the journey contexts for a given hub slug.
 * Most hubs appear in only one journey; some (like SMSF) appear in several.
 * Returns the primary journey first (the one where this hub is an entryPoint,
 * or the first journey otherwise).
 */
export function getJourneyContexts(hubSlug: string): JourneyContext[] {
  const journeys = JOURNEY_INDEX.get(hubSlug) ?? [];
  if (journeys.length === 0) return [];

  // Sort: entry-point journeys first
  const sorted = [...journeys].sort((a, b) => {
    const aEntry = a.entryPoints.includes(hubSlug) ? 0 : 1;
    const bEntry = b.entryPoints.includes(hubSlug) ? 0 : 1;
    return aEntry - bEntry;
  });

  return sorted.map((journey) => {
    const currentIndex = journey.stages.findIndex((s) => s.hubSlug === hubSlug);
    const prevStage = currentIndex > 0 ? (journey.stages[currentIndex - 1] ?? null) : null;
    const nextStage =
      currentIndex < journey.stages.length - 1
        ? (journey.stages[currentIndex + 1] ?? null)
        : null;
    return { journey, currentIndex, prevStage, nextStage };
  });
}

/** Convenience: return just the first (primary) journey context for a hub. */
export function getPrimaryJourneyContext(hubSlug: string): JourneyContext | null {
  return getJourneyContexts(hubSlug)[0] ?? null;
}
