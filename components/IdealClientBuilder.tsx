"use client";

import { useEffect, useState, useCallback } from "react";

type Criteria = {
  verticals?: string[];
  budget_bands?: string[];
  archetypes?: string[];
  experience_levels?: string[];
  description?: string;
};

type Meta = {
  valid_verticals: readonly string[];
  valid_budget_bands: readonly string[];
  valid_archetypes: readonly string[];
  valid_experience_levels: readonly string[];
};

const VERTICAL_LABELS: Record<string, string> = {
  property: "Property", etf: "ETFs", shares: "Shares", crypto: "Crypto",
  bonds: "Bonds", smsf: "SMSF", insurance: "Insurance",
  superannuation: "Superannuation", mortgage: "Mortgage", business: "Business",
};

const BUDGET_LABELS: Record<string, string> = {
  under_100k: "Under $100k", "100k_250k": "$100k–$250k", "250k_500k": "$250k–$500k",
  "500k_1m": "$500k–$1m", "1m_5m": "$1m–$5m", "5m_plus": "$5m+",
};

const ARCHETYPE_LABELS: Record<string, string> = {
  fhb: "First Home Buyers", hnw: "High Net Worth", pre_retiree: "Pre-Retirees", business_owner: "Business Owners",
};

const EXPERIENCE_LABELS: Record<string, string> = {
  beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced",
};

function CheckGroup({
  label,
  options,
  labelMap,
  selected,
  onChange,
}: {
  label: string;
  options: readonly string[];
  labelMap: Record<string, string>;
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  function toggle(v: string) {
    onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
  }

  return (
    <div>
      <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => toggle(v)}
            className={`text-xs px-2.5 py-1 rounded-full border font-semibold transition-colors ${
              selected.includes(v)
                ? "bg-violet-600 text-white border-violet-600"
                : "bg-white text-slate-600 border-slate-200 hover:border-violet-300"
            }`}
          >
            {labelMap[v] ?? v}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function IdealClientBuilder() {
  const [criteria, setCriteria] = useState<Criteria>({});
  const [meta, setMeta] = useState<Meta | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/advisor-portal/ideal-client")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { criteria: Criteria | null; updated_at: string | null; meta: Meta } | null) => {
        if (d) {
          setCriteria(d.criteria ?? {});
          setMeta(d.meta);
          setUpdatedAt(d.updated_at);
        }
      })
      .catch(() => { /* fail silently */ })
      .finally(() => setLoading(false));
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/advisor-portal/ideal-client", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(criteria),
      });
      if (res.ok) {
        setSaved(true);
        setUpdatedAt(new Date().toISOString());
        setTimeout(() => setSaved(false), 2500);
      }
    } finally {
      setSaving(false);
    }
  }, [criteria]);

  function set<K extends keyof Criteria>(key: K, val: Criteria[K]) {
    setCriteria((prev) => ({ ...prev, [key]: val }));
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-4 w-48 bg-slate-200 rounded" />
        <div className="h-20 bg-slate-100 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Ideal Client Profile</h2>
        <p className="text-sm text-slate-500 mt-1">
          Define the clients you work best with. This boosts your visibility in search results
          for matching investors and shows a &ldquo;Good fit for your profile&rdquo; hint on your profile
          page when a visitor&apos;s preferences match your criteria.
        </p>
      </div>

      {meta && (
        <>
          <CheckGroup
            label="Investment verticals"
            options={meta.valid_verticals}
            labelMap={VERTICAL_LABELS}
            selected={criteria.verticals ?? []}
            onChange={(v) => set("verticals", v)}
          />
          <CheckGroup
            label="Budget range"
            options={meta.valid_budget_bands}
            labelMap={BUDGET_LABELS}
            selected={criteria.budget_bands ?? []}
            onChange={(v) => set("budget_bands", v)}
          />
          <CheckGroup
            label="Investor archetypes"
            options={meta.valid_archetypes}
            labelMap={ARCHETYPE_LABELS}
            selected={criteria.archetypes ?? []}
            onChange={(v) => set("archetypes", v)}
          />
          <CheckGroup
            label="Experience level"
            options={meta.valid_experience_levels}
            labelMap={EXPERIENCE_LABELS}
            selected={criteria.experience_levels ?? []}
            onChange={(v) => set("experience_levels", v)}
          />
        </>
      )}

      <div>
        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
          Description (optional)
        </p>
        <textarea
          className="w-full rounded-xl border border-slate-200 text-sm p-3 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500"
          rows={3}
          maxLength={500}
          placeholder="Describe your ideal client in your own words…"
          aria-label="Describe your ideal client"
          value={criteria.description ?? ""}
          onChange={(e) => set("description", e.target.value || undefined)}
        />
        <p className="text-xs text-slate-400 mt-0.5">{(criteria.description ?? "").length}/500</p>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-bold text-sm px-5 py-2.5 rounded-lg transition-colors"
        >
          {saving ? "Saving…" : "Save criteria"}
        </button>
        {saved && <span className="text-xs font-semibold text-emerald-600">Saved!</span>}
        {updatedAt && !saving && !saved && (
          <span className="text-xs text-slate-400">
            Last saved {new Date(updatedAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
          </span>
        )}
      </div>

      <div className="rounded-xl border border-violet-100 bg-violet-50 px-4 py-3 text-xs text-violet-800">
        <strong>How it works:</strong> Investors with matching preferences will see a higher
        compatibility score on your profile. The &ldquo;Good fit&rdquo; badge appears when their stated
        profile closely matches your ideal-client criteria. Scores update weekly.
      </div>
    </div>
  );
}
