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

export default function MortgageQuickView({ searchParams }: Props) {
  const [principal, setPrincipal] = useState(() => getParam(searchParams, "m_p") || "500000");
  const [rate, setRate] = useState(() => getParam(searchParams, "m_r") || "6.5");
  const [years, setYears] = useState(() => getParam(searchParams, "m_y") || "30");

  useUrlSync({ calc: "mortgage", m_p: principal, m_r: rate, m_y: years });

  const result = useMemo(() => {
    const P = parseFloat(principal) || 0;
    const annualRate = (parseFloat(rate) || 0) / 100;
    const y = parseFloat(years) || 0;
    const r = annualRate / 12;
    const n = y * 12;

    let monthly = 0;
    if (P > 0 && n > 0) {
      if (r === 0) {
        monthly = P / n;
      } else {
        monthly = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
      }
    }
    const totalPay = monthly * n;
    const totalInterest = totalPay - P;
    return { monthly, totalPay, totalInterest };
  }, [principal, rate, years]);

  const showResults = (parseFloat(principal) || 0) > 0 && (parseFloat(years) || 0) > 0;

  return (
    <CalcSection
      id="mortgage"
      iconName="home"
      title="Mortgage Calculator"
      desc="Estimate your monthly mortgage repayment and total interest"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
        <InputField label="Loan Amount" value={principal} onChange={setPrincipal} prefix="$" placeholder="500000" />
        <InputField label="Interest Rate" value={rate} onChange={setRate} suffix="%" placeholder="6.5" />
        <InputField label="Loan Term (years)" value={years} onChange={setYears} placeholder="30" />
      </div>

      {showResults ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <ResultBox label="Monthly Repayment" value={fmt(result.monthly)} />
            <ResultBox label="Total Interest" value={fmt(result.totalInterest)} negative />
            <ResultBox label="Total to Pay" value={fmt(result.totalPay)} />
          </div>
          <p className="text-xs text-slate-400 mt-3">
            i — Based on a standard amortising loan: M = P × r(1+r)ⁿ / ((1+r)ⁿ − 1), where r is monthly rate and n is months.
          </p>
        </>
      ) : (
        <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center">
          <p className="text-slate-400 text-sm">Enter a loan amount and term to see your repayment.</p>
        </div>
      )}

      <ShareResultsButton />
    </CalcSection>
  );
}
