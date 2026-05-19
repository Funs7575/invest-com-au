import type { HubOnboardingConfig } from "@/components/HubOnboardingShell";
import type { QuizAnswers } from "@/components/EligibilityQuiz";

/**
 * Hub-specific diagnostic quiz configurations for the hub onboarding flow.
 *
 * Each config defines: heading, subheading, 3-question quiz, and an `evaluate`
 * function that maps quiz answers to a personalised result (headline + CTAs).
 *
 * Consumed by <HubOnboardingShell> in each hub's /quiz page.
 *
 * OB-01 — hub onboarding stream (REMEDIATION_QUEUE.md).
 */

export const SMSF_ONBOARDING_CONFIG: HubOnboardingConfig = {
  hubSlug: "smsf",
  hubName: "SMSF",
  heading: "Is an SMSF right for you?",
  subheading: "Answer 3 quick questions to get a personalised SMSF assessment.",
  questions: [
    {
      id: "balance",
      question: "What is your current super balance?",
      options: [
        { value: "under_100k", label: "Under $100k" },
        { value: "100k_200k", label: "$100k – $200k" },
        { value: "200k_500k", label: "$200k – $500k" },
        { value: "over_500k", label: "Over $500k" },
      ],
    },
    {
      id: "goal",
      question: "What is your main reason for considering an SMSF?",
      options: [
        { value: "property", label: "Buy property through super (LRBA)" },
        { value: "alternatives", label: "Invest in alternatives (crypto, unlisted assets)" },
        { value: "control", label: "More control over my investment choices" },
        { value: "cost", label: "Reduce fees vs. retail or industry fund" },
      ],
    },
    {
      id: "readiness",
      question: "How familiar are you with SMSF trustee obligations?",
      options: [
        { value: "new", label: "Completely new to me" },
        { value: "some", label: "I have done some research" },
        { value: "ready", label: "I understand the ATO rules" },
        { value: "current", label: "I already have an SMSF" },
      ],
    },
  ],

  evaluate(answers: QuizAnswers) {
    const balance = answers["balance"];
    const goal = answers["goal"];
    const readiness = answers["readiness"];

    if (readiness === "current") {
      return {
        headline: "You are an experienced trustee — let us help you optimise.",
        summary:
          "Since you already have an SMSF, the next step is making sure it is performing. A specialist adviser can review your investment strategy, pension-phase planning, and compliance obligations.",
        primaryCta: { label: "Find an SMSF Specialist", href: "/quiz?vertical=smsf" },
        secondaryCta: { label: "SMSF Audit Checklist", href: "/smsf/checklist" },
        advisorCta: { href: "/quiz?vertical=smsf", specialty: "SMSF specialist" },
      };
    }

    if (balance === "under_100k") {
      return {
        headline: "An SMSF may not stack up yet — but let us plan ahead.",
        summary:
          "SMSFs are generally cost-effective above $200k–$250k. Below that, annual administration fees ($1,500–$5,000) erode returns. A low-fee industry or retail super fund is usually better at this stage.",
        primaryCta: { label: "Compare Super Funds", href: "/super" },
        secondaryCta: { label: "When Does an SMSF Make Sense?", href: "/article/when-smsf-makes-sense" },
        advisorCta: { href: "/quiz?vertical=super", specialty: "super specialist" },
      };
    }

    if (goal === "property") {
      return {
        headline: "Property in super is achievable — with the right structure.",
        summary:
          "Buying property via a Limited Recourse Borrowing Arrangement (LRBA) requires a corporate trustee, bare trust, and a lender willing to finance SMSF loans. Costs are higher, but the tax treatment in pension phase is very powerful.",
        primaryCta: { label: "Find an SMSF Property Specialist", href: "/quiz?vertical=smsf" },
        secondaryCta: { label: "Property in SMSF Guide", href: "/smsf/property" },
        advisorCta: { href: "/quiz?vertical=smsf", specialty: "SMSF property specialist" },
      };
    }

    if ((balance === "200k_500k" || balance === "over_500k") && readiness !== "new") {
      return {
        headline: "You look like a strong SMSF candidate.",
        summary:
          "With a solid balance and some prior research, the economics of an SMSF work in your favour. Setup costs ($1,000–$3,000) and annual admin ($1,500–$5,000) are manageable at your balance level.",
        primaryCta: { label: "Start SMSF Setup", href: "/smsf/setup" },
        secondaryCta: { label: "Find an SMSF Specialist", href: "/quiz?vertical=smsf" },
        advisorCta: { href: "/quiz?vertical=smsf", specialty: "SMSF adviser" },
      };
    }

    return {
      headline: "An SMSF could work — let us check the numbers.",
      summary:
        "Whether an SMSF makes sense depends on your balance, goals, and how much time you are willing to commit as a trustee. A free initial consultation with an SMSF specialist will give you a clear picture.",
      primaryCta: { label: "Talk to an SMSF Specialist", href: "/quiz?vertical=smsf" },
      secondaryCta: { label: "Read the SMSF Guide", href: "/invest/smsf" },
      advisorCta: { href: "/quiz?vertical=smsf", specialty: "SMSF specialist" },
    };
  },
};

export const DIVIDENDS_ONBOARDING_CONFIG: HubOnboardingConfig = {
  hubSlug: "dividends",
  hubName: "Dividend Investing",
  heading: "Find your dividend investing strategy",
  subheading: "3 questions to personalise your approach to ASX dividend income.",
  questions: [
    {
      id: "goal",
      question: "What is your primary dividend investing goal?",
      options: [
        { value: "income", label: "Regular income to fund living expenses" },
        { value: "growth", label: "Reinvest dividends for long-term compounding" },
        { value: "super", label: "Maximise franking credits (in SMSF or pension phase)" },
        { value: "exploring", label: "Still exploring my options" },
      ],
    },
    {
      id: "holdings",
      question: "Do you currently hold ASX shares or ETFs?",
      options: [
        { value: "shares", label: "Yes — ASX individual shares" },
        { value: "etfs", label: "Yes — ETFs (VHY, A200, etc.)" },
        { value: "both", label: "Both shares and ETFs" },
        { value: "none", label: "Not yet" },
      ],
    },
    {
      id: "structure",
      question: "What structure do you invest through?",
      options: [
        { value: "personal", label: "Personally (individual or joint account)" },
        { value: "smsf", label: "SMSF" },
        { value: "company_trust", label: "Company or trust" },
        { value: "super_only", label: "Industry or retail super only (no SMSF)" },
      ],
    },
  ],

  evaluate(answers: QuizAnswers) {
    const goal = answers["goal"];
    const structure = answers["structure"];

    if (structure === "smsf" || goal === "super") {
      return {
        headline: "Franking credits are your superpower inside an SMSF.",
        summary:
          "In pension phase, your SMSF can claim the full 30% corporate tax credit as a cash refund — meaning a 4.2% ASX dividend yield effectively becomes ~6% after-tax. Focus on fully-franked payers and consider Dividend Reinvestment Plans (DRPs).",
        primaryCta: { label: "SMSF Dividend Strategy", href: "/invest/smsf" },
        secondaryCta: { label: "Franking Calculator", href: "/dividends/calculator" },
        advisorCta: { href: "/quiz?vertical=smsf", specialty: "SMSF and tax adviser" },
      };
    }

    if (goal === "income") {
      return {
        headline: "A high-yield ASX portfolio can replace a salary.",
        summary:
          "Target 4–5% gross yield with full franking on WDS, the Big 4 banks, and BHP. At $500k invested, that is roughly $25k/year — or ~$35k after franking credits in pension phase. ETFs like VHY diversify automatically.",
        primaryCta: { label: "High-Yield ASX Stocks", href: "/article/high-dividend-asx-stocks-2026" },
        secondaryCta: { label: "Compare Dividend ETFs", href: "/article/best-dividend-etfs-australia" },
        advisorCta: { href: "/quiz", specialty: "income-focused adviser" },
      };
    }

    if (goal === "growth") {
      return {
        headline: "Dividend reinvestment compounds faster than most investors realise.",
        summary:
          "A $200k portfolio at 4.2% yield, reinvested annually, grows to roughly $330k in 10 years with no new contributions — before capital growth. Dividend Reinvestment Plans at most ASX top-50 payers automate this entirely.",
        primaryCta: { label: "Best Dividend ETFs Guide", href: "/article/best-dividend-etfs-australia" },
        secondaryCta: { label: "Franking Credits Explained", href: "/dividends/franking-credits" },
        advisorCta: { href: "/quiz", specialty: "investment adviser" },
      };
    }

    return {
      headline: "Dividend investing is a great foundation for Australian investors.",
      summary:
        "Australia's imputation system is unique — you do not just earn dividends, you receive a credit for the tax the company already paid. Start with a diversified dividend ETF (VHY, A200) before picking individual stocks.",
      primaryCta: { label: "Compare Share Platforms", href: "/compare" },
      secondaryCta: { label: "Franking Credits Guide", href: "/dividends/franking-credits" },
      advisorCta: { href: "/quiz", specialty: "financial adviser" },
    };
  },
};

