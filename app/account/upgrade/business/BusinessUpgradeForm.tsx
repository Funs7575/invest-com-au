"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

interface ExistingProfile {
  business_name: string;
  legal_name: string | null;
  abn: string | null;
  acn: string | null;
  industry: string | null;
  employees_band: string | null;
  revenue_band: string | null;
  primary_state: string | null;
  year_established: number | null;
}

interface Props {
  existing: ExistingProfile | null;
  prefillName: string | null;
  isEdit: boolean;
}

const EMPLOYEES_BANDS = ["1", "2-4", "5-19", "20-199", "200+"] as const;
const REVENUE_BANDS = [
  { value: "under_75k", label: "Under $75k" },
  { value: "75k_2m",   label: "$75k – $2M" },
  { value: "2m_10m",   label: "$2M – $10M" },
  { value: "10m_50m",  label: "$10M – $50M" },
  { value: "50m_plus", label: "$50M+" },
] as const;
const STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "NT", "ACT"] as const;

export default function BusinessUpgradeForm({ existing, prefillName, isEdit }: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialName = existing?.business_name ?? prefillName ?? "";

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const body: Record<string, unknown> = {
      business_name: String(fd.get("business_name") ?? "").trim(),
      legal_name: String(fd.get("legal_name") ?? "").trim() || null,
      abn: String(fd.get("abn") ?? "").replace(/\s/g, "") || null,
      acn: String(fd.get("acn") ?? "").replace(/\s/g, "") || null,
      industry: String(fd.get("industry") ?? "").trim() || null,
      employees_band: String(fd.get("employees_band") ?? "") || null,
      revenue_band: String(fd.get("revenue_band") ?? "") || null,
      primary_state: String(fd.get("primary_state") ?? "") || null,
      year_established: fd.get("year_established") ? Number(fd.get("year_established")) : null,
    };
    try {
      const res = await fetch("/api/account/business", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Could not save");
      }
      // Set workspace cookie + redirect to portal.
      await fetch("/api/account/active-kind", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "business_owner" }),
      });
      router.push("/business-portal");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save business profile.");
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white border border-slate-200 rounded-xl p-5 space-y-4"
    >
      <Field label="Business name" required>
        <input type="text" name="business_name" required maxLength={200} defaultValue={initialName}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
      </Field>
      <Field label="Legal name (if different)">
        <input type="text" name="legal_name" maxLength={200} defaultValue={existing?.legal_name ?? ""}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="ABN (11 digits)">
          <input type="text" name="abn" maxLength={11} defaultValue={existing?.abn ?? ""}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
        </Field>
        <Field label="ACN (9 digits, optional)">
          <input type="text" name="acn" maxLength={9} defaultValue={existing?.acn ?? ""}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
        </Field>
      </div>
      <Field label="Industry (free text)">
        <input type="text" name="industry" maxLength={100} defaultValue={existing?.industry ?? ""}
          placeholder="e.g. SaaS, retail, professional services"
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Employees">
          <select name="employees_band" defaultValue={existing?.employees_band ?? ""}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
            <option value="">Select…</option>
            {EMPLOYEES_BANDS.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </Field>
        <Field label="Annual revenue">
          <select name="revenue_band" defaultValue={existing?.revenue_band ?? ""}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
            <option value="">Select…</option>
            {REVENUE_BANDS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Primary state">
          <select name="primary_state" defaultValue={existing?.primary_state ?? ""}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
            <option value="">Select…</option>
            {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Year established">
          <input type="number" name="year_established" min={1850} max={2100}
            defaultValue={existing?.year_established ?? ""}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
        </Field>
      </div>
      {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
      <button type="submit" disabled={submitting}
        className="w-full px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-lg disabled:opacity-50">
        {submitting ? "Saving…" : isEdit ? "Save changes" : "Create business workspace"}
      </button>
      <p className="text-xs text-slate-500 italic">
        General information only — see your accountant for tax / legal advice on grant eligibility, R&D claims, or sale prep.
      </p>
    </form>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-700 mb-1">
        {label} {required && <span className="text-red-600">*</span>}
      </span>
      {children}
    </label>
  );
}
