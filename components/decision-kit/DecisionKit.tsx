"use client";

import Icon from "@/components/Icon";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import type { RespondentRow } from "@/lib/decision-kit/respondents";
import type { CallScript } from "@/lib/decision-kit/scripts";
import type { ScorecardCriteria } from "@/lib/decision-kit/scorecards";
import RespondentMatrix from "./RespondentMatrix";
import CallScripts from "./CallScripts";
import ScorecardWorkspace, { type ScorecardRespondent } from "./ScorecardWorkspace";

/**
 * The Decision Kit — assembled for the consumer once responses are in. Helps
 * them decide between the SPECIFIC advisers who responded:
 *   1. a factual side-by-side comparison of the respondents,
 *   2. printable per-service intro-call questions,
 *   3. (flag-gated) post-call scorecards + a weighted "your scores" summary.
 *
 * General-information framing throughout — no recommendation of any adviser.
 */

interface InitialScorecard {
  professionalId: number;
  criteria: ScorecardCriteria;
  notes: string | null;
  overall: number | null;
}

interface Props {
  /** advisor_auctions.slug — the brief or quote. */
  slug: string;
  /** Verified owner email, or null when the viewer isn't the verified owner. */
  contactEmail: string | null;
  respondents: RespondentRow[];
  script: CallScript;
  /** Quote vs accepted-brief framing for the amount column. */
  amountLabel?: string;
  /** When true, scorecards + summary render (decision_kit flag on). */
  scorecardsEnabled: boolean;
  initialScorecards: InitialScorecard[];
}

export default function DecisionKit({
  slug,
  contactEmail,
  respondents,
  script,
  amountLabel = "Quote",
  scorecardsEnabled,
  initialScorecards,
}: Props) {
  if (respondents.length === 0) return null;

  const scorecardRespondents: ScorecardRespondent[] = respondents.map((r) => ({
    professionalId: r.professionalId,
    name: r.name,
  }));

  const showScorecards = scorecardsEnabled && !!contactEmail;

  return (
    <div className="space-y-4">
      {/* Heading + framing */}
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4">
        <p className="flex items-center gap-2 text-base font-bold text-slate-900">
          <Icon name="clipboard-list" size={18} className="text-amber-500" />
          Decision kit
        </p>
        <p className="mt-1 text-xs leading-relaxed text-slate-600">
          A factual side-by-side of everyone who responded, sharp questions for your
          intro calls, and {showScorecards ? "a place to score each call." : "a structured way to weigh them up."}{" "}
          This compares the people who responded to you — it isn&apos;t a recommendation.
        </p>
      </div>

      {/* 1. Respondent comparison matrix */}
      <div>
        <h2 className="mb-2 px-1 text-sm font-bold uppercase tracking-wide text-slate-500">
          Compare your responses
        </h2>
        <RespondentMatrix respondents={respondents} amountLabel={amountLabel} />
        <p className="mt-2 px-1 text-[11px] leading-relaxed text-slate-400">
          Metrics shown only where data exists; blanks mean we don&apos;t have that
          signal yet, not a negative. {GENERAL_ADVICE_WARNING}
        </p>
      </div>

      {/* 2. Intro-call scripts */}
      <CallScripts script={script} />

      {/* 3. Scorecards + weighted summary (flag-gated, owner-only) */}
      {showScorecards ? (
        <ScorecardWorkspace
          slug={slug}
          contactEmail={contactEmail}
          respondents={scorecardRespondents}
          initialScorecards={initialScorecards}
        />
      ) : scorecardsEnabled && !contactEmail ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-xs text-slate-500">
          Verify with the email you used to post, above, to score your intro calls and
          see your weighted comparison.
        </div>
      ) : null}
    </div>
  );
}
