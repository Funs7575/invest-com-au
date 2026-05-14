"use client";

import { useState } from "react";

interface Props {
  digestKey: "watchlist_digest" | "advisor_digest";
  label: string;
  description: string;
  initialEnabled: boolean;
}

export default function DigestToggle({ digestKey, label, description, initialEnabled }: Props) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = async () => {
    const next = !enabled;
    setEnabled(next);
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/account/digest-prefs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [digestKey]: next }),
      });
      if (!res.ok) throw new Error("save failed");
    } catch {
      setEnabled(!next);
      setError("Couldn't save preference. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-800">{label}</p>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
        {error && (
          <p className="text-xs text-red-600 mt-1">{error}</p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={label}
        disabled={saving}
        onClick={toggle}
        className={[
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent",
          "transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1",
          "disabled:opacity-50",
          enabled ? "bg-blue-600" : "bg-slate-200",
        ].join(" ")}
      >
        <span
          className={[
            "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0",
            "transition duration-200 ease-in-out",
            enabled ? "translate-x-5" : "translate-x-0",
          ].join(" ")}
        />
      </button>
    </div>
  );
}
