"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import HubLeadForm from "@/components/leads/HubLeadForm";
import { useCalculatorState } from "@/hooks/use-calculator-state";
import {
  scorePathways,
  type PathwayAnswers,
} from "@/lib/raise/pathway-scoring";
import { PATHWAYS } from "@/lib/raise/pathways";
import {
  CAPITAL_RAISING_NOTE,
  CAPITAL_RAISING_NOTE_SHORT,
} from "@/lib/compliance";

type AnswerKey = keyof PathwayAnswers;
type PartialAnswers = Partial<PathwayAnswers>;

interface QOption {
  value: string;
  label: string;
  hint?: string;
}

interface Q {
  id: AnswerKey;
  question: string;
  microcopy?: string;
  options: QOption[];
}

const QUESTIONS: Q[] = [
  {
    id: "structure",
    question: "How is the business set up today?",
    microcopy: "Structure decides which pathways are even open — equity pathways need a company that can issue shares.",
    options: [
      { value: "company", label: "Pty Ltd company" },
      { value: "sole_trader", label: "Sole trader" },
      { value: "partnership_trust", label: "Partnership or trust" },
      { value: "not_started", label: "Haven't set up yet" },
    ],
  },
  {
    id: "stage",
    question: "What stage are you at?",
    options: [
      { value: "idea", label: "Idea — nothing built yet" },
      { value: "pre_revenue", label: "Building, no revenue yet" },
      { value: "early_revenue", label: "First customers and revenue" },
      { value: "growing", label: "Growing fast" },
      { value: "established", label: "Established and stable" },
    ],
  },
  {
    id: "revenue",
    question: "Annual revenue?",
    microcopy: "Bands only — this stays on your device unless you choose to talk to someone.",
    options: [
      { value: "none", label: "None yet" },
      { value: "under_100k", label: "Under $100k" },
      { value: "100k_1m", label: "$100k – $1M" },
      { value: "1m_5m", label: "$1M – $5M" },
      { value: "5m_25m", label: "$5M – $25M" },
      { value: "over_25m", label: "Over $25M" },
    ],
  },
  {
    id: "amount",
    question: "How much capital are you looking for?",
    options: [
      { value: "under_50k", label: "Under $50k" },
      { value: "50k_250k", label: "$50k – $250k" },
      { value: "250k_1m", label: "$250k – $1M" },
      { value: "1m_5m", label: "$1M – $5M" },
      { value: "over_5m", label: "Over $5M" },
    ],
  },
  {
    id: "timeline",
    question: "When do you need it?",
    microcopy: "Pathways differ wildly on speed — debt can land in days; institutional rounds take months.",
    options: [
      { value: "urgent", label: "ASAP — within 3 months" },
      { value: "three_six", label: "3 – 6 months" },
      { value: "six_twelve", label: "6 – 12 months" },
      { value: "flexible", label: "Flexible — when it's right" },
    ],
  },
  {
    id: "equity",
    question: "How do you feel about selling equity?",
    options: [
      { value: "keep_full", label: "I want to keep full ownership" },
      { value: "open", label: "Open to it for the right partner" },
      { value: "prefer_equity", label: "Prefer equity — I want backers, not repayments" },
      { value: "not_sure", label: "Not sure yet" },
    ],
  },
  {
    id: "rd",
    question: "Are you building anything genuinely new or experimental?",
    microcopy: "Novel technical work is the strongest signal for R&D incentives and investor interest.",
    options: [
      { value: "novel", label: "Yes — novel tech, product or process" },
      { value: "incremental", label: "Incremental improvements" },
      { value: "none", label: "No — proven model, well executed" },
      { value: "not_sure", label: "Not sure what counts" },
    ],
  },
  {
    id: "security",
    question: "Does the business own assets a lender could secure against?",
    options: [
      { value: "hard_assets", label: "Yes — property, vehicles or major equipment" },
      { value: "receivables", label: "Invoices / receivables / stock" },
      { value: "none", label: "No meaningful assets" },
      { value: "not_sure", label: "Not sure" },
    ],
  },
  {
    id: "audience",
    question: "Who are your customers?",
    microcopy: "Equity crowdfunding works best when an engaged community would love to own a piece of you.",
    options: [
      { value: "consumer_fans", label: "Consumers — and they genuinely love us" },
      { value: "b2b", label: "Mostly other businesses" },
      { value: "no_customers", label: "No customers yet" },
      { value: "not_sure", label: "Somewhere in between" },
    ],
  },
  {
    id: "exit",
    question: "Where do you want this to end up?",
    options: [
      { value: "grow", label: "Grow it — I'm not selling" },
      { value: "open_to_sale", label: "Open to selling some or all of it" },
      { value: "exit_now", label: "I want to exit / get liquidity now" },
      { value: "not_sure", label: "Haven't decided" },
    ],
  },
];

