"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import type { Broker } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { trackClick, getAffiliateLink, getBenefitCta } from "@/lib/tracking";
import { useSearchParams } from "next/navigation";
import AuthorByline from "@/components/AuthorByline";
import Link from "next/link";

/* ──────────────────────────────────────────────
   Types
   ────────────────────────────────────────────── */
interface Props {
  brokers: Broker[];
}

type CalcId = "franking" | "switching" | "fx" | "cgt" | "chess";

const CALCS: { id: CalcId; emoji: string; title: string; subtitle: string }[] = [
  { id: "franking", emoji: "\u{1F4B0}", title: "Franking Credits", subtitle: "Grossed-up dividend yield" },
  { id: "switching", emoji: "\u{1F504}", title: "Switching Cost", subtitle: "Is it worth switching brokers?" },
  { id: "fx", emoji: "\u{1F1FA}\u{1F1F8}", title: "FX Fee Calculator", subtitle: "Compare currency conversion costs" },
  { id: "cgt", emoji: "\u{1F4C5}", title: "CGT Estimator", subtitle: "Capital gains tax estimate" },
  { id: "chess", emoji: "\u{1F512}", title: "CHESS Lookup", subtitle: "Sponsorship model by broker" },
];

const CORPORATE_TAX_RATE = 0.3;
const TRANSFER_FEE = 54;

/* ──────────────────────────────────────────────
   Root client component
   ────────────────────────────────────────────── */
export default function CalculatorsClient({ brokers }: Props) {
  const searchParams = useSearchParams();
  const initialCalc = searchParams.get("calc") as CalcId | null;
  const hasScrolled = useRef(false);

  useEffect(() => {
    if (initialCalc && !hasScrolled.current) {
      hasScrolled.current = true;
      const el = document.getElementById(initialCalc);
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
      }
    }
  }, [initialCalc]);

  function scrollTo(id: CalcId) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const nonCryptoBrokers = useMemo(() => brokers.filter((b) => !b.is_crypto), [brokers]);

  return (
    <div>
      {/* Dark Hero */}
      <section className="bg-brand text-white py-12">
        <div className="container-custom text-center">
          <h1 className="text-3xl md:text-4xl font-extrabold mb-3">
            Investment Calculators
          </h1>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto">
            Free tools to help Australian investors understand costs, compare brokers, and plan smarter.
          </p>
          <AuthorByline variant="dark" />
        </div>
      </section>

      <div className="container-custom py-12">
        {/* ── Calculator Hub ──────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-14">
          {CALCS.map((c) => (
            <button
              key={c.id}
              onClick={() => scrollTo(c.id)}
              className="group border border-slate-200 rounded-xl bg-white p-5 text-left hover:border-green-700 hover:shadow-md hover-lift transition-all"
            >
              <span className="text-3xl block mb-2">{c.emoji}</span>
              <span className="text-sm font-bold text-slate-900 group-hover:text-green-700 transition-colors block leading-tight">
                {c.title}
              </span>
              <span className="text-xs text-slate-500 block mt-1 leading-tight">{c.subtitle}</span>
            </button>
          ))}
        </div>

        {/* ── Calculator Sections ─────────────────── */}
        <div className="space-y-14">
          <FrankingCalculator />
          <SwitchingCostCalculator brokers={nonCryptoBrokers} />
          <FxFeeCalculator brokers={nonCryptoBrokers} />
          <CgtCalculator />
          <ChessLookup brokers={nonCryptoBrokers} />
        </div>

        {/* Bottom CTA */}
        <div className="mt-14 bg-brand rounded-xl p-8 text-center text-white">
          <h3 className="text-2xl font-extrabold mb-2">
            Need Help Choosing a Broker?
          </h3>
          <p className="text-slate-300 mb-6 max-w-lg mx-auto">
            Compare fees, features, and platforms across every major Australian broker — or let our quiz match you in 60 seconds.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/compare"
              className="px-6 py-3 bg-white text-brand text-sm font-bold rounded-lg hover:bg-slate-100 transition-colors"
            >
              Compare All Brokers
            </Link>
            <Link
              href="/quiz"
              className="px-6 py-3 bg-amber text-white text-sm font-bold rounded-lg hover:bg-amber-600 transition-colors"
            >
              Take the Quiz
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   1) Franking Credits Calculator
   ────────────────────────────────────────────── */
