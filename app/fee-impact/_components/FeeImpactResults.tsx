"use client";

import Link from "next/link";
import type { Broker } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { trackClick, trackEvent, getAffiliateLink, getBenefitCta, AFFILIATE_REL } from "@/lib/tracking";
import { downloadCSV } from "@/lib/csv-export";
import Icon from "@/components/Icon";

interface FeeResult {
  broker: Broker;
  asxFees: number;
  usFees: number;
  fxFees: number;
  inactivityFees: number;
  totalAnnual: number;
}

interface Props {
  results: FeeResult[];
  visibleResults: FeeResult[];
  hiddenCount: number;
  cheapest: FeeResult | undefined;
  mostExpensive: FeeResult | undefined;
  currentBrokerResult: FeeResult | undefined;
  maxSavings: number;
  maxTotal: number;
  isPro: boolean;
  asxTrades: string;
  usTrades: string;
  avgTradeSize: string;
  currentBrokerSlug: string;
  AnimatedNumber: React.ComponentType<{ value: number; prefix?: string; decimals?: number }>;
  ShareResultsButton: React.ComponentType;
}

const FREE_ROWS = 3;

export default function FeeImpactResults({
  results,
  visibleResults,
  hiddenCount,
  cheapest,
  mostExpensive,
  currentBrokerResult,
  maxSavings,
  maxTotal,
  isPro,
  asxTrades,
  usTrades,
  avgTradeSize,
  currentBrokerSlug,
  AnimatedNumber,
  ShareResultsButton,
}: Props) {
  if (results.length === 0) {
    return (
      <div className="lg:col-span-8">
        <div className="border-2 border-dashed border-slate-200 rounded-xl p-12 text-center h-full flex flex-col items-center justify-center">
          <Icon
            name="calculator"
            size={48}
            className="text-slate-300 mx-auto mb-4"
          />
          <h3 className="text-lg font-bold text-slate-900 mb-1">
            Enter Your Trading Details
          </h3>
          <p className="text-sm text-slate-500 max-w-xs">
            Fill in your trading frequency and trade size on the left to
            see your annual fee comparison.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="lg:col-span-8">
      <div className="space-y-6">
        {/* Hero savings banner */}
        <div
          className={`rounded-xl p-6 text-center border ${
            maxSavings > 0
              ? "bg-emerald-50 border-emerald-200"
              : "bg-slate-50 border-slate-200"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="text-left">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Cheapest Option
              </span>
              <div className="text-lg font-bold text-slate-900 mt-0.5">
                {cheapest?.broker.name}
              </div>
              <div className="text-3xl md:text-4xl font-extrabold text-brand tracking-tight mt-1">
                <AnimatedNumber value={cheapest?.totalAnnual ?? 0} />
                <span className="text-xl font-bold text-slate-400">
                  /yr
                </span>
              </div>
            </div>
            {maxSavings > 0 && (
              <div className="text-left sm:text-right">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                  {currentBrokerResult
                    ? "You Could Save"
                    : "Max Savings"}
                </span>
                <div className="text-3xl md:text-4xl font-extrabold text-emerald-700 tracking-tight mt-1">
                  <AnimatedNumber value={maxSavings} />
                  <span className="text-xl font-bold text-emerald-500">
                    /yr
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Broker ranking table */}
        <div>
          <h3 className="text-sm font-bold text-slate-700 mb-3">
            All Platforms Ranked by Annual Cost
          </h3>

          {/* Table header */}
          <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            <div className="col-span-3">Platform</div>
            <div className="col-span-2 text-right">ASX Fees</div>
            <div className="col-span-2 text-right">US + FX</div>
            <div className="col-span-1 text-right">Other</div>
            <div className="col-span-2 text-right">Total/yr</div>
            <div className="col-span-2"></div>
          </div>

          {/* Visible rows */}
          <div className="space-y-2">
            {visibleResults.map((r, i) => {
              const savingsVsCurrent = currentBrokerResult
                ? currentBrokerResult.totalAnnual - r.totalAnnual
                : mostExpensive
                  ? mostExpensive.totalAnnual - r.totalAnnual
                  : 0;

              return (
                <div
                  key={r.broker.slug}
                  className={`relative grid grid-cols-1 md:grid-cols-12 gap-2 items-center px-4 py-3 rounded-xl border transition-all ${
                    i === 0
                      ? "bg-emerald-50 border-emerald-200 shadow-sm"
                      : "bg-white border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {/* Broker name + icon */}
                  <div className="md:col-span-3 flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400 w-5">
                        #{i + 1}
                      </span>
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                        style={{
                          background: `${r.broker.color}20`,
                          color: r.broker.color,
                        }}
                      >
                        {r.broker.icon ||
                          r.broker.name.charAt(0)}
                      </div>
                    </div>
                    <div>
                      <div className="font-bold text-sm text-slate-900">
                        {r.broker.name}
                      </div>
                      {i === 0 && (
                        <span className="text-xs text-emerald-700 font-semibold">
                          Cheapest
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Fee breakdown - desktop */}
                  <div className="hidden md:block md:col-span-2 text-right">
                    <span className="text-sm font-semibold text-slate-700">
                      {formatCurrency(r.asxFees)}
                    </span>
                  </div>
                  <div className="hidden md:block md:col-span-2 text-right">
                    <span className="text-sm font-semibold text-slate-700">
                      {formatCurrency(r.usFees + r.fxFees)}
                    </span>
                  </div>
                  <div className="hidden md:block md:col-span-1 text-right">
                    <span className="text-sm font-semibold text-slate-700">
                      {r.inactivityFees > 0
                        ? formatCurrency(r.inactivityFees)
                        : "—"}
                    </span>
                  </div>

                  {/* Mobile fee breakdown */}
                  <div className="md:hidden flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span>
                      ASX: {formatCurrency(r.asxFees)}
                    </span>
                    {(r.usFees > 0 || r.fxFees > 0) && (
                      <span>
                        US+FX:{" "}
                        {formatCurrency(r.usFees + r.fxFees)}
                      </span>
                    )}
                    {r.inactivityFees > 0 && (
                      <span>
                        Inactivity:{" "}
                        {formatCurrency(r.inactivityFees)}
                      </span>
                    )}
                  </div>

                  {/* Total */}
                  <div className="md:col-span-2 text-right">
                    <div className="text-lg font-extrabold text-slate-900">
                      {formatCurrency(r.totalAnnual)}
                    </div>
                    {savingsVsCurrent > 0 && i !== 0 && (
                      <span className="text-xs text-emerald-700 font-semibold">
                        Save {formatCurrency(savingsVsCurrent)}
                      </span>
                    )}
                  </div>

                  {/* CTA */}
                  <div className="md:col-span-2 flex justify-end">
                    <a
                      href={getAffiliateLink(r.broker)}
                      target="_blank"
                      rel={AFFILIATE_REL}
                      onClick={() =>
                        trackClick(
                          r.broker.slug,
                          r.broker.name,
                          "fee-impact-calc",
                          "/fee-impact",
                          "calculator"
                        )
                      }
                      className="px-4 py-2 bg-amber-600 text-white text-xs font-bold rounded-lg hover:bg-amber-700 hover:scale-105 hover:shadow-[0_0_12px_rgba(217,119,6,0.3)] transition-all duration-200 whitespace-nowrap"
                    >
                      {getBenefitCta(r.broker, "calculator")}
                    </a>
                  </div>

                  {/* Fee proportion bar */}
                  <div className="md:col-span-12 mt-1">
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
                      {r.asxFees > 0 && (
                        <div
                          className="h-full bg-blue-500 transition-all duration-500"
                          style={{
                            width: `${(r.asxFees / maxTotal) * 100}%`,
                          }}
                          title={`ASX: ${formatCurrency(r.asxFees)}`}
                        />
                      )}
                      {r.usFees > 0 && (
                        <div
                          className="h-full bg-indigo-500 transition-all duration-500"
                          style={{
                            width: `${(r.usFees / maxTotal) * 100}%`,
                          }}
                          title={`US: ${formatCurrency(r.usFees)}`}
                        />
                      )}
                      {r.fxFees > 0 && (
                        <div
                          className="h-full bg-purple-500 transition-all duration-500"
                          style={{
                            width: `${(r.fxFees / maxTotal) * 100}%`,
                          }}
                          title={`FX: ${formatCurrency(r.fxFees)}`}
                        />
                      )}
                      {r.inactivityFees > 0 && (
                        <div
                          className="h-full bg-red-400 transition-all duration-500"
                          style={{
                            width: `${(r.inactivityFees / maxTotal) * 100}%`,
                          }}
                          title={`Inactivity: ${formatCurrency(r.inactivityFees)}`}
                        />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pro gating overlay */}
          {hiddenCount > 0 && (
            <div className="relative mt-2">
              {/* Blurred preview rows */}
              <div className="space-y-2 blur-sm select-none pointer-events-none">
                {results.slice(FREE_ROWS, FREE_ROWS + 2).map((r) => (
                  <div
                    key={r.broker.slug}
                    className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center px-4 py-3 rounded-xl border border-slate-200 bg-white"
                  >
                    <div className="md:col-span-3 flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400 w-5">
                          #?
                        </span>
                        <div className="w-8 h-8 rounded-lg bg-slate-200" />
                      </div>
                      <div className="h-4 w-24 bg-slate-200 rounded" />
                    </div>
                    <div className="md:col-span-2 text-right">
                      <div className="h-4 w-12 bg-slate-200 rounded ml-auto" />
                    </div>
                    <div className="md:col-span-2 text-right">
                      <div className="h-4 w-12 bg-slate-200 rounded ml-auto" />
                    </div>
                    <div className="md:col-span-1 text-right">
                      <div className="h-4 w-8 bg-slate-200 rounded ml-auto" />
                    </div>
                    <div className="md:col-span-2 text-right">
                      <div className="h-5 w-16 bg-slate-200 rounded ml-auto" />
                    </div>
                    <div className="md:col-span-2" />
                  </div>
                ))}
              </div>

              {/* Upgrade overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-white/60 rounded-xl">
                <div className="text-center px-6 py-5 bg-white border border-slate-200 rounded-xl shadow-lg max-w-sm">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-amber-100 text-amber-700 text-xs font-bold rounded-full mb-3">
                    <svg
                      className="w-3.5 h-3.5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    INVESTOR PRO
                  </div>
                  <h4 className="text-lg font-bold text-slate-900 mb-1">
                    Unlock {hiddenCount} more broker
                    {hiddenCount !== 1 ? "s" : ""}
                  </h4>
                  <p className="text-sm text-slate-500 mb-4">
                    See the complete fee comparison and find the
                    cheapest broker for your trading style.
                  </p>
                  <Link
                    href="/pro"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand text-white font-bold text-sm rounded-lg hover:bg-slate-800 transition-colors"
                  >
                    Upgrade to Pro
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Fee legend */}
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500 pt-2">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-blue-500" />
            ASX Brokerage
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-indigo-500" />
            US Brokerage
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-purple-500" />
            FX Conversion
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-red-400" />
            Inactivity Fee
          </span>
        </div>

        {/* Export Buttons */}
        <div className="flex flex-wrap gap-2 no-print">
          <button
            onClick={() => {
              const headers = ["Rank", "Platform", "ASX Fees", "US Fees", "FX Fees", "Inactivity", "Total/yr"];
              const exportRows = (isPro ? results : results.slice(0, FREE_ROWS));
              const rows = exportRows.map((r, i) => [
                String(i + 1),
                r.broker.name,
                formatCurrency(r.asxFees),
                formatCurrency(r.usFees),
                formatCurrency(r.fxFees),
                r.inactivityFees > 0 ? formatCurrency(r.inactivityFees) : "$0.00",
                formatCurrency(r.totalAnnual),
              ]);
              downloadCSV("fee-impact-results.csv", headers, rows);
              trackEvent("export_csv", { page: "fee-impact", count: String(exportRows.length) }, "/fee-impact");
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-slate-600"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export CSV
          </button>
          <button
            onClick={() => {
              const params = new URLSearchParams({
                asx: asxTrades,
                us: usTrades,
                size: avgTradeSize,
              });
              if (currentBrokerSlug) params.set("broker", currentBrokerSlug);
              window.open(`/export/fee-impact?${params.toString()}`, "_blank");
              trackEvent("export_pdf", { page: "fee-impact" }, "/fee-impact");
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-slate-600"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Export PDF
          </button>
        </div>

        {/* Disclaimer */}
        <p className="text-xs text-slate-400 leading-relaxed">
          Fees are based on each broker&apos;s published standard
          rates as of our most recent audit. Actual costs may vary
          based on account type, trading volume, or promotional
          offers. This calculator is for educational purposes only
          and does not constitute financial advice.
        </p>

        <ShareResultsButton />
      </div>
    </div>
  );
}
