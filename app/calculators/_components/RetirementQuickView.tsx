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

export default function RetirementQuickView({ searchParams }: Props) {
  const [age, setAge] = useState(() => getParam(searchParams, "r_a") || "35");
  const [retireAge, setRetireAge] = useState(() => getParam(searchParams, "r_ra") || "67");
  const [balance, setBalance] = useState(() => getParam(searchParams, "r_b") || "80000");
  const [contrib, setContrib] = useState(() => getParam(searchParams, "r_c") || "12000");
  const [returnRate, setReturnRate] = useState(() => getParam(searchParams, "r_r") || "7");

  useUrlSync({ calc: "retirement", r_a: age, r_ra: retireAge, r_b: balance, r_c: contrib, r_r: returnRate });

  const result = useMemo(() => {
    const a = parseFloat(age) || 0;
    const ra = parseFloat(retireAge) || 0;
    const PV = parseFloat(balance) || 0;
    const PMT = parseFloat(contrib) || 0;
    const r = (parseFloat(returnRate) || 0) / 100;
    const n = Math.max(0, ra - a);

    const growth = Math.pow(1 + r, n);
    const fvLump = PV * growth;
    const fvContribs = r === 0 ? PMT * n : PMT * ((growth - 1) / r);
    const FV = fvLump + fvContribs;
    const annualIncome = FV * 0.04;
    return { FV, annualIncome, years: n };
  }, [age, retireAge, balance, contrib, returnRate]);

  const showResults = (parseFloat(retireAge) || 0) > (parseFloat(age) || 0);

  return (
    <CalcSection
      id="retirement"
      iconName="umbrella"
      title="Retirement Calculator"
      desc="Project your superannuation balance at retirement"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
        <InputField label="Current Age" value={age} onChange={setAge} placeholder="35" />
        <InputField label="Retirement Age" value={retireAge} onChange={setRetireAge} placeholder="67" />
        <InputField label="Current Balance" value={balance} onChange={setBalance} prefix="$" placeholder="80000" />
        <InputField label="Annual Contributions" value={contrib} onChange={setContrib} prefix="$" placeholder="12000" />
        <InputField label="Expected Return" value={returnRate} onChange={setReturnRate} suffix="%" placeholder="7" />
      </div>

      {showResults ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <ResultBox label="Balance at Retirement" value={fmt(result.FV)} positive />
            <ResultBox label="Annual Income (4% rule)" value={fmt(result.annualIncome)} />
            <ResultBox label="Years of Contributions" value={`${result.years}`} />
          </div>
          <p className="text-xs text-slate-400 mt-3">
            i — FV = PV(1+r)ⁿ + PMT × ((1+r)ⁿ − 1) / r. Retirement income uses the 4% safe withdrawal rule.
          </p>
        </>
      ) : (
        <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center">
          <p className="text-slate-400 text-sm">Retirement age must be greater than current age.</p>
        </div>
      )}

      <ShareResultsButton />
    </CalcSection>
  );
}
