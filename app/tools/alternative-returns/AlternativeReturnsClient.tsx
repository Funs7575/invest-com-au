"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";

interface AssetClass {
  key: string;
  label: string;
  shortLabel: string;
  /** Annualised return (decimal, e.g. 0.09 for 9% p.a.) */
  rate: number;
  source: string;
  accent: string;
  barColor: string;
  description: string;
}

const ASSET_CLASSES: AssetClass[] = [
  {
    key: "watches",
    label: "Luxury watches (Rolex Daytona / Submariner)",
    shortLabel: "Luxury watches",
    rate: 0.09,
    source: "WatchCharts Index 2014–2024 average",
    accent: "bg-amber-50 border-amber-200 text-amber-800",
    barColor: "bg-amber-500",
    description:
      "Steel sports models from Rolex have led the secondary market — heavily skewed by the 2020–22 bubble that has since cooled.",
  },
  {
    key: "classic-cars",
    label: "Classic cars (HAGI Top Index)",
    shortLabel: "Classic cars",
    rate: 0.08,
    source: "HAGI Top Index 1990–2024",
    accent: "bg-rose-50 border-rose-200 text-rose-800",
    barColor: "bg-rose-500",
    description:
      "Blue-chip historic cars from Ferrari, Porsche, Aston Martin and Mercedes-Benz tracked by HAGI. Excludes restoration, insurance and storage costs.",
  },
  {
    key: "wine",
    label: "Fine wine (Liv-ex Fine Wine 1000)",
    shortLabel: "Fine wine",
    rate: 0.10,
    source: "Liv-ex 1000 20-year",
    accent: "bg-purple-50 border-purple-200 text-purple-800",
    barColor: "bg-purple-500",
    description:
      "Top 1000 fine wines (Bordeaux, Burgundy, Champagne, Italy, Rest of World) by trade volume — provenance, storage and merchant margins reduce real returns.",
  },
  {
    key: "asx200",
    label: "ASX 200 (Total Return — incl. dividends)",
    shortLabel: "ASX 200",
    rate: 0.09,
    source: "S&P/ASX 200 Total Return 1990–2024",
    accent: "bg-emerald-50 border-emerald-200 text-emerald-800",
    barColor: "bg-emerald-500",
    description:
      "Australia's top 200 listed companies on a total-return basis (price growth plus reinvested dividends, before tax).",
  },
  {
    key: "property",
    label: "Australian residential property",
    shortLabel: "Aus. property",
    rate: 0.065,
    source: "CoreLogic Home Value Index 1990–2024",
    accent: "bg-sky-50 border-sky-200 text-sky-800",
    barColor: "bg-sky-500",
    description:
      "Capital growth only — excludes net rental yield, transaction costs (stamp duty), maintenance and land tax.",
  },
];

const CURRENT_YEAR_LOCAL = new Date().getFullYear();
const MIN_YEAR = 1980;

function compoundValue(principal: number, rate: number, years: number): number {
  if (years <= 0) return principal;
  return principal * Math.pow(1 + rate, years);
}

function formatAud(value: number): string {
  if (value >= 10_000_000) return `A$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000_000) return `A$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `A$${(value / 1_000).toFixed(0)}k`;
  return `A$${value.toFixed(0)}`;
}

