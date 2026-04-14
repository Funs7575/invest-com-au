"use client";

import { useState } from "react";

/**
 * Collapsible "why did the classifier decide this?" UI.
 *
 * Given an array of signal strings (from auto_resolved_reasons /
 * auto_classified_reasons / auto_moderated_reasons jsonb columns),
 * renders a compact trigger + expanded panel so admins can inspect
 * the rule firings without blowing up the row height when collapsed.
 */
export default function SignalsPopover({
  reasons,
  label = "Signals",
}: {
  reasons: string[] | null;
  label?: string;
}) {
  const [open, setOpen] = useState(false);

  if (!reasons || reasons.length === 0) {
    return <span className="text-xs text-slate-400">—</span>;
  }

  return (
    <div className="inline-block relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-xs font-semibold text-slate-700 hover:text-slate-900 underline decoration-dotted"
      >
        {label} ({reasons.length})
      </button>
      {open && (
        <div
          className="absolute z-20 mt-1 right-0 w-64 bg-white border border-slate-200 rounded-lg shadow-lg p-3"
          onMouseLeave={() => setOpen(false)}
        >
          <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Classifier reasons</p>
          <ul className="space-y-1">
            {reasons.map((r, i) => (
              <li key={i} className="text-[0.7rem] text-slate-700 font-mono break-words">
                • {r}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
