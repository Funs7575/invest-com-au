"use client";

import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import type { Broker } from "@/lib/types";
import { trackClick, getAffiliateLink, getBenefitCta, formatPercent } from "@/lib/tracking";
import StickyCTABar from "@/components/StickyCTABar";

const popularComparisons = [
  { label: "Stake vs CommSec", href: "/versus?vs=stake,commsec" },
  { label: "CMC vs Moomoo", href: "/versus?vs=cmc-markets,moomoo" },
  { label: "Interactive Brokers vs Saxo", href: "/versus?vs=interactive-brokers,saxo" },
];

export default function VersusClient({ brokers }: { brokers: Broker[] }) {
  const searchParams = useSearchParams();
  const [brokerA, setBrokerA] = useState<string>("");
  const [brokerB, setBrokerB] = useState<string>("");

  useEffect(() => {
    // Pre-select from URL params
    const vs = searchParams.get('vs');
    if (vs) {
      const [slugA, slugB] = vs.split(',');
      if (slugA) setBrokerA(slugA);
      if (slugB) setBrokerB(slugB);
    }
    const a = searchParams.get('a');
    const b = searchParams.get('b');
    if (a) setBrokerA(a);
    if (b) setBrokerB(b);
  }, [searchParams]);

  const a = brokers.find(b => b.slug === brokerA);
  const b = brokers.find(br => br.slug === brokerB);

  // Compute verdicts
  const verdicts = useMemo(() => {
    if (!a || !b) return [];
    return [
      {
        cat: 'Cheapest ASX Trading',
        winner: (a.asx_fee_value ?? 999) <= (b.asx_fee_value ?? 999) ? a.name : b.name,
        reason: (a.asx_fee_value ?? 999) <= (b.asx_fee_value ?? 999)
          ? `${a.name} charges ${a.asx_fee} vs ${b.name}'s ${b.asx_fee}`
          : `${b.name} charges ${b.asx_fee} vs ${a.name}'s ${a.asx_fee}`,
      },
      {
        cat: 'Best for US Shares',
        winner: (a.fx_rate ?? 999) <= (b.fx_rate ?? 999) ? a.name : b.name,
        reason: `${(a.fx_rate ?? 999) <= (b.fx_rate ?? 999) ? a.name : b.name} has lower FX rate: ${formatPercent(Math.min(a.fx_rate ?? 999, b.fx_rate ?? 999))} vs ${formatPercent(Math.max(a.fx_rate ?? 999, b.fx_rate ?? 999))}`,
      },
      {
        cat: 'Safety (CHESS)',
        winner: a.chess_sponsored && !b.chess_sponsored ? a.name : !a.chess_sponsored && b.chess_sponsored ? b.name : 'Tie',
        reason: a.chess_sponsored && b.chess_sponsored ? 'Both are CHESS sponsored' : a.chess_sponsored ? `${a.name} is CHESS sponsored; ${b.name} uses custodial` : b.chess_sponsored ? `${b.name} is CHESS sponsored; ${a.name} uses custodial` : 'Neither is CHESS sponsored',
      },
      {
        cat: 'SMSF Support',
        winner: a.smsf_support && !b.smsf_support ? a.name : !a.smsf_support && b.smsf_support ? b.name : a.smsf_support ? 'Tie' : 'Neither',
        reason: a.smsf_support && b.smsf_support ? 'Both support SMSF' : a.smsf_support ? `Only ${a.name} supports SMSF` : b.smsf_support ? `Only ${b.name} supports SMSF` : 'Neither supports SMSF',
      },
    ];
  }, [a, b]);

  // Overall winner
  const { overallWinner, aWins, bWins } = useMemo(() => {
    if (!a || !b) return { overallWinner: null, aWins: 0, bWins: 0 };
    let aw = 0, bw = 0;
    verdicts.forEach(v => { if (v.winner === a.name) aw++; else if (v.winner === b.name) bw++; });
    if ((a.rating ?? 0) > (b.rating ?? 0)) aw++; else if ((b.rating ?? 0) > (a.rating ?? 0)) bw++;
    return {
      overallWinner: aw > bw ? a : bw > aw ? b : (a.rating ?? 0) >= (b.rating ?? 0) ? a : b,
      aWins: aw,
      bWins: bw,
    };
  }, [a, b, verdicts]);

  const rows = a && b ? [
    { l: 'ASX Brokerage', va: a.asx_fee || 'N/A', vb: b.asx_fee || 'N/A' },
    { l: 'US Brokerage', va: a.us_fee || 'N/A', vb: b.us_fee || 'N/A' },
    { l: 'FX Rate', va: a.fx_rate != null ? formatPercent(a.fx_rate) : 'N/A', vb: b.fx_rate != null ? formatPercent(b.fx_rate) : 'N/A' },
    { l: 'CHESS', va: a.chess_sponsored ? 'Yes' : 'No', vb: b.chess_sponsored ? 'Yes' : 'No' },
    { l: 'SMSF', va: a.smsf_support ? 'Yes' : 'No', vb: b.smsf_support ? 'Yes' : 'No' },
    { l: 'Inactivity Fee', va: a.inactivity_fee || 'None', vb: b.inactivity_fee || 'None' },
    { l: 'Rating', va: `${a.rating}/5`, vb: `${b.rating}/5` },
  ] : [];

  return (
    <div className="py-12">
      <div className="container-custom max-w-4xl">
        {/* Breadcrumb */}
        <div className="text-sm text-slate-500 mb-6">
          <Link href="/" className="hover:text-brand">Home</Link>
          <span className="mx-2">/</span>
          <Link href="/compare" className="hover:text-brand">Compare</Link>
          <span className="mx-2">/</span>
          <span className="text-brand">{a && b ? `${a.name} vs ${b.name}` : 'Versus'}</span>
        </div>

        <h1 className="text-3xl md:text-4xl font-extrabold mb-2">
          {a && b ? `${a.name} vs ${b.name}: The Honest Truth (2026)` : 'Broker vs Broker'}
        </h1>
        <p className="text-slate-600 mb-8">
          {a && b ? 'A no-nonsense comparison. Which broker actually deserves your money?' : 'Compare two brokers side by side to see which suits you better.'}
        </p>

        {/* Selectors */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-2">Broker A</label>
            <select
              value={brokerA}
              onChange={(e) => setBrokerA(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-4 py-3 text-brand bg-white"
            >
              <option value="">Select a broker...</option>
              {brokers.map(br => (
                <option key={br.slug} value={br.slug}>{br.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end justify-center pb-3">
            <span className="text-2xl font-bold text-slate-300">VS</span>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-2">Broker B</label>
            <select
              value={brokerB}
              onChange={(e) => setBrokerB(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-4 py-3 text-brand bg-white"
            >
              <option value="">Select a broker...</option>
              {brokers.map(br => (
                <option key={br.slug} value={br.slug}>{br.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Results */}
        {a && b && overallWinner && (
          <>
            {/* Winner Banner */}
            <div className="rounded-xl p-5 flex items-center gap-4 flex-wrap mb-2" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
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
                  Wins {Math.max(aWins, bWins)} of {verdicts.length} categories with a {overallWinner.rating}/5 rating.{' '}
                  {overallWinner.chess_sponsored ? 'CHESS sponsored for safety.' : 'Lower fees make up for custodial model.'}
                </div>
              </div>
              <a
                href={getAffiliateLink(overallWinner)}
                target="_blank"
                rel="noopener noreferrer nofollow"
                onClick={() => trackClick(overallWinner.slug, overallWinner.name, 'versus-winner', '/versus', 'versus')}
                className="shrink-0 px-6 py-3 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800 transition-colors"
              >
                {getBenefitCta(overallWinner, 'versus')}
              </a>
            </div>
            <p className="text-xs text-slate-400 mb-6">
              We may earn a commission if you open an account via our links, at no extra cost to you.
            </p>

            {/* Verdict Breakdown */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 mb-8">
              <h2 className="font-extrabold text-lg mb-4">Category Breakdown</h2>
              <div className="space-y-3">
                {verdicts.map((v, i) => (
                  <div key={i} className="flex items-start gap-4 pb-3 border-b border-slate-100 last:border-b-0 last:pb-0">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wide w-32 shrink-0 pt-0.5">{v.cat}</span>
                    <div>
                      <span className="font-bold text-sm text-amber-700">{v.winner}</span>
                      <div className="text-xs text-slate-500">{v.reason}</div>
                    </div>
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
                    <th className="px-5 py-3 text-left text-sm font-semibold">Feature</th>
                    <th className="px-5 py-3 text-center text-sm font-bold">{a.name}</th>
                    <th className="px-5 py-3 text-center text-sm font-bold">{b.name}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {rows.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-5 py-3 text-sm font-medium text-slate-600">{r.l}</td>
                      <td className="px-5 py-3 text-sm text-center font-semibold">{r.va}</td>
                      <td className="px-5 py-3 text-sm text-center font-semibold">{r.vb}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pros/Cons Side by Side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {[a, b].map(br => (
                <div key={br.slug}>
                  <h3 className="text-lg font-bold mb-3">{br.name}</h3>
                  <div className="mb-3">
                    <h4 className="text-xs font-semibold text-green-700 mb-2">Pros</h4>
                    <ul className="space-y-1">
                      {br.pros?.map((p, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                          <span className="text-green-600">+</span> {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="mb-3">
                    <h4 className="text-xs font-semibold text-red-700 mb-2">Cons</h4>
                    <ul className="space-y-1">
                      {br.cons?.map((c, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                          <span className="text-red-600">-</span> {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <a
                    href={getAffiliateLink(br)}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="inline-block px-4 py-2 bg-amber text-white text-sm font-semibold rounded-lg hover:bg-amber-600 transition-colors"
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
              <Link href="/calculators?calc=switching" className="inline-block px-6 py-3 bg-amber text-white font-semibold rounded-lg hover:bg-amber-600 transition-colors">
                Calculate Your Savings
              </Link>
            </div>

            <StickyCTABar broker={overallWinner} detail={`Winner: ${overallWinner.name} · ${overallWinner.rating}/5`} context="versus" />
          </>
        )}

        {(!a || !b) && brokers.length > 0 && (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">&#x2694;&#xFE0F;</div>
            <p className="text-slate-500 text-lg mb-2">Select two brokers above to compare them side by side.</p>
            <p className="text-slate-400 text-sm mb-6">See fees, features, and our honest verdict in seconds.</p>

            <div className="mt-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">Popular comparisons</p>
              <div className="flex flex-wrap justify-center gap-3">
                {popularComparisons.map((c) => (
                  <Link
                    key={c.href}
                    href={c.href}
                    className="px-4 py-2 rounded-full border border-slate-200 text-sm font-medium text-slate-600 hover:border-amber hover:text-amber hover:bg-amber-50 transition-all"
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
