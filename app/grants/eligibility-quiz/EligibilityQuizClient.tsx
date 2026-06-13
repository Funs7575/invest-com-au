"use client";

import { useEffect, useState, useMemo } from "react";
import Icon from "@/components/Icon";
import HubLeadForm from "@/components/leads/HubLeadForm";
import { useCalculatorState } from "@/hooks/use-calculator-state";

type Q = {
  id: string;
  question: string;
  options: { value: string; label: string }[];
};

const QUESTIONS: Q[] = [
  {
    id: "industry",
    question: "What best describes your business?",
    options: [
      { value: "tech",        label: "Tech / Software" },
      { value: "fintech",     label: "Fintech" },
      { value: "energy",      label: "Energy / Resources" },
      { value: "manufacturing", label: "Manufacturing" },
      { value: "other",       label: "Other" },
    ],
  },
  {
    id: "turnover",
    question: "Annual turnover?",
    options: [
      { value: "under_500k", label: "Under $500K" },
      { value: "500k_2m",    label: "$500K – $2M" },
      { value: "2m_20m",     label: "$2M – $20M" },
      { value: "over_20m",   label: "Over $20M" },
    ],
  },
  {
    id: "rd",
    question: "Are you doing anything genuinely new or experimental?",
    options: [
      { value: "novel",       label: "Yes — novel tech or algorithm" },
      { value: "incremental", label: "Incremental improvements" },
      { value: "none",        label: "No R&D" },
    ],
  },
  {
    id: "export",
    question: "Planning overseas expansion in the next 2 years?",
    options: [
      { value: "yes",   label: "Yes — trips, trade shows, overseas reps" },
      { value: "maybe", label: "Maybe" },
      { value: "no",    label: "No" },
    ],
  },
  {
    id: "state",
    question: "Which state are you based in?",
    options: [
      { value: "NSW",   label: "NSW" },
      { value: "VIC",   label: "VIC" },
      { value: "QLD",   label: "QLD" },
      { value: "WA",    label: "WA" },
      { value: "SA",    label: "SA" },
      { value: "other", label: "Other" },
    ],
  },
];

type Answers = Record<string, string>;

type GrantResult = {
  name: string;
  estimate: string;
  status: "eligible" | "likely" | "check" | "ineligible";
  why: string;
};

function evaluate(a: Answers): GrantResult[] {
  const results: GrantResult[] = [];

  // R&D Tax Incentive
  if (a.rd === "novel" && a.turnover !== "over_20m") {
    const est = a.turnover === "under_500k" ? "$30K–$80K"
      : a.turnover === "500k_2m" ? "$80K–$200K"
      : "$200K–$500K";
    results.push({ name: "R&D Tax Incentive", estimate: est, status: "eligible", why: "Refundable 43.5% offset on eligible R&D spend for sub-$20M turnover." });
  } else if (a.rd === "novel" && a.turnover === "over_20m") {
    results.push({ name: "R&D Tax Incentive", estimate: "Up to 38.5% offset", status: "eligible", why: "Non-refundable offset at >$20M turnover. Still meaningful tax shield." });
  } else if (a.rd === "incremental") {
    results.push({ name: "R&D Tax Incentive", estimate: "Possibly partial", status: "check", why: "Some incremental work qualifies if there's documented technical uncertainty. Worth checking with an advisor." });
  }

  // EMDG
  if (a.export === "yes" && a.turnover !== "over_20m") {
    const est = a.turnover === "under_500k" ? "Up to $30K/yr (Tier 1)"
      : a.turnover === "500k_2m" ? "Up to $50K/yr (Tier 2)"
      : "Up to $80K/yr (Tier 3)";
    results.push({ name: "EMDG", estimate: est, status: "eligible", why: "Reimbursement of overseas marketing spend up to 50%, capped by your tier." });
  } else if (a.export === "maybe") {
    results.push({ name: "EMDG", estimate: "Up to $50K/yr if you commit", status: "check", why: "Build the marketing plan, then apply once spend starts to accrue." });
  }

  // Industry Growth Program
  const igpSectors = new Set(["tech", "fintech", "energy", "manufacturing"]);
  if (igpSectors.has(a.industry || "") && a.rd === "novel") {
    results.push({ name: "Industry Growth Program", estimate: "$50K – $5M", status: "likely", why: "Priority sectors and novel tech are the right fit. Advisory step takes 4–8 weeks — start now." });
  }

  // NSW MVP Ventures
  if (a.state === "NSW" && (a.industry === "tech" || a.industry === "fintech") && a.turnover !== "over_20m") {
    results.push({ name: "NSW MVP Ventures", estimate: "$25K – $200K", status: "eligible", why: "Early-stage NSW tech founders building a minimum viable product." });
  }

  // Advance Queensland
  if (a.state === "QLD" && (a.industry === "tech" || a.industry === "fintech")) {
    results.push({ name: "Advance Queensland", estimate: "Varies by program", status: "check", why: "Multiple QLD programs — Ignite Ideas, Commercialisation, co-investment streams." });
  }

  // LaunchVic
  if (a.state === "VIC" && (a.industry === "tech" || a.industry === "fintech")) {
    results.push({ name: "LaunchVic", estimate: "Varies by program", status: "check", why: "VIC innovation grants and accelerator support for tech founders." });
  }

  // Fallback
  if (results.length === 0) {
    results.push({ name: "Federal grants overview", estimate: "Talk to a specialist", status: "check", why: "Your profile may still qualify for state-level grants we don't surface in this quick quiz." });
  }
  return results;
}

