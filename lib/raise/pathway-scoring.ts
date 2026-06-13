/**
 * Funding Pathway Finder — pure scoring engine (CR-01).
 *
 * Takes the quiz answers and ranks the seven funding pathways with
 * transparent reasons and honest cautions. Recommends pathway
 * CATEGORIES only — never specific products, providers or offers
 * (INFO 269 factual posture; see CAPITAL_RAISING_OPPORTUNITIES.md §2).
 *
 * Design rules:
 *  - "not sure" is a first-class answer everywhere → contributes 0,
 *    never penalises.
 *  - Hard regime gates (e.g. CSF needs a company under the $25M caps)
 *    mark a pathway ineligible with the factual reason, rather than
 *    silently hiding it.
 *  - Every score movement records a human-readable reason so result
 *    cards can show "why this fits" without hardcoded generic copy.
 */

import { PATHWAY_IDS, type PathwayId } from "./pathways";

export type Structure = "company" | "sole_trader" | "partnership_trust" | "not_started";
export type Stage = "idea" | "pre_revenue" | "early_revenue" | "growing" | "established";
export type RevenueBand = "none" | "under_100k" | "100k_1m" | "1m_5m" | "5m_25m" | "over_25m";
export type AmountBand = "under_50k" | "50k_250k" | "250k_1m" | "1m_5m" | "over_5m";
export type Timeline = "urgent" | "three_six" | "six_twelve" | "flexible";
export type EquityStance = "keep_full" | "open" | "prefer_equity" | "not_sure";
export type RdActivity = "novel" | "incremental" | "none" | "not_sure";
export type SecurityAssets = "hard_assets" | "receivables" | "none" | "not_sure";
export type Audience = "consumer_fans" | "b2b" | "no_customers" | "not_sure";
export type ExitStance = "grow" | "open_to_sale" | "exit_now" | "not_sure";

export interface PathwayAnswers {
  structure: Structure;
  stage: Stage;
  revenue: RevenueBand;
  amount: AmountBand;
  timeline: Timeline;
  equity: EquityStance;
  rd: RdActivity;
  security: SecurityAssets;
  audience: Audience;
  exit: ExitStance;
}

export type FitBand = "strong" | "possible" | "long_shot";

export interface PathwayScore {
  pathway: PathwayId;
  /** 0–100 after clamping. Ineligible pathways score 0. */
  score: number;
  fit: FitBand;
  eligible: boolean;
  /** Why this pathway fits — answer-driven, shown as bullets. */
  reasons: string[];
  /** Honest friction/regime cautions — shown alongside, never hidden. */
  cautions: string[];
}

const clamp = (n: number): number => Math.max(0, Math.min(100, Math.round(n)));

const fitFor = (score: number, eligible: boolean): FitBand => {
  if (!eligible) return "long_shot";
  if (score >= 55) return "strong";
  if (score >= 30) return "possible";
  return "long_shot";
};

interface Tally {
  score: number;
  eligible: boolean;
  reasons: string[];
  cautions: string[];
}

const newTally = (): Tally => ({ score: 0, eligible: true, reasons: [], cautions: [] });

const add = (t: Tally, points: number, reason?: string): void => {
  t.score += points;
  if (reason && points > 0) t.reasons.push(reason);
};

const caution = (t: Tally, note: string): void => {
  t.cautions.push(note);
};

const ineligible = (t: Tally, why: string): void => {
  t.eligible = false;
  t.cautions.unshift(why);
};

const hasRevenue = (r: RevenueBand): boolean => r !== "none";

