/**
 * lib/getmatched/investor-profile.ts
 *
 * Get Matched Showcase G2 (docs/plans/GET_MATCHED_SHOWCASE.md): the
 * "Investor Profile" identity card. Maps the user's STATED answers onto a
 * factual, display-ready profile — a label, a one-line descriptor, and a row
 * of "what you told us" signal chips.
 *
 * HARD COMPLIANCE LINE (UNIFIED_MATCHING_ENGINE.md §6, lib/compliance.ts):
 * Every string here is a *restatement of what the user said* — never advice,
 * never a suitability or quality judgement, never "you should". The label is
 * a composition of the user's own answers ("Crypto-focused active trader"),
 * not a recommendation. The UI frames the whole card "Based on your answers".
 *
 * Pure — no I/O, no DB, deterministic. Exhaustively tested across all 13
 * retail intents × sub-answer / experience variations.
 */

import type { ActionPlanAnswers, IntentSlug } from "./types";

export interface ProfileSignal {
  /** Display name of the signal, e.g. "Budget", "Timeline". */
  name: string;
  /** Display-ready value, e.g. "A$10k–$100k", "Ready now". */
  value: string;
  /** 1 = soft signal, 2 = moderate, 3 = strong/decisive. Drives chip emphasis. */
  strength: 1 | 2 | 3;
}

export interface InvestorProfile {
  /** Factual composition of the user's answers, e.g. "First-home buyer". */
  label: string;
  /** A one-line restatement framed as "based on what you told us". */
  descriptor: string;
  /** Display-ready "what you told us" chips, strongest signal first. */
  signals: ProfileSignal[];
}

const str = (v: unknown): string | undefined =>
  typeof v === "string" && v.length > 0 ? v : undefined;

// ─── Experience phrasing ────────────────────────────────────────────────
// The `experience` question (DIY branch) and `complexity` question (advisor
// branch) both describe where the user sits. We fold both into one phrase.

const EXPERIENCE_ADJECTIVE: Record<string, string> = {
  beginner: "Beginner",
  intermediate: "Experienced",
  pro: "Advanced",
};

const COMPLEXITY_ADJECTIVE: Record<string, string> = {
  simple: "Straightforward",
  moderate: "Established",
  complex: "Complex-situation",
};

const EXPERIENCE_SIGNAL_LABEL: Record<string, string> = {
  beginner: "Complete beginner",
  intermediate: "Some experience",
  pro: "Advanced / pro",
};

const COMPLEXITY_SIGNAL_LABEL: Record<string, string> = {
  simple: "Simple situation",
  moderate: "Moderate situation",
  complex: "Complex situation",
};

const BUDGET_SIGNAL_LABEL: Record<string, string> = {
  under_10k: "Under A$10k",
  "10k_100k": "A$10k–$100k",
  "100k_500k": "A$100k–$500k",
  "500k_1m": "A$500k–$1m",
  "1m_plus": "A$1m+",
  prefer_not: "Amount kept private",
};

const TIMELINE_SIGNAL_LABEL: Record<string, string> = {
  now: "Ready now",
  "1_3_months": "1–3 months",
  "3_6_months": "3–6 months",
  "6_12_months": "6–12 months",
  researching: "Just researching",
};

const HELP_PREFERENCE_SIGNAL_LABEL: Record<string, string> = {
  info_only: "Wants information only",
  browse: "Wants to browse",
  compare: "Wants to compare platforms",
  individual: "Wants one expert",
  firm: "Wants a firm",
  expert_team: "Wants an expert team",
  investor_brief: "Wants pros to respond",
  not_sure_help: "Open to guidance",
};

/** Experience/complexity adjective used as a label prefix (may be empty). */
function experiencePrefix(a: ActionPlanAnswers): string {
  const exp = str(a.experience);
  if (exp && EXPERIENCE_ADJECTIVE[exp]) return EXPERIENCE_ADJECTIVE[exp]!;
  const cx = str(a.complexity);
  if (cx && COMPLEXITY_ADJECTIVE[cx]) return COMPLEXITY_ADJECTIVE[cx]!;
  return "";
}

