"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Instrument = "safe" | "safe_t" | "convertible_note" | "priced_equity";

const INSTRUMENTS: { value: Instrument; label: string; description: string }[] = [
  { value: "safe", label: "SAFE", description: "Simple Agreement for Future Equity — most common for early-stage AU rounds" },
  { value: "safe_t", label: "SAFE-T", description: "SAFE with a target close date" },
  { value: "convertible_note", label: "Convertible Note", description: "Debt instrument converting to equity at a future priced round" },
  { value: "priced_equity", label: "Priced Equity", description: "Fixed price per share with a pre-money valuation" },
];

type FormState = {
  instrument: Instrument | "";
  // Common
  target_aud: string;
  min_ticket_aud: string;
  closes_at: string;
  wholesale_only: boolean;
  lead_investor_name: string;
  // SAFE / SAFE-T / Convertible
  valuation_cap_aud: string;
  discount_pct: string;
  // Convertible Note specific
  interest_rate_pct: string;
  maturity_months: string;
  // Priced Equity specific
  pre_money_valuation_aud: string;
};

const INIT: FormState = {
  instrument: "",
  target_aud: "",
  min_ticket_aud: "",
  closes_at: "",
  wholesale_only: true,
  lead_investor_name: "",
  valuation_cap_aud: "",
  discount_pct: "",
  interest_rate_pct: "",
  maturity_months: "",
  pre_money_valuation_aud: "",
};

function parseCents(s: string): number | null {
  const n = parseFloat(s.replace(/,/g, ""));
  if (isNaN(n) || n <= 0) return null;
  return Math.round(n * 100);
}

function parsePercent(s: string): number | null {
  const n = parseFloat(s);
  if (isNaN(n) || n < 0 || n > 100) return null;
  return n;
}

