"use client";

/**
 * Debounced search island for the Postcode Wealth Atlas — API-backed
 * (~2,600 postcodes in the real extract). Same shape as the other
 * registry search islands.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";

interface ResultRow {
  postcode: string;
  state: string;
  suburbs: string[];
  medianTaxableIncome?: number;
}

export default function PostcodeSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ResultRow[] | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    abortRef.current?.abort();
    if (q.length < 2) {
      setResults(null);
      setStatus("idle");
      return;
    }
    setStatus("loading");
    debounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const res = await fetch(`/api/postcode-atlas/search?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { results: ResultRow[] };
        setResults(data.results);
        setStatus("done");
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setStatus("error");
      }
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  return (
    <div>
      <label htmlFor="postcode-atlas-search" className="block text-sm font-semibold text-slate-700 mb-1.5">
        Postcode or suburb
      </label>
      <div className="relative">
        <Icon name="search" size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          id="postcode-atlas-search"
          type="search"
          inputMode="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. 2000 or Surry Hills"
          autoComplete="off"
          className="w-full rounded-xl border-2 border-slate-200 bg-white pl-10 pr-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-amber-500 transition-colors"
          aria-describedby="postcode-atlas-status"
        />
        {status === "loading" && (
          <svg role="status" aria-label="Searching" className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
        )}
      </div>

      <div id="postcode-atlas-status" aria-live="polite" className="mt-3">
        {status === "idle" && (
          <p className="text-xs text-slate-500">Type a postcode or at least two letters of a suburb.</p>
        )}
        {status === "error" && (
          <p className="text-xs text-red-600" role="alert">
            Search isn&apos;t responding right now — try again in a moment.
          </p>
        )}
        {status === "done" && results && results.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            No postcode matches &ldquo;{query.trim()}&rdquo;. Very small postcodes are sometimes
            suppressed in the ATO tables for privacy.
          </div>
        )}
        {status === "done" && results && results.length > 0 && (
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white overflow-hidden">
            {results.map((r) => (
              <li key={r.postcode}>
                <Link
                  href={`/postcodes/${r.postcode}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-amber-50/60 transition-colors"
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-slate-900 truncate">
                      {r.postcode} · {r.suburbs.slice(0, 2).join(", ") || r.state}
                    </span>
                    <span className="block text-xs text-slate-500">{r.state}</span>
                  </span>
                  {r.medianTaxableIncome !== undefined && (
                    <span className="shrink-0 text-xs font-semibold text-slate-600 tabular-nums">
                      ${r.medianTaxableIncome.toLocaleString("en-AU")} median
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
