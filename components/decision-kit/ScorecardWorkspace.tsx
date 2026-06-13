"use client";

import { useMemo, useState } from "react";
import Icon from "@/components/Icon";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import {
  SCORECARD_CRITERIA,
  SCORECARD_MAX,
  SCORECARD_NOTES_MAX,
  buildDecisionSummary,
  scorecardAverage,
  type ScorecardCriteria,
  type ScorecardCriterionKey,
} from "@/lib/decision-kit/scorecards";

/**
 * Post-call scorecards + the weighted decision summary (flag-gated).
 *
 * The consumer rates each respondent against the fixed criteria after an intro
 * call; ratings are saved via the API keyed by their email. The summary below
 * combines the scores into a plain "your scores" view and — only when one
 * respondent is clearly ahead — a soft "you lean toward…" line. It NEVER
 * auto-recommends; the choice stays explicitly the consumer's.
 */

export interface ScorecardRespondent {
  professionalId: number;
  name: string;
}

interface SavedScorecard {
  professionalId: number;
  criteria: ScorecardCriteria;
  notes: string | null;
  overall: number | null;
}

interface Props {
  slug: string;
  contactEmail: string;
  respondents: ScorecardRespondent[];
  initialScorecards: SavedScorecard[];
}

interface CardState {
  criteria: ScorecardCriteria;
  notes: string;
  saving: boolean;
  saved: boolean;
  error: string | null;
}

