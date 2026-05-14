/**
 * Code-defined seed data for the Get Matched router.
 *
 * Two purposes:
 *   1. Bootstrap a brand-new Supabase project before migrations apply —
 *      `getEnabledIntents`, `getQuestions`, `getResultTemplate` all
 *      fall back to these constants if the DB query fails or returns
 *      empty. This is what makes ephemeral mode work end-to-end.
 *   2. Keep the canonical question + template content right next to the
 *      router code so it stays in lockstep with the engine logic. The
 *      SQL seed in `supabase/migrations/20260514_gm02_get_matched_polish.sql`
 *      mirrors this content one-for-one.
 *
 * Editing guide: keep retail-friendly copy with emoji on every goal /
 * sub-goal / help-preference option. Plain English. No jargon outside
 * the disclosure footer. New intent slugs need a matching entry in
 * `IntentSlug` in `./types.ts` and a result template below.
 */

import type {
  IntentDef,
  QuestionDef,
  ResultTemplate,
  RouteType,
} from "./types";

// ─── Intent taxonomy ─────────────────────────────────────────────────────
// 13 retail goal slugs (the visible chip-grid choices) followed by the
// niche / advisor / brief slugs (used by the marketplace router but
// rarely surfaced as primary goal chips).

export const FALLBACK_INTENTS: IntentDef[] = [
  // ── 13 retail goals ──
  { id: -1,  slug: "grow",                 label: "Start investing / Long-term growth",  description: "ETFs, shares, or building wealth over time.",                   default_route: "compare",        default_brief_template: null,                       risk_level: "low",    enabled: true, sort_order: 10,  meta: {} },
  { id: -2,  slug: "income",               label: "Earn income or dividends",           description: "Regular income from investments.",                              default_route: "compare",        default_brief_template: null,                       risk_level: "low",    enabled: true, sort_order: 20,  meta: {} },
  { id: -3,  slug: "crypto",               label: "Buy or hold crypto",                  description: "Bitcoin, Ethereum, altcoins, plus CGT help when you sell.",     default_route: "compare",        default_brief_template: null,                       risk_level: "low",    enabled: true, sort_order: 30,  meta: {} },
  { id: -4,  slug: "trade",                label: "Active trading / CFDs",               description: "Frequent trades, CFDs, or short-term strategies.",              default_route: "compare",        default_brief_template: null,                       risk_level: "low",    enabled: true, sort_order: 40,  meta: {} },
  { id: -5,  slug: "automate",             label: "Hands-off / robo-investing",          description: "Set and forget — robo-advisors do the rebalancing.",            default_route: "compare",        default_brief_template: null,                       risk_level: "low",    enabled: true, sort_order: 50,  meta: {} },
  { id: -6,  slug: "super",                label: "Super / SMSF",                        description: "Optimise super, set up an SMSF, or use super for property.",    default_route: "individual",     default_brief_template: "financial_adviser",        risk_level: "medium", enabled: true, sort_order: 60,  meta: {} },
  { id: -7,  slug: "property",             label: "Property",                            description: "Buy investment property, browse listings, or use REITs / SMSF.", default_route: "individual",     default_brief_template: "mortgage",                 risk_level: "low",    enabled: true, sort_order: 70,  meta: {} },
  { id: -8,  slug: "home",                 label: "Buy a home or get a loan",            description: "First home, refinance, or investment loan.",                    default_route: "individual",     default_brief_template: "mortgage",                 risk_level: "low",    enabled: true, sort_order: 80,  meta: {} },
  { id: -9,  slug: "alt_assets",           label: "Alternative / collectible assets",    description: "Whisky, wine, art, watches, classic cars, coins.",              default_route: "browse",         default_brief_template: null,                       risk_level: "low",    enabled: true, sort_order: 90,  meta: {} },
  { id: -10, slug: "royalties",            label: "Royalties / income-producing assets", description: "Music, mining, IP royalties; vending / ATM income.",            default_route: "browse",         default_brief_template: null,                       risk_level: "low",    enabled: true, sort_order: 100, meta: {} },
  { id: -11, slug: "pre_ipo",              label: "Pre-IPO / wholesale deals",           description: "Late-stage private equity, IPO calendar, s708 deals.",          default_route: "browse",         default_brief_template: null,                       risk_level: "medium", enabled: true, sort_order: 110, meta: {} },
  { id: -12, slug: "help",                 label: "Get expert help",                     description: "I'd like professional guidance.",                               default_route: "individual",     default_brief_template: "financial_adviser",        risk_level: "high",   enabled: true, sort_order: 120, meta: {} },
  { id: -13, slug: "browse",               label: "Browse / not sure yet",               description: "Look around — show me what's possible.",                        default_route: "browse",         default_brief_template: null,                       risk_level: "low",    enabled: true, sort_order: 130, meta: {} },

  // ── Niche / brief / advisor slugs (used by router; not primary chips) ──
  { id: -14, slug: "compare_platform",     label: "Compare investing platforms",         description: "Compare brokers, super funds, robo-advisors or property platforms.", default_route: "compare",        default_brief_template: null,                       risk_level: "low",    enabled: true, sort_order: 200, meta: {} },
  { id: -15, slug: "start_investing",      label: "Start investing",                     description: "New to investing — figure out the right first step.",           default_route: "compare",        default_brief_template: null,                       risk_level: "low",    enabled: true, sort_order: 210, meta: {} },
  { id: -16, slug: "smsf_property",        label: "Invest through SMSF",                 description: "Property or shares inside a self-managed super fund.",          default_route: "expert_team",    default_brief_template: "smsf_property",            risk_level: "medium", enabled: true, sort_order: 220, meta: {} },
  { id: -17, slug: "buy_property",         label: "Buy investment property",             description: "Residential investment property.",                              default_route: "individual",     default_brief_template: "mortgage",                 risk_level: "low",    enabled: true, sort_order: 230, meta: {} },
  { id: -18, slug: "opportunity_assessment", label: "Assess an opportunity",             description: "Get help reviewing a specific deal or listing.",                default_route: "expert_team",    default_brief_template: "opportunity_assessment",   risk_level: "medium", enabled: true, sort_order: 240, meta: {} },
  { id: -19, slug: "business_acquisition", label: "Buy a business",                      description: "Acquire an Australian business.",                               default_route: "expert_team",    default_brief_template: "business_acquisition",     risk_level: "medium", enabled: true, sort_order: 250, meta: {} },
  { id: -20, slug: "commercial_property",  label: "Commercial property",                 description: "Buy, lease or invest in commercial property.",                  default_route: "expert_team",    default_brief_template: "commercial_property",      risk_level: "medium", enabled: true, sort_order: 260, meta: {} },
  { id: -21, slug: "foreign_investor",     label: "Invest from overseas",                description: "Non-resident or overseas investor into Australia.",             default_route: "expert_team",    default_brief_template: "foreign_investor",         risk_level: "high",   enabled: true, sort_order: 270, meta: {} },
  { id: -22, slug: "expat_investing",      label: "Australian expat investing",          description: "Australian living overseas investing back home.",               default_route: "individual",     default_brief_template: "expat",                    risk_level: "medium", enabled: true, sort_order: 280, meta: {} },
  { id: -23, slug: "financial_advice",     label: "Get financial advice",                description: "Licensed financial planning advice.",                           default_route: "individual",     default_brief_template: "financial_adviser",        risk_level: "high",   enabled: true, sort_order: 290, meta: {} },
  { id: -24, slug: "tax_help",             label: "Get tax / accounting help",           description: "Tax planning or returns.",                                      default_route: "individual",     default_brief_template: "tax",                      risk_level: "medium", enabled: true, sort_order: 300, meta: {} },
  { id: -25, slug: "mortgage_help",        label: "Get lending / mortgage help",         description: "Home, investment or commercial finance.",                       default_route: "individual",     default_brief_template: "mortgage",                 risk_level: "low",    enabled: true, sort_order: 310, meta: {} },
  { id: -26, slug: "legal_help",           label: "Get legal / conveyancing help",       description: "Property settlement, contracts, structuring.",                  default_route: "individual",     default_brief_template: "general",                  risk_level: "medium", enabled: true, sort_order: 320, meta: {} },
  { id: -27, slug: "second_opinion",       label: "Get a second opinion",                description: "Have advice or a deal independently reviewed.",                 default_route: "second_opinion", default_brief_template: "second_opinion",           risk_level: "medium", enabled: true, sort_order: 330, meta: {} },
  { id: -28, slug: "listing_owner",        label: "Post / list an opportunity",          description: "Seller of a business, property or other deal.",                 default_route: "listing_brief",  default_brief_template: "listing",                  risk_level: "low",    enabled: true, sort_order: 340, meta: {} },
  { id: -29, slug: "listing_readiness",    label: "Prepare a listing",                   description: "Get your opportunity ready to list.",                           default_route: "listing_brief",  default_brief_template: "listing_readiness",        risk_level: "low",    enabled: true, sort_order: 350, meta: {} },
  { id: -30, slug: "not_sure",             label: "Not sure yet",                        description: "Browse and figure it out as you go.",                           default_route: "browse",         default_brief_template: null,                       risk_level: "low",    enabled: true, sort_order: 999, meta: {} },
];

