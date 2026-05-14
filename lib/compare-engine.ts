import type { Broker, PlatformType as BrokerPlatformType } from "@/lib/types";

export type CompareCategory =
  | "all"
  | "share-trading"
  | "etfs"
  | "international-shares"
  | "smsf-brokers"
  | "crypto-exchanges"
  | "super-funds"
  | "savings-accounts"
  | "term-deposits"
  | "research-tools"
  | "property-platforms";

export type ScenarioMode =
  | "beginner"
  | "active-trader"
  | "etf-investor"
  | "smsf-investor"
  | "us-shares"
  | "non-resident"
  | "low-cost"
  | "chess-only";

export type SortCol = "name" | "asx_fee_value" | "us_fee_value" | "fx_rate" | "rating" | "estimated_annual_cost" | "rank_score";
export type FeatureFilter = "chess" | "free" | "smsf" | "low-fx" | "us" | "has-deal";

export interface CostInputs {
  tradesPerMonth: number;
  averageTradeSize: number;
  usTradesPerMonth: number;
  averageUsTradeSize: number;
  portfolioBalance: number;
}

export interface CompareColumn {
  key: string;
  label: string;
  tooltip: string;
  sortCol?: SortCol;
  align?: "left" | "center" | "right";
  value: (broker: Broker, ranked?: RankedBroker) => string;
}

export interface CategorySchema {
  key: CompareCategory;
  label: string;
  shortLabel: string;
  description: string;
  platformTypes: BrokerPlatformType[];
  include?: (broker: Broker) => boolean;
  sortOptions: { col: SortCol; label: string }[];
  featureFilters: FeatureFilter[];
  columns: CompareColumn[];
}

export interface RankedBroker {
  broker: Broker;
  estimatedAnnualCost: number;
  rankScore: number;
  why: string[];
  commercialDisclosure: "promoted" | "affiliate partner" | "no commercial relationship";
  feesLastChecked: string;
  offerExpiry: string;
  sourceNote: string;
}

export interface FilterOptions {
  category: CompareCategory;
  features?: Set<FeatureFilter>;
  maxFee?: number;
  minRating?: number;
  searchQuery?: string;
  scenario?: ScenarioMode | "none";
}

export const DEFAULT_COST_INPUTS: CostInputs = {
  tradesPerMonth: 2,
  averageTradeSize: 1000,
  usTradesPerMonth: 0,
  averageUsTradeSize: 1000,
  portfolioBalance: 25000,
};

const money = (n: number) => `$${Math.round(n).toLocaleString("en-AU")}`;
const pct = (n?: number) => (n == null ? "N/A" : `${n}%`);
const yn = (v?: boolean | null) => (v ? "Yes" : "No");
const text = (v?: string | number | null) => (v == null || v === "" ? "N/A" : String(v));

function genericColumn(key: string, label: string, tooltip: string, value: CompareColumn["value"], sortCol?: SortCol): CompareColumn {
  return { key, label, tooltip, value, sortCol };
}

const annualCostColumn = genericColumn(
  "estimatedAnnualCost",
  "Est. annual cost",
  "Indicative annual cost based on the calculator inputs on this page. It is general information only and may not include every fee.",
  (_broker, ranked) => (ranked ? money(ranked.estimatedAnnualCost) : "Enter inputs"),
  "estimated_annual_cost",
);
const ratingColumn = genericColumn("rating", "Rating", "Editorial rating shown for comparison only.", (b) => text(b.rating), "rating");
const commercialColumn = genericColumn("commercial", "Commercial", "Commercial relationship for this row.", (_b, r) => r?.commercialDisclosure ?? "no commercial relationship");
const freshnessColumn = genericColumn("freshness", "Freshness", "Fee check date, offer expiry and source/admin note.", (_b, r) => `Fees checked: ${r?.feesLastChecked ?? "Not recorded"} · Offer expiry: ${r?.offerExpiry ?? "Not recorded"} · Source: ${r?.sourceNote ?? "Not recorded"}`);

