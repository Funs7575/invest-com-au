"use client";

import dynamic from "next/dynamic";
import type { Broker } from "@/lib/types";

const SwitchingCalculatorClient = dynamic(
  () => import("@/app/switching-calculator/SwitchingCalculatorClient"),
  { loading: () => <div className="p-8 text-center text-slate-400 text-sm">Loading calculator...</div> }
);

export default function InlineSwitchingCalc({ brokers }: { brokers: Broker[] }) {
  return (
    <div>
      <h2 className="text-base md:text-2xl font-bold mb-0.5 md:mb-1">Switching Calculator</h2>
      <p className="text-[0.69rem] md:text-sm text-slate-500 mb-3 md:mb-6">
        How much could you save by switching to a cheaper broker?
      </p>
      <SwitchingCalculatorClient brokers={brokers} inline />
    </div>
  );
}