/** Join an experience prefix to the core noun-phrase, capitalised. */
function compose(prefix: string, core: string): string {
  if (!prefix) return capitalise(core);
  return `${prefix} ${core}`;
}

function capitalise(s: string): string {
  return s.length === 0 ? s : s[0]!.toUpperCase() + s.slice(1);
}

/**
 * The intent-specific core noun-phrase, refined by the sub-answer when one
 * is present. Always a factual restatement of the goal the user picked.
 */
function coreLabel(a: ActionPlanAnswers): string {
  const intent = (str(a.intent) ?? "") as IntentSlug | "";

  switch (intent) {
    case "grow": {
      switch (str(a.grow_sub)) {
        case "just_starting":
          return "first-step investor";
        case "etfs_longterm":
          return "long-term ETF investor";
        case "pick_shares":
          return "share-picking investor";
        case "guide_me":
          return "investor seeking guidance";
        default:
          return "long-term growth investor";
      }
    }

    case "income": {
      switch (str(a.income_sub)) {
        case "dividend_shares":
          return "dividend-share investor";
        case "income_etfs":
          return "income-ETF / LIC investor";
        case "property_income":
          return "REIT income investor";
        case "royalty_income":
          return "royalty-income investor";
        default:
          return "income & dividend investor";
      }
    }

    case "crypto": {
      switch (str(a.crypto_sub)) {
        case "first_buy":
          return "first-time crypto buyer";
        case "hodl":
          return "long-term crypto holder";
        case "active":
          return "crypto-focused active trader";
        case "tax":
          return "crypto investor seeking tax help";
        default:
          return "crypto investor";
      }
    }

    case "trade": {
      switch (str(a.trade_sub)) {
        case "shares_etfs":
          return "shares & ETF trader";
        case "cfds_forex":
          return "CFD & forex trader";
        case "options":
          return "options trader";
        case "crypto_trading":
          return "crypto trader";
        default:
          return "active trader";
      }
    }

    case "automate": {
      switch (str(a.automate_sub)) {
        case "full_robo":
          return "full robo-advice investor";
        case "round_ups":
          return "round-ups / micro-investor";
        case "managed_portfolio":
          return "managed-portfolio investor";
        case "compare_robo":
          return "robo-advisor comparer";
        default:
          return "hands-off / robo investor";
      }
    }

    case "super": {
      switch (str(a.super_sub)) {
        case "compare_funds":
          return "super-fund switcher";
        case "smsf_setup":
          return "SMSF set-up planner";
        case "smsf_property":
          return "SMSF property strategist";
        case "pre_retire":
          return "pre-retirement planner";
        default:
          return "super / SMSF planner";
      }
    }

    case "property": {
      switch (str(a.property_sub)) {
        case "physical":
          return "direct property investor";
        case "reit":
          return "REIT / fractional-property investor";
        case "smsf":
          return "SMSF property strategist";
        case "browse":
          return "property-listing explorer";
        default:
          return "property investor";
      }
    }

    case "home":
      return "first-home buyer";

    case "alt_assets": {
      const sub = str(a.alt_assets_sub);
      const named: Record<string, string> = {
        whisky: "whisky & wine",
        art: "art",
        watches: "watch",
        cars: "classic-car",
        coins: "coin & collectible",
      };
      if (sub && named[sub]) return `${named[sub]} collector`;
      return "alternative-assets investor";
    }

    case "royalties": {
      switch (str(a.royalties_sub)) {
        case "music_ip":
          return "music / IP royalties investor";
        case "mining":
          return "mining-royalties investor";
        case "vending_atm":
          return "vending / ATM income investor";
        default:
          return "royalties / income-asset investor";
      }
    }

    case "pre_ipo": {
      switch (str(a.pre_ipo_sub)) {
        case "invest_now":
          return "wholesale pre-IPO investor";
        case "browse_calendar":
          return "IPO-calendar watcher";
        case "get_verified":
          return "aspiring wholesale investor";
        default:
          return "pre-IPO / wholesale explorer";
      }
    }

    case "help": {
      const named: Record<string, string> = {
        financial_planner: "investor seeking a financial planner",
        mortgage_broker: "borrower seeking a mortgage broker",
        tax_agent: "investor seeking tax help",
        smsf_accountant: "investor seeking an SMSF accountant",
        buyers_agent: "buyer seeking a buyer's agent",
        lawyer: "investor seeking a lawyer / conveyancer",
        not_sure_help: "investor seeking guidance",
      };
      const sub = str(a.help_sub);
      if (sub && named[sub]) return named[sub]!;
      return "investor seeking expert help";
    }

    case "browse": {
      switch (str(a.browse_sub)) {
        case "shares":
          return "share-platform explorer";
        case "property":
          return "property-listing explorer";
        case "opportunities":
          return "private-opportunity explorer";
        case "advisors":
          return "investor browsing experts";
        default:
          return "early-stage explorer";
      }
    }

    default:
      return "investor";
  }
}

