"use client";

import { useState, useEffect, useMemo, useId } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import CalculatorLeadCapture from "@/components/CalculatorLeadCapture";
import { trackEvent } from "@/lib/tracking";
import { computeInvestmentIncomeTax } from "@/lib/calculators/investment-income-tax";

const AUD = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
  maximumFractionDigits: 0,
});

/** Parse a money-ish string ("$1,200") into a non-negative number. */
function parseMoney(value: string): number {
  const n = parseFloat(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

interface MoneyFieldProps {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

function MoneyField({ label, hint, value, onChange, placeholder }: MoneyFieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-slate-700 mb-1">
        {label}
      </label>
      {hint && (
        <p id={hintId} className="text-xs text-slate-500 mb-1.5 leading-snug">
          {hint}
        </p>
      )}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" aria-hidden="true">
          $
        </span>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-describedby={hint ? hintId : undefined}
          className="w-full pl-7 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
        />
      </div>
    </div>
  );
}

export default function InvestmentIncomeTaxClient() {
  const [salary, setSalary] = useState("90,000");
  const [interest, setInterest] = useState("2,000");
  const [unfranked, setUnfranked] = useState("0");
  const [franked, setFranked] = useState("7,000");
  const [frankingPct, setFrankingPct] = useState("100");
  const [capitalGain, setCapitalGain] = useState("0");
  const [cgtDiscount, setCgtDiscount] = useState(true);
  const [includeMedicare, setIncludeMedicare] = useState(true);

  const result = useMemo(
    () =>
      computeInvestmentIncomeTax({
        otherTaxableIncome: parseMoney(salary),
        interest: parseMoney(interest),
        unfrankedDividends: parseMoney(unfranked),
        frankedDividends: parseMoney(franked),
        frankingPct: parseMoney(frankingPct),
        capitalGain: parseMoney(capitalGain),
        capitalGainDiscountEligible: cgtDiscount,
        includeMedicare,
      }),
    [salary, interest, unfranked, franked, frankingPct, capitalGain, cgtDiscount, includeMedicare],
  );

  // Debounced usage tracking — mirrors the franking calculator.
  useEffect(() => {
    const timer = setTimeout(() => {
      trackEvent(
        "calculator_use",
        {
          calc_type: "investment-income-tax",
          investment_income: Math.round(
            result.totalAssessableIncome - result.otherTaxableIncome,
          ),
          net_tax: Math.round(result.taxOnInvestmentIncome),
        },
        "/investment-income-tax-calculator",
      );
    }, 2000);
    return () => clearTimeout(timer);
  }, [result]);

  const cashInvestmentIncome =
    result.interest +
    result.unfrankedDividends +
    result.frankedDividends +
    result.capitalGain;
  const hasIncome = cashInvestmentIncome > 0 || result.otherTaxableIncome > 0;
  const isRefund = result.refund > 0;

  return (
    <div className="py-5 md:py-12">
      <div className="container-custom max-w-3xl">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="text-xs md:text-sm text-slate-500 mb-3 md:mb-6">
          <Link href="/" className="hover:text-slate-900">Home</Link>
          <span className="mx-1.5 md:mx-2">/</span>
          <Link href="/calculators" className="hover:text-slate-900">Calculators</Link>
          <span className="mx-1.5 md:mx-2">/</span>
          <span className="text-slate-700">Investment Income Tax Calculator</span>
        </nav>

        {/* Hero */}
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl p-5 md:p-8 text-white mb-6 relative overflow-hidden">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm px-3 py-1 rounded-full mb-3">
              <Icon name="calculator" size={14} className="text-white" />
              <span className="text-xs font-bold uppercase tracking-wide">Investment Income Tax Calculator</span>
            </div>
            <h1 className="text-2xl md:text-4xl font-extrabold mb-2 leading-tight">
              Tax on Your Investment Income
            </h1>
            <p className="text-sm md:text-base text-indigo-100 max-w-2xl">
              Add up the tax on your interest, dividends and capital gains in one place. We stack your
              investment income on top of your salary, apply Australia&apos;s progressive resident tax rates and
              the Medicare levy, then net off your franking credits and the 50% CGT discount.
            </p>
          </div>
          <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/5 rounded-full" />
          <div className="absolute -right-24 -top-16 w-64 h-64 bg-white/5 rounded-full" />
        </div>

        {/* Calculator */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 md:p-6 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
            {/* Inputs */}
            <form
              className="lg:col-span-5 space-y-4"
              aria-label="Investment income inputs"
              onSubmit={(e) => e.preventDefault()}
            >
              <MoneyField
                label="Other taxable income"
                hint="Your salary or other income before investments. Sets your tax bracket."
                value={salary}
                onChange={setSalary}
                placeholder="90,000"
              />
              <MoneyField
                label="Interest income"
                hint="Bank, term deposit and bond interest."
                value={interest}
                onChange={setInterest}
                placeholder="0"
              />
              <MoneyField
                label="Franked dividends (cash)"
                hint="Cash received before grossing up."
                value={franked}
                onChange={setFranked}
                placeholder="0"
              />
              <div>
                <label
                  htmlFor="franking-pct"
                  className="block text-sm font-semibold text-slate-700 mb-1"
                >
                  Franking percentage
                </label>
                <div className="relative">
                  <input
                    id="franking-pct"
                    type="text"
                    inputMode="numeric"
                    value={frankingPct}
                    onChange={(e) => setFrankingPct(e.target.value)}
                    placeholder="100"
                    className="w-full pl-3 pr-7 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" aria-hidden="true">
                    %
                  </span>
                </div>
              </div>
              <MoneyField
                label="Unfranked / foreign dividends"
                hint="Dividends with no franking credit attached."
                value={unfranked}
                onChange={setUnfranked}
                placeholder="0"
              />
              <MoneyField
                label="Capital gain (this year)"
                hint="Sale proceeds minus cost base, before any discount."
                value={capitalGain}
                onChange={setCapitalGain}
                placeholder="0"
              />

              <label className="flex items-center gap-2.5 cursor-pointer select-none pt-1">
                <input
                  type="checkbox"
                  checked={cgtDiscount}
                  onChange={(e) => setCgtDiscount(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand/40"
                />
                <span className="text-sm text-slate-700">
                  Held over 12 months <span className="text-slate-500">(50% CGT discount)</span>
                </span>
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeMedicare}
                  onChange={(e) => setIncludeMedicare(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand/40"
                />
                <span className="text-sm text-slate-700">
                  Include 2% Medicare levy
                </span>
              </label>
            </form>

            {/* Results */}
            <div className="lg:col-span-7">
              <div
                className="bg-slate-50 border border-slate-200 rounded-xl p-4 md:p-6 h-full"
                role="region"
                aria-live="polite"
                aria-atomic="true"
                aria-label="Estimated tax results"
              >
                {hasIncome ? (
                  <>
                    {/* Hero figure */}
                    <div className="pb-4 mb-4 border-b border-slate-200">
                      <span className="text-[0.69rem] md:text-xs font-bold uppercase tracking-wider text-slate-500">
                        {isRefund ? "Estimated refund from franking credits" : "Tax on your investment income"}
                      </span>
                      <div
                        className={`text-3xl md:text-4xl font-extrabold tracking-tight mt-0.5 ${
                          isRefund ? "text-emerald-600" : "text-indigo-700"
                        }`}
                      >
                        {isRefund
                          ? AUD.format(result.refund)
                          : AUD.format(Math.max(0, result.taxOnInvestmentIncome))}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {cashInvestmentIncome > 0 ? (
                          <>
                            Effective rate on {AUD.format(cashInvestmentIncome)} of cash income:{" "}
                            <strong className="text-slate-700">
                              {result.effectiveRateOnInvestmentIncome.toFixed(1)}%
                            </strong>
                          </>
                        ) : (
                          "Enter some investment income to see your estimated tax."
                        )}
                      </p>
                    </div>

                    {/* Breakdown */}
                    <dl className="space-y-2.5 text-sm">
                      <Row label="Assessable interest" value={AUD.format(result.interest)} muted={result.interest === 0} />
                      <Row label="Unfranked / foreign dividends" value={AUD.format(result.unfrankedDividends)} muted={result.unfrankedDividends === 0} />
                      <Row label="Franked dividends (cash)" value={AUD.format(result.frankedDividends)} muted={result.frankedDividends === 0} />
                      <Row label="+ Franking credits (gross-up)" value={AUD.format(result.frankingCredits)} accent="emerald" muted={result.frankingCredits === 0} />
                      <Row
                        label={cgtDiscount ? "Assessable capital gain (after 50% discount)" : "Assessable capital gain"}
                        value={AUD.format(result.assessableCapitalGain)}
                        muted={result.assessableCapitalGain === 0}
                      />
                      <div className="border-t border-slate-200 pt-2.5">
                        <Row label="Total assessable income" value={AUD.format(result.totalAssessableIncome)} strong />
                      </div>
                      <Row label="Income tax (progressive)" value={AUD.format(result.incomeTax)} />
                      {includeMedicare && (
                        <Row label="Medicare levy (2%)" value={AUD.format(result.medicareLevy)} />
                      )}
                      <Row label="Less franking credit offset" value={`- ${AUD.format(result.frankingCredits)}`} accent="emerald" muted={result.frankingCredits === 0} />
                      <div className="border-t border-slate-200 pt-2.5">
                        <Row
                          label={result.netTaxPayable < 0 ? "Net refund" : "Net tax payable (total income)"}
                          value={
                            result.netTaxPayable < 0
                              ? AUD.format(-result.netTaxPayable)
                              : AUD.format(result.netTaxPayable)
                          }
                          strong
                          accent={result.netTaxPayable < 0 ? "emerald" : undefined}
                        />
                      </div>
                    </dl>

                    {isRefund && (
                      <div className="mt-5 bg-emerald-50 border border-emerald-200 rounded-lg p-3.5 flex gap-2.5 items-start">
                        <span className="text-emerald-600 mt-0.5 shrink-0">
                          <Icon name="info" size={18} />
                        </span>
                        <p className="text-sm text-emerald-900 leading-relaxed">
                          Your franking credits exceed the tax on your income, so the ATO may refund the
                          difference of <strong>{AUD.format(result.refund)}</strong> in cash.
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-10 flex flex-col items-center justify-center h-full">
                    <Icon name="bar-chart" size={36} className="text-slate-300 mb-3" />
                    <h2 className="text-base md:text-lg font-bold text-slate-900 mb-1">Enter your income</h2>
                    <p className="text-xs md:text-sm text-slate-500 max-w-xs">
                      Add your salary and investment income to estimate your tax.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Explainer + FAQ */}
        <div className="mt-8 md:mt-12 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 md:p-6">
            <h2 className="text-base md:text-lg font-bold text-slate-900 mb-3">
              How investment income is taxed in Australia
            </h2>
            <div className="space-y-3 text-sm text-slate-600 leading-relaxed">
              <p>
                Australia does not have a separate &quot;investment income tax&quot; rate. Your interest,
                dividends and net capital gains are simply added to the rest of your assessable income — usually
                your salary — and the combined total is taxed at the progressive resident rates, plus the 2%
                Medicare levy. That is why this calculator asks for your other taxable income first: the bracket
                your investment income lands in depends on what sits beneath it.
              </p>
              <p>
                <strong className="text-slate-900">Dividends and franking credits:</strong> Franked dividends
                come with a credit for company tax already paid. You add the cash dividend plus its franking
                credit (the &quot;grossed-up&quot; amount) to your income, then claim the credit back as a
                refundable offset. Below the 30% company rate you get a refund; above it you pay top-up tax.
              </p>
              <p>
                <strong className="text-slate-900">Capital gains:</strong> A realised gain is added to your
                income in the year you sell. Hold the asset more than 12 months as an individual and only half
                the gain is assessable, thanks to the 50% CGT discount.
              </p>
              <p>
                <strong className="text-slate-900">Resident rates used here ({"2024-25"}):</strong> nil up to
                $18,200, then 16% to $45,000, 30% to $135,000, 37% to $190,000 and 45% above. The Medicare levy
                of 2% applies on top.
              </p>
            </div>
            <p className="text-[0.65rem] text-slate-500 mt-4 leading-relaxed">
              This calculator is a simplified estimate for general information only and is not tax advice. It
              ignores the Medicare levy surcharge, low-income offsets, HELP/HECS debts, the 45-day franking
              holding rule, capital losses, and non-resident, super-fund and company rates. Always consult a
              registered tax agent for your situation.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-base md:text-lg font-bold text-slate-900">Frequently Asked Questions</h2>
            <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
              {[
                {
                  q: "How is investment income taxed in Australia?",
                  a: "There is no separate investment income tax rate. Interest, dividends and net capital gains are added to your other assessable income and taxed together at the progressive resident rates plus the 2% Medicare levy. Franking credits reduce the bill and the 50% CGT discount halves long-held gains.",
                },
                {
                  q: "Do franking credits reduce my tax?",
                  a: "Yes. You include the grossed-up dividend (cash plus the franking credit) in your income, then claim the franking credit as a refundable offset. If your marginal rate is below 30% you receive a cash refund of the excess; above 30% you pay top-up tax on the difference.",
                },
                {
                  q: "Why do you ask for my salary?",
                  a: "Because Australia's tax scale is progressive, your investment income is taxed at the rate of the bracket it falls into once stacked on top of your salary. Without your other income we couldn't tell whether your dividends are taxed at 16%, 30%, 37% or 45%.",
                },
                {
                  q: "Is the capital gain figure before or after the discount?",
                  a: "Enter the gross gain — sale proceeds minus your cost base — before any discount. If you tick 'held over 12 months', the calculator applies the 50% CGT discount for you, so only half the gain is added to your taxable income.",
                },
                {
                  q: "Is this the same as my full tax return?",
                  a: "No. It estimates the tax attributable to your investment income at current resident rates. It does not model the Medicare levy surcharge, low-income tax offset, HELP/HECS repayments, capital losses, or super-fund, company and non-resident rates. Use it as a guide and confirm with a registered tax agent.",
                },
              ].map(({ q, a }) => (
                <div key={q} className="p-4 md:p-5">
                  <p className="text-sm font-semibold text-slate-900 mb-1">{q}</p>
                  <p className="text-xs md:text-sm text-slate-500 leading-relaxed">{a}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <p className="text-[0.69rem] md:text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Related Calculators</p>
            <div className="flex flex-wrap gap-2">
              <Link href="/franking-credits-calculator" className="text-xs px-2.5 py-1 border border-slate-200 rounded-lg hover:bg-white transition-colors">
                Franking Credits →
              </Link>
              <Link href="/cgt-calculator" className="text-xs px-2.5 py-1 border border-slate-200 rounded-lg hover:bg-white transition-colors">
                CGT Calculator →
              </Link>
              <Link href="/calculators" className="text-xs px-2.5 py-1 border border-slate-200 rounded-lg hover:bg-white transition-colors">
                All Calculators →
              </Link>
            </div>
          </div>

          <CalculatorLeadCapture
            calcSlug="investment-income-tax-calculator"
            calcTitle="investment income tax"
            need="tax"
            contextKeys={["investment-income", "dividends", "interest", "tax"]}
          />
        </div>
      </div>
    </div>
  );
}

interface RowProps {
  label: string;
  value: string;
  strong?: boolean;
  muted?: boolean;
  accent?: "emerald";
}

function Row({ label, value, strong, muted, accent }: RowProps) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className={`${muted ? "text-slate-500" : "text-slate-600"} ${strong ? "font-bold text-slate-900" : ""}`}>
        {label}
      </dt>
      <dd
        className={`tabular-nums shrink-0 ${
          accent === "emerald" ? "text-emerald-600" : muted ? "text-slate-500" : "text-slate-900"
        } ${strong ? "font-extrabold text-base" : "font-semibold"}`}
      >
        {value}
      </dd>
    </div>
  );
}