export const WHOLESALE_ONBOARDING_CONFIG: HubOnboardingConfig = {
  hubSlug: "wholesale",
  hubName: "Wholesale Investing",
  heading: "Do you qualify as a wholesale investor?",
  subheading:
    "3 questions to see whether you meet the s708 test and which wholesale products suit you.",
  questions: [
    {
      id: "qualification",
      question: "Which best describes your current financial position?",
      options: [
        {
          value: "net_assets",
          label: "Net assets over $2.5M (excluding primary residence in some cases)",
        },
        {
          value: "income",
          label: "Gross income over $250,000 for each of the last 2 financial years",
        },
        {
          value: "professional",
          label: "Licensed financial services professional (AFS licence holder or rep)",
        },
        { value: "exploring", label: "Not yet — still building toward these thresholds" },
      ],
    },
    {
      id: "interest",
      question: "Which wholesale asset class interests you most?",
      options: [
        { value: "private_equity", label: "Private equity or venture capital" },
        { value: "hedge_fund", label: "Hedge funds or absolute-return strategies" },
        { value: "litigation", label: "Litigation funding or private credit" },
        { value: "unlisted_property", label: "Unlisted commercial property or infrastructure" },
      ],
    },
    {
      id: "horizon",
      question: "What is your preferred investment horizon for wholesale capital?",
      options: [
        { value: "short", label: "Under 2 years (liquid / short-term credit)" },
        { value: "medium", label: "2–5 years (typical PE / hedge fund lock-up)" },
        { value: "long", label: "5–10 years (infrastructure, VC, late-stage PE)" },
        { value: "unsure", label: "Not sure yet — want to understand the options" },
      ],
    },
  ],

  evaluate(answers: QuizAnswers) {
    const qualification = answers["qualification"];
    const interest = answers["interest"];
    const horizon = answers["horizon"];

    if (qualification === "exploring") {
      return {
        headline: "You are building toward wholesale status — let us map the path.",
        summary:
          "The s708 test requires net assets over $2.5M or $250k annual income (both tests sustained over 2 years). A financial adviser can help you structure assets and document eligibility when you cross the threshold.",
        primaryCta: { label: "Wholesale Investor Guide", href: "/invest/wholesale" },
        secondaryCta: { label: "Find a Financial Adviser", href: "/find-advisor" },
        advisorCta: { href: "/quiz", specialty: "financial adviser" },
      };
    }

    if (qualification === "professional") {
      return {
        headline: "As a licensed professional, you have broad wholesale access.",
        summary:
          "AFS licence holders and authorised representatives qualify under s708(11) regardless of asset or income tests. You can access the full range of wholesale products — PE, VC, hedge funds, litigation funding — directly.",
        primaryCta: { label: "Explore Wholesale Products", href: "/invest/wholesale" },
        secondaryCta: {
          label: "Private Equity Opportunities",
          href: "/invest/private-equity/listings",
        },
        advisorCta: { href: "/quiz?vertical=wholesale", specialty: "wholesale investment specialist" },
      };
    }

    if (interest === "private_equity" || interest === "litigation") {
      return {
        headline: "Private equity and litigation funding suit your profile.",
        summary:
          "With confirmed wholesale status, Australian PE and litigation funding managers accept direct subscriptions — typically $50k–$250k minimums. Returns vary widely; illiquidity premiums of 2–5% above listed markets are common in well-managed funds.",
        primaryCta: {
          label: "Browse PE & VC Listings",
          href: "/invest/private-equity/listings",
        },
        secondaryCta: { label: "Litigation Funding Explained", href: "/invest/alternatives" },
        advisorCta: { href: "/quiz?vertical=wholesale", specialty: "wholesale investment specialist" },
      };
    }

    if (interest === "hedge_fund") {
      return {
        headline: "Hedge funds and absolute-return strategies are within reach.",
        summary:
          "Australian-domiciled wholesale hedge funds typically require $50k–$500k minimums and a 12-month lock-up. Absolute-return mandates seek positive returns in both bull and bear markets — useful as a portfolio diversifier.",
        primaryCta: { label: "Alternative Investments", href: "/invest/alternatives" },
        secondaryCta: { label: "Find a Wholesale Adviser", href: "/quiz?vertical=wholesale" },
        advisorCta: { href: "/quiz?vertical=wholesale", specialty: "wholesale investment specialist" },
      };
    }

    if (interest === "unlisted_property" || horizon === "long") {
      return {
        headline: "Unlisted property and infrastructure offer long-duration returns.",
        summary:
          "Wholesale commercial property syndicates and infrastructure funds target 7–9% p.a. distributions with capital appreciation over 5–10 year horizons. Low correlation to ASX makes them attractive portfolio diversifiers for HNW investors.",
        primaryCta: { label: "Property Investment Hub", href: "/property" },
        secondaryCta: { label: "Find a Wholesale Adviser", href: "/quiz?vertical=wholesale" },
        advisorCta: { href: "/quiz?vertical=wholesale", specialty: "wholesale investment specialist" },
      };
    }

    return {
      headline: "You qualify as a wholesale investor — let us find the right products.",
      summary:
        "Wholesale investors access a wider product universe: unlisted funds, PE, VC, hedge funds, and private credit — without the retail disclosure requirements of listed products. A specialist adviser can match your risk tolerance to the right allocations.",
      primaryCta: { label: "Explore Wholesale Products", href: "/invest/wholesale" },
      secondaryCta: { label: "Find a Wholesale Adviser", href: "/quiz?vertical=wholesale" },
      advisorCta: { href: "/quiz?vertical=wholesale", specialty: "wholesale investment specialist" },
    };
  },
};

export const PROPERTY_ONBOARDING_CONFIG: HubOnboardingConfig = {
  hubSlug: "property",
  hubName: "Property Investment",
  heading: "What kind of property investor are you?",
  subheading: "3 quick questions to personalise your Australian property investment path.",
  questions: [
    {
      id: "goal",
      question: "What is your primary property investment goal?",
      options: [
        { value: "capital_growth", label: "Capital growth — buy in a growth corridor and hold" },
        { value: "rental_income", label: "Rental yield — generate reliable passive income" },
        { value: "home_first", label: "Owner-occupier first, then invest in a second property" },
        { value: "exploring", label: "Still exploring whether property is right for me" },
      ],
    },
    {
      id: "budget",
      question: "What is your available budget (deposit + purchase costs)?",
      options: [
        { value: "under_100k", label: "Under $100k" },
        { value: "100k_200k", label: "$100k – $200k" },
        { value: "200k_500k", label: "$200k – $500k" },
        { value: "over_500k", label: "Over $500k" },
      ],
    },
    {
      id: "experience",
      question: "What best describes your current property situation?",
      options: [
        { value: "first_time", label: "First property — never owned before" },
        { value: "owner_occ", label: "I own my home but have no investment properties" },
        { value: "existing_ip", label: "I already own one or more investment properties" },
        { value: "researching", label: "Actively researching but not yet committed" },
      ],
    },
  ],

  evaluate(answers: QuizAnswers) {
    const goal = answers["goal"];
    const budget = answers["budget"];
    const experience = answers["experience"];

    if (goal === "exploring") {
      return {
        headline: "Let us help you decide if property is the right move.",
        summary:
          "Property suits investors who want leverage, tax benefits (negative gearing, depreciation), and long-term capital appreciation. But it comes with illiquidity and concentration risk. A buyer's agent or financial adviser can model the numbers for your situation.",
        primaryCta: { label: "Property vs Shares Calculator", href: "/property-vs-shares-calculator" },
        secondaryCta: { label: "Find a Financial Adviser", href: "/find-advisor" },
        advisorCta: { href: "/quiz?vertical=property", specialty: "property investment adviser" },
      };
    }

    if (experience === "first_time" && budget === "under_100k") {
      return {
        headline: "A deposit is the first milestone — here is how to build to it.",
        summary:
          "With under $100k available, the goal now is building a deposit. The First Home Super Saver Scheme (FHSS) lets you save inside super at 15% tax, then withdraw up to $50k for a home deposit. Stamp-duty exemptions for first-home buyers also reduce your required savings.",
        primaryCta: { label: "First Home Buyer Hub", href: "/first-home-buyer" },
        secondaryCta: { label: "FHSS Calculator", href: "/tools/fhss-calculator" },
        advisorCta: { href: "/quiz?vertical=mortgage", specialty: "mortgage broker" },
      };
    }

    if (experience === "existing_ip") {
      return {
        headline: "You are building a portfolio — here is how to scale efficiently.",
        summary:
          "Experienced investors typically focus next on equity release from existing properties (via refinance or line of credit), cross-collateralisation risks, and portfolio diversification. A buyer's agent who specialises in investor clients can source off-market deals.",
        primaryCta: { label: "Browse New Developments", href: "/property/listings" },
        secondaryCta: { label: "Find a Buyer's Agent", href: "/quiz?vertical=property" },
        advisorCta: { href: "/quiz?vertical=property", specialty: "property investment adviser" },
      };
    }

    if (goal === "rental_income") {
      return {
        headline: "Rental yield investing starts with the right suburb and property type.",
        summary:
          "High-yield markets (regional QLD, parts of WA) can hit 6–8% gross yield but trade capital growth for income. Dual-income properties and house-and-land packages in high-demand rental corridors often outperform on a total-return basis. Use our yield calculator to stress-test the numbers.",
        primaryCta: { label: "Property Yield Calculator", href: "/property-yield-calculator" },
        secondaryCta: { label: "Find a Buyer's Agent", href: "/quiz?vertical=property" },
        advisorCta: { href: "/quiz?vertical=property", specialty: "property buyer's agent" },
      };
    }

    if (goal === "capital_growth") {
      return {
        headline: "Capital growth investing rewards patience and the right corridor.",
        summary:
          "Historically, well-located metro land within 20km of a CBD doubles every 10–12 years. New estates on urban fringes are cheaper but grow slower. A buyer's agent with local data can identify growth corridors before they peak — saving both time and money.",
        primaryCta: { label: "Browse New Developments", href: "/property/listings" },
        secondaryCta: { label: "Find a Buyer's Agent", href: "/quiz?vertical=property" },
        advisorCta: { href: "/quiz?vertical=property", specialty: "property buyer's agent" },
      };
    }

    return {
      headline: "Property is one of Australia's most proven wealth-building assets.",
      summary:
        "Start with a clear budget (deposit + stamp duty + buying costs), define your goal (yield vs growth), and choose the right structure (personal, joint, or trust). A mortgage broker can confirm your borrowing power before you make any offers.",
      primaryCta: { label: "Property Investment Guides", href: "/property" },
      secondaryCta: { label: "Find a Mortgage Broker", href: "/quiz?vertical=mortgage" },
      advisorCta: { href: "/quiz?vertical=property", specialty: "property investment adviser" },
    };
  },
};

