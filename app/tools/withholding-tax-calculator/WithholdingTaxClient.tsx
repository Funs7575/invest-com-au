"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";

interface CountryOption {
  code: string;
  name: string;
}

interface RateRow {
  id: number;
  rate_type: string;
  category: string | null;
  rate_percent: number | string | null;
  notes: string | null;
}

interface ApiCountriesResponse {
  ok: boolean;
  countries?: CountryOption[];
  error?: string;
}

interface ApiRatesResponse {
  ok: boolean;
  country?: string;
  rates?: RateRow[];
  error?: string;
}

const INCOME_CATEGORIES = [
  {
    key: "dividends_unfranked",
    label: "Unfranked dividends",
    hint:
      "Fully franked dividends are generally 0% WHT for non-residents regardless of DTA — this rate applies to the unfranked portion.",
  },
  {
    key: "dividends_franked",
    label: "Franked dividends",
    hint: "Typically 0% under the Australian imputation regime.",
  },
  { key: "interest", label: "Interest income", hint: null },
  { key: "royalties", label: "Royalties", hint: null },
];

function toNumber(value: number | string | null | undefined): number | null {
  if (value == null) return null;
  const n = typeof value === "string" ? parseFloat(value) : value;
  return Number.isFinite(n) ? n : null;
}

function formatAud(cents: number): string {
  return (cents / 100).toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  });
}

