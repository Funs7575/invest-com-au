"use client";

import { useState } from "react";

export interface TdRow {
  id: number;
  institution_name: string;
  provider_slug: string;
  principal_cents: number;
  rate_bps: number;
  term_months: number;
  maturity_date: string;
  notes: string;
}

interface Props {
  initialItems: TdRow[];
}

const TERM_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 18, 24, 36, 48, 60];

function fmtAud(cents: number): string {
  return (cents / 100).toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  });
}

function fmtRate(bps: number): string {
  return (bps / 100).toFixed(2) + "% p.a.";
}

function daysUntil(isoDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(isoDate);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

function maturityBadge(days: number): { label: string; cls: string } {
  if (days < 0) return { label: "Matured", cls: "bg-slate-100 text-slate-600" };
  if (days === 0) return { label: "Matures today", cls: "bg-red-100 text-red-700" };
  if (days === 1) return { label: "1 day left", cls: "bg-red-100 text-red-700" };
  if (days <= 7) return { label: `${days} days left`, cls: "bg-red-100 text-red-700" };
  if (days <= 30) return { label: `${days} days left`, cls: "bg-amber-100 text-amber-700" };
  return { label: `${days} days left`, cls: "bg-emerald-100 text-emerald-700" };
}

// Auto-calculate maturity date from today + term_months.
function calcMaturity(termMonths: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + termMonths);
  return d.toISOString().slice(0, 10);
}

interface AddFormProps {
  onAdd: (row: TdRow) => void;
}

