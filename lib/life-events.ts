import { buildAdvisorUrl } from "@/lib/prefill-url";

export type LifeEventCategory =
  | "property"
  | "family"
  | "career"
  | "wealth"
  | "business"
  | "retirement";

export interface LifeEvent {
  id: string;
  emoji: string;
  title: string;
  subtitle: string;
  category: LifeEventCategory;
  /** Maps to NEED_TO_INTENT in /find-advisor. */
  need: string;
  /** Pre-selects context checkboxes in find-advisor Step 2. */
  context: string[];
  /** Human-readable advisor types shown as chips on the card. */
  suggestedTypes: string[];
  /** Optional hub page to cross-link. */
  relatedHub?: string;
}

export const LIFE_EVENT_CATEGORIES: {
  id: LifeEventCategory;
  label: string;
  emoji: string;
}[] = [
  { id: "property", label: "Property", emoji: "🏠" },
  { id: "family", label: "Family", emoji: "👨‍👩‍👧" },
  { id: "career", label: "Career", emoji: "💼" },
  { id: "wealth", label: "Wealth & Investing", emoji: "📈" },
  { id: "business", label: "Business", emoji: "🏢" },
  { id: "retirement", label: "Retirement & Estate", emoji: "🌴" },
];

export const LIFE_EVENTS: LifeEvent[] = [
  // ─── Property ──────────────────────────────────────────────────────────────
  {
    id: "buying_first_home",
    emoji: "🏠",
    title: "Buying My First Home",
    subtitle: "Deposits, FHSS, FHBG, stamp duty concessions, and mortgage options",
    category: "property",
    need: "mortgage",
    context: ["first_home"],
    suggestedTypes: ["Mortgage Broker", "Buyer's Agent"],
    relatedHub: "/first-home-buyer",
  },
  {
    id: "buying_investment_property",
    emoji: "🏘️",
    title: "Buying Investment Property",
    subtitle: "Negative gearing, rental yield, depreciation, and financing",
    category: "property",
    need: "property",
    context: ["investment"],
    suggestedTypes: ["Mortgage Broker", "Buyer's Agent", "Tax Agent"],
    relatedHub: "/property",
  },
  {
    id: "refinancing_mortgage",
    emoji: "🔄",
    title: "Refinancing My Mortgage",
    subtitle: "Better rates, cashout equity, and debt consolidation",
    category: "property",
    need: "mortgage",
    context: ["refinance"],
    suggestedTypes: ["Mortgage Broker"],
  },

  // ─── Family ────────────────────────────────────────────────────────────────
  {
    id: "getting_married",
    emoji: "💒",
    title: "Getting Married",
    subtitle: "Combining finances, joint goals, income protection, and will updates",
    category: "family",
    need: "planning",
    context: ["have_savings"],
    suggestedTypes: ["Financial Planner", "Estate Planner"],
  },
  {
    id: "having_baby",
    emoji: "👶",
    title: "Having a Baby",
    subtitle: "Parental leave planning, life cover, super co-contributions, and will updates",
    category: "family",
    need: "insurance",
    context: ["life_insurance", "income_protection"],
    suggestedTypes: ["Insurance Broker", "Financial Planner"],
  },
  {
    id: "getting_divorced",
    emoji: "⚖️",
    title: "Going Through a Divorce",
    subtitle: "Property settlement, superannuation splitting, and financial separation",
    category: "family",
    need: "planning",
    context: ["optimize"],
    suggestedTypes: ["Financial Planner", "Estate Planner"],
  },
  {
    id: "aged_care_planning",
    emoji: "🏥",
    title: "Planning for Aged Care",
    subtitle: "Costs, Centrelink ACAT assessment, home care vs residential, and DVA",
    category: "family",
    need: "agedcare",
    context: ["aged_care"],
    suggestedTypes: ["Aged Care Advisor", "Financial Planner"],
  },

  // ─── Career ────────────────────────────────────────────────────────────────
  {
    id: "redundancy",
    emoji: "📦",
    title: "Made Redundant",
    subtitle: "ETP tax treatment, rolling super, career transition, and cashflow",
    category: "career",
    need: "planning",
    context: ["getting_started"],
    suggestedTypes: ["Financial Planner", "Tax Agent"],
    relatedHub: "/redundancy",
  },
  {
    id: "starting_new_job",
    emoji: "🚀",
    title: "Starting a New Job",
    subtitle: "Super fund choice, salary packaging, salary sacrifice, and novated lease",
    category: "career",
    need: "smsf",
    context: ["tax_optimization"],
    suggestedTypes: ["Financial Planner", "SMSF Accountant"],
  },
  {
    id: "moving_to_australia",
    emoji: "✈️",
    title: "Moving To / From Australia",
    subtitle: "DASP, tax residency status, FIRB property rules, and foreign pension transfers",
    category: "career",
    need: "tax",
    context: ["tax_optimization"],
    suggestedTypes: ["Tax Agent", "Migration Agent", "Financial Planner"],
    relatedHub: "/foreign-investment",
  },

  // ─── Wealth & Investing ────────────────────────────────────────────────────
  {
    id: "received_inheritance",
    emoji: "🏛️",
    title: "Received an Inheritance",
    subtitle: "Lump-sum investing strategy, CGT timing, and estate administration",
    category: "wealth",
    need: "planning",
    context: ["optimize"],
    suggestedTypes: ["Financial Planner", "Wealth Manager", "Tax Agent"],
    relatedHub: "/inheritance",
  },
  {
    id: "setting_up_smsf",
    emoji: "🔐",
    title: "Setting Up an SMSF",
    subtitle: "Trustee structure, deed, investment strategy, and ongoing compliance",
    category: "wealth",
    need: "smsf",
    context: ["smsf_setup"],
    suggestedTypes: ["SMSF Accountant", "SMSF Specialist"],
    relatedHub: "/smsf",
  },
  {
    id: "crypto_tax",
    emoji: "₿",
    title: "Crypto Tax Time",
    subtitle: "Disposal events, DeFi income, staking, and ATO data-matching compliance",
    category: "wealth",
    need: "crypto",
    context: ["crypto_tax"],
    suggestedTypes: ["Tax Agent", "Crypto Advisor"],
  },

  // ─── Business ──────────────────────────────────────────────────────────────
  {
    id: "selling_business",
    emoji: "🤝",
    title: "Selling My Business",
    subtitle: "CGT small business concessions, valuation, exit planning, and reinvestment",
    category: "business",
    need: "planning",
    context: ["optimize"],
    suggestedTypes: ["Financial Planner", "Business Broker", "Tax Agent"],
  },
  {
    id: "starting_business",
    emoji: "🌱",
    title: "Starting a Business",
    subtitle: "Entity structure, GST registration, super obligations, and initial financing",
    category: "business",
    need: "tax",
    context: ["tax_optimization"],
    suggestedTypes: ["Tax Agent", "Financial Planner"],
  },

  // ─── Retirement & Estate ───────────────────────────────────────────────────
  {
    id: "approaching_retirement",
    emoji: "🌅",
    title: "Approaching Retirement",
    subtitle: "TTR pension, concessional cap strategy, Centrelink Age Pension, and drawdown",
    category: "retirement",
    need: "planning",
    context: ["retirement"],
    suggestedTypes: ["Financial Planner", "SMSF Accountant"],
    relatedHub: "/super",
  },
  {
    id: "estate_planning",
    emoji: "📜",
    title: "Creating a Will / Estate Plan",
    subtitle: "Wills, testamentary trusts, powers of attorney, and binding death nominations",
    category: "retirement",
    need: "estate",
    context: ["estate_planning"],
    suggestedTypes: ["Estate Planner"],
  },
];

export function buildLifeEventUrl(
  event: LifeEvent,
  extras?: { state?: string; postcode?: string }
): string {
  return buildAdvisorUrl({ need: event.need, context: event.context, ...extras });
}
