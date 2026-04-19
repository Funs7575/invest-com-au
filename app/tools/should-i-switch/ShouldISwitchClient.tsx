"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import type { Broker } from "@/lib/types";
import { getAffiliateLink } from "@/lib/tracking";

type AssetMix = "asx" | "us" | "mixed";

interface CostBreakdown {
  broker: Broker;
  asxBrokerage: number;
  usBrokerage: number;
  fxCost: number;
  inactivity: number;
  total: number;
}

function parseInactivityAnnual(raw: string | null | undefined): number {
  if (!raw) return 0;
  const s = raw.trim();
  if (!s || /^(none|no|\$?0)$/i.test(s)) return 0;
  const m = s.match(/\$(\d+(?:\.\d+)?)/);
  if (!m) return 0;
  const amount = parseFloat(m[1]!);
  if (/month/i.test(s)) return amount * 12;
  if (/qtr|quarter/i.test(s)) return amount * 4;
  return amount;
}

function computeAnnualCost(
  broker: Broker,
  tradesPerMonth: number,
  avgTradeSize: number,
  mix: AssetMix,
): CostBreakdown {
  const totalAnnualTrades = tradesPerMonth * 12;

  let asxShare = 0;
  let usShare = 0;
  if (mix === "asx") asxShare = 1;
  else if (mix === "us") usShare = 1;
  else {
    asxShare = 0.5;
    usShare = 0.5;
  }

  const asxTrades = totalAnnualTrades * asxShare;
  const usTrades = totalAnnualTrades * usShare;

  const asxBrokerage = (broker.asx_fee_value ?? 0) * asxTrades;
  const usBrokerage = (broker.us_fee_value ?? 0) * usTrades;
  const fxCost = ((broker.fx_rate ?? 0) / 100) * avgTradeSize * usTrades;
  const inactivity = parseInactivityAnnual(broker.inactivity_fee);

  const total = asxBrokerage + usBrokerage + fxCost + inactivity;
  return { broker, asxBrokerage, usBrokerage, fxCost, inactivity, total };
}

function brokerHasRequiredFees(broker: Broker, mix: AssetMix): boolean {
  const asxKnown = broker.asx_fee_value != null;
  const usKnown = broker.us_fee_value != null && broker.fx_rate != null;
  if (mix === "asx") return asxKnown;
  if (mix === "us") return usKnown;
  return asxKnown && usKnown;
}

function formatMoney(n: number): string {
  return n.toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  });
}

