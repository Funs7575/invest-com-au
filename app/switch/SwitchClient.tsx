"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { Broker } from "@/lib/types";
import { getAffiliateLink, trackClick } from "@/lib/tracking";
import RiskWarningInline from "@/components/RiskWarningInline";
import { ADVERTISER_DISCLOSURE_SHORT } from "@/lib/compliance";

const TRANSFER_COST_PER_HOLDING = 54; // Industry standard CHESS transfer

export default function SwitchClient({ brokers }: { brokers: Broker[] }) {
  const [currentSlug, setCurrentSlug] = useState("");
  const [targetSlug, setTargetSlug] = useState("");
  const [holdings, setHoldings] = useState(5);
  const [tradesPerMonth, setTradesPerMonth] = useState(4);

  const currentBroker = useMemo(() => brokers.find(b => b.slug === currentSlug) || null, [brokers, currentSlug]);
  const targetBroker = useMemo(() => brokers.find(b => b.slug === targetSlug) || null, [brokers, targetSlug]);

  const savings = useMemo(() => {
    if (!currentBroker || !targetBroker) return null;
    const currentAnnualFee = (currentBroker.asx_fee_value ?? 0) * tradesPerMonth * 12;
    const targetAnnualFee = (targetBroker.asx_fee_value ?? 0) * tradesPerMonth * 12;
    const annualSavings = currentAnnualFee - targetAnnualFee;
    const transferCost = holdings * TRANSFER_COST_PER_HOLDING;
    const netFirstYear = annualSavings - transferCost;
    return { currentAnnualFee, targetAnnualFee, annualSavings, transferCost, netFirstYear };
  }, [currentBroker, targetBroker, holdings, tradesPerMonth]);

  const steps = [
    "Open an account with the new broker (usually takes 5-10 minutes online)",
    "Verify your identity with the new broker",
    "Initiate a CHESS transfer (also called a broker-to-broker transfer) — your new broker can handle this",
    `Transfer cost: approximately $${holdings * TRANSFER_COST_PER_HOLDING} ($${TRANSFER_COST_PER_HOLDING} per holding × ${holdings} holdings)`,
    "Wait 3-5 business days for the transfer to complete",
    "Verify all holdings have arrived in your new account",
    "Close your old account (check for any exit fees or minimum balance requirements)",
  ];

  return (
    <div className="py-12">
      <div className="container-custom max-w-3xl mx-auto">
        {/* Breadcrumb */}
        <div className="text-sm text-slate-500 mb-6">
          <Link href="/" className="hover:text-brand">Home</Link>
          <span className="mx-2">/</span>
          <span className="text-brand">Switch Brokers</span>
        </div>

        <h1 className="text-3xl md:text-4xl font-extrabold mb-2">Switching Plan Generator</h1>
        <p className="text-slate-600 mb-8">See how much you could save by switching brokers, plus a step-by-step plan.</p>

        {/* Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Current Broker</label>
            <select
              value={currentSlug}
              onChange={e => setCurrentSlug(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-green-700 focus:ring-1 focus:ring-green-700"
            >
              <option value="">Select your current broker...</option>
              {brokers.map(b => (
                <option key={b.slug} value={b.slug}>{b.name} ({b.asx_fee || 'N/A'})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Switch To</label>
            <select
              value={targetSlug}
              onChange={e => setTargetSlug(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-green-700 focus:ring-1 focus:ring-green-700"
            >
              <option value="">Select target broker...</option>
              {brokers.filter(b => b.slug !== currentSlug).map(b => (
                <option key={b.slug} value={b.slug}>{b.name} ({b.asx_fee || 'N/A'})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Number of Holdings</label>
            <input
              type="number"
              min={1}
              max={100}
              value={holdings}
              onChange={e => setHoldings(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-green-700 focus:ring-1 focus:ring-green-700"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Trades per Month</label>
            <input
              type="number"
              min={0}
              max={100}
              value={tradesPerMonth}
              onChange={e => setTradesPerMonth(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-green-700 focus:ring-1 focus:ring-green-700"
            />
          </div>
        </div>

        {/* Savings Result */}
        {savings && targetBroker && (
          <>
            <div className={`rounded-xl p-6 mb-8 border ${savings.annualSavings > 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <h2 className="text-lg font-extrabold mb-4">
                {savings.annualSavings > 0 ? '💰 You could save' : '⚠️ You would pay more'}
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-xs text-slate-500 uppercase font-medium mb-1">Current Annual Cost</p>
                  <p className="text-xl font-extrabold">${savings.currentAnnualFee.toFixed(0)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase font-medium mb-1">New Annual Cost</p>
                  <p className="text-xl font-extrabold text-green-700">${savings.targetAnnualFee.toFixed(0)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase font-medium mb-1">Annual Savings</p>
                  <p className={`text-xl font-extrabold ${savings.annualSavings > 0 ? 'text-green-700' : 'text-red-600'}`}>
                    ${Math.abs(savings.annualSavings).toFixed(0)}/yr
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase font-medium mb-1">Transfer Cost</p>
                  <p className="text-xl font-extrabold text-slate-600">${savings.transferCost}</p>
                </div>
              </div>
              {savings.annualSavings > 0 && (
                <p className="text-sm text-slate-600 mt-4 text-center">
                  <strong>Net first-year savings:</strong> ${savings.netFirstYear.toFixed(0)}{" "}
                  {savings.netFirstYear < 0 && "(transfer cost exceeds first-year savings, but you'll save in year 2+)"}
                </p>
              )}
            </div>

            {/* Step-by-step Checklist */}
            <h2 className="text-xl font-extrabold mb-3">Your Switching Checklist</h2>
            <div className="space-y-3 mb-8">
              {steps.map((step, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-lg">
                  <div className="w-6 h-6 rounded-full bg-green-700 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    {i + 1}
                  </div>
                  <span className="text-sm text-slate-700">{step}</span>
                </div>
              ))}
            </div>

            {/* CTA to target broker */}
            <div className="bg-slate-900 text-white rounded-xl p-6 text-center mb-8">
              <h3 className="text-lg font-extrabold mb-2">Open your {targetBroker.name} account</h3>
              <p className="text-sm text-slate-300 mb-4">Start the switch — account opening usually takes under 10 minutes.</p>
              <a
                href={getAffiliateLink(targetBroker)}
                target="_blank"
                rel="noopener noreferrer nofollow"
                onClick={() => trackClick(targetBroker.slug, targetBroker.name, 'switch-cta', '/switch', 'calculator')}
                className="inline-block px-6 py-3 bg-green-700 text-white font-bold rounded-lg hover:bg-green-600 transition-all"
              >
                Open {targetBroker.name} Account →
              </a>
              <RiskWarningInline />
              <p className="text-xs text-slate-500 mt-2">{ADVERTISER_DISCLOSURE_SHORT}</p>
            </div>
          </>
        )}

        {!savings && (
          <div className="text-center py-12 text-slate-400">
            <p className="text-lg mb-2">Select both brokers above to see your savings.</p>
            <p className="text-sm">We'll generate a personalised switching checklist too.</p>
          </div>
        )}
      </div>
    </div>
  );
}