function FrankingCalculator() {
  const [dividendYield, setDividendYield] = useState("");
  const [frankingPct, setFrankingPct] = useState("100");
  const [marginalRate, setMarginalRate] = useState("32.5");

  const dy = parseFloat(dividendYield) || 0;
  const fp = (parseFloat(frankingPct) || 0) / 100;
  const mr = (parseFloat(marginalRate) || 0) / 100;

  const frankingCredit = (dy * fp * CORPORATE_TAX_RATE) / (1 - CORPORATE_TAX_RATE);
  const grossedUpYield = dy + frankingCredit;
  const taxPayable = grossedUpYield * mr;
  const netYield = grossedUpYield - taxPayable;
  const excessCredits = frankingCredit - taxPayable;
  const hasRefund = excessCredits > 0;

  const showResults = dy > 0;

  return (
    <CalcSection
      id="franking"
      emoji={"\u{1F4B0}"}
      title="Franking Credits Calculator"
      desc="Calculate the true after-tax value of franked dividends. Uses corporate tax rate of 30%."
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <InputField label="Dividend Yield (%)" value={dividendYield} onChange={setDividendYield} placeholder="4.5" />
        <InputField label="Franking (%)" value={frankingPct} onChange={setFrankingPct} placeholder="100" />
        <InputField label="Marginal Tax Rate (%)" value={marginalRate} onChange={setMarginalRate} placeholder="32.5" />
      </div>

      {showResults && (
        <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <ResultBox label="Grossed-Up Yield" value={`${grossedUpYield.toFixed(2)}%`} />
          <ResultBox label="Franking Credit" value={`${frankingCredit.toFixed(2)}%`} />
          <ResultBox label="Tax Payable" value={`${taxPayable.toFixed(2)}%`} negative />
          <ResultBox label="Net Yield After Tax" value={`${netYield.toFixed(2)}%`} positive />
          {hasRefund ? (
            <ResultBox label="Refund (Excess Credits)" value={`${excessCredits.toFixed(2)}%`} positive />
          ) : (
            <ResultBox label="Shortfall (Tax Owed)" value={`${Math.abs(excessCredits).toFixed(2)}%`} negative />
          )}
        </div>
      )}
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

  const currentBroker = brokers.find((b) => b.slug === currentSlug);
  const newBroker = brokers.find((b) => b.slug === newSlug);
  const tpm = parseFloat(tradesPerMonth) || 0;
  const pv = parseFloat(portfolioValue) || 0;

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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Current Broker</label>
          <select
            value={currentSlug}
            onChange={(e) => setCurrentSlug(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none transition-all"
          >
            <option value="">Select broker...</option>
            {brokers.map((b) => (
              <option key={b.slug} value={b.slug}>
                {b.name} ({b.asx_fee || "N/A"}/trade)
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">New Broker</label>
          <select
            value={newSlug}
            onChange={(e) => setNewSlug(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none transition-all"
          >
            <option value="">Select broker...</option>
            {brokers.map((b) => (
              <option key={b.slug} value={b.slug}>
                {b.name} ({b.asx_fee || "N/A"}/trade)
              </option>
            ))}
          </select>
        </div>
        <InputField label="Trades per Month" value={tradesPerMonth} onChange={setTradesPerMonth} placeholder="4" />
        <InputField label="Portfolio Value ($)" value={portfolioValue} onChange={(v) => setPortfolioValue(v)} placeholder="50000" />
      </div>

      {showResults && (
        <>
          <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-4">
            <ResultBox
              label="Monthly Savings"
              value={formatCurrency(monthlySavings)}
              positive={monthlySavings > 0}
              negative={monthlySavings < 0}
            />
            <ResultBox
              label="Annual Savings"
              value={formatCurrency(annualSavings)}
              positive={annualSavings > 0}
              negative={annualSavings < 0}
            />
            <ResultBox label="Switching Cost" value={formatCurrency(TRANSFER_FEE)} />
            <ResultBox
              label="Break-Even"
              value={breakEvenMonths != null ? `${breakEvenMonths} month${breakEvenMonths !== 1 ? "s" : ""}` : "N/A"}
            />
            <ResultBox
              label="5-Year Net Savings"
              value={formatCurrency(fiveYearNet)}
              positive={fiveYearNet > 0}
              negative={fiveYearNet < 0}
            />
          </div>

          {/* Inline CTA for cheaper broker */}
          {cheaperBroker && (
            <div className="mt-6 flex items-center gap-4 bg-green-50 border border-green-200 rounded-xl p-5">
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-900">
                  {cheaperBroker.name} is the cheaper option.
                </p>
                <p className="text-xs text-slate-600 mt-0.5">
                  Save {formatCurrency(Math.abs(annualSavings))}/year on brokerage fees.
                </p>
              </div>
              <a
                href={getAffiliateLink(cheaperBroker)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() =>
                  trackClick(cheaperBroker.slug, cheaperBroker.name, "calculator-switching", "/calculators", "cta")
                }
                className="px-5 py-2.5 bg-green-700 text-white font-semibold rounded-lg hover:bg-green-800 transition-colors text-sm whitespace-nowrap"
              >
                {getBenefitCta(cheaperBroker, "calculator")}
              </a>
            </div>
          )}
        </>
      )}
    </CalcSection>
  );
}

/* ──────────────────────────────────────────────
   3) FX Fee Calculator
   ────────────────────────────────────────────── */
function FxFeeCalculator({ brokers }: { brokers: Broker[] }) {
  const [amount, setAmount] = useState("");
  const tradeAmount = parseFloat(amount) || 0;

  // Only brokers with a valid FX rate
  const fxBrokers = useMemo(() => {
    return brokers
      .filter((b) => b.fx_rate != null && b.fx_rate > 0)
      .map((b) => ({
        broker: b,
        rate: b.fx_rate!,
        fee: tradeAmount * (b.fx_rate! / 100),
      }))
      .sort((a, b) => a.rate - b.rate);
  }, [brokers, tradeAmount]);

  const cheapest = fxBrokers[0]?.broker.slug;
  const mostExpensive = fxBrokers[fxBrokers.length - 1]?.broker.slug;
  const maxFee = fxBrokers[fxBrokers.length - 1]?.fee || 1;

  return (
    <CalcSection
      id="fx"
      emoji={"\u{1F1FA}\u{1F1F8}"}
      title="FX Fee Calculator"
      desc="See what every broker charges you in currency conversion fees on international trades."
    >
      <div className="max-w-md">
        <InputField label="Trade Amount (AUD)" value={amount} onChange={setAmount} placeholder="10000" />
      </div>

      {tradeAmount > 0 && fxBrokers.length > 0 && (
        <div className="mt-6 space-y-2">
          {fxBrokers.map(({ broker, rate, fee }) => {
            const isCheapest = broker.slug === cheapest;
            const isMostExpensive = broker.slug === mostExpensive;
            const barWidth = maxFee > 0 ? (fee / maxFee) * 100 : 0;

            return (
              <div key={broker.slug} className="flex items-center gap-3">
                <div className="w-32 md:w-40 text-sm font-medium text-slate-800 truncate shrink-0">
                  {broker.name}
                </div>
                <div className="flex-1 bg-slate-100 rounded-lg h-9 relative overflow-hidden">
                  <div
                    className={`h-full rounded-lg transition-all duration-500 flex items-center pr-2 ${
                      isCheapest
                        ? "bg-green-500"
                        : isMostExpensive
                        ? "bg-red-400"
                        : "bg-amber"
                    }`}
                    style={{ width: `${Math.max(barWidth, 3)}%` }}
                  >
                    {barWidth > 15 && (
                      <span className="text-xs font-bold text-white ml-auto">
                        {formatCurrency(fee)}
                      </span>
                    )}
                  </div>
                  {barWidth <= 15 && (
                    <span className="absolute left-[calc(3%+8px)] top-1/2 -translate-y-1/2 text-xs font-bold text-slate-700">
                      {formatCurrency(fee)}
                    </span>
                  )}
                </div>
                <div className="w-20 md:w-24 text-right shrink-0">
                  <span
                    className={`text-sm font-bold ${
                      isCheapest ? "text-green-700" : isMostExpensive ? "text-red-600" : "text-slate-800"
                    }`}
                  >
                    {rate}%
                  </span>
                </div>
              </div>
            );
          })}

          {/* Cheapest broker CTA */}
          {fxBrokers.length > 0 && (
            <div className="mt-4 flex items-center gap-4 bg-green-50 border border-green-200 rounded-xl p-5">
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-900">
                  {fxBrokers[0].broker.name} has the lowest FX fee at {fxBrokers[0].rate}%.
                </p>
                <p className="text-xs text-slate-600 mt-0.5">
                  You save {formatCurrency(fxBrokers[fxBrokers.length - 1].fee - fxBrokers[0].fee)} vs the most
                  expensive option on a {formatCurrency(tradeAmount)} trade.
                </p>
              </div>
              <a
                href={getAffiliateLink(fxBrokers[0].broker)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() =>
                  trackClick(
                    fxBrokers[0].broker.slug,
                    fxBrokers[0].broker.name,
                    "calculator-fx",
                    "/calculators",
                    "cta"
                  )
                }
                className="px-5 py-2.5 bg-green-700 text-white font-semibold rounded-lg hover:bg-green-800 transition-colors text-sm whitespace-nowrap"
              >
                {getBenefitCta(fxBrokers[0].broker, "calculator")}
              </a>
            </div>
          )}
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
  const [marginalRate, setMarginalRate] = useState("32.5");
  const [held12Months, setHeld12Months] = useState(true);

  const gain = parseFloat(gainAmount) || 0;
  const mr = (parseFloat(marginalRate) || 0) / 100;

  // Without discount
  const taxWithout = gain * mr;
  const effectiveWithout = gain > 0 ? (taxWithout / gain) * 100 : 0;

  // With 50% discount (only if held >12 months)
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <InputField label="Capital Gain ($)" value={gainAmount} onChange={setGainAmount} placeholder="10000" />
        <InputField label="Marginal Tax Rate (%)" value={marginalRate} onChange={setMarginalRate} placeholder="32.5" />
        <div className="flex items-end pb-1">
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
      </div>

      {showResults && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Without discount */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
            <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-3">Without CGT Discount</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Taxable Gain</span>
                <span className="font-semibold">{formatCurrency(gain)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Tax Payable</span>
                <span className="font-semibold text-red-600">{formatCurrency(taxWithout)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Effective Rate</span>
                <span className="font-semibold">{effectiveWithout.toFixed(1)}%</span>
              </div>
            </div>
          </div>

          {/* With discount */}
          <div
            className={`border rounded-xl p-5 ${
              held12Months ? "bg-green-50 border-green-200" : "bg-slate-50 border-slate-200"
            }`}
          >
            <h4
              className={`text-sm font-bold uppercase tracking-wide mb-3 ${
                held12Months ? "text-green-700" : "text-slate-500"
              }`}
            >
              {held12Months ? "With 50% CGT Discount" : "No Discount (< 12 months)"}
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Taxable Gain</span>
                <span className="font-semibold">{formatCurrency(discountedGain)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Tax Payable</span>
                <span className={`font-semibold ${held12Months ? "text-green-700" : "text-red-600"}`}>
                  {formatCurrency(taxWith)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Effective Rate</span>
                <span className="font-semibold">{effectiveWith.toFixed(1)}%</span>
              </div>
            </div>
          </div>

          {/* Tax saved summary */}
          {held12Months && taxSaved > 0 && (
            <div className="md:col-span-2 bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <p className="text-green-800 font-bold text-lg">
                You save {formatCurrency(taxSaved)} in tax by holding for 12+ months.
              </p>
              <p className="text-green-700 text-sm mt-1">
                Effective tax rate drops from {effectiveWithout.toFixed(1)}% to {effectiveWith.toFixed(1)}%.
              </p>
            </div>
          )}
        </div>
      )}
    </CalcSection>
  );
}

/* ──────────────────────────────────────────────
   5) CHESS Lookup
   ────────────────────────────────────────────── */
function ChessLookup({ brokers }: { brokers: Broker[] }) {
  const [selectedSlug, setSelectedSlug] = useState("");
  const broker = brokers.find((b) => b.slug === selectedSlug);

  return (
    <CalcSection
      id="chess"
      emoji={"\u{1F512}"}
      title="CHESS Sponsorship Lookup"
      desc="Check if a broker uses CHESS sponsorship or a custodial model, and what it means for you."
    >
      <div className="max-w-md">
        <label className="block text-sm font-medium text-slate-700 mb-1">Select Broker</label>
        <select
          value={selectedSlug}
          onChange={(e) => setSelectedSlug(e.target.value)}
          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none transition-all"
        >
          <option value="">Choose a broker...</option>
          {brokers.map((b) => (
            <option key={b.slug} value={b.slug}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      {broker && (
        <div className="mt-6">
          <div
            className={`border rounded-xl p-6 ${
              broker.chess_sponsored ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"
            }`}
          >
            <div className="flex items-start gap-4">
              <span className="text-4xl">{broker.chess_sponsored ? "\u{2705}" : "\u{1F6E1}\u{FE0F}"}</span>
              <div className="flex-1">
                <h4 className="text-lg font-bold text-slate-900 mb-1">
                  {broker.name} &mdash;{" "}
                  {broker.chess_sponsored ? "CHESS Sponsored" : "Custodial Model"}
                </h4>

                {broker.chess_sponsored ? (
                  <div className="text-sm text-slate-700 space-y-2 mt-2">
                    <p>
                      <strong>What this means:</strong> Your shares are held directly in your name on the ASX CHESS
                      sub-register. You receive a unique Holder Identification Number (HIN) from ASX.
                    </p>
                    <p>
                      <strong>Safety:</strong> If {broker.name} were to go bankrupt, your shares are still registered
                      in your name with the ASX. They are not the broker&apos;s assets and cannot be claimed by their
                      creditors. You can transfer your HIN to another CHESS-sponsored broker.
                    </p>
                    <p>
                      <strong>Trade-off:</strong> CHESS-sponsored brokers may charge slightly higher fees for the added
                      safety and direct ownership benefits.
                    </p>
                  </div>
                ) : (
                  <div className="text-sm text-slate-700 space-y-2 mt-2">
                    <p>
                      <strong>What this means:</strong> Your shares are held in a pooled custodial account (an
                      &ldquo;omnibus&rdquo; account) under the broker&apos;s name, not directly in your name on the ASX
                      register.
                    </p>
                    <p>
                      <strong>Safety:</strong> The broker is required by ASIC to segregate your holdings from their own
                      assets. However, in a broker insolvency, recovery can be slower and more complex than with
                      CHESS sponsorship. You do not receive a personal HIN.
                    </p>
                    <p>
                      <strong>Trade-off:</strong> Custodial models often enable lower fees, fractional shares, and
                      access to international markets that CHESS-sponsored brokers may not offer.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick reference table for all brokers */}
          <div className="mt-6">
            <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-3">All Brokers at a Glance</h4>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-2 font-semibold text-slate-700">Broker</th>
                    <th className="text-left px-4 py-2 font-semibold text-slate-700">Model</th>
                    <th className="text-right px-4 py-2 font-semibold text-slate-700">ASX Fee</th>
                  </tr>
                </thead>
                <tbody>
                  {brokers.map((b) => (
                    <tr
                      key={b.slug}
                      className={`border-b border-slate-100 last:border-0 ${
                        b.slug === selectedSlug ? "bg-amber-50" : ""
                      }`}
                    >
                      <td className="px-4 py-2 font-medium text-slate-800">{b.name}</td>
                      <td className="px-4 py-2">
                        {b.chess_sponsored ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 text-xs rounded border border-green-200 font-medium">
                            CHESS
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded border border-slate-200 font-medium">
                            Custodial
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right text-slate-700">{b.asx_fee || "N/A"}</td>
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

function CalcSection({
  id,
  emoji,
  title,
  desc,
  children,
}: {
  id: string;
  emoji: string;
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm scroll-mt-24">
      <div className="bg-brand text-white px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="text-xl">{emoji}</span>
          <h2 className="text-xl font-extrabold">{title}</h2>
        </div>
        <p className="text-sm text-slate-300 mt-1 ml-9">{desc}</p>
      </div>
      <div className="p-6 md:p-8 bg-white">
        {children}
      </div>
    </section>
  );
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none transition-all"
      />
    </div>
  );
}

function ResultBox({
  label,
  value,
  positive,
  negative,
}: {
  label: string;
  value: string;
  positive?: boolean;
  negative?: boolean;
}) {
  const bg = positive
    ? "bg-green-50 border border-green-200"
    : negative
    ? "bg-red-50 border border-red-200"
    : "bg-slate-50 border border-slate-200";
  const textColor = positive ? "text-green-700" : negative ? "text-red-600" : "text-slate-900";

  return (
    <div className={`rounded-xl p-5 ${bg}`}>
      <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">{label}</div>
      <div className={`text-2xl font-extrabold ${textColor}`}>{value}</div>
    </div>
  );
}
