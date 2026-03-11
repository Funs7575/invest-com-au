"use client";

import dynamic from "next/dynamic";
import type { Broker } from "@/lib/types";

const PortfolioCalculatorClient = dynamic(
  () => import("@/app/portfolio-calculator/PortfolioCalculatorClient"),
  { loading: () => <div className="p-8 text-center text-slate-400 text-sm">Loading calculator...</div> }
);

export default function InlinePortfolioCalc({ brokers }: { brokers: Broker[] }) {
  return (
    <div>
      <h2 className="text-base md:text-2xl font-bold mb-0.5 md:mb-1">Portfolio Fee Calculator</h2>
      <p className="text-[0.69rem] md:text-sm text-slate-500 mb-3 md:mb-6">
        Enter your trading activity and see exactly what you&apos;d pay at every Australian broker.
      </p>
      <PortfolioCalculatorClient brokers={brokers} inline />
    </div>
  );
}