export const ETF_ONBOARDING_CONFIG: HubOnboardingConfig = {
  hubSlug: "etfs",
  hubName: "ETF Investing",
  heading: "Which ETFs suit your investing style?",
  subheading: "3 questions to find the right ETF strategy for your portfolio.",
  questions: [
    {
      id: "goal",
      question: "What is your primary investing goal?",
      options: [
        { value: "income", label: "Passive income — dividends and distributions every quarter" },
        { value: "growth", label: "Long-term capital growth — build wealth over decades" },
        { value: "diversify", label: "Diversify a stock-heavy portfolio I already have" },
        { value: "simplify", label: "Simplify — replace multiple individual shares with one ETF" },
      ],
    },
    {
      id: "market",
      question: "Which market exposure interests you most?",
      options: [
        { value: "asx", label: "ASX / Australian equities" },
        { value: "us", label: "US equities (S&P 500, Nasdaq)" },
        { value: "global", label: "Broad global equities (VGS, IWLD-style)" },
        { value: "bonds_defensive", label: "Bonds or defensive / multi-asset" },
      ],
    },
    {
      id: "horizon",
      question: "What is your investment time horizon?",
      options: [
        { value: "short", label: "Under 3 years" },
        { value: "medium", label: "3–7 years" },
        { value: "long", label: "7–15 years" },
        { value: "very_long", label: "15+ years (retirement wealth building)" },
      ],
    },
  ],

  evaluate(answers: QuizAnswers) {
    const goal = answers["goal"];
    const market = answers["market"];
    const horizon = answers["horizon"];

    if (goal === "income" && (market === "asx" || market === "global")) {
      return {
        headline: "High-yield dividend ETFs are built for your goal.",
        summary:
          "VHY (Vanguard Australian Shares High Yield) yields ~4.5–5.5% with full franking credits — in a pension-phase SMSF that becomes ~6.5–7%. For global income, consider VDHG (multi-asset, income tilt) or HBRD (hybrid-securities ETF). Compare MER fees before buying — they compound negatively just like returns.",
        primaryCta: { label: "Compare Dividend ETFs", href: "/article/best-dividend-etfs-australia" },
        secondaryCta: { label: "Franking Credits Calculator", href: "/franking-credits-calculator" },
        advisorCta: { href: "/quiz", specialty: "investment adviser" },
      };
    }

    if (goal === "growth" && (market === "us" || market === "global")) {
      return {
        headline: "A low-cost global equity ETF is the core of most growth portfolios.",
        summary:
          "VGS (Vanguard MSCI Index International Shares) gives you ~1,500 global stocks at 0.18% MER. IVV (iShares S&P 500) is pure US at 0.04% — the cheapest way to own America. NDQ (BetaShares Nasdaq 100) is higher growth, higher volatility. All available on ASX.",
        primaryCta: { label: "Best Global ETFs Guide", href: "/article/best-global-etfs-australia" },
        secondaryCta: { label: "Compare ETFs on ASX", href: "/etfs" },
        advisorCta: { href: "/quiz", specialty: "investment adviser" },
      };
    }

    if (goal === "diversify") {
      return {
        headline: "One diversification ETF can rebalance your whole portfolio.",
        summary:
          "If you already hold Australian stocks, a single international equity ETF (VGS or BGBL) adds geographic diversification without overlap. VDHG and DHHF are pre-mixed multi-asset ETFs that automatically hold 4–7 underlying ETFs — one holding simplifies your tax return and rebalancing.",
        primaryCta: { label: "Best ETFs Australia", href: "/etfs" },
        secondaryCta: { label: "Portfolio X-Ray", href: "/portfolio-xray" },
        advisorCta: { href: "/quiz", specialty: "investment adviser" },
      };
    }

    if (goal === "simplify") {
      return {
        headline: "Swapping individual shares for an ETF cuts research, fees, and tax drag.",
        summary:
          "A move from 15 individual ASX stocks to A200 (ASX 200 ETF) typically halves brokerage, eliminates individual company risk, and removes the cognitive load of tracking earnings. CGT timing matters when selling shares — consider doing it across two financial years to spread the capital gain.",
        primaryCta: { label: "Best ASX ETFs", href: "/etfs" },
        secondaryCta: { label: "CGT Calculator", href: "/cgt-calculator" },
        advisorCta: { href: "/quiz", specialty: "investment adviser" },
      };
    }

    if (market === "bonds_defensive" || horizon === "short") {
      return {
        headline: "For a short horizon or capital preservation, defensive ETFs reduce volatility.",
        summary:
          "IAF (iShares Core Composite Bond) or BOND (BetaShares Composite Bond) give exposure to Australian government and corporate bonds. For mixed defensive/growth under 3 years, VDHG (70% equities / 30% bonds) or cash ETFs like MONY smooth short-term volatility.",
        primaryCta: { label: "Defensive ETF Guide", href: "/etfs" },
        secondaryCta: { label: "Compare ETFs", href: "/compare/etfs" },
        advisorCta: { href: "/quiz", specialty: "financial adviser" },
      };
    }

    return {
      headline: "A simple 2-ETF portfolio covers most long-term investor goals.",
      summary:
        "The classic approach: VAS (or A200) for Australian equities + VGS for international equities. Allocate 30–40% to Australia, 60–70% to international. Rebalance annually. Total ongoing cost: ~0.10–0.18% MER. This beats the median active fund over 15+ years after tax.",
      primaryCta: { label: "ETF Comparison Hub", href: "/etfs" },
      secondaryCta: { label: "Compare ETFs on ASX", href: "/compare/etfs" },
      advisorCta: { href: "/quiz", specialty: "investment adviser" },
    };
  },
};

export const INSURANCE_ONBOARDING_CONFIG: HubOnboardingConfig = {
  hubSlug: "insurance",
  hubName: "Insurance",
  heading: "What insurance do you actually need?",
  subheading: "3 questions to identify the right cover for your situation.",
  questions: [
    {
      id: "situation",
      question: "Which best describes your current life situation?",
      options: [
        { value: "single_no_deps", label: "Single, no dependants or mortgage" },
        { value: "couple_mortgage", label: "Couple with a mortgage, no kids" },
        { value: "family", label: "Family with young or school-age children" },
        { value: "self_employed", label: "Self-employed or business owner" },
        { value: "near_retirement", label: "Near retirement (55+)" },
      ],
    },
    {
      id: "priority",
      question: "What is your biggest insurance concern right now?",
      options: [
        { value: "income", label: "Protecting my income if I can't work" },
        { value: "life_cover", label: "Providing for my family if I die" },
        { value: "health", label: "Reducing out-of-pocket medical costs" },
        { value: "property_cover", label: "Protecting my home and contents" },
        { value: "not_sure", label: "Not sure — I want a general review" },
      ],
    },
    {
      id: "current_cover",
      question: "What insurance do you currently hold?",
      options: [
        { value: "none", label: "None / I have no personal insurance" },
        { value: "super_only", label: "Only what comes with my super fund" },
        { value: "some", label: "Some cover but I think it may be inadequate" },
        { value: "reviewing", label: "I have cover and want to review it" },
      ],
    },
  ],
  evaluate(answers: QuizAnswers) {
    const situation = answers["situation"];
    const priority = answers["priority"];
    const currentCover = answers["current_cover"];

    // Self-employed: income protection is critical (no employer sick leave)
    if (situation === "self_employed") {
      return {
        headline: "Income protection is your most critical insurance as a self-employed person.",
        summary:
          "You have no employer sick leave or workers compensation fallback. Income protection outside super (not inside) gives you the broadest 'own occupation' definition, is fully tax-deductible, and can be structured to match your drawings — not just a salary figure. A specialist insurance broker will help you structure agreed-value cover correctly.",
        primaryCta: { label: "Find an Insurance Broker", href: "/advisors/insurance-brokers" },
        secondaryCta: { label: "Income Protection Guide", href: "/insurance/income-protection" },
        advisorCta: { href: "/quiz", specialty: "insurance broker" },
      };
    }

    // Family: life + income protection highest priority
    if (situation === "family") {
      return {
        headline: "Families need life insurance and income protection — both, not one.",
        summary:
          "With dependants, a gap in either life or income cover creates serious financial risk. A rule of thumb: 10× your annual income in life cover, income protection to age 65. If you hold insurance inside super, check the policy's disability definition — income protection inside super defaults to 'any occupation' for the first 2 years, which is far more restrictive.",
        primaryCta: { label: "Life Insurance Guide", href: "/insurance/life" },
        secondaryCta: { label: "Find an Insurance Broker", href: "/advisors/insurance-brokers" },
        advisorCta: { href: "/quiz", specialty: "insurance broker" },
      };
    }

    // Health/MLS priority
    if (priority === "health") {
      return {
        headline: "Private health insurance may eliminate a 1–1.5% tax surcharge.",
        summary:
          "Singles earning above $93,000 (families above $186,000) pay a Medicare Levy Surcharge without private hospital cover. A basic hospital policy from ~$100/month often costs less than the MLS. Compare bronze, silver, and gold tiers — hospital cover is what removes the MLS; extras (dental/optical) are optional.",
        primaryCta: { label: "Health Insurance Guide", href: "/insurance/health" },
        secondaryCta: { label: "MLS Explained", href: "/insurance" },
        advisorCta: { href: "/quiz", specialty: "financial adviser" },
      };
    }

    // Home & contents priority
    if (priority === "property_cover") {
      return {
        headline: "One in eight Australian homes is underinsured — check your rebuild cost.",
        summary:
          "The most common mistake is insuring for market value instead of rebuild cost. Use a building cost estimator (check your insurer's website) to calculate the cost of rebuilding from scratch, not what you paid for the house. Contents cover should include all furniture, appliances, and personal items at replacement value.",
        primaryCta: { label: "Home & Contents Guide", href: "/insurance/home-contents" },
        secondaryCta: { label: "Find an Insurance Broker", href: "/advisors/insurance-brokers" },
        advisorCta: { href: "/quiz", specialty: "insurance broker" },
      };
    }

    // Near retirement
    if (situation === "near_retirement") {
      return {
        headline: "Review your cover amounts — many people are over-insured near retirement.",
        summary:
          "As your mortgage reduces and children become financially independent, your life insurance need decreases. However, income protection remains valuable while you're still working. Consider whether existing TPD and trauma cover is sized correctly, and review whether stepped premiums are now costing significantly more than when you first took out cover.",
        primaryCta: { label: "Insurance Review Guide", href: "/insurance" },
        secondaryCta: { label: "Find an Insurance Broker", href: "/advisors/insurance-brokers" },
        advisorCta: { href: "/quiz", specialty: "insurance broker" },
      };
    }

    // No cover / super-only — general push to get advice
    if (currentCover === "none" || currentCover === "super_only") {
      return {
        headline: "Most Australians are significantly underinsured — your super default may not be enough.",
        summary:
          "Default super fund insurance is group cover with no underwriting. It often lapses if your balance runs low, and the disability definition is more restrictive than individual cover. A 30-minute conversation with an insurance broker (typically no cost to you) can identify gaps and structure cover tax-efficiently.",
        primaryCta: { label: "Find an Insurance Broker", href: "/advisors/insurance-brokers" },
        secondaryCta: { label: "Insurance Hub", href: "/insurance" },
        advisorCta: { href: "/quiz", specialty: "insurance broker" },
      };
    }

    // Default: income protection — the most universally needed
    return {
      headline: "Income protection is the most universally needed insurance for working Australians.",
      summary:
        "If you can't work for 3+ months, no income protection means drawing down savings, redrawing on the mortgage, or relying on the disability support pension. Cover to age 65, 90-day waiting period, and 'own occupation' definition is the standard professional recommendation for employed Australians.",
      primaryCta: { label: "Income Protection Guide", href: "/insurance/income-protection" },
      secondaryCta: { label: "Find an Insurance Broker", href: "/advisors/insurance-brokers" },
      advisorCta: { href: "/quiz", specialty: "insurance broker" },
    };
  },
};

