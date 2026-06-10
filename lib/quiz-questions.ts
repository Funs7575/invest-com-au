/**
 * lib/quiz-questions.ts
 *
 * Canonical find-advisor quiz question definitions, extracted verbatim from
 * app/quiz/page.tsx so they are (a) unit-testable against the Zod answer
 * schemas and (b) reusable by the vertical entry points without importing the
 * client page component.
 *
 * The contract test __tests__/lib/quiz-questions.test.ts asserts every option
 * key validates against its schema in lib/quiz-answer-schemas.ts — the net that
 * catches the silent lead-nulling class of bug (P0 #1: an option whose value
 * the schema rejects degrades to `undefined` on persist).
 */
import type { QuestionId } from "./quiz-flow";

export interface QuizOption {
  key: string;
  label: string;
  sub?: string;
  emoji?: string;
}

export interface QuizQuestionDef {
  text: string;
  options: QuizOption[];
}

export const UNIFIED_QUESTIONS: Record<QuestionId, QuizQuestionDef> = {
  location: {
    text: "Where are you based?",
    options: [
      { key: "australia",     label: "I live in Australia",              sub: "Australian resident or citizen",              emoji: "🇦🇺" },
      { key: "international", label: "I'm outside Australia",            sub: "I'm based overseas and investing in Australia", emoji: "🌏" },
      { key: "expat",         label: "Australian expat living abroad",   sub: "I'm an Aussie living overseas",               emoji: "✈️" },
    ],
  },
  investor_country: {
    text: "Which country are you based in?",
    options: [
      { key: "singapore",     label: "Singapore",     emoji: "🇸🇬" },
      { key: "hong_kong",     label: "Hong Kong",     emoji: "🇭🇰" },
      { key: "china",         label: "China",         emoji: "🇨🇳" },
      { key: "india",         label: "India",         emoji: "🇮🇳" },
      { key: "uae",           label: "UAE / Middle East", emoji: "🇦🇪" },
      { key: "uk",            label: "United Kingdom", emoji: "🇬🇧" },
      { key: "usa",           label: "United States", emoji: "🇺🇸" },
      { key: "malaysia",      label: "Malaysia",      emoji: "🇲🇾" },
      { key: "new_zealand",   label: "New Zealand",   emoji: "🇳🇿" },
      { key: "japan",         label: "Japan",         emoji: "🇯🇵" },
      { key: "south_korea",   label: "South Korea",   emoji: "🇰🇷" },
      { key: "saudi_arabia",  label: "Saudi Arabia",  emoji: "🇸🇦" },
      { key: "other",         label: "Other country", emoji: "🌍" },
    ],
  },
  visa_status: {
    text: "What is your relationship with Australia?",
    options: [
      { key: "non_resident",    label: "Non-resident / no Australian ties", sub: "Never lived in Australia, no visa",                emoji: "🌐" },
      { key: "temp_visa",       label: "Temporary visa holder",             sub: "457, 482, student, working holiday visa",         emoji: "📋" },
      { key: "new_pr",          label: "New permanent resident",            sub: "Recently got PR, not yet a citizen",              emoji: "🏡" },
      { key: "au_expat",        label: "Australian expat",                  sub: "Australian citizen or PR living abroad",          emoji: "✈️" },
    ],
  },
  investor_goal_intl: {
    text: "What are you looking to do in Australia?",
    options: [
      { key: "property",  label: "Buy property",            sub: "Residential or investment property",          emoji: "🏠" },
      { key: "shares",    label: "Invest in ASX shares",    sub: "Stocks, ETFs, or managed funds",              emoji: "📈" },
      { key: "savings",   label: "Park money in AUD",       sub: "High-interest savings or term deposits",      emoji: "💰" },
      { key: "business",  label: "Set up a business",       sub: "Company registration, structuring",           emoji: "🏢" },
    ],
  },
  goal: {
    text: "What are you trying to do?",
    options: [
      { key: "grow",       label: "Start investing / Long-term growth",      sub: "ETFs, shares, or building wealth over time",            emoji: "📈" },
      { key: "income",     label: "Earn income / dividends",                 sub: "Regular income from investments",                       emoji: "💰" },
      { key: "crypto",     label: "Buy crypto",                              sub: "Bitcoin, Ethereum, altcoins",                           emoji: "₿" },
      { key: "trade",      label: "Active trading",                          sub: "Frequent trades, CFDs, or short-term strategies",       emoji: "⚡" },
      { key: "automate",   label: "Hands-off / automated investing",         sub: "Set and forget, robo-advisors",                         emoji: "🤖" },
      { key: "super",      label: "Retirement / Super / SMSF",               sub: "Optimise my superannuation",                            emoji: "🏦" },
      { key: "property",   label: "Property investing",                      sub: "Physical property, REITs, or through super",            emoji: "🏠" },
      { key: "home",       label: "Buy a home or get a loan",                sub: "First home, refinance, or investment loan",             emoji: "🔑" },
      { key: "alt-assets", label: "Alternative / collectible assets",        sub: "Whisky, wine, art, watches, classic cars, coins",       emoji: "🥃" },
      { key: "royalties",  label: "Royalties / income-producing assets",     sub: "Music, mining, IP royalties + vending / ATM income",    emoji: "📜" },
      { key: "pre-ipo",    label: "Pre-IPO / wholesale-investor deals",      sub: "Late-stage private equity, IPO calendar, s708 deals",   emoji: "🚀" },
      { key: "help",       label: "Get expert help",                         sub: "I'd like professional guidance",                        emoji: "🤝" },
      { key: "other",      label: "Something else / I'll describe it",       sub: "We'll route you to the right pro via post-a-job",       emoji: "❓" },
    ],
  },
  stage: {
    text: "Where are you up to?",
    options: [
      { key: "under-contract", label: "I need help right now",     sub: "I'm on a deadline — an offer, settlement, or tax/EOFY date", emoji: "⏳" },
      { key: "ready",          label: "I'm ready to get started",  sub: "Looking to take action in the next few weeks",              emoji: "🚀" },
      { key: "exploring",      label: "I'm weighing up my options", sub: "Researching before I commit to anything",                  emoji: "🔍" },
      { key: "learning",       label: "Just learning for now",     sub: "Building my understanding — not ready to act yet",          emoji: "📚" },
    ],
  },
  mode: {
    text: "Do you want to do this yourself or get expert help?",
    options: [
      { key: "diy", label: "Do it myself", sub: "I'll choose my own platform and investments" },
      { key: "help", label: "Get expert help", sub: "I'd like professional guidance" },
      { key: "unsure", label: "I'm not sure yet", sub: "Show me both at the end — I'll pick after seeing the options" },
    ],
  },
  experience: {
    text: "How experienced are you with investing?",
    options: [
      { key: "beginner", label: "Complete beginner", sub: "Just getting started" },
      { key: "intermediate", label: "Some experience", sub: "I've invested before but want to improve" },
      { key: "pro", label: "Advanced / professional", sub: "I know what I'm doing" },
    ],
  },
  complexity: {
    text: "How complex is your situation?",
    options: [
      { key: "simple",   label: "Simple",   sub: "Single goal, few or no existing assets — standard investor situation" },
      { key: "moderate", label: "Moderate", sub: "Some investments already in place, a few things to juggle" },
      { key: "complex",  label: "Complex",  sub: "Multiple goals, SMSF, investment property, business, or cross-border situation" },
    ],
  },
  amount: {
    text: "How much are you looking to invest?",
    options: [
      { key: "small", label: "Under $10,000",        sub: "Starting out — low minimums and zero-fee platforms matter most" },
      { key: "medium", label: "$10,000 – $100,000",  sub: "Building a solid portfolio — most platforms are well suited" },
      { key: "large", label: "$100,000 – $500,000",  sub: "Significant savings — fee structure and tax efficiency become critical" },
      { key: "whale", label: "$500,000+",             sub: "Major wealth decisions — a financial planner is often worth it here" },
    ],
  },
  priority: {
    text: "What matters most to you?",
    options: [
      { key: "fees", label: "Lowest fees", sub: "Minimise brokerage and ongoing costs" },
      { key: "safety", label: "Safety (CHESS sponsored)", sub: "Shares held directly in your name" },
      { key: "tools", label: "Best tools & research", sub: "Advanced charting, analysis, screeners" },
      { key: "simple", label: "Simplicity / set & forget", sub: "Easy, automated, and stress-free" },
    ],
  },
  advisor_type: {
    text: "What type of expert are you looking for?",
    options: [
      { key: "mortgage-broker",   label: "Mortgage broker",           sub: "Home loans, refinancing, investment loans",     emoji: "🏠" },
      { key: "buyers-agent",      label: "Buyer's agent",             sub: "Find and negotiate property purchases",         emoji: "🔍" },
      { key: "conveyancer",       label: "Conveyancer",               sub: "Property settlement, contracts, title",         emoji: "📑" },
      { key: "financial-planner", label: "Financial planner",         sub: "Investment strategy, tax, retirement planning", emoji: "📊" },
      { key: "smsf-accountant",   label: "SMSF accountant",           sub: "Set up and manage a self-managed super fund",   emoji: "🏦" },
      { key: "tax-agent",         label: "Tax agent",                 sub: "Tax returns, crypto CGT, deductions",           emoji: "📋" },
      { key: "insurance-broker",  label: "Insurance broker",          sub: "Life, income, and asset protection",            emoji: "🛡️" },
      { key: "estate-planner",    label: "Estate planner",            sub: "Wills, succession, asset protection",           emoji: "📜" },
      { key: "commercial-property-agent", label: "Commercial property agent", sub: "Buy or lease commercial property",      emoji: "🏢" },
      { key: "aged-care-advisor", label: "Aged care advisor",         sub: "Aged-care costs, RADs, Centrelink planning",    emoji: "🏥" },
      { key: "debt-counsellor",   label: "Debt counsellor",           sub: "Budgeting help and getting on top of debt",     emoji: "🧮" },
      { key: "not-sure",          label: "I'm not sure what I need",  sub: "Help me figure out the right expert",           emoji: "🤔" },
    ],
  },
  property_sub: {
    text: "How do you want to invest in property?",
    options: [
      { key: "physical",       label: "Buy residential property",             sub: "Direct ownership — house, apartment, or investment property", emoji: "🏠" },
      { key: "commercial",     label: "Commercial property",                  sub: "Office, retail, warehouse, or industrial — typically higher yields", emoji: "🏢" },
      { key: "property-reit",  label: "REITs / fractional property",          sub: "Property funds, BrickX, or listed property trusts",            emoji: "📊" },
      { key: "property-super", label: "Property through super (SMSF)",        sub: "Self-managed super fund property strategy",                    emoji: "🏦" },
    ],
  },
  // ─── Wealth-stack supplementary questions (DIY track only) ───────────
  // Three quick optional questions appended after `priority` for DIY users.
  // They feed the vertical scoring engine (super, savings, robo) without
  // extending the main quiz flow for advisor/international users.
  stack_risk: {
    text: "How would you describe your risk tolerance?",
    options: [
      { key: "conservative", label: "Conservative",   sub: "I prefer stability — lower returns are fine to avoid big swings", emoji: "🛡️" },
      { key: "balanced",     label: "Balanced",       sub: "Comfortable with some ups and downs over the medium term",        emoji: "⚖️" },
      { key: "growth",       label: "Growth",         sub: "Happy to ride volatility for higher long-term returns",           emoji: "🚀" },
    ],
  },
  stack_super: {
    text: "Do you want a super fund recommendation in your results?",
    options: [
      { key: "super_yes",    label: "Yes — show me a top fund",       sub: "We'll match a super fund to your risk profile and balance",   emoji: "🏦" },
      { key: "super_no",     label: "Not right now",                  sub: "Skip super — focus on investing platforms",                  emoji: "➡️" },
    ],
  },
  stack_savings: {
    text: "Want a high-interest savings account in your stack?",
    options: [
      { key: "savings_yes",  label: "Yes — park my cash somewhere smart", sub: "Match a high-rate savings account to your time horizon",    emoji: "💰" },
      { key: "savings_no",   label: "Not needed",                         sub: "Skip savings — I'm happy with my current setup",            emoji: "➡️" },
    ],
  },
};
