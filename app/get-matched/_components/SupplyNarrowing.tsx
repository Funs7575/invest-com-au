"use client";

/**
 * SupplyNarrowing — Showcase G5 live supply counter for the question phase.
 *
 * Renders a small left-rail widget showing factual active-supply counts
 * (platforms · advisors · listings) that narrow as the user answers. The
 * counts come from GET /api/get-matched/supply (cached, fail-soft). As the
 * inferred vertical / advisor-type sharpen, the widget re-fetches (debounced)
 * and animates the numbers toward the new totals.
 *
 * Compliance: these are FACTUAL supply counts. No advice, no endorsement —
 * "matching your answers so far" is a filter description, not a recommendation.
 *
 * Fail-soft: any non-200 / fetch error hides the widget entirely.
 */

import { useEffect, useRef, useState } from "react";

import type { ActionPlanAnswers } from "@/lib/getmatched/types";
import { inferVertical, inferAdvisorType } from "@/lib/getmatched/inference";

interface SupplyCounts {
  platforms: number;
  advisors: number;
  listings: number;
}

/** Map the engine's `AdvisorType` (snake_case) → the quiz need-slug
 *  (kebab-case) the supply endpoint expects for `dbTypeForNeed`. */
const ADVISOR_TYPE_TO_NEED: Record<string, string> = {
  financial_planner: "financial-planner",
  mortgage_broker: "mortgage-broker",
  buyers_agent: "buyers-agent",
  tax_agent: "tax-agent",
  smsf_accountant: "smsf-accountant",
  lawyer: "not-sure", // no lawyer need-slug in the registry → match broadly
  not_sure: "not-sure",
};

const REDUCE_MOTION =
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** A single count that tweens toward `value`. */
function CountValue({ value }: { value: number | null }) {
  const [display, setDisplay] = useState<number | null>(value);
  const prev = useRef<number | null>(value);

  useEffect(() => {
    if (value === null) {
      setDisplay(null);
      return;
    }
    const from = prev.current ?? value;
    prev.current = value;
    if (REDUCE_MOTION || from === value) {
      setDisplay(value);
      return;
    }
    const steps = 16;
    let frame = 0;
    const iv = setInterval(() => {
      frame++;
      setDisplay(Math.round(from + ((value - from) * frame) / steps));
      if (frame >= steps) {
        setDisplay(value);
        clearInterval(iv);
      }
    }, 28);
    return () => clearInterval(iv);
  }, [value]);

  if (display === null) return <span className="tabular-nums">—</span>;
  return <span className="tabular-nums">{display.toLocaleString("en-AU")}</span>;
}

export default function SupplyNarrowing({
  answers,
}: {
  answers: ActionPlanAnswers;
}) {
  const [counts, setCounts] = useState<SupplyCounts | null>(null);
  const [hidden, setHidden] = useState(false);

  const vertical = inferVertical(answers);
  const advisorTypeRaw = answers.intent ? inferAdvisorType(answers) : null;
  const advisorNeed = advisorTypeRaw
    ? ADVISOR_TYPE_TO_NEED[advisorTypeRaw] ?? null
    : null;
  const hasAnswers = Object.keys(answers).some(
    (k) => answers[k] !== undefined && answers[k] !== null && answers[k] !== "",
  );

  // Debounced fetch keyed on the inferred filters.
  useEffect(() => {
    const params = new URLSearchParams();
    if (vertical) params.set("vertical", vertical);
    if (advisorNeed && advisorNeed !== "not-sure") {
      params.set("advisor_type", advisorNeed);
    }
    const qs = params.toString();

    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/get-matched/supply${qs ? `?${qs}` : ""}`, {
        signal: ctrl.signal,
      })
        .then((res) => {
          if (!res.ok) throw new Error(String(res.status));
          return res.json() as Promise<SupplyCounts>;
        })
        .then((data) => {
          if (
            typeof data.platforms === "number" &&
            typeof data.advisors === "number" &&
            typeof data.listings === "number"
          ) {
            setCounts(data);
          }
        })
        .catch((err) => {
          if (err?.name === "AbortError") return;
          // Fail silent — hide the widget if we never got a first count.
          setCounts((c) => {
            if (c === null) setHidden(true);
            return c;
          });
        });
    }, 350);

    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [vertical, advisorNeed]);

  if (hidden || counts === null) return null;

  return (
    <div
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      aria-live="polite"
    >
      <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-3">
        Live supply
      </p>
      <dl className="space-y-2">
        <div className="flex items-baseline justify-between">
          <dt className="text-xs text-slate-600">Platforms</dt>
          <dd className="text-lg font-extrabold text-slate-900">
            <CountValue value={counts.platforms} />
          </dd>
        </div>
        <div className="flex items-baseline justify-between">
          <dt className="text-xs text-slate-600">Verified advisors</dt>
          <dd className="text-lg font-extrabold text-slate-900">
            <CountValue value={counts.advisors} />
          </dd>
        </div>
        <div className="flex items-baseline justify-between">
          <dt className="text-xs text-slate-600">Listings</dt>
          <dd className="text-lg font-extrabold text-slate-900">
            <CountValue value={counts.listings} />
          </dd>
        </div>
      </dl>
      <p className="text-[11px] text-slate-500 mt-3">
        {hasAnswers
          ? "Matching your answers so far — factual counts, not a recommendation."
          : "Active supply across the platform right now."}
      </p>
    </div>
  );
}
