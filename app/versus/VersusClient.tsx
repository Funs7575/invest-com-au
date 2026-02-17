"use client";

import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import type { Broker } from "@/lib/types";
import { trackClick, getAffiliateLink, getBenefitCta, formatPercent } from "@/lib/tracking";
import StickyCTABar from "@/components/StickyCTABar";
import { ADVERTISER_DISCLOSURE_SHORT } from "@/lib/compliance";

const MAX_BROKERS = 4;

const popularComparisons = [
  { label: "Stake vs CommSec", href: "/versus?vs=stake,commsec" },
  { label: "CMC vs Moomoo", href: "/versus?vs=cmc-markets,moomoo" },
  { label: "Interactive Brokers vs Saxo", href: "/versus?vs=interactive-brokers,saxo" },
];

export default function VersusClient({ brokers }: { brokers: Broker[] }) {
  const searchParams = useSearchParams();

  // Parse URL slugs on init
  const urlVs = searchParams.get("vs");
  const initialSlugs = urlVs
    ? urlVs.split(",").filter(Boolean).slice(0, MAX_BROKERS)
    : [];
  // Pad to at least 2 slots
  while (initialSlugs.length < 2) initialSlugs.push("");

  const [selectedSlugs, setSelectedSlugs] = useState<string[]>(initialSlugs);

  // Sync when URL changes (back/forward)
  useEffect(() => {
    const vs = searchParams.get("vs");
    if (vs) {
      const slugs = vs.split(",").filter(Boolean).slice(0, MAX_BROKERS);
      while (slugs.length < 2) slugs.push("");
      setSelectedSlugs(slugs);
    }
    // Legacy ?a=&b= support
    const a = searchParams.get("a");
    const b = searchParams.get("b");
    if (a || b) {
      setSelectedSlugs([a || "", b || ""]);
    }
  }, [searchParams]);

  function updateSlug(index: number, slug: string) {
    setSelectedSlugs(prev => {
      const next = [...prev];
      next[index] = slug;
      return next;
    });
  }

  function addSlot() {
    if (selectedSlugs.length < MAX_BROKERS) {
      setSelectedSlugs(prev => [...prev, ""]);
    }
  }

  function removeSlot(index: number) {
    if (selectedSlugs.length > 2) {
      setSelectedSlugs(prev => prev.filter((_, i) => i !== index));
    }
  }

  // Resolve slugs to broker objects
  const selected: Broker[] = selectedSlugs
    .map(slug => brokers.find(br => br.slug === slug))
    .filter((br): br is Broker => !!br);

  const allSelected = selected.length >= 2;

  // Find overall winner (highest rating, then most category wins)
  const overallWinner = useMemo(() => {
    if (selected.length < 2) return null;
    return selected.reduce((best, br) =>
      (br.rating ?? 0) > (best.rating ?? 0) ? br : best
    );
  }, [selected]);

  // Comparison rows
  const featureRows = useMemo(() => {
    if (selected.length < 2) return [];
    return [
      { label: "ASX Brokerage", key: "asx_fee" as const, values: selected.map(br => br.asx_fee || "N/A"), numValues: selected.map(br => br.asx_fee_value ?? 999), best: "low" as const },
      { label: "US Brokerage", key: "us_fee" as const, values: selected.map(br => br.us_fee || "N/A"), numValues: selected.map(br => br.us_fee_value ?? 999), best: "low" as const },
      { label: "FX Rate", key: "fx_rate" as const, values: selected.map(br => br.fx_rate != null ? formatPercent(br.fx_rate) : "N/A"), numValues: selected.map(br => br.fx_rate ?? 999), best: "low" as const },
      { label: "CHESS", key: "chess" as const, values: selected.map(br => br.chess_sponsored ? "Yes" : "No"), numValues: selected.map(br => br.chess_sponsored ? 1 : 0), best: "high" as const },
      { label: "SMSF", key: "smsf" as const, values: selected.map(br => br.smsf_support ? "Yes" : "No"), numValues: selected.map(br => br.smsf_support ? 1 : 0), best: "high" as const },
      { label: "Inactivity Fee", key: "inactivity" as const, values: selected.map(br => br.inactivity_fee || "None"), numValues: selected.map(br => br.inactivity_fee ? 1 : 0), best: "low" as const },
      { label: "Rating", key: "rating" as const, values: selected.map(br => `${br.rating ?? "N/A"}/5`), numValues: selected.map(br => br.rating ?? 0), best: "high" as const },
    ];
  }, [selected]);

  // Find the best value index for each row
  function getBestIndex(numValues: number[], best: "low" | "high"): number {
    if (numValues.length === 0) return -1;
    const allSame = numValues.every(v => v === numValues[0]);
    if (allSame) return -1; // Tie
    if (best === "low") {
      const min = Math.min(...numValues);
      return numValues.indexOf(min);
    } else {
      const max = Math.max(...numValues);
      return numValues.indexOf(max);
    }
  }

  // Category verdicts
  const verdicts = useMemo(() => {
    if (selected.length < 2) return [];
    const categories: { cat: string; numValues: number[]; best: "low" | "high" }[] = [
      { cat: "Cheapest ASX Trading", numValues: selected.map(br => br.asx_fee_value ?? 999), best: "low" },
      { cat: "Best for US Shares", numValues: selected.map(br => br.fx_rate ?? 999), best: "low" },
      { cat: "Safety (CHESS)", numValues: selected.map(br => br.chess_sponsored ? 1 : 0), best: "high" },
      { cat: "SMSF Support", numValues: selected.map(br => br.smsf_support ? 1 : 0), best: "high" },
    ];
    return categories.map(c => {
      const bestIdx = getBestIndex(c.numValues, c.best);
      return {
        cat: c.cat,
        winner: bestIdx >= 0 ? selected[bestIdx].name : "Tie",
      };
    });
  }, [selected]);

  // Title and breadcrumb
  const title = allSelected
    ? selected.map(br => br.name).join(" vs ")
    : "Broker vs Broker";

  const gridCols = selected.length <= 2 ? "md:grid-cols-2" : selected.length === 3 ? "md:grid-cols-3" : "md:grid-cols-4";

  return (
    <div className="py-12">
      <div className="container-custom max-w-5xl">
        {/* Breadcrumb */}
        <div className="text-sm text-slate-500 mb-6">
          <Link href="/" className="hover:text-brand">Home</Link>
          <span className="mx-2">/</span>
          <Link href="/compare" className="hover:text-brand">Compare</Link>
          <span className="mx-2">/</span>
          <span className="text-brand">{allSelected ? title : "Versus"}</span>
        </div>

        <h1 className="text-3xl md:text-4xl font-extrabold mb-2">
          {allSelected ? `${title}: The Honest Truth (2026)` : "Broker vs Broker"}
        </h1>
        <p className="text-slate-600 mb-8">
          {allSelected
            ? "A no-nonsense comparison. Which broker actually deserves your money?"
            : "Select brokers to compare them side by side."}
        </p>

        {/* Selectors */}
        <div className="flex flex-col md:flex-row gap-3 mb-8 items-end flex-wrap">
          {selectedSlugs.map((slug, index) => (
            <div key={index} className="flex-1 min-w-[180px] relative">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Broker {index + 1}
              </label>
              <div className="flex gap-1">
                <select
                  value={slug}
                  onChange={(e) => updateSlug(index, e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-4 py-3 text-brand bg-white"
                >
                  <option value="">Select a broker...</option>
                  {brokers.map(br => (
                    <option key={br.slug} value={br.slug}>{br.name}</option>
                  ))}
                </select>
                {selectedSlugs.length > 2 && (
                  <button
                    onClick={() => removeSlot(index)}
                    className="px-2 text-slate-400 hover:text-red-500 text-lg font-bold shrink-0"
                    title="Remove"
                  >
                    &times;
                  </button>
                )}
              </div>
              {index < selectedSlugs.length - 1 && (
                <div className="hidden md:flex absolute -right-4 top-1/2 translate-y-1 z-10">
                  <span className="text-lg font-bold text-slate-300">VS</span>
                </div>
              )}
            </div>
          ))}
          {selectedSlugs.length < MAX_BROKERS && (
            <button
              onClick={addSlot}
              className="px-4 py-3 border-2 border-dashed border-slate-300 rounded-lg text-slate-400 hover:border-green-600 hover:text-green-600 text-sm font-semibold transition-colors min-w-[140px]"
            >
              + Add Broker
            </button>
          )}
        </div>

        {/* Results */}
        {allSelected && overallWinner && (
          <>
            {/* Winner Banner */}
            <div className="rounded-xl p-5 flex items-center gap-4 flex-wrap mb-2" style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center text-lg font-extrabold shrink-0"
                style={{ background: `${overallWinner.color}30` }}
              >
                {overallWinner.icon || overallWinner.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-[200px]">
                <div className="text-[0.6rem] uppercase font-extrabold tracking-wider opacity-70">Our Pick</div>
                <div className="text-xl font-extrabold">{overallWinner.name}</div>
                <div className="text-sm opacity-80">
                  Highest rated at {overallWinner.rating}/5 among {selected.length} brokers compared.{" "}
                  {overallWinner.chess_sponsored ? "CHESS sponsored for safety." : "Lower fees make up for custodial model."}
                </div>
              </div>
              <a
                href={getAffiliateLink(overallWinner)}
                target="_blank"
                rel="noopener noreferrer nofollow"
                onClick={() => trackClick(overallWinner.slug, overallWinner.name, "versus-winner", "/versus", "versus")}
                className="shrink-0 px-6 py-3 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800 transition-colors"
              >
                {getBenefitCta(overallWinner, "versus")}
              </a>
            </div>
            <p className="text-xs text-slate-400 mb-6">
              {ADVERTISER_DISCLOSURE_SHORT}
            </p>

            {/* Category Breakdown */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 mb-8">
              <h2 className="font-extrabold text-lg mb-4">Category Breakdown</h2>
              <div className="space-y-3">
                {verdicts.map((v, i) => (
                  <div key={i} className="flex items-start gap-4 pb-3 border-b border-slate-100 last:border-b-0 last:pb-0">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wide w-32 shrink-0 pt-0.5">{v.cat}</span>
                    <span className="font-bold text-sm text-green-700">{v.winner}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Head-to-Head Table */}
            <h2 className="text-xl font-extrabold mb-3">Head-to-Head Comparison</h2>
            <div className="overflow-x-auto mb-8">
              <table className="w-full border border-slate-200 rounded-lg">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Feature</th>
                    {selected.map(br => (
                      <th key={br.slug} className="px-4 py-3 text-center text-sm font-bold">{br.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {featureRows.map((row, i) => {
                    const bestIdx = getBestIndex(row.numValues, row.best);
                    return (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm font-medium text-slate-600">{row.label}</td>
                        {row.values.map((val, j) => (
                          <td
                            key={j}
                            className={`px-4 py-3 text-sm text-center font-semibold ${
                              bestIdx === j ? "text-green-700 bg-green-50" : ""
                            }`}
                          >
                            {val}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pros/Cons Grid */}
            <h2 className="text-xl font-extrabold mb-3">Pros &amp; Cons</h2>
            <div className={`grid grid-cols-1 ${gridCols} gap-6 mb-8`}>
              {selected.map(br => (
                <div key={br.slug} className="border border-slate-200 rounded-xl p-4">
                  <h3 className="text-lg font-bold mb-3">{br.name}</h3>
                  <div className="mb-3">
                    <h4 className="text-xs font-semibold text-green-700 mb-2">Pros</h4>
                    <ul className="space-y-1">
                      {br.pros?.map((p, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                          <span className="text-green-600 shrink-0">+</span> {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="mb-4">
                    <h4 className="text-xs font-semibold text-red-700 mb-2">Cons</h4>
                    <ul className="space-y-1">
                      {br.cons?.map((c, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                          <span className="text-red-600 shrink-0">-</span> {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <a
                    href={getAffiliateLink(br)}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    onClick={() => trackClick(br.slug, br.name, "versus-cta", "/versus", "versus")}
                    className="inline-block w-full text-center px-4 py-2 bg-green-700 text-white text-sm font-semibold rounded-lg hover:bg-green-800 transition-colors"
                  >
                    {br.cta_text || `Visit ${br.name}`}
                  </a>
                </div>
              ))}
            </div>

            {/* Bottom CTA */}
            <div className="bg-slate-50 rounded-xl p-6 text-center">
              <h2 className="text-lg font-extrabold mb-2">Still not sure?</h2>
              <p className="text-slate-600 mb-4 text-sm">Use our Switching Cost Simulator to see exactly how much you&apos;d save.</p>
              <Link href="/calculators?calc=switching" className="inline-block px-6 py-3 bg-green-700 text-white font-semibold rounded-lg hover:bg-green-800 transition-colors">
                Calculate Your Savings
              </Link>
            </div>

            <StickyCTABar broker={overallWinner} detail={`Winner: ${overallWinner.name} · ${overallWinner.rating}/5`} context="versus" />
          </>
        )}

        {!allSelected && brokers.length > 0 && (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">&#x2694;&#xFE0F;</div>
            <p className="text-slate-500 text-lg mb-2">Select at least two brokers above to compare them side by side.</p>
            <p className="text-slate-400 text-sm mb-6">See fees, features, and our honest verdict in seconds.</p>

            <div className="mt-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">Popular comparisons</p>
              <div className="flex flex-wrap justify-center gap-3">
                {popularComparisons.map((c) => (
                  <Link
                    key={c.href}
                    href={c.href}
                    className="px-4 py-2 rounded-full border border-slate-200 text-sm font-medium text-slate-600 hover:border-green-700 hover:text-green-700 hover:bg-green-50 transition-all"
                  >
                    {c.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
