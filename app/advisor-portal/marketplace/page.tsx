"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";

interface BidTemplate {
  id: string;
  label: string;
  body: string;
}

interface AlertPrefs {
  advisor_types: string[];
  states: string[];
  budget_bands: string[];
}

interface Settings {
  accepts_new_clients: boolean;
  bid_templates: BidTemplate[];
  alert_preferences: AlertPrefs;
}

interface Analytics {
  window_days: number;
  total_bids: number;
  wins: number;
  lost: number;
  retracted: number;
  active: number;
  win_rate_pct: number;
  median_response_hours: number | null;
  category_avg_win_rate_pct: number;
}

const ADVISOR_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "smsf_accountant", label: "SMSF Accountant" },
  { value: "financial_planner", label: "Financial Planner" },
  { value: "property_advisor", label: "Property Advisor" },
  { value: "tax_agent", label: "Tax Agent" },
  { value: "mortgage_broker", label: "Mortgage Broker" },
  { value: "estate_planner", label: "Estate Planner" },
  { value: "insurance_broker", label: "Insurance Broker" },
  { value: "buyers_agent", label: "Buyers Agent" },
  { value: "wealth_manager", label: "Wealth Manager" },
  { value: "aged_care_advisor", label: "Aged Care Advisor" },
  { value: "crypto_advisor", label: "Crypto Advisor" },
  { value: "business_broker", label: "Business Broker" },
  { value: "migration_agent", label: "Migration Agent" },
];
const STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"];
const BUDGETS: { value: string; label: string }[] = [
  { value: "under_500", label: "Under $500" },
  { value: "500_2k", label: "$500–$2k" },
  { value: "2k_5k", label: "$2k–$5k" },
  { value: "5k_10k", label: "$5k–$10k" },
  { value: "10k_plus", label: "$10k+" },
  { value: "not_sure", label: "Budget TBD" },
];

