"use client";

import { useState } from "react";

type StartupThesis = {
  sector_tags?: string[];
  stage_preferences?: string[];
  min_ticket_aud?: number | null;
  max_ticket_aud?: number | null;
  geography?: string[];
};

type Props = {
  initial: StartupThesis | null;
};

const SECTORS: { value: string; label: string }[] = [
  { value: "fintech", label: "Fintech" },
  { value: "healthtech", label: "Healthtech" },
  { value: "saas", label: "SaaS / B2B software" },
  { value: "deeptech", label: "Deep tech / R&D" },
  { value: "cleantech", label: "Cleantech / Climate" },
  { value: "edtech", label: "Edtech" },
  { value: "proptech", label: "Proptech" },
  { value: "agritech", label: "Agritech" },
  { value: "ai_ml", label: "AI / ML" },
  { value: "cybersecurity", label: "Cybersecurity" },
  { value: "biotech", label: "Biotech / Medtech" },
  { value: "marketplace", label: "Marketplace" },
  { value: "consumer", label: "Consumer" },
  { value: "ecommerce", label: "E-commerce" },
  { value: "govtech", label: "Govtech" },
  { value: "legaltech", label: "Legaltech" },
  { value: "insurtech", label: "Insurtech" },
  { value: "hardware", label: "Hardware" },
  { value: "other", label: "Other" },
];

const STAGES: { value: string; label: string }[] = [
  { value: "pre_seed", label: "Pre-seed (idea / prototype)" },
  { value: "seed", label: "Seed (early revenue / PMF)" },
  { value: "series_a", label: "Series A (scaling)" },
  { value: "series_b_plus", label: "Series B+ (growth / expansion)" },
];

const GEOS: { value: string; label: string }[] = [
  { value: "australia", label: "Australia" },
  { value: "new_zealand", label: "New Zealand" },
  { value: "southeast_asia", label: "Southeast Asia" },
  { value: "us", label: "United States" },
  { value: "uk", label: "United Kingdom" },
  { value: "other", label: "Other" },
];

const TICKET_PRESETS = [
  { label: "< $25K", min: 0, max: 25_000 },
  { label: "$25K–$100K", min: 25_000, max: 100_000 },
  { label: "$100K–$500K", min: 100_000, max: 500_000 },
  { label: "$500K+", min: 500_000, max: null },
];

function ToggleChip({
  value,
  label,
  selected,
  onToggle,
}: {
  value: string;
  label: string;
  selected: boolean;
  onToggle: (v: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle(value)}
      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
        selected
          ? "bg-violet-600 text-white border-violet-600"
          : "bg-white text-slate-600 border-slate-200 hover:border-violet-300"
      }`}
    >
      {label}
    </button>
  );
}

export default function StartupThesisClient({ initial }: Props) {
  const [sectorTags, setSectorTags] = useState<string[]>(initial?.sector_tags ?? []);
  const [stagePrefs, setStagePrefs] = useState<string[]>(initial?.stage_preferences ?? []);
  const [geography, setGeography] = useState<string[]>(initial?.geography ?? []);
  const [minTicket, setMinTicket] = useState<number | null>(initial?.min_ticket_aud ?? null);
  const [maxTicket, setMaxTicket] = useState<number | null>(initial?.max_ticket_aud ?? null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  function toggle(arr: string[], set: (v: string[]) => void, val: string) {
    set(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);
  }

  function applyTicketPreset(min: number, max: number | null) {
    setMinTicket(min);
    setMaxTicket(max);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/account/startup-thesis", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sector_tags: sectorTags,
          stage_preferences: stagePrefs,
          min_ticket_aud: minTicket,
          max_ticket_aud: maxTicket,
          geography,
        }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Save failed. Please try again.");
      } else {
        setSavedAt(new Date());
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Sector tags */}
      <section>
        <h2 className="text-sm font-semibold text-slate-700 mb-1">
          Sectors I&apos;m interested in
        </h2>
        <p className="text-xs text-slate-500 mb-3">Select up to 10. Used to surface matching rounds in the startup feed.</p>
        <div className="flex flex-wrap gap-2">
          {SECTORS.map((s) => (
            <ToggleChip
              key={s.value}
              value={s.value}
              label={s.label}
              selected={sectorTags.includes(s.value)}
              onToggle={(v) => toggle(sectorTags, setSectorTags, v)}
            />
          ))}
        </div>
      </section>

      {/* Stage preferences */}
      <section>
        <h2 className="text-sm font-semibold text-slate-700 mb-1">
          Stage preferences
        </h2>
        <p className="text-xs text-slate-500 mb-3">Which stages do you typically invest in?</p>
        <div className="flex flex-wrap gap-2">
          {STAGES.map((s) => (
            <ToggleChip
              key={s.value}
              value={s.value}
              label={s.label}
              selected={stagePrefs.includes(s.value)}
              onToggle={(v) => toggle(stagePrefs, setStagePrefs, v)}
            />
          ))}
        </div>
      </section>

      {/* Ticket size */}
      <section>
        <h2 className="text-sm font-semibold text-slate-700 mb-1">
          Typical ticket size
        </h2>
        <p className="text-xs text-slate-500 mb-3">Per investment in AUD.</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {TICKET_PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => applyTicketPreset(p.min, p.max)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                minTicket === p.min && maxTicket === p.max
                  ? "bg-violet-600 text-white border-violet-600"
                  : "bg-white text-slate-600 border-slate-200 hover:border-violet-300"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="thesis-min-ticket" className="block text-xs font-medium text-slate-500 mb-1">Min (AUD)</label>
            <input
              id="thesis-min-ticket"
              type="number"
              value={minTicket ?? ""}
              onChange={(e) => setMinTicket(e.target.value ? Number(e.target.value) : null)}
              placeholder="e.g. 10000"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-violet-400"
            />
          </div>
          <div>
            <label htmlFor="thesis-max-ticket" className="block text-xs font-medium text-slate-500 mb-1">Max (AUD)</label>
            <input
              id="thesis-max-ticket"
              type="number"
              value={maxTicket ?? ""}
              onChange={(e) => setMaxTicket(e.target.value ? Number(e.target.value) : null)}
              placeholder="e.g. 100000"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-violet-400"
            />
          </div>
        </div>
      </section>

      {/* Geography */}
      <section>
        <h2 className="text-sm font-semibold text-slate-700 mb-1">
          Geography preferences
        </h2>
        <p className="text-xs text-slate-500 mb-3">Which regions do you invest in?</p>
        <div className="flex flex-wrap gap-2">
          {GEOS.map((g) => (
            <ToggleChip
              key={g.value}
              value={g.value}
              label={g.label}
              selected={geography.includes(g.value)}
              onToggle={(v) => toggle(geography, setGeography, v)}
            />
          ))}
        </div>
      </section>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2" role="alert">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="bg-violet-600 hover:bg-violet-700 disabled:bg-violet-300 text-white font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors"
        >
          {saving ? "Saving…" : "Save thesis"}
        </button>
        {savedAt && !error && (
          <p role="status" className="text-xs text-emerald-600">
            Saved at {savedAt.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" })}
          </p>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-700">
        <p className="font-semibold mb-1">How your thesis is used</p>
        <p>
          Your sector tags, stage preferences, ticket size, and geography shape the personalised
          startup match feed at <span className="font-medium">/invest/startups/for-you</span>.
          Only rounds matching your criteria appear in your feed. No data is shared with startups
          unless you submit an inquiry.
        </p>
      </div>
    </div>
  );
}
