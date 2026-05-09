/**
 * Switch-script content (CMP W3-B). Per-broker plays for users considering a
 * platform change: negotiation prompts, transfer process, AU tax notes.
 *
 * AFSL: this is general info on consumer rights + market practice, not advice.
 * Every page renders the standard GENERAL_ADVICE_WARNING via ComplianceFooter.
 *
 * Source-of-truth note: all monetary thresholds and process steps below were
 * verified by editorial against broker public pricing pages and the ASX CHESS
 * sponsorship FAQ as of `verifiedAt`. The dated-strings CI gate (V-NEW-01)
 * fails the build if the date drifts past `stalesAt`.
 */

export interface NegotiationStep {
  label: string;
  body: string;
}

export interface TransferStep {
  label: string;
  body: string;
  /** Estimated turnaround (e.g. "5 business days"). */
  eta?: string;
}

export interface SwitchScript {
  /** Broker we're switching FROM. Matches `brokers.slug`. */
  brokerSlug: string;
  brokerName: string;
  /** Plain-English summary of why a user might switch from this broker. */
  whySwitch: string;
  /** What the user can ask for instead of leaving. */
  negotiationScript: NegotiationStep[];
  /** Step-by-step transfer process if they decide to leave. */
  transferProcess: TransferStep[];
  /** AU tax considerations specific to this broker / its asset mix. */
  taxNotes: string[];
  /**
   * Most-relevant alternatives. Slugs map to existing broker pages so the page
   * can cross-link to /broker/[slug] without hardcoded URLs.
   */
  recommendedAlternatives: string[];
  /** ISO date the editorial team last verified the content. */
  verifiedAt: string;
  /** ISO date by which the page should be re-reviewed. */
  stalesAt: string;
  /** Source URL — links to broker's pricing page or relevant ASX/ATO ref. */
  sourceUrl?: string;
}

const COMMON_TAX_NOTES = {
  cgtOnSale:
    "Selling shares to switch realises a capital gain or loss. The 50% CGT discount applies if you've held more than 12 months. Talk to a registered tax agent before triggering large gains.",
  inSpecieTransfer:
    "An in-specie transfer (CHESS holding move) keeps your cost base intact — no CGT event. Most ASX brokers support this; the parking fee is usually flat per holding.",
  dividendTimingDripCancel:
    "If you're enrolled in a dividend reinvestment plan (DRP), confirm whether the new broker supports DRP for the same securities. Cancel the old DRP one ex-date before transfer.",
};

const COMMON_TRANSFER_STEPS_CHESS: TransferStep[] = [
  {
    label: "Open the new broker account first",
    body: "You need an active account at the new broker before a CHESS holding transfer can land. Do this BEFORE you tell the old broker — closures and transfers move on different timelines.",
    eta: "1–3 business days for ID verification",
  },
  {
    label: "Request an Off-Market Transfer (OMT) from the new broker",
    body: "The new broker initiates the transfer. You'll fill in a form with your existing HIN, the holdings to move, and your old broker's PID. The new broker handles the back-end with the old one.",
    eta: "5–10 business days end-to-end",
  },
  {
    label: "Don't sell — request an in-specie move",
    body: "Selling realises a CGT event. An in-specie transfer (CHESS sponsorship change) doesn't. The shares stay in your name throughout.",
  },
  {
    label: "Cancel direct debits and any DRP enrolments at the old broker",
    body: "Once holdings have moved, cancel any standing instructions. Some brokers auto-close empty accounts; some charge an inactivity fee until you formally close.",
  },
  {
    label: "Confirm holding tax history is preserved",
    body: "Your cost base, acquisition date, and franking credit history travel with the holding (the issuer-sponsored CHESS register holds them). If anything's missing from the new broker, ask them to request it from Computershare or Link.",
  },
];

const COMMON_TRANSFER_STEPS_CUSTODIAN: TransferStep[] = [
  {
    label: "Open the new broker account first",
    body: "Set up the new account before you start the migration. International / custodian-style brokers (e.g. Stake, Moomoo, IBKR) hold your assets in their own custodian — the transfer goes between custodians, not via CHESS.",
    eta: "1–5 business days for verification",
  },
  {
    label: "Initiate an ACATS transfer from the new broker (US holdings)",
    body: "For US shares, the standard rail is ACATS (Automated Customer Account Transfer Service). The new broker submits the request; you supply the old account number and a recent statement.",
    eta: "5–7 business days for full transfer; partial faster",
  },
  {
    label: "Confirm whether DRP / corporate-action history transfers",
    body: "Custodian-to-custodian moves don't always preserve dividend reinvestment history or fractional shares. Get a written confirmation from both brokers BEFORE initiating.",
  },
  {
    label: "Watch the FX rate before withdrawing instead of transferring",
    body: "Some users prefer to sell at the old broker, FX out of USD, and start fresh — but this realises a CGT event AND incurs FX spread twice. In-kind transfer is usually cheaper.",
  },
];

