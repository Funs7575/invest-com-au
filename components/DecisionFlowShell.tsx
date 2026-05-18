"use client";

import { useState } from "react";
import type { DecisionFlow } from "@/lib/decision-flows";

interface Props {
  flow: DecisionFlow;
}

export function DecisionFlowShell({ flow }: Props) {
  const [currentId, setCurrentId] = useState(flow.startId);
  const [history, setHistory] = useState<string[]>([]);

  const node = flow.nodes[currentId];
  if (!node) return null;

  const handleSelect = (nextId: string) => {
    setHistory((h) => [...h, currentId]);
    setCurrentId(nextId);
  };

  const handleBack = () => {
    const prev = history[history.length - 1];
    if (prev !== undefined) {
      setHistory((h) => h.slice(0, -1));
      setCurrentId(prev);
    }
  };

  const handleRestart = () => {
    setHistory([]);
    setCurrentId(flow.startId);
  };

  if (node.type === "outcome") {
    return (
      <div className="max-w-2xl mx-auto">
        {history.length > 0 && (
          <button
            onClick={handleBack}
            className="text-sm text-blue-600 hover:underline mb-4 block"
          >
            ← Back
          </button>
        )}
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl" aria-hidden="true">
              ✓
            </span>
            <h2 className="text-xl font-bold text-emerald-800">{node.title}</h2>
          </div>
          <p className="text-gray-700 mb-3">{node.summary}</p>
          <p className="text-sm text-gray-600 bg-white rounded-lg p-3 border border-emerald-100 mb-5">
            <span className="font-medium text-gray-800">Next step: </span>
            {node.recommendation}
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href={node.primaryCta.href}
              className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-center font-medium hover:bg-blue-700 transition-colors"
            >
              {node.primaryCta.label}
            </a>
            {node.secondaryCta !== undefined && (
              <a
                href={node.secondaryCta.href}
                className="border border-blue-600 text-blue-700 px-5 py-2.5 rounded-lg text-center font-medium hover:bg-blue-50 transition-colors"
              >
                {node.secondaryCta.label}
              </a>
            )}
          </div>
          {node.advisorCta === true && (
            <div className="mt-5 p-4 bg-white rounded-lg border border-emerald-100">
              <p className="text-sm font-medium text-gray-800 mb-1">
                Want personalised advice?
              </p>
              <a
                href="/find-advisor"
                className="text-sm text-blue-600 hover:underline"
              >
                Connect with a licensed financial adviser →
              </a>
            </div>
          )}
        </div>
        <button
          onClick={handleRestart}
          className="mt-4 text-sm text-gray-500 hover:text-gray-700 underline"
        >
          ↺ Start over
        </button>
      </div>
    );
  }

  // Question node
  const stepNum = history.length + 1;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
          Step {stepNum}
        </span>
        {history.length > 0 && (
          <button
            onClick={handleBack}
            className="text-sm text-blue-600 hover:underline"
          >
            ← Back
          </button>
        )}
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">{node.question}</h2>
      {node.detail !== undefined && (
        <p className="text-gray-500 text-sm mb-6">{node.detail}</p>
      )}
      <div className="flex flex-col gap-3" role="list">
        {node.options.map((opt) => (
          <button
            key={opt.nextId}
            onClick={() => handleSelect(opt.nextId)}
            role="listitem"
            className="text-left border border-gray-200 rounded-xl px-5 py-4 hover:border-blue-400 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors"
          >
            <span className="font-medium text-gray-900 block">{opt.label}</span>
            {opt.detail !== undefined && (
              <span className="text-xs text-gray-500 mt-0.5 block">
                {opt.detail}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
