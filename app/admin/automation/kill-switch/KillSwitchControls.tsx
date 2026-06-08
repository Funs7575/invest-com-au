"use client";

import { useState } from "react";

interface Row {
  feature: string;
  title: string;
  description: string;
  current: {
    disabled: boolean;
    reason: string | null;
    disabled_by: string | null;
    disabled_at: string | null;
  };
}

export default function KillSwitchControls({ initialRows }: { initialRows: Row[] }) {
  const [rows, setRows] = useState(initialRows);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [pendingDisable, setPendingDisable] = useState<string | null>(null);
  const [disableReason, setDisableReason] = useState("");

  async function applyToggle(feature: string, nextDisabled: boolean, reason: string | null) {
    setError(null);
    setBusy(feature);
    try {
      const res = await fetch("/api/admin/automation/kill-switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feature, disabled: nextDisabled, reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error((data as { error?: string }).error || `HTTP ${res.status}`);
      setRows((rs) =>
        rs.map((r) =>
          r.feature === feature
            ? {
                ...r,
                current: {
                  disabled: nextDisabled,
                  reason,
                  disabled_by: nextDisabled ? "you" : null,
                  disabled_at: nextDisabled ? new Date().toISOString() : null,
                },
              }
            : r,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "toggle_failed");
    } finally {
      setBusy(null);
    }
  }

  function toggle(row: Row) {
    if (!row.current.disabled) {
      setPendingDisable(row.feature);
      setDisableReason("");
    } else {
      void applyToggle(row.feature, false, null);
    }
  }

  function confirmDisable() {
    if (!pendingDisable) return;
    const feature = pendingDisable;
    setPendingDisable(null);
    void applyToggle(feature, true, disableReason.trim() || null);
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="px-3 py-2 bg-red-50 border border-red-200 rounded text-xs text-red-800">
          ⚠ {error}
        </div>
      )}
      {pendingDisable && (
        <div className="bg-red-50 border border-red-300 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-red-900">
            Disable {rows.find(r => r.feature === pendingDisable)?.title ?? pendingDisable}?
          </p>
          <p className="text-xs text-red-700">Provide a reason — this is logged to the audit trail.</p>
          <input
            type="text"
            value={disableReason}
            onChange={(e) => setDisableReason(e.target.value)}
            placeholder="Reason for disabling…"
            className="w-full px-3 py-2 border border-red-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-400"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={confirmDisable}
              disabled={!!busy || disableReason.trim().length === 0}
              className="px-4 py-2 rounded bg-red-600 text-white font-semibold text-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {busy ? "…" : "Yes, disable"}
            </button>
            <button
              type="button"
              onClick={() => setPendingDisable(null)}
              className="px-4 py-2 rounded bg-white border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {rows.map((row) => {
        const disabled = row.current.disabled;
        const isGlobal = row.feature === "global";
        return (
          <div
            key={row.feature}
            className={`flex items-start gap-4 p-4 rounded-xl border ${
              isGlobal
                ? disabled
                  ? "border-red-400 bg-red-50"
                  : "border-red-200 bg-white"
                : disabled
                  ? "border-amber-300 bg-amber-50"
                  : "border-slate-200 bg-white"
            }`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className={`text-sm font-bold ${isGlobal ? "text-red-900" : "text-slate-900"}`}>
                  {row.title}
                </h3>
                {disabled && (
                  <span className="text-[0.6rem] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500 text-slate-900">
                    Disabled
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">{row.description}</p>
              {disabled && row.current.reason && (
                <p className="text-[0.65rem] text-amber-800 mt-2">
                  Reason: {row.current.reason}
                </p>
              )}
              {disabled && row.current.disabled_at && (
                <p className="text-[0.6rem] text-slate-500 mt-0.5">
                  Disabled {new Date(row.current.disabled_at).toLocaleString("en-AU")}{" "}
                  by {row.current.disabled_by}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => toggle(row)}
              disabled={busy === row.feature}
              className={`text-xs font-semibold px-3 py-1.5 rounded border ${
                disabled
                  ? "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                  : "bg-slate-900 border-slate-900 text-white hover:bg-slate-800"
              } disabled:opacity-50`}
            >
              {busy === row.feature ? "…" : disabled ? "Re-enable" : "Disable"}
            </button>
          </div>
        );
      })}
    </div>
  );
}
