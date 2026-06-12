"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

/**
 * ManualBalancesPanel
 *
 * Inline add/edit/delete form for manual savings/super/property/other
 * balances. Writes to /api/account/net-worth/balances and calls
 * `router.refresh()` to revalidate the server component above so the
 * net-worth total updates without a full page reload.
 */

export interface ManualBalance {
  id: string;
  label: string;
  amount_cents: number;
  category: "savings" | "super" | "property" | "other";
  updated_at: string;
  /** Whether this balance is shared with the user's household. */
  shared?: boolean;
}

const CATEGORIES: { value: ManualBalance["category"]; label: string }[] = [
  { value: "savings", label: "Savings" },
  { value: "super", label: "Super" },
  { value: "property", label: "Property" },
  { value: "other", label: "Other" },
];

const CATEGORY_COLOURS: Record<ManualBalance["category"], string> = {
  savings: "bg-emerald-100 text-emerald-700",
  super:    "bg-violet-100 text-violet-700",
  property: "bg-amber-100 text-amber-700",
  other:    "bg-slate-100 text-slate-600",
};

function fmt(cents: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function parseDollarsToCents(raw: string): number | null {
  const n = parseFloat(raw.replace(/[^0-9.]/g, ""));
  if (isNaN(n) || n < 0) return null;
  return Math.round(n * 100);
}

interface AddFormState {
  label: string;
  amount: string;
  category: ManualBalance["category"];
}

const EMPTY_FORM: AddFormState = { label: "", amount: "", category: "savings" };

export default function ManualBalancesPanel({
  initialBalances,
  householdEnabled = false,
  partnerLabel = "your partner",
  partnerBalances = [],
}: {
  initialBalances: ManualBalance[];
  /** households flag on AND an accepted partner → show share toggles. */
  householdEnabled?: boolean;
  partnerLabel?: string;
  /** Partner's shared balances (read-only) shown when in household view. */
  partnerBalances?: ManualBalance[];
}) {
  const router = useRouter();
  const [balances, setBalances] = useState<ManualBalance[]>(initialBalances);
  const [form, setForm] = useState<AddFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Optimistically flip a balance's shared state via the share API. Owner-only
  // write — enforced server-side. Rolls back on failure.
  const handleToggleShare = async (id: string, shared: boolean) => {
    const snapshot = balances;
    setBalances((prev) => prev.map((b) => (b.id === id ? { ...b, shared } : b)));
    try {
      const res = await fetch("/api/account/household/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "balance", item_id: id, shared }),
      });
      if (!res.ok) throw new Error("share_failed");
    } catch {
      setBalances(snapshot);
      setError("Could not update sharing. Try again.");
    }
  };

  const handleAdd = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const amountCents = parseDollarsToCents(form.amount);
    if (!form.label.trim()) { setError("Label is required."); return; }
    if (amountCents === null) { setError("Enter a valid dollar amount."); return; }

    setSaving(true);
    try {
      const res = await fetch("/api/account/net-worth/balances", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: form.label.trim(),
          amount_cents: amountCents,
          category: form.category,
        }),
      });
      if (!res.ok) {
        const body = await res.json() as { error?: string };
        throw new Error(body.error ?? "save_failed");
      }
      const { item } = await res.json() as { item: ManualBalance };
      setBalances((prev) => [item, ...prev]);
      setForm(EMPTY_FORM);
      setShowForm(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save. Try again.");
    } finally {
      setSaving(false);
    }
  }, [form, router]);

  const handleDelete = useCallback(async (id: string) => {
    setDeletingId(id);
    setError(null);
    try {
      const res = await fetch("/api/account/net-worth/balances", {
        method: "DELETE",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const body = await res.json() as { error?: string };
        throw new Error(body.error ?? "delete_failed");
      }
      setBalances((prev) => prev.filter((b) => b.id !== id));
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete. Try again.");
    } finally {
      setDeletingId(null);
    }
  }, [router]);

  return (
    <section className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-900">Manual balances</h2>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="text-xs font-semibold text-violet-700 hover:text-violet-900"
          >
            + Add balance
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={(e) => void handleAdd(e)} className="mb-4 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1" htmlFor="mb-label">
              Label
            </label>
            <input
              id="mb-label"
              type="text"
              maxLength={200}
              placeholder="e.g. ING Savings Maximiser"
              value={form.label}
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1" htmlFor="mb-amount">
              Amount (AUD, e.g. 25000)
            </label>
            <input
              id="mb-amount"
              type="text"
              inputMode="decimal"
              placeholder="25000"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1" htmlFor="mb-category">
              Category
            </label>
            <select
              id="mb-category"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as ManualBalance["category"] }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {error && (
            <p className="text-xs text-red-600" role="alert">{error}</p>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              aria-busy={saving}
              className="flex-1 py-2 bg-violet-700 hover:bg-violet-800 text-white text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Saving…" : "Save balance"}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setError(null); }}
              className="px-3 py-2 text-sm text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {balances.length === 0 && !showForm && (
        <p className="text-sm text-slate-500 text-center py-4">
          No manual balances yet. Add savings, super, property, or other accounts.
        </p>
      )}

      {balances.length > 0 && (
        <ul className="space-y-2">
          {balances.map((b) => (
            <li
              key={b.id}
              className="rounded-lg border border-slate-100 px-3 py-2.5"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[0.6rem] font-semibold uppercase ${CATEGORY_COLOURS[b.category]}`}>
                    {b.category}
                  </span>
                  <span className="text-sm text-slate-800 truncate">{b.label}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-semibold text-slate-900">{fmt(b.amount_cents)}</span>
                  <button
                    type="button"
                    onClick={() => void handleDelete(b.id)}
                    disabled={deletingId === b.id}
                    aria-label={`Delete ${b.label}`}
                    className="text-slate-500 hover:text-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {deletingId === b.id ? (
                      <svg aria-hidden="true" className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              {householdEnabled && (
                <label className="mt-1.5 flex cursor-pointer items-center gap-2 text-xs text-slate-500">
                  <input
                    type="checkbox"
                    checked={b.shared ?? false}
                    onChange={(e) => void handleToggleShare(b.id, e.target.checked)}
                    className="h-3.5 w-3.5 accent-violet-600"
                  />
                  <span>Share with household</span>
                </label>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Partner's shared balances — read-only. Shown only in household view. */}
      {partnerBalances.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold text-violet-700">
            Shared with you by {partnerLabel}
          </p>
          <ul className="space-y-2">
            {partnerBalances.map((b) => (
              <li
                key={`p-${b.id}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-violet-100 bg-violet-50/40 px-3 py-2.5"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[0.6rem] font-semibold uppercase ${CATEGORY_COLOURS[b.category]}`}>
                    {b.category}
                  </span>
                  <span className="truncate text-sm text-slate-800">{b.label}</span>
                  <span className="shrink-0 rounded-full bg-violet-100 px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase text-violet-700">
                    {partnerLabel}
                  </span>
                </div>
                <span className="shrink-0 text-sm font-semibold text-slate-900">{fmt(b.amount_cents)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && !showForm && (
        <p className="mt-2 text-xs text-red-600" role="alert">{error}</p>
      )}

      <p className="mt-3 text-xs text-slate-500">
        General information only. Values are self-reported and not verified against statements.
      </p>
    </section>
  );
}
