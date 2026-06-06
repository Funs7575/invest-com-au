"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

// Static mid-market indicative rates (AUD base).
// These are representative for calculator purposes — not real-time.
// For live FX see your bank or OFX/Wise/TorFX comparison below.
const AUD_RATES: Record<string, { rate: number; name: string; symbol: string; flag: string }> = {
  USD: { rate: 0.652, name: "US Dollar", symbol: "$", flag: "🇺🇸" },
  GBP: { rate: 0.515, name: "British Pound", symbol: "£", flag: "🇬🇧" },
  EUR: { rate: 0.596, name: "Euro", symbol: "€", flag: "🇪🇺" },
  JPY: { rate: 98.4, name: "Japanese Yen", symbol: "¥", flag: "🇯🇵" },
  CNY: { rate: 4.74, name: "Chinese Yuan", symbol: "¥", flag: "🇨🇳" },
  SGD: { rate: 0.878, name: "Singapore Dollar", symbol: "S$", flag: "🇸🇬" },
  HKD: { rate: 5.09, name: "Hong Kong Dollar", symbol: "HK$", flag: "🇭🇰" },
  NZD: { rate: 1.077, name: "New Zealand Dollar", symbol: "NZ$", flag: "🇳🇿" },
  CAD: { rate: 0.888, name: "Canadian Dollar", symbol: "CA$", flag: "🇨🇦" },
  CHF: { rate: 0.578, name: "Swiss Franc", symbol: "CHF", flag: "🇨🇭" },
  INR: { rate: 54.1, name: "Indian Rupee", symbol: "₹", flag: "🇮🇳" },
  THB: { rate: 22.8, name: "Thai Baht", symbol: "฿", flag: "🇹🇭" },
  IDR: { rate: 10420, name: "Indonesian Rupiah", symbol: "Rp", flag: "🇮🇩" },
  MYR: { rate: 2.96, name: "Malaysian Ringgit", symbol: "RM", flag: "🇲🇾" },
  ZAR: { rate: 11.8, name: "South African Rand", symbol: "R", flag: "🇿🇦" },
};

const CURRENCIES = Object.keys(AUD_RATES);

