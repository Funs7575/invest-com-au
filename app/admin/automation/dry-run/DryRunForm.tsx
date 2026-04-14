"use client";

import { useState } from "react";

const CLASSIFIERS = [
  { value: "text_moderation", label: "Text moderation", sample: JSON.stringify({ text: "Great broker, fast execution", title: null, surface: "broker_review", authorId: "u1", authorVerified: true, authorPriorCount: 1, authorPriorRejections: 0 }, null, 2) },
  { value: "listing_scam", label: "Listing scam", sample: JSON.stringify({ listing: { title: "High yield investment", description: "10% guaranteed monthly returns, send BTC for details.", contact_email: "noreply@example.com", price_cents: 1000000 } }, null, 2) },
  { value: "advisor_application", label: "Advisor application", sample: JSON.stringify({ application: { full_name: "Jane Doe", firm: "ACME Advisory", afsl_number: "123456", abn: "12 345 678 901", specialties: ["retirement"] } }, null, 2) },
  { value: "marketplace_campaign", label: "Marketplace campaign", sample: JSON.stringify({ title: "Premium SMSF advice", body: "Book a free consultation.", broker_trust_score: 0.8, budget_cents: 50000, prior_approved_campaigns: 2 }, null, 2) },
];

export default function DryRunForm() {
  const [classifier, setClassifier] = useState(CLASSIFIERS[0].value);
  const [input, setInput] = useState(CLASSIFIERS[0].sample);
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    setError(null);
    setResult(null);
    setBusy(true);
    let parsed: unknown;
    try {
      parsed = JSON.parse(input);
    } catch (e) {
      setError(e instanceof Error ? e.message : "json_parse_error");
      setBusy(false);
      return;
    }
    try {
      const res = await fetch("/api/admin/automation/dry-run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classifier, input: parsed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || `HTTP ${res.status}`);
      } else {
        setResult(data.result);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "fetch_failed");
    } finally {
      setBusy(false);
    }
  }

  function loadSample(c: string) {
    const entry = CLASSIFIERS.find((x) => x.value === c);
    setClassifier(c);
    if (entry) setInput(entry.sample);
    setResult(null);
    setError(null);
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <label className="text-[0.65rem] font-semibold uppercase tracking-wider text-slate-500 block mb-1">
          Classifier
        </label>
        <select
          value={classifier}
          onChange={(e) => loadSample(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded text-sm font-mono bg-white focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none"
        >
          {CLASSIFIERS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <label className="text-[0.65rem] font-semibold uppercase tracking-wider text-slate-500 block mb-1">
          Input JSON
        </label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={14}
          spellCheck={false}
          className="w-full px-3 py-2 border border-slate-300 rounded text-xs font-mono focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none"
        />
        <div className="mt-3">
          <button
            type="button"
            onClick={run}
            disabled={busy}
            className="px-4 py-2 text-sm font-semibold rounded bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {busy ? "Running…" : "Run classifier"}
          </button>
        </div>
      </div>

      {error && (
        <div className="px-3 py-2 bg-red-50 border border-red-200 rounded text-xs text-red-800">
          ⚠ {error}
        </div>
      )}

      {result != null && (
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <h3 className="text-sm font-bold text-slate-900 mb-2">Result</h3>
          <pre className="text-xs font-mono bg-slate-50 p-3 rounded border border-slate-100 overflow-x-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
