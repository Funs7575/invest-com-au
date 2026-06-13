/**
 * Funding-pathway registry — the static facts behind the Pathway Finder
 * (CR-01) and the /raise guide pages (CR-02).
 *
 * COMPLIANCE (docs/strategy/CAPITAL_RAISING_OPPORTUNITIES.md §2.3):
 * everything here speaks to a BUSINESS about its own funding options —
 * pathway *categories*, never specific products, providers-as-recommendation,
 * or investment offers. Eligibility figures are factual statements of the
 * CSF regime / market norms with sources noted in the strategy doc.
 * Investor-facing surfaces must carry CAPITAL_RAISING_NOTE from
 * lib/compliance.ts.
 */

export const PATHWAY_IDS = [
  "grants",
  "debt",
  "csf",
  "angel",
  "vc",
  "bootstrap",
  "sale",
] as const;

export type PathwayId = (typeof PATHWAY_IDS)[number];

export interface PathwayNextStep {
  label: string;
  href: string;
}

export interface PathwayMeta {
  id: PathwayId;
  /** Short label used on result cards and chips. */
  label: string;
  /** components/Icon name. */
  icon: string;
  /** One-sentence answer-first definition (GEO: extraction-ready). */
  definition: string;
  /** Typical amounts raised through this pathway in Australia. */
  typicalAmounts: string;
  /** Realistic end-to-end timeline. */
  typicalTimeline: string;
  /** What it costs the business (fees / dilution / interest). */
  cost: string;
  /** Hard, factual eligibility points (kept regime-accurate). */
  eligibilityFacts: string[];
  /** Who this pathway genuinely suits. */
  bestFor: string;
  /** Honest watch-outs — shown on cards so excitement and honesty travel together. */
  watchOuts: string[];
  /** Where to go next on the platform (existing surfaces only). */
  nextSteps: PathwayNextStep[];
  /** Canonical guide page under /raise. */
  guideSlug: string;
}

