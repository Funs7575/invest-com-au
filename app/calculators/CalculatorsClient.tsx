"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import type { Broker } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { trackClick, trackEvent, getAffiliateLink, getBenefitCta } from "@/lib/tracking";
import { useSearchParams } from "next/navigation";
import AuthorByline from "@/components/AuthorByline";

/* ──────────────────────────────────────────────
   Animated number – smooth counting transitions
   ────────────────────────────────────────────── */
function AnimatedNumber({ value, prefix = "$", decimals = 2 }: { value: number; prefix?: string; decimals?: number }) {
  const [display, setDisplay] = useState(value);
  const ref = useRef(value);
  useEffect(() => {
    const start = ref.current;
    const end = value;
    const duration = 400;
    const t0 = performance.now();
    function tick(now: number) {
      const p = Math.min((now - t0) / duration, 1);
      setDisplay(start + (end - start) * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    ref.current = end;
  }, [value]);
  return (
    <span>
      {prefix}
      {display.toLocaleString("en-AU", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
    </span>
  );
}

/* ──────────────────────────────────────────────
   Types & constants
   ────────────────────────────────────────────── */
interface Props { brokers: Broker[] }
type CalcId = "trade-cost" | "fx" | "switching" | "cgt" | "franking" | "chess";

const CALCS: { id: CalcId; emoji: string; title: string; subtitle: string }[] = [
  { id: "trade-cost", emoji: "\u{1F4B5}", title: "Trade Cost", subtitle: "What does a trade really cost at each broker?" },
  { id: "fx", emoji: "\u{1F1FA}\u{1F1F8}", title: "US Share Costs", subtitle: "What do international trades really cost?" },
  { id: "switching", emoji: "\u{1F504}", title: "Compare Fees", subtitle: "Is it worth switching brokers?" },
  { id: "cgt", emoji: "\u{1F4C5}", title: "Tax on Profits", subtitle: "Estimate capital gains tax" },
  { id: "franking", emoji: "\u{1F4B0}", title: "Dividend Tax", subtitle: "Franking credits after tax" },
  { id: "chess", emoji: "\u{1F512}", title: "Share Safety", subtitle: "Is your broker CHESS sponsored?" },
];

const CORPORATE_TAX_RATE = 0.3;
const TRANSFER_FEE = 54;
const TAX_BRACKETS = [0, 19, 32.5, 37, 45];

/* ──────────────────────────────────────────────
   Root component
   ────────────────────────────────────────────── */
export default function CalculatorsClient({ brokers }: Props) {
  const searchParams = useSearchParams();
  const initialCalc = searchParams.get("calc") as CalcId | null;
  const hasScrolled = useRef(false);
  const [activeCalc, setActiveCalc] = useState<CalcId>(initialCalc || "trade-cost");

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
    <div className="py-12">
      <div className="container-custom">
        {/* Page header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-extrabold text-brand tracking-tight mb-3">Investing Tools</h1>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
            Free tools to help you compare broker fees, estimate tax, and make smarter investing decisions.
          </p>
          <AuthorByline variant="light" />
        </div>

        {/* ── Pill Navigation ──────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-10" role="tablist" aria-label="Calculator selection">
          {CALCS.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCalc(c.id)}
              role="tab"
              aria-selected={activeCalc === c.id}
              aria-controls="calc-container"
              className={`relative flex flex-col items-start p-4 rounded-xl border text-left transition-all h-full w-full group ${
                activeCalc === c.id
                  ? "bg-white border-green-700 ring-1 ring-green-700 shadow-md"
                  : "bg-white border-slate-200 hover:border-green-600/40 hover:shadow-sm"
              }`}
            >
              <span className={`text-2xl mb-2 transition-transform ${activeCalc === c.id ? "scale-110" : "group-hover:scale-105"}`}>{c.emoji}</span>
              <span className={`text-sm font-bold mb-0.5 leading-tight ${activeCalc === c.id ? "text-green-800" : "text-slate-900"}`}>
                {c.title}
              </span>
              <span className="text-xs text-slate-500 leading-snug">{c.subtitle}</span>
            </button>
          ))}
        </div>

        {/* ── Active Calculator ────────────────────── */}
        <div id="calc-container" className="scroll-mt-24 min-h-[400px]" role="tabpanel">
          {activeCalc === "trade-cost" && <TradeCostCalculator brokers={nonCryptoBrokers} />}
          {activeCalc === "franking" && <FrankingCalculator />}
          {activeCalc === "switching" && <SwitchingCostCalculator brokers={nonCryptoBrokers} />}
          {activeCalc === "fx" && <FxFeeCalculator brokers={nonCryptoBrokers} />}
          {activeCalc === "cgt" && <CgtCalculator />}
          {activeCalc === "chess" && <ChessLookup brokers={nonCryptoBrokers} />}
        </div>

        {/* Related Resources */}
        <div className="mt-8 bg-slate-50 border border-slate-200 rounded-xl p-6">
          <h3 className="text-sm font-bold text-slate-700 mb-3">Related Resources</h3>
          <div className="flex flex-wrap gap-2">
            <Link href="/compare" className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-white transition-colors">
              Compare All Brokers →
            </Link>
            <Link href="/article/best-share-trading-platforms-australia" className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-white transition-colors">
              Best Platforms 2026 →
            </Link>
            <Link href="/article/how-to-invest-australia" className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-white transition-colors">
              How to Invest →
            </Link>
            <Link href="/article/best-etfs-australia" className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-white transition-colors">
              Best ETFs 2026 →
            </Link>
            <Link href="/quiz" className="text-xs px-3 py-1.5 border border-green-200 text-green-700 rounded-lg hover:bg-green-50 transition-colors">
              Take the Broker Quiz →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   0) Trade Cost Calculator — what does a trade really cost?
   ────────────────────────────────────────────── */
function TradeCostCalculator({ brokers }: { brokers: Broker[] }) {
  const [tradeAmount, setTradeAmount] = useState("5000");
  const [market, setMarket] = useState<"asx" | "us">("asx");

  const amount = parseFloat(tradeAmount) || 0;

  const results = useMemo(() => {
    return brokers
      .map((b) => {
        if (market === "asx") {
          const brokerage = b.asx_fee_value ?? null;
          if (brokerage === null || brokerage >= 999) return null;
          return { broker: b, brokerage, fxCost: 0, totalCost: brokerage, pctOfTrade: amount > 0 ? (brokerage / amount) * 100 : 0 };
        } else {
          const brokerage = b.us_fee_value ?? null;
          if (brokerage === null || brokerage >= 999) return null;
          const fxCost = amount * ((b.fx_rate ?? 0) / 100);
          const total = brokerage + fxCost;
          return { broker: b, brokerage, fxCost, totalCost: total, pctOfTrade: amount > 0 ? (total / amount) * 100 : 0 };
        }
      })
      .filter(Boolean)
      .sort((a, b) => a!.totalCost - b!.totalCost) as { broker: Broker; brokerage: number; fxCost: number; totalCost: number; pctOfTrade: number }[];
  }, [brokers, market, amount]);

  const cheapest = results[0]?.totalCost ?? 0;
  const mostExpensive = results[results.length - 1]?.totalCost ?? 1;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8">
      <h2 className="text-2xl font-bold mb-1">Trade Cost Calculator</h2>
      <p className="text-sm text-slate-500 mb-6">
        Enter your trade amount to see what each broker would actually charge you — including hidden FX fees on US trades.
      </p>

      {/* Inputs */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <label className="block text-xs font-semibold text-slate-600 mb-1">Trade Amount (AUD)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">$</span>
            <input
              type="number"
              value={tradeAmount}
              onChange={(e) => setTradeAmount(e.target.value)}
              className="w-full pl-8 pr-4 py-3 border border-slate-200 rounded-lg text-lg font-semibold focus:outline-none focus:border-green-700 focus:ring-1 focus:ring-green-700"
              min={0}
              step={500}
              aria-label="Trade amount in AUD"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Market</label>
          <div className="flex gap-2">
            <button
              onClick={() => setMarket("asx")}
              className={`px-5 py-3 rounded-lg text-sm font-semibold transition-colors ${
                market === "asx" ? "bg-green-700 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              🇦🇺 ASX
            </button>
            <button
              onClick={() => setMarket("us")}
              className={`px-5 py-3 rounded-lg text-sm font-semibold transition-colors ${
                market === "us" ? "bg-green-700 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              🇺🇸 US
            </button>
          </div>
        </div>
      </div>

      {/* Quick amount buttons */}
      <div className="flex flex-wrap gap-2 mb-6">
        {["500", "1000", "2000", "5000", "10000", "25000"].map((v) => (
          <button
            key={v}
            onClick={() => setTradeAmount(v)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              tradeAmount === v ? "bg-green-100 text-green-700 border border-green-300" : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100"
            }`}
          >
            ${parseInt(v).toLocaleString()}
          </button>
        ))}
      </div>

      {/* Results table */}
      {results.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left text-xs font-semibold text-slate-500 pb-2 pr-4">Broker</th>
                <th className="text-right text-xs font-semibold text-slate-500 pb-2 px-2">Brokerage</th>
                {market === "us" && <th className="text-right text-xs font-semibold text-slate-500 pb-2 px-2">FX Cost</th>}
                <th className="text-right text-xs font-semibold text-slate-500 pb-2 px-2">Total Cost</th>
                <th className="text-right text-xs font-semibold text-slate-500 pb-2 px-2">% of Trade</th>
                <th className="text-left text-xs font-semibold text-slate-500 pb-2 pl-4">Cost Bar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {results.map((r, i) => {
                const barWidth = mostExpensive > 0 ? Math.max((r.totalCost / mostExpensive) * 100, 2) : 0;
                const isCheapest = r.totalCost === cheapest;
                return (
                  <tr key={r.broker.slug} className={isCheapest ? "bg-green-50/60" : ""}>
                    <td className="py-3 pr-4">
                      <span className="font-semibold text-sm">{r.broker.name}</span>
                      {isCheapest && <span className="ml-2 text-[0.6rem] font-bold text-green-600 uppercase">Cheapest</span>}
                    </td>
                    <td className="py-3 px-2 text-right text-sm font-mono">
                      <AnimatedNumber value={r.brokerage} />
                    </td>
                    {market === "us" && (
                      <td className="py-3 px-2 text-right text-sm font-mono text-slate-500">
                        <AnimatedNumber value={r.fxCost} />
                      </td>
                    )}
                    <td className="py-3 px-2 text-right text-sm font-mono font-bold">
                      <AnimatedNumber value={r.totalCost} />
                    </td>
                    <td className="py-3 px-2 text-right text-xs text-slate-500">
                      {r.pctOfTrade.toFixed(2)}%
                    </td>
                    <td className="py-3 pl-4 w-40">
                      <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${isCheapest ? "bg-green-500" : "bg-amber-400"}`}
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-center py-8 text-slate-500">No brokers support {market === "asx" ? "ASX" : "US"} trading.</p>
      )}

      {/* Savings callout */}
      {results.length >= 2 && (
        <div className="mt-6 bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <p className="text-sm text-green-800">
            <strong>Potential savings:</strong> Choosing the cheapest broker saves you{" "}
            <strong>
              ${(results[results.length - 1].totalCost - results[0].totalCost).toFixed(2)}
            </strong>{" "}
            per {market === "asx" ? "ASX" : "US"} trade compared to the most expensive option.
          </p>
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────
   1) Franking Credits Calculator
   ────────────────────────────────────────────── */
function FrankingCalculator() {
  const [dividendYield, setDividendYield] = useState("4.5");
  const [frankingPct, setFrankingPct] = useState("100");
  const [marginalRate, setMarginalRate] = useState(32.5);

  // Track calculator usage (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      // Only track if user has actually interacted (e.g. changed from defaults)
      if (dividendYield !== "4.5" || frankingPct !== "100" || marginalRate !== 32.5) {
        trackEvent('calculator_use', { calc_type: 'franking', dividend_yield: dividendYield, franking_pct: frankingPct, marginal_rate: marginalRate }, '/calculators');
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [dividendYield, frankingPct, marginalRate]);

  const dy = parseFloat(dividendYield) || 0;
  const fp = (parseFloat(frankingPct) || 0) / 100;
  const mr = marginalRate / 100;

  const frankingCredit = (dy * fp * CORPORATE_TAX_RATE) / (1 - CORPORATE_TAX_RATE);
  const grossedUpYield = dy + frankingCredit;
  const taxPayable = grossedUpYield * mr;
  const netYield = grossedUpYield - taxPayable;
  const excessCredits = frankingCredit - taxPayable;
  const hasRefund = excessCredits > 0;

  const showResults = dy > 0;

  // For waterfall chart - scale relative to grossed-up
  const maxBar = grossedUpYield || 1;

  return (
    <CalcSection
      id="franking"
      emoji={"\u{1F4B0}"}
      title="Franking Credits Calculator"
      desc="Calculate the true after-tax value of franked dividends. Uses corporate tax rate of 30%."
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Inputs */}
        <div className="lg:col-span-4">
          <div className="space-y-5">
            <InputField label="Dividend Yield" value={dividendYield} onChange={setDividendYield} placeholder="4.5" suffix="%" />
            <InputField label="Franking" value={frankingPct} onChange={setFrankingPct} placeholder="100" suffix="%" />

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Marginal Tax Rate</label>
              <div className="grid grid-cols-5 gap-1.5">
                {TAX_BRACKETS.map((rate) => (
                  <button
                    key={rate}
                    onClick={() => setMarginalRate(rate)}
                    className={`py-2 text-sm font-semibold rounded-lg transition-all ${
                      marginalRate === rate
                        ? "bg-brand text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {rate}%
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Results visualisation */}
        <div className="lg:col-span-8">
          {showResults ? (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm h-full">
              {/* Hero number */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 pb-5 border-b border-slate-100">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Net Yield After Tax</span>
                  <div className="text-4xl font-extrabold text-brand tracking-tight mt-0.5">
                    <AnimatedNumber value={netYield} prefix="" decimals={2} />%
                  </div>
                </div>
                <div className="mt-3 sm:mt-0 flex gap-6">
                  <div className="text-right">
                    <span className="block text-xs font-bold uppercase text-slate-400">Effective Yield</span>
                    <span className="text-xl font-bold text-green-700">{netYield.toFixed(2)}%</span>
                  </div>
                  <div className="text-right">
                    <span className="block text-xs font-bold uppercase text-slate-400">Grossed-Up</span>
                    <span className="text-xl font-bold text-slate-700">{grossedUpYield.toFixed(2)}%</span>
                  </div>
                </div>
              </div>

              {/* Waterfall chart */}
              <div className="space-y-5">
                <WaterfallBar label="Cash Dividend" value={`${dy.toFixed(2)}%`} width={(dy / maxBar) * 100} color="bg-blue-500" />
                <WaterfallBar label="+ Franking Credits" value={`+${frankingCredit.toFixed(2)}%`} width={(frankingCredit / maxBar) * 100} color="bg-green-600" valueColor="text-green-700" />
                <WaterfallBar label="- Tax Payable" value={`-${taxPayable.toFixed(2)}%`} width={(taxPayable / maxBar) * 100} color="bg-red-400" valueColor="text-red-500" />
              </div>

              {/* Insight box */}
              {hasRefund && (
                <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4 flex gap-3 items-start">
                  <span className="text-green-600 mt-0.5 shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </span>
                  <p className="text-sm text-green-900 leading-relaxed">
                    <strong>Tax Refund:</strong> Your franking credits exceed your tax liability by <strong>{excessCredits.toFixed(2)}%</strong>. You may be eligible for a tax refund on the excess.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-12 text-center h-full flex flex-col items-center justify-center">
              <span className="text-5xl mb-4">📊</span>
              <h3 className="text-lg font-bold text-slate-900 mb-1">Enter a Dividend Yield</h3>
              <p className="text-sm text-slate-500 max-w-xs">Type a value on the left to see your franking credit waterfall chart.</p>
            </div>
          )}
        </div>
      </div>
    </CalcSection>
  );
}

/* ──────────────────────────────────────────────
   2) Switching Cost Simulator
   ────────────────────────────────────────────── */
function SwitchingCostCalculator({ brokers }: { brokers: Broker[] }) {
  const [currentSlug, setCurrentSlug] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [tradesPerMonth, setTradesPerMonth] = useState("4");
  const [portfolioValue, setPortfolioValue] = useState("");

  // Track calculator usage (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      // Only track if user has actually interacted (e.g. changed from defaults)
      if (currentSlug || newSlug || tradesPerMonth !== "4" || portfolioValue) {
        trackEvent('calculator_use', { calc_type: 'switching', current_broker: currentSlug, new_broker: newSlug, trades_per_month: tradesPerMonth }, '/calculators');
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [currentSlug, newSlug, tradesPerMonth, portfolioValue]);

  const currentBroker = brokers.find((b) => b.slug === currentSlug);
  const newBroker = brokers.find((b) => b.slug === newSlug);
  const tpm = parseFloat(tradesPerMonth) || 0;

  const currentMonthly = (currentBroker?.asx_fee_value ?? 0) * tpm;
  const newMonthly = (newBroker?.asx_fee_value ?? 0) * tpm;
  const monthlySavings = currentMonthly - newMonthly;
  const annualSavings = monthlySavings * 12;
  const breakEvenMonths = monthlySavings > 0 ? Math.ceil(TRANSFER_FEE / monthlySavings) : null;
  const fiveYearNet = annualSavings * 5 - TRANSFER_FEE;

  const cheaperBroker = monthlySavings > 0 ? newBroker : monthlySavings < 0 ? currentBroker : null;
  const showResults = currentBroker && newBroker && currentSlug !== newSlug && tpm > 0;

  return (
    <CalcSection
      id="switching"
      emoji={"\u{1F504}"}
      title="Switching Cost Simulator"
      desc="See if switching brokers is worth it after factoring in the $54 CHESS transfer fee."
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Inputs */}
        <div className="lg:col-span-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SelectField label="Current Broker" value={currentSlug} onChange={setCurrentSlug} placeholder="Select broker...">
              {brokers.map((b) => (
                <option key={b.slug} value={b.slug}>{b.name} ({b.asx_fee || "N/A"}/trade)</option>
              ))}
            </SelectField>
            <SelectField label="New Broker" value={newSlug} onChange={setNewSlug} placeholder="Select broker...">
              {brokers.map((b) => (
                <option key={b.slug} value={b.slug}>{b.name} ({b.asx_fee || "N/A"}/trade)</option>
              ))}
            </SelectField>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField label="Trades per Month" value={tradesPerMonth} onChange={setTradesPerMonth} placeholder="4" />
            <InputField label="Portfolio Value" value={portfolioValue} onChange={setPortfolioValue} placeholder="50000" prefix="$" />
          </div>
        </div>

        {/* Results */}
        <div className="lg:col-span-7">
          {showResults ? (
            <div className="h-full space-y-4">
              {/* Hero savings */}
              <div className={`rounded-xl p-6 text-center border ${
                annualSavings > 0 ? "bg-green-50 border-green-200" : annualSavings < 0 ? "bg-red-50 border-red-200" : "bg-slate-50 border-slate-200"
              }`}>
                <span className={`text-xs font-bold uppercase tracking-wider ${annualSavings > 0 ? "text-green-700" : annualSavings < 0 ? "text-red-600" : "text-slate-500"}`}>
                  {annualSavings > 0 ? "Projected Annual Savings" : annualSavings < 0 ? "You\u2019d Pay More" : "No Difference"}
                </span>
                <div className={`text-4xl md:text-5xl font-extrabold tracking-tight mt-1 ${
                  annualSavings > 0 ? "text-green-800" : annualSavings < 0 ? "text-red-600" : "text-slate-700"
                }`}>
                  <AnimatedNumber value={Math.abs(annualSavings)} /><span className="text-2xl font-bold text-slate-400">/yr</span>
                </div>
                {breakEvenMonths != null && (
                  <p className="text-sm text-slate-600 mt-2">
                    Break even on the ${TRANSFER_FEE} transfer fee in <strong>{breakEvenMonths} month{breakEvenMonths !== 1 ? "s" : ""}</strong>
                  </p>
                )}
              </div>

              {/* Stat grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <ResultBox label="Monthly" value={formatCurrency(monthlySavings)} positive={monthlySavings > 0} negative={monthlySavings < 0} />
                <ResultBox label="Switch Cost" value={formatCurrency(TRANSFER_FEE)} />
                <ResultBox label="Break-Even" value={breakEvenMonths != null ? `${breakEvenMonths} mo` : "N/A"} />
                <ResultBox label="5-Year Net" value={formatCurrency(fiveYearNet)} positive={fiveYearNet > 0} negative={fiveYearNet < 0} />
              </div>

              {/* CTA */}
              {cheaperBroker && (
                <div className="flex items-center gap-4 bg-green-50 border border-green-200 rounded-xl p-4">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900">{cheaperBroker.name} is the cheaper option.</p>
                    <p className="text-xs text-slate-600 mt-0.5">Save {formatCurrency(Math.abs(annualSavings))}/year on brokerage fees.</p>
                  </div>
                  <a
                    href={getAffiliateLink(cheaperBroker)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackClick(cheaperBroker.slug, cheaperBroker.name, "calculator-switching", "/calculators", "cta")}
                    className="px-5 py-2.5 bg-green-700 text-white font-semibold rounded-lg hover:bg-green-800 transition-colors text-sm whitespace-nowrap"
                  >
                    {getBenefitCta(cheaperBroker, "calculator")}
                  </a>
                </div>
              )}
            </div>
          ) : (
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-12 text-center h-full flex flex-col items-center justify-center">
              <span className="text-5xl mb-4">⚖️</span>
              <h3 className="text-lg font-bold text-slate-900 mb-1">Compare Two Brokers</h3>
              <p className="text-sm text-slate-500 max-w-xs">Select your current and target broker on the left to see the cost analysis.</p>
            </div>
          )}
        </div>
      </div>
    </CalcSection>
  );
}

/* ──────────────────────────────────────────────
   3) FX Fee Calculator
   ────────────────────────────────────────────── */
function FxFeeCalculator({ brokers }: { brokers: Broker[] }) {
  const [amount, setAmount] = useState(10000);
  const tradeAmount = amount;

  // Track calculator usage (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      // Only track if user has actually interacted (e.g. changed from defaults)
      if (amount !== 10000) {
        trackEvent('calculator_use', { calc_type: 'fx', trade_amount: amount }, '/calculators');
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [amount]);

  const fxBrokers = useMemo(() => {
    return brokers
      .filter((b) => b.fx_rate != null && b.fx_rate > 0)
      .map((b) => ({ broker: b, rate: b.fx_rate!, fee: tradeAmount * (b.fx_rate! / 100) }))
      .sort((a, b) => a.rate - b.rate);
  }, [brokers, tradeAmount]);

  const cheapest = fxBrokers[0]?.broker.slug;
  const mostExpensive = fxBrokers[fxBrokers.length - 1]?.broker.slug;
  const maxFee = fxBrokers[fxBrokers.length - 1]?.fee || 1;
  const savings = fxBrokers.length > 1 ? fxBrokers[fxBrokers.length - 1].fee - fxBrokers[0].fee : 0;

  return (
    <CalcSection
      id="fx"
      emoji={"\u{1F1FA}\u{1F1F8}"}
      title="FX Fee Calculator"
      desc="See what every broker charges you in currency conversion fees on international trades."
    >
      {/* Slider + amount */}
      <div className="mb-8">
        <div className="flex justify-between items-baseline mb-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Trade Amount</label>
          <span className="text-2xl font-extrabold text-brand tracking-tight">${amount.toLocaleString("en-AU")}</span>
        </div>
        <input
          type="range"
          min={1000}
          max={50000}
          step={500}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer accent-green-700"
          style={{
            background: `linear-gradient(to right, #15803d ${((amount - 1000) / 49000) * 100}%, #e2e8f0 ${((amount - 1000) / 49000) * 100}%)`,
          }}
        />
        <div className="flex justify-between text-xs text-slate-400 mt-1">
          <span>$1,000</span>
          <span>$25,000</span>
          <span>$50,000</span>
        </div>
      </div>

      {/* Savings hero */}
      {fxBrokers.length > 1 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center mb-8">
          <span className="text-xs font-bold uppercase tracking-wider text-green-700">You could save</span>
          <div className="text-3xl md:text-4xl font-extrabold text-green-800 tracking-tight mt-0.5">
            <AnimatedNumber value={savings} />
          </div>
          <p className="text-sm text-green-700 mt-1">
            on a {formatCurrency(tradeAmount)} trade by using <strong>{fxBrokers[0].broker.name}</strong> instead of {fxBrokers[fxBrokers.length - 1].broker.name}
          </p>
        </div>
      )}

      {/* Bar chart */}
      <div className="space-y-2.5">
        {fxBrokers.map(({ broker, rate, fee }) => {
          const isCheapest = broker.slug === cheapest;
          const isMostExpensive = broker.slug === mostExpensive;
          const barWidth = maxFee > 0 ? (fee / maxFee) * 100 : 0;

          return (
            <div key={broker.slug} className="flex items-center gap-3">
              <div className="w-28 md:w-36 text-xs font-semibold text-slate-600 text-right shrink-0 truncate">
                {broker.name}
              </div>
              <div className="flex-1 relative">
                <div
                  className={`h-9 rounded-lg transition-all duration-500 flex items-center pr-3 ${
                    isCheapest ? "bg-green-700" : isMostExpensive ? "bg-red-400" : "bg-amber"
                  }`}
                  style={{ width: `${Math.max(barWidth, 4)}%` }}
                >
                  {barWidth > 18 && (
                    <span className="text-xs font-bold text-white ml-auto">{formatCurrency(fee)}</span>
                  )}
                </div>
                {barWidth <= 18 && (
                  <span className="absolute left-[calc(4%+8px)] top-1/2 -translate-y-1/2 text-xs font-bold text-slate-700">
                    {formatCurrency(fee)}
                  </span>
                )}
              </div>
              <div className="w-14 text-right shrink-0">
                <span className={`text-xs font-bold ${isCheapest ? "text-green-800" : isMostExpensive ? "text-red-600" : "text-slate-500"}`}>
                  {rate}%
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* CTA */}
      {fxBrokers.length > 0 && (
        <div className="mt-6 flex items-center gap-4 bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-900">{fxBrokers[0].broker.name} has the lowest FX fee at {fxBrokers[0].rate}%.</p>
            <p className="text-xs text-slate-600 mt-0.5">
              You save {formatCurrency(savings)} vs the most expensive on a {formatCurrency(tradeAmount)} trade.
            </p>
          </div>
          <a
            href={getAffiliateLink(fxBrokers[0].broker)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackClick(fxBrokers[0].broker.slug, fxBrokers[0].broker.name, "calculator-fx", "/calculators", "cta")}
            className="px-5 py-2.5 bg-green-700 text-white font-semibold rounded-lg hover:bg-green-800 transition-colors text-sm whitespace-nowrap"
          >
            {getBenefitCta(fxBrokers[0].broker, "calculator")}
          </a>
        </div>
      )}
    </CalcSection>
  );
}

/* ──────────────────────────────────────────────
   4) CGT Estimator
   ────────────────────────────────────────────── */
function CgtCalculator() {
  const [gainAmount, setGainAmount] = useState("");
  const [marginalRate, setMarginalRate] = useState(32.5);
  const [held12Months, setHeld12Months] = useState(true);

  // Track calculator usage (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      // Only track if user has actually interacted (e.g. changed from defaults)
      if (gainAmount || marginalRate !== 32.5 || !held12Months) {
        trackEvent('calculator_use', { calc_type: 'cgt', gain_amount: gainAmount, marginal_rate: marginalRate, held_12_months: held12Months }, '/calculators');
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [gainAmount, marginalRate, held12Months]);

  const gain = parseFloat(gainAmount) || 0;
  const mr = marginalRate / 100;

  const taxWithout = gain * mr;
  const effectiveWithout = gain > 0 ? (taxWithout / gain) * 100 : 0;
  const discountedGain = held12Months ? gain * 0.5 : gain;
  const taxWith = discountedGain * mr;
  const effectiveWith = gain > 0 ? (taxWith / gain) * 100 : 0;
  const taxSaved = taxWithout - taxWith;

  const showResults = gain > 0;

  return (
    <CalcSection
      id="cgt"
      emoji={"\u{1F4C5}"}
      title="CGT Estimator"
      desc="Estimate capital gains tax and see how the 50% CGT discount affects your tax bill. Not financial advice."
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Inputs */}
        <div className="lg:col-span-4 space-y-5">
          <InputField label="Capital Gain" value={gainAmount} onChange={setGainAmount} placeholder="10000" prefix="$" />

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Marginal Tax Rate</label>
            <div className="grid grid-cols-5 gap-1.5">
              {TAX_BRACKETS.map((rate) => (
                <button
                  key={rate}
                  onClick={() => setMarginalRate(rate)}
                  className={`py-2 text-sm font-semibold rounded-lg transition-all ${
                    marginalRate === rate
                      ? "bg-brand text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {rate}%
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={held12Months}
              onChange={(e) => setHeld12Months(e.target.checked)}
              className="w-5 h-5 rounded border-slate-300 text-green-700 accent-green-700"
            />
            <span className="text-sm font-medium text-slate-700">Held &gt; 12 months (50% discount)</span>
          </label>
        </div>

        {/* Results */}
        <div className="lg:col-span-8">
          {showResults ? (
            <div className="space-y-4">
              {/* Hero savings */}
              {held12Months && taxSaved > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
                  <span className="text-xs font-bold uppercase tracking-wider text-green-700">CGT Discount Saves You</span>
                  <div className="text-3xl md:text-4xl font-extrabold text-green-800 tracking-tight mt-0.5">
                    <AnimatedNumber value={taxSaved} />
                  </div>
                  <p className="text-sm text-green-700 mt-1">
                    Effective rate drops from {effectiveWithout.toFixed(1)}% to <strong>{effectiveWith.toFixed(1)}%</strong>
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Without discount */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Without CGT Discount</h4>
                  <div className="space-y-2.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Taxable Gain</span>
                      <span className="font-semibold">{formatCurrency(gain)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Tax Payable</span>
                      <span className="font-bold text-red-600">{formatCurrency(taxWithout)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Effective Rate</span>
                      <span className="font-semibold">{effectiveWithout.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>

                {/* With discount */}
                <div className={`border rounded-xl p-5 ${held12Months ? "bg-green-50 border-green-200" : "bg-slate-50 border-slate-200"}`}>
                  <h4 className={`text-xs font-bold uppercase tracking-wider mb-3 ${held12Months ? "text-green-700" : "text-slate-500"}`}>
                    {held12Months ? "With 50% CGT Discount" : "No Discount (< 12 months)"}
                  </h4>
                  <div className="space-y-2.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Taxable Gain</span>
                      <span className="font-semibold">{formatCurrency(discountedGain)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Tax Payable</span>
                      <span className={`font-bold ${held12Months ? "text-green-700" : "text-red-600"}`}>{formatCurrency(taxWith)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Effective Rate</span>
                      <span className="font-semibold">{effectiveWith.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-12 text-center h-full flex flex-col items-center justify-center">
              <span className="text-5xl mb-4">📅</span>
              <h3 className="text-lg font-bold text-slate-900 mb-1">Enter a Capital Gain</h3>
              <p className="text-sm text-slate-500 max-w-xs">Type your gain amount to see the tax comparison with and without the 50% discount.</p>
            </div>
          )}
        </div>
      </div>
    </CalcSection>
  );
}

/* ──────────────────────────────────────────────
   5) CHESS Lookup
   ────────────────────────────────────────────── */
function ChessLookup({ brokers }: { brokers: Broker[] }) {
  const [selectedSlug, setSelectedSlug] = useState("");
  const broker = brokers.find((b) => b.slug === selectedSlug);

  // Track calculator usage (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      // Only track if user has actually interacted (e.g. changed from defaults)
      if (selectedSlug) {
        trackEvent('calculator_use', { calc_type: 'chess', selected_broker: selectedSlug }, '/calculators');
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [selectedSlug]);

  return (
    <CalcSection
      id="chess"
      emoji={"\u{1F512}"}
      title="CHESS Sponsorship Lookup"
      desc="Check if a broker uses CHESS sponsorship or a custodial model, and what it means for you."
    >
      <div className="max-w-md mb-6">
        <SelectField label="Select Broker" value={selectedSlug} onChange={setSelectedSlug} placeholder="Choose a broker...">
          {brokers.map((b) => (
            <option key={b.slug} value={b.slug}>{b.name}</option>
          ))}
        </SelectField>
      </div>

      {broker && (
        <div className="space-y-6">
          <div
            className={`border rounded-xl p-6 ${
              broker.chess_sponsored ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-300"
            }`}
          >
            <div className="flex items-start gap-4">
              <span className="text-4xl">{broker.chess_sponsored ? "\u{2705}" : "\u{1F6E1}\u{FE0F}"}</span>
              <div className="flex-1">
                <h4 className="text-lg font-bold text-slate-900 mb-1">
                  {broker.name} &mdash; {broker.chess_sponsored ? "CHESS Sponsored" : "Custodial Model"}
                </h4>
                {broker.chess_sponsored ? (
                  <div className="text-sm text-slate-700 space-y-2 mt-2">
                    <p><strong>What this means:</strong> Your shares are held directly in your name on the ASX CHESS sub-register. You receive a unique Holder Identification Number (HIN) from ASX.</p>
                    <p><strong>Safety:</strong> If {broker.name} were to go bankrupt, your shares are still registered in your name with the ASX. They are not the broker&apos;s assets and cannot be claimed by their creditors.</p>
                    <p><strong>Trade-off:</strong> CHESS-sponsored brokers may charge slightly higher fees for the added safety and direct ownership benefits.</p>
                  </div>
                ) : (
                  <div className="text-sm text-slate-700 space-y-2 mt-2">
                    <p><strong>What this means:</strong> Your shares are held in a pooled custodial account (an &ldquo;omnibus&rdquo; account) under the broker&apos;s name, not directly in your name on the ASX register.</p>
                    <p><strong>Safety:</strong> The broker is required by ASIC to segregate your holdings from their own assets. However, in a broker insolvency, recovery can be slower and more complex than with CHESS sponsorship.</p>
                    <p><strong>Trade-off:</strong> Custodial models often enable lower fees, fractional shares, and access to international markets that CHESS-sponsored brokers may not offer.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* All brokers table */}
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">All Brokers at a Glance</h4>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-2.5 font-semibold text-slate-700">Broker</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-slate-700">Model</th>
                    <th className="text-right px-4 py-2.5 font-semibold text-slate-700">ASX Fee</th>
                  </tr>
                </thead>
                <tbody>
                  {brokers.map((b) => (
                    <tr
                      key={b.slug}
                      className={`border-b border-slate-100 last:border-0 transition-colors ${
                        b.slug === selectedSlug ? "bg-green-50" : "hover:bg-slate-50"
                      }`}
                    >
                      <td className="px-4 py-2.5 font-medium text-slate-800">{b.name}</td>
                      <td className="px-4 py-2.5">
                        {b.chess_sponsored ? (
                          <span className="inline-flex items-center px-2 py-0.5 bg-green-50 text-green-700 text-xs rounded border border-green-200 font-medium">CHESS</span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded border border-slate-200 font-medium">Custodial</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right text-slate-700">{b.asx_fee || "N/A"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </CalcSection>
  );
}

/* ──────────────────────────────────────────────
   Shared UI Components
   ────────────────────────────────────────────── */

function CalcSection({ id, emoji, title, desc, children }: {
  id: string; emoji: string; title: string; desc: string; children: React.ReactNode;
}) {
  return (
    <section id={id} className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm">
      <div className="flex items-start gap-3 mb-1">
        <span className="text-2xl">{emoji}</span>
        <h2 className="text-xl font-extrabold text-slate-900">{title}</h2>
      </div>
      <p className="text-sm text-slate-500 mb-6 ml-10">{desc}</p>
      {children}
    </section>
  );
}

function InputField({ label, value, onChange, placeholder, prefix, suffix }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; prefix?: string; suffix?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">{label}</label>
      <div className="relative">
        {prefix && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">{prefix}</div>}
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full bg-white border border-slate-200 rounded-lg py-2.5 shadow-sm focus:outline-none focus:border-green-700 focus:ring-1 focus:ring-green-700 transition-all font-medium ${prefix ? "pl-7" : "pl-4"} ${suffix ? "pr-10" : "pr-4"}`}
        />
        {suffix && <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">{suffix}</div>}
      </div>
    </div>
  );
}

function SelectField({ label, value, onChange, placeholder, children }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 shadow-sm focus:outline-none focus:border-green-700 focus:ring-1 focus:ring-green-700 transition-all font-medium"
      >
        <option value="">{placeholder}</option>
        {children}
      </select>
    </div>
  );
}

function ResultBox({ label, value, positive, negative }: {
  label: string; value: string; positive?: boolean; negative?: boolean;
}) {
  const bg = positive ? "bg-green-50 border-green-200" : negative ? "bg-red-50 border-red-200" : "bg-slate-50 border-slate-200";
  const textColor = positive ? "text-green-800" : negative ? "text-red-600" : "text-slate-900";

  return (
    <div className={`rounded-xl p-3.5 border ${bg}`}>
      <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">{label}</div>
      <div className={`text-xl font-extrabold tracking-tight ${textColor}`}>{value}</div>
    </div>
  );
}

function WaterfallBar({ label, value, width, color, valueColor }: {
  label: string; value: string; width: number; color: string; valueColor?: string;
}) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1.5">
        <span className="text-slate-600 font-semibold">{label}</span>
        <span className={`font-bold ${valueColor || "text-slate-900"}`}>{value}</span>
      </div>
      <div className="h-9 w-full bg-slate-100 rounded-lg overflow-hidden flex items-center px-1">
        <div
          className={`h-7 rounded-md transition-all duration-500 ease-out ${color}`}
          style={{ width: `${Math.max(Math.min(width, 100), 2)}%` }}
        />
      </div>
    </div>
  );
}
