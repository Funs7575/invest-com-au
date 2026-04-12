"use client";

import type { Broker } from "@/lib/types";
import BrokerLogo from "@/components/BrokerLogo";
import Icon from "@/components/Icon";

interface WinnerByScenarioProps {
  brokerA: Broker;
  brokerB: Broker;
}

interface Scenario {
  title: string;
  icon: string;
  description: string;
  pickFn: (a: Broker, b: Broker) => { winner: Broker; reason: string } | null;
}

const SCENARIOS: Scenario[] = [
  {
    title: "Best for Beginners",
    icon: "sprout",
    description: "Easier platform, lower minimums, better learning resources.",
    pickFn: (a, b) => {
      // Prefer lower fees + higher rating
      const scoreA =
        (a.rating || 0) * 2 + (a.asx_fee_value === 0 ? 2 : 0) + (!a.inactivity_fee ? 1 : 0);
      const scoreB =
        (b.rating || 0) * 2 + (b.asx_fee_value === 0 ? 2 : 0) + (!b.inactivity_fee ? 1 : 0);
      if (scoreA === scoreB) return null;
      const winner = scoreA > scoreB ? a : b;
      const loser = scoreA > scoreB ? b : a;
      const reasons: string[] = [];
      if ((winner.rating || 0) > (loser.rating || 0)) reasons.push("higher rating");
      if (winner.asx_fee_value === 0 && loser.asx_fee_value !== 0) reasons.push("$0 brokerage");
      if (!winner.inactivity_fee && loser.inactivity_fee) reasons.push("no inactivity fee");
      return { winner, reason: reasons.length > 0 ? reasons.join(", ") : "better overall score for new investors" };
    },
  },
  {
    title: "Best for Active Traders",
    icon: "trending-up",
    description: "Lowest per-trade costs, best execution, advanced tools.",
    pickFn: (a, b) => {
      // Active traders care about: lowest ASX fee, lowest FX rate
      const feeA = a.asx_fee_value ?? 999;
      const feeB = b.asx_fee_value ?? 999;
      const fxA = a.fx_rate ?? 999;
      const fxB = b.fx_rate ?? 999;
      const scoreA = feeA + fxA * 10;
      const scoreB = feeB + fxB * 10;
      if (scoreA === scoreB) return null;
      const winner = scoreA < scoreB ? a : b;
      const reasons: string[] = [];
      if ((winner.asx_fee_value ?? 999) < ((scoreA < scoreB ? b : a).asx_fee_value ?? 999)) {
        reasons.push(`${winner.asx_fee || "$0"} ASX brokerage`);
      }
      if ((winner.fx_rate ?? 999) < ((scoreA < scoreB ? b : a).fx_rate ?? 999)) {
        reasons.push(`${winner.fx_rate}% FX rate`);
      }
      return {
        winner,
        reason: reasons.length > 0 ? reasons.join(", ") : "lower overall trading costs",
      };
    },
  },
  {
    title: "Best for US Stocks",
    icon: "globe",
    description: "Cheapest access to US markets with competitive FX conversion.",
    pickFn: (a, b) => {
      const usA = a.us_fee_value ?? 999;
      const usB = b.us_fee_value ?? 999;
      const fxA = a.fx_rate ?? 999;
      const fxB = b.fx_rate ?? 999;
      // Combined cost metric
      const costA = usA + fxA * 5;
      const costB = usB + fxB * 5;
      if (costA === costB) return null;
      const winner = costA < costB ? a : b;
      const reasons: string[] = [];
      if ((winner.us_fee_value ?? 999) < ((costA < costB ? b : a).us_fee_value ?? 999)) {
        reasons.push(`${winner.us_fee || "$0"} US brokerage`);
      }
      if ((winner.fx_rate ?? 999) < ((costA < costB ? b : a).fx_rate ?? 999)) {
        reasons.push(`${winner.fx_rate}% FX`);
      }
      return {
        winner,
        reason: reasons.length > 0 ? reasons.join(" + ") : "cheaper US market access",
      };
    },
  },
];

export default function WinnerByScenario({ brokerA, brokerB }: WinnerByScenarioProps) {
  // Only show for share brokers / CFD
  const isRelevant =
    (brokerA.platform_type === "share_broker" || brokerA.platform_type === "cfd_forex") &&
    (brokerB.platform_type === "share_broker" || brokerB.platform_type === "cfd_forex");

  if (!isRelevant) return null;

  const results = SCENARIOS.map((scenario) => ({
    ...scenario,
    result: scenario.pickFn(brokerA, brokerB),
  }));

  // Don't render if all scenarios are ties
  if (results.every((r) => !r.result)) return null;

  return (
    <div className="mb-3 md:mb-8">
      <h2 className="text-base md:text-xl font-extrabold text-slate-900 mb-2 md:mb-4">
        Winner by Scenario
      </h2>
      <div className="grid sm:grid-cols-3 gap-2.5 md:gap-3">
        {results.map((scenario) => (
          <div
            key={scenario.title}
            className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-sm transition-shadow"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                <Icon name={scenario.icon} size={16} className="text-slate-500" />
              </div>
              <div>
                <h3 className="font-bold text-xs text-slate-900">{scenario.title}</h3>
                <p className="text-[0.62rem] text-slate-400">{scenario.description}</p>
              </div>
            </div>

            {scenario.result ? (
              <div className="flex items-center gap-2">
                <BrokerLogo broker={scenario.result.winner} size="sm" />
                <div className="min-w-0">
                  <p
                    className="font-bold text-sm truncate"
                    style={{ color: scenario.result.winner.color }}
                  >
                    {scenario.result.winner.name}
                  </p>
                  <p className="text-[0.62rem] text-slate-500 leading-snug">
                    {scenario.result.reason}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                  <span className="text-xs font-bold text-slate-400">=</span>
                </div>
                <p className="text-xs font-semibold text-slate-500">Tie</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
