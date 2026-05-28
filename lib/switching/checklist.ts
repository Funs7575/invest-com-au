/**
 * Switching checklist model — pure, tested, AFSL-safe.
 *
 * Factual process guidance only. Every step is drawn from publicly available
 * regulatory/industry sources (ATO, ASIC, MoneySmart, ASX). No personal
 * recommendation is made about whether the user should switch.
 *
 * References
 * ----------
 *   Broker (CHESS):   ASIC RG 227 · ASX CHESS Operating Rules
 *   Super (rollover): ATO SIS Act s238 · ASIC RG 183 · myGov ATO-linked
 *   Savings:          ASIC MoneySmart · RBA guidance
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/** A single step in a switching checklist. */
export interface SwitchStep {
  /** Short heading shown as bullet label. */
  heading: string;
  /** Full factual description — no personal-advice language. */
  body: string;
  /**
   * Tag for grouping steps in UI (phases vary per type).
   * broker: "prepare" | "open" | "transfer" | "close"
   * super:  "check" | "rollover" | "close"
   * savings:"prepare" | "open" | "migrate" | "close"
   */
  phase: string;
  /**
   * Optional warning — compliance-sensitive sub-note sourced from
   * ASIC / ATO official guidance. Only populated where ASIC/ATO
   * mandates a specific disclosure (e.g. super insurance loss).
   */
  warning?: string;
  /**
   * Optional source citation shown to the user so they can verify
   * the factual claim themselves (URL or regulator name + doc title).
   */
  source?: string;
}

export type SwitchType = "broker" | "super" | "savings";

export interface SwitchChecklist {
  type: SwitchType;
  /** Short description of what the checklist covers. */
  description: string;
  steps: SwitchStep[];
}

// ─── Broker checklist ─────────────────────────────────────────────────────────

/**
 * Factual steps for switching share brokers in Australia.
 *
 * Covers HIN/SRN transfer vs sell-down, CHESS sponsorship considerations,
 * in-specie transfer, and cost-base record keeping per ATO requirements.
 *
 * Sources: ASX CHESS Operating Rules, ASIC RG 181, ATO CGT record-keeping.
 */
export const BROKER_CHECKLIST: SwitchChecklist = {
  type: "broker",
  description:
    "A factual step-by-step process for transferring your share portfolio to a new broker in Australia.",
  steps: [
    {
      heading: "Check your current sponsorship model (CHESS vs custodial)",
      body:
        "Log in to your current broker and check whether your holdings are CHESS-sponsored (you have a Holder Identification Number, HIN, starting with 'X') or held in a custodial/issuer-sponsored model (you have a Shareholder Reference Number, SRN, per company). CHESS-sponsored shares can be transferred directly without selling. Custodial shares may need to be sold and repurchased, which has tax and brokerage implications.",
      phase: "prepare",
      source: "ASX CHESS Operating Rules, ASIC RG 181",
    },
    {
      heading: "Record your cost base before moving",
      body:
        "Download or screenshot your full transaction history from your current broker. Australian tax law requires you to keep records of the original acquisition date and cost for each parcel of shares for Capital Gains Tax (CGT) purposes. An in-specie transfer does not reset your cost base, but records must be retained. A sell-down and rebuy creates a new CGT event.",
      phase: "prepare",
      source: "ATO — CGT record-keeping requirements",
    },
    {
      heading: "Confirm the new broker supports in-specie CHESS transfer",
      body:
        "Contact or check the new broker's FAQ to confirm they accept off-market CHESS transfers (also called broker-to-broker transfers). Most CHESS-sponsored brokers accept these. Some non-CHESS (custodial) brokers do not accept in-specie transfers and require a sell-down before account opening.",
      phase: "open",
    },
    {
      heading: "Open and verify your new broker account",
      body:
        "Complete the new broker's online application. You will need to provide: photo ID (driver's licence or passport), your Tax File Number (TFN) — voluntary but withholding tax applies if not supplied — and your bank account details for settlement. Identity verification is typically completed within minutes online via digital ID checks.",
      phase: "open",
    },
    {
      heading: "Initiate the off-market (CHESS) transfer",
      body:
        "Log in to your new broker and initiate a 'CHESS transfer' or 'HIN transfer'. You will need to provide your current HIN (from your old broker) and the details of each holding (ASX code and quantity). Your new broker submits the transfer request to ASX CHESS on your behalf. Your old broker will be notified and has 3 business days to respond. There is no need to contact your old broker separately.",
      phase: "transfer",
      source: "ASX CHESS Operating Rules §6",
    },
    {
      heading: "Understand transfer fees",
      body:
        "Most brokers charge a per-holding CHESS transfer fee (commonly $50–$55 per line of stock). Some charge on the outgoing side, some on the incoming side — check both brokers' fee schedules. ETFs and managed funds held on the CHESS subregister transfer the same way as individual shares.",
      phase: "transfer",
    },
    {
      heading: "For US/international shares: understand the separate process",
      body:
        "US shares held on the CHESS subregister (as CDIs — CHESS Depositary Interests) transfer via the same CHESS mechanism. Shares held via the US DTC (Depository Trust Company) use a different process called ACATS (Automated Customer Account Transfer Service) and are subject to the US broker's transfer rules. Contact both brokers for their specific US transfer process.",
      phase: "transfer",
    },
    {
      heading: "Wait for transfer to complete (3–5 business days)",
      body:
        "ASX CHESS processes the transfer within 3–5 business days. During this period, your shares remain on your current HIN and you retain full ownership. You may not be able to trade the transferred holdings while the transfer is in progress. Check both your old and new broker portals to confirm receipt.",
      phase: "transfer",
    },
    {
      heading: "Verify all holdings and cost-base records in the new account",
      body:
        "After the transfer, log in to your new broker and verify: (1) all holdings appear with correct quantities, (2) the cost-base or 'purchase price' data transferred correctly if the new broker supports it, (3) any dividend reinvestment plan (DRP) enrolments — these do not transfer and must be re-enrolled.",
      phase: "close",
    },
    {
      heading: "Close your old broker account",
      body:
        "Once you have confirmed all holdings have transferred, close your old account. Check: (1) any remaining cash balance — withdraw it before closing, (2) exit fees or account closure fees in the PDS/fee schedule, (3) ongoing subscription or platform fees that may still be charged — cancel any direct debits.",
      phase: "close",
    },
  ],
};