export default function MarketplaceSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [s, a] = await Promise.all([
        fetch("/api/advisor-portal/marketplace-settings").then((r) => r.json()),
        fetch("/api/advisor-portal/marketplace-analytics").then((r) => r.json()),
      ]);
      if (s?.accepts_new_clients !== undefined) {
        setSettings({
          accepts_new_clients: s.accepts_new_clients,
          bid_templates: s.bid_templates ?? [],
          alert_preferences: s.alert_preferences ?? { advisor_types: [], states: [], budget_bands: [] },
        });
      }
      if (a?.total_bids !== undefined) setAnalytics(a as Analytics);
    } catch {
      setErr("Failed to load. Please log in to the advisor portal first.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  async function patch(updates: Partial<Settings>) {
    if (!settings) return;
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch("/api/advisor-portal/marketplace-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Save failed.");
      setSettings({ ...settings, ...updates });
      setSavedAt(Date.now());
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  function toggleArr<T extends string>(arr: T[], v: T): T[] {
    return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
  }

  function newTemplate() {
    if (!settings) return;
    if (settings.bid_templates.length >= 5) return;
    const t: BidTemplate = {
      id: `tpl_${Math.random().toString(36).slice(2, 8)}`,
      label: "Template",
      body: "",
    };
    patch({ bid_templates: [...settings.bid_templates, t] });
  }

  function updateTemplate(id: string, fields: Partial<BidTemplate>) {
    if (!settings) return;
    const next = settings.bid_templates.map((t) => (t.id === id ? { ...t, ...fields } : t));
    patch({ bid_templates: next });
  }

  function removeTemplate(id: string) {
    if (!settings) return;
    patch({ bid_templates: settings.bid_templates.filter((t) => t.id !== id) });
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-sm text-slate-500">Loading…</div>
    );
  }
  if (!settings) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-sm">
          You need to be logged in as an advisor to access marketplace settings.{" "}
          <Link href="/advisor-portal" className="underline font-semibold">
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
      <header>
        <h1 className="text-2xl font-extrabold text-slate-900 mb-1">Marketplace settings</h1>
        <p className="text-sm text-slate-500">
          Control how you appear on quote requests, your bid templates, alert preferences, and your performance.
        </p>
      </header>

      {err && <p className="text-sm text-red-600">{err}</p>}
      {savedAt && <p className="text-xs text-emerald-700">Saved.</p>}

      {/* Analytics */}
      {analytics && (
        <section className="bg-white border border-slate-200 rounded-2xl p-6">
          <h2 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Icon name="bar-chart-2" size={16} className="text-slate-500" />
            Win/loss — last {analytics.window_days} days
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="Bids submitted" value={String(analytics.total_bids)} />
            <Stat label="Wins" value={String(analytics.wins)} />
            <Stat
              label="Win rate"
              value={`${analytics.win_rate_pct}%`}
              hint={`Cat avg ${analytics.category_avg_win_rate_pct}%`}
            />
            <Stat
              label="Median response"
              value={analytics.median_response_hours != null ? `${analytics.median_response_hours}h` : "—"}
            />
          </div>
          <p className="text-xs text-slate-500 mt-3">
            Active: {analytics.active} · Lost: {analytics.lost} · Retracted: {analytics.retracted}
          </p>
        </section>
      )}

      {/* Availability */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6">
        <h2 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
          <Icon name="check-circle" size={16} className="text-emerald-600" />
          Availability
        </h2>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.accepts_new_clients}
            onChange={(e) => patch({ accepts_new_clients: e.target.checked })}
            disabled={saving}
            className="accent-emerald-600 w-5 h-5"
          />
          <span className="text-sm text-slate-700">
            <strong>Currently accepting new clients</strong> — when off, you won&apos;t get new-job alerts
            and you&apos;ll be hidden from instant-match.
          </span>
        </label>
      </section>

      {/* Alert preferences */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6">
        <h2 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
          <Icon name="bell" size={16} className="text-slate-500" />
          Job alert preferences
        </h2>
        <p className="text-xs text-slate-500 mb-4">
          Empty = match all. Tick to narrow which new-job emails you want.
        </p>

        <PrefGroup
          title="Advisor types"
          options={ADVISOR_TYPE_OPTIONS}
          selected={settings.alert_preferences.advisor_types}
          onToggle={(v) =>
            patch({
              alert_preferences: {
                ...settings.alert_preferences,
                advisor_types: toggleArr(settings.alert_preferences.advisor_types, v),
              },
            })
          }
        />
        <PrefGroup
          title="States"
          options={STATES.map((s) => ({ value: s, label: s }))}
          selected={settings.alert_preferences.states}
          onToggle={(v) =>
            patch({
              alert_preferences: {
                ...settings.alert_preferences,
                states: toggleArr(settings.alert_preferences.states, v),
              },
            })
          }
        />
        <PrefGroup
          title="Budget bands"
          options={BUDGETS}
          selected={settings.alert_preferences.budget_bands}
          onToggle={(v) =>
            patch({
              alert_preferences: {
                ...settings.alert_preferences,
                budget_bands: toggleArr(settings.alert_preferences.budget_bands, v),
              },
            })
          }
        />
      </section>

      {/* Bid templates */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Icon name="file-text" size={16} className="text-slate-500" />
            Bid message templates ({settings.bid_templates.length}/5)
          </h2>
          <button
            type="button"
            onClick={newTemplate}
            disabled={saving || settings.bid_templates.length >= 5}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 disabled:text-slate-400"
          >
            + Add template
          </button>
        </div>
        {settings.bid_templates.length === 0 ? (
          <p className="text-sm text-slate-500 italic">
            No templates yet. Save common bid messages to speed up your response time.
          </p>
        ) : (
          <div className="space-y-3">
            {settings.bid_templates.map((t) => (
              <div key={t.id} className="border border-slate-200 rounded-xl p-3">
                <div className="flex gap-2 items-center mb-2">
                  <input
                    type="text"
                    value={t.label}
                    onChange={(e) => updateTemplate(t.id, { label: e.target.value })}
                    onBlur={(e) => updateTemplate(t.id, { label: e.target.value.trim() || "Template" })}
                    maxLength={80}
                    className="flex-1 text-sm font-semibold border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                  <button
                    type="button"
                    onClick={() => removeTemplate(t.id)}
                    className="text-xs text-slate-500 hover:text-red-600"
                  >
                    Delete
                  </button>
                </div>
                <textarea
                  value={t.body}
                  onChange={(e) => updateTemplate(t.id, { body: e.target.value })}
                  rows={3}
                  maxLength={2000}
                  placeholder="Template body…"
                  className="w-full text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="bg-slate-50 rounded-xl p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-xl font-extrabold text-slate-900 leading-tight">{value}</p>
      {hint && <p className="text-[10px] text-slate-400 mt-0.5">{hint}</p>}
    </div>
  );
}

function PrefGroup<T extends string>({
  title,
  options,
  selected,
  onToggle,
}: {
  title: string;
  options: { value: T; label: string }[];
  selected: T[];
  onToggle: (v: T) => void;
}) {
  return (
    <div className="mb-4">
      <p className="text-xs font-semibold text-slate-700 mb-2">{title}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const on = selected.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onToggle(o.value)}
              className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
                on
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-700 border-slate-200 hover:border-slate-400"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