export function scorePathways(a: PathwayAnswers): PathwayScore[] {
  const tallies: Record<PathwayId, Tally> = {
    grants: newTally(),
    debt: newTally(),
    csf: newTally(),
    angel: newTally(),
    vc: newTally(),
    bootstrap: newTally(),
    sale: newTally(),
  };

  // ── Grants ────────────────────────────────────────────────────────
  {
    const t = tallies.grants;
    add(t, 10); // floor: most trading businesses qualify for something
    if (a.rd === "novel") add(t, 45, "Genuinely novel R&D is the strongest grant signal (R&D Tax Incentive)");
    if (a.rd === "incremental") add(t, 22, "Documented experimental work can still qualify for the R&D Tax Incentive");
    if (a.structure === "company") add(t, 8, "Company structure suits the major federal programs");
    if (a.revenue === "over_25m") caution(t, "Several flagship programs taper or cap above ~$20–25M turnover — check per program");
    if (a.timeline === "urgent") caution(t, "Grants reimburse or offset after spend — they rarely solve an urgent cash gap");
    if (hasRevenue(a.revenue)) add(t, 5, "Trading history makes applications easier to evidence");
  }

  // ── Debt ──────────────────────────────────────────────────────────
  {
    const t = tallies.debt;
    if (a.revenue === "100k_1m") add(t, 25, "Established revenue supports serviceability");
    if (a.revenue === "1m_5m") add(t, 35, "Solid revenue gives lenders confidence");
    if (a.revenue === "5m_25m" || a.revenue === "over_25m") add(t, 40, "Strong revenue opens most debt products");
    if (a.revenue === "under_100k") add(t, 8);
    if (a.security === "hard_assets") add(t, 25, "Hard assets unlock secured lending at better rates");
    if (a.security === "receivables") add(t, 18, "Receivables/equipment suit invoice and asset finance");
    if (a.equity === "keep_full") add(t, 18, "Debt raises capital without giving up any ownership");
    if (a.timeline === "urgent") add(t, 15, "Debt is the fastest pathway when documents are ready");
    if (a.stage === "idea" || (!hasRevenue(a.revenue) && a.security === "none")) {
      ineligible(t, "Lenders generally need trading revenue or security — pre-revenue businesses rarely qualify");
    } else if (!hasRevenue(a.revenue)) {
      caution(t, "Without revenue, expect security and personal guarantees to do the heavy lifting");
    }
    if (a.stage === "pre_revenue") caution(t, "Repayments start immediately — debt strains pre-revenue cash flow");
  }

  // ── Equity crowdfunding (CSF) ─────────────────────────────────────
  {
    const t = tallies.csf;
    if (a.structure !== "company") {
      ineligible(t, "CSF is only open to eligible Australian companies — you'd incorporate first");
    }
    if (a.revenue === "over_25m") {
      ineligible(t, "CSF caps eligibility at under $25M consolidated gross assets and revenue");
    }
    if (a.audience === "consumer_fans") add(t, 40, "An engaged customer community is the #1 predictor of CSF success");
    if (a.audience === "b2b") add(t, 8);
    if (a.audience === "no_customers") caution(t, "CSF campaigns convert existing fans — without customers it's a cold start");
    if (a.amount === "250k_1m") add(t, 28, "Your target sits in the CSF sweet spot ($250k–$1M)");
    if (a.amount === "50k_250k") add(t, 14, "Smaller raises run on CSF, though fixed costs bite below ~$200k");
    if (a.amount === "1m_5m") add(t, 22, "Large CSF raises happen — $5M per 12 months is the legal cap");
    if (a.amount === "over_5m") caution(t, "CSF is capped at $5M per 12 months — you'd need to stage or combine pathways");
    if (a.equity === "open" || a.equity === "prefer_equity") add(t, 15, "You're open to equity — CSF trades shares for community capital");
    if (a.equity === "keep_full") caution(t, "CSF means hundreds of new shareholders — at odds with keeping full ownership");
    if (a.stage === "early_revenue" || a.stage === "growing") add(t, 12, "Traction plus headroom is the classic CSF profile");
    if (a.timeline === "urgent") caution(t, "A proper CSF campaign takes 3–6 months end to end");
  }

  // ── Angel / private investors ─────────────────────────────────────
  {
    const t = tallies.angel;
    if (a.structure === "sole_trader" || a.structure === "partnership_trust") {
      caution(t, "Investors need shares to buy — most angels will expect you to incorporate");
    }
    if (a.stage === "idea" || a.stage === "pre_revenue") add(t, 20, "Angels back teams before institutions will");
    if (a.stage === "early_revenue") add(t, 18, "Early traction is prime angel territory");
    if (a.amount === "50k_250k") add(t, 28, "Your target matches typical angel cheques");
    if (a.amount === "250k_1m") add(t, 22, "A syndicate of angels can cover this range");
    if (a.amount === "under_50k") add(t, 10);
    if (a.equity === "prefer_equity") add(t, 22, "You want aligned equity partners — exactly what angels are");
    if (a.equity === "open") add(t, 14, "You're open to equity in exchange for backing and experience");
    if (a.equity === "keep_full") caution(t, "Angel money is equity money — it dilutes ownership");
    if (a.rd === "novel") add(t, 10, "A novel edge gives angels a story worth backing");
    if (a.amount === "over_5m") caution(t, "Beyond ~$1–2M you're really raising from funds, not individuals");
  }

  // ── Venture capital ───────────────────────────────────────────────
  {
    const t = tallies.vc;
    if (a.structure !== "company") {
      ineligible(t, "VC requires a company able to issue preference shares and run an ESOP");
    }
    if (a.amount === "1m_5m") add(t, 30, "Your round size matches seed/Series A cheques");
    if (a.amount === "over_5m") add(t, 35, "Rounds this size are institutional territory");
    if (a.amount === "under_50k" || a.amount === "50k_250k") {
      caution(t, "VC funds rarely write cheques this small — angels fit better at this size");
    }
    if (a.rd === "novel") add(t, 18, "Defensible technology is what venture funds underwrite");
    if (a.stage === "growing") add(t, 20, "Demonstrated growth is the strongest VC signal");
    if (a.stage === "early_revenue") add(t, 12, "Early revenue with steep growth fits seed funds");
    if (a.revenue === "1m_5m" || a.revenue === "5m_25m") add(t, 12, "Revenue scale supports an institutional story");
    if (a.equity === "prefer_equity") add(t, 18, "You're optimising for speed over ownership — the VC trade");
    if (a.equity === "open") add(t, 10);
    if (a.equity === "keep_full") caution(t, "VC typically takes 15–25% per round — incompatible with keeping full ownership");
    if (a.timeline === "urgent") caution(t, "Institutional rounds take 3–9 months — too slow for urgent needs");
    if (a.audience === "consumer_fans" || a.audience === "b2b") add(t, 5);
  }

  // ── Bootstrap / revenue funding ───────────────────────────────────
  {
    const t = tallies.bootstrap;
    add(t, 12); // always a valid floor
    if (a.equity === "keep_full") add(t, 25, "Keeps every share and every decision yours");
    if (hasRevenue(a.revenue)) add(t, 15, "Existing revenue can be reinvested without dilution or interest");
    if (a.amount === "under_50k") add(t, 22, "Smaller capital needs are often closable through revenue and pre-sales");
    if (a.amount === "50k_250k") add(t, 8);
    if (a.timeline === "flexible") add(t, 10, "A flexible timeline removes the main cost of bootstrapping — speed");
    if (a.amount === "1m_5m" || a.amount === "over_5m") {
      caution(t, "Needs this size usually outrun customer cash flow alone");
    }
  }

  // ── Sale / exit ───────────────────────────────────────────────────
  {
    const t = tallies.sale;
    if (a.exit === "exit_now") add(t, 50, "You want liquidity now — a sale converts built value into capital");
    if (a.exit === "open_to_sale") add(t, 35, "Openness to a full or partial sale makes exit a real pathway");
    if (a.exit === "grow") {
      ineligible(t, "You're focused on growth — a sale isn't the pathway right now");
    }
    if (a.stage === "established") add(t, 15, "Established operations are what buyers pay for");
    if (a.revenue === "1m_5m" || a.revenue === "5m_25m" || a.revenue === "over_25m") {
      add(t, 12, "Meaningful revenue widens the buyer pool");
    }
    if (a.stage === "idea" || a.stage === "pre_revenue") {
      caution(t, "Pre-revenue businesses rarely sell for meaningful value — build transferable value first");
    }
  }

  return PATHWAY_IDS.map((id): PathwayScore => {
    const t = tallies[id];
    const score = t.eligible ? clamp(t.score) : 0;
    return {
      pathway: id,
      score,
      fit: fitFor(score, t.eligible),
      eligible: t.eligible,
      reasons: t.reasons.slice(0, 4),
      cautions: t.cautions.slice(0, 3),
    };
  }).sort((x, y) => y.score - x.score);
}
