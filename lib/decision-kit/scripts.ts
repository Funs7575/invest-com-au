/**
 * lib/decision-kit/scripts.ts
 *
 * Decision Kit — per-service-type intro-call question scripts.
 *
 * When a consumer has responses in hand and is about to get on intro calls
 * with the SPECIFIC advisers who responded, these scripts give them a sharp,
 * service-specific set of questions to ask, each with a one-line "why this
 * matters" so they understand what a good answer looks like.
 *
 * PURPOSE & COMPLIANCE: This is general, factual, educational content — a list
 *   of sensible questions to ask any professional you might engage. It is NOT
 *   personal financial advice and does NOT recommend a particular adviser or
 *   product. The questions are deliberately neutral ("ask them X") and never
 *   tell the consumer what answer to prefer for their situation.
 *
 * DESIGN: Pure data module (no I/O). Keyed by a normalised service type so a
 *   caller on either surface can resolve a script from the brief template
 *   (lib/briefs/types.ts → BriefTemplate) or the quote advisor type
 *   (lib/api-schemas.ts → QUOTE_ADVISOR_TYPES). There is always a script:
 *   unknown / mixed inputs fall back to the `generic` script.
 */

/** The major service families we author bespoke scripts for. */
export type ScriptServiceType =
  | "smsf"
  | "property"
  | "financial_planning"
  | "mortgage"
  | "tax_accounting"
  | "generic";

export interface ScriptQuestion {
  /** The question to ask the adviser, phrased neutrally. */
  question: string;
  /** One short line on why this question is worth asking. */
  why: string;
}

export interface CallScript {
  serviceType: ScriptServiceType;
  /** Short human label, e.g. "SMSF / self-managed super". */
  label: string;
  /** One-sentence framing shown above the questions. */
  intro: string;
  /** 8-12 sharp questions. */
  questions: ScriptQuestion[];
}

/* ─── Shared closing questions every script ends with ───
 * Fees, scope, and "what happens next" matter for every engagement, so the
 * service-specific lists below are topped up with these to reach 8-12.       */
const UNIVERSAL_CLOSERS: ScriptQuestion[] = [
  {
    question:
      "Exactly how are you paid for this — flat fee, hourly, a percentage, commissions, or a mix?",
    why: "Fee structure shapes incentives. Knowing it up front lets you compare like-for-like and spot conflicts.",
  },
  {
    question:
      "Will you put the scope, deliverables and total cost in writing before we start?",
    why: "A written scope protects both sides and prevents the bill creeping past what you expected.",
  },
  {
    question:
      "Who will actually do the work — you, or someone else in the firm — and who is my day-to-day contact?",
    why: "The person who sold you the engagement is not always the person who delivers it.",
  },
];

/* ─── SMSF ─── */
const SMSF: CallScript = {
  serviceType: "smsf",
  label: "SMSF / self-managed super",
  intro:
    "Self-managed super carries real trustee duties and ongoing compliance cost. These questions test whether they have run funds like yours before.",
  questions: [
    {
      question:
        "How many SMSFs do you currently administer, and how many are a similar size and strategy to mine?",
      why: "SMSF rules are specialised. Volume and similarity are a proxy for relevant, current experience.",
    },
    {
      question:
        "Are you a registered SMSF auditor or do you use an independent one, and how is auditor independence kept?",
      why: "An SMSF must be audited by an approved, independent auditor each year — a basic compliance requirement.",
    },
    {
      question:
        "What are the realistic all-in annual running costs for a fund like mine, including audit, accounting and the ATO levy?",
      why: "SMSFs are often only cost-effective above a certain balance; honest numbers tell you if it stacks up.",
    },
    {
      question:
        "How do you handle the investment strategy document and the annual review the law requires?",
      why: "A documented, reviewed investment strategy is a legal trustee obligation, not optional paperwork.",
    },
    {
      question:
        "If I want to hold property or use an LRBA (borrowing) in the fund, how have you handled that before?",
      why: "Geared property in super is complex and tightly regulated; you want demonstrated, not theoretical, experience.",
    },
    {
      question:
        "How will you keep me on top of contribution caps, pension rules and other deadlines through the year?",
      why: "Breaching caps or pension minimums triggers tax penalties — proactive monitoring matters.",
    },
    {
      question:
        "What happens if the fund's circumstances change — a death, divorce, or someone moving overseas?",
      why: "These events have sharp SMSF consequences (residency, member balances) that need a plan.",
    },
    ...UNIVERSAL_CLOSERS,
  ],
};

