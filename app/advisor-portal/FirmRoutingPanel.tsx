"use client";

import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/Icon";
import { PROFESSIONAL_TYPE_LABELS } from "@/lib/types";
import type {
  FirmRoutingData,
  RoutingMode,
  RoutingMember,
} from "./types";

const MODE_COPY: Record<RoutingMode, { label: string; help: string }> = {
  manual: {
    label: "Manual",
    help: "Leads stay with whoever they were addressed to. You assign by hand from the Team inbox. (Default — no change to today's behaviour.)",
  },
  round_robin: {
    label: "Round-robin",
    help: "Each new lead goes to the team member who was assigned least recently. Fair, even distribution.",
  },
  load_balanced: {
    label: "Load-balanced",
    help: "Each new lead goes to the member with the fewest open leads right now. Keeps busy advisers from drowning.",
  },
  specialty: {
    label: "Specialty",
    help: "Route by lead type to a chosen specialist. Anything unmapped (or a specialist on leave) falls back to round-robin.",
  },
};

function availabilityBadge(status: RoutingMember["availabilityStatus"]) {
  if (status === "closed")
    return { label: "On leave", cls: "bg-red-50 text-red-600" };
  if (status === "waitlist")
    return { label: "Waitlist", cls: "bg-amber-50 text-amber-700" };
  return { label: "Available", cls: "bg-emerald-50 text-emerald-700" };
}

function assignedByLabel(mode: string): string {
  return (
    {
      manual: "Manual",
      round_robin: "Round-robin",
      load_balanced: "Load-balanced",
      specialty: "Specialty",
    }[mode] ?? mode
  );
}