const isComplete = (a: PartialAnswers): a is PathwayAnswers =>
  QUESTIONS.every((q) => typeof a[q.id] === "string");

function fitPill(fit: "strong" | "possible" | "long_shot", eligible: boolean) {
  if (!eligible) {
    return (
      <span className="inline-block text-[10px] uppercase tracking-wider font-extrabold border rounded-full px-2 py-0.5 bg-slate-100 text-slate-600 border-slate-200">
        Not eligible yet
      </span>
    );
  }
  const map = {
    strong: "bg-emerald-100 text-emerald-800 border-emerald-200",
    possible: "bg-amber-100 text-amber-800 border-amber-200",
    long_shot: "bg-slate-100 text-slate-600 border-slate-200",
  } as const;
  const label = { strong: "Strong fit", possible: "Worth exploring", long_shot: "Long shot" } as const;
  return (
    <span className={`inline-block text-[10px] uppercase tracking-wider font-extrabold border rounded-full px-2 py-0.5 ${map[fit]}`}>
      {label[fit]}
    </span>
  );
}

export default function PathwayFinderClient() {
  const {
    value: persisted,
    setValue: setPersisted,
    isHydrated,
  } = useCalculatorState<PartialAnswers>("raise_pathway_finder", {});

  // Keyed remount on hydration: the inner quiz derives its initial state
  // (answers, resume position, done) once from storage via lazy useState —
  // no state-syncing effects, no hydration mismatch (the SSR pass renders
  // the empty quiz, then remounts with saved progress when storage loads).
  return (
    <PathwayFinderInner
      key={isHydrated ? "hydrated" : "ssr"}
      initial={isHydrated ? persisted : {}}
      onPersist={setPersisted}
    />
  );
}