export const CATEGORY_SCHEMAS: Record<CompareCategory, CategorySchema> = {
  all: {
    key: "all",
    label: "All platforms",
    shortLabel: "All",
    description: "Compare categories first, then switch to a specific category to hide irrelevant columns.",
    platformTypes: ["share_broker", "crypto_exchange", "super_fund", "savings_account", "term_deposit", "research_tool", "property_platform"],
    sortOptions: [{ col: "rank_score", label: "Scenario rank" }, { col: "rating", label: "Rating" }, { col: "estimated_annual_cost", label: "Est. annual cost" }, { col: "name", label: "Name" }],
    featureFilters: ["chess", "free", "smsf", "low-fx", "us", "has-deal"],
    columns: [annualCostColumn, ratingColumn, commercialColumn, freshnessColumn],
  },
  "share-trading": {
    key: "share-trading",
    label: "Share trading",
    shortLabel: "Shares",
    description: "ASX brokerage, CHESS sponsorship and account features for Australian share trading.",
    platformTypes: ["share_broker"],
    sortOptions: [{ col: "rank_score", label: "Scenario rank" }, { col: "asx_fee_value", label: "ASX brokerage" }, { col: "estimated_annual_cost", label: "Est. annual cost" }, { col: "rating", label: "Rating" }],
    featureFilters: ["chess", "free", "smsf", "has-deal"],
    columns: [genericColumn("asx", "ASX brokerage", "Brokerage per Australian share trade.", (b) => text(b.asx_fee), "asx_fee_value"), genericColumn("chess", "CHESS", "Whether CHESS-sponsored holdings are available.", (b) => yn(b.chess_sponsored)), genericColumn("smsf", "SMSF", "Whether SMSF accounts are supported.", (b) => yn(b.smsf_support)), annualCostColumn, ratingColumn, commercialColumn, freshnessColumn],
  },
  etfs: {
    key: "etfs",
    label: "ETFs",
    shortLabel: "ETFs",
    description: "Brokerage, CHESS availability and recurring-investing considerations for ETF investors.",
    platformTypes: ["share_broker", "robo_advisor"],
    sortOptions: [{ col: "rank_score", label: "Scenario rank" }, { col: "asx_fee_value", label: "ETF brokerage" }, { col: "estimated_annual_cost", label: "Est. annual cost" }, { col: "rating", label: "Rating" }],
    featureFilters: ["chess", "free", "smsf", "has-deal"],
    columns: [genericColumn("etfFee", "ETF brokerage", "Brokerage for ETF trades where available.", (b) => text(b.asx_fee), "asx_fee_value"), genericColumn("min", "Minimum", "Minimum deposit or typical starting amount where available.", (b) => text(b.min_deposit)), genericColumn("chess", "CHESS", "CHESS can matter for direct ASX ETF holdings.", (b) => yn(b.chess_sponsored)), annualCostColumn, commercialColumn, freshnessColumn],
  },
  "international-shares": {
    key: "international-shares",
    label: "US/international shares",
    shortLabel: "US shares",
    description: "International brokerage, FX markup and market access for global share investing.",
    platformTypes: ["share_broker"],
    include: (b) => b.us_fee_value != null || (b.markets ?? []).some((m) => /us|international|global/i.test(m)),
    sortOptions: [{ col: "rank_score", label: "Scenario rank" }, { col: "fx_rate", label: "FX rate" }, { col: "us_fee_value", label: "US brokerage" }, { col: "estimated_annual_cost", label: "Est. annual cost" }],
    featureFilters: ["us", "low-fx", "smsf", "has-deal"],
    columns: [genericColumn("us", "US brokerage", "Brokerage for US share trades.", (b) => text(b.us_fee), "us_fee_value"), genericColumn("fx", "FX markup", "Currency conversion markup where recorded.", (b) => pct(b.fx_rate), "fx_rate"), genericColumn("markets", "Markets", "Markets listed by the provider.", (b) => (b.markets?.length ? b.markets.join(", ") : "N/A")), annualCostColumn, commercialColumn, freshnessColumn],
  },
  "smsf-brokers": {
    key: "smsf-brokers",
    label: "SMSF brokers",
    shortLabel: "SMSF",
    description: "Broker accounts and custody features commonly checked by SMSF investors and auditors.",
    platformTypes: ["share_broker", "robo_advisor", "property_platform"],
    include: (b) => Boolean(b.smsf_support),
    sortOptions: [{ col: "rank_score", label: "Scenario rank" }, { col: "asx_fee_value", label: "Brokerage" }, { col: "estimated_annual_cost", label: "Est. annual cost" }, { col: "rating", label: "Rating" }],
    featureFilters: ["smsf", "chess", "low-fx", "has-deal"],
    columns: [genericColumn("smsf", "SMSF support", "Whether SMSF accounts are supported.", (b) => yn(b.smsf_support)), genericColumn("chess", "CHESS", "Direct HIN/CHESS support where available.", (b) => yn(b.chess_sponsored)), genericColumn("asx", "Brokerage", "Trade brokerage where available.", (b) => text(b.asx_fee), "asx_fee_value"), annualCostColumn, commercialColumn, freshnessColumn],
  },
  "crypto-exchanges": {
    key: "crypto-exchanges",
    label: "Crypto exchanges",
    shortLabel: "Crypto",
    description: "Trading fees, AUD support and custody notes for crypto exchanges.",
    platformTypes: ["crypto_exchange"],
    include: (b) => b.is_crypto || b.platform_type === "crypto_exchange",
    sortOptions: [{ col: "rank_score", label: "Scenario rank" }, { col: "asx_fee_value", label: "Trading fee" }, { col: "rating", label: "Rating" }],
    featureFilters: ["has-deal"],
    columns: [genericColumn("trade", "Trading fee", "Recorded spot trading fee or fee label.", (b) => text(b.asx_fee), "asx_fee_value"), genericColumn("funding", "AUD funding", "Recorded payment methods.", (b) => b.payment_methods?.join(", ") || "N/A"), genericColumn("regulated", "Regulatory note", "Regulator or registration note where recorded.", (b) => text(b.regulated_by)), annualCostColumn, commercialColumn, freshnessColumn],
  },
  "super-funds": {
    key: "super-funds",
    label: "Super funds",
    shortLabel: "Super",
    description: "Admin/investment fee labels and fund features. This is general information only.",
    platformTypes: ["super_fund"],
    sortOptions: [{ col: "rank_score", label: "Scenario rank" }, { col: "asx_fee_value", label: "Admin fee" }, { col: "rating", label: "Rating" }],
    featureFilters: ["has-deal"],
    columns: [genericColumn("admin", "Admin/investment fee", "Fee label recorded for the fund.", (b) => text(b.asx_fee), "asx_fee_value"), genericColumn("minimum", "Minimum", "Minimum balance/deposit where recorded.", (b) => text(b.min_deposit)), genericColumn("notes", "Notes", "General platform notes.", (b) => text(b.tagline)), annualCostColumn, commercialColumn, freshnessColumn],
  },
  "savings-accounts": {
    key: "savings-accounts",
    label: "Savings accounts",
    shortLabel: "Savings",
    description: "Interest-rate labels, conditions and deposit-account notes.",
    platformTypes: ["savings_account"],
    sortOptions: [{ col: "rank_score", label: "Scenario rank" }, { col: "asx_fee_value", label: "Rate/value" }, { col: "rating", label: "Rating" }],
    featureFilters: ["has-deal"],
    columns: [genericColumn("rate", "Rate", "Recorded interest-rate label.", (b) => text(b.asx_fee), "asx_fee_value"), genericColumn("minimum", "Minimum deposit", "Minimum opening deposit where recorded.", (b) => text(b.min_deposit)), genericColumn("conditions", "Conditions", "Bonus-rate or account conditions where recorded.", (b) => text(b.tagline)), annualCostColumn, commercialColumn, freshnessColumn],
  },
  "term-deposits": {
    key: "term-deposits",
    label: "Term deposits",
    shortLabel: "Term deposits",
    description: "Rate labels, terms and minimum deposits for fixed-term cash products.",
    platformTypes: ["term_deposit"],
    sortOptions: [{ col: "rank_score", label: "Scenario rank" }, { col: "asx_fee_value", label: "Rate/value" }, { col: "rating", label: "Rating" }],
    featureFilters: ["has-deal"],
    columns: [genericColumn("rate", "Rate", "Recorded rate label.", (b) => text(b.asx_fee), "asx_fee_value"), genericColumn("minimum", "Minimum deposit", "Minimum deposit where recorded.", (b) => text(b.min_deposit)), genericColumn("term", "Term/conditions", "Term or early-withdrawal condition notes where recorded.", (b) => text(b.tagline)), annualCostColumn, commercialColumn, freshnessColumn],
  },
  "research-tools": {
    key: "research-tools",
    label: "Research tools",
    shortLabel: "Research",
    description: "Pricing, market coverage and research-tool features.",
    platformTypes: ["research_tool"],
    sortOptions: [{ col: "rank_score", label: "Scenario rank" }, { col: "asx_fee_value", label: "Price" }, { col: "rating", label: "Rating" }],
    featureFilters: ["has-deal"],
    columns: [genericColumn("price", "Price", "Subscription price label.", (b) => text(b.asx_fee), "asx_fee_value"), genericColumn("markets", "Markets/data", "Markets covered where recorded.", (b) => b.markets?.join(", ") || "N/A"), genericColumn("platforms", "Platforms", "Supported platforms/devices where recorded.", (b) => b.platforms?.join(", ") || "N/A"), annualCostColumn, commercialColumn, freshnessColumn],
  },
  "property-platforms": {
    key: "property-platforms",
    label: "Property platforms",
    shortLabel: "Property",
    description: "Minimum investment, structure and liquidity notes for property platforms.",
    platformTypes: ["property_platform"],
    sortOptions: [{ col: "rank_score", label: "Scenario rank" }, { col: "asx_fee_value", label: "Minimum/value" }, { col: "rating", label: "Rating" }],
    featureFilters: ["smsf", "has-deal"],
    columns: [genericColumn("minimum", "Minimum investment", "Minimum investment label.", (b) => text(b.asx_fee || b.min_deposit), "asx_fee_value"), genericColumn("structure", "Structure", "General platform structure note.", (b) => text(b.tagline)), genericColumn("smsf", "SMSF", "Whether SMSF investing is supported.", (b) => yn(b.smsf_support)), annualCostColumn, commercialColumn, freshnessColumn],
  },
};

