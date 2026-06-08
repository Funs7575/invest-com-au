"use client";

import { useState } from "react";

interface Props {
  initialEnabled: boolean;
}

/**
 * Toggle for the daily morning brief (8am AEDT opt-in).
 * POSTs to /api/notification-preferences with { morning_brief: bool }.
 */
export default function MorningBriefToggle({ initialEnabled }: Props) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [saving, setSaving] = useState(false);

  async function toggle() {
    setSaving(true);
    try {
      await fetch("/api/notification-preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ morning_brief: !enabled }),
      });
      setEnabled((prev) => !prev);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-start gap-4">
      <div className="flex-1">
        <p className="text-sm font-semibold text-slate-900">Morning Brief</p>
        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
          Daily digest at 8am AEDT — rate changes on your watchlist, posts from
          advisors you follow, and one matched article. Opt out any time.
        </p>
      </div>
      <button
        onClick={toggle}
        disabled={saving}
        aria-busy={saving}
        role="switch"
        aria-checked={enabled}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
          enabled ? "bg-emerald-600" : "bg-slate-200"
        } ${saving ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform ${
            enabled ? "translate-x-5" : "translate-x-0"
          }`}
        />
        <span className="sr-only">{enabled ? "Disable" : "Enable"} morning brief</span>
      </button>
    </div>
  );
}
