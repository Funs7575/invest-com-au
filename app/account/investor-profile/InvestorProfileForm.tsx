"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type {
  InvestorProfile,
  BudgetBand,
  ExperienceLevel,
} from "@/lib/investor-profiles";

interface Props {
  initial: InvestorProfile | null;
}

const COUNTRIES = [
  { value: "uk", label: "🇬🇧 United Kingdom" },
  { value: "us", label: "🇺🇸 United States" },
  { value: "cn", label: "🇨🇳 China" },
  { value: "in", label: "🇮🇳 India" },
  { value: "jp", label: "🇯🇵 Japan" },
  { value: "sg", label: "🇸🇬 Singapore" },
  { value: "hk", label: "🇭🇰 Hong Kong" },
  { value: "kr", label: "🇰🇷 South Korea" },
  { value: "my", label: "🇲🇾 Malaysia" },
  { value: "nz", label: "🇳🇿 New Zealand" },
  { value: "ae", label: "🇦🇪 UAE" },
  { value: "sa", label: "🇸🇦 Saudi Arabia" },
] as const;

const BUDGETS: { value: BudgetBand; label: string }[] = [
  { value: "small",  label: "Under $5K" },
  { value: "medium", label: "$5K – $50K" },
  { value: "large",  label: "$50K – $100K" },
  { value: "whale",  label: "$100K+" },
];

const EXPERIENCE: { value: ExperienceLevel; label: string }[] = [
  { value: "beginner",     label: "Beginner — new to this" },
  { value: "intermediate", label: "Intermediate — confident with the basics" },
  { value: "pro",          label: "Pro — advanced trading / SMSF / pre-IPO" },
];

const FLAGS = [
  { key: "is_fhb",            label: "First home buyer",       desc: "Surfaces FHOG / FHSS guides + first-home savings calculators." },
  { key: "is_pre_retiree",    label: "Pre-retiree",            desc: "Surfaces super-contribution + transition-to-retirement content." },
  { key: "is_business_owner", label: "Business owner",         desc: "Surfaces grants tracker + R&D + sell-business content." },
  { key: "is_cross_border",   label: "Cross-border investor",  desc: "Surfaces foreign-investment hubs + country-specific tax guides." },
  { key: "is_hnw",            label: "High-net-worth (>$100K)",desc: "Surfaces wholesale + private-credit + premium-tier advisor content." },
] as const;

export default function InvestorProfileForm({ initial }: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const body: Record<string, unknown> = {
      display_name: String(fd.get("display_name") ?? "").trim() || null,
      intent_country_snapshot: String(fd.get("intent_country") ?? "") || null,
      budget_band: String(fd.get("budget") ?? "") || null,
      experience_level: String(fd.get("experience") ?? "") || null,
      primary_vertical: String(fd.get("primary_vertical") ?? "") || null,
    };
    for (const f of FLAGS) {
      body[f.key] = fd.get(f.key) === "on";
    }
    try {
      const res = await fetch("/api/account/investor-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Could not save");
      }
      setSaved(true);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save profile.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white border border-slate-200 rounded-xl p-5 space-y-5"
    >
      <Field label="Display name (optional)">
        <input
          type="text" name="display_name" maxLength={120}
          defaultValue={initial?.displayName ?? ""}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
        />
      </Field>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-slate-900">Life-event flags</legend>
        <p className="text-xs text-slate-500">
          Used for content routing only. Never to drive personal-advice copy.
        </p>
        {FLAGS.map((f) => (
          <label key={f.key} className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox" name={f.key}
              defaultChecked={Boolean(initial?.[f.key as keyof InvestorProfile])}
              className="mt-0.5"
            />
            <span>
              <span className="text-sm font-medium text-slate-900">{f.label}</span>
              <span className="block text-xs text-slate-600">{f.desc}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <Field label="Country / origin (if cross-border)">
        <select name="intent_country" defaultValue={initial?.intentCountrySnapshot ?? ""}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
          <option value="">Australia (default)</option>
          {COUNTRIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </Field>

      <Field label="Investment budget band">
        <select name="budget" defaultValue={initial?.budgetBand ?? ""}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
          <option value="">Prefer not to say</option>
          {BUDGETS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
        </select>
      </Field>

      <Field label="Investing experience">
        <select name="experience" defaultValue={initial?.experienceLevel ?? ""}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
          <option value="">Prefer not to say</option>
          {EXPERIENCE.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
        </select>
      </Field>

      <Field label="Primary investing vertical (free text)">
        <input
          type="text" name="primary_vertical" maxLength={50}
          defaultValue={initial?.primaryVertical ?? ""}
          placeholder="shares / super / property / crypto / cfd"
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
        />
      </Field>

      {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
      {saved && <p className="text-sm text-emerald-700">Saved ✓</p>}

      <button type="submit" disabled={submitting}
        className="w-full px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-lg disabled:opacity-50">
        {submitting ? "Saving…" : "Save investor profile"}
      </button>
      <p className="text-xs text-slate-500 italic">
        General information only — see your accountant or financial advisor for personalised guidance.
      </p>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-700 mb-1">{label}</span>
      {children}
    </label>
  );
}