export default function AlternativeReturnsClient() {
  const [assetKey, setAssetKey] = useState<string>("watches");
  const [year, setYear] = useState<string>("2000");
  const [amount, setAmount] = useState<string>("25000");

  const principal = Math.max(0, parseFloat(amount) || 0);
  const yearNum = Math.max(MIN_YEAR, Math.min(CURRENT_YEAR_LOCAL, parseInt(year, 10) || MIN_YEAR));
  const years = CURRENT_YEAR_LOCAL - yearNum;

  const selectedAsset = ASSET_CLASSES.find((a) => a.key === assetKey) ?? ASSET_CLASSES[0]!;

  const results = useMemo(() => {
    const rows = ASSET_CLASSES.map((asset) => ({
      asset,
      currentValue: compoundValue(principal, asset.rate, years),
      isSelected: asset.key === assetKey,
    }));
    const maxValue = Math.max(...rows.map((r) => r.currentValue), 1);
    return rows.map((r) => ({ ...r, barWidthPct: (r.currentValue / maxValue) * 100 }));
  }, [principal, years, assetKey]);

  const selectedResult = results.find((r) => r.isSelected) ?? results[0]!;
  const totalGrowth = selectedResult.currentValue - principal;

  return (
    <div className="bg-white min-h-screen">
      <section className="bg-white border-b border-slate-100 py-8 md:py-12">
        <div className="container-custom max-w-5xl">
          <nav
            className="flex items-center gap-1.5 text-xs text-slate-500 mb-5"
            aria-label="Breadcrumb"
          >
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span className="text-slate-300">/</span>
            <Link href="/tools" className="hover:text-slate-900">Tools</Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-medium">
              Alternative Asset Returns
            </span>
          </nav>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-tight mb-3 tracking-tight text-slate-900">
            Alternative Asset Returns Calculator
          </h1>
          <p className="text-sm md:text-base text-slate-600 leading-relaxed max-w-3xl">
            What would your money be worth today if you had bought a Rolex, a
            classic Ferrari, a case of Bordeaux, an ASX 200 index fund or an
            Australian house in a given year? This tool applies long-run
            historical annualised returns from established indices to give a
            ballpark estimate.
          </p>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mt-5 max-w-3xl">
            <p className="text-xs text-amber-900 leading-relaxed">
              <strong>Important:</strong> These are historical-index averages,
              not forecasts. Individual asset returns vary enormously — a
              specific watch, car or wine may significantly under- or
              outperform its index. Storage, insurance, transaction costs and
              tax are not deducted. This is general information only, not a
              recommendation to invest in any asset class.
            </p>
          </div>
        </div>
      </section>

      <section className="py-8 bg-slate-50 border-b border-slate-200">
        <div className="container-custom max-w-3xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="alt-asset"
                className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1"
              >
                Asset class
              </label>
              <select
                id="alt-asset"
                value={assetKey}
                onChange={(e) => setAssetKey(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-sm"
              >
                {ASSET_CLASSES.map((a) => (
                  <option key={a.key} value={a.key}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="alt-year"
                className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1"
              >
                Year of purchase
              </label>
              <input
                id="alt-year"
                type="number"
                value={year}
                min={MIN_YEAR}
                max={CURRENT_YEAR_LOCAL}
                step={1}
                onChange={(e) => setYear(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-sm"
              />
            </div>
            <div>
              <label
                htmlFor="alt-amount"
                className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1"
              >
                Purchase amount (AUD)
              </label>
              <div className="flex items-center gap-2">
                <span className="text-slate-500">$</span>
                <input
                  id="alt-amount"
                  type="number"
                  value={amount}
                  min={0}
                  step={1000}
                  onChange={(e) => setAmount(e.target.value)}
                  className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-sm"
                />
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-600 mt-4">
            <strong>{years}</strong> year{years === 1 ? "" : "s"} of compound
            growth at <strong>{(selectedAsset.rate * 100).toFixed(1)}% p.a.</strong>
            {" "}({selectedAsset.shortLabel})
          </p>
        </div>
      </section>

      <section className="py-10 bg-white">
        <div className="container-custom max-w-5xl">
          <div className="bg-gradient-to-br from-slate-900 to-slate-700 text-white rounded-2xl p-6 md:p-8 mb-8">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-300 mb-2">
              Estimated current value — {selectedAsset.shortLabel}
            </p>
            <p className="text-3xl md:text-5xl font-extrabold mb-2 tracking-tight">
              {formatAud(selectedResult.currentValue)}
            </p>
            <p className="text-sm text-slate-300">
              {formatAud(principal)} invested in {yearNum}
              {totalGrowth >= 0 ? (
                <>
                  {" "}grew by <strong className="text-emerald-300">{formatAud(totalGrowth)}</strong>
                  {" "}({((totalGrowth / Math.max(principal, 1)) * 100).toFixed(0)}% total)
                </>
              ) : (
                <>
                  {" "}is worth less today
                </>
              )}
            </p>
          </div>

          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-2">
            Side-by-side comparison
          </h2>
          <p className="text-xs text-slate-500 mb-5">
            Same {formatAud(principal)} purchase in {yearNum} across all five
            asset classes, using historical annualised returns.
          </p>

          <div className="space-y-3">
            {results.map(({ asset, currentValue, barWidthPct, isSelected }) => (
              <div
                key={asset.key}
                className={`border rounded-xl p-4 ${
                  isSelected
                    ? "border-slate-400 bg-slate-50"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      {asset.shortLabel}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {(asset.rate * 100).toFixed(1)}% p.a. — {asset.source}
                    </p>
                  </div>
                  <p className="text-base md:text-lg font-extrabold text-slate-900 shrink-0">
                    {formatAud(currentValue)}
                  </p>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${asset.barColor} transition-all`}
                    style={{ width: `${Math.max(barWidthPct, 2)}%` }}
                    aria-hidden="true"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                  {asset.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-10 bg-slate-50 border-t border-slate-200">
        <div className="container-custom max-w-3xl">
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-5">
            Frequently asked questions
          </h2>
          <div className="space-y-4">
            <details className="bg-white border border-slate-200 rounded-xl p-4">
              <summary className="text-sm font-bold text-slate-900 cursor-pointer">
                Where do these return figures come from?
              </summary>
              <p className="text-xs text-slate-600 mt-3 leading-relaxed">
                Each asset class uses a published index: WatchCharts (luxury
                watches), HAGI Top Index (classic cars), Liv-ex Fine Wine 1000
                (wine), S&amp;P/ASX 200 Total Return (Australian shares), and
                CoreLogic Home Value Index (residential property). Numbers are
                long-run annualised averages and will diverge from any
                shorter-term snapshot.
              </p>
            </details>
            <details className="bg-white border border-slate-200 rounded-xl p-4">
              <summary className="text-sm font-bold text-slate-900 cursor-pointer">
                Why isn&apos;t my Rolex worth what the calculator says?
              </summary>
              <p className="text-xs text-slate-600 mt-3 leading-relaxed">
                Indices average across many references. A specific watch
                depends on the model, condition, box-and-papers, service
                history, and the cycle of the secondary market — which has
                been volatile since 2022. Most collectors realise meaningfully
                less than index returns once dealer margins, insurance, and
                opportunity cost of capital are deducted.
              </p>
            </details>
            <details className="bg-white border border-slate-200 rounded-xl p-4">
              <summary className="text-sm font-bold text-slate-900 cursor-pointer">
                Are tax, storage and insurance included?
              </summary>
              <p className="text-xs text-slate-600 mt-3 leading-relaxed">
                No. The figures are gross of capital gains tax (CGT applies to
                most of these as collectables or investments), storage,
                insurance, and any transaction costs. Real-world net returns
                are typically several percentage points lower than headline
                index returns.
              </p>
            </details>
            <details className="bg-white border border-slate-200 rounded-xl p-4">
              <summary className="text-sm font-bold text-slate-900 cursor-pointer">
                Should I put my super into watches or wine?
              </summary>
              <p className="text-xs text-slate-600 mt-3 leading-relaxed">
                Collectables held inside an SMSF are subject to strict storage,
                insurance and personal-use rules under SISA s62A. They cannot
                be displayed at a member&apos;s home or business. See our SMSF
                eligibility checker before considering any collectable in a
                fund. This is general information only — speak to an
                AFSL-licensed adviser.
              </p>
            </details>
          </div>
        </div>
      </section>

      <section className="py-10 bg-white border-t border-slate-200">
        <div className="container-custom max-w-3xl text-center">
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-2">
            Considering an alternative-asset allocation?
          </h2>
          <p className="text-sm text-slate-600 mb-5">
            Talk to a licensed adviser about how watches, wine, classic cars
            or property fit alongside listed equities in a diversified
            portfolio.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/advisors/wealth-managers"
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm px-5 py-2.5 rounded-lg"
            >
              Find a wealth manager
              <Icon name="arrow-right" size={14} />
            </Link>
            <Link
              href="/tools/smsf-checker"
              className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-900 font-bold text-sm px-5 py-2.5 rounded-lg"
            >
              SMSF eligibility checker
              <Icon name="arrow-right" size={14} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
