"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Link from "next/link";
import type { Broker } from "@/lib/types";
import { useSearchParams } from "next/navigation";
import AuthorByline from "@/components/AuthorByline";
import Icon from "@/components/Icon";
import AdSlot from "@/components/AdSlot";

import TradeCostCalculator from "./_components/TradeCostCalculator";
import FrankingCalculator from "./_components/FrankingCalculator";
import SwitchingCostCalculator from "./_components/SwitchingCostCalculator";
import FxFeeCalculator from "./_components/FxFeeCalculator";
import CgtCalculator from "./_components/CgtCalculator";
import ChessLookup from "./_components/ChessLookup";
import FeeImpactTeaser from "./_components/FeeImpactTeaser";
import InlinePortfolioCalc from "./_components/InlinePortfolioCalc";
import InlineSwitchingCalc from "./_components/InlineSwitchingCalc";
import InlineSavingsCalc from "./_components/InlineSavingsCalc";
import TotalCostCalculator from "./_components/TotalCostCalculator";
import CompoundInterestCalculator from "./_components/CompoundInterestCalculator";
import DividendReinvestmentCalculator from "./_components/DividendReinvestmentCalculator";
import FireCalculator from "./_components/FireCalculator";
import PropertyVsSharesCalculator from "./_components/PropertyVsSharesCalculator";

/* ──────────────────────────────────────────────
   Types & constants
   ────────────────────────────────────────────── */
interface Props { brokers: Broker[] }
type CalcId = "trade-cost" | "fx" | "switching" | "cgt" | "franking" | "chess" | "fee-impact" | "portfolio" | "switch-calc" | "savings-calc" | "tco" | "compound-interest" | "dividend-reinvestment" | "fire" | "property-vs-shares" | "mortgage" | "debt" | "retirement" | "property-yield" | "smsf" | "super-contributions" | "portfolio-xray" | "tax-optimizer" | "fee-simulator" | "quick-audit";

const CALCS: { id: CalcId; icon: string; title: string; subtitle: string; badge?: string; href?: string }[] = [
  { id: "quick-audit" as CalcId, icon: "search", title: "Quick Audit", subtitle: "30-second fee audit & savings check", href: "/quick-audit", badge: "NEW" },
  { id: "tco", icon: "receipt", title: "Yearly TCO", subtitle: "Total annual cost across all your trades", badge: "NEW" },
  { id: "trade-cost", icon: "dollar-sign", title: "Trade Cost", subtitle: "What does a trade really cost at each platform?" },
  { id: "fx", icon: "globe", title: "US Share Costs", subtitle: "What do international trades really cost?" },
  { id: "switching", icon: "arrow-right-left", title: "Compare Fees", subtitle: "Is it worth switching platforms?" },
  { id: "cgt", icon: "calendar", title: "Tax on Profits", subtitle: "Estimate capital gains tax" },
  { id: "franking", icon: "coins", title: "Dividend Tax", subtitle: "Franking credits after tax" },
  { id: "chess", icon: "shield-check", title: "Share Safety", subtitle: "Is your platform CHESS sponsored?" },
  { id: "fee-impact", icon: "calculator", title: "Fee Impact", subtitle: "Your total annual platform fees" },
  { id: "portfolio" as CalcId, icon: "briefcase", title: "Portfolio Fees", subtitle: "Exact cost at every broker" },
  { id: "switch-calc" as CalcId, icon: "arrow-right-left", title: "Switching Calculator", subtitle: "How much could you save?" },
  { id: "savings-calc" as CalcId, icon: "piggy-bank", title: "Savings Calculator", subtitle: "Are you earning enough?" },
  { id: "compound-interest" as CalcId, icon: "trending-up", title: "Compound Interest", subtitle: "Project your investment growth" },
  { id: "dividend-reinvestment" as CalcId, icon: "rotate-ccw", title: "Dividend Reinvestment", subtitle: "DRP vs cash dividends" },
  { id: "fire" as CalcId, icon: "flame", title: "FIRE Calculator", subtitle: "Financial independence number" },
  { id: "property-vs-shares" as CalcId, icon: "scale", title: "Property vs Shares", subtitle: "Compare investment returns" },
  { id: "mortgage" as CalcId, icon: "home", title: "Mortgage Calculator", subtitle: "Monthly repayments & total interest", href: "/mortgage-calculator" },
  { id: "debt" as CalcId, icon: "credit-card", title: "Debt Consolidation", subtitle: "Could consolidating save you money?", href: "/debt-calculator" },
  { id: "retirement" as CalcId, icon: "umbrella", title: "Retirement Calculator", subtitle: "Project your super to retirement", href: "/retirement-calculator" },
  { id: "property-yield" as CalcId, icon: "percent", title: "Property Yield", subtitle: "Gross & net rental yield", href: "/property-yield-calculator" },
  { id: "smsf" as CalcId, icon: "landmark", title: "SMSF Calculator", subtitle: "Is self-managed super worth it?", href: "/smsf-calculator" },
  { id: "super-contributions" as CalcId, icon: "wallet", title: "Super Contributions", subtitle: "Concessional caps & tax savings", href: "/super-contributions-calculator" },
  { id: "portfolio-xray" as CalcId, icon: "pie-chart", title: "Portfolio X-Ray", subtitle: "Diversification, risk & fee analysis", href: "/portfolio-xray", badge: "NEW" },
  { id: "tax-optimizer" as CalcId, icon: "calculator", title: "Tax Optimizer", subtitle: "CGT, harvesting & franking credits", href: "/tax-optimizer", badge: "NEW" },
  { id: "fee-simulator" as CalcId, icon: "sliders", title: "Fee Simulator", subtitle: "Real-time fees across all brokers", href: "/fee-simulator", badge: "NEW" },
];

