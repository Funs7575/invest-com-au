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
