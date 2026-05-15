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