export const CATEGORY_ALIASES: Record<string, CompareCategory> = {
  shares: "share-trading",
  "share-trading": "share-trading",
  etfs: "etfs",
  us: "international-shares",
  "us-shares": "international-shares",
  "international-shares": "international-shares",
  smsf: "smsf-brokers",
  "smsf-brokers": "smsf-brokers",
  crypto: "crypto-exchanges",
  "crypto-exchanges": "crypto-exchanges",
  super: "super-funds",
  "super-funds": "super-funds",
  savings: "savings-accounts",
  "savings-accounts": "savings-accounts",
  "term-deposits": "term-deposits",
  research: "research-tools",
  "research-tools": "research-tools",
  property: "property-platforms",
  "property-platforms": "property-platforms",
};

export const SCENARIOS: { key: ScenarioMode; label: string; description: string }[] = [
  { key: "beginner", label: "Beginner", description: "Emphasises lower headline fees, higher ratings and straightforward feature sets." },
  { key: "active-trader", label: "Active trader", description: "Weights lower brokerage and FX costs more heavily." },
  { key: "etf-investor", label: "ETF investor", description: "Emphasises low recurring ASX/ETF trading cost and CHESS availability." },
  { key: "smsf-investor", label: "SMSF investor", description: "Weights SMSF support, custody signals and audit-friendly features." },
  { key: "us-shares", label: "US shares", description: "Weights US brokerage, FX markup and global-market access." },
  { key: "non-resident", label: "Non-resident", description: "Highlights platforms that record non-resident access information." },
  { key: "low-cost", label: "Low-cost", description: "Ranks primarily by the true-cost calculator output." },
  { key: "chess-only", label: "CHESS-only", description: "Restricts results to platforms with CHESS-sponsored holdings recorded." },
];

