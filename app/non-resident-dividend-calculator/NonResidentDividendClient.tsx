"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";

/**
 * Non-resident Australian dividend calculator
 * -------------------------------------------
 * Computes the cash dividend a non-resident receives from an
 * Australian company dividend. Handles:
 *   - Franked portion (0% withholding for non-residents)
 *   - Unfranked portion (30% statutory rate, reduced by DTA)
 *   - Partially franked combinations
 *
 * Source: ATO guidance on non-resident withholding tax; country DTA
 * rates come from treaties in force. Rates displayed are the
 * portfolio dividend rate; participation (direct investment) rates
 * differ in some treaties.
 */

// DTA rates in percent. Where a treaty specifies different rates for
// portfolio vs direct-investment dividends, we use the portfolio rate
// as the default. Foreign investors with >10% shareholdings should
// consult their treaty specifically.
const COUNTRIES: { code: string; label: string; unfrankedWht: number }[] = [
  { code: "US", label: "United States", unfrankedWht: 15 },
  { code: "UK", label: "United Kingdom", unfrankedWht: 15 },
  { code: "JP", label: "Japan", unfrankedWht: 10 },
  { code: "KR", label: "South Korea", unfrankedWht: 15 },
  { code: "SG", label: "Singapore", unfrankedWht: 15 },
  { code: "HK", label: "Hong Kong", unfrankedWht: 15 },
  { code: "NZ", label: "New Zealand", unfrankedWht: 15 },
  { code: "IN", label: "India", unfrankedWht: 15 },
  { code: "CN", label: "China (PRC)", unfrankedWht: 15 },
  { code: "DE", label: "Germany", unfrankedWht: 15 },
  { code: "FR", label: "France", unfrankedWht: 15 },
  { code: "NL", label: "Netherlands", unfrankedWht: 15 },
  { code: "IE", label: "Ireland", unfrankedWht: 15 },
  { code: "CA", label: "Canada", unfrankedWht: 15 },
  { code: "ZA", label: "South Africa", unfrankedWht: 15 },
  { code: "MY", label: "Malaysia", unfrankedWht: 15 },
  { code: "ID", label: "Indonesia", unfrankedWht: 15 },
  { code: "PH", label: "Philippines", unfrankedWht: 25 },
  { code: "CH", label: "Switzerland", unfrankedWht: 15 },
  { code: "AE", label: "United Arab Emirates", unfrankedWht: 15 },
  { code: "SA", label: "Saudi Arabia", unfrankedWht: 15 },
  { code: "OTHER", label: "Other / no DTA", unfrankedWht: 30 },
];

