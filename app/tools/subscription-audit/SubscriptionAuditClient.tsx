"use client";

import { useState, useMemo, useId } from "react";
import Link from "next/link";

type Frequency = "weekly" | "fortnightly" | "monthly" | "quarterly" | "annually";
type Category =
  | "Streaming"
  | "Music"
  | "Software"
  | "News"
  | "Fitness"
  | "Gaming"
  | "Food & Shopping"
  | "Finance"
  | "Professional"
  | "Other";

interface Subscription {
  id: string;
  name: string;
  category: Category;
  price: number;
  frequency: Frequency;
  active: boolean;
}

const FREQ_MULTIPLIER: Record<Frequency, number> = {
  weekly: 52,
  fortnightly: 26,
  monthly: 12,
  quarterly: 4,
  annually: 1,
};

const FREQ_LABELS: Record<Frequency, string> = {
  weekly: "/wk",
  fortnightly: "/fn",
  monthly: "/mo",
  quarterly: "/qtr",
  annually: "/yr",
};

const CATEGORIES: Category[] = [
  "Streaming", "Music", "Software", "News", "Fitness",
  "Gaming", "Food & Shopping", "Finance", "Professional", "Other",
];

const CATEGORY_COLORS: Record<Category, string> = {
  Streaming: "bg-purple-100 text-purple-700",
  Music: "bg-pink-100 text-pink-700",
  Software: "bg-blue-100 text-blue-700",
  News: "bg-amber-100 text-amber-700",
  Fitness: "bg-emerald-100 text-emerald-700",
  Gaming: "bg-indigo-100 text-indigo-700",
  "Food & Shopping": "bg-orange-100 text-orange-700",
  Finance: "bg-green-100 text-green-700",
  Professional: "bg-cyan-100 text-cyan-700",
  Other: "bg-slate-100 text-slate-600",
};

const PRESETS: Omit<Subscription, "id" | "active">[] = [
  { name: "Netflix", category: "Streaming", price: 22.99, frequency: "monthly" },
  { name: "Stan", category: "Streaming", price: 19, frequency: "monthly" },
  { name: "Disney+", category: "Streaming", price: 13.99, frequency: "monthly" },
  { name: "Binge", category: "Streaming", price: 18, frequency: "monthly" },
  { name: "Apple TV+", category: "Streaming", price: 12.99, frequency: "monthly" },
  { name: "YouTube Premium", category: "Streaming", price: 18.99, frequency: "monthly" },
  { name: "Spotify", category: "Music", price: 12.99, frequency: "monthly" },
  { name: "Apple Music", category: "Music", price: 11.99, frequency: "monthly" },
  { name: "Microsoft 365", category: "Software", price: 119, frequency: "annually" },
  { name: "Adobe Creative Cloud", category: "Software", price: 89.99, frequency: "monthly" },
  { name: "Canva Pro", category: "Software", price: 21.99, frequency: "monthly" },
  { name: "Notion", category: "Software", price: 16, frequency: "monthly" },
  { name: "The Australian", category: "News", price: 28, frequency: "monthly" },
  { name: "AFR", category: "News", price: 39, frequency: "monthly" },
  { name: "Gym Membership", category: "Fitness", price: 60, frequency: "monthly" },
  { name: "PlayStation Plus", category: "Gaming", price: 109, frequency: "annually" },
  { name: "Xbox Game Pass", category: "Gaming", price: 21.95, frequency: "monthly" },
  { name: "LinkedIn Premium", category: "Professional", price: 69.99, frequency: "monthly" },
];

function annualCost(s: Subscription): number {
  return s.price * FREQ_MULTIPLIER[s.frequency];
}

function fmt(n: number): string {
  return n.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });
}

let idCounter = 0;
function nextId() {
  return `sub-${++idCounter}`;
}

