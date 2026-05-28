/**
 * Embeddable widget content-filter catalogue.
 *
 * The /api/widget route accepts `?widget=` to pick from this list, in
 * addition to the existing `?type=table|compact`, `?theme=`, `?limit=`,
 * `?brokers=` controls. `?widget=` filters which brokers are eligible
 * to appear — the layout/theme params still control rendering.
 *
 * `?widget=` is OPTIONAL — when omitted, the route falls back to the
 * existing behaviour (top brokers by rating, optionally filtered by
 * `?brokers=`).
 *
 * Calculator widgets are served by the separate /api/widget/calculator
 * route (same Shadow DOM / CORS / ISR approach), configured via
 * CALCULATOR_WIDGET_CATALOGUE below.
 *
 * Suite routes (same Shadow DOM / CORS / ISR approach):
 *   /api/widget/advisors      — advisor directory widget
 *   /api/widget/fee-index     — AU brokerage fee index table
 *   /api/widget/health-scores — broker health score comparison
 *   /api/widget/badge         — single-entity score badge (advisor trust or broker health)
 *   /api/widget/best-rates    — top savings / term-deposit rates; co-branded for advisors
 *
 * All suite routes support an optional `?ref=<partnerId>` query param that
 * is threaded through to outbound invest.com.au links for partner attribution.
 * No new DB tables are created; the param is appended to href strings only.
 */

/** Widget kind discriminant — used in the EmbedBuilder tab/dropdown. */
export type WidgetKind =
  | "broker"
  | "calculator"
  | "advisors"
  | "fee-index"
  | "health-scores"
  | "badge"
  | "best-rates";

export type WidgetFilter = "all" | "asx" | "us" | "crypto" | "savings" | "term-deposits";

export interface WidgetCatalogueEntry {
  slug: string;
  label: string;
  description: string;
  filter: WidgetFilter;
  /** Heading text shown above the table in the rendered widget. */
  heading: string;
}

export const WIDGET_CATALOGUE: ReadonlyArray<WidgetCatalogueEntry> = [
  {
    slug: "cheapest-brokers",
    label: "Cheapest Brokers",
    description: "ASX brokers ranked by per-trade fee — refreshed daily.",
    filter: "asx",
    heading: "Cheapest Australian Brokers",
  },
  {
    slug: "us-shares",
    label: "Best Brokers for US Shares",
    description: "Brokers that offer US-share access with disclosed FX.",
    filter: "us",
    heading: "Best Brokers for US Shares",
  },
  {
    slug: "top-crypto",
    label: "Top Crypto Exchanges",
    description: "AUSTRAC-registered exchanges with AUD deposits.",
    filter: "crypto",
    heading: "Top AU Crypto Exchanges",
  },
  {
    slug: "savings-rates",
    label: "Best Savings Rates",
    description: "Latest high-interest savings accounts.",
    filter: "savings",
    heading: "Best Savings Rates",
  },
  {
    slug: "term-deposits",
    label: "Term Deposits",
    description: "Best fixed-rate term deposits this week.",
    filter: "term-deposits",
    heading: "Best Term Deposits",
  },
];

const BY_SLUG = new Map(WIDGET_CATALOGUE.map((w) => [w.slug, w]));

export function getWidgetCatalogueEntry(slug: string): WidgetCatalogueEntry | undefined {
  return BY_SLUG.get(slug);
}

export function listWidgetSlugs(): string[] {
  return WIDGET_CATALOGUE.map((w) => w.slug);
}

// ─── Calculator Widget types ──────────────────────────────────────────────────

/**
 * A calculator widget preset — a suggested configuration for the
 * /api/widget/calculator embed that publishers can copy as-is.
 */
export interface CalcWidgetPreset {
  slug: string;
  label: string;
  description: string;
  /** Default market shown in the rendered widget. */
  market: "asx" | "us";
  /** Default trade amount pre-filled in the widget input. */
  amount: number;
  /** Human-readable snippet hint shown in the embed builder. */
  snippetHint: string;
}