/* ─── Property ─── */
const PROPERTY: CallScript = {
  serviceType: "property",
  label: "Property / buyer's agent",
  intro:
    "Property advice and buyer's agents vary hugely in independence. These questions surface conflicts and how they actually source deals.",
  questions: [
    {
      question:
        "Do you take any commission, kickback or referral fee from developers, sellers or mortgage brokers?",
      why: "A buyer's agent should work for you. Seller-side payments are the single biggest conflict to rule out.",
    },
    {
      question:
        "Which areas and price points do you focus on, and how recently have you transacted in mine?",
      why: "Local, recent transaction experience beats a generic national pitch.",
    },
    {
      question:
        "How do you source properties — only on-market listings, or off-market and pre-market too?",
      why: "Access to off-market stock is a large part of what you are paying a buyer's agent for.",
    },
    {
      question:
        "What independent due diligence (building, pest, strata, flood, zoning) do you run before I commit?",
      why: "Skipping due diligence is where expensive property mistakes happen.",
    },
    {
      question:
        "Can you show me recent purchases for clients with a brief like mine, including what you paid versus asking?",
      why: "Evidence of negotiation outcomes is more telling than testimonials.",
    },
    {
      question:
        "How do you handle the negotiation or auction bidding, and what is your authority limit with me?",
      why: "You want a clear, agreed process so nothing is committed without your sign-off.",
    },
    {
      question:
        "What does your service NOT cover — finance, legal, property management — and who handles those?",
      why: "Knowing the boundaries avoids assuming someone is watching a gap that nobody is.",
    },
    ...UNIVERSAL_CLOSERS,
  ],
};

/* ─── Financial planning ─── */
const FINANCIAL_PLANNING: CallScript = {
  serviceType: "financial_planning",
  label: "Financial planning / advice",
  intro:
    "A financial adviser must be licensed and give you key documents. These questions check their licensing, independence and how they are paid.",
  questions: [
    {
      question:
        "Are you authorised under an AFSL, and can you give me your Financial Services Guide (FSG) and adviser profile?",
      why: "Personal advice can only be given by a licensed adviser; the FSG sets out who they are and how they earn.",
    },
    {
      question:
        "Are you independent, or are you aligned with a particular product, platform or institution?",
      why: "Ownership and product links can steer recommendations; independence is worth knowing either way.",
    },
    {
      question:
        "How exactly are you paid — fixed fee, ongoing percentage of assets, or commissions on any products?",
      why: "Ongoing percentage fees and insurance commissions can be large over time; clarity lets you compare.",
    },
    {
      question:
        "Will you provide a written Statement of Advice, and roughly what will the upfront and ongoing fees be?",
      why: "A Statement of Advice is your right for personal advice and is the document you should keep.",
    },
    {
      question:
        "What's your approach to risk, and how would you tailor it to my goals rather than a model portfolio?",
      why: "You're testing whether the advice is genuinely about you or a one-size template.",
    },
    {
      question:
        "Who custodies my money and investments — does anything go into an account you control directly?",
      why: "You generally want your money held in your own name or a reputable custodian, not the adviser's hands.",
    },
    {
      question:
        "What does the ongoing service actually include each year, and how do I cancel if it's not delivering?",
      why: "Ongoing fee arrangements must be renewed and should be easy to exit — pin down the substance.",
    },
    ...UNIVERSAL_CLOSERS,
  ],
};

/* ─── Mortgage ─── */
const MORTGAGE: CallScript = {
  serviceType: "mortgage",
  label: "Mortgage broker",
  intro:
    "Mortgage brokers owe you a best-interests duty but are paid by lenders. These questions surface their panel, commissions and the real numbers.",
  questions: [
    {
      question:
        "How many lenders are on your panel, and are any owned by or aligned with your aggregator?",
      why: "A wider, genuinely independent panel means more options; alignment can narrow what you're shown.",
    },
    {
      question:
        "What upfront and trail commission do you receive, and does it differ between the lenders you'd recommend?",
      why: "Brokers must act in your best interests, but commission differences are still worth seeing.",
    },
    {
      question:
        "Based on my situation, what's the comparison rate and total cost over the loan, not just the headline rate?",
      why: "Headline rates hide fees; the comparison rate and total interest are what you actually pay.",
    },
    {
      question:
        "Will you show me a few options side by side and explain why you'd lean one way?",
      why: "Seeing the shortlist, not just the winner, lets you judge the recommendation.",
    },
    {
      question:
        "How will this affect my borrowing power and what features (offset, redraw, fixed/variable split) suit me?",
      why: "Loan structure matters as much as rate for flexibility and long-run cost.",
    },
    {
      question:
        "What are the exit costs, break fees and ongoing fees on the loans you're suggesting?",
      why: "Break and exit costs can trap you; knowing them up front avoids surprises later.",
    },
    {
      question:
        "What happens to your service after settlement — do you review the loan periodically?",
      why: "A good broker re-checks your rate over time; a deal-and-disappear broker does not.",
    },
    ...UNIVERSAL_CLOSERS,
  ],
};

