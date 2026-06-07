"use client";

import { useEffect, useState } from "react";
import { logger } from "@/lib/logger";

const log = logger("admin-loan-rates-editor");

interface LoanRate {
  id: string;
  lender_name: string;
  lender_slug: string;
  rate_pct: number;
  comparison_rate_pct: number;
  max_lvr: number;
  interest_only: boolean;
  offset_available: boolean;
  min_loan_cents: number;
  apply_url: string;
  updated_at: string;
}

type DraftRate = Omit<LoanRate, "id" | "updated_at">;

const EMPTY_DRAFT: DraftRate = {
  lender_name: "",
  lender_slug: "",
  rate_pct: 6.0,
  comparison_rate_pct: 6.1,
  max_lvr: 80,
  interest_only: false,
  offset_available: false,
  min_loan_cents: 5000000,
  apply_url: "/find-advisor?type=mortgage-brokers",
};

function formatMinLoan(cents: number): string {
  if (cents >= 100_000_000) return `$${(cents / 100_000_000).toFixed(0)}M`;
  return `$${(cents / 100).toLocaleString("en-AU", { maximumFractionDigits: 0 })}`;
}

export default function LoanRatesEditor() {
  const [rows, setRows] = useState<LoanRate[]>([]);
  const [editing, setEditing] = useState<LoanRate | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<DraftRate>(EMPTY_DRAFT);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/loan-rates");
    if (!res.ok) {
      log.error("Failed to load loan rates", { status: res.status });
      return;
    }
    const json = await res.json() as { rows: LoanRate[] };
    setRows(json.rows ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function save() {
    setSaveError(null);
    setBusy(true);
    try {
      const payload = editing
        ? { ...draft, id: editing.id }
        : draft;

      const res = await fetch("/api/admin/loan-rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        setSaveError(err.error ?? "Save failed");
        return;
      }

      setEditing(null);
      setCreating(false);
      setDraft(EMPTY_DRAFT);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setPendingDeleteId(null);
    setDeleteError(null);
    const res = await fetch(`/api/admin/loan-rates?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      setDeleteError("Delete failed");
      return;
    }
    await load();
  }

  function startEdit(row: LoanRate) {
    setEditing(row);
    setCreating(false);
    const { id: _id, updated_at: _ua, ...rest } = row;
    void _id;
    void _ua;
    setDraft(rest);
  }

  function startCreate() {
    setEditing(null);
    setCreating(true);
    setDraft(EMPTY_DRAFT);
  }

  function cancelForm() {
    setEditing(null);
    setCreating(false);
    setDraft(EMPTY_DRAFT);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {rows.length} lender{rows.length !== 1 ? "s" : ""} · sorted by rate (lowest first)
        </p>
        <button
          type="button"
          onClick={startCreate}
          className="bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold px-4 py-2 rounded"
        >
          + Add lender
        </button>
      </div>

      {(editing !== null || creating) && (
        <LoanRateForm
          draft={draft}
          setDraft={setDraft}
          onSave={save}
          onCancel={() => { cancelForm(); setSaveError(null); }}
          busy={busy}
          isEdit={editing !== null}
          saveError={saveError}
        />
      )}

      {deleteError && (
        <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">{deleteError}</p>
      )}

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs font-semibold text-slate-600">
            <tr>
              <th className="text-left px-3 py-2">Lender</th>
              <th className="text-left px-3 py-2">Slug</th>
              <th className="text-right px-3 py-2">Rate</th>
              <th className="text-right px-3 py-2">Comp rate</th>
              <th className="text-right px-3 py-2">Max LVR</th>
              <th className="text-center px-3 py-2">I/O</th>
              <th className="text-center px-3 py-2">Offset</th>
              <th className="text-right px-3 py-2">Min loan</th>
              <th className="text-left px-3 py-2">Updated</th>
              <th className="text-left px-3 py-2 w-24">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={10} className="text-center text-slate-400 py-6">
                  No loan rates. Add the first lender above.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-3 py-2 font-semibold text-slate-900">{r.lender_name}</td>
                <td className="px-3 py-2 font-mono text-xs text-slate-500">{r.lender_slug}</td>
                <td className="px-3 py-2 text-right font-bold text-slate-900">{r.rate_pct.toFixed(2)}%</td>
                <td className="px-3 py-2 text-right text-slate-500">{r.comparison_rate_pct.toFixed(2)}%</td>
                <td className="px-3 py-2 text-right text-slate-700">{r.max_lvr}%</td>
                <td className="px-3 py-2 text-center">
                  <span className={r.interest_only ? "text-emerald-700 font-semibold" : "text-slate-300"}>
                    {r.interest_only ? "Yes" : "No"}
                  </span>
                </td>
                <td className="px-3 py-2 text-center">
                  <span className={r.offset_available ? "text-emerald-700 font-semibold" : "text-slate-300"}>
                    {r.offset_available ? "Yes" : "No"}
                  </span>
                </td>
                <td className="px-3 py-2 text-right text-slate-500 text-xs">{formatMinLoan(r.min_loan_cents)}</td>
                <td className="px-3 py-2 text-xs text-slate-400">
                  {new Date(r.updated_at).toLocaleDateString("en-AU", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </td>
                <td className="px-3 py-2 text-xs">
                  <button
                    type="button"
                    className="text-blue-600 hover:underline mr-2"
                    onClick={() => startEdit(r)}
                  >
                    Edit
                  </button>
                  {pendingDeleteId === r.id ? (
                    <span className="inline-flex items-center gap-1">
                      <span className="text-red-700 font-semibold">Delete?</span>
                      <button type="button" className="text-red-600 hover:underline font-bold" onClick={() => void remove(r.id)}>Yes</button>
                      <button type="button" className="text-slate-500 hover:underline" onClick={() => setPendingDeleteId(null)}>No</button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="text-red-600 hover:underline"
                      onClick={() => { setDeleteError(null); setPendingDeleteId(r.id); }}
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface FormProps {
  draft: DraftRate;
  setDraft: (d: DraftRate) => void;
  onSave: () => void;
  onCancel: () => void;
  busy: boolean;
  isEdit: boolean;
  saveError?: string | null;
}

function LoanRateForm({ draft, setDraft, onSave, onCancel, busy, isEdit, saveError }: FormProps) {
  function set<K extends keyof DraftRate>(key: K, value: DraftRate[K]) {
    setDraft({ ...draft, [key]: value });
  }

  return (
    <div className="bg-violet-50 border border-violet-200 rounded-lg p-5 space-y-4">
      <h2 className="font-bold text-slate-900">{isEdit ? "Edit lender" : "Add lender"}</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Lender name">
          <input
            type="text"
            value={draft.lender_name}
            onChange={(e) => set("lender_name", e.target.value)}
            placeholder="e.g. Commonwealth Bank"
            className="w-full text-sm border rounded px-2 py-1.5"
          />
        </Field>
        <Field label="Lender slug (lowercase, hyphens)">
          <input
            type="text"
            value={draft.lender_slug}
            onChange={(e) => set("lender_slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
            placeholder="e.g. commonwealth-bank"
            className="w-full text-sm border rounded px-2 py-1.5 font-mono"
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="Rate % (p.a.)">
          <input
            type="number"
            step="0.01"
            min="0"
            max="99"
            value={draft.rate_pct}
            onChange={(e) => set("rate_pct", parseFloat(e.target.value) || 0)}
            className="w-full text-sm border rounded px-2 py-1.5"
          />
        </Field>
        <Field label="Comparison rate % (p.a.)">
          <input
            type="number"
            step="0.01"
            min="0"
            max="99"
            value={draft.comparison_rate_pct}
            onChange={(e) => set("comparison_rate_pct", parseFloat(e.target.value) || 0)}
            className="w-full text-sm border rounded px-2 py-1.5"
          />
        </Field>
        <Field label="Max LVR %">
          <input
            type="number"
            step="1"
            min="1"
            max="100"
            value={draft.max_lvr}
            onChange={(e) => set("max_lvr", parseInt(e.target.value, 10) || 0)}
            className="w-full text-sm border rounded px-2 py-1.5"
          />
        </Field>
      </div>

      <Field label="Min loan (cents — e.g. 500000000 = $5,000,000)">
        <input
          type="number"
          step="100"
          min="0"
          value={draft.min_loan_cents}
          onChange={(e) => set("min_loan_cents", parseInt(e.target.value, 10) || 0)}
          className="w-full text-sm border rounded px-2 py-1.5"
        />
        <span className="text-xs text-slate-400 mt-0.5 block">
          Display value: {formatMinLoan(draft.min_loan_cents)}
        </span>
      </Field>

      <Field label="Apply URL (affiliate link or /find-advisor fallback)">
        <input
          type="text"
          value={draft.apply_url}
          onChange={(e) => set("apply_url", e.target.value)}
          placeholder="/find-advisor?type=mortgage-brokers"
          className="w-full text-sm border rounded px-2 py-1.5"
        />
      </Field>

      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={draft.interest_only}
            onChange={(e) => set("interest_only", e.target.checked)}
          />
          <span>Interest-only available</span>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={draft.offset_available}
            onChange={(e) => set("offset_available", e.target.checked)}
          />
          <span>Offset account available</span>
        </label>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          disabled={busy}
          onClick={onSave}
          className="bg-violet-600 hover:bg-violet-700 disabled:bg-slate-300 text-white text-sm font-bold px-4 py-2 rounded"
        >
          {busy ? "Saving…" : isEdit ? "Save changes" : "Add lender"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-semibold px-4 py-2 rounded"
        >
          Cancel
        </button>
        {saveError && <p role="alert" className="text-xs text-red-700 ml-2">{saveError}</p>}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-slate-600 mb-1">{label}</span>
      {children}
    </label>
  );
}