// ─── Super checklist ──────────────────────────────────────────────────────────

/**
 * Factual steps for rolling over a superannuation account in Australia.
 *
 * Covers rollover via myGov/ATO, insurance implications, contributions timing,
 * lost super search, and beneficiary nomination.
 *
 * Sources: ATO SIS Act, ASIC RG 183, MoneySmart "Changing super funds".
 *
 * AFSL note: super switching carries significant insurance loss risk per
 * ASIC RG 183. The SUPER_WARNING from lib/compliance.ts is surfaced on the page;
 * this checklist also includes factual warning steps per that guidance.
 */
export const SUPER_CHECKLIST: SwitchChecklist = {
  type: "super",
  description:
    "A factual step-by-step process for rolling over your superannuation account in Australia, including insurance and contributions checks.",
  steps: [
    {
      heading: "Check your existing insurance cover before doing anything",
      body:
        "Log in to your current super fund's member portal (or call them) and record: (1) death and total and permanent disability (TPD) cover — the insured amount, (2) income protection cover — the monthly benefit and benefit period, (3) premium costs — how much your current fund deducts each month. Insurance inside super often has no medical underwriting, so pre-existing conditions may not be covered by a new fund. Write all of this down before initiating any rollover.",
      phase: "check",
      warning:
        "Switching super funds can result in permanent loss of life insurance, TPD, and income protection cover. Some conditions may not be insurable in a new fund. Check your current cover before rolling over.",
      source: "ASIC RG 183, MoneySmart 'Changing super funds'",
    },
    {
      heading: "Check whether contributions will land in time",
      body:
        "Contact your employer's payroll department and check: (1) when the next Superannuation Guarantee (SG) contribution is due to be paid, (2) whether you can update your nominated fund in time for the next payment. Contributions made to your old fund after you close it may need to be manually transferred. The ATO's SuperStream standard means most contributions reach the new fund within 3 business days of payment.",
      phase: "check",
      source: "ATO — SuperStream",
    },
    {
      heading: "Search for lost and multiple super accounts",
      body:
        "Before consolidating, use the ATO's 'Find and transfer super' tool (via myGov) to check whether you have other super accounts you've forgotten. Combine all accounts into your chosen fund to avoid duplicate fees. The ATO estimates Australians have billions in lost super — this step costs nothing and takes 5 minutes.",
      phase: "check",
      source: "ATO — Find your super (myGov)",
    },
    {
      heading: "Research and choose your new super fund",
      body:
        "Compare funds using the ATO's free YourSuper comparison tool (ato.gov.au/yoursuper). Key factors to compare: annual performance (net of fees), total fees (administration + investment fees), investment options, and insurance offerings. The YourSuper tool shows all APRA-regulated funds with standardised data.",
      phase: "check",
      source: "ATO — YourSuper comparison tool",
    },
    {
      heading: "Open your new super fund account",
      body:
        "Join your chosen fund via their website or member application. You will need: your TFN (required for super by law — unlike brokerage accounts, TFN withholding for super is 47% without one), your personal details, and your bank account details. Choose your investment option(s) — if unsure, most funds offer a 'balanced' or 'MySuper' default option.",
      phase: "rollover",
    },
    {
      heading: "Initiate the rollover via myGov (ATO-linked)",
      body:
        "The easiest and safest way to transfer is via myGov: (1) log in to myGov and select 'ATO', (2) go to 'Super' > 'Find and transfer super', (3) select the amount to roll over — full balance to close the old account, or partial if retaining some in the old fund (e.g. to preserve insurance), (4) confirm. The ATO coordinates the transfer directly with both funds. Most rollovers complete within 3–5 business days.",
      phase: "rollover",
      source: "ATO — Roll over super via myGov",
    },
    {
      heading: "Alternative: request rollover via the new fund",
      body:
        "If you prefer not to use myGov, complete a 'Request to transfer whole balance of superannuation benefits between funds' form (ATO form NAT 75359) and submit it to your new fund. They will coordinate the transfer with your old fund. This takes 3–5 business days on receipt.",
      phase: "rollover",
      source: "ATO form NAT 75359",
    },
    {
      heading: "Update your employer's nominated fund",
      body:
        "Provide your employer's payroll department with your new fund's details: fund ABN, fund USI (Unique Superannuation Identifier), your member number, and the fund's bank account details (via SuperStream). Use the ATO's 'Standard Choice Form' (ATO form NAT 13080) if your employer requires a formal document. You have the right to choose your own fund under the Choice of Fund rules (SGA Act s32C).",
      phase: "rollover",
      source: "ATO — Standard Choice Form (NAT 13080)",
    },
    {
      heading: "Review and update your beneficiary nomination",
      body:
        "Beneficiary nominations do not transfer automatically. Log in to your new fund and complete a binding death benefit nomination if you want a legally binding instruction on who receives your super in the event of death. A non-lapsing binding nomination is the most robust — otherwise nominations lapse every 3 years and the trustee has discretion.",
      phase: "close",
    },
    {
      heading: "Apply for comparable insurance in your new fund (if needed)",
      body:
        "If your new fund offers lower or no default insurance cover, apply for equivalent cover. Do this before closing the old account — you may have a brief window to join without underwriting. Check whether your new fund has a 'voluntary cover' or 'opt-in' process and what the underwriting requirements are.",
      phase: "close",
      warning:
        "New insurance applications in super are subject to the insurer's underwriting. Pre-existing conditions may result in exclusions or higher premiums. Apply for new cover before closing old cover.",
    },
    {
      heading: "Confirm the old account is fully closed",
      body:
        "After the rollover completes, verify: (1) the old fund's member portal shows a zero balance, (2) any insurance deductions have stopped, (3) you have received a final statement. If the old fund had an exit fee (less common since the Protecting Your Super reforms), confirm it has been deducted from the transferred amount.",
      phase: "close",
      source: "Treasury Laws Amendment (Protecting Your Super Package) Act 2019",
    },
  ],
};