/* ─── Tax / accounting ─── */
const TAX_ACCOUNTING: CallScript = {
  serviceType: "tax_accounting",
  label: "Tax / accounting",
  intro:
    "Tax agents must be registered and carry professional standards. These questions confirm registration and how they'll handle your situation.",
  questions: [
    {
      question:
        "Are you a registered tax agent with the Tax Practitioners Board, and what's your registration number?",
      why: "Only a registered tax agent can lawfully charge to prepare and lodge your tax — easy to verify.",
    },
    {
      question:
        "Do you have specific experience with situations like mine (e.g. business, rental, crypto, overseas income)?",
      why: "Tax is full of edge cases; relevant experience reduces missed deductions and costly errors.",
    },
    {
      question:
        "How do you charge — fixed per return, hourly, or a package — and what's included versus extra?",
      why: "Scope creep is common in accounting; a clear fee basis lets you budget and compare.",
    },
    {
      question:
        "Who prepares the work and who reviews it before lodgement?",
      why: "A second review catches errors; knowing the process tells you how carefully it's handled.",
    },
    {
      question:
        "How do you stay current with ATO changes, and will you flag planning opportunities proactively?",
      why: "You're paying for more than data entry — proactive, current advice is the value.",
    },
    {
      question:
        "If the ATO queries or audits my return, what support do you provide and is it extra?",
      why: "Audit support varies; you want to know you won't be left alone if questions arise.",
    },
    {
      question:
        "How and when will you communicate during the year, not just at tax time?",
      why: "Year-round contact lets you make decisions before the financial year closes, not after.",
    },
    ...UNIVERSAL_CLOSERS,
  ],
};

/* ─── Generic fallback ─── */
const GENERIC: CallScript = {
  serviceType: "generic",
  label: "Any professional",
  intro:
    "A solid set of questions to ask any professional you might engage — use these to compare the people who responded on the same footing.",
  questions: [
    {
      question:
        "What licences, registrations or memberships do you hold for this work, and can I verify them?",
      why: "Verifiable credentials are the baseline; you can cross-check most on a public register.",
    },
    {
      question:
        "How much experience do you have with situations specifically like mine?",
      why: "Relevant, recent experience is a better signal than general years in the industry.",
    },
    {
      question:
        "Can you walk me through how you'd approach my situation step by step?",
      why: "A clear, tailored process shows they've actually thought about your brief.",
    },
    {
      question:
        "Can you share references or examples of similar work, and may I speak to a recent client?",
      why: "Talking to a real client tells you far more than a polished pitch.",
    },
    {
      question:
        "Do you have any conflicts of interest, commissions or referral arrangements I should know about?",
      why: "Surfacing conflicts early lets you weigh whose interests an answer serves.",
    },
    {
      question:
        "What could go wrong, and how would you manage it?",
      why: "Willingness to discuss risk honestly is a sign of a trustworthy professional.",
    },
    {
      question:
        "What do you expect from me, and how quickly do you typically respond to questions?",
      why: "Clear mutual expectations and responsiveness prevent friction once you start.",
    },
    ...UNIVERSAL_CLOSERS,
  ],
};

/** Registry keyed by normalised service type. */
export const CALL_SCRIPTS: Record<ScriptServiceType, CallScript> = {
  smsf: SMSF,
  property: PROPERTY,
  financial_planning: FINANCIAL_PLANNING,
  mortgage: MORTGAGE,
  tax_accounting: TAX_ACCOUNTING,
  generic: GENERIC,
};

/**
 * Map a raw service identifier — a brief template (lib/briefs/types.ts) or a
 * quote advisor type (lib/api-schemas.ts QUOTE_ADVISOR_TYPES) or a free-form
 * string — onto one of our authored scripts. Always resolves (falls back to
 * `generic`).
 */
export function resolveScriptServiceType(raw: string | null | undefined): ScriptServiceType {
  if (!raw) return "generic";
  const k = raw.toLowerCase().trim();

  // SMSF
  if (k.includes("smsf") || k.includes("self-managed") || k.includes("self managed")) {
    return "smsf";
  }
  // Mortgage / lending (check before generic "property" so mortgage_broker wins)
  if (k.includes("mortgage") || k.includes("home loan") || k === "lending") {
    return "mortgage";
  }
  // Property / buyer's agent / conveyancing / property law
  if (
    k.includes("property") ||
    k.includes("buyers_agent") ||
    k.includes("buyer's agent") ||
    k.includes("real estate") ||
    k.includes("conveyanc")
  ) {
    return "property";
  }
  // Tax / accounting
  if (
    k.includes("tax") ||
    k.includes("account") ||
    k === "bookkeeper" ||
    k.includes("bas")
  ) {
    return "tax_accounting";
  }
  // Financial planning / advice / wealth / super (non-SMSF) / estate / insurance
  if (
    k.includes("financial_planner") ||
    k.includes("financial planner") ||
    k.includes("financial_adviser") ||
    k.includes("financial advisor") ||
    k.includes("financial adviser") ||
    k.includes("wealth") ||
    k.includes("planner") ||
    k.includes("estate_planner") ||
    k.includes("insurance") ||
    k.includes("retire")
  ) {
    return "financial_planning";
  }

  return "generic";
}

/** Resolve the full script for a raw service identifier. Always returns one. */
export function getCallScript(raw: string | null | undefined): CallScript {
  return CALL_SCRIPTS[resolveScriptServiceType(raw)];
}
