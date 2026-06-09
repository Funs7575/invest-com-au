"use client";

import { useState, useRef, type FormEvent } from "react";
import Icon from "@/components/Icon";

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

type Status = "idle" | "loading" | "success" | "error" | "empty";

export default function SmartFilterBar({
  setParams,
  surface,
  placeholder,
  className = "",
}: SmartFilterBarProps) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const cooldownRef = useRef(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!query.trim() || cooldownRef.current) return;

    setStatus("loading");
    setMessage("");
    cooldownRef.current = true;
    setTimeout(() => { cooldownRef.current = false; }, 1000);

    try {
      const res = await fetch("/api/smart-filter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim(), surface }),
      });

      if (res.status === 429) {
        setStatus("error");
        setMessage("Too many requests — wait a moment and try again.");
        return;
      }
      if (!res.ok) {
        setStatus("error");
        setMessage("Couldn't parse that — try a shorter phrase.");
        return;
      }

      const data = (await res.json()) as { params?: Record<string, string> };
      if (!data.params || Object.keys(data.params).length === 0) {
        setStatus("empty");
        setMessage("No filters found — try being more specific.");
        return;
      }

      setParams(data.params);
      setStatus("success");
      setMessage(`Applied ${Object.keys(data.params).length} filter${Object.keys(data.params).length !== 1 ? "s" : ""}`);
      setQuery("");
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("error");
      setMessage("Couldn't parse that — try a shorter phrase.");
    }
  };

  const isLoading = status === "loading";

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
            className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-slate-200 bg-white placeholder:text-slate-400 text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-300 disabled:opacity-60 transition-colors"
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