export default function WithholdingTaxClient() {
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [countriesError, setCountriesError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string>("GB");
  const [rates, setRates] = useState<RateRow[]>([]);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [ratesError, setRatesError] = useState<string | null>(null);
  const [amount, setAmount] = useState<string>("10000");
  const [category, setCategory] = useState<string>("dividends_unfranked");

  // Load country list once on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/foreign-investment/rates");
        const data = (await res.json()) as ApiCountriesResponse;
        if (cancelled) return;
        if (!data.ok) {
          setCountriesError(data.error ?? "Could not load countries");
          return;
        }
        setCountries(data.countries ?? []);
      } catch (err) {
        if (!cancelled) {
          setCountriesError(
            err instanceof Error ? err.message : "Network error",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Refetch rates whenever the selected country changes.
  useEffect(() => {
    let cancelled = false;
    setRatesLoading(true);
    setRatesError(null);
    (async () => {
      try {
        const res = await fetch(
          `/api/foreign-investment/rates?country=${encodeURIComponent(selected)}`,
        );
        const data = (await res.json()) as ApiRatesResponse;
        if (cancelled) return;
        if (!data.ok) {
          setRatesError(data.error ?? "Could not load rates");
          setRates([]);
          return;
        }
        setRates(data.rates ?? []);
      } catch (err) {
        if (!cancelled) {
          setRatesError(err instanceof Error ? err.message : "Network error");
          setRates([]);
        }
      } finally {
        if (!cancelled) setRatesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selected]);

  const rateForCategory = useMemo(() => {
    const row = rates.find(
      (r) => r.rate_type === "withholding_tax" && r.category === category,
    );
    return row ? { percent: toNumber(row.rate_percent), notes: row.notes } : null;
  }, [rates, category]);

  const amountNum = Math.max(0, parseFloat(amount) || 0);
  const amountCents = Math.round(amountNum * 100);
  const whtCents =
    rateForCategory?.percent != null
      ? Math.round((amountCents * rateForCategory.percent) / 100)
      : 0;
  const netCents = amountCents - whtCents;

  const dtaRows = rates.filter((r) => r.rate_type === "withholding_tax");
  const selectedCountryName =
    countries.find((c) => c.code === selected)?.name ?? selected;

  return (
    <div className="bg-white min-h-screen">
      {/* Hero */}
      <section className="bg-white border-b border-slate-100 py-8 md:py-12">
        <div className="container-custom max-w-3xl">
          <nav
            className="flex items-center gap-1.5 text-xs text-slate-500 mb-5"
            aria-label="Breadcrumb"
          >
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span className="text-slate-300">/</span>
            <Link href="/tools" className="hover:text-slate-900">Tools</Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-medium">
              Withholding Tax Calculator
            </span>
          </nav>

          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 rounded-full text-xs font-semibold text-amber-800 mb-4">
            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
            Live DTA rates · {countries.length} countries
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-tight mb-3 tracking-tight text-slate-900">
            Australian Withholding Tax Calculator
          </h1>
          <p className="text-sm md:text-base text-slate-600 leading-relaxed">
            For non-residents receiving Australian-source dividends, interest,
            or royalties. Rates reflect the Double Tax Agreement between
            Australia and the selected country.
          </p>
        </div>
      </section>

      {/* Form + result */}
      <section className="py-10 bg-slate-50 border-b border-slate-200">
        <div className="container-custom max-w-3xl">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 space-y-5">
            <div>
              <label
                htmlFor="wht-country"
                className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1"
              >
                Country of tax residence
              </label>
              <select
                id="wht-country"
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-sm"
                disabled={countries.length === 0}
              >
                {countries.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
              {countriesError && (
                <p className="text-xs text-rose-700 mt-1">{countriesError}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="wht-category"
                className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1"
              >
                Income type
              </label>
              <select
                id="wht-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-sm"
              >
                {INCOME_CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
              {INCOME_CATEGORIES.find((c) => c.key === category)?.hint && (
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  {INCOME_CATEGORIES.find((c) => c.key === category)?.hint}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="wht-amount"
                className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1"
              >
                Amount (AUD)
              </label>
              <div className="flex items-center gap-2">
                <span className="text-slate-500">$</span>
                <input
                  id="wht-amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min={0}
                  step={100}
                  className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-sm"
                />
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-amber-800 mb-1">
                Net amount after Australian WHT
              </p>
              {ratesLoading ? (
                <p className="text-sm text-amber-900">Loading DTA rate…</p>
              ) : rateForCategory?.percent == null ? (
                <p className="text-sm text-amber-900">
                  No published DTA rate for this income type /
                  {" "}{selectedCountryName}. Default statutory rates apply — 30%
                  WHT on unfranked dividends, 10% on interest, 30% on royalties.
                </p>
              ) : (
                <>
                  <p className="text-3xl md:text-4xl font-extrabold text-amber-900">
                    {formatAud(netCents)}
                  </p>
                  <p className="text-xs text-amber-800 mt-2 leading-relaxed">
                    WHT rate: <strong>{rateForCategory.percent}%</strong> · WHT
                    withheld: <strong>{formatAud(whtCents)}</strong>
                    {rateForCategory.notes
                      ? ` · ${rateForCategory.notes}`
                      : ""}
                  </p>
                </>
              )}
              {ratesError && (
                <p className="text-xs text-rose-700 mt-2">{ratesError}</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Full DTA table for selected country */}
      <section className="py-10 bg-white">
        <div className="container-custom max-w-3xl">
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-4">
            All DTA rates — {selectedCountryName}
          </h2>
          {dtaRows.length === 0 ? (
            <p className="text-sm text-slate-500">
              {ratesLoading ? "Loading…" : "No rates published for this country."}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-bold text-slate-700">
                      Income type
                    </th>
                    <th className="text-left px-4 py-3 font-bold text-slate-700">
                      Rate
                    </th>
                    <th className="text-left px-4 py-3 font-bold text-slate-700 hidden md:table-cell">
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dtaRows.map((r) => (
                    <tr key={r.id}>
                      <td className="px-4 py-3 text-slate-700 capitalize">
                        {r.category?.replace(/_/g, " ") ?? r.rate_type}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-900 tabular-nums">
                        {toNumber(r.rate_percent)?.toFixed(2)}%
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 hidden md:table-cell">
                        {r.notes ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/foreign-investment/tax"
              className="inline-flex items-center gap-1.5 text-sm font-bold bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-lg"
            >
              Full non-resident tax guide
              <Icon name="arrow-right" size={14} />
            </Link>
            <Link
              href="/advisors/foreign-investment-lawyers"
              className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline"
            >
              Find a foreign investment lawyer
              <Icon name="arrow-right" size={14} />
            </Link>
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed mt-6">
            <strong>General information only.</strong> Rates shown apply to
            portfolio holders under the published Australian tax treaties.
            Substantial-holder cases (≥10% ownership), hybrid-instrument rules,
            and BEPS anti-avoidance provisions can materially change the
            effective rate. Seek cross-border tax advice for real engagements.
          </p>
        </div>
      </section>
    </div>
  );
}
