"use client";

import { useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";

export interface TreeOption {
  label: string;
  next: string;
}

export interface TreeQuestion {
  id: string;
  question: string;
  options: TreeOption[];
}

export interface TreeLeaf {
  id: string;
  verdict: "buy" | "rent" | "save" | "review";
  heading: string;
  detail: string;
  action?: { label: string; href: string };
}

export type TreeNode = TreeQuestion | TreeLeaf;

function isLeaf(node: TreeNode): node is TreeLeaf {
  return "verdict" in node;
}

export interface DecisionTreeProps {
  nodes: TreeNode[];
  startId: string;
  heading?: string;
}

const VERDICT_STYLES: Record<
  TreeLeaf["verdict"],
  { bg: string; text: string; border: string; badge: string }
> = {
  buy: {
    bg: "bg-emerald-50",
    text: "text-emerald-900",
    border: "border-emerald-200",
    badge: "bg-emerald-100 text-emerald-800",
  },
  rent: {
    bg: "bg-blue-50",
    text: "text-blue-900",
    border: "border-blue-200",
    badge: "bg-blue-100 text-blue-800",
  },
  save: {
    bg: "bg-amber-50",
    text: "text-amber-900",
    border: "border-amber-200",
    badge: "bg-amber-100 text-amber-800",
  },
  review: {
    bg: "bg-slate-50",
    text: "text-slate-900",
    border: "border-slate-200",
    badge: "bg-slate-100 text-slate-800",
  },
};

const VERDICT_LABELS: Record<TreeLeaf["verdict"], string> = {
  buy: "Buy",
  rent: "Rent for now",
  save: "Rent & save",
  review: "Seek advice",
};

export default function DecisionTree({
  nodes,
  startId,
  heading = "Decision Maker",
}: DecisionTreeProps) {
  const [currentId, setCurrentId] = useState(startId);
  const [history, setHistory] = useState<string[]>([]);

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const current = nodeMap.get(currentId);

  function pick(nextId: string) {
    setHistory((h) => [...h, currentId]);
    setCurrentId(nextId);
  }

  function goBack() {
    setHistory((h) => {
      const prev = h[h.length - 1];
      if (prev !== undefined) setCurrentId(prev);
      return h.slice(0, -1);
    });
  }

  function reset() {
    setCurrentId(startId);
    setHistory([]);
  }

  if (!current) return null;

  if (isLeaf(current)) {
    const styles = VERDICT_STYLES[current.verdict];
    return (
      <div
        className={`rounded-2xl border ${styles.border} ${styles.bg} p-6 md:p-8`}
        data-testid="decision-tree-result"
      >
        <p
          className={`text-xs font-extrabold uppercase tracking-wider mb-3 ${styles.text} opacity-60`}
        >
          {heading} · Result
        </p>
        <span
          className={`inline-block text-xs font-bold px-2.5 py-0.5 rounded-full mb-4 ${styles.badge}`}
        >
          {VERDICT_LABELS[current.verdict]}
        </span>
        <h2 className={`text-xl md:text-2xl font-extrabold mb-3 ${styles.text}`}>
          {current.heading}
        </h2>
        <p className={`text-sm leading-relaxed mb-5 ${styles.text} opacity-80`}>
          {current.detail}
        </p>
        {current.action && (
          <Link
            href={current.action.href}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-700 transition-colors"
          >
            {current.action.label} <Icon name="arrow-right" size={14} />
          </Link>
        )}
        <div className="mt-6 flex gap-4">
          {history.length > 0 && (
            <button
              type="button"
              onClick={goBack}
              className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800"
              data-testid="decision-tree-back"
            >
              <Icon name="chevron-left" size={14} /> Back
            </button>
          )}
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800"
            data-testid="decision-tree-reset"
          >
            Start over
          </button>
        </div>
      </div>
    );
  }

  const progressPct =
    history.length === 0
      ? 0
      : Math.min(90, Math.round((history.length / (history.length + 2)) * 100));

  return (
    <div
      className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm"
      data-testid="decision-tree"
    >
      <div className="flex items-center justify-between mb-5">
        <p className="text-xs uppercase tracking-wider font-extrabold text-slate-500">
          {heading}
        </p>
        {history.length > 0 && (
          <p className="text-xs font-bold text-slate-500">{progressPct}%</p>
        )}
      </div>

      {history.length > 0 && (
        <div
          role="progressbar"
          aria-valuenow={progressPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Progress: ${progressPct}%`}
          className="h-1.5 w-full bg-slate-100 rounded-full mb-6 overflow-hidden"
        >
          <div
            className="h-full bg-amber-500 transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      )}

      <h2
        className="text-xl md:text-2xl font-extrabold text-slate-900 mb-5"
        data-testid="decision-tree-question"
      >
        {current.question}
      </h2>

      <div className="space-y-2" data-testid="decision-tree-options">
        {current.options.map((opt) => (
          <button
            key={opt.next}
            type="button"
            onClick={() => pick(opt.next)}
            className="w-full text-left px-4 py-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-amber-50 hover:border-amber-300 transition-colors flex items-center justify-between gap-2"
            data-testid={`decision-tree-option-${opt.next}`}
          >
            <span className="text-sm font-bold text-slate-900">{opt.label}</span>
            <Icon name="arrow-right" size={14} className="text-slate-500 shrink-0" />
          </button>
        ))}
      </div>

      {history.length > 0 && (
        <button
          type="button"
          onClick={goBack}
          className="mt-5 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800"
          data-testid="decision-tree-back"
        >
          <Icon name="chevron-left" size={14} /> Back
        </button>
      )}
    </div>
  );
}
