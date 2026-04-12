"use client";

import { useState, useMemo } from "react";
import {
  getParam, useUrlSync, CalcSection, InputField, ResultBox, ShareResultsButton,
} from "./CalcShared";

interface Props {
  searchParams: URLSearchParams;
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(n);
}

export default function SMSFQuickView({ searchParams }: Props) {
  const [balance, setBalance] = useState(() => getParam(searchParams, "s_b") || "250000");
  const [smsfCost, setSmsfCost] = useState(() => getParam(searchParams, "s_c") || "2500");
  const [industryFee, setIndustryFee] = useState(() => getParam(searchParams, "s_i") || "0.85");

  useUrlSync({ calc: "smsf", s_b: balance, s_c: smsfCost, s_i: industryFee });

  const result = useMemo(() => {
    const B = parseFloat(balance) || 0;
    const C = parseFloat(smsfCost) || 0;
    const iPct = (parseFloat(industryFee) || 0) / 100;

    const smsfPct = B > 0 ? (C / B) * 100 : 0;
    const industryCost = B * iPct;
    const industryPct = (parseFloat(industryFee) || 0);
    const difference = industryCost - C;
    const breakeven = iPct > 0 ? C / iPct : 0;
    const worthIt = B >= breakeven && breakeven > 0;

    return { smsfPct, industryCost, industryPct, difference, breakeven, worthIt };
  }, [balance, smsfCost, industryFee]);

  const showResults = (parseFloat(balance) || 0) > 0;

  return (
    <CalcSection
      id="smsf"
      iconName="landmark"
      title="SMSF Calculator"
      desc="Is a self-managed super fund worth the cost for your balance?"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
        <InputField label="SMSF Balance" value={balance} onChange={setBalance} prefix="$" placeholder="250000" />
        <InputField label="Annual SMSF Cost" value={smsfCost} onChange={setSmsfCost} prefix="$" placeholder="2500" />
        <InputField label="Industry Fund Fee" value={industryFee} onChange={setIndustryFee} suffix="%" placeholder="0.85" />
      </div>

      {showResults ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <ResultBox label="SMSF Cost %" value={`${result.smsfPct.toFixed(2)}%`} />
            <ResultBox label="Industry Fund Cost" value={fmt(result.industryCost)} />
            <ResultBox
              label="Annual Difference"
              value={fmt(Math.abs(result.difference))}
              positive={result.difference > 0}
              negative={result.difference < 0}
            />
          </div>
          <div className={`mt-4 rounded-xl p-4 border ${result.worthIt ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">SMSF worth it?</div>
            <div className={`text-base font-bold ${result.worthIt ? "text-emerald-800" : "text-amber-800"}`}>
              {result.worthIt
                ? `Yes — at this balance, SMSF fees are cheaper than an industry fund.`
                : `Probably not — you'd need a balance of around ${fmt(result.breakeven)} before SMSF costs break even.`}
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-3">
            i — Breakeven = SMSF annual cost / industry fund % fee. Below this, a percentage-based fund is usually cheaper.
          </p>
        </>
      ) : (
        <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center">
          <p className="text-slate-400 text-sm">Enter your super balance to compare.</p>
        </div>
      )}

      <ShareResultsButton />
    </CalcSection>
  );
}
