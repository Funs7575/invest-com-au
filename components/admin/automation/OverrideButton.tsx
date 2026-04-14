"use client";

import { useState } from "react";

/**
 * Generic admin-override button.
 *
 * Each classifier feature exposes a slightly different override API
 * (approve a rejected dispute, reject a published review, etc.) so
 * this component takes a `feature` + `rowId` + `targetVerdict`
 * tuple and posts to /api/admin/automation/override which dispatches
 * to the right handler.
 *
 * Shows a confirm modal before acting — these are destructive on
 * already-acted decisions (e.g. reversing an auto-refund means
 * debiting the advisor back).
 */
export default function OverrideButton({
  feature,
  rowId,
  targetVerdict,
  label,
  requireReason = false,
}: {
  feature: string;
  rowId: number;
  targetVerdict: string;
  label: string;
  requireReason?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleConfirm = async () => {
    if (requireReason && !reason.trim()) {
      setErrorMsg("Reason is required");
      return;
    }
    setStatus("submitting");
    setErrorMsg("");

    try {
      const res = await fetch("/api/admin/automation/override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feature, rowId, targetVerdict, reason }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus("error");
        setErrorMsg(data?.error || `HTTP ${res.status}`);
        return;
      }
      setStatus("done");
      setTimeout(() => window.location.reload(), 500);
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : String(err));
    }
  };

  if (status === "done") {
    return <span className="text-[0.65rem] text-emerald-700">✓ Applied, refreshing…</span>;
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-2.5 py-1 text-[0.7rem] font-semibold bg-white border border-slate-300 text-slate-700 rounded hover:bg-slate-50 transition-colors"
      >
        {label}
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => status === "idle" && setOpen(false)}
        >
          <div
            className="bg-white rounded-xl p-5 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-slate-900 mb-1">Confirm override</h3>
            <p className="text-sm text-slate-600 mb-4">
              You're about to <strong>{label.toLowerCase()}</strong> for row #{rowId} on the{" "}
              <code className="text-xs bg-slate-100 px-1 rounded">{feature}</code> feature. This is
              logged with your admin identity and timestamp for audit.
            </p>

            {requireReason && (
              <div className="mb-4">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  placeholder="Why are you overriding the classifier?"
                  disabled={status === "submitting"}
                />
              </div>
            )}

            {errorMsg && <p className="text-xs text-red-600 mb-2">{errorMsg}</p>}

            <div className="flex gap-2">
              <button
                onClick={handleConfirm}
                disabled={status === "submitting"}
                className="flex-1 px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {status === "submitting" ? "Applying…" : `Confirm ${label}`}
              </button>
              <button
                onClick={() => setOpen(false)}
                disabled={status === "submitting"}
                className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