export const CALCULATOR_WIDGET_CATALOGUE: ReadonlyArray<CalcWidgetPreset> = [
  {
    slug: "asx-fees",
    label: "ASX Brokerage Comparison",
    description: "Live per-trade cost across every major AU broker — ASX shares.",
    market: "asx",
    amount: 5000,
    snippetHint: "Ideal for articles about ASX investing, stock brokers, or cost comparisons.",
  },
  {
    slug: "us-fees",
    label: "US Share Cost Comparison",
    description: "True per-trade cost including FX margin for US shares.",
    market: "us",
    amount: 5000,
    snippetHint: "Ideal for articles about US investing, international shares, or FX costs.",
  },
  {
    slug: "large-trade",
    label: "Large Trade Cost ($25k)",
    description: "Shows how percentage-based brokerage stings on larger trades.",
    market: "asx",
    amount: 25000,
    snippetHint: "Ideal for articles about high-value trades, ETFs, or wholesale investing.",
  },
];

const CALC_BY_SLUG = new Map(CALCULATOR_WIDGET_CATALOGUE.map((p) => [p.slug, p]));

export function getCalcWidgetPreset(slug: string): CalcWidgetPreset | undefined {
  return CALC_BY_SLUG.get(slug);
}

// ─── Advisor Widget types ─────────────────────────────────────────────────────

/** Supported AU states for the advisor directory widget filter. */
export const AU_STATES = ["NSW", "VIC", "QLD", "SA", "WA", "TAS", "ACT", "NT"] as const;
export type AuState = (typeof AU_STATES)[number];

/** Supported professional types for the advisor directory widget filter. */
export const ADVISOR_TYPES = [
  "financial-planner",
  "mortgage-broker",
  "accountant",
  "investment-advisor",
  "insurance-broker",
  "smsf-advisor",
] as const;
export type AdvisorType = (typeof ADVISOR_TYPES)[number];

// ─── Fee-Index Widget types ───────────────────────────────────────────────────

/** Supported sort columns for the fee-index widget. */
export type FeeIndexSortColumn = "asx_fee" | "us_fee" | "rating";

// ─── Suite widget metadata (used by EmbedBuilder) ────────────────────────────

/**
 * Metadata record for each widget in the suite, used to drive the
 * EmbedBuilder tab/dropdown and documentation snippets.
 */
export interface SuiteWidgetMeta {
  kind: WidgetKind;
  label: string;
  description: string;
  apiPath: string;
  /** Example query-param snippets shown in the embed docs. */
  snippets: { title: string; description: string; params: string }[];
}