export default function SubscriptionAuditClient() {
  const formId = useId();
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<Category>("Streaming");
  const [price, setPrice] = useState("");
  const [freq, setFreq] = useState<Frequency>("monthly");
  const [presetMode, setPresetMode] = useState(true);
  const [addError, setAddError] = useState("");

  const activeSubs = useMemo(() => subs.filter((s) => s.active), [subs]);
  const totalAnnual = useMemo(() => activeSubs.reduce((acc, s) => acc + annualCost(s), 0), [activeSubs]);
  const totalMonthly = totalAnnual / 12;

  const byCategory = useMemo(() => {
    const map: Partial<Record<Category, number>> = {};
    for (const s of activeSubs) {
      map[s.category] = (map[s.category] ?? 0) + annualCost(s);
    }
    return Object.entries(map).sort(([, a], [, b]) => b - a) as [Category, number][];
  }, [activeSubs]);

  const sortedByAnnual = useMemo(
    () => [...activeSubs].sort((a, b) => annualCost(b) - annualCost(a)),
    [activeSubs],
  );

  function addPreset(preset: (typeof PRESETS)[number]) {
    if (subs.some((s) => s.name.toLowerCase() === preset.name.toLowerCase())) return;
    setSubs((prev) => [...prev, { ...preset, id: nextId(), active: true }]);
  }

  function addCustom() {
    const p = parseFloat(price);
    if (!name.trim()) { setAddError("Enter a subscription name."); return; }
    if (isNaN(p) || p <= 0) { setAddError("Enter a valid price greater than $0."); return; }
    setAddError("");
    setSubs((prev) => [...prev, { id: nextId(), name: name.trim(), category, price: p, frequency: freq, active: true }]);
    setName("");
    setPrice("");
  }

  function toggle(id: string) {
    setSubs((prev) => prev.map((s) => s.id === id ? { ...s, active: !s.active } : s));
  }

  function remove(id: string) {
    setSubs((prev) => prev.filter((s) => s.id !== id));
  }

  const potentialSaving = sortedByAnnual.slice(0, 3).reduce((a, s) => a + annualCost(s), 0);

  return (
    <div className="py-5 md:py-10">
      <div className="container-custom max-w-3xl">
        {/* Breadcrumb */}
        <nav className="text-xs text-slate-500 mb-4 flex items-center gap-1.5">
          <Link href="/" className="hover:text-slate-900">Home</Link>
          <span>/</span>
          <Link href="/tools" className="hover:text-slate-900">Tools</Link>
          <span>/</span>
          <span className="text-slate-700">Subscription Audit</span>
        </nav>

        {/* Hero */}
        <div className="bg-gradient-to-br from-violet-600 to-violet-800 rounded-2xl p-5 md:p-8 text-white mb-6">
          <div className="inline-flex items-center gap-2 bg-white/15 px-3 py-1 rounded-full mb-3 text-xs font-bold uppercase tracking-wide">
            Free Tool
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold mb-2">Subscription Audit</h1>
          <p className="text-violet-200 text-sm leading-relaxed">
            Add your recurring subscriptions and see exactly what you&apos;re spending annually — with a breakdown by category and savings opportunities.
          </p>
          {totalAnnual > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="bg-white/15 rounded-xl p-3 text-center">
                <p className="text-2xl font-extrabold">{fmt(totalMonthly)}</p>
                <p className="text-xs text-violet-200">per month</p>
              </div>
              <div className="bg-white/15 rounded-xl p-3 text-center">
                <p className="text-2xl font-extrabold">{fmt(totalAnnual)}</p>
                <p className="text-xs text-violet-200">per year</p>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {/* Add subscriptions */}
          <section className="bg-white border border-slate-200 rounded-2xl p-5">
            <h2 className="text-base font-bold text-slate-900 mb-4">Add Subscriptions</h2>

            {/* Preset toggle */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setPresetMode(true)}
                className={`px-3 py-1.5 text-sm rounded-lg font-semibold transition-colors ${presetMode ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
              >
                Common services
              </button>
              <button
                onClick={() => setPresetMode(false)}
                className={`px-3 py-1.5 text-sm rounded-lg font-semibold transition-colors ${!presetMode ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
              >
                Add custom
              </button>
            </div>

            {presetMode ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PRESETS.map((p) => {
                  const added = subs.some((s) => s.name.toLowerCase() === p.name.toLowerCase());
                  return (
                    <button
                      key={p.name}
                      onClick={() => addPreset(p)}
                      disabled={added}
                      className={`flex flex-col items-start p-3 rounded-xl border text-left transition-colors ${
                        added
                          ? "border-violet-200 bg-violet-50 text-violet-600 cursor-default"
                          : "border-slate-200 hover:border-violet-300 hover:bg-violet-50"
                      }`}
                    >
                      <span className="text-sm font-semibold text-slate-800 truncate w-full">{p.name}</span>
                      <span className="text-xs text-slate-500">${p.price}{FREQ_LABELS[p.frequency]}</span>
                      {added && <span className="text-[0.6rem] text-violet-500 mt-0.5">Added ✓</span>}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor={`${formId}-name`} className="block text-xs font-semibold text-slate-600 mb-1">Service name</label>
                    <input
                      id={`${formId}-name`}
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addCustom()}
                      placeholder="e.g. Canva"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                  <div>
                    <label htmlFor={`${formId}-cat`} className="block text-xs font-semibold text-slate-600 mb-1">Category</label>
                    <select
                      id={`${formId}-cat`}
                      value={category}
                      onChange={(e) => setCategory(e.target.value as Category)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                    >
                      {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor={`${formId}-price`} className="block text-xs font-semibold text-slate-600 mb-1">Price (A$)</label>
                    <input
                      id={`${formId}-price`}
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addCustom()}
                      placeholder="0.00"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                  <div>
                    <label htmlFor={`${formId}-freq`} className="block text-xs font-semibold text-slate-600 mb-1">Billing frequency</label>
                    <select
                      id={`${formId}-freq`}
                      value={freq}
                      onChange={(e) => setFreq(e.target.value as Frequency)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                    >
                      <option value="weekly">Weekly</option>
                      <option value="fortnightly">Fortnightly</option>
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="annually">Annually</option>
                    </select>
                  </div>
                </div>
                {addError && <p className="text-xs text-red-600">{addError}</p>}
                <button
                  onClick={addCustom}
                  className="px-4 py-2 bg-violet-600 text-white text-sm font-bold rounded-lg hover:bg-violet-700 transition-colors"
                >
                  + Add subscription
                </button>
              </div>
            )}
          </section>

          {/* Subscription list */}
          {subs.length > 0 && (
            <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900">Your subscriptions ({subs.length})</h2>
                <button onClick={() => setSubs([])} className="text-xs text-red-500 hover:text-red-700">Clear all</button>
              </div>
              <ul className="divide-y divide-slate-100">
                {subs.map((s) => (
                  <li key={s.id} className={`flex items-center gap-3 px-5 py-3 ${!s.active ? "opacity-50" : ""}`}>
                    <button
                      onClick={() => toggle(s.id)}
                      aria-label={s.active ? `Disable ${s.name}` : `Enable ${s.name}`}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${s.active ? "bg-violet-600 border-violet-600 text-white" : "border-slate-300"}`}
                    >
                      {s.active && <span className="text-[0.65rem] font-bold">✓</span>}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{s.name}</p>
                      <p className="text-xs text-slate-500">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[0.6rem] font-semibold mr-1 ${CATEGORY_COLORS[s.category]}`}>
                          {s.category}
                        </span>
                        ${s.price}{FREQ_LABELS[s.frequency]}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-slate-900">{fmt(annualCost(s))}<span className="text-xs font-normal text-slate-400">/yr</span></p>
                    </div>
                    <button onClick={() => remove(s.id)} aria-label={`Remove ${s.name}`} className="text-slate-300 hover:text-red-500 transition-colors ml-1">×</button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Results */}
          {activeSubs.length > 0 && (
            <>
              {/* Category breakdown */}
              <section className="bg-white border border-slate-200 rounded-2xl p-5">
                <h2 className="text-base font-bold text-slate-900 mb-4">Spend by category</h2>
                <div className="space-y-2">
                  {byCategory.map(([cat, annual]) => {
                    const pct = Math.round((annual / totalAnnual) * 100);
                    return (
                      <div key={cat}>
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded ${CATEGORY_COLORS[cat]}`}>{cat}</span>
                          <span className="text-sm font-bold text-slate-800">{fmt(annual)}/yr <span className="text-slate-400 font-normal text-xs">({pct}%)</span></span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-violet-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Savings opportunities */}
              {sortedByAnnual.length >= 2 && (
                <section className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                  <h2 className="text-base font-bold text-slate-900 mb-1">
                    Savings opportunity
                  </h2>
                  <p className="text-sm text-slate-600 mb-3">
                    Cancelling your {Math.min(3, sortedByAnnual.length)} most expensive subscriptions would save{" "}
                    <strong>{fmt(potentialSaving)}/yr</strong>.
                  </p>
                  <ul className="space-y-2">
                    {sortedByAnnual.slice(0, 3).map((s) => (
                      <li key={s.id} className="flex items-center justify-between bg-white border border-amber-100 rounded-xl px-4 py-2.5">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{s.name}</p>
                          <p className="text-xs text-slate-500">{s.category}</p>
                        </div>
                        <p className="text-sm font-bold text-amber-600">{fmt(annualCost(s))}/yr</p>
                      </li>
                    ))}
                  </ul>
                  <p className="text-[0.65rem] text-slate-400 mt-3">
                    Tip: check if any of these overlap — e.g. multiple streaming services covering similar content.
                  </p>
                </section>
              )}

              {/* Summary card */}
              <section className="bg-slate-900 text-white rounded-2xl p-5">
                <h2 className="text-base font-bold mb-3">Your subscription summary</h2>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="text-center">
                    <p className="text-xl font-extrabold">{activeSubs.length}</p>
                    <p className="text-xs text-slate-400">Active</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-extrabold">{fmt(totalMonthly)}</p>
                    <p className="text-xs text-slate-400">Per month</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-extrabold">{fmt(totalAnnual)}</p>
                    <p className="text-xs text-slate-400">Per year</p>
                  </div>
                </div>
                <p className="text-xs text-slate-400">
                  This is general information only — not financial advice. For a full budget review and advice on reducing discretionary spending, consider speaking with a financial adviser.
                </p>
              </section>

              {/* CTA */}
              <section className="bg-violet-50 border border-violet-200 rounded-xl p-5 flex flex-col sm:flex-row items-center gap-4">
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-900 mb-1">Want a full cash-flow review?</p>
                  <p className="text-xs text-slate-500">
                    A financial adviser can help you optimise your budget, reduce unnecessary spending, and redirect savings toward your investment goals.
                  </p>
                </div>
                <Link
                  href="/advisors/financial-planners"
                  className="shrink-0 px-5 py-2.5 bg-violet-600 text-white text-sm font-bold rounded-lg hover:bg-violet-700 transition-colors"
                >
                  Find an Adviser
                </Link>
              </section>
            </>
          )}

          {subs.length === 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center">
              <p className="text-3xl mb-2">📋</p>
              <p className="text-slate-500 text-sm">Add subscriptions above to see your annual spend breakdown.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
