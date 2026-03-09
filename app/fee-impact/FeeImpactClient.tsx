"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Link from "next/link";
import type { Broker } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { trackEvent } from "@/lib/tracking";
import { useSubscription } from "@/lib/hooks/useSubscription";
import { useSearchParams } from "next/navigation";
import Icon from "@/components/Icon";
import AuthorByline from "@/components/AuthorByline";

import FeeImpactInputs from "./_components/FeeImpactInputs";
import FeeImpactResults from "./_components/FeeImpactResults";

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
   Shared UI Components
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
        const asxFeeVal = b.asx_fee_value ?? null;
        const hasAsx = asxFeeVal !== null && asxFeeVal < 999 && asxPerMonth > 0;
        const asxFees = hasAsx ? asxPerMonth * 12 * asxFeeVal : 0;

        const usFeeVal = b.us_fee_value ?? null;
        const hasUs = usFeeVal !== null && usFeeVal < 999 && usPerMonth > 0;
        const usFees = hasUs ? usPerMonth * 12 * usFeeVal : 0;

        const fxRate = b.fx_rate ?? 0;
        const fxFees = usPerMonth > 0 ? usPerMonth * 12 * tradeSize * (fxRate / 100) : 0;

        const inactivityFees = parseInactivityFeeAnnual(b.inactivity_fee);

        if (asxPerMonth > 0 && (asxFeeVal === null || asxFeeVal >= 999)) {
          if (usPerMonth === 0) return null;
        }
        if (usPerMonth > 0 && (usFeeVal === null || usFeeVal >= 999)) {
          if (asxPerMonth === 0) return null;
        }

        const totalAnnual = asxFees + usFees + fxFees + inactivityFees;

        return { broker: b, asxFees, usFees, fxFees, inactivityFees, totalAnnual };
      })
      .filter(Boolean)
      .sort((a, b) => a!.totalAnnual - b!.totalAnnual) as FeeResult[];
  }, [brokers, asxTrades, usTrades, avgTradeSize]);

  const cheapest = results[0];
  const mostExpensive = results[results.length - 1];
  const currentBrokerResult = results.find((r) => r.broker.slug === currentBrokerSlug);
  const maxSavings = currentBrokerResult
    ? currentBrokerResult.totalAnnual - (cheapest?.totalAnnual ?? 0)
    : (mostExpensive?.totalAnnual ?? 0) - (cheapest?.totalAnnual ?? 0);

  const visibleResults = isPro ? results : results.slice(0, FREE_ROWS);
  const hiddenCount = isPro ? 0 : Math.max(results.length - FREE_ROWS, 0);
  const maxTotal = mostExpensive?.totalAnnual || 1;

  return (
    <div className="py-5 md:py-12">
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
            Enter your trading habits to see your total annual platform fees —
            then find out how much you could save.
          </p>
          <AuthorByline variant="light" />
        </div>

        {/* Main layout */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <FeeImpactInputs
              brokers={brokers}
              asxTrades={asxTrades}
              usTrades={usTrades}
              avgTradeSize={avgTradeSize}
              portfolioValue={portfolioValue}
              currentBrokerSlug={currentBrokerSlug}
              isPro={isPro}
              user={user}
              saving={saving}
              saveStatus={saveStatus}
              onAsxTradesChange={setAsxTrades}
              onUsTradesChange={setUsTrades}
              onAvgTradeSizeChange={setAvgTradeSize}
              onPortfolioValueChange={setPortfolioValue}
              onCurrentBrokerSlugChange={setCurrentBrokerSlug}
              onSaveProfile={handleSaveProfile}
              InputField={InputField}
              SelectField={SelectField}
            />
            <FeeImpactResults
              results={results}
              visibleResults={visibleResults}
              hiddenCount={hiddenCount}
              cheapest={cheapest}
              mostExpensive={mostExpensive}
              currentBrokerResult={currentBrokerResult}
              maxSavings={maxSavings}
              maxTotal={maxTotal}
              isPro={isPro}
              asxTrades={asxTrades}
              usTrades={usTrades}
              avgTradeSize={avgTradeSize}
              currentBrokerSlug={currentBrokerSlug}
              AnimatedNumber={AnimatedNumber}
              ShareResultsButton={ShareResultsButton}
            />
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
              Compare All Platforms →
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
              Take the Platform Quiz →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