export const NEGATIVE_GEARING_ONBOARDING_CONFIG: HubOnboardingConfig = {
  hubSlug: "negative-gearing",
  hubName: "Negative Gearing",
  heading: "Is negative gearing right for your situation?",
  subheading:
    "3 questions to see whether the tax maths works for you — and which strategy fits.",
  questions: [
    {
      id: "income",
      question: "What is your approximate annual taxable income?",
      options: [
        { value: "under_45k", label: "Under $45,000 (19% marginal rate)" },
        { value: "45k_120k", label: "$45,001 – $120,000 (32.5% marginal rate)" },
        { value: "120k_180k", label: "$120,001 – $180,000 (37% marginal rate)" },
        { value: "over_180k", label: "Over $180,000 (45% marginal rate)" },
      ],
    },
    {
      id: "vehicle",
      question: "What is your preferred negative gearing vehicle?",
      options: [
        { value: "property", label: "Investment property (residential or commercial)" },
        { value: "shares", label: "Shares or managed funds (margin lending)" },
        { value: "both", label: "Both property and shares" },
        { value: "exploring", label: "Not sure yet — want to understand the options" },
      ],
    },
    {
      id: "situation",
      question: "Where are you in your investment journey?",
      options: [
        { value: "first_time", label: "Researching negative gearing for the first time" },
        { value: "currently_neg", label: "Already negatively geared — want to optimise" },
        { value: "positively_geared", label: "Positively geared — considering restructuring" },
        { value: "near_neutral", label: "Near breakeven — managing holding costs" },
      ],
    },
  ],

  evaluate(answers: QuizAnswers) {
    const income = answers["income"];
    const vehicle = answers["vehicle"];
    const situation = answers["situation"];

    // Low income bracket — tax offset is minimal, don't recommend
    if (income === "under_45k") {
      return {
        headline: "At your income level, negative gearing provides limited tax benefit.",
        summary:
          "Negative gearing offsets losses at your marginal rate. At 19%, a $10,000 annual loss saves only $1,900 in tax — barely enough to cover a rate rise. A positively-geared (cash-flow-positive) property strategy is typically better below $45k, where the cash you keep matters more than the tax you save.",
        primaryCta: { label: "Property Investment Guide", href: "/property" },
        secondaryCta: { label: "Negative Gearing Calculator", href: "/negative-gearing/calculator" },
        advisorCta: { href: "/quiz?vertical=property", specialty: "property investment adviser" },
      };
    }

    // Already negatively geared — optimisation focus
    if (situation === "currently_neg") {
      return {
        headline: "You are already negatively geared — the opportunity is in optimisation.",
        summary:
          "Most investors leave money on the table by under-claiming depreciation. A quantity surveyor's depreciation schedule ($500–$800) typically finds $5,000–$15,000 per year in additional deductions on properties built after 1985 — a 10× return on the survey cost in year one alone. A tax accountant specialising in investment property can also review your ownership structure and loan type.",
        primaryCta: { label: "Find a Property Tax Accountant", href: "/quiz?vertical=tax" },
        secondaryCta: { label: "Depreciation Guide", href: "/negative-gearing" },
        advisorCta: { href: "/quiz?vertical=tax", specialty: "property tax accountant" },
      };
    }

    // High income + property — strongest case for negative gearing
    if ((income === "over_180k" || income === "120k_180k") && vehicle === "property") {
      return {
        headline: "At 37–45% marginal rate, negative gearing on property is highly efficient.",
        summary:
          "Every dollar of net rental loss reduces your taxable income at 37–45 cents. On a $600k investment property losing $15k per year, that is $5,550–$6,750 in annual tax savings. Combined with capital growth, depreciation, and eventual CGT discount on sale, property negative gearing at your income level has a strong risk-adjusted return profile.",
        primaryCta: { label: "Negative Gearing Calculator", href: "/negative-gearing/calculator" },
        secondaryCta: { label: "Find a Property Adviser", href: "/quiz?vertical=property" },
        advisorCta: { href: "/quiz?vertical=property", specialty: "property investment adviser" },
      };
    }

    // High income + shares — margin lending negative gearing
    if ((income === "over_180k" || income === "120k_180k") && vehicle === "shares") {
      return {
        headline: "Margin lending on shares is a tax-effective strategy at your income level.",
        summary:
          "Borrowing to invest in shares or managed funds (margin lending) creates deductible interest and fees, reducing taxable income at 37–45%. A $200k loan at 7% interest = $14,000 in deductions per year. Unlike property, share portfolios are liquid — but margin calls require cash buffers. A financial adviser can structure the right loan-to-value ratio for your risk appetite.",
        primaryCta: { label: "Find a Financial Adviser", href: "/find-advisor" },
        secondaryCta: { label: "Negative Gearing on Shares", href: "/negative-gearing" },
        advisorCta: { href: "/quiz", specialty: "investment adviser" },
      };
    }

    // Positively geared — restructuring case
    if (situation === "positively_geared") {
      return {
        headline: "Positively geared investors can still use negative gearing strategically.",
        summary:
          "If your property is positively geared (rental income exceeds expenses), the tax benefits of negative gearing don't apply — but depreciation deductions may still reduce your net taxable position. Some investors restructure by refinancing to interest-only loans, accessing equity for a new (negatively geared) investment while keeping the existing cash-flow-positive property.",
        primaryCta: { label: "Find a Financial Adviser", href: "/find-advisor" },
        secondaryCta: { label: "Property Investment Guide", href: "/property" },
        advisorCta: { href: "/quiz?vertical=property", specialty: "property investment adviser" },
      };
    }

    // Default — general case with calculator CTA
    return {
      headline: "Negative gearing works best when the tax saving exceeds the cash shortfall.",
      summary:
        "The core test: does the annual tax saving (loss × marginal rate) come close to covering the monthly cash shortfall (mortgage – rent)? If you need to top up more than $800–$1,000 per month, the tax benefit rarely offsets the cash pressure. Run your numbers in the calculator, then speak to a tax accountant before committing.",
      primaryCta: { label: "Negative Gearing Calculator", href: "/negative-gearing/calculator" },
      secondaryCta: { label: "Find a Property Tax Accountant", href: "/quiz?vertical=tax" },
      advisorCta: { href: "/quiz?vertical=tax", specialty: "property tax accountant" },
    };
  },
};

export const SUPER_ONBOARDING_CONFIG: HubOnboardingConfig = {
  hubSlug: "super",
  hubName: "Superannuation",
  heading: "Is your super on track?",
  subheading: "3 quick questions to find your best super strategy for 2026.",
  questions: [
    {
      id: "stage",
      question: "Which best describes your current life stage?",
      options: [
        { value: "early", label: "Early career — under 35, building the habit" },
        { value: "mid", label: "Mid-career — 35–50, accumulating seriously" },
        { value: "pre_retire", label: "Pre-retirement — 50–60, transition planning" },
        { value: "retire", label: "At or near retirement — drawing down or planning to" },
      ],
    },
    {
      id: "balance",
      question: "What is your approximate super balance today?",
      options: [
        { value: "under_50k", label: "Under $50,000" },
        { value: "50k_200k", label: "$50,000 – $200,000" },
        { value: "200k_500k", label: "$200,000 – $500,000" },
        { value: "over_500k", label: "Over $500,000" },
      ],
    },
    {
      id: "concern",
      question: "What is your main super concern right now?",
      options: [
        { value: "fees", label: "I think I am paying too much in fees" },
        { value: "performance", label: "My fund's investment returns seem low" },
        { value: "contributions", label: "I want to make extra contributions and reduce tax" },
        { value: "consolidate", label: "I have multiple super funds and want to consolidate" },
      ],
    },
  ],

  evaluate(answers: QuizAnswers) {
    const stage = answers["stage"];
    const balance = answers["balance"];
    const concern = answers["concern"];

    if (stage === "retire" || stage === "pre_retire") {
      return {
        headline: "Transition to retirement planning is the highest-impact move you can make.",
        summary:
          "A Transition to Retirement (TTR) income stream lets you draw from super at a reduced tax rate while still working. At 60+, super drawdowns are completely tax-free in pension phase. The right time to start a TTR or account-based pension depends on your balance, income, and age pension eligibility — a super specialist can model both.",
        primaryCta: { label: "Find a Super Specialist", href: "/quiz?vertical=super" },
        secondaryCta: { label: "Super Contributions Guide", href: "/super/contributions" },
        advisorCta: { href: "/quiz?vertical=super", specialty: "super specialist" },
      };
    }

    if ((balance === "over_500k" || balance === "200k_500k") && concern === "fees") {
      return {
        headline: "At your balance, reducing fees by 0.5% adds $2,500–$5,000 per year to your retirement.",
        summary:
          "Australian Retirement Trust, Aware Super, and Hostplus charge 0.10–0.15% for members above $500k — well below the industry average of 0.85%. An SMSF also becomes cost-competitive above $250k if you are comfortable running it. Compare fund options using APRA's published fee data before switching.",
        primaryCta: { label: "Compare Super Funds", href: "/compare/super" },
        secondaryCta: { label: "SMSF vs Industry Fund", href: "/invest/smsf" },
        advisorCta: { href: "/quiz?vertical=super", specialty: "super adviser" },
      };
    }

    if (balance === "over_500k" || balance === "200k_500k") {
      return {
        headline: "Your balance is large enough to benefit from personalised super advice.",
        summary:
          "Above $200k, the difference between a 0.3% and 0.8% fee fund is $1,000–$4,000 per year in compounding lost. Investment-option switching (e.g., balanced → high growth) can add significant long-term returns if your timeline allows. A super specialist can run a full fee + performance comparison across top funds.",
        primaryCta: { label: "Find a Super Specialist", href: "/quiz?vertical=super" },
        secondaryCta: { label: "Compare Super Funds", href: "/compare/super" },
        advisorCta: { href: "/quiz?vertical=super", specialty: "super adviser" },
      };
    }

    if (concern === "contributions") {
      return {
        headline: "Extra contributions at your marginal rate are the most tax-efficient savings vehicle in Australia.",
        summary:
          "The concessional (pre-tax) contributions cap is $30,000 per year from 2024–25, taxed at 15% inside super. If your marginal rate is 32.5–45%, that is a 17.5–30% instant tax saving per dollar contributed. Salary sacrifice through your employer is the simplest mechanism — no out-of-pocket cash required.",
        primaryCta: { label: "Super Contributions Guide", href: "/super/contributions" },
        secondaryCta: { label: "Super Contributions Calculator", href: "/super-contributions-calculator" },
        advisorCta: { href: "/quiz?vertical=super", specialty: "super specialist" },
      };
    }

    if (concern === "consolidate") {
      return {
        headline: "Consolidating multiple super accounts eliminates duplicate fees immediately.",
        summary:
          "Each super account charges a fixed annual administration fee ($50–$120) plus a percentage fee. Two accounts on a $150k balance could cost $400–$700 extra per year for no benefit. Use myGov to find lost or inactive accounts, then roll them into your chosen fund — the process takes under 10 minutes online.",
        primaryCta: { label: "Super Consolidation Guide", href: "/super/consolidation" },
        secondaryCta: { label: "Compare Super Funds", href: "/compare/super" },
        advisorCta: { href: "/quiz?vertical=super", specialty: "super specialist" },
      };
    }

    return {
      headline: "The best super move for most Australians is choosing a lower-fee fund.",
      summary:
        "The difference between a 0.5% and 1.3% fee fund on a $100k balance is $800 per year — $40,000+ over a career. Performance follows fees over long periods: low-cost indexed options in top-tier funds (AustralianSuper, Hostplus, UniSuper) have outperformed most active alternatives over 10 years. Your employer must pay into any registered fund you nominate.",
      primaryCta: { label: "Compare Super Funds", href: "/compare/super" },
      secondaryCta: { label: "Super Contributions Calculator", href: "/super-contributions-calculator" },
      advisorCta: { href: "/quiz?vertical=super", specialty: "super specialist" },
    };
  },
};