function formatAmount(val: number, currency: string): string {
  if (currency === "JPY" || currency === "IDR" || currency === "KRW") {
    return val.toLocaleString("en-AU", { maximumFractionDigits: 0 });
  }
  return val.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const CONTEXT_ROWS = [
  { label: "FIRB residential property trigger", aud: 1220000 },
  { label: "FIRB commercial property trigger", aud: 310000 },
  { label: "Significant Investor Visa (SIV) minimum", aud: 5000000 },
  { label: "Business Innovation visa (stream A)", aud: 800000 },
  { label: "Super non-concessional cap", aud: 120000 },
  { label: "Super concessional cap (FY2025–26)", aud: 30000 },
];

export default function CurrencyConverterPage() {
  const [amount, setAmount] = useState<string>("10000");
  const [fromCurrency, setFromCurrency] = useState<string>("AUD");
  const [toCurrency, setToCurrency] = useState<string>("USD");

  const convert = useCallback(
    (rawAmount: number, from: string, to: string): number => {
      if (from === to) return rawAmount;
      // Convert to AUD first, then to target
      const audAmount =
        from === "AUD" ? rawAmount : rawAmount / (AUD_RATES[from]?.rate ?? 1);
      const result = to === "AUD" ? audAmount : audAmount * (AUD_RATES[to]?.rate ?? 1);
      return result;
    },
    []
  );

  const numAmount = parseFloat(amount.replace(/,/g, "")) || 0;
  const result = convert(numAmount, fromCurrency, toCurrency);

  const allCurrencies = ["AUD", ...CURRENCIES];

  const rateDisplay = (() => {
    const oneAud =
      toCurrency === "AUD"
        ? 1 / (AUD_RATES[fromCurrency]?.rate ?? 1)
        : fromCurrency === "AUD"
        ? AUD_RATES[toCurrency]?.rate ?? 1
        : (AUD_RATES[toCurrency]?.rate ?? 1) / (AUD_RATES[fromCurrency]?.rate ?? 1);
    return `1 ${fromCurrency} = ${formatAmount(oneAud, toCurrency)} ${toCurrency}`;
  })();

  return (
    <main className="min-h-screen bg-slate-50 pb-16">
      {/* Hero */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-10 md:py-14">
        <div className="container-custom">
          <nav aria-label="Breadcrumb" className="text-xs text-blue-200 mb-3">
            <Link href="/" className="hover:text-white">
              Home
            </Link>{" "}
            /{" "}
            <Link href="/tools" className="hover:text-white">
              Tools
            </Link>{" "}
            / Currency Converter
          </nav>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">AUD Currency Converter</h1>
          <p className="text-blue-100 max-w-xl">
            Convert Australian dollars to and from 15 currencies. Useful for international
            investment, remittances, FIRB thresholds, and visa requirements.
          </p>
        </div>
      </section>

      <div className="container-custom py-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        {/* Calculator card */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="font-semibold text-slate-900 mb-5">Convert</h2>

            <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr]">
              {/* From */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Amount</label>
                <div className="flex gap-2">
                  <select
                    value={fromCurrency}
                    onChange={(e) => setFromCurrency(e.target.value)}
                    className="border border-slate-300 rounded-lg px-2 py-2 text-sm bg-white w-24"
                    aria-label="From currency"
                  >
                    {allCurrencies.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min={0}
                    className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm"
                    aria-label="Amount to convert"
                  />
                </div>
              </div>

              {/* Swap button */}
              <div className="flex items-end justify-center pb-1">
                <button
                  onClick={() => {
                    setFromCurrency(toCurrency);
                    setToCurrency(fromCurrency);
                  }}
                  className="p-2 rounded-full border border-slate-300 hover:bg-slate-100 text-slate-600"
                  aria-label="Swap currencies"
                >
                  ⇄
                </button>
              </div>

              {/* To */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Converted to</label>
                <div className="flex gap-2">
                  <select
                    value={toCurrency}
                    onChange={(e) => setToCurrency(e.target.value)}
                    className="border border-slate-300 rounded-lg px-2 py-2 text-sm bg-white w-24"
                    aria-label="To currency"
                  >
                    {allCurrencies.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <div className="flex-1 border border-slate-200 bg-slate-50 rounded-lg px-3 py-2 text-sm font-semibold text-slate-900">
                    {formatAmount(result, toCurrency)}
                  </div>
                </div>
              </div>
            </div>

            {/* Rate display */}
            <div className="mt-4 p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
              <span className="font-medium">Indicative rate: </span>
              {rateDisplay}
              <span className="text-blue-500 ml-2">
                — mid-market estimate, not a live quote. Rates updated periodically.
              </span>
            </div>
          </div>

          {/* Australian context table */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="font-semibold text-slate-900 mb-1">Australian thresholds in {toCurrency}</h2>
            <p className="text-xs text-slate-500 mb-4">
              Key AUD amounts converted at the current indicative rate.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th scope="col" className="text-left py-2 font-medium text-slate-600">Threshold</th>
                    <th scope="col" className="text-right py-2 font-medium text-slate-600">AUD</th>
                    <th scope="col" className="text-right py-2 font-medium text-slate-600">{toCurrency}</th>
                  </tr>
                </thead>
                <tbody>
                  {CONTEXT_ROWS.map(({ label, aud }) => {
                    const converted = convert(aud, "AUD", toCurrency);
                    return (
                      <tr key={label} className="border-b border-slate-100">
                        <td className="py-2 text-slate-700">{label}</td>
                        <td className="py-2 text-right text-slate-500">
                          ${aud.toLocaleString("en-AU")}
                        </td>
                        <td className="py-2 text-right font-medium text-slate-900">
                          {formatAmount(converted, toCurrency)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* CTA — live FX */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
            <h3 className="font-semibold text-amber-900 mb-1">Need a live rate or to transfer funds?</h3>
            <p className="text-sm text-amber-800 mb-3">
              For actual transfers, compare specialist FX providers — they typically beat bank rates by
              1–2%. For large sums ($50k+), Wise, OFX, and TorFX are popular among Australian
              investors.
            </p>
            <Link
              href="/foreign-investment/send-money-australia"
              className="inline-block bg-amber-600 hover:bg-amber-700 text-slate-900 text-sm font-medium px-4 py-2 rounded-lg"
            >
              Compare FX providers →
            </Link>
          </div>
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="font-semibold text-slate-900 text-sm mb-3">All rates (1 AUD =)</h3>
            <div className="space-y-1.5">
              {CURRENCIES.map((c) => {
                const info = AUD_RATES[c];
                return (
                  <div key={c} className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">
                      {info.flag} {c}
                    </span>
                    <span className="font-medium text-slate-900">
                      {formatAmount(info.rate, c)}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-slate-400 mt-3">Indicative mid-market rates. Not live.</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="font-semibold text-slate-900 text-sm mb-2">Related tools</h3>
            <div className="space-y-2">
              {[
                { label: "FIRB fee estimator", href: "/firb-fee-estimator" },
                { label: "Withholding tax calculator", href: "/tools/withholding-tax-calculator" },
                { label: "Visa investment calculator", href: "/tools/visa-investment-calculator" },
                { label: "Non-resident dividend calc", href: "/non-resident-dividend-calculator" },
              ].map(({ label, href }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex justify-between text-sm text-blue-600 hover:underline"
                >
                  {label} <span className="text-slate-400">→</span>
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </div>

      <div className="container-custom">
        <p className="text-xs text-slate-500 border-t border-slate-200 pt-4">
          {GENERAL_ADVICE_WARNING} Rates shown are indicative mid-market estimates for calculator
          purposes only. Actual exchange rates at time of transaction may differ. Always confirm
          current rates with your bank or FX provider before transacting.
        </p>
      </div>
    </main>
  );
}