function statusPill(s: GrantResult["status"]) {
  const cls: Record<string, string> = {
    eligible:    "bg-emerald-100 text-emerald-800 border-emerald-200",
    likely:      "bg-emerald-100 text-emerald-800 border-emerald-200",
    check:       "bg-amber-100 text-amber-800 border-amber-200",
    ineligible:  "bg-slate-100 text-slate-700 border-slate-200",
  };
  const label: Record<string, string> = {
    eligible:    "✅ Likely eligible",
    likely:      "✅ Strong fit",
    check:       "⚠️ Check eligibility",
    ineligible:  "—",
  };
  return <span className={`inline-block text-[10px] uppercase tracking-wider font-extrabold border rounded-full px-2 py-0.5 ${cls[s]}`}>{label[s]}</span>;
}

export default function EligibilityQuizClient() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [done, setDone] = useState(false);
  const results = useMemo(() => (done ? evaluate(answers) : []), [done, answers]);

  // Persist answers across sessions for signed-in business-owner users
  // (W2 Phase 3). Anonymous users still get sessionStorage continuity via
  // the same hook. Stored under `grants_eligibility_quiz` so the
  // /business-portal/grants surface can read them later without re-prompt.
  const {
    value: persistedAnswers,
    setValue: setPersistedAnswers,
    isHydrated: persistHydrated,
  } = useCalculatorState<Answers>("grants_eligibility_quiz", {});

  useEffect(() => {
    if (!persistHydrated) return;
    if (persistedAnswers && Object.keys(persistedAnswers).length > 0) {
      setAnswers(persistedAnswers);
      // If the persisted answers cover every question, jump to results.
      if (QUESTIONS.every((q) => typeof persistedAnswers[q.id] === "string")) {
        setDone(true);
        setStep(QUESTIONS.length);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate once
  }, [persistHydrated]);

  useEffect(() => {
    if (Object.keys(answers).length > 0) {
      setPersistedAnswers(answers);
    }
  }, [answers, setPersistedAnswers]);

  function answer(q: Q, value: string) {
    const next = { ...answers, [q.id]: value };
    setAnswers(next);
    if (step < QUESTIONS.length - 1) {
      setStep(step + 1);
    } else {
      setDone(true);
    }
  }

  function reset() {
    setAnswers({});
    setPersistedAnswers({});
    setStep(0);
    setDone(false);
  }

  if (done) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
          <p className="text-xs uppercase tracking-wider font-extrabold text-amber-600 mb-1">Your results</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">Personalised grant opportunities</h2>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm" aria-label="Government grants eligibility">
              <thead>
                <tr className="bg-slate-50">
                  <th scope="col" className="px-4 py-3 text-left font-extrabold text-slate-700">Grant</th>
                  <th scope="col" className="px-4 py-3 text-left font-extrabold text-slate-700">Estimated value</th>
                  <th scope="col" className="px-4 py-3 text-left font-extrabold text-slate-700">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {results.map((r) => (
                  <tr key={r.name} className="align-top">
                    <td className="px-4 py-3 font-bold text-slate-900">
                      {r.name}
                      <p className="text-[11px] font-normal text-slate-500 mt-0.5 leading-tight">{r.why}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-700 font-semibold">{r.estimate}</td>
                    <td className="px-4 py-3">{statusPill(r.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            onClick={reset}
            className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-amber-600 hover:underline"
          >
            <Icon name="rotate-ccw" size={14} /> Retake quiz
          </button>
        </div>

        <HubLeadForm
          heading="Get your free eligibility assessment from a specialist"
          subheading="A registered grants advisor will validate the result, sequence applications, and start the documentation work that survives an audit."
          intent={{ need: "grants", context: ["grant_funding"] }}
          source="grants_eligibility_quiz"
          ctaLabel="Get my free assessment"
          extraFields={[
            { name: "company", label: "Company name" },
            { name: "estimated_rd_spend", label: "Estimated annual dev spend (AUD)", type: "number" },
          ]}
        />
      </div>
    );
  }

  const q = QUESTIONS[step];
  if (!q) return null;
  const progress = Math.round(((step) / QUESTIONS.length) * 100);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <p className="text-xs uppercase tracking-wider font-extrabold text-slate-500">Question {step + 1} of {QUESTIONS.length}</p>
        <p className="text-xs font-bold text-slate-500">{progress}%</p>
      </div>
      <div className="h-1.5 w-full bg-slate-100 rounded-full mb-6 overflow-hidden">
        <div className="h-full bg-amber-500 transition-all" style={{ width: `${progress}%` }} />
      </div>
      <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-5">{q.question}</h2>
      <div className="space-y-2">
        {q.options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => answer(q, o.value)}
            className="w-full text-left px-4 py-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-amber-50 hover:border-amber-300 transition-colors flex items-center justify-between gap-2"
          >
            <span className="text-sm font-bold text-slate-900">{o.label}</span>
            <Icon name="arrow-right" size={14} className="text-slate-500" />
          </button>
        ))}
      </div>
      {step > 0 && (
        <button
          type="button"
          onClick={() => setStep(step - 1)}
          className="mt-5 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800"
        >
          <Icon name="chevron-left" size={14} /> Back
        </button>
      )}
    </div>
  );
}