// Inline-only calcs (no href) for swipe navigation
const INLINE_CALC_IDS: CalcId[] = CALCS.filter(c => !c.href).map(c => c.id);

// Calcs that have a dedicated standalone page
const STANDALONE_URLS: Partial<Record<CalcId, string>> = {
  "tco": "/tco-calculator",
  "compound-interest": "/compound-interest-calculator",
  "dividend-reinvestment": "/dividend-reinvestment-calculator",
  "fire": "/fire-calculator",
  "property-vs-shares": "/property-vs-shares-calculator",
};

/* ──────────────────────────────────────────────
   Root component
   ────────────────────────────────────────────── */
export default function CalculatorsClient({ brokers }: Props) {
  const searchParams = useSearchParams();
  const initialCalc = searchParams.get("calc") as CalcId | null;
  const hasScrolled = useRef(false);
  const [activeCalc, setActiveCalc] = useState<CalcId>(initialCalc || "tco");
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const pillScrollRef = useRef<HTMLDivElement>(null);

  // Sync active tab to URL
  const handleSetActiveCalc = useCallback((id: CalcId) => {
    setActiveCalc(id);
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("calc", id);
    window.history.replaceState(null, "", url.toString());
    // Auto-scroll pill nav to active
    if (pillScrollRef.current) {
      const activeBtn = pillScrollRef.current.querySelector(`[data-calc-id="${id}"]`);
      if (activeBtn) activeBtn.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, []);

  // Navigate to prev/next inline calculator
  const goToCalc = useCallback((direction: "prev" | "next") => {
    const idx = INLINE_CALC_IDS.indexOf(activeCalc);
    if (idx === -1) return;
    const newIdx = direction === "next" ? Math.min(idx + 1, INLINE_CALC_IDS.length - 1) : Math.max(idx - 1, 0);
    if (newIdx !== idx) handleSetActiveCalc(INLINE_CALC_IDS[newIdx]);
  }, [activeCalc, handleSetActiveCalc]);

  // Swipe detection on calc container
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, []);
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    touchStart.current = null;
    // Only swipe if horizontal movement is dominant and > 60px
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0) goToCalc("next");
      else goToCalc("prev");
    }
  }, [goToCalc]);

  const currentInlineIdx = INLINE_CALC_IDS.indexOf(activeCalc);
  const hasPrev = currentInlineIdx > 0;
  const hasNext = currentInlineIdx < INLINE_CALC_IDS.length - 1 && currentInlineIdx >= 0;
  const prevCalc = hasPrev ? CALCS.find(c => c.id === INLINE_CALC_IDS[currentInlineIdx - 1]) : null;
  const nextCalc = hasNext ? CALCS.find(c => c.id === INLINE_CALC_IDS[currentInlineIdx + 1]) : null;

  useEffect(() => {
    if (initialCalc && !hasScrolled.current) {
      hasScrolled.current = true;
      setActiveCalc(initialCalc);
      const el = document.getElementById("calc-container");
      if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
    }
  }, [initialCalc]);

  const nonCryptoBrokers = useMemo(() => brokers.filter((b) => !b.is_crypto), [brokers]);

  return (
    <div className="pt-5 pb-8 md:py-12">
      <div className="container-custom">
        {/* Page header */}
        <div className="mb-2.5 md:text-center md:mb-10">
          <h1 className="text-lg md:text-4xl font-extrabold text-brand tracking-tight mb-0.5 md:mb-3">Investing Tools</h1>
          <p className="text-[0.69rem] md:text-lg text-slate-500 max-w-2xl md:mx-auto leading-relaxed">
            Free calculators to compare fees &amp; estimate tax
          </p>
          <div className="hidden md:block">
            <AuthorByline variant="light" />
          </div>
        </div>

        {/* ── Pill Navigation ──────────────────────── */}
        {/* Mobile: horizontal snap-scroll strip */}
        <div className="md:hidden -mx-4 px-4 mb-3" role="tablist" aria-label="Calculator selection">
          <div ref={pillScrollRef} className="flex gap-1.5 overflow-x-auto snap-x snap-mandatory pb-1 scrollbar-hide">
            {CALCS.map((c) => (
              c.href ? (
                <a
                  key={c.href}
                  href={c.href}
                  data-calc-id={c.id}
                  className="relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border bg-violet-50 border-violet-200 text-violet-700 text-left transition-all shrink-0 snap-start hover:bg-violet-100"
                >
                  <Icon name={c.icon} size={14} className="text-violet-500" />
                  <span className="text-xs font-semibold whitespace-nowrap">{c.title}</span>
                  {c.badge && (
                    <span className="px-1 py-px text-[8px] font-bold rounded-full leading-none bg-violet-200 text-violet-800">{c.badge}</span>
                  )}
                </a>
              ) : (
              <button
                key={c.id}
                data-calc-id={c.id}
                onClick={() => handleSetActiveCalc(c.id)}
                role="tab"
                aria-selected={activeCalc === c.id}
                aria-controls="calc-container"
                className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-left transition-all shrink-0 snap-start ${
                  activeCalc === c.id
                    ? "bg-slate-900 border-slate-900 text-white shadow-md"
                    : "bg-white border-slate-200 text-slate-700 active:bg-slate-50"
                }`}
              >
                <Icon name={c.icon} size={14} className={activeCalc === c.id ? "text-white" : "text-slate-500"} />
                <span className="text-xs font-semibold whitespace-nowrap">{c.title}</span>
                {c.badge && (
                  <span className={`px-1 py-px text-[8px] font-bold rounded-full leading-none ${
                    activeCalc === c.id ? "bg-amber-400 text-amber-900" : "bg-amber-100 text-amber-700"
                  }`}>
                    {c.badge}
                  </span>
                )}
              </button>
              )
            ))}
          </div>
        </div>
        {/* Desktop: grid cards */}
        <div className="hidden md:grid md:grid-cols-3 lg:grid-cols-7 gap-3 mb-10" role="tablist" aria-label="Calculator selection">
          {CALCS.map((c) => (
            c.href ? (
              <a
                key={c.id}
                href={c.href}
                className="relative flex flex-col items-start p-4 rounded-xl border bg-violet-50 border-violet-200 text-left transition-all h-full w-full group hover:bg-violet-100"
              >
                {c.badge && (
                  <span className="absolute top-2 right-2 px-1.5 py-0.5 bg-violet-200 text-violet-800 text-[10px] font-bold rounded-full leading-none">{c.badge}</span>
                )}
                <Icon name={c.icon} size={24} className="mb-2 text-violet-500" />
                <span className="text-sm font-bold mb-0.5 leading-tight text-violet-900">{c.title}</span>
                <span className="text-xs text-violet-600 leading-snug">{c.subtitle} →</span>
              </a>
            ) : (
            <button
              key={c.id}
              onClick={() => handleSetActiveCalc(c.id)}
              role="tab"
              aria-selected={activeCalc === c.id}
              aria-controls="calc-container"
              className={`relative flex flex-col items-start p-4 rounded-xl border text-left transition-all h-full w-full group ${
                activeCalc === c.id
                  ? "bg-white border-slate-700 ring-1 ring-slate-700 shadow-md"
                  : "bg-white border-slate-200 hover:border-slate-600/40 hover:shadow-sm"
              }`}
            >
              {c.badge && (
                <span className="absolute top-2 right-2 px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full leading-none">
                  {c.badge}
                </span>
              )}
              <Icon name={c.icon} size={24} className={`mb-2 transition-transform ${activeCalc === c.id ? "scale-110 text-slate-700" : "text-slate-500 group-hover:scale-105"}`} />
              <span className={`text-sm font-bold mb-0.5 leading-tight ${activeCalc === c.id ? "text-slate-800" : "text-slate-900"}`}>
                {c.title}
              </span>
              <span className="text-xs text-slate-500 leading-snug">{c.subtitle}</span>
            </button>
            )
          ))}
        </div>

        {/* ── Active Calculator ────────────────────── */}
        <div
          id="calc-container"
          className="scroll-mt-20 md:scroll-mt-24 min-h-[280px] md:min-h-[400px]"
          role="tabpanel"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {activeCalc === "tco" && <TotalCostCalculator brokers={nonCryptoBrokers} searchParams={searchParams} />}
          {activeCalc === "trade-cost" && <TradeCostCalculator brokers={nonCryptoBrokers} searchParams={searchParams} />}
          {activeCalc === "franking" && <FrankingCalculator searchParams={searchParams} />}
          {activeCalc === "switching" && <SwitchingCostCalculator brokers={nonCryptoBrokers} searchParams={searchParams} />}
          {activeCalc === "fx" && <FxFeeCalculator brokers={nonCryptoBrokers} searchParams={searchParams} />}
          {activeCalc === "cgt" && <CgtCalculator searchParams={searchParams} />}
          {activeCalc === "chess" && <ChessLookup brokers={nonCryptoBrokers} searchParams={searchParams} />}
          {activeCalc === "fee-impact" && <FeeImpactTeaser brokers={nonCryptoBrokers} searchParams={searchParams} />}
          {activeCalc === "portfolio" && <InlinePortfolioCalc brokers={nonCryptoBrokers} />}
          {activeCalc === "switch-calc" && <InlineSwitchingCalc brokers={nonCryptoBrokers} />}
          {activeCalc === "savings-calc" && <InlineSavingsCalc brokers={brokers} />}
          {activeCalc === "compound-interest" && <CompoundInterestCalculator searchParams={searchParams} />}
          {activeCalc === "dividend-reinvestment" && <DividendReinvestmentCalculator searchParams={searchParams} />}
          {activeCalc === "fire" && <FireCalculator searchParams={searchParams} />}
          {activeCalc === "property-vs-shares" && <PropertyVsSharesCalculator searchParams={searchParams} />}

          {/* Standalone page CTA */}
          {STANDALONE_URLS[activeCalc] && (
            <div className="mt-3 flex justify-end">
              <Link
                href={STANDALONE_URLS[activeCalc]!}
                className="text-xs font-semibold text-violet-600 hover:text-violet-700 flex items-center gap-1 transition-colors"
              >
                Open full calculator
                <Icon name="external-link" size={12} />
              </Link>
            </div>
          )}

          {/* Prev / Next navigation */}
          {currentInlineIdx >= 0 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
              {hasPrev && prevCalc ? (
                <button
                  onClick={() => goToCalc("prev")}
                  className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors min-h-[44px]"
                >
                  <Icon name="chevron-left" size={16} />
                  <span className="hidden sm:inline">{prevCalc.title}</span>
                  <span className="sm:hidden">Prev</span>
                </button>
              ) : <span />}
              <span className="text-[0.56rem] text-slate-300 font-medium">
                {currentInlineIdx + 1} / {INLINE_CALC_IDS.length}
                <span className="md:hidden ml-1 text-slate-300">· swipe ←→</span>
              </span>
              {hasNext && nextCalc ? (
                <button
                  onClick={() => goToCalc("next")}
                  className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors min-h-[44px]"
                >
                  <span className="hidden sm:inline">{nextCalc.title}</span>
                  <span className="sm:hidden">Next</span>
                  <Icon name="chevron-right" size={16} />
                </button>
              ) : <span />}
            </div>
          )}
        </div>

        {/* Display ad — high-intent placement (user just ran calculations) */}
        <AdSlot
          placement="display-calculator-results"
          variant="in-content"
          page="/calculators"
          brokers={brokers}
        />

        {/* Related Resources */}
        <div className="mt-4 md:mt-8 bg-slate-50 border border-slate-200 rounded-lg md:rounded-xl p-3 md:p-6">
          <h2 className="text-[0.69rem] md:text-sm font-bold text-slate-700 mb-1.5 md:mb-3">Related Resources</h2>
          <div className="flex flex-wrap gap-1 md:gap-2">
            <Link href="/compare" className="text-[0.69rem] md:text-xs px-2 md:px-2.5 py-1 md:py-1.5 border border-slate-200 rounded-md md:rounded-lg hover:bg-white transition-colors">
              Compare Platforms →
            </Link>
            <Link href="/article/best-share-trading-platforms-australia" className="text-[0.69rem] md:text-xs px-2 md:px-2.5 py-1 md:py-1.5 border border-slate-200 rounded-md md:rounded-lg hover:bg-white transition-colors">
              Best Platforms →
            </Link>
            <Link href="/article/how-to-invest-australia" className="text-[0.69rem] md:text-xs px-2 md:px-2.5 py-1 md:py-1.5 border border-slate-200 rounded-md md:rounded-lg hover:bg-white transition-colors">
              How to Invest →
            </Link>
            <Link href="/quiz" className="text-[0.69rem] md:text-xs px-2 md:px-2.5 py-1 md:py-1.5 border border-slate-200 text-slate-700 rounded-md md:rounded-lg hover:bg-white transition-colors">
              Platform Quiz →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
