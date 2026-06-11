"use client";

import { useState, type FormEvent } from "react";
import Icon from "@/components/Icon";
import { useSmartFilter } from "@/lib/hooks/useSmartFilter";

export interface SmartFilterBarProps {
  setParams: (updates: Record<string, string>) => void;
  surface: "advisors" | "invest";
  placeholder?: string;
  className?: string;
}

const PLACEHOLDERS: Record<string, string> = {
  advisors: 'Try: "SMSF advisor Sydney who speaks Mandarin, fee-for-service"',
  invest: 'Try: "commercial property Brisbane with yield over 7%"',
};

/**
 * Standalone natural-language filter bar. The parse/apply engine lives in
 * `useSmartFilter` so the same behaviour can be folded inline into a search
 * box on surfaces that prefer one input (see /advisors).
 */
export default function SmartFilterBar({
  setParams,
  surface,
  placeholder,
  className = "",
}: SmartFilterBarProps) {
  const [query, setQuery] = useState("");
  const { run, status, message, isLoading } = useSmartFilter(surface, setParams);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const applied = await run(query);
    if (applied) setQuery("");
  };

  return (
    <div className={`w-full ${className}`}>
      <form
        role="search"
        onSubmit={handleSubmit}
        className="flex items-center gap-2"
      >
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <Icon
              name="zap"
              size={14}
              className={`transition-colors ${isLoading ? "text-amber-500 animate-pulse" : "text-amber-400"}`}
            />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder ?? PLACEHOLDERS[surface]}
            disabled={isLoading}
            className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-slate-200 bg-white placeholder:text-slate-500 text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-300 disabled:opacity-60 transition-colors"
          />
        </div>
        <button
          type="submit"
          disabled={!query.trim() || isLoading}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg bg-amber-500 text-white hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400/50"
        >
          <Icon name="zap" size={13} />
          {isLoading ? "Parsing…" : "Filter"}
        </button>
      </form>

      {status !== "idle" && status !== "loading" && (
        <p
          role="status"
          aria-live="polite"
          className={`mt-1.5 text-xs font-medium ${
            status === "success"
              ? "text-emerald-600"
              : status === "error" || status === "empty"
                ? "text-rose-600"
                : "text-slate-500"
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
