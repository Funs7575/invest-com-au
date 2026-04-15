"use client";

import { useState } from "react";

interface Period {
  id: number;
  period_start: string;
  period_end: string;
  status: string;
  closed_at: string | null;
  closed_by: string | null;
  audit_row_count: number | null;
  total_credits_cents: number | null;
  total_refunds_cents: number | null;
  notes: string | null;
}

interface Props {
  initialPeriods: Period[];
  defaultPeriodStart: string;
  defaultPeriodEnd: string;
}

function formatCents(cents: number | null): string {
  if (cents == null) return "—";
  const dollars = (cents / 100).toFixed(2);
  return `$${dollars}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const STATUS_BADGE: Record<string, string> = {
  open: "bg-slate-100 text-slate-700",
  closing: "bg-amber-100 text-amber-800",
  closed: "bg-emerald-100 text-emerald-800",
};

export default function FinancialPeriodsClient({
  initialPeriods,
  defaultPeriodStart,
  defaultPeriodEnd,
}: Props) {
  const [periods, setPeriods] = useState(initialPeriods);
  const [periodStart, setPeriodStart] = useState(defaultPeriodStart);
  const [periodEnd, setPeriodEnd] = useState(defaultPeriodEnd);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/financial-periods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          period_start: periodStart,
          period_end: periodEnd,
          notes: notes || undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || "Close failed");
        return;
      }
      if (json.already_closed) {
        setMsg("Period was already closed — no changes made.");
      } else {
        setMsg(
          `Closed period · ${json.summary?.audit_row_count ?? 0} audit rows rolled up.`,
        );
      }
      // Reload the table
      const listRes = await fetch("/api/admin/financial-periods", {
        cache: "no-store",
      });
      if (listRes.ok) {
        const data = await listRes.json();
        setPeriods(data.items || []);
      }
      setNotes("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <form
        onSubmit={submit}
        className="mb-8 rounded-xl border border-slate-200 bg-white p-5"
      >
        <h2 className="text-base font-bold text-slate-900 mb-4">
          Close a period manually
        </h2>
        <p className="text-xs text-slate-500 mb-4">
          Safe to run on an already-closed period — the API returns a no-op.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-xs font-semibold text-slate-700 mb-1">
              Period start
            </span>
            <input
              required
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="block text-xs font-semibold text-slate-700 mb-1">
              Period end
            </span>
            <input
              required
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block md:col-span-2">
            <span className="block text-xs font-semibold text-slate-700 mb-1">
              Notes (optional)
            </span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="e.g. early close for Q1 audit"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
        </div>
        {error && (
          <p role="alert" className="mt-3 text-xs text-red-700">
            {error}
          </p>
        )}
        {msg && (
          <p role="status" className="mt-3 text-xs text-emerald-700">
            {msg}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="mt-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-sm px-4 py-2 rounded-lg"
        >
          {busy ? "Closing…" : "Close period"}
        </button>
      </form>

      <h2 className="text-base font-bold text-slate-900 mb-3">
        Recent periods ({periods.length})
      </h2>
      {periods.length === 0 ? (
        <p className="text-sm text-slate-500">
          No period rows yet — the cron hasn&rsquo;t run, or you&rsquo;re on
          a fresh install.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border border-slate-200 rounded-lg overflow-hidden">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-3 py-2">Period</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-right px-3 py-2">Audit rows</th>
                <th className="text-right px-3 py-2">Credits</th>
                <th className="text-right px-3 py-2">Refunds</th>
                <th className="text-left px-3 py-2">Closed at</th>
                <th className="text-left px-3 py-2">Closed by</th>
              </tr>
            </thead>
            <tbody>
              {periods.map((p) => (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-semibold text-slate-900">
                    {p.period_start} → {p.period_end}
                    {p.notes && (
                      <p className="text-[10px] text-slate-400 font-normal mt-0.5">
                        {p.notes}
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        STATUS_BADGE[p.status] || "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-700">
                    {p.audit_row_count ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-700">
                    {formatCents(p.total_credits_cents)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-700">
                    {formatCents(p.total_refunds_cents)}
                  </td>
                  <td className="px-3 py-2 text-slate-600">
                    {formatDate(p.closed_at)}
                  </td>
                  <td className="px-3 py-2 text-slate-600 text-[11px]">
                    {p.closed_by || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
