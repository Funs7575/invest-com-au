"use client";

import { useState } from "react";
import Icon from "@/components/Icon";

/**
 * Save-search button + modal. Posts the current filter set to
 * /api/saved-searches as a named jsonb blob that the (future) daily
 * cron will diff against new listings + email alerts to the owner.
 *
 * UX:
 *   - Button is disabled when no filters are active (saving "all
 *     listings" isn't a useful alert).
 *   - Unauthenticated users get a friendly prompt to sign in. The
 *     filter state is preserved through sign-in by the existing
 *     redirect-after-login flow (login page reads ?next=).
 *   - Modal collects label + email frequency, then POSTs and shows
 *     a success toast that links to /account/saved-searches.
 */
export default function SaveSearchButton({
  activeChipsCount,
  filters,
}: {
  activeChipsCount: number;
  filters: Record<string, string>;
}) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [frequency, setFrequency] = useState<"off" | "daily" | "weekly">("weekly");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error" | "unauthed">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const disabled = activeChipsCount === 0;

  const onSave = async () => {
    if (!label.trim()) { setErrorMsg("Give it a label first."); return; }
    setStatus("saving");
    setErrorMsg("");
    try {
      const res = await fetch("/api/saved-searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "invest",
          label: label.trim(),
          filters,
          email_frequency: frequency,
        }),
      });
      if (res.status === 401) {
        setStatus("unauthed");
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setErrorMsg(typeof body?.error === "string" ? body.error : `Save failed (${res.status})`);
        setStatus("error");
        return;
      }
      setStatus("saved");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Network error");
      setStatus("error");
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => { setOpen(true); setStatus("idle"); setErrorMsg(""); }}
        disabled={disabled}
        title={disabled ? "Add at least one filter to save a search" : "Save this search and get alerts"}
        className={`shrink-0 hidden lg:inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold transition-all ${
          disabled
            ? "bg-white border-slate-200 text-slate-300 cursor-not-allowed"
            : "bg-white border-slate-200 text-slate-700 hover:bg-amber-50 hover:border-amber-200 hover:text-amber-700"
        }`}
      >
        <Icon name="bookmark" size={15} />
        <span>Save search</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl">
            <header className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <Icon name="bookmark" size={18} />
                Save search
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center"
              >
                <Icon name="x" size={16} />
              </button>
            </header>

            <div className="p-5 space-y-4">
              {status === "saved" ? (
                <div className="text-sm text-emerald-700 space-y-2">
                  <p className="font-bold text-base flex items-center gap-1.5">
                    <Icon name="check-circle" size={16} />
                    Saved.
                  </p>
                  <p>
                    We&apos;ll {frequency === "off" ? "keep it in your list" : `email you ${frequency}`} when new listings match.{" "}
                    <a href="/account/saved-searches" className="underline font-semibold hover:text-emerald-900">
                      Manage saved searches
                    </a>
                  </p>
                </div>
              ) : status === "unauthed" ? (
                <div className="text-sm text-slate-700 space-y-3">
                  <p>Saving a search needs an account so we can send alerts. It takes 10 seconds:</p>
                  <a
                    href={`/auth/sign-in?next=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname + window.location.search : "/invest")}`}
                    className="block w-full text-center px-4 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm"
                  >
                    Sign in or create account →
                  </a>
                </div>
              ) : (
                <>
                  <div>
                    <label htmlFor="save-search-label" className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Label</label>
                    <input
                      id="save-search-label"
                      type="text"
                      value={label}
                      onChange={(e) => setLabel(e.target.value)}
                      placeholder="e.g. NSW farmland under $1M"
                      maxLength={120}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Email alerts</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(["off", "weekly", "daily"] as const).map((f) => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => setFrequency(f)}
                          aria-pressed={frequency === f}
                          className={`text-xs font-semibold rounded-lg px-2 py-2 transition-colors ${
                            frequency === f
                              ? "bg-amber-500 text-slate-900 shadow-sm"
                              : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          {f === "off" ? "None" : f === "weekly" ? "Weekly" : "Daily"}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1.5 leading-snug">
                      We&apos;ll only email when new listings match (not when nothing changes).
                    </p>
                  </div>
                  {errorMsg && <p className="text-xs text-rose-700">{errorMsg}</p>}
                </>
              )}
            </div>

            {status !== "saved" && status !== "unauthed" && (
              <footer className="px-5 py-3 border-t border-slate-200 flex items-center justify-end gap-2 bg-slate-50">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onSave}
                  disabled={status === "saving" || !label.trim()}
                  className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {status === "saving" ? "Saving…" : "Save search"}
                </button>
              </footer>
            )}
          </div>
        </div>
      )}
    </>
  );
}