export function calculateAnnualCost(broker: Broker, inputs: CostInputs = DEFAULT_COST_INPUTS): number {
  const asxBrokerage = Math.max(0, broker.asx_fee_value ?? 0) * Math.max(0, inputs.tradesPerMonth) * 12;
  const usBrokerage = Math.max(0, broker.us_fee_value ?? 0) * Math.max(0, inputs.usTradesPerMonth) * 12;
  const fxMarkup = ((broker.fx_rate ?? 0) / 100) * Math.max(0, inputs.averageUsTradeSize) * Math.max(0, inputs.usTradesPerMonth) * 12;
  const percentageFee = broker.platform_type === "super_fund" || broker.platform_type === "robo_advisor" ? ((broker.asx_fee_value ?? 0) / 100) * Math.max(0, inputs.portfolioBalance) : 0;
  return Math.round((asxBrokerage + usBrokerage + fxMarkup + percentageFee) * 100) / 100;
}

export function commercialDisclosureFor(broker: Broker): RankedBroker["commercialDisclosure"] {
  if (broker.promoted_placement || broker.sponsorship_tier === "featured_partner" || broker.sponsorship_tier === "deal_of_month") return "promoted";
  if (broker.affiliate_url || broker.commission_type || broker.cpa_value || broker.affiliate_priority) return "affiliate partner";
  return "no commercial relationship";
}

