"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Link from "next/link";
import type { Broker } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import {
  trackClick,
  trackEvent,
  getAffiliateLink,
  getBenefitCta,
  AFFILIATE_REL,
} from "@/lib/tracking";
import { downloadCSV } from "@/lib/csv-export";
import { useSubscription } from "@/lib/hooks/useSubscription";
import { useSearchParams } from "next/navigation";
import Icon from "@/components/Icon";
import AuthorByline from "@/components/AuthorByline";

/* ──────────────────────────────────────────────
   URL state sync helpers
   ────────────────────────────────────────────── */
function getParam(sp: URLSearchParams, key: string): string | null {
  return sp.get(key);
}

function useUrlSync(params: Record<string, string>, delay = 500) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSerialized = useRef<string>("");
  const paramsKey = JSON.stringify(params);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (typeof window === "undefined") return;
      const url = new URL(window.location.href);
      const parsed = JSON.parse(paramsKey) as Record<string, string>;
      for (const [k, v] of Object.entries(parsed)) {
        if (v) {
          url.searchParams.set(k, v);
        } else {
          url.searchParams.delete(k);
        }
      }
      const serialized = url.searchParams.toString();
      if (serialized !== lastSerialized.current) {
        lastSerialized.current = serialized;
        window.history.replaceState(null, "", url.toString());
      }
    }, delay);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [paramsKey, delay]);
}