export const SUITE_WIDGET_CATALOGUE: ReadonlyArray<SuiteWidgetMeta> = [
  {
    kind: "broker",
    label: "Broker Comparison",
    description: "Live broker comparison table or compact card layout.",
    apiPath: "/api/widget",
    snippets: [
      { title: "Top 5 brokers (default)", description: "Top-rated active brokers.", params: "" },
      { title: "Cheapest ASX brokers", description: "Sorted by ASX per-trade fee.", params: "?widget=cheapest-brokers" },
      { title: "US shares", description: "Brokers with US share access.", params: "?widget=us-shares" },
      { title: "Dark theme, compact", description: "Compact card layout for dark-mode sidebars.", params: "?type=compact&theme=dark&limit=3" },
    ],
  },
  {
    kind: "calculator",
    label: "Fee Calculator",
    description: "Interactive trade-cost calculator — visitors can adjust the trade amount.",
    apiPath: "/api/widget/calculator",
    snippets: [
      { title: "ASX fee calculator", description: "Default ASX brokerage comparison.", params: "" },
      { title: "US shares (with FX)", description: "True per-trade cost for US shares including FX margin.", params: "?market=us" },
      { title: "Large trade ($25k)", description: "Pre-fills $25k to show % brokerage sting.", params: "?amount=25000" },
    ],
  },
  {
    kind: "advisors",
    label: "Advisor Directory",
    description: "Embeddable financial-advisor directory with optional type/state filter.",
    apiPath: "/api/widget/advisors",
    snippets: [
      { title: "All advisors (default)", description: "Top-rated active advisors.", params: "" },
      { title: "Financial planners in NSW", description: "Filtered by type and state.", params: "?type=financial-planner&state=NSW" },
      { title: "Dark theme", description: "Advisor cards styled for dark-mode sites.", params: "?theme=dark" },
      { title: "With partner ref", description: "Partner attribution threaded through outbound links.", params: "?ref=yourpartnerId" },
    ],
  },
  {
    kind: "fee-index",
    label: "Fee Index Table",
    description: "AU brokerage fee index — sortable table of ASX and US share fees.",
    apiPath: "/api/widget/fee-index",
    snippets: [
      { title: "ASX fee index (default)", description: "All active brokers sorted by ASX fee.", params: "" },
      { title: "US share fee index", description: "Sorted by US share fee.", params: "?market=us&sort=us_fee" },
      { title: "Top-rated, limited to 5", description: "Sorted by editorial rating.", params: "?sort=rating&limit=5" },
      { title: "Dark theme", description: "Fee index styled for dark-mode sites.", params: "?theme=dark" },
    ],
  },
  {
    kind: "health-scores",
    label: "Health Scores",
    description: "Broker health / safety scores computed from regulatory attributes.",
    apiPath: "/api/widget/health-scores",
    snippets: [
      { title: "Top 5 health scores (default)", description: "Top brokers with safety scores.", params: "" },
      { title: "Specific brokers", description: "Health scores for chosen brokers.", params: "?brokers=stake,commsec,cmc-markets" },
      { title: "Dark theme", description: "Health scores styled for dark-mode sites.", params: "?theme=dark" },
      { title: "With partner ref", description: "Partner attribution threaded through links.", params: "?ref=yourpartnerId" },
    ],
  },
  {
    kind: "badge",
    label: "Score Badge",
    description:
      "Single-entity score badge — shows an advisor's Trust Score or a broker's Health Score with a methodology link. Not a ranking or comparison.",
    apiPath: "/api/widget/badge",
    snippets: [
      {
        title: "Advisor Trust Score badge",
        description: "Embeds a single advisor's Trust Score with gauge, label, and methodology link.",
        params: "?type=advisor&slug=jane-smith-cfp",
      },
      {
        title: "Broker Health Score badge",
        description: "Embeds a single broker's Health Score with gauge, label, and methodology link.",
        params: "?type=broker&slug=stake",
      },
      {
        title: "Dark theme advisor badge",
        description: "Advisor badge styled for dark-mode pages.",
        params: "?type=advisor&slug=jane-smith-cfp&theme=dark",
      },
      {
        title: "With partner ref",
        description: "Partner attribution threaded through outbound links.",
        params: "?type=advisor&slug=jane-smith-cfp&ref=yourpartnerId",
      },
    ],
  },
  {
    kind: "best-rates",
    label: "Best Rates",
    description:
      "Top savings accounts and term deposits from the Invest.com.au rate database. " +
      "Optionally co-branded with an advisor's name and profile link.",
    apiPath: "/api/widget/best-rates",
    snippets: [
      {
        title: "Top savings accounts (default)",
        description: "Best savings account rates — refreshed daily.",
        params: "",
      },
      {
        title: "Term deposits only",
        description: "Best term-deposit rates.",
        params: "?type=term_deposit",
      },
      {
        title: "Co-branded for advisor",
        description: "Rates widget with advisor's name and profile link in the header.",
        params: "?for_advisor_slug=jane-smith-cfp",
      },
      {
        title: "Dark theme, 5 rows",
        description: "Dark-mode rates widget limited to 5 rows.",
        params: "?theme=dark&limit=5",
      },
    ],
  },
];
