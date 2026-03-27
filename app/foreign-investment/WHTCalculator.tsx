"use client";

import { useState, useMemo } from "react";
import type { DTACountry } from "@/lib/foreign-investment-data";

interface Props {
  countries: DTACountry[];
  defaultRates: { dividendUnfranked: number; interest: number; royalties: number };
}

const INCOME_TYPES = [
  { id: "dividend_unfranked", label: "Unfranked dividend", defaultKey: "dividendUnfranked", dtaKey: "dividendWHT" },
  { id: "dividend_franked", label: "Fully franked dividend", rate: 0, fixed: true },
  { id: "interest", label: "Bank interest / bond interest", defaultKey: "interest", dtaKey: "interestWHT" },
  { id: "royalties", label: "Royalties", defaultKey: "royalties", dtaKey: "royaltiesWHT" },
] as const;

export default function WHTCalculator({ countries, defaultRates }: Props) {
  const [incomeType, setIncomeType] = useState<string>("dividend_unfranked");
  const [grossAmount, setGrossAmount] = useState<string>("");
  const [countryCode, setCountryCode] = useState<string>("");

  const selectedCountry = useMemo(
    () => countries.find((c) => c.countryCode === countryCode) ?? null,
    [countries, countryCode]
  );

  const whtRate = useMemo(() => {
    if (incomeType === "dividend_franked") return 0;

    const typeConfig = INCOME_TYPES.find((t) => t.id === incomeType);
    if (!typeConfig || "fixed" in typeConfig) return 0;

    if (selectedCountry) {
      return selectedCountry[typeConfig.dtaKey as keyof DTACountry] as number;
    }
    return defaultRates[typeConfig.defaultKey as keyof typeof defaultRates] as number;
  }, [incomeType, selectedCountry, defaultRates]);

  const gross = parseFloat(grossAmount.replace(/,/g, "")) || 0;
  const whtAmount = gross * (whtRate / 100);
  const netAmount = gross - whtAmount;

  const hasDTA = selectedCountry?.hasDTA ?? false;
  const noCountrySelected = !countryCode;

  const formatCurrency = (n: number) =>
    n.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 2 });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      <p className="text-xs font-bold uppercase tracking-wider text-amber-600 mb-1">Interactive tool</p>
      <h3 className="text-lg font-extrabold text-slate-900 mb-1">Withholding tax calculator</h3>
      <p className="text-xs text-slate-500 mb-5 leading-relaxed">
        Estimate how much withholding tax you&apos;ll pay on Australian income as a non-resident.
        Select your income type, enter the gross amount, and choose your country to apply DTA rates.
      </p>

      <div className="grid sm:grid-cols-2 gap-4 mb-5">
        {/* Income type */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">Income type</label>
          <select
            value={incomeType}
            onChange={(e) => setIncomeType(e.target.value)}
            className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 transition"
          >
            {INCOME_TYPES.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* Gross amount */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">Gross amount (AUD)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">$</span>
            <input
              type="text"
              inputMode="decimal"
              value={grossAmount}
              onChange={(e) => {
                const v = e.target.value.replace(/[^0-9.]/g, "");
                setGrossAmount(v);
              }}
              placeholder="10,000"
              className="w-full pl-7 pr-4 py-2.5 text-sm border border-slate-300 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 transition"
            />
          </div>
        </div>
      </div>

      {/* Country selector */}
      <div className="mb-5">
        <label className="block text-xs font-bold text-slate-700 mb-1.5">Your country of residence</label>
        <select
          value={countryCode}
          onChange={(e) => setCountryCode(e.target.value)}
          className="w-full sm:max-w-xs px-3 py-2.5 text-sm border border-slate-300 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 transition"
        >
          <option value="">-- No DTA / country not listed --</option>
          {countries.filter((c) => c.hasDTA).map((c) => (
            <option key={c.countryCode} value={c.countryCode}>{c.country}</option>
          ))}
          <optgroup label="No DTA with Australia">
            {countries.filter((c) => !c.hasDTA).map((c) => (
              <option key={c.countryCode} value={c.countryCode}>{c.country}</option>
            ))}
          </optgroup>
        </select>
        {selectedCountry && (
          <p className="mt-1.5 text-xs text-slate-500">
            {hasDTA
              ? `DTA in force since ${selectedCountry.dtaEffectiveYear ?? "unknown"} — reduced rates apply`
              : "No DTA with Australia — standard withholding rates apply"}
          </p>
        )}
      </div>

      {/* Result */}
      {gross > 0 ? (
        <div className={`rounded-2xl p-5 ${whtRate === 0 ? "bg-green-50 border border-green-200" : "bg-amber-50 border border-amber-200"}`}>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="text-center">
              <p className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-wide mb-0.5">Gross income</p>
              <p className="text-base font-black text-slate-900">{formatCurrency(gross)}</p>
            </div>
            <div className="text-center">
              <p className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-wide mb-0.5">WHT deducted</p>
              <p className={`text-base font-black ${whtAmount === 0 ? "text-green-700" : "text-red-700"}`}>
                {whtRate === 0 ? "—" : `−${formatCurrency(whtAmount)}`}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-wide mb-0.5">You receive</p>
              <p className="text-base font-black text-slate-900">{formatCurrency(netAmount)}</p>
            </div>
          </div>

          <div className={`rounded-xl px-4 py-3 text-center ${whtRate === 0 ? "bg-green-100" : "bg-white border border-amber-200"}`}>
            <span className={`text-sm font-bold ${whtRate === 0 ? "text-green-800" : "text-amber-800"}`}>
              {whtRate === 0
                ? (incomeType === "dividend_franked"
                    ? "0% WHT — fully franked dividend (company tax already paid)"
                    : "0% WHT applies")
                : `${whtRate}% withholding tax rate${hasDTA ? " (DTA reduced rate)" : noCountrySelected ? " (standard — no DTA)" : " (no DTA — standard rate)"}`}
            </span>
          </div>

          {incomeType === "dividend_franked" && (
            <p className="mt-3 text-xs text-slate-600 leading-relaxed">
              Note: as a non-resident, you receive the dividend gross with 0% withholding, but you cannot claim the franking credit refund that Australian tax residents receive.
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-2xl bg-slate-50 border border-slate-200 px-5 py-6 text-center">
          <p className="text-sm text-slate-400">
            {gross === 0 && grossAmount !== ""
              ? "Enter a valid amount above"
              : "Enter an amount and select your country to see your withholding tax estimate"}
          </p>
        </div>
      )}

      <p className="mt-3 text-[0.65rem] text-slate-400 leading-relaxed">
        Estimates only — for illustration purposes. Actual rates depend on your specific treaty, income type, and the payer&apos;s
        classification of the payment. Fully franked dividend refunds do not apply to non-residents. Consult a registered tax agent.
      </p>
    </div>
  );
}