/**
 * Build the factual investor profile from the user's stated answers.
 * Restatement only — never advice. See module header for the compliance line.
 */
export function buildInvestorProfile(a: ActionPlanAnswers): InvestorProfile {
  const prefix = experiencePrefix(a);
  const core = coreLabel(a);
  const label = compose(prefix, core);

  const descriptor = `Based on what you told us, you described yourself as ${withArticle(core)}.`;

  return {
    label,
    descriptor,
    signals: buildSignals(a),
  };
}

/** "a crypto investor" / "an SMSF planner" — basic a/an selection. */
function withArticle(noun: string): string {
  const article = /^[aeiou]/i.test(noun) ? "an" : "a";
  return `${article} ${noun}`;
}

/**
 * The "what you told us" chips, strongest signal first. Each is a direct
 * echo of an answer band — budget, timeline, help preference, experience.
 */
function buildSignals(a: ActionPlanAnswers): ProfileSignal[] {
  const signals: ProfileSignal[] = [];

  const budget = str(a.budget_band);
  if (budget && BUDGET_SIGNAL_LABEL[budget]) {
    // "prefer_not" is the weakest signal — they declined to share.
    signals.push({
      name: "Budget",
      value: BUDGET_SIGNAL_LABEL[budget]!,
      strength: budget === "prefer_not" ? 1 : 3,
    });
  }

  const timeline = str(a.timeline);
  if (timeline && TIMELINE_SIGNAL_LABEL[timeline]) {
    signals.push({
      name: "Timeline",
      value: TIMELINE_SIGNAL_LABEL[timeline]!,
      // "now" is a decisive urgency signal; researching is the softest.
      strength: timeline === "now" ? 3 : timeline === "researching" ? 1 : 2,
    });
  }

  const help = str(a.help_preference);
  if (help && HELP_PREFERENCE_SIGNAL_LABEL[help]) {
    signals.push({
      name: "Help",
      value: HELP_PREFERENCE_SIGNAL_LABEL[help]!,
      strength: help === "not_sure_help" ? 1 : 2,
    });
  }

  const exp = str(a.experience);
  if (exp && EXPERIENCE_SIGNAL_LABEL[exp]) {
    signals.push({
      name: "Experience",
      value: EXPERIENCE_SIGNAL_LABEL[exp]!,
      strength: 2,
    });
  } else {
    const cx = str(a.complexity);
    if (cx && COMPLEXITY_SIGNAL_LABEL[cx]) {
      signals.push({
        name: "Situation",
        value: COMPLEXITY_SIGNAL_LABEL[cx]!,
        strength: 2,
      });
    }
  }

  // Strongest signals first so the chip row leads with the most decisive
  // facts; preserve insertion order within the same strength (stable sort).
  return signals
    .map((s, i) => ({ s, i }))
    .sort((x, y) => y.s.strength - x.s.strength || x.i - y.i)
    .map(({ s }) => s);
}
