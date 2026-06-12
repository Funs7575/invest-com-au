"use client";

/**
 * FreeTextIntake — Showcase G8 conversational front door.
 *
 * Shown on the FIRST question screen only (nothing answered yet). The user can
 * type what they're trying to do in their own words; we parse it client-side
 * with the pure `parseFreeTextIntent` heuristic (zero cost, always available).
 *
 *  - high confidence  → prefill the goal and advance via the same answer path
 *                       the chips use (`onIntent`).
 *  - low / null       → nudge "Pick the closest match below" and scroll to the
 *                       chips. We never guess on the user's behalf.
 *
 * Compliance: this only routes to the closest goal chip — no advice. Tracks
 * `freetext_intent_used { matched, intent }`.
 */

import { useState } from "react";

import Icon from "@/components/Icon";
import { parseFreeTextIntent } from "@/lib/getmatched/intent-parser";
import { trackEvent as phTrack } from "@/lib/posthog/events";

const MAX_LEN = 500;

export default function FreeTextIntake({
  onIntent,
}: {
  /** Called with a high-confidence goal slug — wire to the chip answer path. */
  onIntent: (intent: string) => void;
}) {
  const [text, setText] = useState("");
  const [nudge, setNudge] = useState<string | null>(null);

  function handleSubmit() {
    const parsed = parseFreeTextIntent(text);
    const matched = parsed.intent !== null && parsed.confidence === "high";
    phTrack("freetext_intent_used", {
      matched,
      intent: parsed.intent,
    });

    if (matched && parsed.intent) {
      setNudge(null);
      onIntent(parsed.intent);
      return;
    }

    // Low confidence / no match → nudge to the chips below.
    setNudge("Pick the closest match below.");
    if (typeof document !== "undefined") {
      const chips = document.getElementById("gm-question-card");
      chips?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }

  const remaining = MAX_LEN - text.length;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm mb-5">
      <label
        htmlFor="gm-freetext"
        className="block text-sm font-semibold text-slate-900 mb-1"
      >
        Or just describe what you&apos;re trying to do
      </label>
      <p className="text-xs text-slate-500 mb-3">
        In your own words — we&apos;ll point you to the closest starting option.
        General information only.
      </p>
      <textarea
        id="gm-freetext"
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, MAX_LEN))}
        rows={2}
        maxLength={MAX_LEN}
        placeholder="e.g. I want to buy bitcoin / refinance my mortgage / set up an SMSF"
        className="w-full resize-none rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
        aria-describedby="gm-freetext-hint"
      />
      <div className="mt-2 flex items-center justify-between gap-3">
        <span
          id="gm-freetext-hint"
          className={`text-[11px] ${remaining < 50 ? "text-amber-700" : "text-slate-400"}`}
        >
          {remaining} characters left
        </span>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={text.trim().length === 0}
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800 disabled:bg-slate-300 min-h-11"
        >
          Find my starting point
          <Icon name="arrow-right" size={14} />
        </button>
      </div>
      {nudge && (
        <p role="status" className="mt-2 text-xs font-semibold text-amber-700">
          {nudge}
        </p>
      )}
    </div>
  );
}