// ─── Savings checklist ────────────────────────────────────────────────────────

/**
 * Factual steps for switching savings accounts in Australia.
 *
 * Covers opening a new account, migrating direct debits and payroll,
 * intro-rate expiry awareness, and closing the old account.
 *
 * Sources: ASIC MoneySmart, APRA, ABA Banking Code of Practice.
 */
export const SAVINGS_CHECKLIST: SwitchChecklist = {
  type: "savings",
  description:
    "A factual step-by-step process for switching to a new Australian savings account, including migrating direct debits and payroll.",
  steps: [
    {
      heading: "Note the introductory rate period and ongoing rate",
      body:
        "Many high-interest savings accounts advertise an introductory (honeymoon) rate that applies for 3–5 months, after which the ongoing base rate applies — which may be significantly lower. Record both rates and the intro period end date. Compare the ongoing rate, not just the intro rate, when deciding whether to switch.",
      phase: "prepare",
    },
    {
      heading: "Check for account conditions on the bonus rate",
      body:
        "Most bonus savings rates have monthly conditions: e.g. deposit a minimum amount ($1,000–$2,000), make a minimum number of card transactions, or not make any withdrawals in the month. Failing conditions reverts to the base rate, which is often close to 0%. Confirm you can meet these conditions with your spending patterns before switching.",
      phase: "prepare",
    },
    {
      heading: "Check for exit fees on your current account",
      body:
        "Most at-call savings accounts have no exit fee. However, some notice saver accounts, term deposits, or accounts with fee waivers may charge a fee for early closure or have a required notice period (typically 31–90 days). Review your current account's PDS or fee schedule.",
      phase: "prepare",
    },
    {
      heading: "List all direct debits and automatic payments from the current account",
      body:
        "Before opening the new account, log in to your current account's transaction history and list every recurring direct debit or BPAY payment: utilities, subscriptions, insurance, loan repayments, etc. Also note any automatic transfers (e.g. automated savings top-ups). You will need to re-authorise each of these with the new account's BSB and account number.",
      phase: "prepare",
    },
    {
      heading: "Open the new savings account",
      body:
        "Apply online — most accounts are opened in under 10 minutes. You will need: photo ID (passport or driver's licence), your TFN (recommended — otherwise withholding tax applies to interest at the highest marginal rate), and your current bank's BSB and account number for an initial transfer. Identity verification is completed digitally via DVS (Document Verification Service).",
      phase: "open",
    },
    {
      heading: "Transfer funds to the new account",
      body:
        "Once opened, transfer most of your balance to the new account, keeping enough in the old account to cover pending direct debits for at least 1–2 full billing cycles while you migrate them across. Transfers via Osko/PayID (NPP) are available within minutes; standard direct entry (DE) takes 1–3 business days.",
      phase: "open",
    },
    {
      heading: "Update your payroll to the new account",
      body:
        "Submit your new BSB and account number to your employer's payroll department. Most employers require this before the payroll cut-off date for the next pay cycle. Check your employment contract or company HR portal for the process. Allow one full pay cycle buffer before closing the old account.",
      phase: "migrate",
    },
    {
      heading: "Re-authorise all direct debits with the new account",
      body:
        "For each direct debit on your list, contact the biller (or update online) with your new BSB and account number. Alternatively, ask your new bank whether they offer a 'direct debit switching service' — many major banks will automatically redirect direct debits for up to 13 months after you switch (ABA Banking Code initiative). Confirm the service is active before cancelling the old account.",
      phase: "migrate",
      source: "ABA Banking Code of Practice — Account switching",
    },
    {
      heading: "Wait one full billing cycle to catch any missed direct debits",
      body:
        "After updating all billers, wait at least one full calendar month before closing the old account. This catches any quarterly or annual direct debits you may have missed. Check the old account's transaction history for any new debits and redirect them.",
      phase: "migrate",
    },
    {
      heading: "Close the old savings account",
      body:
        "Transfer any remaining balance to the new account, then contact your old bank (online, via the app, or in branch) to close the account. Request written confirmation of closure. If your old account had interest still accruing (e.g. end-of-month credit), wait for the final interest payment before closing.",
      phase: "close",
    },
    {
      heading: "Set a calendar reminder for the intro-rate expiry",
      body:
        "If your new account has an introductory rate, set a calendar reminder for 2 weeks before the intro period ends. At that point, compare the ongoing rate against other accounts — you may benefit from switching again or negotiating with your bank.",
      phase: "close",
    },
  ],
};

