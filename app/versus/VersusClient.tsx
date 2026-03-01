"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import type { Broker } from "@/lib/types";
import { trackClick, getAffiliateLink, getBenefitCta, formatPercent, AFFILIATE_REL } from "@/lib/tracking";
import CompactDisclaimerLine from "@/components/CompactDisclaimerLine";
import StickyCTABar from "@/components/StickyCTABar";
import ScrollReveal from "@/components/ScrollReveal";
import { ADVERTISER_DISCLOSURE_SHORT } from "@/lib/compliance";
import Icon from "@/components/Icon";

const MAX_BROKERS = 4;

const popularComparisons = [
  { label: "Stake vs CommSec", href: "/versus/stake-vs-commsec" },
  { label: "CMC vs Moomoo", href: "/versus/cmc-markets-vs-moomoo" },
  { label: "Interactive Brokers vs Saxo", href: "/versus/interactive-brokers-vs-saxo" },
  { label: "Stake vs Moomoo", href: "/versus/stake-vs-moomoo" },
  { label: "SelfWealth vs CMC", href: "/versus/selfwealth-vs-cmc-markets" },
];

/** Parse slugs from a path like /versus/stake-vs-commsec */
function parseSlugsFromPath(pathname: string): string[] {
  const match = pathname.match(/^\/versus\/(.+)$/);
  if (!match) return [];
  return match[1].split("-vs-").filter(Boolean);
}

