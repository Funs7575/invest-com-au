"use client";

import { useCallback, useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";
import { useToast } from "@/components/Toast";

interface FlagRow {
  id: number;
  flag_key: string;
  description: string | null;
  enabled: boolean;
  rollout_pct: number;
  segments: string[];
  allowlist: string[];
  denylist: string[];
  archived_at: string | null;
  updated_at: string;
  updated_by: string | null;
}

const SEGMENT_LABELS: Record<string, string> = {
  admin: "Admin",
  advisor: "Advisor",
  broker: "Broker",
  user: "User",
};

export default function FeatureFlagsPage() {
  const { toast } = useToast();
  const [flags, setFlags] = useState<FlagRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);

  const fetchFlags = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/feature-flags");
      if (!res.ok) throw new Error(await res.text());
      const json = (await res.json()) as { items: FlagRow[] };
      setFlags(json.items);
    } catch {
      toast("Failed to load feature flags", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);

  async function patch(flagKey: string, payload: Record<string, unknown>) {
    setSaving(flagKey);
    try {
      const res = await fetch("/api/admin/feature-flags", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flag_key: flagKey, ...payload }),
      });
      if (!res.ok) throw new Error(await res.text());
      await fetchFlags();
      toast("Flag updated", "success");
    } catch {
      toast("Update failed", "error");
    } finally {
      setSaving(null);
    }
  }

  const visible = showArchived
    ? flags
    : flags.filter((f: FlagRow) => !f.archived_at);

  const activeCount = flags.filter((f: FlagRow) => !f.archived_at).length;
  const archivedCount = flags.filter((f: FlagRow) => f.archived_at).length;

  return (
    <AdminShell title="Feature Flags">
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex gap-4 text-sm text-slate-500">
            <span>
              <strong className="text-slate-800">{activeCount}</strong> active
            </span>
            {archivedCount > 0 && (
              <span>
                <strong className="text-slate-800">{archivedCount}</strong>{" "}
                archived
              </span>
            )}
          </div>
          {archivedCount > 0 && (
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
                className="rounded border-slate-300"
              />
              Show archived
            </label>
          )}
        </div>

        {loading ? (
          <p className="text-sm text-slate-500 py-8 text-center">Loading…</p>
        ) : visible.length === 0 ? (
          <p className="text-sm text-slate-500 py-8 text-center">
            No feature flags found.
          </p>
        ) : (
          <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
            {visible.map((flag) => {
              const isArchived = !!flag.archived_at;
              const isSaving = saving === flag.flag_key;

              return (
                <div
                  key={flag.flag_key}
                  className={`p-4 ${isArchived ? "opacity-60" : ""}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <code className="text-sm font-mono font-semibold text-slate-800">
                          {flag.flag_key}
                        </code>
                        {isArchived && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                            archived
                          </span>
                        )}
                        {flag.segments.length > 0 && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">
                            {flag.segments
                              .map((s) => SEGMENT_LABELS[s] ?? s)
                              .join(", ")}
                          </span>
                        )}
                      </div>
                      {flag.description && (
                        <p className="text-sm text-slate-500 mt-0.5">
                          {flag.description}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-4 mt-2 text-xs text-slate-400">
                        <span>rollout {flag.rollout_pct}%</span>
                        {flag.allowlist.length > 0 && (
                          <span>allowlist: {flag.allowlist.join(", ")}</span>
                        )}
                        {flag.denylist.length > 0 && (
                          <span>denylist: {flag.denylist.join(", ")}</span>
                        )}
                        {flag.updated_by && (
                          <span>by {flag.updated_by}</span>
                        )}
                        <span>
                          {new Date(flag.updated_at).toLocaleDateString(
                            "en-AU",
                            { day: "numeric", month: "short", year: "numeric" },
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {!isArchived && (
                        <button
                          onClick={() =>
                            patch(flag.flag_key, {
                              enabled: !flag.enabled,
                            })
                          }
                          disabled={isSaving}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                            flag.enabled ? "bg-emerald-500" : "bg-slate-200"
                          } disabled:opacity-50`}
                          aria-label={
                            flag.enabled
                              ? `Disable ${flag.flag_key}`
                              : `Enable ${flag.flag_key}`
                          }
                        >
                          <span
                            className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                              flag.enabled
                                ? "translate-x-6"
                                : "translate-x-1"
                            }`}
                          />
                        </button>
                      )}

                      <button
                        onClick={() =>
                          patch(flag.flag_key, {
                            archive: !isArchived,
                          })
                        }
                        disabled={isSaving}
                        className="text-xs text-slate-400 hover:text-slate-700 disabled:opacity-50 transition-colors"
                      >
                        {isSaving
                          ? "…"
                          : isArchived
                          ? "Restore"
                          : "Archive"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