function AddForm({ onAdd }: AddFormProps) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [termMonths, setTermMonths] = useState(12);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    const body = {
      institution_name: String(fd.get("institution_name") ?? "").trim(),
      provider_slug: String(fd.get("provider_slug") ?? "").trim(),
      principal_cents: Math.round(Number(fd.get("principal") ?? 0) * 100),
      rate_bps: Math.round(Number(fd.get("rate_pct") ?? 0) * 100),
      term_months: Number(fd.get("term_months") ?? 12),
      maturity_date: String(fd.get("maturity_date") ?? ""),
      notes: String(fd.get("notes") ?? "").trim(),
    };
    try {
      const res = await fetch("/api/account/term-deposits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Could not add term deposit.");
      const j = (await res.json()) as { item: Record<string, unknown> };
      const r = j.item;
      onAdd({
        id: r.id as number,
        institution_name: r.institution_name as string,
        provider_slug: (r.provider_slug as string) ?? "",
        principal_cents: Number(r.principal_cents),
        rate_bps: Number(r.rate_bps),
        term_months: Number(r.term_months),
        maturity_date: r.maturity_date as string,
        notes: (r.notes as string) ?? "",
      });
      (e.target as HTMLFormElement).reset();
      setTermMonths(12);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Could not add term deposit.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="bg-white border border-slate-200 rounded-xl p-4">
      <h2 className="text-base font-semibold text-slate-900 mb-3">Add term deposit</h2>
      <form
        className="grid grid-cols-1 sm:grid-cols-6 gap-3"
        onSubmit={(e) => { void handleSubmit(e); }}
      >
        <div className="sm:col-span-3">
          <label htmlFor="td-institution" className="block text-xs font-medium text-slate-600 mb-1">
            Institution <span className="text-red-500">*</span>
          </label>
          <input
            id="td-institution"
            name="institution_name"
            type="text"
            required
            placeholder="e.g. ING, UBank, Macquarie"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>
        <div className="sm:col-span-3">
          <label htmlFor="td-principal" className="block text-xs font-medium text-slate-600 mb-1">Principal ($)</label>
          <input
            id="td-principal"
            name="principal"
            type="number" inputMode="decimal"
            min="1"
            step="0.01"
            required
            placeholder="50000"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="td-rate" className="block text-xs font-medium text-slate-600 mb-1">Rate (% p.a.)</label>
          <input
            id="td-rate"
            name="rate_pct"
            type="number" inputMode="decimal"
            min="0"
            max="50"
            step="0.01"
            required
            placeholder="5.10"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="td-term" className="block text-xs font-medium text-slate-600 mb-1">Term (months)</label>
          <select
            id="td-term"
            name="term_months"
            value={termMonths}
            onChange={(e) => {
              const tm = Number(e.target.value);
              setTermMonths(tm);
              const matEl = e.currentTarget.closest("form")?.querySelector<HTMLInputElement>("[name=maturity_date]");
              if (matEl && !matEl.value) matEl.value = calcMaturity(tm);
            }}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            {TERM_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {m >= 12 ? `${m / 12 === Math.floor(m / 12) ? m / 12 : (m / 12).toFixed(1)} yr` : `${m} mo`}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="td-maturity" className="block text-xs font-medium text-slate-600 mb-1">Maturity date</label>
          <input
            id="td-maturity"
            name="maturity_date"
            type="date"
            required
            defaultValue={calcMaturity(12)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>
        <div className="sm:col-span-6">
          <label htmlFor="td-notes" className="block text-xs font-medium text-slate-600 mb-1">Notes (optional)</label>
          <input
            id="td-notes"
            name="notes"
            type="text"
            maxLength={500}
            placeholder="e.g. auto-renews unless cancelled 5 days before"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>
        {err && <p role="alert" className="sm:col-span-6 text-sm text-red-600">{err}</p>}
        <div className="sm:col-span-6">
          <button
            type="submit"
            disabled={busy}
            aria-busy={busy}
            className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-lg"
          >
            {busy ? "Adding…" : "Add term deposit"}
          </button>
        </div>
      </form>
    </section>
  );
}

interface TdCardProps {
  td: TdRow;
  onDelete: (id: number) => void;
}

function TdCard({ td, onDelete }: TdCardProps) {
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState(false);
  const days = daysUntil(td.maturity_date);
  const badge = maturityBadge(days);

  const maturityDisplay = new Date(td.maturity_date).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const handleDelete = async () => {
    setPendingDelete(false);
    setDeleting(true);
    try {
      const res = await fetch("/api/account/term-deposits", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: td.id }),
      });
      if (!res.ok) throw new Error();
      onDelete(td.id);
    } catch {
      setDeleting(false);
      setDeleteError("Could not remove term deposit — please try again.");
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-2xl" aria-hidden>🏦</span>
            <h3 className="text-base font-semibold text-slate-900 truncate">
              {td.institution_name}
            </h3>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge.cls}`}>
              {badge.label}
            </span>
          </div>
          <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-sm">
            <div>
              <span className="text-slate-500 text-xs uppercase tracking-wide">Principal</span>
              <p className="font-semibold text-slate-900">{fmtAud(td.principal_cents)}</p>
            </div>
            <div>
              <span className="text-slate-500 text-xs uppercase tracking-wide">Rate</span>
              <p className="font-semibold text-emerald-700">{fmtRate(td.rate_bps)}</p>
            </div>
            <div>
              <span className="text-slate-500 text-xs uppercase tracking-wide">Term</span>
              <p className="font-semibold text-slate-900">{td.term_months}m</p>
            </div>
            <div>
              <span className="text-slate-500 text-xs uppercase tracking-wide">Matures</span>
              <p className="font-semibold text-slate-900">{maturityDisplay}</p>
            </div>
          </div>
          {td.notes && (
            <p className="mt-2 text-xs text-slate-500 truncate">{td.notes}</p>
          )}
        </div>
        {pendingDelete ? (
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs text-red-600 font-medium">Remove?</span>
            <button
              onClick={() => { void handleDelete(); }}
              disabled={deleting}
              aria-busy={deleting}
              className="text-xs font-bold text-white bg-red-600 hover:bg-red-700 px-2 py-0.5 rounded-md transition-colors disabled:opacity-50"
            >{deleting ? "…" : "Yes"}</button>
            <button
              onClick={() => setPendingDelete(false)}
              className="text-xs text-slate-500 hover:text-slate-700 px-2 py-0.5 rounded-md border border-slate-200 hover:border-slate-300 transition-colors"
            >No</button>
          </div>
        ) : (
          <button
            onClick={() => setPendingDelete(true)}
            disabled={deleting}
            className="shrink-0 text-slate-400 hover:text-red-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Remove term deposit"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>
      {deleteError && (
        <p role="alert" className="mt-2 text-xs text-red-600">{deleteError}</p>
      )}
    </div>
  );
}

export default function TermDepositsClient({ initialItems }: Props) {
  const [items, setItems] = useState<TdRow[]>(initialItems);

  const handleAdd = (row: TdRow) => {
    setItems((prev) =>
      [...prev, row].sort((a, b) => a.maturity_date.localeCompare(b.maturity_date)),
    );
  };

  const handleDelete = (id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  };

  // Group by urgency for display.
  const overdue = items.filter((t) => daysUntil(t.maturity_date) < 0);
  const urgent = items.filter((t) => {
    const d = daysUntil(t.maturity_date);
    return d >= 0 && d <= 30;
  });
  const upcoming = items.filter((t) => daysUntil(t.maturity_date) > 30);

  return (
    <div className="space-y-6">
      <AddForm onAdd={handleAdd} />

      {items.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          <p className="text-4xl mb-3" aria-hidden>🏦</p>
          <p className="font-medium text-slate-700">No term deposits tracked yet</p>
          <p className="text-sm mt-1">Add your first TD above to get 30/7/1-day maturity reminders.</p>
        </div>
      )}

      {overdue.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">Matured</h2>
          <div className="space-y-3">
            {overdue.map((td) => (
              <TdCard key={td.id} td={td} onDelete={handleDelete} />
            ))}
          </div>
        </section>
      )}

      {urgent.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Maturing soon <span className="text-amber-600">(within 30 days)</span>
          </h2>
          <div className="space-y-3">
            {urgent.map((td) => (
              <TdCard key={td.id} td={td} onDelete={handleDelete} />
            ))}
          </div>
        </section>
      )}

      {upcoming.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">Upcoming</h2>
          <div className="space-y-3">
            {upcoming.map((td) => (
              <TdCard key={td.id} td={td} onDelete={handleDelete} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
