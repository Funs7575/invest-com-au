"use client";

import { useEffect, useId, useRef, useState } from "react";
import Icon from "@/components/Icon";

/**
 * Get Matched Showcase G4 — "Play with your plan".
 *
 * Collapsible panel of what-if controls (budget band, timeline, DIY ↔
 * professional-help toggle). Changing a control fires `onChange(control,
 * from, to, mergedAnswers)`; the parent re-calls `/api/get-matched/resolve`
 * with `plan_id: 0` (CRITICAL — never mutate the persisted plan row) and the
 * adjusted answers, then swaps in the recomputed result.
 *
 * This component is presentational + debounce-only: it owns the selected
 * control values and a 400ms debounce, and delegates the fetch to the parent.
 *
 * Compliance: the panel and the result it produces are framed as a
 * recalculation of the user's *adjusted answers* — never advice.
 */

export type WhatIfControl = "budget" | "timeline" | "help";

const BUDGET_BANDS: { value: string; label: string }[] = [
  { value: "under_10k", label: "Under A$10k" },
  { value: "10k_100k", label: "A$10k–$100k" },
  { value: "100k_500k", label: "A$100k–$500k" },
  { value: "500k_1m", label: "A$500k–$1m" },
  { value: "1m_plus", label: "A$1m+" },
];

const TIMELINES: { value: string; label: string }[] = [
  { value: "now", label: "Now" },
  { value: "1_3_months", label: "1–3 months" },
  { value: "3_6_months", label: "3–6 months" },
  { value: "6_12_months", label: "6–12 months" },
  { value: "researching", label: "Researching" },
];

// DIY ↔ professional-help maps to help_preference: compare vs individual.
const HELP_MODES: { value: string; label: string; sub: string }[] = [
  { value: "compare", label: "DIY", sub: "Compare platforms myself" },
  { value: "individual", label: "Professional help", sub: "Connect with an expert" },
];

interface Props {
  /** Current effective values (reflect the displayed result). */
  budget: string | null;
  timeline: string | null;
  help: string | null;
  /** True while a what-if recompute is in flight. */
  busy: boolean;
  /** True when the displayed result is a what-if (enables Reset). */
  isWhatIf: boolean;
  /** Inline error text from the last failed recompute, if any. */
  error: string | null;
  /** Fires (debounced) when a control changes. */
  onChange: (
    control: WhatIfControl,
    from: string | null,
    to: string,
  ) => void;
  /** Restore the original resolve result (no refetch). */
  onReset: () => void;
}

export default function WhatIfPanel({
  budget,
  timeline,
  help,
  busy,
  isWhatIf,
  error,
  onChange,
  onReset,
}: Props) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  // Debounce rapid changes (~400ms). Keyed by control so switching controls
  // doesn't cancel a pending change of a different kind.
  const timers = useRef<Partial<Record<WhatIfControl, ReturnType<typeof setTimeout>>>>(
    {},
  );

  useEffect(() => {
    const current = timers.current;
    return () => {
      Object.values(current).forEach((t) => t && clearTimeout(t));
    };
  }, []);

  function fire(control: WhatIfControl, from: string | null, to: string) {
    if (from === to) return;
    const existing = timers.current[control];
    if (existing) clearTimeout(existing);
    timers.current[control] = setTimeout(() => {
      onChange(control, from, to);
    }, 400);
  }

  return (
    <section className="bg-white border border-slate-200 rounded-2xl shadow-sm mb-6 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
      >
        <span className="flex items-center gap-2.5">
          <span
            className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0"
            aria-hidden="true"
          >
            <Icon name="sliders" size={16} className="text-amber-700" />
          </span>
          <span>
            <span className="block text-sm font-bold text-slate-900">
              Play with your plan
            </span>
            <span className="block text-xs text-slate-500">
              Adjust budget, timeline or help and watch the match update
            </span>
          </span>
        </span>
        <Icon
          name={open ? "chevron-up" : "chevron-down"}
          size={18}
          className="text-slate-400 shrink-0"
        />
      </button>

      {open && (
        <div id={panelId} className="px-5 pb-5 border-t border-slate-100 pt-4">
          <ControlRow label="Budget">
            {BUDGET_BANDS.map((b) => (
              <Chip
                key={b.value}
                selected={budget === b.value}
                disabled={busy}
                onClick={() => fire("budget", budget, b.value)}
              >
                {b.label}
              </Chip>
            ))}
          </ControlRow>

          <ControlRow label="Timeline">
            {TIMELINES.map((t) => (
              <Chip
                key={t.value}
                selected={timeline === t.value}
                disabled={busy}
                onClick={() => fire("timeline", timeline, t.value)}
              >
                {t.label}
              </Chip>
            ))}
          </ControlRow>

          <ControlRow label="How much help">
            {HELP_MODES.map((m) => (
              <Chip
                key={m.value}
                selected={help === m.value}
                disabled={busy}
                onClick={() => fire("help", help, m.value)}
                title={m.sub}
              >
                {m.label}
              </Chip>
            ))}
          </ControlRow>

          <div className="flex flex-wrap items-center gap-3 mt-3 min-h-6">
            {busy && (
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                <span className="w-3 h-3 rounded-full border-2 border-slate-300 border-t-amber-500 animate-spin" />
                Recalculating…
              </span>
            )}
            {isWhatIf && !busy && (
              <button
                type="button"
                onClick={onReset}
                className="text-xs font-semibold text-slate-600 underline hover:text-slate-900 min-h-6"
              >
                Reset to my answers
              </button>
            )}
            {error && (
              <span role="alert" className="text-xs text-red-700">
                {error}
              </span>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function ControlRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3 last:mb-0">
      <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">
        {label}
      </p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Chip({
  selected,
  disabled,
  onClick,
  title,
  children,
}: {
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-pressed={selected}
      className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold min-h-11 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 disabled:opacity-60 disabled:cursor-not-allowed ${
        selected
          ? "border-amber-500 bg-amber-50 text-amber-900"
          : "border-slate-200 bg-white text-slate-700 hover:border-amber-400"
      }`}
    >
      {children}
    </button>
  );
}