function PathwayFinderInner({
  initial,
  onPersist,
}: {
  initial: PartialAnswers;
  onPersist: (a: PartialAnswers) => void;
}) {
  const [answers, setAnswers] = useState<PartialAnswers>(() => initial);
  const [step, setStep] = useState(() => {
    if (isComplete(initial)) return QUESTIONS.length;
    const firstUnanswered = QUESTIONS.findIndex((q) => typeof initial[q.id] !== "string");
    return firstUnanswered === -1 ? 0 : firstUnanswered;
  });
  const [done, setDone] = useState(() => isComplete(initial));
  const [editing, setEditing] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (Object.keys(answers).length > 0) onPersist(answers);
  }, [answers, onPersist]);

  // Move screen-reader/keyboard focus to the question as steps change.
  useEffect(() => {
    if (!done) headingRef.current?.focus();
  }, [step, done]);

  const results = useMemo(
    () => (done && isComplete(answers) ? scorePathways(answers) : []),
    [done, answers],
  );

  function answer(q: Q, value: string) {
    const next = { ...answers, [q.id]: value };
    setAnswers(next);
    if (editing && isComplete(next)) {
      setEditing(false);
      setDone(true);
      setStep(QUESTIONS.length);
      return;
    }
    if (step < QUESTIONS.length - 1) {
      setStep(step + 1);
    } else if (isComplete(next)) {
      setDone(true);
    }
  }

  function editAnswer(id: AnswerKey) {
    const idx = QUESTIONS.findIndex((q) => q.id === id);
    if (idx === -1) return;
    setEditing(true);
    setDone(false);
    setStep(idx);
  }

  function reset() {
    setAnswers({});
    onPersist({});
    setStep(0);
    setDone(false);
    setEditing(false);
  }

  if (done && results.length > 0) {
    const top = results[0];
    const runnersUp = results.slice(1, 3);
    const rest = results.slice(3);

    return (
      <div className="space-y-6">
        {/* Answer summary — every answer is editable from here */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wider font-extrabold text-slate-500 mb-2">Your answers</p>
          <ul className="flex flex-wrap gap-1.5">
            {QUESTIONS.map((q) => {
              const v = answers[q.id];
              const opt = q.options.find((o) => o.value === v);
              return (
                <li key={q.id}>
                  <button
                    type="button"
                    onClick={() => editAnswer(q.id)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-full px-2.5 py-1 hover:border-amber-300 hover:bg-amber-50"
                    aria-label={`Change answer: ${q.question} — currently ${opt?.label ?? "unanswered"}`}
                  >
                    {opt?.label ?? "—"}
                    <Icon name="edit-3" size={11} className="text-slate-500" aria-hidden />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <p className="text-xs text-slate-600">{CAPITAL_RAISING_NOTE_SHORT}</p>

        {/* Top match */}
        {top && (
          <div className="rounded-2xl border-2 border-amber-300 bg-white p-6 md:p-8 shadow-sm">
            <div className="flex items-start justify-between gap-3 mb-1">
              <p className="text-xs uppercase tracking-wider font-extrabold text-amber-600">Best-fit pathway</p>
              {fitPill(top.fit, top.eligible)}
            </div>
            <div className="flex items-center gap-3 mb-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <Icon name={PATHWAYS[top.pathway].icon} size={20} aria-hidden />
              </span>
              <h2 className="text-2xl font-extrabold text-slate-900">{PATHWAYS[top.pathway].label}</h2>
            </div>
            <p className="text-sm text-slate-700 mb-4">{PATHWAYS[top.pathway].definition}</p>

            {top.reasons.length > 0 && (
              <div className="mb-4">
                <p className="text-xs uppercase tracking-wider font-extrabold text-slate-500 mb-1.5">Why this fits you</p>
                <ul className="space-y-1.5">
                  {top.reasons.map((r) => (
                    <li key={r} className="flex items-start gap-2 text-sm text-slate-800">
                      <Icon name="check-circle" size={15} className="text-emerald-600 mt-0.5 shrink-0" aria-hidden />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {top.cautions.length > 0 && (
              <div className="mb-4">
                <p className="text-xs uppercase tracking-wider font-extrabold text-slate-500 mb-1.5">Worth knowing</p>
                <ul className="space-y-1.5">
                  {top.cautions.map((c) => (
                    <li key={c} className="flex items-start gap-2 text-sm text-slate-700">
                      <Icon name="alert-triangle" size={15} className="text-amber-600 mt-0.5 shrink-0" aria-hidden />
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid sm:grid-cols-3 gap-3 mb-5 text-sm">
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                <p className="text-[11px] uppercase tracking-wider font-extrabold text-slate-500">Typical amounts</p>
                <p className="font-bold text-slate-900 mt-0.5">{PATHWAYS[top.pathway].typicalAmounts}</p>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                <p className="text-[11px] uppercase tracking-wider font-extrabold text-slate-500">Timeline</p>
                <p className="font-bold text-slate-900 mt-0.5">{PATHWAYS[top.pathway].typicalTimeline}</p>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                <p className="text-[11px] uppercase tracking-wider font-extrabold text-slate-500">What it costs</p>
                <p className="font-bold text-slate-900 mt-0.5">{PATHWAYS[top.pathway].cost}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {PATHWAYS[top.pathway].nextSteps.map((s, i) => (
                <Link
                  key={s.href}
                  href={s.href}
                  className={
                    i === 0
                      ? "inline-flex items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-extrabold px-4 py-2.5"
                      : "inline-flex items-center gap-1.5 rounded-lg border border-slate-300 hover:border-amber-400 text-slate-800 text-sm font-bold px-4 py-2.5"
                  }
                >
                  {s.label}
                  <Icon name="arrow-right" size={14} aria-hidden />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Runners-up */}
        {runnersUp.length > 0 && (
          <div className="grid md:grid-cols-2 gap-4">
            {runnersUp.map((r) => (
              <div key={r.pathway} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <Icon name={PATHWAYS[r.pathway].icon} size={16} className="text-slate-600" aria-hidden />
                    <h3 className="font-extrabold text-slate-900">{PATHWAYS[r.pathway].label}</h3>
                  </div>
                  {fitPill(r.fit, r.eligible)}
                </div>
                {r.reasons[0] && (
                  <p className="text-sm text-slate-700 mb-1.5 flex items-start gap-2">
                    <Icon name="check-circle" size={14} className="text-emerald-600 mt-0.5 shrink-0" aria-hidden />
                    {r.reasons[0]}
                  </p>
                )}
                {r.cautions[0] && (
                  <p className="text-sm text-slate-600 mb-2 flex items-start gap-2">
                    <Icon name="alert-triangle" size={14} className="text-amber-600 mt-0.5 shrink-0" aria-hidden />
                    {r.cautions[0]}
                  </p>
                )}
                <Link
                  href={`/raise/${PATHWAYS[r.pathway].guideSlug}`}
                  className="text-sm font-bold text-amber-600 hover:underline inline-flex items-center gap-1"
                >
                  Read the guide <Icon name="arrow-right" size={13} aria-hidden />
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* The rest, honestly ranked */}
        {rest.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wider font-extrabold text-slate-500 mb-3">Other pathways, ranked for you</p>
            <ul className="divide-y divide-slate-100">
              {rest.map((r) => (
                <li key={r.pathway} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 text-sm">{PATHWAYS[r.pathway].label}</p>
                    {!r.eligible && r.cautions[0] && (
                      <p className="text-xs text-slate-600 mt-0.5">{r.cautions[0]}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {fitPill(r.fit, r.eligible)}
                    <Link
                      href={`/raise/${PATHWAYS[r.pathway].guideSlug}`}
                      className="text-xs font-bold text-slate-600 hover:text-amber-600"
                    >
                      Guide
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-1.5 text-sm font-bold text-amber-600 hover:underline"
        >
          <Icon name="rotate-ccw" size={14} aria-hidden /> Start again
        </button>

        <HubLeadForm
          heading="Talk your funding plan through with a specialist"
          subheading="An accountant or adviser experienced in business funding can pressure-test the pathway, get your structure and numbers raise-ready, and sequence the next 90 days. Free to request, no obligation."
          intent={{ need: "tax", context: ["business_funding"] }}
          source={top ? `raise_pathway_finder:${top.pathway}` : "raise_pathway_finder"}
          ctaLabel="Get matched with a specialist"
          extraFields={[{ name: "company", label: "Business name (optional)" }]}
        />

        <p className="text-xs text-slate-600 leading-relaxed">{CAPITAL_RAISING_NOTE}</p>
      </div>
    );
  }

  const q = QUESTIONS[step];
  if (!q) return null;
  const progress = Math.round((step / QUESTIONS.length) * 100);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <p className="text-xs uppercase tracking-wider font-extrabold text-slate-500">
          Question {step + 1} of {QUESTIONS.length}
        </p>
        <p className="text-xs font-bold text-slate-500" aria-hidden>{progress}%</p>
      </div>
      <div className="h-1.5 w-full bg-slate-100 rounded-full mb-6 overflow-hidden" aria-hidden>
        <div className="h-full bg-amber-500 transition-all" style={{ width: `${progress}%` }} />
      </div>
      <h2 ref={headingRef} tabIndex={-1} className="text-xl md:text-2xl font-extrabold text-slate-900 mb-2 outline-none">
        {q.question}
      </h2>
      {q.microcopy && <p className="text-sm text-slate-600 mb-5">{q.microcopy}</p>}
      {!q.microcopy && <div className="mb-5" />}
      <div className="space-y-2">
        {q.options.map((o) => {
          const selected = answers[q.id] === o.value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => answer(q, o.value)}
              aria-pressed={selected}
              className={`w-full text-left px-4 py-3 rounded-lg border transition-colors flex items-center justify-between gap-2 ${
                selected
                  ? "border-amber-400 bg-amber-50"
                  : "border-slate-200 bg-slate-50 hover:bg-amber-50 hover:border-amber-300"
              }`}
            >
              <span>
                <span className="block text-sm font-bold text-slate-900">{o.label}</span>
                {o.hint && <span className="block text-xs text-slate-600 mt-0.5">{o.hint}</span>}
              </span>
              <Icon name="arrow-right" size={14} className="text-slate-500 shrink-0" aria-hidden />
            </button>
          );
        })}
      </div>
      <div className="mt-5 flex items-center justify-between">
        {step > 0 ? (
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900"
          >
            <Icon name="chevron-left" size={14} aria-hidden /> Back
          </button>
        ) : (
          <span />
        )}
        {editing && (
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setDone(true);
              setStep(QUESTIONS.length);
            }}
            className="text-sm font-bold text-slate-600 hover:text-slate-900"
          >
            Back to results
          </button>
        )}
      </div>
    </div>
  );
}