export default function FirmRoutingPanel() {
  const [data, setData] = useState<FirmRoutingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mode, setMode] = useState<RoutingMode>("manual");
  const [specialtyMap, setSpecialtyMap] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/advisor-portal/firm-routing");
      if (!res.ok) {
        throw new Error(String(res.status));
      }
      const d = (await res.json()) as FirmRoutingData;
      setData(d);
      setMode(d.policy?.mode ?? "manual");
      setSpecialtyMap(d.policy?.specialty_map ?? {});
    } catch {
      setLoadError("Failed to load routing settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    if (!data?.flagEnabled) return;
    setSaving(true);
    setSaveError(null);
    try {
      const body: { mode: RoutingMode; specialty_map?: Record<string, number> } = {
        mode,
      };
      if (mode === "specialty") {
        // Only send mapped entries (a member chosen, not "—").
        const cleaned: Record<string, number> = {};
        for (const [k, v] of Object.entries(specialtyMap)) {
          if (v) cleaned[k] = v;
        }
        body.specialty_map = cleaned;
      }
      const res = await fetch("/api/advisor-portal/firm-routing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        load();
      } else {
        const j = (await res.json()) as { error?: string };
        setSaveError(j.error ?? "Failed to save.");
      }
    } catch {
      setSaveError("Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse" role="status" aria-label="Loading routing settings">
        <div className="h-32 bg-slate-100 rounded-xl" />
        <div className="h-48 bg-slate-100 rounded-xl" />
      </div>
    );
  }

  if (loadError || !data) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <p role="alert" className="text-sm text-red-600">{loadError ?? "No data."}</p>
        <button onClick={load} className="mt-3 text-xs text-violet-600 underline">Retry</button>
      </div>
    );
  }

  const memberById = new Map(data.members.map((m) => [m.id, m]));
  // Distinct lead types across the firm's members for the specialty editor.
  const specialtyKeys = Array.from(
    new Set(data.members.map((m) => m.type).filter((t): t is string => !!t)),
  );

  return (
    <div className="space-y-5">
      {/* Dormant notice when the feature flag is off */}
      {!data.flagEnabled && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-start gap-3">
          <Icon name="info" size={16} className="text-slate-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-slate-700">Automatic lead routing is coming soon to your account</p>
            <p className="text-xs text-slate-500 mt-1">
              You can preview your team&apos;s settings below. Leads continue to use <strong>manual assignment</strong> (assign from the Team inbox) until automatic routing is switched on.
            </p>
          </div>
        </div>
      )}

      {/* Unavailable members alert */}
      {data.unavailableCount > 0 && data.flagEnabled && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <Icon name="alert-triangle" size={16} className="text-amber-500 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-800">
            <strong>{data.unavailableCount}</strong> team member{data.unavailableCount !== 1 ? "s are" : " is"} on leave (availability closed) and will be skipped by automatic routing. If everyone is on leave, leads stay unassigned for you to handle manually.
          </p>
        </div>
      )}

      {/* Routing policy editor */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h3 className="text-sm font-bold text-slate-900 mb-1">Lead Routing Policy</h3>
        <p className="text-xs text-slate-500 mb-4">How new leads for your firm are distributed across the team.</p>

        <fieldset disabled={!data.flagEnabled} className="space-y-2.5">
          <legend className="sr-only">Routing mode</legend>
          {data.modes.map((m) => {
            const copy = MODE_COPY[m];
            return (
              <label
                key={m}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${mode === m ? "border-violet-400 bg-violet-50" : "border-slate-200 hover:bg-slate-50"} ${!data.flagEnabled ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                <input
                  type="radio"
                  name="routing-mode"
                  value={m}
                  checked={mode === m}
                  onChange={() => setMode(m)}
                  disabled={!data.flagEnabled}
                  className="mt-0.5"
                />
                <span>
                  <span className="block text-sm font-semibold text-slate-900">{copy.label}</span>
                  <span className="block text-xs text-slate-500 mt-0.5">{copy.help}</span>
                </span>
              </label>
            );
          })}
        </fieldset>

        {/* Specialty map editor */}
        {mode === "specialty" && (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <h4 className="text-xs font-bold text-slate-700 mb-2">Map lead types to specialists</h4>
            {specialtyKeys.length === 0 ? (
              <p className="text-xs text-slate-500">No member specialties found — add advisor types to your team profiles first.</p>
            ) : (
              <div className="space-y-2">
                {specialtyKeys.map((key) => (
                  <div key={key} className="flex items-center gap-3">
                    <span className="text-xs text-slate-600 w-40 shrink-0">
                      {PROFESSIONAL_TYPE_LABELS[key as keyof typeof PROFESSIONAL_TYPE_LABELS] || key}
                    </span>
                    <select
                      value={specialtyMap[key] ?? ""}
                      disabled={!data.flagEnabled}
                      onChange={(e) =>
                        setSpecialtyMap((prev) => {
                          const next = { ...prev };
                          if (e.target.value) next[key] = Number(e.target.value);
                          else delete next[key];
                          return next;
                        })
                      }
                      className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white flex-1 disabled:opacity-60"
                      aria-label={`Specialist for ${key}`}
                    >
                      <option value="">— Round-robin fallback —</option>
                      {data.members.map((m) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={save}
            disabled={!data.flagEnabled || saving}
            className="px-4 py-2 bg-slate-900 text-white font-semibold rounded-lg text-sm hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? "Saving…" : "Save Routing Policy"}
          </button>
          {saved && <span role="status" className="text-sm text-emerald-600 font-medium">Saved!</span>}
          {saveError && <p role="alert" className="text-xs text-red-600">{saveError}</p>}
        </div>
      </div>

      {/* Per-member stats */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900">Team Members & Availability</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs" aria-label="Team member routing stats">
            <thead>
              <tr className="bg-slate-50 text-[0.62rem] font-semibold text-slate-500 uppercase tracking-wider">
                <th scope="col" className="px-4 py-2">Advisor</th>
                <th scope="col" className="px-4 py-2">Availability</th>
                <th scope="col" className="px-4 py-2 text-right">Enquiries (30d)</th>
                <th scope="col" className="px-4 py-2 text-right">Response</th>
                <th scope="col" className="px-4 py-2 text-right">Rating</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.members.map((m) => {
                const badge = availabilityBadge(m.availabilityStatus);
                return (
                  <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-2.5">
                      <div className="font-semibold text-slate-900">{m.name}</div>
                      <div className="text-[0.56rem] text-slate-500">
                        {m.type ? (PROFESSIONAL_TYPE_LABELS[m.type as keyof typeof PROFESSIONAL_TYPE_LABELS] || m.type) : "—"}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`text-[0.56rem] font-semibold px-1.5 py-0.5 rounded ${badge.cls}`}>{badge.label}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right text-slate-700">{m.enquiries30d ?? "—"}</td>
                    <td className="px-4 py-2.5 text-right text-slate-700">
                      {m.responseScore !== null && m.responseScore !== undefined ? `${m.responseScore}` : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right text-slate-700">
                      {m.avgRating !== null && m.avgRating !== undefined ? `${m.avgRating.toFixed(1)}★ (${m.reviewCount ?? 0})` : "—"}
                    </td>
                  </tr>
                );
              })}
              {data.members.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-500">No active members.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="px-4 py-2 text-[0.56rem] text-slate-400 border-t border-slate-50">Response &amp; rating are sourced from the monthly leaderboard; a dash means no data yet for that member.</p>
      </div>

      {/* Assignment audit list */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900">Recent Assignments</h3>
        </div>
        {data.assignments.length === 0 ? (
          <p className="px-4 py-6 text-center text-slate-500 text-sm">No assignments recorded yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.assignments.map((a) => (
              <li key={a.id} className="px-4 py-2.5 flex items-center justify-between gap-3 text-xs">
                <div className="min-w-0">
                  <span className="font-semibold text-slate-900">Lead #{a.leadRef}</span>
                  <span className="text-slate-500"> → {memberById.get(a.professionalId)?.name ?? a.professionalName}</span>
                  {a.reassignedFromName && (
                    <span className="text-slate-400"> (from {a.reassignedFromName})</span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[0.56rem] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{assignedByLabel(a.assignedBy)}</span>
                  <span className="text-[0.56rem] text-slate-400">{new Date(a.assignedAt).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