export function dataFreshnessFor(broker: Broker) {
  return {
    feesLastChecked: broker.fee_last_checked || broker.fee_verified_date || broker.updated_at || "Not recorded",
    offerExpiry: broker.deal_expiry || "Not recorded",
    sourceNote: broker.fee_source_url || broker.fee_source_tcs_url || broker.deal_source || "Admin/source note not public",
  };
}

export function scenarioCategory(scenario: ScenarioMode | "none" | undefined, fallback: CompareCategory): CompareCategory {
  if (scenario === "etf-investor") return "etfs";
  if (scenario === "smsf-investor") return "smsf-brokers";
  if (scenario === "us-shares" || scenario === "non-resident") return "international-shares";
  if (scenario === "chess-only" || scenario === "active-trader" || scenario === "beginner" || scenario === "low-cost") return fallback === "all" ? "share-trading" : fallback;
  return fallback;
}

export function filterBrokers(brokers: Broker[], options: FilterOptions): Broker[] {
  const scenario = options.scenario === "none" ? undefined : options.scenario;
  const category = scenarioCategory(scenario, options.category);
  const schema = CATEGORY_SCHEMAS[category];
  let list = brokers.filter((b) => schema.platformTypes.includes(b.platform_type) || (schema.key === "crypto-exchanges" && b.is_crypto));
  if (schema.include) list = list.filter(schema.include);
  const features = options.features ?? new Set<FeatureFilter>();
  if (scenario === "chess-only") list = list.filter((b) => b.chess_sponsored);
  if (scenario === "non-resident") list = list.filter((b) => b.accepts_non_residents !== false && b.requires_australian_address !== true);
  if (features.has("chess")) list = list.filter((b) => b.chess_sponsored);
  if (features.has("free")) list = list.filter((b) => b.asx_fee_value === 0 || b.us_fee_value === 0);
  if (features.has("us")) list = list.filter((b) => b.us_fee_value != null || (b.markets ?? []).some((m) => /us|international|global/i.test(m)));
  if (features.has("smsf")) list = list.filter((b) => b.smsf_support);
  if (features.has("low-fx")) list = list.filter((b) => b.fx_rate != null && b.fx_rate >= 0 && b.fx_rate < 0.5);
  if (features.has("has-deal")) list = list.filter((b) => Boolean(b.deal && b.deal_text));
  if ((options.maxFee ?? 999) < 999) list = list.filter((b) => (b.asx_fee_value ?? 999) <= (options.maxFee ?? 999));
  if ((options.minRating ?? 0) > 0) list = list.filter((b) => (b.rating ?? 0) >= (options.minRating ?? 0));
  const q = options.searchQuery?.trim().toLowerCase();
  if (q) list = list.filter((b) => [b.name, b.tagline, b.slug].some((v) => v?.toLowerCase().includes(q)));
  return list;
}

