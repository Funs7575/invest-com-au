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

export default function PropertyYieldQuickView({ searchParams }: Props) {
  const [price, setPrice] = useState(() => getParam(searchParams, "py_p") || "700000");
  const [rent, setRent] = useState(() => getParam(searchParams, "py_r") || "30000");
  const [costs, setCosts] = useState(() => getParam(searchParams, "py_c") || "5000");

  useUrlSync({ calc: "property-yield", py_p: price, py_r: rent, py_c: costs });

  const result = useMemo(() => {
    const P = parseFloat(price) || 0;
    const R = parseFloat(rent) || 0;
    const C = parseFloat(costs) || 0;
    const grossYield = P > 0 ? (R / P) * 100 : 0;
    const netYield = P > 0 ? ((R - C) / P) * 100 : 0;
    const netIncome = R - C;
    return { grossYield, netYield, netIncome };
  }, [price, rent, costs]);

  const showResults = (parseFloat(price) || 0) > 0;

  return (
    <CalcSection
      id="property-yield"
      iconName="percent"
      title="Property Yield"
      desc="Calculate gross and net rental yield on an investment property"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
        <InputField label="Purchase Price" value={price} onChange={setPrice} prefix="$" placeholder="700000" />
        <InputField label="Annual Rental Income" value={rent} onChange={setRent} prefix="$" placeholder="30000" />
        <InputField label="Annual Costs" value={costs} onChange={setCosts} prefix="$" placeholder="5000" />
      </div>

      {showResults ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <ResultBox
              label="Gross Yield"
              value={`${result.grossYield.toFixed(2)}%`}
              positive={result.grossYield >= 4}
            />
            <ResultBox
              label="Net Yield"
              value={`${result.netYield.toFixed(2)}%`}
              positive={result.netYield >= 3}
              negative={result.netYield < 0}
            />
            <ResultBox
              label="Net Annual Income"
              value={fmt(result.netIncome)}
              positive={result.netIncome > 0}
              negative={result.netIncome < 0}
            />
          </div>
          <p className="text-xs text-slate-400 mt-3">
            i — Gross yield = (rent / price) × 100. Net yield = ((rent − costs) / price) × 100. Costs cover council, insurance, management and repairs.
          </p>
        </>
      ) : (
        <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center">
          <p className="text-slate-400 text-sm">Enter a purchase price to see the yield.</p>
        </div>
      )}

      <ShareResultsButton />
    </CalcSection>
  );
}