export default function NewRoundPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(INIT);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
    setError(null);
  }

  function validateStep(): string | null {
    if (step === 1) {
      if (!form.instrument) return "Please select an instrument type.";
    }
    if (step === 2) {
      if (form.instrument === "safe" || form.instrument === "safe_t") {
        if (!form.valuation_cap_aud || !parseCents(form.valuation_cap_aud)) return "Valuation cap is required.";
        if (!form.discount_pct || !parsePercent(form.discount_pct)) return "Discount % is required (0–100).";
      }
      if (form.instrument === "convertible_note") {
        if (!form.interest_rate_pct || !parsePercent(form.interest_rate_pct)) return "Interest rate is required.";
        if (!form.maturity_months || isNaN(parseInt(form.maturity_months))) return "Maturity months is required.";
      }
      if (form.instrument === "priced_equity") {
        if (!form.pre_money_valuation_aud || !parseCents(form.pre_money_valuation_aud)) return "Pre-money valuation is required.";
      }
    }
    if (step === 3) {
      if (!form.target_aud || !parseCents(form.target_aud)) return "Target raise amount is required.";
      if (!form.min_ticket_aud || !parseCents(form.min_ticket_aud)) return "Minimum ticket size is required.";
    }
    return null;
  }

  async function submit() {
    const err = validateStep();
    if (err) { setError(err); return; }

    setLoading(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        instrument: form.instrument,
        target_aud_cents: parseCents(form.target_aud),
        min_ticket_aud_cents: parseCents(form.min_ticket_aud),
        closes_at: form.closes_at || null,
        wholesale_only: form.wholesale_only,
        lead_investor_name: form.lead_investor_name.trim() || null,
      };

      if (form.instrument === "safe" || form.instrument === "safe_t") {
        payload.valuation_cap_aud_cents = parseCents(form.valuation_cap_aud);
        payload.discount_pct = parsePercent(form.discount_pct);
      }
      if (form.instrument === "convertible_note") {
        payload.valuation_cap_aud_cents = form.valuation_cap_aud ? parseCents(form.valuation_cap_aud) : null;
        payload.discount_pct = form.discount_pct ? parsePercent(form.discount_pct) : null;
        payload.interest_rate_pct = parsePercent(form.interest_rate_pct);
        payload.maturity_months = parseInt(form.maturity_months);
      }
      if (form.instrument === "priced_equity") {
        payload.valuation_cap_aud_cents = parseCents(form.pre_money_valuation_aud);
      }

      const res = await fetch("/api/startups/round", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json: { error?: string } = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to open round. Please try again.");
        return;
      }
      router.push("/startup-portal/round");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
          <Link href="/startup-portal/round" className="text-xs text-gray-400 hover:text-gray-600">← Rounds</Link>
          <h1 className="text-lg font-semibold text-gray-900 mt-0.5">Open a new round</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">

          {/* Progress */}
          <div className="flex gap-2 mb-6">
            {(["1. Instrument", "2. Terms", "3. Details"] as const).map((label, i) => (
              <div key={i} className="flex-1">
                <div className={`h-1 rounded-full ${i + 1 <= step ? "bg-blue-600" : "bg-gray-200"}`} />
                <p className={`text-xs mt-1 ${i + 1 === step ? "text-blue-600 font-medium" : "text-gray-400"}`}>{label}</p>
              </div>
            ))}
          </div>

          {error && (
            <div role="alert" className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
          )}

          {/* Step 1: Instrument */}
          {step === 1 && (
            <div className="space-y-3">
              {INSTRUMENTS.map((ins) => (
                <label
                  key={ins.value}
                  className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer transition-colors ${
                    form.instrument === ins.value
                      ? "border-blue-600 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="instrument"
                    value={ins.value}
                    checked={form.instrument === ins.value}
                    onChange={() => set("instrument", ins.value)}
                    className="mt-0.5"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{ins.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{ins.description}</p>
                  </div>
                </label>
              ))}
              <button
                onClick={() => { const e = validateStep(); if (e) { setError(e); return; } setStep(2); }}
                className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
              >
                Continue
              </button>
            </div>
          )}

          {/* Step 2: Instrument-specific terms */}
          {step === 2 && (
            <div className="space-y-4">
              {(form.instrument === "safe" || form.instrument === "safe_t" || form.instrument === "convertible_note") && (
                <>
                  <div>
                    <label htmlFor="sr-val-cap" className="block text-sm font-medium text-gray-700 mb-1">Valuation cap (AUD)</label>
                    <input
                      id="sr-val-cap"
                      type="text"
                      value={form.valuation_cap_aud}
                      onChange={(e) => set("valuation_cap_aud", e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="5,000,000"
                    />
                  </div>
                  <div>
                    <label htmlFor="sr-discount" className="block text-sm font-medium text-gray-700 mb-1">
                      Discount % {form.instrument === "convertible_note" ? "(optional)" : ""}
                    </label>
                    <input
                      id="sr-discount"
                      type="number"
                      min={0}
                      max={50}
                      value={form.discount_pct}
                      onChange={(e) => set("discount_pct", e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="20"
                    />
                  </div>
                </>
              )}
              {form.instrument === "convertible_note" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="sr-interest-rate" className="block text-sm font-medium text-gray-700 mb-1">Interest rate %</label>
                      <input
                        id="sr-interest-rate"
                        type="number"
                        min={0}
                        max={30}
                        step={0.5}
                        value={form.interest_rate_pct}
                        onChange={(e) => set("interest_rate_pct", e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="8"
                      />
                    </div>
                    <div>
                      <label htmlFor="sr-maturity" className="block text-sm font-medium text-gray-700 mb-1">Maturity (months)</label>
                      <input
                        id="sr-maturity"
                        type="number"
                        min={6}
                        max={60}
                        value={form.maturity_months}
                        onChange={(e) => set("maturity_months", e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="18"
                      />
                    </div>
                  </div>
                </>
              )}
              {form.instrument === "priced_equity" && (
                <div>
                  <label htmlFor="sr-pre-money" className="block text-sm font-medium text-gray-700 mb-1">Pre-money valuation (AUD)</label>
                  <input
                    id="sr-pre-money"
                    type="text"
                    value={form.pre_money_valuation_aud}
                    onChange={(e) => set("pre_money_valuation_aud", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="10,000,000"
                  />
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 border border-gray-300 text-gray-700 font-medium py-2.5 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => { const e = validateStep(); if (e) { setError(e); return; } setStep(3); }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Common round details */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="sr-target-raise" className="block text-sm font-medium text-gray-700 mb-1">Target raise (AUD)</label>
                  <input
                    id="sr-target-raise"
                    type="text"
                    value={form.target_aud}
                    onChange={(e) => set("target_aud", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="2,000,000"
                  />
                </div>
                <div>
                  <label htmlFor="sr-min-ticket" className="block text-sm font-medium text-gray-700 mb-1">Min ticket (AUD)</label>
                  <input
                    id="sr-min-ticket"
                    type="text"
                    value={form.min_ticket_aud}
                    onChange={(e) => set("min_ticket_aud", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="50,000"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="sr-close-date" className="block text-sm font-medium text-gray-700 mb-1">Close date (optional)</label>
                <input
                  id="sr-close-date"
                  type="date"
                  value={form.closes_at}
                  onChange={(e) => set("closes_at", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="sr-lead-investor" className="block text-sm font-medium text-gray-700 mb-1">Lead investor name (optional)</label>
                <input
                  id="sr-lead-investor"
                  type="text"
                  value={form.lead_investor_name}
                  onChange={(e) => set("lead_investor_name", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="AirTree Ventures"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.wholesale_only}
                  onChange={(e) => set("wholesale_only", e.target.checked)}
                />
                <span className="text-sm text-gray-700">Wholesale investors only (s708 certification required)</span>
              </label>
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 border border-gray-300 text-gray-700 font-medium py-2.5 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={submit}
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
                >
                  {loading ? "Opening round…" : "Open round"}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