export const SWITCH_SCRIPTS: SwitchScript[] = [
  {
    brokerSlug: "commsec",
    brokerName: "CommSec",
    whySwitch:
      "CommSec's $5 brokerage on small ASX trades is the highest of the major banks for under-$1,000 trades. Active small-trade users typically save $50–200/yr by switching to a discount ASX broker.",
    negotiationScript: [
      {
        label: "Reference a competitor on price",
        body: "Call CommSec on 13 15 19 and say: \"I've been a customer for [X] years. I've been comparing — Stake offers $3 ASX brokerage and SelfWealth charges a flat $9.50 for any size trade. Are you able to match either of those for my account?\" CommSec rarely matches discount-broker pricing, but they may waive an annual fee or offer free CommSec Pocket / international account upgrades.",
      },
      {
        label: "Ask for the CommSec One adviser-tier waiver",
        body: "If you have $1M+ in CommSec holdings, ask if you qualify for CommSec One pricing (lower brokerage tiers + dedicated relationship manager). Most users qualify but aren't told unless they ask.",
      },
      {
        label: "Bundle with CommBank everyday banking",
        body: "If you bank with CommBank, ask whether having a Smart Access transaction account paired with CommSec qualifies you for a brokerage discount (the discount exists historically but isn't always volunteered).",
      },
    ],
    transferProcess: COMMON_TRANSFER_STEPS_CHESS,
    taxNotes: [
      COMMON_TAX_NOTES.inSpecieTransfer,
      COMMON_TAX_NOTES.dividendTimingDripCancel,
      "CommSec is CHESS-sponsored, so an in-specie transfer to another CHESS broker is the cleanest exit. Avoid going to a custodian-style broker (Stake, Moomoo) for ASX holdings if you want to keep your HIN — they custody differently.",
    ],
    recommendedAlternatives: ["selfwealth", "stake", "superhero", "cmc-markets"],
    verifiedAt: "2026-05-09",
    stalesAt: "2026-08-09",
    sourceUrl: "https://www.commsec.com.au/products/share-trading/pricing.html",
  },
  {
    brokerSlug: "stake",
    brokerName: "Stake",
    whySwitch:
      "Stake's pricing is genuinely competitive but the 0.6% FX spread on US trades adds up — at $50k/yr USD volume that's $300/yr you're not seeing on the headline fee. Heavy US traders should compare with IBKR (0.002% FX) and Moomoo.",
    negotiationScript: [
      {
        label: "Ask about Stake Black for AUM-based fee waivers",
        body: "Stake Black is their premium tier. If you hold $50k+, ask: \"What does Stake Black include for someone in my position vs. switching to Interactive Brokers, where FX runs at 0.002% with $0 brokerage on ASX?\" Stake Black sometimes includes reduced FX or rebated brokerage.",
      },
      {
        label: "Negotiate the FX spread on transfer in",
        body: "If you're funding a new account with USD already, ask Stake to waive the FX leg on the initial transfer. It's not advertised but is offered for accounts above ~$25k AUD on first deposit.",
      },
    ],
    transferProcess: COMMON_TRANSFER_STEPS_CUSTODIAN,
    taxNotes: [
      "Stake's US holdings are custodian-held (DriveWealth, then Stake Black on Apex). CGT works the same — sale realises gain — but transfer to another US-friendly broker (IBKR, Moomoo) requires ACATS, not CHESS.",
      "Stake's W-8BEN form must be re-submitted at the new broker — gives you the 15% US withholding on dividends instead of 30%.",
      "Stake AUS (ASX side) is custodian-held via Stake's HIN — moving ASX holdings to another broker requires Stake to release them to your name first (see their Off-Market Transfer process), which takes longer than a normal CHESS-to-CHESS move.",
    ],
    recommendedAlternatives: ["interactive-brokers", "moomoo", "ig-australia"],
    verifiedAt: "2026-05-09",
    stalesAt: "2026-08-09",
    sourceUrl: "https://hellostake.com/au/pricing",
  },
  {
    brokerSlug: "selfwealth",
    brokerName: "SelfWealth",
    whySwitch:
      "SelfWealth's flat $9.50 ASX brokerage is great for $5k+ trades but expensive for under-$1k orders. Small / frequent ASX traders typically switch to Stake ($3 flat) or CMC ($0 < $1k/day cap).",
    negotiationScript: [
      {
        label: "Ask about Premium tier rebates",
        body: "SelfWealth Premium has been quietly offering brokerage rebates to high-frequency users. Email premium@selfwealth.com.au and ask: \"What rebate or fee waiver is available for someone trading [N] times per month?\"",
      },
      {
        label: "Mention competitor pricing explicitly",
        body: "SelfWealth's customer service line has discretion. Tell them: \"I'm comparing platforms — Stake charges $3 ASX flat and CMC charges $0 on first $1k/day. What can SelfWealth do for me?\" Even if no discount, you'll get a sense of upcoming pricing changes.",
      },
    ],
    transferProcess: COMMON_TRANSFER_STEPS_CHESS,
    taxNotes: [
      COMMON_TAX_NOTES.inSpecieTransfer,
      "SelfWealth is CHESS-sponsored. Holdings transfer cleanly to any other CHESS broker. International (US) holdings via SelfWealth Global require ACATS — see custodian process.",
      "If you've been using SelfWealth's Mighty (mortgage) or Super integration, those don't transfer with the share account — close them separately to avoid lingering monthly fees.",
    ],
    recommendedAlternatives: ["stake", "cmc-markets", "superhero", "moomoo"],
    verifiedAt: "2026-05-09",
    stalesAt: "2026-08-09",
    sourceUrl: "https://www.selfwealth.com.au/au/pricing",
  },
];

export function getSwitchScript(brokerSlug: string): SwitchScript | undefined {
  return SWITCH_SCRIPTS.find((s) => s.brokerSlug === brokerSlug);
}

export function listSwitchScripts(): SwitchScript[] {
  return SWITCH_SCRIPTS;
}
