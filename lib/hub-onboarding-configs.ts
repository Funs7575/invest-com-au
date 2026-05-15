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