export default function VersusClient({ brokers }: { brokers: Broker[] }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Determine initial slugs from URL path (/versus/a-vs-b) or query params (?vs=a,b)
  const pathSlugs = parseSlugsFromPath(pathname);
  const urlVs = searchParams.get("vs");

  const deriveInitial = (): string[] => {
    if (pathSlugs.length >= 2) return pathSlugs.slice(0, MAX_BROKERS);
    if (urlVs) return urlVs.split(",").filter(Boolean).slice(0, MAX_BROKERS);
    return [];
  };

  const initial = deriveInitial();
  while (initial.length < 2) initial.push("");

  const [selectedSlugs, setSelectedSlugs] = useState<string[]>(initial);

  useEffect(() => {
    // Re-derive from path or query params on navigation
    const fromPath = parseSlugsFromPath(pathname);
    if (fromPath.length >= 2) {
      const slugs = fromPath.slice(0, MAX_BROKERS);
      while (slugs.length < 2) slugs.push("");
      setSelectedSlugs(slugs);
      return;
    }
    const vs = searchParams.get("vs");
    if (vs) {
      const slugs = vs.split(",").filter(Boolean).slice(0, MAX_BROKERS);
      while (slugs.length < 2) slugs.push("");
      setSelectedSlugs(slugs);
      return;
    }
    const a = searchParams.get("a");
    const b = searchParams.get("b");
    if (a || b) {
      setSelectedSlugs([a || "", b || ""]);
    }
  }, [searchParams, pathname]);

  function updateSlug(index: number, slug: string) {
    setSelectedSlugs(prev => {
      // Prevent selecting the same broker twice
      if (slug && prev.some((s, i) => i !== index && s === slug)) return prev;
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

  const selected: Broker[] = selectedSlugs
    .map(slug => brokers.find(br => br.slug === slug))
    .filter((br): br is Broker => !!br);

  const allSelected = selected.length >= 2;

  const overallWinner = useMemo(() => {
    if (selected.length < 2) return null;
    return selected.reduce((best, br) =>
      (br.rating ?? 0) > (best.rating ?? 0) ? br : best
    );
  }, [selected]);

  const featureRows = useMemo(() => {
    if (selected.length < 2) return [];
    return [
      { label: "ASX Brokerage", icon: "dollar-sign", key: "asx_fee" as const, values: selected.map(br => br.asx_fee || "N/A"), numValues: selected.map(br => br.asx_fee_value ?? 999), best: "low" as const },
      { label: "US Brokerage", icon: "globe", key: "us_fee" as const, values: selected.map(br => br.us_fee || "N/A"), numValues: selected.map(br => br.us_fee_value ?? 999), best: "low" as const },
      { label: "FX Rate", icon: "arrow-left-right", key: "fx_rate" as const, values: selected.map(br => br.fx_rate != null ? formatPercent(br.fx_rate) : "N/A"), numValues: selected.map(br => br.fx_rate ?? 999), best: "low" as const },
      { label: "CHESS Sponsored", icon: "shield-check", key: "chess" as const, values: selected.map(br => br.chess_sponsored ? "Yes" : "No"), numValues: selected.map(br => br.chess_sponsored ? 1 : 0), best: "high" as const },
      { label: "SMSF Support", icon: "building", key: "smsf" as const, values: selected.map(br => br.smsf_support ? "Yes" : "No"), numValues: selected.map(br => br.smsf_support ? 1 : 0), best: "high" as const },
      { label: "Inactivity Fee", icon: "pause-circle", key: "inactivity" as const, values: selected.map(br => br.inactivity_fee || "None"), numValues: selected.map(br => br.inactivity_fee ? 1 : 0), best: "low" as const },
      { label: "Our Rating", icon: "star", key: "rating" as const, values: selected.map(br => `${br.rating ?? "N/A"}/5`), numValues: selected.map(br => br.rating ?? 0), best: "high" as const },
    ];
  }, [selected]);

  function getBestIndex(numValues: number[], best: "low" | "high"): number {
    if (numValues.length === 0) return -1;
    const allSame = numValues.every(v => v === numValues[0]);
    if (allSame) return -1;
    if (best === "low") {
      const min = Math.min(...numValues);
      return numValues.indexOf(min);
    } else {
      const max = Math.max(...numValues);
      return numValues.indexOf(max);
    }
  }

  const verdicts = useMemo(() => {
    if (selected.length < 2) return [];
    const categories: { cat: string; icon: string; numValues: number[]; best: "low" | "high" }[] = [
      { cat: "Cheapest ASX Trading", icon: "coins", numValues: selected.map(br => br.asx_fee_value ?? 999), best: "low" },
      { cat: "Best for US Shares", icon: "globe", numValues: selected.map(br => br.fx_rate ?? 999), best: "low" },
      { cat: "Safety (CHESS)", icon: "shield-check", numValues: selected.map(br => br.chess_sponsored ? 1 : 0), best: "high" },
      { cat: "SMSF Support", icon: "building", numValues: selected.map(br => br.smsf_support ? 1 : 0), best: "high" },
    ];
    return categories.map(c => {
      const bestIdx = getBestIndex(c.numValues, c.best);
      return {
        cat: c.cat,
        icon: c.icon,
        winner: bestIdx >= 0 ? selected[bestIdx] : null,
        isTie: bestIdx < 0,
      };
    });
  }, [selected]);

  // Count category wins per broker
  const winCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    selected.forEach(br => { counts[br.slug] = 0; });
    verdicts.forEach(v => {
      if (v.winner) counts[v.winner.slug] = (counts[v.winner.slug] || 0) + 1;
    });
    return counts;
  }, [selected, verdicts]);

  const title = allSelected
    ? selected.map(br => br.name).join(" vs ")
    : "Broker vs Broker";

  const gridCols = selected.length <= 2
    ? "md:grid-cols-2"
    : selected.length === 3
      ? "sm:grid-cols-2 lg:grid-cols-3"
      : "sm:grid-cols-2 lg:grid-cols-4";

  return (
    <div className="pt-5 pb-8 md:py-12">
      <div className="container-custom max-w-5xl">
        {/* Breadcrumb */}
        <div className="text-[0.69rem] md:text-sm text-slate-500 mb-2 md:mb-6">
          <Link href="/" className="hover:text-brand">Home</Link>
          <span className="mx-1.5 md:mx-2">/</span>
          <Link href="/compare" className="hover:text-brand">Compare</Link>
          <span className="mx-1.5 md:mx-2">/</span>
          <span className="text-brand">{allSelected ? title : "Versus"}</span>
        </div>

        <h1 className="text-lg sm:text-3xl lg:text-4xl font-extrabold mb-0.5 md:mb-2 break-words">
          {allSelected ? `${title}: The Honest Truth (2026)` : "Broker vs Broker"}
        </h1>
        <p className="text-[0.69rem] md:text-base text-slate-600 mb-3 md:mb-8">
          {allSelected
            ? "Which broker actually deserves your money?"
            : "Select brokers to compare side by side."}
        </p>

        {/* ───── SELECTORS ───── */}
        <div className="bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-xl md:rounded-2xl p-3.5 md:p-8 mb-3 md:mb-8 shadow-sm">
          <div className="text-[0.62rem] md:text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 md:mb-4 flex items-center gap-2">
            <span>Select brokers to compare</span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>
          <div className="flex flex-col md:flex-row gap-2 md:gap-4 items-stretch md:items-end">
            {selectedSlugs.map((slug, index) => {
              const broker = brokers.find(br => br.slug === slug);
              return (
                <React.Fragment key={index}>
                  {/* VS divider — inline sibling */}
                  {index > 0 && (
                    <>
                      {/* Desktop VS */}
                      <div className="hidden md:flex flex-col items-center justify-end pb-3 shrink-0">
                        <div className="w-px h-6 bg-slate-200" />
                        <span className="w-9 h-9 rounded-full bg-slate-900 text-white text-[0.69rem] font-extrabold flex items-center justify-center shadow-md my-1">VS</span>
                        <div className="w-px h-6 bg-slate-200" />
                      </div>
                      {/* Mobile VS */}
                      <div className="md:hidden flex items-center gap-2 -my-0.5">
                        <div className="h-px flex-1 bg-slate-200" />
                        <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-[0.5rem] font-extrabold flex items-center justify-center">VS</span>
                        <div className="h-px flex-1 bg-slate-200" />
                      </div>
                    </>
                  )}

                  {/* Broker slot — mini-card */}
                  <div className="flex-1 min-w-0">
                    <div
                      className={`rounded-lg md:rounded-xl border p-2.5 md:p-3 transition-all ${
                        broker ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-50/50 border-dashed border-slate-300'
                      }`}
                      style={broker ? { borderLeftWidth: '3px', borderLeftColor: broker.color } : {}}
                    >
                      {/* Broker identity header — only when selected */}
                      {broker && (
                        <div className="flex items-center gap-2 mb-2">
                          <div
                            className="w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center text-[0.6rem] md:text-xs font-bold shrink-0"
                            style={{ background: `${broker.color}18`, color: broker.color }}
                          >
                            {broker.icon || broker.name.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-xs md:text-sm text-slate-900 truncate">{broker.name}</div>
                            <div className="text-[0.62rem] md:text-xs text-slate-400">
                              {broker.rating?.toFixed(1)}/5{broker.asx_fee ? ` \u00B7 ${broker.asx_fee}` : ''}
                            </div>
                          </div>
                          {selectedSlugs.length > 2 && (
                            <button
                              onClick={() => removeSlot(index)}
                              className="w-8 h-8 md:w-7 md:h-7 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                              title="Remove broker"
                            >
                              <svg className="w-3 h-3 md:w-3.5 md:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                        </div>
                      )}
                      {/* Select dropdown */}
                      <select
                        value={slug}
                        onChange={(e) => updateSlug(index, e.target.value)}
                        className="w-full border border-slate-200 rounded-lg py-2.5 md:py-2.5 px-2.5 md:px-3 min-h-[44px] text-xs md:text-sm font-medium bg-white hover:border-slate-300 focus:border-blue-700 focus:ring-1 focus:ring-blue-700 transition-colors"
                      >
                        <option value="">Choose a broker...</option>
                        {brokers.map(br => {
                          const alreadySelected = selectedSlugs.some((s, i) => i !== index && s === br.slug);
                          return (
                            <option key={br.slug} value={br.slug} disabled={alreadySelected}>
                              {br.name}{alreadySelected ? " (already selected)" : ""}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}

            {/* Add broker button */}
            {selectedSlugs.length < MAX_BROKERS && (
              <button
                onClick={addSlot}
                className="w-full md:w-auto px-4 py-2.5 md:px-5 md:py-4 border-2 border-dashed border-slate-200 rounded-lg md:rounded-xl text-slate-400 hover:border-slate-600 hover:text-slate-700 hover:bg-slate-50/30 text-xs md:text-sm font-semibold transition-all flex items-center justify-center gap-1.5 md:gap-2"
              >
                <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Broker
              </button>
            )}
          </div>
        </div>

        {/* ───── RESULTS ───── */}
        {allSelected && overallWinner && (
          <>
            {/* ─── Winner Banner ─── */}
            <div
              className="rounded-xl md:rounded-2xl p-4 md:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-3 md:gap-5 mb-1.5 md:mb-2 relative overflow-hidden result-card-in"
              style={{ background: `linear-gradient(135deg, ${overallWinner.color}ee, ${overallWinner.color}bb)` }}
            >
              {/* Subtle pattern */}
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
              <div className="relative flex items-center gap-3 md:gap-4 flex-1 min-w-0">
                <div
                  className="w-11 h-11 md:w-16 md:h-16 rounded-xl md:rounded-2xl flex items-center justify-center text-lg md:text-2xl font-extrabold shrink-0 shadow-lg"
                  style={{ background: 'rgba(255,255,255,0.25)', color: 'white' }}
                >
                  {overallWinner.icon || overallWinner.name.charAt(0)}
                </div>
                <div>
                  <div className="text-[0.56rem] md:text-[0.69rem] uppercase font-extrabold tracking-widest text-white/70 mb-0.5">Our Pick</div>
                  <div className="text-lg md:text-3xl font-extrabold text-white">{overallWinner.name}</div>
                  <div className="text-[0.69rem] md:text-sm text-white/80 mt-0.5">
                    {overallWinner.rating}/5 · Won {winCounts[overallWinner.slug] || 0}/{verdicts.length} categories
                  </div>
                </div>
              </div>
              <div className="relative flex flex-col items-stretch sm:items-end gap-2 w-full sm:w-auto">
                <a
                  href={getAffiliateLink(overallWinner)}
                  target="_blank"
                  rel={AFFILIATE_REL}
                  onClick={() => trackClick(overallWinner.slug, overallWinner.name, "versus-winner", "/versus", "versus")}
                  className="text-center px-5 py-2.5 md:px-7 md:py-3.5 bg-white font-bold rounded-lg md:rounded-xl hover:shadow-lg transition-all text-xs md:text-sm"
                  style={{ color: overallWinner.color }}
                >
                  {getBenefitCta(overallWinner, "versus")}
                </a>
              </div>
            </div>
            <p className="text-[0.62rem] md:text-[0.69rem] text-slate-500 mb-3 md:mb-8">{ADVERTISER_DISCLOSURE_SHORT}</p>

            {/* ─── Score Cards ─── */}
            <ScrollReveal animation="scroll-stagger-children" className={`grid grid-cols-2 ${gridCols} gap-2 md:gap-3 mb-3 md:mb-8`}>
              {selected.map(br => {
                const isWinner = br.slug === overallWinner?.slug;
                return (
                  <div
                    key={br.slug}
                    className={`relative rounded-xl md:rounded-2xl p-3 md:p-4 text-center transition-all ${isWinner ? 'shadow-md' : 'border border-slate-200'}`}
                    style={isWinner ? { outline: `2px solid ${br.color}`, outlineOffset: '-1px', background: `${br.color}08` } : {}}
                  >
                    {isWinner && (
                      <div className="absolute -top-2 md:-top-2.5 left-1/2 -translate-x-1/2">
                        <span className="px-2 py-px md:px-2.5 md:py-0.5 text-[0.56rem] md:text-[0.69rem] font-extrabold uppercase tracking-wider rounded-full text-white shadow-sm" style={{ background: br.color }}>
                          Winner
                        </span>
                      </div>
                    )}
                    <div
                      className="w-9 h-9 md:w-12 md:h-12 rounded-lg md:rounded-xl mx-auto mb-1.5 md:mb-2 flex items-center justify-center text-sm md:text-lg font-bold"
                      style={{ background: `${br.color}20`, color: br.color }}
                    >
                      {br.icon || br.name.charAt(0)}
                    </div>
                    <div className="font-bold text-xs md:text-sm mb-0.5">{br.name}</div>
                    <div className="text-base md:text-xl font-extrabold" style={{ color: br.color }}>{br.rating}/5</div>
                    <div className="text-[0.62rem] md:text-[0.69rem] text-slate-400 mt-0.5 md:mt-1">
                      {winCounts[br.slug] || 0} {(winCounts[br.slug] || 0) === 1 ? 'win' : 'wins'}
                    </div>
                  </div>
                );
              })}
            </ScrollReveal>

            {/* ─── Category Breakdown ─── */}
            <div className="mb-3 md:mb-8">
              <h2 className="text-base md:text-xl font-extrabold mb-2 md:mb-4">Category Breakdown</h2>
              <ScrollReveal animation="scroll-stagger-children" className="grid grid-cols-2 sm:grid-cols-2 gap-2 md:gap-3">
                {verdicts.map((v, i) => (
                  <div key={i} className="bg-white border border-slate-200 rounded-lg md:rounded-xl p-2.5 md:p-4 flex items-center gap-2 md:gap-3 hover:shadow-sm transition-shadow">
                    <Icon name={v.icon} size={16} className="text-slate-400 shrink-0 md:hidden" />
                    <Icon name={v.icon} size={20} className="text-slate-400 shrink-0 hidden md:block" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[0.56rem] md:text-xs font-semibold text-slate-400 uppercase tracking-wide">{v.cat}</div>
                      {v.isTie ? (
                        <div className="text-xs md:text-sm font-bold text-slate-500 mt-0.5">Tie</div>
                      ) : v.winner ? (
                        <div className="flex items-center gap-1.5 md:gap-2 mt-0.5">
                          <div
                            className="w-4 h-4 md:w-5 md:h-5 rounded flex items-center justify-center text-[0.45rem] md:text-[0.5rem] font-bold shrink-0"
                            style={{ background: `${v.winner.color}20`, color: v.winner.color }}
                          >
                            {v.winner.icon || v.winner.name.charAt(0)}
                          </div>
                          <span className="text-xs md:text-sm font-bold truncate" style={{ color: v.winner.color }}>{v.winner.name}</span>
                        </div>
                      ) : null}
                    </div>
                    {v.winner && (
                      <div className="w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center shrink-0 hidden md:flex" style={{ background: `${v.winner.color}15` }}>
                        <svg className="w-3 h-3 md:w-3.5 md:h-3.5" style={{ color: v.winner.color }} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                      </div>
                    )}
                  </div>
                ))}
              </ScrollReveal>
            </div>

            {/* ─── Head-to-Head Table ─── */}
            <div className="mb-3 md:mb-8">
              <h2 className="text-base md:text-xl font-extrabold mb-2 md:mb-4">Head-to-Head Comparison</h2>
              <ScrollReveal animation="scroll-fade-in" className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                <div className="bg-white border border-slate-200 rounded-xl md:rounded-2xl overflow-hidden min-w-[360px]">
                  {/* Broker headers */}
                  <div className="grid border-b border-slate-100" style={{ gridTemplateColumns: `110px repeat(${selected.length}, 1fr)` }}>
                    <div className="px-2.5 py-2.5 md:px-4 md:py-4 bg-slate-50" />
                    {selected.map(br => {
                      const isWinner = br.slug === overallWinner?.slug;
                      return (
                        <div key={br.slug} className={`px-2 py-2.5 md:px-4 md:py-4 text-center ${isWinner ? 'bg-emerald-50/50' : 'bg-slate-50'}`}>
                          <div
                            className="w-7 h-7 md:w-10 md:h-10 rounded-lg md:rounded-xl mx-auto mb-1 md:mb-2 flex items-center justify-center text-[0.6rem] md:text-sm font-bold"
                            style={{ background: `${br.color}20`, color: br.color }}
                          >
                            {br.icon || br.name.charAt(0)}
                          </div>
                          <div className="font-bold text-[0.69rem] md:text-sm">{br.name}</div>
                          {isWinner && <div className="text-[0.56rem] md:text-[0.69rem] font-extrabold text-emerald-600 uppercase tracking-wider mt-0.5">Winner</div>}
                        </div>
                      );
                    })}
                  </div>
                  {/* Feature rows */}
                  {featureRows.map((row, i) => {
                    const bestIdx = getBestIndex(row.numValues, row.best);
                    return (
                      <div
                        key={i}
                        className={`grid items-center ${i < featureRows.length - 1 ? 'border-b border-slate-100' : ''} hover:bg-slate-50/50 transition-colors stagger-item`}
                        style={{ gridTemplateColumns: `110px repeat(${selected.length}, 1fr)`, animationDelay: `${0.1 + i * 0.06}s` }}
                      >
                        <div className="px-2.5 py-2.5 md:px-4 md:py-3.5 flex items-center gap-1.5 md:gap-2">
                          <Icon name={row.icon} size={14} className="text-slate-400 shrink-0 md:hidden" />
                          <Icon name={row.icon} size={16} className="text-slate-400 shrink-0 hidden md:block" />
                          <span className="text-[0.69rem] md:text-sm font-medium text-slate-600">{row.label}</span>
                        </div>
                        {row.values.map((val, j) => (
                          <div
                            key={j}
                            className={`px-2 py-2.5 md:px-4 md:py-3.5 text-center text-[0.69rem] md:text-sm font-semibold ${
                              bestIdx === j ? 'text-emerald-700 bg-emerald-50/60' : 'text-slate-700'
                            }`}
                          >
                            {val}
                            {bestIdx === j && (
                              <span className="ml-1 md:ml-1.5 inline-flex items-center justify-center w-3.5 h-3.5 md:w-4 md:h-4 rounded-full bg-emerald-100">
                                <svg className="w-2 h-2 md:w-2.5 md:h-2.5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </ScrollReveal>
            </div>

            {/* ─── Pros & Cons ─── */}
            <div className="mb-3 md:mb-8">
              <h2 className="text-base md:text-xl font-extrabold mb-2 md:mb-4">Pros & Cons</h2>
              <ScrollReveal animation="scroll-stagger-children" className={`grid grid-cols-1 ${gridCols} gap-2.5 md:gap-4`}>
                {selected.map(br => {
                  const isWinner = br.slug === overallWinner?.slug;
                  return (
                    <div
                      key={br.slug}
                      className={`rounded-xl md:rounded-2xl overflow-hidden transition-shadow hover:shadow-md ${isWinner ? '' : 'border border-slate-200'}`}
                      style={isWinner ? { outline: `2px solid ${br.color}`, outlineOffset: '-1px' } : {}}
                    >
                      {/* Broker header */}
                      <div className="px-3 py-2.5 md:px-5 md:py-4 flex items-center gap-2.5 md:gap-3" style={{ background: `${br.color}10` }}>
                        <div
                          className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center text-xs md:text-sm font-bold shrink-0"
                          style={{ background: `${br.color}25`, color: br.color }}
                        >
                          {br.icon || br.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-xs md:text-sm break-words">{br.name}</h3>
                          <div className="text-[0.62rem] md:text-xs text-slate-500">{br.rating}/5 · {br.asx_fee}</div>
                        </div>
                        {isWinner && <span className="ml-auto px-1.5 py-px md:px-2 md:py-0.5 text-[0.56rem] md:text-[0.69rem] font-extrabold uppercase rounded-full text-white shrink-0" style={{ background: br.color }}>Winner</span>}
                      </div>
                      {/* Pros */}
                      <div className="px-3 py-2 md:px-5 md:py-3 border-b border-slate-100">
                        <h4 className="text-[0.56rem] md:text-[0.69rem] font-bold uppercase tracking-wider text-emerald-600 mb-1.5 md:mb-2 flex items-center gap-1">
                          <svg className="w-2.5 h-2.5 md:w-3 md:h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                          Pros
                        </h4>
                        <ul className="space-y-1 md:space-y-1.5">
                          {br.pros?.map((p, i) => (
                            <li key={i} className="flex items-start gap-1.5 md:gap-2 text-[0.69rem] md:text-xs text-slate-600 leading-relaxed">
                              <span className="text-emerald-500 shrink-0 mt-0.5">+</span> {p}
                            </li>
                          ))}
                        </ul>
                      </div>
                      {/* Cons */}
                      <div className="px-3 py-2 md:px-5 md:py-3">
                        <h4 className="text-[0.56rem] md:text-[0.69rem] font-bold uppercase tracking-wider text-red-500 mb-1.5 md:mb-2 flex items-center gap-1">
                          <svg className="w-2.5 h-2.5 md:w-3 md:h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                          Cons
                        </h4>
                        <ul className="space-y-1 md:space-y-1.5">
                          {br.cons?.map((c, i) => (
                            <li key={i} className="flex items-start gap-1.5 md:gap-2 text-[0.69rem] md:text-xs text-slate-600 leading-relaxed">
                              <span className="text-red-400 shrink-0 mt-0.5">-</span> {c}
                            </li>
                          ))}
                        </ul>
                      </div>
                      {/* CTA */}
                      <div className="px-3 pb-3 pt-0.5 md:px-5 md:pb-4 md:pt-1">
                        <a
                          href={getAffiliateLink(br)}
                          target="_blank"
                          rel={AFFILIATE_REL}
                          onClick={() => trackClick(br.slug, br.name, "versus-cta", "/versus", "versus")}
                          className="block w-full text-center px-3 py-2 md:px-4 md:py-2.5 text-white text-xs md:text-sm font-bold rounded-lg md:rounded-xl hover:shadow-md hover:scale-[1.01] transition-all active:scale-[0.99]"
                          style={{ background: br.color }}
                        >
                          {getBenefitCta(br, 'versus')}
                        </a>
                      </div>
                    </div>
                  );
                })}
              </ScrollReveal>
              <CompactDisclaimerLine />
            </div>

            {/* ─── Bottom CTA ─── */}
            <ScrollReveal animation="scroll-stagger-children" className="grid grid-cols-2 md:grid-cols-2 gap-2.5 md:gap-4 mb-3 md:mb-4">
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 rounded-xl md:rounded-2xl p-3.5 md:p-6">
                <Icon name="shuffle" size={18} className="text-slate-700 mb-1.5 md:hidden" />
                <Icon name="shuffle" size={24} className="text-slate-700 mb-2 hidden md:block" />
                <h2 className="text-xs md:text-lg font-extrabold text-slate-900 mb-0.5 md:mb-1">Thinking of switching?</h2>
                <p className="hidden md:block text-slate-600 mb-4 text-sm">Use our Switching Cost Simulator to see exactly how much you&apos;d save.</p>
                <Link href="/calculators?calc=switching" className="inline-block px-3 py-2 md:px-5 md:py-2.5 bg-slate-900 text-white font-semibold rounded-lg md:rounded-xl hover:bg-slate-800 transition-all text-[0.69rem] md:text-sm mt-1.5 md:mt-0">
                  Calculate Savings →
                </Link>
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl md:rounded-2xl p-3.5 md:p-6">
                <Icon name="target" size={18} className="text-amber-600 mb-1.5 md:hidden" />
                <Icon name="target" size={24} className="text-amber-600 mb-2 hidden md:block" />
                <h2 className="text-xs md:text-lg font-extrabold text-amber-900 mb-0.5 md:mb-1">Not sure which?</h2>
                <p className="hidden md:block text-slate-600 mb-4 text-sm">Answer 4 quick questions and we&apos;ll narrow it down for you.</p>
                <Link href="/quiz" className="inline-block px-3 py-2 md:px-5 md:py-2.5 bg-amber-500 text-white font-semibold rounded-lg md:rounded-xl hover:bg-amber-600 transition-colors text-[0.69rem] md:text-sm mt-1.5 md:mt-0">
                  Take the Quiz →
                </Link>
              </div>
            </ScrollReveal>

            <StickyCTABar broker={overallWinner} detail={`Winner: ${overallWinner.name} · ${overallWinner.rating}/5`} context="versus" />
          </>
        )}

        {/* ─── Empty State ─── */}
        {!allSelected && brokers.length > 0 && (
          <div className="text-center py-6 md:py-16">
            <Icon name="swords" size={32} className="text-slate-300 mx-auto mb-2 md:hidden" />
            <Icon name="swords" size={48} className="text-slate-300 mx-auto mb-4 hidden md:block" />
            <h2 className="text-base md:text-2xl font-extrabold mb-1 md:mb-2">Compare brokers head-to-head</h2>
            <p className="text-slate-500 text-[0.69rem] md:text-lg mb-1 md:mb-2">Select two brokers above to see fees, features & our verdict.</p>

            <div className="mt-4 md:mt-8">
              <p className="text-[0.62rem] md:text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 md:mb-3">Popular comparisons</p>
              <div className="flex flex-wrap justify-center gap-1.5 md:gap-2">
                {popularComparisons.map((c) => (
                  <Link
                    key={c.href}
                    href={c.href}
                    className="px-3 py-2 min-h-[44px] inline-flex items-center md:px-4 md:py-2.5 rounded-lg md:rounded-xl bg-white border border-slate-200 text-[0.69rem] md:text-sm font-medium text-slate-600 hover:border-slate-600 hover:text-slate-700 hover:bg-slate-50 hover:shadow-sm transition-all"
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
