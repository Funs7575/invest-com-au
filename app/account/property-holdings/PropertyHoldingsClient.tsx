"use client";

import { useMemo, useState } from "react";

export interface PropertyRow {
  id: number;
  addressLine: string;
  suburb: string | null;
  state: string | null;
  postcode: string | null;
  purchasePriceCents: number;
  purchaseDate: string;
  currentValueEstimateCents: number | null;
  isInvestmentProperty: boolean;
  weeklyRentCents: number | null;
  loanBalanceCents: number | null;
  loanRatePct: number | null;
  propertyType: string | null;
  notes: string | null;
}

interface Props {
  initialItems: PropertyRow[];
}

const STATES = ["NSW","VIC","QLD","WA","SA","TAS","NT","ACT"] as const;
const PROPERTY_TYPES = [
  { value: "house",      label: "House" },
  { value: "apartment",  label: "Apartment" },
  { value: "townhouse",  label: "Townhouse" },
  { value: "commercial", label: "Commercial" },
  { value: "land",       label: "Land" },
  { value: "rural",      label: "Rural" },
  { value: "other",      label: "Other" },
] as const;

const fmtCents = (cents: number) =>
  (cents / 100).toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  });

const yearsBetween = (iso: string) => {
  const ms = Date.now() - new Date(`${iso}T00:00:00Z`).getTime();
  return Math.max(0, ms / (365.25 * 86400_000));
};

const grossYieldPct = (weeklyRentCents: number | null, valueCents: number) => {
  if (!weeklyRentCents || !valueCents) return null;
  const annualRentCents = weeklyRentCents * 52;
  return (annualRentCents / valueCents) * 100;
};

