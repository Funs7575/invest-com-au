"use client";

/**
 * PresetCompareClient — interactive delta view for a scenario comparison preset.
 *
 * Displays two pre-computed scenarios (A and B) side-by-side with:
 *   - Per-metric absolute delta (A − B) and percentage delta.
 *   - Neutral "larger / smaller / equal" size indicator (NOT "better/worse").
 *   - Property / CGT dimension when the preset includes property inputs.
 *
 * AFSL compliance: GENERAL_ADVICE_WARNING is shown prominently.
 * No personalised recommendations are produced.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import { formatCurrency } from "@/lib/utils";
import { computeScenario } from "@/lib/scenario-engine";
import { computeScenarioDelta, type DeltaRow } from "@/lib/scenario-delta";
import { allPresetMeta, type ScenarioPreset } from "@/lib/scenario-presets";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatValue(value: number, format: DeltaRow["format"]): string {
  switch (format) {
    case "currency":
      return formatCurrency(value);
    case "years":
      return `${Math.round(value)} yrs`;
    case "percentage":
      return `${value.toFixed(1)}%`;
    case "boolean":
      return value ? "Yes" : "No";
    default:
      return String(value);
  }
}

function formatDelta(delta: number, pct: number | null, format: DeltaRow["format"]): string {
  const sign = delta > 0 ? "+" : "";
  const absFormatted =
    format === "currency"
      ? formatCurrency(Math.abs(delta))
      : format === "years"
        ? `${Math.abs(Math.round(delta))} yrs`
        : format === "percentage"
          ? `${Math.abs(delta).toFixed(1)}%`
          : String(Math.abs(delta));

  const pctStr = pct !== null ? ` (${sign}${pct.toFixed(1)}%)` : "";
  return `${sign}${absFormatted}${pctStr}`;
}

// ─── Category labels ──────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<DeltaRow["category"], string> = {
  retirement: "Retirement Projection",
  super: "Super Contributions",
  investmentTax: "Investment Income Tax",
  property: "Property / CGT Projection",
};

// ─── Size indicator badge ─────────────────────────────────────────────────────

function SizeBadge({ size }: { size: DeltaRow["sizeA"] }) {
  if (size === "equal") {
    return (
      <span className="inline-block text-[0.6rem] font-bold uppercase tracking-wide bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
        Equal
      </span>
    );
  }
  return (
    <span
      className={`inline-block text-[0.6rem] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${
        size === "larger"
          ? "bg-sky-50 text-sky-700"
          : "bg-orange-50 text-orange-700"
      }`}
    >
      A {size}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PresetCompareClient({
  preset,
}: {
  preset: ScenarioPreset;
}) {
  const [activeCategory, setActiveCategory] = useState<DeltaRow["category"] | "all">("all");

  const resultA = useMemo(() => computeScenario(preset.a.inputs), [preset.a.inputs]);
  const resultB = useMemo(() => computeScenario(preset.b.inputs), [preset.b.inputs]);
  const deltas = useMemo(() => computeScenarioDelta(resultA, resultB), [resultA, resultB]);

  const categories = useMemo(
    () =>
      [...new Set(deltas.map((d) => d.category))].filter(
        (c): c is DeltaRow["category"] => true,
      ),
    [deltas],
  );

  const visibleDeltas =
    activeCategory === "all"
      ? deltas
      : deltas.filter((d) => d.category === activeCategory);

  const otherPresets = useMemo(
    () => allPresetMeta().filter((p) => p.slug !== preset.slug),
    [preset.slug],
  );

  return (
    <div className="py-0">
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-violet-700 via-violet-800 to-violet-900 text-white py-8 md:py-14 px-4">
        <div className="container-custom max-w-4xl text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-violet-300 mb-2">
            Scenario Comparison
          </p>
          <h1 className="text-xl md:text-3xl font-extrabold mb-3">
            {preset.title}
          </h1>
          <p className="text-sm md:text-base text-violet-100 max-w-2xl mx-auto leading-relaxed">
            {preset.summary}
          </p>
          <p className="text-[0.7rem] text-violet-300 mt-3 max-w-xl mx-auto">
            General information only — not personal advice. See disclaimer below.
          </p>
        </div>
      </div>

      <div className="container-custom max-w-5xl py-6 md:py-10 space-y-6">
        {/* ── Scenario summary cards ───────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { label: preset.a.label, desc: preset.a.description, result: resultA, id: "scenario-a" },
            { label: preset.b.label, desc: preset.b.description, result: resultB, id: "scenario-b" },
          ].map(({ label, desc, result, id }) => (
            <div
              key={id}
              id={id}
              className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3"
            >
              <div>
                <p className="text-sm font-extrabold text-violet-700">{label}</p>
                <p className="text-xs text-slate-500 mt-0.5 leading-snug">{desc}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <p className="text-[0.6rem] text-slate-500 font-semibold uppercase tracking-wide">
                    Super at retirement
                  </p>
                  <p className="text-sm font-black text-violet-700 mt-0.5">
                    {formatCurrency(result.retirement.projectedSuperAtRetirement)}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <p className="text-[0.6rem] text-slate-500 font-semibold uppercase tracking-wide">
                    Drawdown years
                  </p>
                  <p className="text-sm font-black text-slate-800 mt-0.5">
                    {result.retirement.drawdownYears} yrs
                  </p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <p className="text-[0.6rem] text-slate-500 font-semibold uppercase tracking-wide">
                    Super tax saving p.a.
                  </p>
                  <p className="text-sm font-black text-emerald-700 mt-0.5">
                    {formatCurrency(result.superContributions.taxSavingOnExtraContribs)}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <p className="text-[0.6rem] text-slate-500 font-semibold uppercase tracking-wide">
                    Investment tax p.a.
                  </p>
                  <p className="text-sm font-black text-amber-700 mt-0.5">
                    {formatCurrency(result.investmentTax.taxOnInvestmentIncome)}
                  </p>
                </div>
                {result.property.hasProperty && (
                  <>
                    <div className="bg-sky-50 rounded-xl p-3 text-center col-span-2">
                      <p className="text-[0.6rem] text-slate-500 font-semibold uppercase tracking-wide">
                        Property value at retirement
                      </p>
                      <p className="text-sm font-black text-sky-700 mt-0.5">
                        {formatCurrency(result.property.projectedPropertyValue)}
                      </p>
                    </div>
                    <div className="bg-sky-50 rounded-xl p-3 text-center">
                      <p className="text-[0.6rem] text-slate-500 font-semibold uppercase tracking-wide">
                        CGT (with discount)
                      </p>
                      <p className="text-sm font-black text-orange-700 mt-0.5">
                        {formatCurrency(result.property.cgt.taxWithDiscount)}
                      </p>
                    </div>
                    <div className="bg-sky-50 rounded-xl p-3 text-center">
                      <p className="text-[0.6rem] text-slate-500 font-semibold uppercase tracking-wide">
                        Net equity after CGT
                      </p>
                      <p className="text-sm font-black text-sky-800 mt-0.5">
                        {formatCurrency(result.property.netEquityAfterCgt)}
                      </p>
                    </div>
                  </>
                )}
              </div>
              {result.retirement.isOnTrack ? (
                <p className="text-xs text-emerald-600 font-semibold">
                  Projected to meet 4% rule target
                </p>
              ) : (
                <p className="text-xs text-amber-600 font-semibold">
                  Projected gap: {formatCurrency(Math.abs(result.retirement.gapToTarget))}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* ── Category filter ────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCategory("all")}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
              activeCategory === "all"
                ? "bg-violet-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            All metrics
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                activeCategory === cat
                  ? "bg-violet-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        {/* ── Delta table ───────────────────────────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] bg-violet-600 text-white text-[0.65rem] font-bold">
            <div className="px-4 py-3">Metric</div>
            <div className="px-3 py-3 text-right border-l border-violet-500">
              {preset.a.label.split(" ")[0]}
            </div>
            <div className="px-3 py-3 text-right border-l border-violet-500">
              {preset.b.label.split(" ")[0]}
            </div>
            <div className="px-3 py-3 text-right border-l border-violet-500">
              A − B (delta)
            </div>
            <div className="px-3 py-3 text-center border-l border-violet-500">
              Size (A vs B)
            </div>
          </div>

          {/* Category grouping */}
          {(activeCategory === "all" ? categories : [activeCategory]).map((cat) => {
            const catRows = visibleDeltas.filter((d) => d.category === cat);
            if (catRows.length === 0) return null;
            return (
              <div key={cat}>
                <div className="px-4 py-2 bg-slate-50 border-b border-slate-100">
                  <p className="text-[0.6rem] font-bold text-slate-600 uppercase tracking-widest">
                    {CATEGORY_LABELS[cat]}
                  </p>
                </div>
                {catRows.map((d, i) => (
                  <div
                    key={d.metric}
                    className={`grid grid-cols-[2fr_1fr_1fr_1fr_1fr] text-xs border-b border-slate-100 last:border-b-0 ${
                      i % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                    }`}
                  >
                    {/* Metric name */}
                    <div className="px-4 py-2.5 text-slate-600 font-medium">
                      {d.metric}
                    </div>

                    {/* Value A */}
                    <div className="px-3 py-2.5 text-right font-semibold text-slate-800 border-l border-slate-100">
                      {formatValue(d.valueA, d.format)}
                    </div>

                    {/* Value B */}
                    <div className="px-3 py-2.5 text-right font-semibold text-slate-800 border-l border-slate-100">
                      {formatValue(d.valueB, d.format)}
                    </div>

                    {/* Delta */}
                    <div
                      className={`px-3 py-2.5 text-right font-semibold border-l border-slate-100 ${
                        Math.abs(d.absoluteDelta) < 0.005
                          ? "text-slate-400"
                          : d.absoluteDelta > 0
                            ? "text-sky-700"
                            : "text-orange-700"
                      }`}
                    >
                      {Math.abs(d.absoluteDelta) < 0.005
                        ? "—"
                        : formatDelta(d.absoluteDelta, d.pctDelta, d.format)}
                    </div>

                    {/* Size indicator */}
                    <div className="px-3 py-2.5 text-center border-l border-slate-100">
                      <SizeBadge size={d.sizeA} />
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {/* ── Highlights callout ────────────────────────────────────────── */}
        {preset.highlights.length > 0 && (
          <div className="bg-violet-50 border border-violet-200 rounded-2xl p-4">
            <p className="text-xs font-bold text-violet-800 mb-1">
              Key metrics illustrated by this comparison
            </p>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {preset.highlights.map((h) => (
                <span
                  key={h}
                  className="text-[0.65rem] font-semibold bg-violet-100 text-violet-700 px-2.5 py-0.5 rounded-full"
                >
                  {h}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── Other presets ─────────────────────────────────────────────── */}
        {otherPresets.length > 0 && (
          <div>
            <p className="text-xs font-bold text-slate-700 mb-2">
              Other scenario comparisons
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {otherPresets.map((p) => (
                <Link
                  key={p.slug}
                  href={`/scenarios/compare/${p.slug}`}
                  className="flex items-start gap-2 bg-white border border-slate-200 rounded-xl p-4 hover:border-violet-300 hover:shadow-sm transition-all group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 group-hover:text-violet-700 transition-colors leading-snug">
                      {p.title}
                    </p>
                    <p className="text-[0.65rem] text-slate-400 mt-0.5 line-clamp-2 leading-snug">
                      {p.summary.slice(0, 100)}…
                    </p>
                  </div>
                  <span className="text-slate-300 group-hover:text-violet-400 transition-colors shrink-0 mt-0.5">
                    →
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── CTA: open in full planner ──────────────────────────────────── */}
        <div className="bg-violet-50 border border-violet-200 rounded-2xl p-5 text-center">
          <p className="text-sm font-bold text-violet-800 mb-1">
            Customise these numbers for your situation
          </p>
          <p className="text-xs text-violet-600 mb-3">
            Open the full Scenario Planner, enter your own salary, super balance,
            and investment details, and save up to 3 personal scenarios to compare.
          </p>
          <Link
            href="/scenarios/plan"
            className="inline-block px-5 py-2.5 bg-violet-600 text-white text-sm font-bold rounded-xl hover:bg-violet-700 transition-all"
          >
            Open Scenario Planner →
          </Link>
        </div>

        {/* ── General advice warning ─────────────────────────────────────── */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
          <p className="text-[0.65rem] text-slate-500 leading-relaxed">
            {GENERAL_ADVICE_WARNING}
          </p>
          <p className="text-[0.65rem] text-slate-400 mt-2 leading-relaxed">
            Projections use FY2026 tax rates and the nominal rates stated in each
            scenario assumption. Actual outcomes depend on investment returns,
            future tax-law changes, your personal circumstances, and factors not
            modelled here (Age Pension, LITO, HELP/HECS, mortgage costs, stamp
            duty, depreciation, vacancy rates). Contribution caps quoted are for
            FY2026 — verify with the ATO before acting. The size indicator
            (&quot;larger&quot; / &quot;smaller&quot;) is factual and neutral — it is not advice
            about which scenario is preferable for your situation.
          </p>
        </div>

        {/* ── Cross-links ────────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-2">
          <Link
            href="/scenarios/plan"
            className="text-xs px-3 py-1.5 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200"
          >
            Scenario Planner →
          </Link>
          <Link
            href="/retirement-calculator"
            className="text-xs px-3 py-1.5 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200"
          >
            Retirement Calculator →
          </Link>
          <Link
            href="/super-contributions-calculator"
            className="text-xs px-3 py-1.5 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200"
          >
            Super Contributions Calculator →
          </Link>
          <Link
            href="/cgt-calculator"
            className="text-xs px-3 py-1.5 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200"
          >
            CGT Calculator →
          </Link>
          <Link
            href="/find-advisor"
            className="text-xs px-3 py-1.5 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200"
          >
            Find an Adviser →
          </Link>
        </div>
      </div>
    </div>
  );
}