export const CRYPTO_ONBOARDING_CONFIG: HubOnboardingConfig = {
  hubSlug: "crypto",
  hubName: "Cryptocurrency",
  heading: "How should you approach crypto investing?",
  subheading: "3 quick questions to find the right crypto strategy for your risk profile.",
  questions: [
    {
      id: "experience",
      question: "How experienced are you with cryptocurrency?",
      options: [
        { value: "new", label: "Complete beginner — never bought crypto before" },
        { value: "some", label: "Some experience — I have held Bitcoin or Ethereum" },
        { value: "active", label: "Active investor — I track markets and manage a portfolio" },
        { value: "advanced", label: "Advanced — I use DeFi, staking, or derivatives" },
      ],
    },
    {
      id: "goal",
      question: "What is your primary goal with crypto?",
      options: [
        { value: "diversify", label: "Diversify — add a small allocation to a share portfolio" },
        { value: "growth", label: "Long-term growth — hold Bitcoin or Ethereum for years" },
        { value: "income", label: "Generate yield — staking, lending, or interest accounts" },
        { value: "speculate", label: "Speculate — higher-risk altcoins for potential large gains" },
      ],
    },
    {
      id: "allocation",
      question: "What percentage of your total investable assets would you put into crypto?",
      options: [
        { value: "under_5", label: "Under 5% — small satellite position" },
        { value: "5_15", label: "5–15% — meaningful but contained" },
        { value: "15_30", label: "15–30% — significant allocation" },
        { value: "over_30", label: "Over 30% — majority of portfolio" },
      ],
    },
  ],

  evaluate(answers: QuizAnswers) {
    const experience = answers["experience"];
    const goal = answers["goal"];
    const allocation = answers["allocation"];

    // Complete beginner — start simple
    if (experience === "new") {
      return {
        headline: "Start with Bitcoin or Ethereum on a regulated Australian exchange.",
        summary:
          "For first-time crypto investors, the safest entry point is a regulated Australian exchange (Coinbase, Swyftx, or CoinSpot). Buy Bitcoin or Ethereum — they are the most liquid, most researched, and least likely to go to zero of any digital asset. Keep your first purchase to under 5% of investable assets. Never invest more than you can afford to lose entirely.",
        primaryCta: { label: "Compare Crypto Exchanges", href: "/crypto" },
        secondaryCta: { label: "Crypto Beginner Guide", href: "/crypto" },
        advisorCta: { href: "/quiz", specialty: "financial adviser" },
      };
    }

    // High allocation warning
    if (allocation === "over_30") {
      return {
        headline: "A 30%+ crypto allocation carries extreme concentration risk.",
        summary:
          "Bitcoin has fallen 80%+ from peak in three separate cycles (2014, 2018, 2022). A 40% crypto position could drop your total portfolio by 32%+ in a bear market. Most regulated financial advisers cap crypto at 5–10% for retail clients. If you proceed, consider dollar-cost averaging (weekly/monthly buys) rather than a lump sum, and use a hardware wallet for self-custody.",
        primaryCta: { label: "Crypto Risk Guide", href: "/crypto" },
        secondaryCta: { label: "Compare Exchanges", href: "/crypto" },
        advisorCta: { href: "/quiz", specialty: "financial adviser" },
      };
    }

    // Income / yield goal
    if (goal === "income") {
      return {
        headline: "Crypto yield strategies carry significant smart-contract and counterparty risk.",
        summary:
          "Staking on Ethereum (3–4% APY), ADA, or Solana is relatively low-risk — you are securing the network and earning native rewards. Centralised lending platforms (like the collapsed Celsius) are higher risk. DeFi lending (Aave, Compound) exposes you to smart-contract exploits. For Australian tax, staking rewards are income at receipt and CGT on disposal.",
        primaryCta: { label: "Crypto Tax Guide", href: "/crypto" },
        secondaryCta: { label: "Compare Exchanges", href: "/crypto" },
        advisorCta: { href: "/quiz", specialty: "crypto tax adviser" },
      };
    }

    // Advanced / DeFi user
    if (experience === "advanced") {
      return {
        headline: "Advanced crypto users need tax records from day one.",
        summary:
          "Every DeFi interaction (swap, LP deposit, staking reward) is a taxable event in Australia. CoinTracker, Koinly, or CryptoTaxCalculator can ingest your on-chain history via wallet address. Keep records of cost bases for all positions — the ATO now receives data directly from Australian exchanges under the mandatory data-sharing regime.",
        primaryCta: { label: "Crypto Tax Guide", href: "/crypto" },
        secondaryCta: { label: "Compare Exchanges", href: "/crypto" },
        advisorCta: { href: "/quiz", specialty: "crypto tax adviser" },
      };
    }

    // Diversification goal — sensible approach
    if (goal === "diversify") {
      return {
        headline: "A 5–10% crypto satellite allocation is the consensus institutional approach.",
        summary:
          "Research by Fidelity, BlackRock, and MSCI suggests 1–5% Bitcoin in a diversified portfolio improves risk-adjusted returns over a 10-year horizon due to low correlation with equities (especially pre-ETF era). Rebalance annually — crypto's volatility means it will drift quickly from a target allocation. Australian crypto ETFs (e.g., VanEck Bitcoin ETF) on ASX remove self-custody risk.",
        primaryCta: { label: "Compare Crypto Exchanges", href: "/crypto" },
        secondaryCta: { label: "Crypto on ASX (ETFs)", href: "/crypto" },
        advisorCta: { href: "/quiz", specialty: "financial adviser" },
      };
    }

    // Default: long-term growth
    return {
      headline: "Long-term Bitcoin and Ethereum holding has outperformed most asset classes over a decade.",
      summary:
        "A dollar-cost averaging strategy (e.g., $200/week into Bitcoin) removes the timing risk of lump-sum buying. Hold on a regulated Australian exchange for amounts under $50k; consider a hardware wallet (Ledger, Trezor) for self-custody above that. Australian tax: CGT discount applies after 12 months — do not sell before then unless you need the liquidity.",
      primaryCta: { label: "Compare Crypto Exchanges", href: "/crypto" },
      secondaryCta: { label: "Crypto Tax Guide", href: "/crypto" },
      advisorCta: { href: "/quiz", specialty: "financial adviser" },
    };
  },
};