// ─── Lookup helper ────────────────────────────────────────────────────────────

const CHECKLISTS: Record<SwitchType, SwitchChecklist> = {
  broker: BROKER_CHECKLIST,
  super: SUPER_CHECKLIST,
  savings: SAVINGS_CHECKLIST,
};

/**
 * Returns the checklist for a given switch type.
 * Returns null for unknown types (caller renders 404).
 */
export function getChecklist(type: string): SwitchChecklist | null {
  if (type === "broker" || type === "super" || type === "savings") {
    return CHECKLISTS[type];
  }
  return null;
}

/** All supported switch types with display metadata. */
export const SWITCH_TYPES: {
  type: SwitchType;
  label: string;
  icon: string;
  tagline: string;
  slug: string;
}[] = [
  {
    type: "broker",
    label: "Share Broker",
    icon: "arrow-right-left",
    tagline: "Transfer your shares, HIN, and cost-base records",
    slug: "broker",
  },
  {
    type: "super",
    label: "Super Fund",
    icon: "building-2",
    tagline: "Roll over your super and protect your insurance cover",
    slug: "super",
  },
  {
    type: "savings",
    label: "Savings Account",
    icon: "piggy-bank",
    tagline: "Migrate direct debits, payroll, and earn a better rate",
    slug: "savings",
  },
];