export default function PropertyHoldingsClient({ initialItems }: Props) {
  const [items, setItems] = useState<PropertyRow[]>(initialItems);
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const totals = useMemo(() => {
    const totalCostCents = items.reduce((s, p) => s + p.purchasePriceCents, 0);
    const totalValueCents = items.reduce(
      (s, p) => s + (p.currentValueEstimateCents ?? p.purchasePriceCents),
      0,
    );
    const totalLoanCents = items.reduce((s, p) => s + (p.loanBalanceCents ?? 0), 0);
    const totalAnnualRentCents = items.reduce(
      (s, p) => s + (p.weeklyRentCents ?? 0) * 52,
      0,
    );
    return {
      count: items.length,
      totalCostCents,
      totalValueCents,
      totalLoanCents,
      totalEquityCents: totalValueCents - totalLoanCents,
      totalAnnualRentCents,
    };
  }, [items]);

  const handleAdd = async (form: FormData) => {
    setError(null);
    setAdding(true);
    const body = {
      address_line: String(form.get("address") ?? "").trim(),
      suburb: String(form.get("suburb") ?? "").trim() || null,
      state: String(form.get("state") ?? "") || null,
      postcode: String(form.get("postcode") ?? "").trim() || null,
      purchase_price_cents: Math.round(Number(form.get("price") ?? 0) * 100),
      purchase_date: String(form.get("purchase_date") ?? ""),
      current_value_estimate_cents: form.get("current_value")
        ? Math.round(Number(form.get("current_value")) * 100)
        : null,
      is_investment_property: form.get("is_investment") === "on",
      weekly_rent_cents: form.get("weekly_rent")
        ? Math.round(Number(form.get("weekly_rent")) * 100)
        : null,
      loan_balance_cents: form.get("loan_balance")
        ? Math.round(Number(form.get("loan_balance")) * 100)
        : null,
      loan_rate_pct: form.get("loan_rate") ? Number(form.get("loan_rate")) : null,
      property_type: String(form.get("property_type") ?? "") || null,
      notes: String(form.get("notes") ?? "").trim() || null,
    };
    try {
      const res = await fetch("/api/account/property-holdings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Could not add property.");
      const j = (await res.json()) as { item: Record<string, unknown> };
      const r = j.item as unknown as Record<string, unknown>;
      const newRow: PropertyRow = {
        id: r.id as number,
        addressLine: r.address_line as string,
        suburb: (r.suburb as string | null) ?? null,
        state: (r.state as string | null) ?? null,
        postcode: (r.postcode as string | null) ?? null,
        purchasePriceCents: Number(r.purchase_price_cents),
        purchaseDate: r.purchase_date as string,
        currentValueEstimateCents: r.current_value_estimate_cents != null ? Number(r.current_value_estimate_cents) : null,
        isInvestmentProperty: Boolean(r.is_investment_property),
        weeklyRentCents: r.weekly_rent_cents != null ? Number(r.weekly_rent_cents) : null,
        loanBalanceCents: r.loan_balance_cents != null ? Number(r.loan_balance_cents) : null,
        loanRatePct: r.loan_rate_pct != null ? Number(r.loan_rate_pct) : null,
        propertyType: (r.property_type as string | null) ?? null,
        notes: (r.notes as string | null) ?? null,
      };
      setItems((prev) => [newRow, ...prev]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add property.");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: number) => {
    setError(null);
    const snapshot = items;
    setDeletingId(id);
    setItems((prev) => prev.filter((h) => h.id !== id));
    try {
      const res = await fetch("/api/account/property-holdings", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("delete_failed");
    } catch {
      setItems(snapshot);
      setError("Could not delete property. Try again.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Totals */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Properties" value={String(totals.count)} tone="slate" />
        <Stat label="Total est. value" value={fmtCents(totals.totalValueCents)} tone="emerald" />
        <Stat label="Total loans" value={fmtCents(totals.totalLoanCents)} tone="amber" />
        <Stat label="Net equity" value={fmtCents(totals.totalEquityCents)} tone="sky" />
      </section>

      {/* Add form */}
      <section className="bg-white border border-slate-200 rounded-xl p-4">
        <h2 className="text-base font-semibold text-slate-900 mb-3">Add property</h2>
        <form
          className="grid grid-cols-1 sm:grid-cols-6 gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            void handleAdd(fd);
            e.currentTarget.reset();
          }}
        >
          <Field label="Address line" required cols="sm:col-span-3">
            <input type="text" name="address" required maxLength={200}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </Field>
          <Field label="Suburb" cols="sm:col-span-2">
            <input type="text" name="suburb" maxLength={100}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </Field>
          <Field label="State">
            <select name="state" defaultValue="NSW"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
              {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Postcode">
            <input type="text" name="postcode" maxLength={10}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </Field>
          <Field label="Type">
            <select name="property_type"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
              <option value="">Select…</option>
              {PROPERTY_TYPES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </Field>
          <Field label="Purchase price (AUD)" required>
            <input type="number" name="price" required min={0} step={1}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </Field>
          <Field label="Purchase date" required>
            <input type="date" name="purchase_date" required
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </Field>
          <Field label="Current est. value (AUD)">
            <input type="number" name="current_value" min={0} step={1}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </Field>
          <Field label="Investment property?" cols="sm:col-span-2">
            <label className="flex items-center gap-2 mt-2">
              <input type="checkbox" name="is_investment" />
              <span className="text-sm text-slate-700">Yes — track rent + loan</span>
            </label>
          </Field>
          <Field label="Weekly rent (AUD)">
            <input type="number" name="weekly_rent" min={0} step={1}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </Field>
          <Field label="Loan balance (AUD)">
            <input type="number" name="loan_balance" min={0} step={1}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </Field>
          <Field label="Loan rate %">
            <input type="number" name="loan_rate" min={0} max={20} step={0.01}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </Field>
          <Field label="Notes" cols="sm:col-span-6">
            <input type="text" name="notes" maxLength={500}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </Field>
          <div className="sm:col-span-6 flex justify-end">
            <button type="submit" disabled={adding}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium rounded-lg disabled:opacity-50">
              {adding ? "Adding…" : "Add property"}
            </button>
          </div>
        </form>
        {error && <p className="text-sm text-red-700 mt-2" role="alert">{error}</p>}
      </section>

      {/* List */}
      <section>
        <h2 className="text-base font-semibold text-slate-900 mb-3">Your properties</h2>
        {items.length === 0 ? (
          <p className="text-sm text-slate-500 italic">No properties yet — add your first above.</p>
        ) : (
          <ul className="divide-y divide-slate-200 border border-slate-200 rounded-xl">
            {items.map((p) => {
              const value = p.currentValueEstimateCents ?? p.purchasePriceCents;
              const equity = value - (p.loanBalanceCents ?? 0);
              const yieldPct = grossYieldPct(p.weeklyRentCents, value);
              const yrs = yearsBetween(p.purchaseDate);
              return (
                <li key={p.id} className="px-4 py-3 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-900 truncate">{p.addressLine}</span>
                      {p.state && <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded">{p.suburb ? `${p.suburb}, ${p.state}` : p.state}</span>}
                      {p.isInvestmentProperty && <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded">Investment</span>}
                      {p.propertyType && <span className="text-xs text-slate-500">{p.propertyType}</span>}
                    </div>
                    <div className="text-sm text-slate-600 mt-1">
                      {fmtCents(p.purchasePriceCents)} · acquired {p.purchaseDate} · held {yrs.toFixed(1)} yrs
                      {p.weeklyRentCents != null && <> · rent {fmtCents(p.weeklyRentCents)}/wk{yieldPct != null && ` (${yieldPct.toFixed(1)}% gross)`}</>}
                    </div>
                    {p.notes && <p className="text-xs text-slate-500 italic mt-1 truncate">{p.notes}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-semibold text-slate-900">{fmtCents(value)}</div>
                    <div className="text-xs text-slate-500">est. value</div>
                    {p.loanBalanceCents != null && (
                      <div className="text-xs text-amber-700 mt-0.5">
                        equity {fmtCents(equity)}
                      </div>
                    )}
                    <button type="button" onClick={() => void handleDelete(p.id)}
                      disabled={deletingId === p.id}
                      className="text-xs text-red-700 hover:text-red-900 mt-1 disabled:opacity-50">
                      {deletingId === p.id ? "Removing…" : "Remove"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function Field({ label, required, children, cols }: { label: string; required?: boolean; children: React.ReactNode; cols?: string }) {
  return (
    <label className={`block ${cols ?? ""}`}>
      <span className="block text-xs font-medium text-slate-700 mb-1">
        {label} {required && <span className="text-red-600">*</span>}
      </span>
      {children}
    </label>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: "slate" | "emerald" | "amber" | "sky" }) {
  const cls = {
    slate:   "bg-slate-50 border-slate-200 text-slate-700",
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-700",
    amber:   "bg-amber-50 border-amber-200 text-amber-700",
    sky:     "bg-sky-50 border-sky-200 text-sky-700",
  }[tone];
  const valueColor = {
    slate:   "text-slate-900",
    emerald: "text-emerald-900",
    amber:   "text-amber-900",
    sky:     "text-sky-900",
  }[tone];
  return (
    <div className={`border rounded-xl p-3 ${cls}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wider opacity-80">{label}</p>
      <p className={`text-lg font-bold mt-0.5 ${valueColor}`}>{value}</p>
    </div>
  );
}