// OB-09 — lump-sum investing diagnostic quiz
export const LUMP_SUM_ONBOARDING_CONFIG: HubOnboardingConfig = {
  hubSlug: "lump-sum-investing",
  hubName: "Lump-Sum Investing",
  heading: "What should you do with your lump sum?",
  subheading: "3 questions to get a personalised next-step plan for your windfall.",
  questions: [
    {
      id: "source",
      question: "Where is your lump sum coming from?",
      options: [
        { value: "redundancy", label: "Redundancy or retrenchment payout" },
        { value: "inheritance", label: "Inheritance or estate distribution" },
        { value: "property_sale", label: "Property sale proceeds" },
        { value: "other_windfall", label: "Business sale, bonus, or other windfall" },
      ],
    },
    {
      id: "amount",
      question: "How large is the lump sum approximately?",
      options: [
        { value: "under_100k", label: "Under $100,000" },
        { value: "100k_250k", label: "$100,000 – $250,000" },
        { value: "250k_500k", label: "$250,000 – $500,000" },
        { value: "over_500k", label: "Over $500,000" },
      ],
    },
    {
      id: "timeline",
      question: "When do you need to access this money?",
      options: [
        { value: "under_3yr", label: "Within the next 3 years" },
        { value: "3_5yr", label: "3 to 5 years from now" },
        { value: "5_10yr", label: "5 to 10 years from now" },
        { value: "over_10yr", label: "More than 10 years away" },
      ],
    },
  ],

  evaluate(answers: QuizAnswers) {
    const source = answers["source"];
    const amount = answers["amount"];
    const timeline = answers["timeline"];

    if (source === "redundancy") {
      return {
        headline: "Your redundancy payout has special tax rules — act before 30 June.",
        summary:
          "Genuine redundancy payments receive a tax-free component ($12,524 base + $6,264 per year of service in 2025–26). The taxable component qualifies as an ETP taxed at 32% (or 17% if above preservation age). You may have a 12-month window to make a concessional super contribution using the carry-forward rule if your TSB is under $500k — worth discussing with a tax agent before the financial year ends.",
        primaryCta: { label: "Redundancy Guide", href: "/lump-sum-investing/redundancy" },
        secondaryCta: { label: "Find a Tax Agent", href: "/advisors/tax-agents" },
        advisorCta: { href: "/quiz?vertical=tax", specialty: "tax agent" },
      };
    }

    if (source === "inheritance") {
      return {
        headline: "Inheritance in Australia is tax-free — but the 90-day rule matters.",
        summary:
          "Australia has no inheritance tax. However, if you inherit super assets you must roll them into your own super or cash out within 3–6 months (the 'death benefit' rule). Inherited property sold within a trust carries embedded CGT. If the estate includes a family home, CGT principal-residence exemption can be claimed if you sell within 2 years of death.",
        primaryCta: { label: "Inheritance Tax Guide", href: "/lump-sum-investing/inheritance" },
        secondaryCta: { label: "Find a Financial Planner", href: "/advisors/financial-planners" },
        advisorCta: { href: "/quiz?vertical=estate_planning", specialty: "estate planning adviser" },
      };
    }

    if (source === "property_sale") {
      return {
        headline: "Property sale proceeds: the lump-sum calculator will model your options.",
        summary:
          "After settlement, the first step is to park proceeds in a high-interest savings account while you plan. If the property was your principal residence, the CGT exemption applies. If it was investment property, CGT is due — the 50% discount applies if held over 12 months. From there, the options include paying down debt, investing in shares or super, or buying another property.",
        primaryCta: { label: "Lump-Sum Calculator", href: "/lump-sum-investing/calculator" },
        secondaryCta: { label: "Compare Savings Accounts", href: "/savings" },
        advisorCta: { href: "/quiz?vertical=investment", specialty: "financial planner" },
      };
    }

    if (amount === "over_500k" || amount === "250k_500k") {
      return {
        headline: "A lump sum this size benefits from a structured investment plan.",
        summary:
          "Above $250k, the sequence matters: (1) clear high-interest debt; (2) top up super if concessional room exists; (3) build a 6-month emergency buffer in a high-interest account; (4) invest the remainder in a diversified portfolio. Dollar-cost averaging over 6–12 months reduces timing risk on the investing tranche. At this level, a one-off financial plan ($3,000–$6,000) typically pays for itself within 2 years.",
        primaryCta: { label: "Find a Financial Planner", href: "/advisors/financial-planners" },
        secondaryCta: { label: "Lump-Sum Calculator", href: "/lump-sum-investing/calculator" },
        advisorCta: { href: "/quiz?vertical=investment", specialty: "financial planner" },
      };
    }

    if (timeline === "under_3yr") {
      return {
        headline: "With a short horizon, capital preservation comes first.",
        summary:
          "For money needed within 3 years, a high-interest savings account or term deposit is the right vehicle — not the share market. A market correction (which happens every 3–5 years on average) could leave you unable to access the full amount when you need it. Compare savings accounts and term deposits to find the highest rate.",
        primaryCta: { label: "Compare Savings Accounts", href: "/savings" },
        secondaryCta: { label: "Compare Term Deposits", href: "/term-deposits" },
        advisorCta: { href: "/quiz?vertical=savings", specialty: "financial adviser" },
      };
    }

    return {
      headline: "The right sequence turns a windfall into lasting wealth.",
      summary:
        "Use the lump-sum calculator to model different scenarios — debt paydown vs. super contribution vs. investing — over your investment horizon. The general rule: clear high-rate debt first, build a 3-month buffer, then invest the rest in a low-cost diversified portfolio matched to your timeline.",
      primaryCta: { label: "Lump-Sum Calculator", href: "/lump-sum-investing/calculator" },
      secondaryCta: { label: "Find a Financial Planner", href: "/advisors/financial-planners" },
      advisorCta: { href: "/quiz?vertical=investment", specialty: "financial planner" },
    };
  },
};

// OB-10 — foreign investment / overseas investor diagnostic quiz
export const FOREIGN_INVESTMENT_ONBOARDING_CONFIG: HubOnboardingConfig = {
  hubSlug: "foreign-investment",
  hubName: "Investing from Overseas",
  heading: "What type of overseas investor are you?",
  subheading: "3 questions to get guidance tailored to your residency and investment goal.",
  questions: [
    {
      id: "status",
      question: "Which best describes your situation?",
      options: [
        { value: "non_resident", label: "Non-resident — living and earning overseas" },
        { value: "expat_abroad", label: "Australian expat currently living abroad" },
        { value: "new_migrant", label: "New migrant — recently arrived in Australia" },
        { value: "visa_holder", label: "Visa holder — living in Australia temporarily" },
      ],
    },
    {
      id: "focus",
      question: "What do you most want to invest in?",
      options: [
        { value: "property", label: "Property in Australia" },
        { value: "shares", label: "Shares or ETFs on the ASX" },
        { value: "super", label: "Superannuation or DASP" },
        { value: "savings", label: "Savings accounts or term deposits" },
      ],
    },
    {
      id: "concern",
      question: "What is your biggest concern?",
      options: [
        { value: "firb", label: "FIRB approval and foreign ownership rules" },
        { value: "tax", label: "Withholding tax and double-tax treaties" },
        { value: "banking", label: "Opening an Australian bank account" },
        { value: "repatriation", label: "Getting money back to my home country" },
      ],
    },
  ],

  evaluate(answers: QuizAnswers) {
    const status = answers["status"];
    const focus = answers["focus"];
    const concern = answers["concern"];

    if (focus === "property") {
      return {
        headline: "Foreign buyers need FIRB approval before purchasing Australian residential property.",
        summary:
          "Foreign nationals (including temporary visa holders) generally must apply to the Foreign Investment Review Board (FIRB) before buying established residential property. FIRB fees range from $14,100 (under $1M) to $1.04M (over $40M). New dwellings have a simpler approval pathway. The 2024–25 ban on purchasing established dwellings (except for off-the-plan) is in effect — verify current rules before proceeding.",
        primaryCta: { label: "FIRB Application Guide", href: "/foreign-investment/guides/firb-application-guide" },
        secondaryCta: { label: "Property for Foreigners", href: "/foreign-investment/guides/buy-property-australia-foreigner" },
        advisorCta: { href: "/quiz?vertical=property", specialty: "property adviser" },
      };
    }

    if (status === "expat_abroad" && focus === "super") {
      return {
        headline: "As an Australian expat, your super is still growing — DASP applies only when you leave permanently.",
        summary:
          "Australian expats retain their super while living abroad; the fund continues to grow. DASP (Departing Australia Superannuation Payment) applies to temporary visa holders leaving Australia permanently — not Australian citizens or permanent residents. If you hold a temporary visa and are leaving for good, you can claim DASP after your visa expires. Tax on DASP is 35–65% depending on the component.",
        primaryCta: { label: "Expat Super Guide", href: "/foreign-investment/super" },
        secondaryCta: { label: "Compare Super Funds", href: "/super" },
        advisorCta: { href: "/quiz?vertical=super", specialty: "expat financial adviser" },
      };
    }

    if (concern === "tax" || focus === "shares") {
      return {
        headline: "Non-residents pay withholding tax on Australian dividends — but treaties reduce the rate.",
        summary:
          "Non-resident shareholders pay 30% withholding tax on unfranked dividends; this drops to 15% for residents of DTA countries (e.g. USA, UK, NZ, Singapore). Fully franked dividends generally have no withholding tax. Capital gains from ASX shares are generally not taxable in Australia for non-residents unless the shares are in a land-rich company. Check the ATO's DTA table for your country.",
        primaryCta: { label: "Withholding Tax Guide", href: "/foreign-investment" },
        secondaryCta: { label: "Compare Brokers for Non-Residents", href: "/compare/non-residents" },
        advisorCta: { href: "/quiz?vertical=tax", specialty: "international tax adviser" },
      };
    }

    if (status === "new_migrant" || concern === "banking") {
      return {
        headline: "As a new arrival, start with a bank account and TFN — everything else follows.",
        summary:
          "New migrants can open an Australian bank account online before arriving (CBA, ANZ, NAB, Westpac all offer migrant accounts). Apply for a Tax File Number (TFN) through myGov once you have your visa. Without a TFN, banks withhold 47% from interest earned. From there, superannuation enrolment and CHESS-sponsored share trading are straightforward.",
        primaryCta: { label: "Non-Resident Bank Account Guide", href: "/foreign-investment/guides/non-resident-bank-account" },
        secondaryCta: { label: "Foreign Investment Hub", href: "/foreign-investment" },
        advisorCta: { href: "/quiz?vertical=investment", specialty: "financial adviser" },
      };
    }

    return {
      headline: "The rules vary significantly by visa type and asset class.",
      summary:
        "Australian investment rules for overseas investors depend on your visa, residency status, and what you want to invest in. The foreign investment hub has dedicated guides for property (FIRB), shares (withholding tax + DTA), super (DASP), and banking — with per-country breakdowns for 20+ nationalities.",
      primaryCta: { label: "Foreign Investment Hub", href: "/foreign-investment" },
      secondaryCta: { label: "Find an International Adviser", href: "/quiz?vertical=investment" },
      advisorCta: { href: "/quiz?vertical=investment", specialty: "international financial adviser" },
    };
  },
};

