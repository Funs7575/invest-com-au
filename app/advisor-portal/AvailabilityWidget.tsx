"use client";

import { useState } from "react";
import type { Advisor } from "./types";

type AvailabilityStatus = "open" | "waitlist" | "closed";

const STATUS_CONFIG: Record<AvailabilityStatus, { label: string; badgeClass: string; btnClass: string }> = {
  open: {
    label: "Accepting New Clients",
    badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-200",
    btnClass: "bg-emerald-600 hover:bg-emerald-700 text-white",
  },
  waitlist: {
    label: "Waitlist Open",
    badgeClass: "bg-amber-100 text-amber-800 border-amber-200",
    btnClass: "bg-amber-500 hover:bg-amber-600 text-white",
  },
  closed: {
    label: "Not Taking New Clients",
    badgeClass: "bg-red-100 text-red-800 border-red-200",
    btnClass: "bg-red-600 hover:bg-red-700 text-white",
  },
};

type Props = { advisor: Advisor | null };

export default function AvailabilityWidget({ advisor }: Props) {
  const [status, setStatus] = useState<AvailabilityStatus>(
    (advisor?.availability_status as AvailabilityStatus | undefined) ?? "open",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const update = async (next: AvailabilityStatus) => {
    if (next === status || saving) return;
    setSaving(true);
    setError("");
    const prev = status;
    setStatus(next);
    try {
      const res = await fetch("/api/advisor-auth/availability", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        setStatus(prev);
        const d = await res.json();
        setError((d as { error?: string }).error ?? "Failed to update.");
      }
    } catch {
      setStatus(prev);
      setError("Network error. Please try again.");
    }
    setSaving(false);
  };

  const current = STATUS_CONFIG[status];

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-slate-900">Availability</h3>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${current.badgeClass}`}>
          {current.label}
        </span>
      </div>
      <div className="flex gap-2 flex-wrap">
        {(["open", "waitlist", "closed"] as AvailabilityStatus[]).map((s) => (
          <button
            key={s}
            type="button"
            disabled={saving}
            aria-busy={saving}
            onClick={() => { void update(s); }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              status === s
                ? STATUS_CONFIG[s].btnClass
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {STATUS_CONFIG[s].label}
          </button>
        ))}
      </div>
      {error && <p role="alert" className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  );
}
