"use client";

import { useState } from "react";

interface Flag {
  flag_key: string;
  enabled: boolean;
  rollout_pct: number;
  allowlist: string[];
  denylist: string[];
  segments: string[];
  description: string;
}

interface Props {
  initialFlags: Flag[];
}

/**
 * Client UI for the feature-flag admin.
 *
 * Optimistic updates: the toggle + slider update local state
 * immediately and the PATCH runs in the background. On failure
 * we roll back and show an error row.
 */
export default function FeatureFlagsClient({ initialFlags }: Props) {
  const [flags, setFlags] = useState(initialFlags);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);

  const patch = async (
    key: string,
    update: Partial<Flag>,
  ) => {
    const snapshot = flags;
    // Optimistic
    setFlags((prev) =>
      prev.map((f) => (f.flag_key === key ? { ...f, ...update } : f)),
    );
    setSavingKey(key);
    setError(null);
    setSavedKey(null);
    try {
      const res = await fetch("/api/admin/feature-flags", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flag_key: key, ...update }),
      });
      if (!res.ok) {
        setFlags(snapshot);
        const json = await res.json().catch(() => ({}));
        setError(json.error || "Save failed");
        return;
      }
      setSavedKey(key);
      setTimeout(
        () => setSavedKey((k) => (k === key ? null : k)),
        2000,
      );
    } catch (err) {
      setFlags(snapshot);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSavingKey(null);
    }
  };

  const toggleEnabled = (flag: Flag) => {
    void patch(flag.flag_key, { enabled: !flag.enabled });
  };

  const setRollout = (flag: Flag, value: number) => {
    void patch(flag.flag_key, { rollout_pct: value });
  };

  return (
    <div>
      {error && (
        <div
          role="alert"
          className="mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
        >
          {error}
        </div>
      )}

      <ul className="space-y-3">
        {flags.map((flag) => {
          const busy = savingKey === flag.flag_key;
          const saved = savedKey === flag.flag_key;
          return (
            <li
              key={flag.flag_key}
              className="rounded-xl border border-slate-200 bg-white p-5"
            >
              <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold text-slate-900">
                      <code>{flag.flag_key}</code>
                    </h3>
                    {saved && (
                      <span className="text-[10px] font-bold uppercase text-emerald-700">
                        saved
                      </span>
                    )}
                  </div>
                  {flag.description && (
                    <p className="text-xs text-slate-600 mt-1">
                      {flag.description}
                    </p>
                  )}
                </div>
                <label className="inline-flex items-center gap-2 shrink-0">
                  <input
                    type="checkbox"
                    checked={flag.enabled}
                    onChange={() => toggleEnabled(flag)}
                    disabled={busy}
                    className="w-5 h-5 rounded"
                  />
                  <span className="text-xs font-semibold text-slate-700">
                    {flag.enabled ? "Enabled" : "Disabled"}
                  </span>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block">
                    <span className="flex items-center justify-between text-[11px] font-bold uppercase text-slate-500 mb-1">
                      <span>Rollout %</span>
                      <span className="tabular-nums">{flag.rollout_pct}%</span>
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={flag.rollout_pct}
                      onChange={(e) =>
                        setRollout(flag, parseInt(e.target.value, 10))
                      }
                      disabled={busy || !flag.enabled}
                      className="w-full"
                    />
                  </label>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Sticky per (user, flag). Requires enabled=true to take
                    effect.
                  </p>
                </div>
                <div className="text-[11px] text-slate-500 space-y-1">
                  <p>
                    <strong className="text-slate-700">Segments:</strong>{" "}
                    {flag.segments.length > 0 ? flag.segments.join(", ") : "any"}
                  </p>
                  <p>
                    <strong className="text-slate-700">Allowlist:</strong>{" "}
                    {flag.allowlist.length > 0
                      ? `${flag.allowlist.length} entries`
                      : "empty"}
                  </p>
                  <p>
                    <strong className="text-slate-700">Denylist:</strong>{" "}
                    {flag.denylist.length > 0
                      ? `${flag.denylist.length} entries`
                      : "empty"}
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