// OB-11 — sell-business diagnostic quiz
export const SELL_BUSINESS_ONBOARDING_CONFIG: HubOnboardingConfig = {
  hubSlug: "sell-business",
  hubName: "Selling a Business",
  heading: "Where are you in your business exit journey?",
  subheading: "3 questions to get a personalised exit-planning next step.",
  questions: [
    {
      id: "revenue",
      question: "What is your business's approximate annual revenue?",
      options: [
        { value: "under_1m", label: "Under $1 million" },
        { value: "1m_5m", label: "$1 million – $5 million" },
        { value: "5m_20m", label: "$5 million – $20 million" },
        { value: "over_20m", label: "Over $20 million" },
      ],
    },
    {
      id: "timeline",
      question: "When do you want to complete the sale?",
      options: [
        { value: "within_12m", label: "Within the next 12 months" },
        { value: "1_3yr", label: "1 to 3 years from now" },
        { value: "3_5yr", label: "3 to 5 years from now" },
        { value: "just_exploring", label: "Just exploring my options" },
      ],
    },
    {
      id: "priority",
      question: "What matters most in your exit?",
      options: [
        { value: "max_price", label: "Maximising the sale price" },
        { value: "tax_minimise", label: "Minimising CGT and tax" },
        { value: "fast_sale", label: "A fast, low-friction sale" },
        { value: "legacy", label: "Keeping the business in the right hands" },
      ],
    },
  ],

  evaluate(answers: QuizAnswers) {
    const revenue = answers["revenue"];
    const timeline = answers["timeline"];
    const priority = answers["priority"];

    if (timeline === "within_12m") {
      return {
        headline: "A 12-month sale is achievable — but preparation is everything.",
        summary:
          "A rushed sale typically fetches 20–30% less than a prepared one. In 12 months you can: get a formal valuation, clean up financials (3 years of clean P&L is standard buyer due diligence), draft an information memorandum, and run a structured auction. A business broker with a live buyer database gets deals done faster than off-market approaches.",
        primaryCta: { label: "Find a Business Broker", href: "/sell-business" },
        secondaryCta: { label: "Business Sale Checklist", href: "/sell-business/checklist" },
        advisorCta: { href: "/quiz?vertical=business_sale", specialty: "business broker" },
      };
    }

    if (priority === "tax_minimise") {
      return {
        headline: "Small business CGT concessions can reduce your tax liability to near-zero.",
        summary:
          "The four small-business CGT concessions can eliminate or dramatically reduce CGT on the sale of an active business: 15-year exemption (fully tax-free if held 15+ years), 50% active-asset reduction, retirement exemption ($500k lifetime), and rollover. Accessing them requires meeting the basic conditions: active asset test, turnover under $2M or net assets under $6M. A tax agent specialising in business sales is essential.",
        primaryCta: { label: "CGT Concessions Guide", href: "/sell-business" },
        secondaryCta: { label: "Find a Tax Agent", href: "/advisors/tax-agents" },
        advisorCta: { href: "/quiz?vertical=business_sale", specialty: "business sale tax specialist" },
      };
    }

    if (revenue === "over_20m" || revenue === "5m_20m") {
      return {
        headline: "A business of this size warrants a formal M&A process — not a trade-sale listing.",
        summary:
          "For businesses over $5M revenue, a structured M&A process (strategic buyer targeting, management presentations, data room, competitive bidding) typically yields 20–40% more than a direct listing. Engage an M&A adviser or corporate finance specialist 18–24 months before your target exit date to maximise value and manage the process.",
        primaryCta: { label: "Find an M&A Adviser", href: "/sell-business" },
        secondaryCta: { label: "Business Valuation Guide", href: "/sell-business/valuation" },
        advisorCta: { href: "/quiz?vertical=business_sale", specialty: "M&A adviser" },
      };
    }

    if (priority === "legacy") {
      return {
        headline: "A trade sale to the right buyer can preserve your legacy — but takes longer.",
        summary:
          "Legacy exits — selling to a management buyout (MBO), an employee ownership trust (EOT), or a strategic partner who values culture — typically involve a lower headline price but more certainty on fit. EOTs receive favourable CGT treatment from the ATO. MBOs require vendor finance or PE backing. Allow 2–3 years to identify and structure the right deal.",
        primaryCta: { label: "Business Sale Guide", href: "/sell-business" },
        secondaryCta: { label: "Find a Business Broker", href: "/sell-business" },
        advisorCta: { href: "/quiz?vertical=business_sale", specialty: "business sale adviser" },
      };
    }

    return {
      headline: "Get a business valuation first — it anchors every decision that follows.",
      summary:
        "A formal valuation (multiple of EBITDA, typically 2–5× for SMEs) tells you what the business is worth today, what levers increase it, and what price you need to retire comfortably. Most reputable brokers offer a free indication; a formal valuation ($3,000–$10,000) is worth it for businesses over $1M.",
      primaryCta: { label: "Business Valuation Guide", href: "/sell-business/valuation" },
      secondaryCta: { label: "Find a Business Broker", href: "/sell-business" },
      advisorCta: { href: "/quiz?vertical=business_sale", specialty: "business broker" },
    };
  },
};

// OB-12 — halal investing diagnostic quiz
export const HALAL_INVESTING_ONBOARDING_CONFIG: HubOnboardingConfig = {
  hubSlug: "halal-investing",
  hubName: "Halal Investing",
  heading: "Which Sharia-compliant investment pathway fits you?",
  subheading: "3 questions to find the right halal investment approach for your situation.",
  questions: [
    {
      id: "focus",
      question: "What is your primary investment focus?",
      options: [
        { value: "super", label: "Superannuation — I want a Sharia-compliant fund" },
        { value: "home_finance", label: "Home finance — I want an Islamic mortgage" },
        { value: "shares", label: "Shares or ETFs — I want to invest in the market" },
        { value: "unsure", label: "Not sure — I want a general overview" },
      ],
    },
    {
      id: "experience",
      question: "How familiar are you with halal investing principles?",
      options: [
        { value: "new", label: "New to halal investing — just starting out" },
        { value: "some", label: "I understand the basics (riba, gharar, prohibited sectors)" },
        { value: "experienced", label: "Experienced — I self-screen stocks or use AAOIFI criteria" },
      ],
    },
    {
      id: "amount",
      question: "How much are you looking to invest initially?",
      options: [
        { value: "under_10k", label: "Under $10,000" },
        { value: "10k_50k", label: "$10,000 – $50,000" },
        { value: "50k_250k", label: "$50,000 – $250,000" },
        { value: "over_250k", label: "Over $250,000" },
      ],
    },
  ],

  evaluate(answers: QuizAnswers) {
    const focus = answers["focus"];
    const experience = answers["experience"];
    const amount = answers["amount"];

    if (focus === "super") {
      return {
        headline: "Crescent Wealth is Australia's only AAOIFI-certified Sharia-compliant super fund.",
        summary:
          "Crescent Wealth Superannuation Fund is certified by AAOIFI (Accounting and Auditing Organisation for Islamic Financial Institutions) and screened by a Sharia supervisory board. Funds are invested in AAOIFI-screened equities, Sukuk (Islamic bonds), and real assets — no interest-bearing instruments, tobacco, alcohol, weapons, or pornography. Compare it against your current fund's performance and fees before switching.",
        primaryCta: { label: "Compare Super Funds", href: "/super" },
        secondaryCta: { label: "Halal Investing Guide", href: "/halal-investing" },
        advisorCta: { href: "/quiz?vertical=super", specialty: "Islamic finance adviser" },
      };
    }

    if (focus === "home_finance") {
      return {
        headline: "Islamic home finance uses a diminishing musharakah structure — no interest charged.",
        summary:
          "Australian Islamic home finance providers (MCCA, Hejaz Financial Services, Islamic Co-operative Finance Australia) use diminishing musharakah: the lender and borrower co-own the property; the borrower makes monthly payments to buy out the lender's share. No riba (interest) is charged. Rates are comparable to conventional mortgages — compare carefully as the ATO treats rental/profit payments differently.",
        primaryCta: { label: "Halal Home Finance Guide", href: "/halal-investing" },
        secondaryCta: { label: "Find a Finance Adviser", href: "/advisors" },
        advisorCta: { href: "/quiz?vertical=mortgage", specialty: "Islamic finance broker" },
      };
    }

    if (focus === "shares" && experience === "experienced") {
      return {
        headline: "AAOIFI screening criteria: debt ratio under 33%, receivables ratio under 33%.",
        summary:
          "For self-directed halal stock screening on the ASX: use AAOIFI financial ratios — debt-to-market-cap under 33%, receivables under 33%, interest income under 5% of revenue. Exclude tobacco, alcohol, pork, weapons, entertainment, conventional banking/insurance. International ETFs: SPDR S&P 500 ESG, iShares MSCI World Islamic, and Wahed ETF (US-listed) apply AAOIFI screening. Purification: any haram-income percentage must be donated to charity.",
        primaryCta: { label: "Halal Investing Guide", href: "/halal-investing" },
        secondaryCta: { label: "Compare ETFs", href: "/etfs" },
        advisorCta: { href: "/quiz?vertical=investment", specialty: "Islamic finance adviser" },
      };
    }

    if (focus === "shares" && experience !== "experienced") {
      return {
        headline: "A Sharia-screened ETF is the simplest halal entry point for new investors.",
        summary:
          "Rather than self-screening individual stocks (which requires understanding AAOIFI financial ratios), a Sharia-screened ETF delegates the screening. Options available to Australian investors: iShares MSCI World Islamic ETF (ISWD — London-listed, requires international broker), Wahed FTSE USA Shariah ETF (US-listed), and Saturna Amana funds. Locally, some managed accounts on Elbaite or Superhero apply Islamic screens.",
        primaryCta: { label: "Compare ETFs", href: "/etfs" },
        secondaryCta: { label: "Halal Investing Guide", href: "/halal-investing" },
        advisorCta: { href: "/quiz?vertical=investment", specialty: "Islamic finance adviser" },
      };
    }

    if (amount === "over_250k") {
      return {
        headline: "Above $250k, a bespoke Sharia-compliant portfolio is worth considering.",
        summary:
          "At this level, a Sharia-supervised managed account or direct portfolio service can be tailored to your risk profile and zakat calculation needs. Some advisers specialising in Islamic finance (including those affiliated with ISRA and IFSB) offer discretionary portfolio management with annual Sharia supervisory board sign-off. Compare against ETF-based approaches on total cost.",
        primaryCta: { label: "Find an Islamic Finance Adviser", href: "/advisors" },
        secondaryCta: { label: "Halal Investing Guide", href: "/halal-investing" },
        advisorCta: { href: "/quiz?vertical=investment", specialty: "Islamic finance adviser" },
      };
    }

    return {
      headline: "The halal investing hub covers super, home finance, and shares in one place.",
      summary:
        "Halal investing in Australia has grown significantly — there are now Sharia-compliant options across superannuation (Crescent Wealth), home finance (MCCA, Hejaz), and shares (AAOIFI-screened ETFs via international brokers). The hub breaks down each pathway with independent comparisons and no sales incentives.",
      primaryCta: { label: "Halal Investing Guide", href: "/halal-investing" },
      secondaryCta: { label: "Find an Islamic Finance Adviser", href: "/advisors" },
      advisorCta: { href: "/quiz?vertical=investment", specialty: "Islamic finance adviser" },
    };
  },
};