// ─── Questions ───────────────────────────────────────────────────────────
// Step 1: Where you're starting from
// Step 2: Goal (13 emoji-rich options — the main retail picker)
// Step 3: Sub-question (branches per goal — property / crypto / super / etc.)
// Step 4: How much help (8 options incl. browse — the routing fork)
// Step 5: Experience or complexity
// Step 6: Budget
// Step 7: Timeline

export const FALLBACK_QUESTIONS: QuestionDef[] = [
  {
    id: -100,
    slug: "starting_point",
    step: 1,
    kind: "select",
    prompt: "What's your situation?",
    subtitle: "We tailor the rest of the plan to where you're starting from.",
    options: [
      { value: "australia",     label: "I live in Australia",            sub: "Australian resident or citizen",            emoji: "🇦🇺" },
      { value: "overseas",      label: "I'm outside Australia",          sub: "Based overseas, investing into Australia",  emoji: "🌏" },
      { value: "expat",         label: "Australian expat",                sub: "Aussie living overseas",                    emoji: "✈️" },
      { value: "business",      label: "Acting for a business",           sub: "Company, trust, SMSF or partnership",       emoji: "🏢" },
      { value: "listing_owner", label: "I have something to sell",        sub: "Business, property, or other listing",      emoji: "🏷️" },
    ],
    shown_if: {},
    maps_to: "starting_point",
    risk_weight: 0,
    mode: "both",
    enabled: true,
    sort_order: 10,
  },
  {
    id: -101,
    slug: "goal",
    step: 2,
    kind: "select",
    prompt: "What are you trying to do?",
    subtitle: "Pick the closest match. We'll narrow it down next.",
    options: [
      { value: "grow",        label: "Start investing / Long-term growth",      sub: "ETFs, shares, or building wealth over time",                emoji: "📈", intent_hint: "grow"       },
      { value: "income",      label: "Earn income or dividends",                sub: "Regular income from investments",                            emoji: "💰", intent_hint: "income"     },
      { value: "crypto",      label: "Buy or hold crypto",                      sub: "Bitcoin, Ethereum, altcoins",                                emoji: "₿",  intent_hint: "crypto"     },
      { value: "trade",       label: "Active trading / CFDs",                   sub: "Frequent trades, CFDs, short-term strategies",               emoji: "⚡", intent_hint: "trade"      },
      { value: "automate",    label: "Hands-off / robo-investing",              sub: "Set and forget, robo-advisors",                              emoji: "🤖", intent_hint: "automate"   },
      { value: "super",       label: "Super / SMSF",                            sub: "Optimise super, set up SMSF, super for property",            emoji: "🏦", intent_hint: "super"      },
      { value: "property",    label: "Property",                                sub: "Buy, browse listings, REITs or use SMSF",                    emoji: "🏠", intent_hint: "property"   },
      { value: "home",        label: "Buy a home or get a loan",                sub: "First home, refinance, investment loan",                     emoji: "🔑", intent_hint: "home"       },
      { value: "alt_assets",  label: "Alternative / collectibles",              sub: "Whisky, wine, art, watches, cars, coins",                    emoji: "🥃", intent_hint: "alt_assets" },
      { value: "royalties",   label: "Royalties / income-producing assets",     sub: "Music, mining, IP royalties; vending / ATM",                 emoji: "📜", intent_hint: "royalties"  },
      { value: "pre_ipo",     label: "Pre-IPO / wholesale deals",               sub: "Late-stage private equity, s708 deals",                      emoji: "🚀", intent_hint: "pre_ipo"    },
      { value: "help",        label: "Get expert help",                         sub: "I'd like professional guidance",                             emoji: "🤝", intent_hint: "help"       },
      { value: "browse",      label: "Browse / not sure yet",                   sub: "Look around — show me what's possible",                      emoji: "👀", intent_hint: "browse"     },
    ],
    shown_if: {},
    maps_to: "intent",
    risk_weight: 0,
    mode: "both",
    enabled: true,
    sort_order: 20,
  },

  // ─── Step 3 sub-questions (one per branching goal) ───
  {
    id: -110,
    slug: "property_sub",
    step: 3,
    kind: "select",
    prompt: "How do you want to invest in property?",
    subtitle: null,
    options: [
      { value: "physical",      label: "Buy physical property",            sub: "Direct ownership — house, apartment, or investment property", emoji: "🏠", route_hint: "individual" },
      { value: "reit",          label: "REITs or fractional property",     sub: "Property funds, listed property trusts, BrickX-style",        emoji: "📊", vertical: "property", route_hint: "compare" },
      { value: "smsf",          label: "Use super for property (SMSF)",    sub: "Self-managed super fund property strategy",                   emoji: "🏦", route_hint: "expert_team", intent_hint: "smsf_property" },
      { value: "browse",        label: "Browse opportunities first",       sub: "Show me what's available on /invest",                         emoji: "👀", vertical: "property", route_hint: "browse" },
    ],
    shown_if: { intent: ["property"] },
    maps_to: "property_sub",
    risk_weight: 0,
    mode: "both",
    enabled: true,
    sort_order: 30,
  },
  {
    id: -111,
    slug: "crypto_sub",
    step: 3,
    kind: "select",
    prompt: "What's your crypto situation?",
    subtitle: null,
    options: [
      { value: "first_buy",    label: "First time buying",                sub: "Just want to get started safely",                emoji: "🌱", vertical: "crypto", route_hint: "compare" },
      { value: "hodl",         label: "Long-term hold",                   sub: "Buy and store securely for years",               emoji: "💎", vertical: "crypto", route_hint: "compare" },
      { value: "active",       label: "Active trader",                    sub: "Frequent trades, leverage, technical analysis",  emoji: "⚡", vertical: "crypto", route_hint: "compare" },
      { value: "tax",          label: "Need crypto tax help",             sub: "CGT, transactions, structuring",                 emoji: "📋", route_hint: "individual", intent_hint: "tax_help" },
    ],
    shown_if: { intent: ["crypto"] },
    maps_to: "crypto_sub",
    risk_weight: 0,
    mode: "both",
    enabled: true,
    sort_order: 30,
  },
  {
    id: -112,
    slug: "super_sub",
    step: 3,
    kind: "select",
    prompt: "What's your super situation?",
    subtitle: null,
    options: [
      { value: "compare_funds", label: "Compare super funds",             sub: "Find a better-performing or lower-fee fund",        emoji: "📊", vertical: "super", route_hint: "compare" },
      { value: "smsf_setup",    label: "Set up an SMSF",                  sub: "Self-managed super fund — DIY pension control",     emoji: "🛠️", route_hint: "expert_team", intent_hint: "smsf_property" },
      { value: "smsf_property", label: "Use my SMSF for property",        sub: "SMSF-borrowing strategy + property selection",      emoji: "🏠", route_hint: "expert_team", intent_hint: "smsf_property" },
      { value: "pre_retire",    label: "Pre-retirement planning",         sub: "Within 5 years of retirement — get it right",       emoji: "🌅", route_hint: "individual", intent_hint: "financial_advice" },
    ],
    shown_if: { intent: ["super"] },
    maps_to: "super_sub",
    risk_weight: 0,
    mode: "both",
    enabled: true,
    sort_order: 30,
  },
  {
    id: -113,
    slug: "alt_assets_sub",
    step: 3,
    kind: "select",
    prompt: "Which alternative asset?",
    subtitle: null,
    options: [
      { value: "whisky",  label: "Whisky / wine",       emoji: "🥃", vertical: "alt", route_hint: "browse" },
      { value: "art",     label: "Art",                  emoji: "🖼️", vertical: "alt", route_hint: "browse" },
      { value: "watches", label: "Watches",              emoji: "⌚", vertical: "alt", route_hint: "browse" },
      { value: "cars",    label: "Classic cars",         emoji: "🚗", vertical: "alt", route_hint: "browse" },
      { value: "coins",   label: "Coins / collectibles", emoji: "🪙", vertical: "alt", route_hint: "browse" },
      { value: "browse_all", label: "Show me everything", emoji: "👀", vertical: "alt", route_hint: "browse" },
    ],
    shown_if: { intent: ["alt_assets"] },
    maps_to: "alt_assets_sub",
    risk_weight: 0,
    mode: "both",
    enabled: true,
    sort_order: 30,
  },
  {
    id: -114,
    slug: "pre_ipo_sub",
    step: 3,
    kind: "select",
    prompt: "How do you want to engage with pre-IPO deals?",
    subtitle: null,
    options: [
      { value: "invest_now",     label: "Invest as a wholesale investor",  sub: "I qualify under s708 — show me deals",             emoji: "🚀", vertical: "pre_ipo", route_hint: "browse" },
      { value: "browse_calendar", label: "Browse the IPO calendar",        sub: "Upcoming listings and recent IPOs",                emoji: "📅", vertical: "pre_ipo", route_hint: "browse" },
      { value: "get_verified",   label: "Become wholesale-verified",       sub: "s708 sophisticated investor verification",         emoji: "✅", route_hint: "individual", intent_hint: "financial_advice" },
    ],
    shown_if: { intent: ["pre_ipo"] },
    maps_to: "pre_ipo_sub",
    risk_weight: 0,
    mode: "both",
    enabled: true,
    sort_order: 30,
  },
  {
    id: -115,
    slug: "help_sub",
    step: 3,
    kind: "select",
    prompt: "What kind of help do you want?",
    subtitle: null,
    options: [
      { value: "financial_planner", label: "Financial planner",     sub: "Investment strategy, retirement, tax",      emoji: "📊", route_hint: "individual", intent_hint: "financial_advice" },
      { value: "mortgage_broker",   label: "Mortgage broker",       sub: "Home, investment, or commercial loans",     emoji: "🏠", route_hint: "individual", intent_hint: "mortgage_help" },
      { value: "tax_agent",         label: "Tax agent / accountant", sub: "Tax returns, CGT, structuring",            emoji: "📋", route_hint: "individual", intent_hint: "tax_help" },
      { value: "smsf_accountant",   label: "SMSF accountant",       sub: "Set up and run a self-managed super fund",  emoji: "🏦", route_hint: "individual", intent_hint: "smsf_property" },
      { value: "buyers_agent",      label: "Buyer's agent",         sub: "Find + negotiate property purchases",       emoji: "🔍", route_hint: "individual", intent_hint: "buy_property" },
      { value: "lawyer",            label: "Lawyer / conveyancer",   sub: "Settlement, contracts, structuring",       emoji: "⚖️", route_hint: "individual", intent_hint: "legal_help" },
      { value: "not_sure_help",     label: "Not sure — guide me",    sub: "Show me the options",                      emoji: "🤔", route_hint: "guide" },
    ],
    shown_if: { intent: ["help"] },
    maps_to: "help_sub",
    risk_weight: 0,
    mode: "both",
    enabled: true,
    sort_order: 30,
  },
  {
    id: -116,
    slug: "browse_sub",
    step: 3,
    kind: "select",
    prompt: "What do you want to browse?",
    subtitle: null,
    options: [
      { value: "shares",        label: "Share-investing platforms",   sub: "Compare brokers side-by-side",            emoji: "📈", vertical: "shares", route_hint: "compare" },
      { value: "property",      label: "Property listings",            sub: "Investment property opportunities",       emoji: "🏠", vertical: "property", route_hint: "browse" },
      { value: "opportunities", label: "Private opportunities",        sub: "Pre-IPO, alt assets, deals",              emoji: "🔍", vertical: "opportunity", route_hint: "browse" },
      { value: "advisors",      label: "Advisors / experts",           sub: "Browse verified Australian professionals", emoji: "🤝", route_hint: "individual" },
      { value: "all",           label: "Just show me everything",      sub: "Browse the whole site",                   emoji: "🌐", route_hint: "guide" },
    ],
    shown_if: { intent: ["browse"] },
    maps_to: "browse_sub",
    risk_weight: 0,
    mode: "both",
    enabled: true,
    sort_order: 30,
  },
  {
    id: -117,
    slug: "listing_sub",
    step: 3,
    kind: "select",
    prompt: "What are you listing?",
    subtitle: null,
    options: [
      { value: "business",  label: "A business",                   sub: "Sell a company or trade",              emoji: "🏢", route_hint: "listing_brief" },
      { value: "property",  label: "Investment property",          sub: "Sell or list residential / commercial", emoji: "🏠", route_hint: "listing_brief" },
      { value: "alt_asset", label: "Alternative asset",            sub: "Wine, whisky, art, watches, coins",     emoji: "🥃", route_hint: "listing_brief" },
      { value: "deal",      label: "Investment opportunity / deal", sub: "Pre-IPO, syndicate, royalty",          emoji: "🚀", route_hint: "listing_brief" },
      { value: "not_sure",  label: "Not sure — guide me",          sub: "Help me prep before listing",           emoji: "🤔", route_hint: "listing_brief", intent_hint: "listing_readiness" },
    ],
    shown_if: { starting_point: ["listing_owner"] },
    maps_to: "listing_sub",
    risk_weight: 0,
    mode: "both",
    enabled: true,
    sort_order: 30,
  },

  // ─── Step 4: How much help (the routing fork) ───
  {
    id: -120,
    slug: "help_preference",
    step: 4,
    kind: "select",
    prompt: "How much help do you want?",
    subtitle: "You can change this later.",
    options: [
      { value: "info_only",      label: "Just give me information",         sub: "I'll figure it out myself",                emoji: "📚", route_hint: "guide" },
      { value: "browse",         label: "Show me opportunities to browse",  sub: "Take me to listings / deals",              emoji: "👀", route_hint: "browse" },
      { value: "compare",        label: "Compare platforms side-by-side",   sub: "Show me a scored shortlist",               emoji: "📊", route_hint: "compare" },
      { value: "individual",     label: "Connect me with an expert",        sub: "One verified professional",                emoji: "🤝", route_hint: "individual" },
      { value: "firm",           label: "Connect me with a firm",           sub: "Larger team / brokerage",                  emoji: "🏢", route_hint: "firm" },
      { value: "expert_team",    label: "Connect me with an expert team",   sub: "Multi-discipline team (accountant + adviser + broker)", emoji: "👥", route_hint: "expert_team" },
      { value: "investor_brief", label: "Create a brief — let pros come to me", sub: "Verified pros respond to your masked brief", emoji: "📝", route_hint: "investor_brief" },
      { value: "not_sure_help",  label: "Not sure — guide me",              sub: "Recommend based on my answers",            emoji: "🤔" },
    ],
    shown_if: {},
    maps_to: "help_preference",
    risk_weight: 0,
    mode: "both",
    enabled: true,
    sort_order: 40,
  },

  // ─── Step 5 — Experience (DIY) / Complexity (advisor) ───
  {
    id: -130,
    slug: "experience",
    step: 5,
    kind: "select",
    prompt: "How experienced are you with this?",
    subtitle: null,
    options: [
      { value: "beginner",     label: "Complete beginner", sub: "Just getting started",                                    emoji: "🌱" },
      { value: "intermediate", label: "Some experience",   sub: "Invested before — want to improve",                       emoji: "📚" },
      { value: "pro",          label: "Advanced / pro",    sub: "I know what I'm doing",                                   emoji: "🎯" },
    ],
    shown_if: { help_preference: ["info_only", "browse", "compare"] },
    maps_to: "experience",
    risk_weight: 0,
    mode: "both",
    enabled: true,
    sort_order: 50,
  },
  {
    id: -131,
    slug: "complexity",
    step: 5,
    kind: "select",
    prompt: "How complex is your situation?",
    subtitle: null,
    options: [
      { value: "simple",   label: "Simple",   sub: "Just getting started, straightforward",                              emoji: "🟢" },
      { value: "moderate", label: "Moderate", sub: "Some assets — want to make good decisions",                          emoji: "🟡" },
      { value: "complex",  label: "Complex",  sub: "Tax, SMSF, property, business, or multiple goals",                   emoji: "🔴" },
    ],
    shown_if: { help_preference: ["individual", "firm", "expert_team", "investor_brief"] },
    maps_to: "complexity",
    risk_weight: 1,
    mode: "both",
    enabled: true,
    sort_order: 50,
  },

  // ─── Step 6: Budget ───
  {
    id: -140,
    slug: "budget",
    step: 6,
    kind: "select",
    prompt: "How much are you looking to invest?",
    subtitle: "Bands only — keeps things private.",
    options: [
      { value: "under_10k",  label: "Under A$10k",         emoji: "🌱" },
      { value: "10k_100k",   label: "A$10k – A$100k",      emoji: "📈" },
      { value: "100k_500k",  label: "A$100k – A$500k",     emoji: "🏗️" },
      { value: "500k_1m",    label: "A$500k – A$1m",       emoji: "🏛️" },
      { value: "1m_plus",    label: "A$1m+",               emoji: "👑" },
      { value: "prefer_not", label: "Prefer not to say",   emoji: "🤫" },
    ],
    shown_if: {},
    maps_to: "budget_band",
    risk_weight: 0,
    mode: "both",
    enabled: true,
    sort_order: 60,
  },

  // ─── Step 7: Timeline ───
  {
    id: -150,
    slug: "timeline",
    step: 7,
    kind: "select",
    prompt: "When are you looking to act?",
    subtitle: null,
    options: [
      { value: "now",         label: "Now",                emoji: "⚡" },
      { value: "1_3_months",  label: "1–3 months",         emoji: "📅" },
      { value: "3_6_months",  label: "3–6 months",         emoji: "📆" },
      { value: "6_12_months", label: "6–12 months",        emoji: "🗓️" },
      { value: "researching", label: "Just researching",   emoji: "📚" },
    ],
    shown_if: {},
    maps_to: "timeline",
    risk_weight: 0,
    mode: "both",
    enabled: true,
    sort_order: 70,
  },
];