export default function ShouldISwitchClient({
  brokers,
}: {
  brokers: Broker[];
}) {
  const [currentSlug, setCurrentSlug] = useState<string>("");
  const [tradesPerMonth, setTradesPerMonth] = useState<number>(2);
  const [avgTradeSize, setAvgTradeSize] = useState<number>(2000);
  const [mix, setMix] = useState<AssetMix>("asx");

  const results = useMemo(() => {
    const eligible = brokers.filter((b) => brokerHasRequiredFees(b, mix));
    const ranked = eligible
      .map((b) => computeAnnualCost(b, tradesPerMonth, avgTradeSize, mix))
      .sort((a, z) => a.total - z.total);
    return ranked;
  }, [brokers, tradesPerMonth, avgTradeSize, mix]);

  const current = useMemo(
    () => results.find((r) => r.broker.slug === currentSlug) ?? null,
    [results, currentSlug],
  );

  const alternatives = useMemo(() => {
    const top = results.filter((r) => r.broker.slug !== currentSlug).slice(0, 3);
    return top;
  }, [results, currentSlug]);

  const annualSavings =
    current && alternatives[0] ? Math.max(0, current.total - alternatives[0].total) : 0;
  const tenYearSavings = annualSavings * 10;
  const hasChoice = Boolean(currentSlug) && Boolean(current);

  return (
    <div className="py-5 md:py-12">
      <div className="container-custom max-w-3xl">
        <nav className="text-xs md:text-sm text-slate-500 mb-3 md:mb-6">
          <Link href="/" className="hover:text-slate-900">
            Home
          </Link>
          <span className="mx-1.5 md:mx-2">/</span>
          <Link href="/tools" className="hover:text-slate-900">
            Tools
          </Link>
          <span className="mx-1.5 md:mx-2">/</span>
          <span className="text-slate-700">Should I Switch Broker?</span>
        </nav>

        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-5 md:p-8 text-white mb-6 relative overflow-hidden">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm px-3 py-1 rounded-full mb-3">
              <Icon name="arrow-right" size={14} className="text-white" />
              <span className="text-xs font-bold uppercase tracking-wide">
                Switch Calculator
              </span>
            </div>
            <h1 className="text-2xl md:text-4xl font-extrabold mb-2 leading-tight">
              Should I switch broker?
            </h1>
            <p className="text-sm md:text-base text-amber-50 max-w-2xl">
              Pick your current broker, tell us how you invest, and we&apos;ll
              compute the annual cost across every Australian platform — then
              rank the top three alternatives by real $ saved.
            </p>
          </div>
          <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/5 rounded-full" />
          <div className="absolute -right-24 -top-16 w-64 h-64 bg-white/5 rounded-full" />
        </div>

        <section className="bg-white border border-slate-200 rounded-xl p-5 md:p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
            <label className="block">
              <span className="block text-xs font-semibold text-slate-700 mb-1.5">
                Your current broker
              </span>
              <select
                value={currentSlug}
                onChange={(e) => setCurrentSlug(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">Select a broker…</option>
                {brokers.map((b) => (
                  <option key={b.slug} value={b.slug}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="block text-xs font-semibold text-slate-700 mb-1.5">
                Asset mix
              </span>
              <select
                value={mix}
                onChange={(e) => setMix(e.target.value as AssetMix)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="asx">ASX shares only</option>
                <option value="us">US shares only</option>
                <option value="mixed">Mixed — 50% ASX, 50% US</option>
              </select>
            </label>

            <label className="block">
              <span className="block text-xs font-semibold text-slate-700 mb-1.5">
                Trades per month
              </span>
              <input
                type="number"
                min={0}
                step={1}
                value={tradesPerMonth}
                onChange={(e) =>
                  setTradesPerMonth(Math.max(0, Number(e.target.value) || 0))
                }
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <span className="block text-[11px] text-slate-500 mt-1">
                {tradesPerMonth * 12} trades/year
              </span>
            </label>

            <label className="block">
              <span className="block text-xs font-semibold text-slate-700 mb-1.5">
                Average trade size (AUD)
              </span>
              <input
                type="number"
                min={0}
                step={100}
                value={avgTradeSize}
                onChange={(e) =>
                  setAvgTradeSize(Math.max(0, Number(e.target.value) || 0))
                }
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <span className="block text-[11px] text-slate-500 mt-1">
                Annual turnover:{" "}
                {formatMoney(tradesPerMonth * 12 * avgTradeSize)}
              </span>
            </label>
          </div>
        </section>

        {hasChoice && current ? (
          <section className="bg-slate-900 text-white rounded-2xl p-5 md:p-7 mb-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-amber-300">
                  Verdict
                </div>
                <h2 className="text-xl md:text-2xl font-bold mt-1">
                  {annualSavings > 50 ? (
                    <>
                      Yes — switching to{" "}
                      <span className="text-amber-300">
                        {alternatives[0]?.broker.name}
                      </span>{" "}
                      saves you {formatMoney(annualSavings)} per year.
                    </>
                  ) : annualSavings > 0 ? (
                    <>
                      Maybe — you&apos;d save only{" "}
                      {formatMoney(annualSavings)} a year. Not worth switching
                      unless you value other features.
                    </>
                  ) : (
                    <>
                      No — you&apos;re already on the cheapest broker for this
                      profile.
                    </>
                  )}
                </h2>
                <p className="text-sm text-slate-300 mt-2">
                  Your current annual cost on{" "}
                  <strong>{current.broker.name}</strong>:{" "}
                  <strong>{formatMoney(current.total)}</strong>. Over 10 years
                  of the same trading profile, switching would save{" "}
                  <strong>{formatMoney(tenYearSavings)}</strong> before
                  compounding.
                </p>
              </div>
            </div>
          </section>
        ) : null}

        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-6">
          <div className="p-4 md:p-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm md:text-base font-bold text-slate-900">
              {hasChoice
                ? "Top 3 cheapest alternatives"
                : "Cheapest brokers for your profile"}
            </h3>
            <span className="text-[11px] text-slate-500">
              Ranked by annual cost
            </span>
          </div>
          <ol className="divide-y divide-slate-100">
            {(hasChoice ? alternatives : results.slice(0, 5)).map((r, idx) => {
              const delta = current ? current.total - r.total : 0;
              return (
                <li
                  key={r.broker.slug}
                  className="p-4 md:p-5 flex items-center justify-between gap-4 flex-wrap"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-7 h-7 shrink-0 rounded-full bg-amber-50 text-amber-700 text-xs font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <Link
                        href={`/broker/${r.broker.slug}`}
                        className="text-sm md:text-base font-semibold text-slate-900 hover:text-amber-700 truncate block"
                      >
                        {r.broker.name}
                      </Link>
                      <div className="text-[11px] text-slate-500">
                        {formatMoney(r.total)}/yr
                        {r.fxCost > 0
                          ? ` · inc. ${formatMoney(r.fxCost)} FX`
                          : ""}
                        {r.inactivity > 0
                          ? ` · ${formatMoney(r.inactivity)} inactivity`
                          : ""}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {hasChoice && delta > 0 ? (
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 rounded-full px-2.5 py-1">
                        Save {formatMoney(delta)}/yr
                      </span>
                    ) : null}
                    <a
                      href={getAffiliateLink(r.broker)}
                      target="_blank"
                      rel="sponsored noopener noreferrer"
                      className="text-xs md:text-sm font-semibold bg-amber-500 hover:bg-amber-600 text-white rounded-lg px-3 py-2 transition"
                    >
                      {r.broker.cta_text || "Visit broker"}
                    </a>
                  </div>
                </li>
              );
            })}
          </ol>
          {results.length === 0 ? (
            <div className="p-5 text-sm text-slate-500">
              No brokers have complete fee data for this asset mix. Try another
              mix.
            </div>
          ) : null}
        </section>

        <section className="bg-white border border-slate-200 rounded-xl p-5 md:p-6 mb-6">
          <h3 className="text-sm md:text-base font-bold text-slate-900 mb-3">
            How we calculate this
          </h3>
          <ul className="text-sm text-slate-600 space-y-1.5 leading-relaxed list-disc pl-5">
            <li>
              ASX brokerage = headline per-trade fee × ASX trades per year
            </li>
            <li>
              US brokerage = headline per-trade fee × US trades per year
            </li>
            <li>
              FX cost = FX margin % × average trade size × US trades per year
            </li>
            <li>
              Inactivity fee parsed from the broker&apos;s published schedule
            </li>
          </ul>
          <p className="text-xs text-slate-500 mt-3 leading-relaxed">
            Numbers use each broker&apos;s published fees. Real trading costs
            can differ due to tiered pricing, promotional rates, and
            corporate-action fees. Always check the broker&apos;s full PDS
            before switching. This is general information, not personal
            advice.
          </p>
        </section>

        <section className="bg-white border border-slate-200 rounded-xl p-5 md:p-6">
          <h3 className="text-sm md:text-base font-bold text-slate-900 mb-3">
            Before you switch
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-slate-600">
            <div>
              <strong className="text-slate-900">CHESS vs custodial.</strong>{" "}
              If you want to hold shares in your own name, pick a
              CHESS-sponsored broker even if it&apos;s slightly more
              expensive.
            </div>
            <div>
              <strong className="text-slate-900">Transfer costs.</strong> Some
              brokers charge $50-$110 to transfer existing holdings out. Check
              both sides.
            </div>
            <div>
              <strong className="text-slate-900">Off-market transfer.</strong>{" "}
              CHESS → CHESS transfers are usually free between brokers. Your
              new broker handles the paperwork.
            </div>
            <div>
              <strong className="text-slate-900">Don&apos;t sell.</strong>{" "}
              Selling to re-buy elsewhere triggers CGT. Transfer the holding
              instead.
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <Link
              href="/compare"
              className="inline-flex items-center gap-1 text-amber-700 hover:text-amber-800 font-semibold"
            >
              Compare all brokers →
            </Link>
            <Link
              href="/best/low-fees"
              className="inline-flex items-center gap-1 text-amber-700 hover:text-amber-800 font-semibold"
            >
              Best for low fees →
            </Link>
            <Link
              href="/trade-cost-calculator"
              className="inline-flex items-center gap-1 text-amber-700 hover:text-amber-800 font-semibold"
            >
              Per-trade cost calculator →
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