function StarRow({
  value,
  onPick,
  labelId,
}: {
  value: number | undefined;
  onPick: (n: number) => void;
  labelId: string;
}) {
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-labelledby={labelId}>
      {Array.from({ length: SCORECARD_MAX }, (_, i) => i + 1).map((n) => {
        const active = (value ?? 0) >= n;
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} out of ${SCORECARD_MAX}`}
            onClick={() => onPick(n)}
            className={`flex h-7 w-7 items-center justify-center rounded-md border text-xs font-bold transition-colors ${
              active
                ? "border-amber-400 bg-amber-400 text-slate-900"
                : "border-slate-200 bg-white text-slate-400 hover:border-amber-300"
            }`}
          >
            {n}
          </button>
        );
      })}
    </div>
  );
}

export default function ScorecardWorkspace({
  slug,
  contactEmail,
  respondents,
  initialScorecards,
}: Props) {
  const initialState = useMemo(() => {
    const map = new Map<number, CardState>();
    for (const r of respondents) {
      const saved = initialScorecards.find((s) => s.professionalId === r.professionalId);
      map.set(r.professionalId, {
        criteria: saved?.criteria ?? {},
        notes: saved?.notes ?? "",
        saving: false,
        saved: Boolean(saved),
        error: null,
      });
    }
    return map;
  }, [respondents, initialScorecards]);

  const [cards, setCards] = useState<Map<number, CardState>>(initialState);

  function update(proId: number, patch: Partial<CardState>) {
    setCards((prev) => {
      const next = new Map(prev);
      const cur = next.get(proId) ?? {
        criteria: {},
        notes: "",
        saving: false,
        saved: false,
        error: null,
      };
      next.set(proId, { ...cur, ...patch });
      return next;
    });
  }

  function setCriterion(proId: number, key: ScorecardCriterionKey, n: number) {
    const cur = cards.get(proId);
    update(proId, {
      criteria: { ...(cur?.criteria ?? {}), [key]: n },
      saved: false,
    });
  }

  async function save(proId: number) {
    const cur = cards.get(proId);
    if (!cur) return;
    update(proId, { saving: true, error: null });
    try {
      const res = await fetch("/api/decision-kit/scorecards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          contact_email: contactEmail,
          professional_id: proId,
          criteria: cur.criteria,
          notes: cur.notes.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Couldn't save.");
      update(proId, { saving: false, saved: true });
    } catch (err) {
      update(proId, {
        saving: false,
        error: err instanceof Error ? err.message : "Couldn't save.",
      });
    }
  }

  // Live decision summary from current (in-memory) scores.
  const summary = useMemo(() => {
    const cardArr = respondents.map((r) => ({
      professionalId: r.professionalId,
      criteria: cards.get(r.professionalId)?.criteria ?? {},
    }));
    return buildDecisionSummary(respondents, cardArr);
  }, [respondents, cards]);

  const leaderName =
    summary.leaderId != null
      ? respondents.find((r) => r.professionalId === summary.leaderId)?.name ?? null
      : null;

  return (
    <section
      aria-labelledby="scorecards-heading"
      className="rounded-2xl border border-slate-200 bg-white p-4"
    >
      <h3 id="scorecards-heading" className="text-base font-bold text-slate-900">
        Score your intro calls
      </h3>
      <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
        After each call, rate the adviser 1–{SCORECARD_MAX} on what matters to you. Your
        scores are private to you and only help you compare — they never decide for you.
      </p>

      <div className="mt-4 space-y-4">
        {respondents.map((r) => {
          const state = cards.get(r.professionalId);
          const avg = scorecardAverage({ criteria: state?.criteria ?? {} });
          const labelBase = `crit-${r.professionalId}`;
          return (
            <div
              key={r.professionalId}
              className="rounded-xl border border-slate-200 p-3.5"
            >
              <div className="mb-2.5 flex items-center justify-between gap-2">
                <p className="text-sm font-bold text-slate-900">{r.name}</p>
                {avg != null && (
                  <span className="rounded-full bg-slate-900 px-2.5 py-0.5 text-xs font-bold text-white">
                    {avg.toFixed(1)}
                  </span>
                )}
              </div>

              <div className="space-y-2">
                {SCORECARD_CRITERIA.map((c) => (
                  <div
                    key={c.key}
                    className="flex flex-wrap items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p
                        id={`${labelBase}-${c.key}`}
                        className="text-xs font-semibold text-slate-700"
                      >
                        {c.label}
                      </p>
                      <p className="text-[11px] text-slate-400">{c.hint}</p>
                    </div>
                    <StarRow
                      value={state?.criteria[c.key]}
                      onPick={(n) => setCriterion(r.professionalId, c.key, n)}
                      labelId={`${labelBase}-${c.key}`}
                    />
                  </div>
                ))}
              </div>

              <label className="mt-3 block">
                <span className="mb-1 block text-[11px] font-semibold text-slate-600">
                  Notes (optional)
                </span>
                <textarea
                  value={state?.notes ?? ""}
                  onChange={(e) =>
                    update(r.professionalId, { notes: e.target.value, saved: false })
                  }
                  maxLength={SCORECARD_NOTES_MAX}
                  rows={2}
                  placeholder="What stood out, gut feel, follow-ups…"
                  className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </label>

              <div className="mt-2 flex items-center justify-between gap-2">
                {state?.error ? (
                  <span role="alert" className="text-[11px] text-red-600">
                    {state.error}
                  </span>
                ) : state?.saved ? (
                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600">
                    <Icon name="check-circle" size={12} /> Saved
                  </span>
                ) : (
                  <span />
                )}
                <button
                  type="button"
                  onClick={() => save(r.professionalId)}
                  disabled={state?.saving}
                  className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {state?.saving ? "Saving…" : "Save scorecard"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Weighted decision summary */}
      {summary.scoredCount >= 1 && (
        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
          <p className="mb-2 flex items-center gap-1.5 text-sm font-bold text-slate-900">
            <Icon name="bar-chart-2" size={15} className="text-slate-500" />
            Your scores
          </p>
          <ul className="space-y-1.5">
            {summary.entries
              .filter((e) => e.average != null)
              .map((e) => (
                <li
                  key={e.professionalId}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="truncate text-slate-700">{e.name}</span>
                  <span className="flex items-center gap-2">
                    <span className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-200">
                      <span
                        className="block h-full rounded-full bg-amber-400"
                        style={{ width: `${((e.average as number) / SCORECARD_MAX) * 100}%` }}
                      />
                    </span>
                    <span className="w-8 text-right font-bold text-slate-900">
                      {(e.average as number).toFixed(1)}
                    </span>
                  </span>
                </li>
              ))}
          </ul>

          {summary.scoredCount >= 2 && (
            <p className="mt-3 text-xs leading-relaxed text-slate-600">
              {leaderName ? (
                <>
                  Your scores suggest you lean toward{" "}
                  <strong className="text-slate-900">{leaderName}</strong> — but this is
                  only your own tally, and the choice is entirely yours.
                </>
              ) : (
                <>Your top responses are scoring closely — they&apos;re hard to separate, so trust the details that matter most to you. The choice is yours.</>
              )}
            </p>
          )}

          <p className="mt-3 border-t border-slate-200 pt-2.5 text-[11px] leading-relaxed text-slate-400">
            {GENERAL_ADVICE_WARNING}
          </p>
        </div>
      )}
    </section>
  );
}