export function explainBroker(broker: Broker, scenario: ScenarioMode | "none" | undefined, annualCost: number): string[] {
  const why: string[] = [];
  why.push(`Estimated annual cost is ${money(annualCost)} using the current calculator inputs.`);
  if (broker.rating != null) why.push(`Editorial rating recorded as ${broker.rating}/5.`);
  if (broker.chess_sponsored) why.push("CHESS-sponsored holdings are recorded as available.");
  if (broker.smsf_support) why.push("SMSF account support is recorded.");
  if (broker.us_fee_value != null) why.push(`US brokerage field is ${text(broker.us_fee)} and FX markup is ${pct(broker.fx_rate)}.`);
  if (scenario === "non-resident") why.push(broker.accepts_non_residents ? "Non-resident access is recorded as available." : "Non-resident access is not recorded as blocked; confirm directly with the provider.");
  if (broker.deal && broker.deal_text) why.push("A current offer is recorded; check terms and expiry before acting.");
  return why.slice(0, 5);
}

export function rankBroker(broker: Broker, scenario: ScenarioMode | "none" | undefined, inputs: CostInputs = DEFAULT_COST_INPUTS): RankedBroker {
  const estimatedAnnualCost = calculateAnnualCost(broker, inputs);
  const ratingScore = (broker.rating ?? 0) * 20;
  const costScore = Math.max(0, 100 - estimatedAnnualCost / 10);
  let rankScore = ratingScore * 0.45 + costScore * 0.35;
  if (broker.chess_sponsored) rankScore += 5;
  if (broker.smsf_support && scenario === "smsf-investor") rankScore += 18;
  if (broker.us_fee_value != null && scenario === "us-shares") rankScore += 8;
  if ((broker.fx_rate ?? 99) < 0.5 && (scenario === "us-shares" || scenario === "active-trader")) rankScore += 10;
  if (scenario === "low-cost") rankScore = costScore * 0.75 + ratingScore * 0.15 + (broker.chess_sponsored ? 5 : 0);
  if (scenario === "beginner" && (broker.asx_fee_value ?? 999) <= 5) rankScore += 8;
  if (scenario === "etf-investor" && broker.chess_sponsored) rankScore += 10;
  if (scenario === "non-resident" && broker.accepts_non_residents) rankScore += 12;
  const fresh = dataFreshnessFor(broker);
  return {
    broker,
    estimatedAnnualCost,
    rankScore: Math.round(rankScore * 10) / 10,
    why: explainBroker(broker, scenario, estimatedAnnualCost),
    commercialDisclosure: commercialDisclosureFor(broker),
    ...fresh,
  };
}

export function rankBrokers(brokers: Broker[], scenario: ScenarioMode | "none" | undefined, inputs: CostInputs = DEFAULT_COST_INPUTS): RankedBroker[] {
  return brokers.map((broker) => rankBroker(broker, scenario, inputs));
}

export function sortRankedBrokers(rows: RankedBroker[], sortCol: SortCol, sortDir: 1 | -1): RankedBroker[] {
  return [...rows].sort((a, b) => {
    const av = sortCol === "estimated_annual_cost" ? a.estimatedAnnualCost : sortCol === "rank_score" ? a.rankScore : a.broker[sortCol as keyof Broker] ?? (sortCol === "name" ? "" : 999);
    const bv = sortCol === "estimated_annual_cost" ? b.estimatedAnnualCost : sortCol === "rank_score" ? b.rankScore : b.broker[sortCol as keyof Broker] ?? (sortCol === "name" ? "" : 999);
    if (typeof av === "string" && typeof bv === "string") return av.localeCompare(bv) * sortDir;
    return ((av as number) - (bv as number)) * sortDir;
  });
}

export function updateShortlist(current: string[], slug: string, max = 4): string[] {
  if (current.includes(slug)) return current.filter((s) => s !== slug);
  if (current.length >= max) return current;
  return [...current, slug];
}

export function getMobileCardFields(schema: CategorySchema): string[] {
  return schema.columns.slice(0, 4).map((c) => c.label);
}
