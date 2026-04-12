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

// Given principal P, monthly rate r, monthly payment m, return total interest paid over life of loan.
// If payment doesn't cover interest, returns null.
function amortise(P: number, r: number, m: number) {
  if (P <= 0 || m <= 0) return { months: 0, interest: 0, viable: false };
  if (r === 0) {
    const months = P / m;
    return { months, interest: 0, viable: true };
  }
  if (m <= P * r) return { months: Infinity, interest: Infinity, viable: false };
  const months = -Math.log(1 - (P * r) / m) / Math.log(1 + r);
  const interest = m * months - P;
  return { months, interest, viable: true };
}

export default function DebtQuickView({ searchParams }: Props) {
  const [debt, setDebt] = useState(() => getParam(searchParams, "d_d") || "30000");
  const [oldRate, setOldRate] = useState(() => getParam(searchParams, "d_or") || "18");
  const [payment, setPayment] = useState(() => getParam(searchParams, "d_p") || "800");
  const [newRate, setNewRate] = useState(() => getParam(searchParams, "d_nr") || "9");

  useUrlSync({ calc: "debt", d_d: debt, d_or: oldRate, d_p: payment, d_nr: newRate });

  const result = useMemo(() => {
    const P = parseFloat(debt) || 0;
    const orMonthly = ((parseFloat(oldRate) || 0) / 100) / 12;
    const nrMonthly = ((parseFloat(newRate) || 0) / 100) / 12;
    const m = parseFloat(payment) || 0;

    const current = amortise(P, orMonthly, m);
    // New consolidation scenario — keep the same payoff period as current if viable, so we can compute savings on payment
    // Simpler approach: compute new monthly required to pay off over same period, then compare
    let newMonthly = 0;
    let newInterest = 0;
    if (P > 0 && current.viable && current.months > 0 && isFinite(current.months)) {
      const n = current.months;
      if (nrMonthly === 0) {
        newMonthly = P / n;
      } else {
        newMonthly = (P * nrMonthly * Math.pow(1 + nrMonthly, n)) / (Math.pow(1 + nrMonthly, n) - 1);
      }
      newInterest = newMonthly * n - P;
    }

    const monthlySavings = current.viable ? m - newMonthly : 0;
    const interestSaved = current.viable ? current.interest - newInterest : 0;

    return {
      viable: current.viable,
      monthlySavings,
      interestSaved,
      months: current.months,
    };
  }, [debt, oldRate, payment, newRate]);

  const showResults = (parseFloat(debt) || 0) > 0 && (parseFloat(payment) || 0) > 0;

  return (
    <CalcSection
      id="debt"
      iconName="credit-card"
      title="Debt Consolidation"
      desc="Could consolidating your debts save you money?"
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-5">
        <InputField label="Current Total Debt" value={debt} onChange={setDebt} prefix="$" placeholder="30000" />
        <InputField label="Current Avg Rate" value={oldRate} onChange={setOldRate} suffix="%" placeholder="18" />
        <InputField label="Monthly Payment" value={payment} onChange={setPayment} prefix="$" placeholder="800" />
        <InputField label="New Rate" value={newRate} onChange={setNewRate} suffix="%" placeholder="9" />
      </div>

      {showResults ? (
        <>
          {result.viable ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <ResultBox label="Monthly Savings" value={fmt(result.monthlySavings)} positive={result.monthlySavings > 0} />
              <ResultBox label="Total Interest Saved" value={fmt(result.interestSaved)} positive={result.interestSaved > 0} />
              <ResultBox label="Months to Pay Off" value={`${Math.round(result.months)}`} />
            </div>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
              Your monthly payment is too low to cover interest at the current rate — debt would grow indefinitely.
            </div>
          )}
          <p className="text-xs text-slate-400 mt-3">
            i — Compares total interest on your current loan vs. a new loan at the lower rate over the same payoff period.
          </p>
        </>
      ) : (
        <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center">
          <p className="text-slate-400 text-sm">Enter your current debt and payment to compare.</p>
        </div>
      )}

      <ShareResultsButton />
    </CalcSection>
  );
}