function formatAud(value: number): string {
  return value.toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function NonResidentDividendClient() {
  const [dividend, setDividend] = useState<string>("10000");
  const [frankingPct, setFrankingPct] = useState<number>(100);
  const [countryCode, setCountryCode] = useState<string>("US");

  const country = COUNTRIES.find((c) => c.code === countryCode) || COUNTRIES[0]!;
  const dividendNum = Math.max(0, parseFloat(dividend) || 0);

  const calc = useMemo(() => {
    const frankedPortion = dividendNum * (frankingPct / 100);
    const unfrankedPortion = dividendNum - frankedPortion;

    // Franked portion: 0% withholding for non-residents
    const frankedWht = 0;
    // Unfranked portion: statutory 30% reduced by DTA
    const unfrankedWht = unfrankedPortion * (country.unfrankedWht / 100);

    const totalWht = frankedWht + unfrankedWht;
    const netCash = dividendNum - totalWht;

    const effectiveRate = dividendNum > 0 ? (totalWht / dividendNum) * 100 : 0;

    return {
      frankedPortion,
      unfrankedPortion,
      unfrankedWht,
      totalWht,
      netCash,
      effectiveRate,
    };
  }, [dividendNum, frankingPct, country.unfrankedWht]);

  return (
    <div className="bg-white min-h-screen">
      {/* Hero */}
      <section className="relative bg-white border-b border-slate-100 py-8 md:py-12">
        <div className="container-custom max-w-3xl">
          <nav
            className="flex items-center gap-1.5 text-xs text-slate-500 mb-5"
            aria-label="Breadcrumb"
          >
            <Link href="/" className="hover:text-slate-900">
              Home
            </Link>
            <span className="text-slate-300">/</span>
            <Link href="/foreign-investment" className="hover:text-slate-900">
              Foreign Investment
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-medium">
              Non-Resident Dividend Calculator
            </span>
          </nav>

          <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-50 rounded-full text-xs font-semibold text-green-800 mb-4">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
            DTA-aware · Franking-aware
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-3 tracking-tight text-slate-900">
            Non-Resident Australian Dividend Calculator
          </h1>
          <p className="text-sm md:text-base text-slate-600 leading-relaxed">
            Calculate the cash you actually receive on an Australian share
            dividend as a non-resident. Fully franked dividends carry no
            Australian withholding tax; unfranked dividends are subject to 30%
            withholding reduced by your country&rsquo;s Double Tax Agreement.
          </p>
        </div>
      </section>

      {/* Form */}
      <section className="py-10 bg-slate-50 border-b border-slate-200">
        <div className="container-custom max-w-3xl">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 space-y-5">
            <div>
              <label
                htmlFor="dividend"
                className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-2"
              >
                Gross dividend (AUD)
              </label>
              <div className="flex items-center gap-2">
                <span className="text-slate-500">$</span>
                <input
                  id="dividend"
                  type="number"
                  value={dividend}
                  onChange={(e) => setDividend(e.target.value)}
                  min={0}
                  step={100}
                  className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="franking"
                className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-2"
              >
                Franking percentage: {frankingPct}%
              </label>
              <input
                id="franking"
                type="range"
                min={0}
                max={100}
                step={5}
                value={frankingPct}
                onChange={(e) => setFrankingPct(parseInt(e.target.value, 10))}
                className="w-full accent-green-600"
              />
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>0% (unfranked)</span>
                <span>50%</span>
                <span>100% (fully franked)</span>
              </div>
            </div>

            <div>
              <label
                htmlFor="country"
                className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-2"
              >
                Your country of tax residence
              </label>
              <select
                id="country"
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label} — {c.unfrankedWht}% WHT on unfranked
                  </option>
                ))}
              </select>
            </div>

            {/* Results */}
            <div className="bg-green-50 border border-green-200 rounded-xl p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-green-800 mb-1">
                Net cash dividend received
              </p>
              <p className="text-3xl md:text-4xl font-extrabold text-green-900">
                {formatAud(calc.netCash)}
              </p>
              <p className="text-xs text-green-800 mt-2">
                Effective Australian withholding rate:{" "}
                {calc.effectiveRate.toFixed(2)}%
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="px-4 py-2 text-slate-600">Gross dividend</td>
                    <td className="px-4 py-2 text-right font-bold text-slate-900">
                      {formatAud(dividendNum)}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-slate-600">
                      Franked portion ({frankingPct}%) — 0% WHT
                    </td>
                    <td className="px-4 py-2 text-right font-bold text-slate-900">
                      {formatAud(calc.frankedPortion)}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-slate-600">
                      Unfranked portion ({100 - frankingPct}%)
                    </td>
                    <td className="px-4 py-2 text-right font-bold text-slate-900">
                      {formatAud(calc.unfrankedPortion)}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-slate-600">
                      WHT on unfranked ({country.unfrankedWht}%)
                    </td>
                    <td className="px-4 py-2 text-right font-bold text-rose-700">
                      -{formatAud(calc.unfrankedWht)}
                    </td>
                  </tr>
                  <tr className="bg-green-50">
                    <td className="px-4 py-2 font-bold text-slate-900">
                      Net cash to you
                    </td>
                    <td className="px-4 py-2 text-right font-extrabold text-green-800">
                      {formatAud(calc.netCash)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Context */}
      <section className="py-10 bg-white">
        <div className="container-custom max-w-3xl">
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-4">
            How non-resident dividends are taxed
          </h2>

          <div className="prose prose-slate max-w-none text-sm md:text-base">
            <p>
              Australia&rsquo;s dividend imputation system treats non-residents
              very differently from residents. Three rules matter:
            </p>
            <ol>
              <li>
                <strong>Franked portion: zero Australian withholding.</strong>{" "}
                A fully franked dividend already reflects 30% corporate tax at
                company level. Australia does not apply additional withholding
                to non-residents on the franked portion — it arrives gross.
                Non-residents cannot claim a franking credit refund (unlike
                Australian residents on low tax rates).
              </li>
              <li>
                <strong>Unfranked portion: 30% withholding, reduced by DTA.</strong>{" "}
                Unfranked dividends are subject to Australian withholding tax
                at the statutory rate of 30%. Most DTAs reduce this to 15%
                (US, UK, Japan) or 10% (specific cases). The rate applied
                depends on residency and correct lodgement of a residency
                declaration with your Australian broker or share registry.
              </li>
              <li>
                <strong>Home country tax is separate.</strong> The net cash
                you receive is still potentially taxable in your home
                jurisdiction. Many countries allow credit for Australian
                withholding against home tax via the relevant DTA. Professional
                cross-border tax advice is essential for meaningful holdings.
              </li>
            </ol>

            <p>
              <strong>Why fully franked dividends matter so much.</strong>{" "}
              Because the franked portion arrives gross, a fully franked AUD
              10,000 dividend delivers the same AUD 10,000 to an Australian
              resident and to a non-resident — a structural equivalence that
              doesn&rsquo;t exist with unfranked dividends.
            </p>

            <p className="text-xs text-slate-500 italic mt-4">
              Rates shown are the portfolio-dividend DTA rate. Holders of
              substantial interests (&ge;10%) in an Australian company may
              qualify for different treaty rates. This calculator does not
              model holder-of-substantial-interest cases. Verify your specific
              treaty position with a qualified tax advisor.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/foreign-investment/shares"
              className="inline-flex items-center gap-1.5 text-sm font-bold bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg transition-colors"
            >
              Read the non-resident shares guide
              <Icon name="arrow-right" size={14} />
            </Link>
            <Link
              href="/non-resident-cgt-checker"
              className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline"
            >
              Non-resident CGT exemption checker
              <Icon name="arrow-right" size={14} />
            </Link>
            <Link
              href="/firb-fee-estimator"
              className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline"
            >
              FIRB fee estimator
              <Icon name="arrow-right" size={14} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