// ─── Result templates ────────────────────────────────────────────────────
// One per route at minimum, plus per-vertical overrides where the
// downstream surface differs meaningfully (e.g., compare?vertical=super
// shows a super-fund comparison instead of the broker default).

export const FALLBACK_TEMPLATES: Record<RouteType, ResultTemplate> = {
  compare: {
    id: -1000,
    route: "compare",
    intent_slug: null,
    headline: "Compare Platforms",
    why_text:
      "Based on your answers, comparing platforms side-by-side is the right next step. We've scored your top match below — keep scrolling for the rest of the shortlist.",
    checklist: [
      { label: "See your top match", href: "/compare" },
      { label: "Compare the full shortlist", href: "/compare" },
      { label: "Run the fee calculator", href: "/calculators/fee-impact" },
      { label: "Check CHESS sponsorship", href: "/chess-lookup" },
      { label: "Save your shortlist" },
    ],
    primary_cta: { label: "See full comparison", href: "/compare" },
    secondary_ctas: [
      { label: "Fee calculator", href: "/calculators/fee-impact" },
      { label: "Get expert help if unsure", href: "/get-matched?goal=help" },
    ],
    cross_sells: [
      { label: "How brokerage actually adds up", href: "/article/how-brokerage-adds-up", icon: "calculator" },
      { label: "CHESS vs custodial", href: "/article/chess-vs-custodial", icon: "shield-check" },
    ],
    enabled: true,
  },
  browse: {
    id: -1001,
    route: "browse",
    intent_slug: null,
    headline: "Browse Opportunities",
    why_text:
      "Open opportunities matching your shape. You stay anonymous unless you choose to enquire — no signup required.",
    checklist: [
      { label: "View matching opportunities", href: "/invest" },
      { label: "Filter by vertical, ticket size, location" },
      { label: "Save searches for alerts" },
      { label: "Create an Opportunity Brief if you want help assessing" },
    ],
    primary_cta: { label: "View opportunities", href: "/invest" },
    secondary_ctas: [
      { label: "Get help assessing", href: "/get-matched?goal=help" },
      { label: "Compare platforms instead", href: "/compare" },
    ],
    cross_sells: [
      { label: "How to read a private deal", href: "/articles", icon: "file-text" },
      { label: "Wholesale-investor explainer", href: "/articles", icon: "shield" },
    ],
    enabled: true,
  },
  individual: {
    id: -1002,
    route: "individual",
    intent_slug: null,
    headline: "Verified Individual Expert",
    why_text:
      "A single verified professional is likely the cleanest fit. You stay in control — they only see your details after you decide to share them.",
    checklist: [
      { label: "Browse verified individuals", href: "/advisors?provider_type=individual" },
      { label: "Compare two profiles side-by-side" },
      { label: "Create a brief for one professional" },
    ],
    primary_cta: { label: "Browse individuals", href: "/advisors?provider_type=individual" },
    secondary_ctas: [
      { label: "Or consider a firm", href: "/advisors?provider_type=firm" },
      { label: "Create an Investor Brief", href: "/briefs/new" },
    ],
    cross_sells: [
      { label: "Questions to ask any adviser", href: "/articles", icon: "message-circle" },
      { label: "How verified profiles work", href: "/articles", icon: "shield-check" },
    ],
    enabled: true,
  },
  firm: {
    id: -1003,
    route: "firm",
    intent_slug: null,
    headline: "Firm or Brokerage",
    why_text:
      "You prefer the structure of a firm. Browse verified firms — each one has at least one verified representative.",
    checklist: [
      { label: "Browse verified firms", href: "/advisors?provider_type=firm" },
      { label: "Compare firm representatives" },
      { label: "Create an Investor Brief" },
    ],
    primary_cta: { label: "Browse firms", href: "/advisors?provider_type=firm" },
    secondary_ctas: [
      { label: "View firm reviews", href: "/advisors" },
      { label: "Create an Investor Brief", href: "/briefs/new" },
    ],
    cross_sells: [
      { label: "Firm vs individual: how to pick", href: "/articles", icon: "users" },
    ],
    enabled: true,
  },
  expert_team: {
    id: -1004,
    route: "expert_team",
    intent_slug: null,
    headline: "Verified Expert Team",
    why_text:
      "Your situation usually involves more than one professional. A verified expert team coordinates the work so you don't.",
    checklist: [
      { label: "Browse verified expert teams", href: "/advisors#expert-teams" },
      { label: "See who is on each team" },
      { label: "Create an Investor Brief for a team" },
    ],
    primary_cta: { label: "Browse expert teams", href: "/advisors#expert-teams" },
    secondary_ctas: [
      { label: "Create an Investor Brief", href: "/briefs/new" },
      { label: "Who do I need on my team?", href: "/articles" },
    ],
    cross_sells: [
      { label: "How verified teams work", href: "/articles", icon: "users" },
    ],
    enabled: true,
  },
  investor_brief: {
    id: -1005,
    route: "investor_brief",
    intent_slug: null,
    headline: "Create an Investor Brief",
    why_text:
      "You're ready to be contacted by a verified provider. We'll route your masked brief to the right professionals.",
    checklist: [
      { label: "Confirm the goal of your brief" },
      { label: "Pick smart-match, direct or multi-response" },
      { label: "Add contact and consent" },
    ],
    primary_cta: { label: "Create brief", href: "/briefs/new" },
    secondary_ctas: [
      { label: "Browse providers first", href: "/advisors" },
    ],
    cross_sells: [
      { label: "How accept works", href: "/articles", icon: "info" },
    ],
    enabled: true,
  },
  listing_brief: {
    id: -1006,
    route: "listing_brief",
    intent_slug: null,
    headline: "Prepare Your Listing",
    why_text:
      "You're on the seller side. A successful listing usually needs a few moving parts — legal, financial, valuation, marketing. Prepare a Listing Brief and we'll route it to the right verified professionals, or hand-pick them yourself below.",
    checklist: [
      { label: "Listing readiness check" },
      { label: "Get a transaction lawyer for the contract" },
      { label: "Get an accountant on tax structuring" },
      { label: "Get an independent valuation" },
      { label: "Prepare your due-diligence pack" },
      { label: "Create your Listing Brief" },
    ],
    primary_cta: { label: "Create Listing Brief", href: "/briefs/new?template=listing_readiness" },
    secondary_ctas: [
      { label: "Post your opportunity", href: "/invest" },
      { label: "Speak to listing experts", href: "/advisors" },
    ],
    cross_sells: [
      { label: "Find a transaction lawyer", href: "/advisors?type=lawyer", icon: "scale" },
      { label: "Find a property / business accountant", href: "/advisors?type=accountant", icon: "calculator" },
      { label: "Find a valuation expert", href: "/advisors?type=valuer", icon: "trending-up" },
    ],
    enabled: true,
  },
  second_opinion: {
    id: -1007,
    route: "second_opinion",
    intent_slug: null,
    headline: "Second Opinion Brief",
    why_text:
      "You want an independent review of advice or a deal. Verified professionals can review it under their own licence and terms.",
    checklist: [
      { label: "Describe what needs reviewing" },
      { label: "Pick the right review type" },
      { label: "Create your Second Opinion Brief" },
    ],
    primary_cta: { label: "Create Second Opinion Brief", href: "/briefs/new?template=second_opinion" },
    secondary_ctas: [
      { label: "Find a licensed adviser", href: "/advisors?type=financial_planner" },
      { label: "Find a tax / accounting reviewer", href: "/advisors?type=tax_agent" },
    ],
    cross_sells: [
      { label: "When to get a second opinion", href: "/articles", icon: "shield" },
    ],
    enabled: true,
  },
  guide: {
    id: -1008,
    route: "guide",
    intent_slug: null,
    headline: "Start with information",
    why_text:
      "You're early — here is the curated reading and tooling for where you are.",
    checklist: [
      { label: "Read the most relevant guide" },
      { label: "Run a calculator" },
      { label: "Come back when you're ready" },
    ],
    primary_cta: { label: "Browse guides", href: "/articles" },
    secondary_ctas: [
      { label: "Start the action plan over", href: "/get-matched" },
    ],
    cross_sells: [
      { label: "Most popular guides", href: "/articles", icon: "file-text" },
    ],
    enabled: true,
  },
};

/**
 * Returns the fallback template for a (route, intent) pair. The DB query
 * supports per-intent overrides; here we only key by route since the
 * code-defined fallbacks are intentionally minimal.
 */
export function getFallbackTemplate(route: RouteType): ResultTemplate {
  return FALLBACK_TEMPLATES[route] ?? FALLBACK_TEMPLATES.guide;
}
