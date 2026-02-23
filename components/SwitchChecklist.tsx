"use client";

import { useState } from "react";
import type { Broker, BrokerTransferGuide, TransferStep } from "@/lib/types";

interface ChecklistStep extends TransferStep {
  phase: "open" | "transfer" | "verify";
}

interface Props {
  sourceBroker: Broker;
  targetBroker: Broker;
  holdings: number;
  outboundGuide: BrokerTransferGuide | null;
  inboundGuide: BrokerTransferGuide | null;
}

export default function SwitchChecklist({
  sourceBroker,
  targetBroker,
  holdings,
  outboundGuide,
  inboundGuide,
}: Props) {
  const allSteps: ChecklistStep[] = [
    ...(inboundGuide?.steps.map((s) => ({ ...s, phase: "open" as const })) || []),
    ...(outboundGuide?.steps.map((s) => ({ ...s, phase: "transfer" as const })) || []),
    {
      title: "Verify all holdings transferred",
      description:
        "Check both accounts to confirm all holdings moved correctly with the right quantities.",
      time_estimate: "10 minutes",
      phase: "verify",
    },
    {
      title: "Update tax records",
      description:
        "Ensure your cost base records are preserved for CGT purposes. Keep records of original purchase dates and prices.",
      time_estimate: "15 minutes",
      phase: "verify",
    },
  ];

  const [checked, setChecked] = useState<Set<number>>(new Set());
  const progress = allSteps.length > 0 ? (checked.size / allSteps.length) * 100 : 0;
  const [cgtExpanded, setCgtExpanded] = useState(false);

  const toggle = (index: number) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const chessFee = outboundGuide?.chess_transfer_fee ?? 5400;
  const totalTransferCost = (chessFee / 100) * holdings;
  const inboundDays = inboundGuide?.estimated_timeline_days ?? 2;
  const outboundDays = outboundGuide?.estimated_timeline_days ?? 5;
  const totalTimeline = inboundDays + outboundDays + 1;

  const openSteps = allSteps
    .map((s, i) => ({ ...s, globalIndex: i }))
    .filter((s) => s.phase === "open");
  const transferSteps = allSteps
    .map((s, i) => ({ ...s, globalIndex: i }))
    .filter((s) => s.phase === "transfer");
  const verifySteps = allSteps
    .map((s, i) => ({ ...s, globalIndex: i }))
    .filter((s) => s.phase === "verify");

  return (
    <div className="space-y-6 mt-8">
      <h2 className="text-xl font-extrabold text-slate-900">
        Your Personalised Switching Checklist
      </h2>

      {/* Progress bar */}
      <div className="bg-slate-50 rounded-xl p-4">
        <div className="flex justify-between text-xs text-slate-500 mb-2">
          <span>
            {checked.size} of {allSteps.length} steps complete
          </span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-700 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        {progress === 100 && (
          <div className="mt-3 text-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-800 text-sm font-bold rounded-full">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              Nothing missed — you&apos;re ready to switch!
            </span>
          </div>
        )}
      </div>

      {/* Timeline visualization */}
      <div>
        <h3 className="text-sm font-bold text-slate-700 mb-2">
          Estimated Timeline
        </h3>
        <div className="flex gap-0.5 h-9 rounded-lg overflow-hidden">
          <div
            className="bg-blue-100 flex items-center justify-center text-[0.65rem] font-semibold text-blue-700 px-2 min-w-0"
            style={{ flex: inboundDays }}
          >
            <span className="truncate">Open Account ({inboundDays}d)</span>
          </div>
          <div
            className="bg-amber-100 flex items-center justify-center text-[0.65rem] font-semibold text-amber-700 px-2 min-w-0"
            style={{ flex: outboundDays }}
          >
            <span className="truncate">Transfer ({outboundDays}d)</span>
          </div>
          <div
            className="bg-green-100 flex items-center justify-center text-[0.65rem] font-semibold text-green-700 px-2 min-w-0"
            style={{ flex: 1 }}
          >
            <span className="truncate">Verify (1d)</span>
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-1.5">
          Total: approximately {totalTimeline} business days
        </p>
      </div>

      {/* Transfer cost */}
      {chessFee > 0 && (
        <div
          className={`rounded-lg p-3 text-xs ${
            chessFee !== 5400
              ? "bg-amber-50 border border-amber-200 text-amber-700"
              : "bg-slate-50 border border-slate-200 text-slate-600"
          }`}
        >
          <strong>Transfer cost:</strong> ${totalTransferCost.toFixed(0)} ($
          {(chessFee / 100).toFixed(0)}/holding × {holdings} holdings)
          {chessFee !== 5400 && (
            <span className="block mt-1">
              Note: {sourceBroker.name} charges a non-standard fee (industry
              standard is $54/holding).
            </span>
          )}
        </div>
      )}

      {/* Phase 1: Open Account */}
      {openSteps.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-bold">
              1
            </span>
            Open {targetBroker.name} Account
          </h3>
          <div className="space-y-2">
            {openSteps.map((step) => (
              <StepItem
                key={step.globalIndex}
                step={step}
                isChecked={checked.has(step.globalIndex)}
                onToggle={() => toggle(step.globalIndex)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Phase 2: Transfer */}
      {transferSteps.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-xs flex items-center justify-center font-bold">
              2
            </span>
            Transfer from {sourceBroker.name}
          </h3>
          <div className="space-y-2">
            {transferSteps.map((step) => (
              <StepItem
                key={step.globalIndex}
                step={step}
                isChecked={checked.has(step.globalIndex)}
                onToggle={() => toggle(step.globalIndex)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Phase 3: Verify */}
      <div>
        <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 text-xs flex items-center justify-center font-bold">
            3
          </span>
          Verify &amp; Finalise
        </h3>
        <div className="space-y-2">
          {verifySteps.map((step) => (
            <StepItem
              key={step.globalIndex}
              step={step}
              isChecked={checked.has(step.globalIndex)}
              onToggle={() => toggle(step.globalIndex)}
            />
          ))}
        </div>
      </div>

      {/* Special Requirements */}
      {outboundGuide?.special_requirements &&
        outboundGuide.special_requirements.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h4 className="text-sm font-bold text-amber-800 mb-2">
              ⚠️ {sourceBroker.name} — Important Notes
            </h4>
            <ul className="space-y-1.5">
              {outboundGuide.special_requirements.map((req, i) => (
                <li
                  key={i}
                  className="text-xs text-amber-700 flex items-start gap-2"
                >
                  <span className="text-amber-500 mt-0.5 shrink-0">•</span>
                  {req}
                </li>
              ))}
            </ul>
          </div>
        )}

      {/* In-specie section */}
      {(outboundGuide?.supports_in_specie ||
        inboundGuide?.supports_in_specie) && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="text-sm font-bold text-green-800 mb-1">
            ✅ In-Specie Transfer Available
          </h4>
          <p className="text-xs text-green-700 mb-2">
            Both brokers support in-specie (direct) transfers, meaning your
            shares move without being sold. This avoids triggering a Capital
            Gains Tax event.
          </p>
          {outboundGuide?.in_specie_notes && (
            <p className="text-xs text-green-600 italic">
              {outboundGuide.in_specie_notes}
            </p>
          )}
        </div>
      )}

      {/* Not in-specie warning */}
      {outboundGuide &&
        !outboundGuide.supports_in_specie && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h4 className="text-sm font-bold text-red-800 mb-1">
              ⚠️ Sell &amp; Rebuy Required
            </h4>
            <p className="text-xs text-red-700 mb-2">
              {sourceBroker.name} does not support direct CHESS transfers. You
              will need to sell your holdings and repurchase them on{" "}
              {targetBroker.name}. This will trigger a Capital Gains Tax event.
            </p>
            {outboundGuide.in_specie_notes && (
              <p className="text-xs text-red-600 italic">
                {outboundGuide.in_specie_notes}
              </p>
            )}
          </div>
        )}

      {/* CGT Section */}
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <button
          onClick={() => setCgtExpanded(!cgtExpanded)}
          className="w-full flex items-center justify-between p-4 bg-slate-50 text-sm font-bold text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <span>Capital Gains Tax (CGT) Implications</span>
          <svg
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
              cgtExpanded ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
        {cgtExpanded && (
          <div className="p-4 space-y-3">
            <div className="bg-green-50 rounded-lg p-3">
              <h5 className="text-xs font-bold text-green-800 mb-1">
                In-Specie Transfer (Recommended)
              </h5>
              <p className="text-xs text-green-700">
                Transfers your shares directly without selling. No CGT event is
                triggered. Your cost base and acquisition dates remain unchanged.
              </p>
            </div>
            <div className="bg-red-50 rounded-lg p-3">
              <h5 className="text-xs font-bold text-red-800 mb-1">
                Sell and Rebuy
              </h5>
              <p className="text-xs text-red-700">
                Selling shares triggers a CGT event. If held for over 12 months,
                you may be eligible for the 50% CGT discount. Consider timing
                around the end of financial year (30 June).
              </p>
            </div>
            <p className="text-[0.65rem] text-slate-400 italic">
              This is general information only and does not constitute tax
              advice. Consult a registered tax agent for advice specific to your
              situation.
            </p>
          </div>
        )}
      </div>

      {/* Helpful Links */}
      {((outboundGuide?.helpful_links && outboundGuide.helpful_links.length > 0) ||
        (inboundGuide?.helpful_links && inboundGuide.helpful_links.length > 0)) && (
        <div className="bg-slate-50 rounded-lg p-4">
          <h4 className="text-sm font-bold text-slate-700 mb-2">
            Helpful Links
          </h4>
          <div className="flex flex-wrap gap-2">
            {[
              ...(outboundGuide?.helpful_links || []),
              ...(inboundGuide?.helpful_links || []),
            ].map((link, i) => (
              <a
                key={i}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-green-700 hover:bg-green-50 hover:border-green-200 transition-colors"
              >
                {link.label} →
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Exit fee warning */}
      {outboundGuide?.exit_fees &&
        outboundGuide.exit_fees !== "None" && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-xs text-red-700">
              <strong>Exit fees:</strong> {outboundGuide.exit_fees}
            </p>
          </div>
        )}
    </div>
  );
}

function StepItem({
  step,
  isChecked,
  onToggle,
}: {
  step: ChecklistStep;
  isChecked: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
        isChecked
          ? "bg-green-50 border-green-200"
          : "bg-white border-slate-200"
      }`}
    >
      <button
        onClick={onToggle}
        className="mt-0.5 shrink-0"
        aria-label={isChecked ? "Uncheck step" : "Check step"}
      >
        <div
          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
            isChecked
              ? "bg-green-700 border-green-700"
              : "border-slate-300 hover:border-green-500"
          }`}
        >
          {isChecked && (
            <svg
              className="w-3 h-3 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </svg>
          )}
        </div>
      </button>
      <div className="flex-1 min-w-0">
        <div
          className={`text-sm font-medium ${
            isChecked
              ? "text-green-800 line-through opacity-70"
              : "text-slate-900"
          }`}
        >
          {step.title}
        </div>
        <p className="text-xs text-slate-500 mt-0.5">{step.description}</p>
        <span className="text-[0.65rem] text-slate-400 mt-1 inline-block">
          ⏱ {step.time_estimate}
        </span>
        {step.warning && (
          <div className="mt-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded px-2 py-1">
            ⚠️ {step.warning}
          </div>
        )}
      </div>
    </div>
  );
}
