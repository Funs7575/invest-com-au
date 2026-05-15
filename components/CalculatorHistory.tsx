"use client";
import Icon from "@/components/Icon";
import type { CalculatorHistoryEntry } from "@/hooks/use-calculator-history";

interface CalculatorHistoryProps {
  entries: CalculatorHistoryEntry[];
  onLoad: (inputs: unknown) => void;
  onClear: () => void;
}

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CalculatorHistory({ entries, onLoad, onClear }: CalculatorHistoryProps) {
  if (entries.length === 0) return null;

  return (
    <div className="mt-8 bg-slate-50 border border-slate-200 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
          <Icon name="clock" size={14} className="text-slate-500" />
          Saved scenarios ({entries.length})
        </h3>
        <button
          onClick={onClear}
          className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
        >
          Clear all
        </button>
      </div>
      <div className="space-y-2">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-3"
          >
            <div className="min-w-0 mr-3">
              <p className="text-xs font-semibold text-slate-800 truncate">{entry.label}</p>
              <p className="text-xs text-emerald-600 font-bold">{entry.summary}</p>
              <p className="text-[0.65rem] text-slate-400 mt-0.5">{formatTimestamp(entry.timestamp)}</p>
            </div>
            <button
              onClick={() => onLoad(entry.inputs)}
              className="shrink-0 text-xs font-bold px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
            >
              Load
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