export const FIRST_HOME_BUYER_ONBOARDING_CONFIG: HubOnboardingConfig = {
  hubSlug: "first-home-buyer",
  hubName: "First Home Buyer",
  heading: "Which first-home-buyer schemes are you eligible for?",
  subheading:
    "3 questions to map your income, state, and deposit status to FHSS, the First Home Guarantee, and state grants.",
  questions: [
    {
      id: "income",
      question: "What is your annual taxable income?",
      options: [
        { value: "under_60k", label: "Under $60,000" },
        { value: "60k_125k", label: "$60,000 – $125,000" },
        { value: "125k_200k", label: "$125,000 – $200,000 (couple)" },
        { value: "over_200k", label: "Over $200,000" },
      ],
    },
    {
      id: "state",
      question: "Which state or territory are you buying in?",
      options: [
        { value: "nsw", label: "New South Wales" },
        { value: "vic", label: "Victoria" },
        { value: "qld", label: "Queensland" },
        { value: "wa", label: "Western Australia" },
        { value: "sa", label: "South Australia" },
        { value: "tas", label: "Tasmania" },
        { value: "act", label: "ACT" },
        { value: "nt", label: "Northern Territory" },
      ],
    },
    {
      id: "deposit",
      question: "Where are you in your deposit journey?",
      options: [
        { value: "not_started", label: "Haven't started saving yet" },
        { value: "saving_outside_super", label: "Saving outside super" },
        { value: "using_fhss", label: "Already using FHSS" },
        { value: "ready_to_buy", label: "Deposit is ready — actively looking" },
      ],
    },
  ],

  evaluate(answers: QuizAnswers) {
    const income = answers["income"];
    const state = answers["state"];
    const deposit = answers["deposit"];

    // Per-state FHOG / stamp-duty snapshot. Amounts are conservative current
    // figures; the deep-dive pages own the precise eligibility tables.
    const stateNote: Record<string, string> = {
      nsw: "NSW: full stamp-duty exemption under $800,000, scaled concession to $1m; FHOG $10,000 for new homes under $600k (construction) or $750k (land + build).",
      vic: "VIC: full stamp-duty exemption under $600,000, scaled to $750,000; FHOG $10,000 for new builds outside Melbourne, $20,000 in regional VIC.",
      qld: "QLD: First Home Owner Grant lifted to $30,000 for new builds; stamp-duty concession to $700,000 for established homes or $350,000 land.",
      wa: "WA: FHOG $10,000 for new homes; stamp-duty exemption for new homes under $430,000 and existing under $430,000.",
      sa: "SA: FHOG $15,000 for new homes; no property value cap on the grant; stamp-duty relief was abolished for first home buyers in 2024 — verify with RevenueSA.",
      tas: "TAS: FHOG $30,000 for new builds (Tasmania's grant is the highest in the country alongside QLD); 50% stamp-duty discount on established homes under $750,000.",
      act: "ACT: no FHOG (replaced by the Home Buyer Concession Scheme which scales stamp duty by income up to $250k/yr).",
      nt: "NT: FHOG $10,000 for new homes; BuildBonus and HomeGrown Territory grants stack on top.",
    };

    const stateLine = state ? stateNote[state] : null;

    // Income over $200k disqualifies from First Home Guarantee (single cap
    // $125k, couple cap $200k) and most state-grant income tests. FHSS
    // individual cap ($50k) still applies and is more tax-efficient at the
    // top marginal rate.
    if (income === "over_200k") {
      return {
        headline:
          "Above the First Home Guarantee cap — but FHSS still gives you the biggest tax saving.",
        summary: [
          "Your income exceeds the First Home Guarantee thresholds ($125k single / $200k couple), so the 5% deposit + no-LMI guarantee is unavailable. FHSS remains worth using: at the 45% marginal bracket, the 15% concessional contributions tax saves up to 30 cents on every dollar contributed (capped $15,000/year, $50,000 total per person — a couple can release $100,000 combined).",
          stateLine,
          "Mortgage brokers who specialise in high-income first home buyers can structure interest-only periods, offset accounts, and lender-paid LMI to optimise the deposit gap.",
        ]
          .filter(Boolean)
          .join(" "),
        primaryCta: { label: "Calculate Your FHSS Saving", href: "/tools/fhss-calculator" },
        secondaryCta: { label: "Find a Mortgage Broker", href: "/find/mortgage-broker" },
        advisorCta: { href: "/quiz?vertical=mortgage", specialty: "first home buyer mortgage broker" },
      };
    }

    // Couple-band income: eligible for the FHG at the $200k couple cap.
    if (income === "125k_200k") {
      return {
        headline:
          "You're in the First Home Guarantee couple band — 5% deposit with no LMI.",
        summary: [
          "At a combined income up to $200,000 you qualify for the First Home Guarantee as a couple: buy with a 5% deposit and the government guarantees up to 15% of the price so you avoid Lender's Mortgage Insurance. 35,000 places per year — book one through a participating lender.",
          "Stack with FHSS (up to $50,000 each, $100,000 combined release) for the deposit, and check your state's grant + stamp-duty concessions.",
          stateLine,
        ]
          .filter(Boolean)
          .join(" "),
        primaryCta: { label: "Find an FHB Mortgage Broker", href: "/find/mortgage-broker" },
        secondaryCta: { label: "FHSS Calculator", href: "/tools/fhss-calculator" },
        advisorCta: { href: "/quiz?vertical=mortgage", specialty: "first home buyer mortgage broker" },
      };
    }

    // Under-60k income: FHSS tax saving is small, but FHG + state grants
    // are the main lever. Push hardest on the grant + deposit-bond track.
    if (income === "under_60k") {
      return {
        headline:
          "First Home Guarantee + state grants are your fastest route — FHSS tax saving is small at this bracket.",
        summary: [
          "Below ~$45,000 of taxable income your marginal rate is 19%, so the FHSS 15% concessional tax saves only a few cents on the dollar. The 5%-deposit First Home Guarantee and your state's grant matter more — they can shrink your required cash deposit to a few percent of the purchase price.",
          stateLine,
          "If you're early in the savings phase, a high-interest savings account or term deposit beats FHSS at this income; once you cross into the 32.5% marginal bracket, FHSS becomes the better option.",
        ]
          .filter(Boolean)
          .join(" "),
        primaryCta: { label: "Compare Savings Accounts", href: "/savings" },
        secondaryCta: { label: "Find a Mortgage Broker", href: "/find/mortgage-broker" },
        advisorCta: { href: "/quiz?vertical=mortgage", specialty: "first home buyer mortgage broker" },
      };
    }

    // $60k-$125k income — the bull's-eye for every FHB scheme.
    if (deposit === "ready_to_buy") {
      return {
        headline:
          "You're FHB-scheme eligible and deposit-ready — go straight to a specialist broker.",
        summary: [
          "On a $60k–$125k income you qualify for the First Home Guarantee (5% deposit, no LMI) as a single. State grants and stamp-duty concessions also apply.",
          stateLine,
          "Because your deposit is ready, the next decision is lender selection — a first-home-buyer-specialist mortgage broker compares 30+ lenders for FHG-participating products and FHSS-aware settlements (FHSS release takes 20+ business days, so settlement timing matters).",
        ]
          .filter(Boolean)
          .join(" "),
        primaryCta: { label: "Find an FHB Mortgage Broker", href: "/find/mortgage-broker" },
        secondaryCta: { label: "FHB Hub", href: "/first-home-buyer" },
        advisorCta: { href: "/quiz?vertical=mortgage", specialty: "first home buyer mortgage broker" },
      };
    }

    if (deposit === "using_fhss") {
      return {
        headline:
          "You're already on the most tax-efficient deposit path — focus on lender selection next.",
        summary: [
          "FHSS contributions at the 32.5% marginal bracket save ~17.5 cents per dollar via the 15% concessional tax. You can keep contributing up to $15,000/year (50,000 cap) until the ATO determination + release window opens.",
          "On a $60k–$125k income you're also eligible for the First Home Guarantee — pair the FHSS release with a 5%-deposit FHG product so you avoid LMI on the rest.",
          stateLine,
        ]
          .filter(Boolean)
          .join(" "),
        primaryCta: { label: "FHSS Calculator", href: "/tools/fhss-calculator" },
        secondaryCta: { label: "Find an FHB Mortgage Broker", href: "/find/mortgage-broker" },
        advisorCta: { href: "/quiz?vertical=mortgage", specialty: "first home buyer mortgage broker" },
      };
    }

    if (deposit === "saving_outside_super") {
      return {
        headline:
          "Move your deposit savings into FHSS — same dollar, ~17% tax saving at your marginal rate.",
        summary: [
          "Saving in a standard bank account taxes interest at your marginal rate (32.5%+). FHSS concessional contributions are taxed at 15% going in, and 85% of withdrawals are assessed at your marginal rate minus a 30% offset. For a $60k–$125k income, the net tax saving on $15,000/year of contributions is typically $2,500–$4,000.",
          "Combine with the First Home Guarantee (5% deposit) and your state's grant.",
          stateLine,
        ]
          .filter(Boolean)
          .join(" "),
        primaryCta: { label: "Calculate Your FHSS Saving", href: "/tools/fhss-calculator" },
        secondaryCta: { label: "FHB Hub", href: "/first-home-buyer" },
        advisorCta: { href: "/quiz?vertical=mortgage", specialty: "first home buyer mortgage broker" },
      };
    }

    // Income $60k-$125k, no deposit yet — start with FHSS planning.
    return {
      headline:
        "You're eligible for every FHB scheme — start by setting up FHSS to compound your deposit faster.",
      summary: [
        "On a $60k–$125k income you qualify for the First Home Guarantee (5% deposit, no LMI), FHSS ($50,000 max release), and your state's first-home grants and stamp-duty concessions. FHSS is usually the first move because deposit savings inside super grow tax-advantaged.",
        stateLine,
        "Run the FHSS calculator to size your contribution schedule, then come back for a mortgage-broker handoff once you're 12 months out from buying.",
      ]
        .filter(Boolean)
        .join(" "),
      primaryCta: { label: "Calculate Your FHSS Saving", href: "/tools/fhss-calculator" },
      secondaryCta: { label: "Compare Savings Accounts", href: "/savings" },
      advisorCta: { href: "/quiz?vertical=mortgage", specialty: "first home buyer mortgage broker" },
    };
  },
};