function ShareResultsButton() {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    if (typeof window === "undefined") return;
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, []);

  return (
    <div className="mt-4 flex items-center gap-3 text-xs">
      <button
        onClick={handleCopy}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
        {copied ? "Copied!" : "Share Results"}
      </button>
      <Link href="/methodology" className="text-slate-400 hover:text-slate-600 transition-colors">
        How we calculated this →
      </Link>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Shared UI Components (copied from CalculatorsClient)
   ────────────────────────────────────────────── */

function AnimatedNumber({
  value,
  prefix = "$",
  decimals = 2,
}: {
  value: number;
  prefix?: string;
  decimals?: number;
}) {
  const [display, setDisplay] = useState(value);
  const [flash, setFlash] = useState(false);
  const ref = useRef(value);
  useEffect(() => {
    const start = ref.current;
    const end = value;
    if (start !== end) {
      setFlash(true);
      setTimeout(() => setFlash(false), 600);
    }
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
    <span
      className={`inline-block transition-colors duration-300 ${flash ? "text-slate-700" : ""}`}
    >
      {prefix}
      {display.toLocaleString("en-AU", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
    </span>
  );
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
  prefix,
  suffix,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
        {label}
      </label>
      <div className="relative">
        {prefix && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">
            {prefix}
          </div>
        )}
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full bg-white border border-slate-200 rounded-lg py-2.5 shadow-sm focus:outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700 transition-all font-medium ${prefix ? "pl-7" : "pl-4"} ${suffix ? "pr-10" : "pr-4"}`}
        />
        {suffix && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">
            {suffix}
          </div>
        )}
      </div>
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  placeholder,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 shadow-sm focus:outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700 transition-all font-medium"
      >
        <option value="">{placeholder}</option>
        {children}
      </select>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Inactivity fee parser
   ────────────────────────────────────────────── */

function parseInactivityFeeAnnual(fee: string | undefined | null): number {
  if (!fee) return 0;
  const lower = fee.toLowerCase().trim();
  if (lower === "none" || lower === "no" || lower === "$0" || lower === "n/a")
    return 0;

  // Extract the first dollar amount
  const amountMatch = fee.match(/\$(\d+(?:\.\d+)?)/);
  if (!amountMatch) return 0;
  const amount = parseFloat(amountMatch[1]);

  // Determine frequency
  if (/\/month|\/mo/i.test(fee)) return amount * 12;
  if (/\/qtr|\/quarter/i.test(fee)) return amount * 4;
  if (/\/yr|\/year|\/annum/i.test(fee)) return amount;

  // Default: assume annual
  return amount;
}

/* ──────────────────────────────────────────────
   Fee result type
   ────────────────────────────────────────────── */

interface FeeResult {
  broker: Broker;
  asxFees: number;
  usFees: number;
  fxFees: number;
  inactivityFees: number;
  totalAnnual: number;
}

/* ──────────────────────────────────────────────
   Constants
   ────────────────────────────────────────────── */

const FREE_ROWS = 3;

/* ──────────────────────────────────────────────
   Root component
   ────────────────────────────────────────────── */

interface Props {
  brokers: Broker[];
}

export default function FeeImpactClient({ brokers }: Props) {
  const { user, isPro, loading: authLoading } = useSubscription();
  const searchParams = useSearchParams();

  const [asxTrades, setAsxTrades] = useState(() => getParam(searchParams, "asx") || "4");
  const [usTrades, setUsTrades] = useState(() => getParam(searchParams, "us") || "0");
  const [avgTradeSize, setAvgTradeSize] = useState(() => getParam(searchParams, "size") || "5000");
  const [portfolioValue, setPortfolioValue] = useState(() => getParam(searchParams, "pv") || "");
  const [currentBrokerSlug, setCurrentBrokerSlug] = useState(() => getParam(searchParams, "broker") || "");
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");

  useUrlSync({ asx: asxTrades, us: usTrades, size: avgTradeSize, pv: portfolioValue, broker: currentBrokerSlug });

  // Load saved profile on mount
  useEffect(() => {
    if (authLoading || !user || profileLoaded) return;
    setProfileLoaded(true);

    fetch("/api/fee-profile")
      .then((res) => res.json())
      .then((data) => {
        if (data.profile) {
          const p = data.profile;
          setAsxTrades(String(p.asx_trades_per_month ?? 4));
          setUsTrades(String(p.us_trades_per_month ?? 0));
          setAvgTradeSize(String(p.avg_trade_size ?? 5000));
          if (p.portfolio_value) setPortfolioValue(String(p.portfolio_value));
          if (p.current_broker_slug) setCurrentBrokerSlug(p.current_broker_slug);
        }
      })
      .catch(() => {});
  }, [authLoading, user, profileLoaded]);

  // Save profile handler
  const handleSaveProfile = async () => {
    if (!isPro || saving) return;
    setSaving(true);
    setSaveStatus("idle");
    try {
      const res = await fetch("/api/fee-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asx_trades_per_month: parseInt(asxTrades) || 4,
          us_trades_per_month: parseInt(usTrades) || 0,
          avg_trade_size: parseInt(avgTradeSize) || 5000,
          portfolio_value: portfolioValue ? parseInt(portfolioValue) : null,
          current_broker_slug: currentBrokerSlug || null,
        }),
      });
      if (res.ok) {
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 3000);
      } else {
        setSaveStatus("error");
      }
    } catch {
      setSaveStatus("error");
    } finally {
      setSaving(false);
    }
  };

  // Debounced analytics tracking
  useEffect(() => {
    const timer = setTimeout(() => {
      if (asxTrades !== "4" || usTrades !== "0" || avgTradeSize !== "5000") {
        trackEvent(
          "calculator_use",
          {
            calc_type: "fee-impact",
            asx_trades: asxTrades,
            us_trades: usTrades,
            avg_trade_size: avgTradeSize,
          },
          "/fee-impact"
        );
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [asxTrades, usTrades, avgTradeSize]);

  // Calculate fees for all brokers
  const results = useMemo<FeeResult[]>(() => {
    const asxPerMonth = Math.max(0, parseFloat(asxTrades) || 0);
    const usPerMonth = Math.max(0, parseFloat(usTrades) || 0);
    const tradeSize = Math.max(0, parseFloat(avgTradeSize) || 0);

    return brokers
      .map((b) => {
        // ASX fees
        const asxFeeVal = b.asx_fee_value ?? null;
        const hasAsx =
          asxFeeVal !== null && asxFeeVal < 999 && asxPerMonth > 0;
        const asxFees = hasAsx ? asxPerMonth * 12 * asxFeeVal : 0;

        // US brokerage fees
        const usFeeVal = b.us_fee_value ?? null;
        const hasUs = usFeeVal !== null && usFeeVal < 999 && usPerMonth > 0;
        const usFees = hasUs ? usPerMonth * 12 * usFeeVal : 0;

        // FX conversion fees on US trades
        const fxRate = b.fx_rate ?? 0;
        const fxFees =
          usPerMonth > 0 ? usPerMonth * 12 * tradeSize * (fxRate / 100) : 0;

        // Inactivity fee
        const inactivityFees = parseInactivityFeeAnnual(b.inactivity_fee);

        // Skip brokers that don't support the markets the user trades
        if (asxPerMonth > 0 && (asxFeeVal === null || asxFeeVal >= 999)) {
          if (usPerMonth === 0) return null; // ASX-only user, broker doesn't have ASX fees
        }
        if (usPerMonth > 0 && (usFeeVal === null || usFeeVal >= 999)) {
          if (asxPerMonth === 0) return null; // US-only user, broker doesn't have US fees
        }

        const totalAnnual = asxFees + usFees + fxFees + inactivityFees;

        return {
          broker: b,
          asxFees,
          usFees,
          fxFees,
          inactivityFees,
          totalAnnual,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a!.totalAnnual - b!.totalAnnual) as FeeResult[];
  }, [brokers, asxTrades, usTrades, avgTradeSize]);

  const cheapest = results[0];
  const mostExpensive = results[results.length - 1];
  const currentBrokerResult = results.find(
    (r) => r.broker.slug === currentBrokerSlug
  );
  const maxSavings = currentBrokerResult
    ? currentBrokerResult.totalAnnual - (cheapest?.totalAnnual ?? 0)
    : (mostExpensive?.totalAnnual ?? 0) - (cheapest?.totalAnnual ?? 0);

  const hasResults = results.length > 0;
  const visibleResults = isPro ? results : results.slice(0, FREE_ROWS);
  const hiddenCount = isPro ? 0 : Math.max(results.length - FREE_ROWS, 0);

  // Max total for bar widths
  const maxTotal = mostExpensive?.totalAnnual || 1;

  return (
    <div className="py-12">
      <div className="container-custom">
        {/* Page header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-full mb-4">
            <Icon name="calculator" size={14} />
            PRO TOOL
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-brand tracking-tight mb-3">
            Personal Fee Impact Calculator
          </h1>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
            Enter your trading habits to see your total annual broker fees —
            then find out how much you could save.
          </p>
          <AuthorByline variant="light" />
        </div>

        {/* Main layout */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* ── Inputs ────────────────────────── */}
            <div className="lg:col-span-4">
              <h2 className="text-lg font-bold text-slate-900 mb-1">
                Your Trading Profile
              </h2>
              <p className="text-sm text-slate-500 mb-5">
                Adjust the inputs to match your real trading activity.
              </p>

              <div className="space-y-5">
                <InputField
                  label="ASX Trades per Month"
                  value={asxTrades}
                  onChange={setAsxTrades}
                  placeholder="4"
                />
                <InputField
                  label="US Trades per Month"
                  value={usTrades}
                  onChange={setUsTrades}
                  placeholder="0"
                />
                <InputField
                  label="Average Trade Size"
                  value={avgTradeSize}
                  onChange={setAvgTradeSize}
                  placeholder="5000"
                  prefix="$"
                />
                <InputField
                  label="Portfolio Value (optional)"
                  value={portfolioValue}
                  onChange={setPortfolioValue}
                  placeholder="50000"
                  prefix="$"
                />
                <SelectField
                  label="Your Current Broker"
                  value={currentBrokerSlug}
                  onChange={setCurrentBrokerSlug}
                  placeholder="Select your broker..."
                >
                  {brokers.map((b) => (
                    <option key={b.slug} value={b.slug}>
                      {b.name}
                    </option>
                  ))}
                </SelectField>
              </div>

              {/* Quick info */}
              <div className="mt-6 bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs text-slate-500 leading-relaxed">
                <strong className="text-slate-700">How it works:</strong> We
                multiply your trade frequency by each broker&apos;s published
                fees — including brokerage, FX conversion, and inactivity
                charges — to calculate your real annual cost.
              </div>

              {/* Save profile button (Pro only) */}
              {isPro && (
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-brand text-white font-bold text-sm rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
                >
                  {saving ? (
                    "Saving..."
                  ) : saveStatus === "saved" ? (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Profile Saved!
                    </>
                  ) : saveStatus === "error" ? (
                    "Error — Try Again"
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                      </svg>
                      Save My Profile
                    </>
                  )}
                </button>
              )}
              {!isPro && user && (
                <p className="mt-3 text-xs text-slate-400 text-center">
                  <Link href="/pro" className="text-slate-700 hover:underline font-medium">Upgrade to Pro</Link> to save your trading profile
                </p>
              )}
            </div>

            {/* ── Results ────────────────────────── */}
            <div className="lg:col-span-8">
              {hasResults ? (
                <div className="space-y-6">
                  {/* Hero savings banner */}
                  <div
                    className={`rounded-xl p-6 text-center border ${
                      maxSavings > 0
                        ? "bg-green-50 border-green-200"
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
                          <span className="text-xs font-bold uppercase tracking-wider text-green-700">
                            {currentBrokerResult
                              ? "You Could Save"
                              : "Max Savings"}
                          </span>
                          <div className="text-3xl md:text-4xl font-extrabold text-green-700 tracking-tight mt-1">
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
                      All Brokers Ranked by Annual Cost
                    </h3>

                    {/* Table header */}
                    <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                      <div className="col-span-3">Broker</div>
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
                                ? "bg-green-50 border-green-200 shadow-sm"
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
                                  <span className="text-xs text-green-700 font-semibold">
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
                                <span className="text-xs text-green-700 font-semibold">
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
                        const headers = ["Rank", "Broker", "ASX Fees", "US Fees", "FX Fees", "Inactivity", "Total/yr"];
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
              ) : (
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
              )}
            </div>
          </div>
        </div>

        {/* Related Resources */}
        <div className="mt-8 bg-slate-50 border border-slate-200 rounded-xl p-6">
          <h3 className="text-sm font-bold text-slate-700 mb-3">
            Related Resources
          </h3>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/calculators"
              className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-white transition-colors"
            >
              All Calculators →
            </Link>
            <Link
              href="/compare"
              className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-white transition-colors"
            >
              Compare All Brokers →
            </Link>
            <Link
              href="/calculators?calc=switching"
              className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-white transition-colors"
            >
              Switching Cost Simulator →
            </Link>
            <Link
              href="/quiz"
              className="text-xs px-3 py-1.5 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Take the Broker Quiz →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