export const PATHWAYS: Record<PathwayId, PathwayMeta> = {
  grants: {
    id: "grants",
    label: "Government grants & incentives",
    icon: "clipboard-list",
    definition:
      "Non-dilutive funding from federal and state programs — you keep all your equity and repay nothing, in exchange for meeting program criteria and paperwork.",
    typicalAmounts: "$10k – $5M depending on program (R&D Tax Incentive, EMDG, state programs)",
    typicalTimeline: "1–6 months per application; R&D offset arrives with your tax return",
    cost: "No dilution, no interest — application effort, compliance and (optionally) grant-writer fees",
    eligibilityFacts: [
      "R&D Tax Incentive: refundable 43.5% offset on eligible R&D for companies under $20M turnover",
      "EMDG reimburses up to 50% of eligible export-marketing spend, tiered by stage",
      "Most programs require an ABN, an Australian entity and program-specific criteria",
    ],
    bestFor: "Businesses doing genuinely novel work, exporting, or in priority sectors — at any stage.",
    watchOuts: [
      "Grant rules and funding rounds change frequently — always confirm current criteria",
      "Money is usually reimbursed or offset after spend, not paid upfront",
    ],
    nextSteps: [
      { label: "Run the grants eligibility quiz", href: "/grants/eligibility-quiz" },
      { label: "Find a grants & R&D specialist", href: "/advisors/grant-writers" },
      { label: "Browse the grants hub", href: "/startup/grants" },
    ],
    guideSlug: "government-grants",
  },
  debt: {
    id: "debt",
    label: "Business debt finance",
    icon: "piggy-bank",
    definition:
      "Borrowing for business purposes — working capital, invoice, equipment or property-secured finance — repaid with interest while you keep full ownership.",
    typicalAmounts: "$10k – $5M+ depending on security and trading history",
    typicalTimeline: "Days to weeks for unsecured working capital; longer for secured facilities",
    cost: "Interest and fees (rates vary widely with security and risk) — zero dilution",
    eligibilityFacts: [
      "Lenders generally want trading history and revenue, or hard security (property, equipment, receivables)",
      "Business-purpose lending sits outside the consumer credit regime — terms vary far more than home loans",
      "Personal guarantees are commonly required for small-business facilities",
    ],
    bestFor: "Trading businesses with revenue or assets that need capital without giving up equity.",
    watchOuts: [
      "Repayments start immediately — debt suits predictable cash flow, not pre-revenue bets",
      "Compare total cost of capital, not just the headline rate",
    ],
    nextSteps: [
      { label: "Read the business-debt guide", href: "/raise/business-debt" },
      { label: "Talk to an accountant about debt readiness", href: "/find-advisor?specialty=Tax" },
    ],
    guideSlug: "business-debt",
  },
  csf: {
    id: "csf",
    label: "Equity crowdfunding (CSF)",
    icon: "user-plus",
    definition:
      "Crowd-sourced funding lets eligible Australian companies raise up to $5M a year from the public in exchange for ordinary shares, exclusively via ASIC-licensed CSF intermediary platforms.",
    typicalAmounts: "$200k – $3M typical; legal cap of $5M per 12 months",
    typicalTimeline: "3–6 months including preparation, offer document and the live campaign",
    cost: "Platform fees (commonly a fixed fee plus a 5–8% success fee) + equity dilution + campaign effort",
    eligibilityFacts: [
      "Company must be an Australian unlisted company with under $25M consolidated gross assets AND under $25M annual revenue",
      "Only fully paid ordinary shares can be offered; offers run via a licensed CSF intermediary",
      "Retail investors are capped at $10,000 per company per 12 months, with a 5-business-day cooling-off",
    ],
    bestFor: "Consumer-facing companies with an engaged customer base or community who'd love to own a piece.",
    watchOuts: [
      "Campaigns are public — a visibly under-subscribed raise has reputational cost",
      "You'll take on hundreds or thousands of shareholders — plan registry and comms",
      "We don't host or arrange offers — raises run on the licensed intermediary's platform",
    ],
    nextSteps: [
      { label: "Read the equity-crowdfunding guide (incl. platform comparison)", href: "/raise/equity-crowdfunding" },
      { label: "Get raise-ready with an accountant or lawyer", href: "/find-advisor?specialty=Tax" },
    ],
    guideSlug: "equity-crowdfunding",
  },
  angel: {
    id: "angel",
    label: "Angel & private investors",
    icon: "user-check",
    definition:
      "Early cheques from individual investors — usually 'sophisticated investors' under the Corporations Act wholesale tests — who back the team before institutions will.",
    typicalAmounts: "$25k – $1M, often syndicated across several angels",
    typicalTimeline: "1–6 months — driven by warm introductions and your network",
    cost: "Equity dilution; sometimes board involvement — plus legal costs for the round",
    eligibilityFacts: [
      "Most angel rounds rely on wholesale-investor exemptions: investors certify $250k income (2 years) or $2.5M net assets via a qualified accountant's certificate",
      "Private offers can't be advertised to the public — they spread through genuine networks and licensed channels",
      "You'll need a company structure able to issue shares (or SAFE/convertible notes)",
    ],
    bestFor: "Early-stage companies with a strong story and founders willing to work their networks.",
    watchOuts: [
      "Pick angels for what they bring beyond money — the wrong investor is expensive forever",
      "Get the paperwork done properly — bad early terms poison later rounds",
    ],
    nextSteps: [
      { label: "Understand wholesale-investor rules", href: "/wholesale" },
      { label: "Read the angel-investment guide", href: "/raise/angel-investment" },
    ],
    guideSlug: "angel-investment",
  },
  vc: {
    id: "vc",
    label: "Venture capital",
    icon: "trending-up",
    definition:
      "Institutional equity for companies that can credibly grow 10–100× — VCs buy meaningful stakes and expect a path to a large exit.",
    typicalAmounts: "$1M – $20M+ per round (seed through Series B+)",
    typicalTimeline: "3–9 months from first meeting to money in the bank",
    cost: "Significant dilution (often 15–25% per round), board seats, investor rights",
    eligibilityFacts: [
      "Australian VCs funded roughly 390 announced deals (~$5.4B) in 2025 — it's a narrow funnel",
      "Funds look for large addressable markets, fast growth evidence and a scalable model",
      "A clean company structure (often with ESOP) is expected before term sheets",
    ],
    bestFor: "High-growth companies in big markets where speed matters more than ownership percentage.",
    watchOuts: [
      "VC is the exception, not the default — most healthy businesses are not venture-shaped",
      "Raising consumes founder months; only start when the metrics support it",
    ],
    nextSteps: [
      { label: "Read the venture-capital guide", href: "/raise/venture-capital" },
      { label: "Get your structure raise-ready", href: "/find-advisor?specialty=Tax" },
    ],
    guideSlug: "venture-capital",
  },
  bootstrap: {
    id: "bootstrap",
    label: "Bootstrap & revenue funding",
    icon: "dollar-sign",
    definition:
      "Funding growth from customer revenue, pre-sales and disciplined costs — the default pathway that keeps every share and every decision yours.",
    typicalAmounts: "Whatever your customers will pay you",
    typicalTimeline: "Immediate — growth speed tracks cash generation",
    cost: "Slower growth in exchange for zero dilution and zero interest",
    eligibilityFacts: [
      "No eligibility tests, offer documents or investor obligations",
      "Pairs well with grants (non-dilutive) and later debt once revenue is established",
    ],
    bestFor: "Founders who value control, businesses with early revenue, and markets that don't demand a land-grab.",
    watchOuts: [
      "Under-capitalisation can starve a genuinely fast-moving opportunity — revisit the decision as you grow",
    ],
    nextSteps: [
      { label: "See grants you may qualify for", href: "/grants/eligibility-quiz" },
      { label: "Read the bootstrapping guide", href: "/raise/bootstrapping" },
    ],
    guideSlug: "bootstrapping",
  },
  sale: {
    id: "sale",
    label: "Sell or exit the business",
    icon: "log-out",
    definition:
      "Sometimes the right 'funding pathway' is a full or partial sale — converting the value you've built into capital, via trade sale, acquisition or succession.",
    typicalAmounts: "Market-driven — typically a multiple of earnings or revenue",
    typicalTimeline: "6–18 months for a well-run sale process",
    cost: "Broker/adviser fees and the transaction itself — but no new obligations afterwards",
    eligibilityFacts: [
      "Buyers pay for transferable value: documented financials, systems, contracts and a business that runs without you",
      "Partial sales and succession deals can release capital while you stay involved",
    ],
    bestFor: "Established businesses whose owners want liquidity, de-risking, or the next chapter.",
    watchOuts: [
      "Start preparing 12+ months before you want to transact — clean books move valuation more than negotiation does",
    ],
    nextSteps: [
      { label: "Visit the sell-your-business hub", href: "/sell-business" },
      { label: "Get a valuation baseline", href: "/sell-business/valuation" },
    ],
    guideSlug: "selling-your-business",
  },
};

export const pathwayMeta = (id: PathwayId): PathwayMeta => PATHWAYS[id];
