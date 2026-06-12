"use client";

/**
 * Debounced search island for the Ghost Tickers hub. API-backed — the
 * full removed-companies history runs to thousands of rows, too heavy
 * for props. Same shape as the adviser-register search island.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";

interface ResultRow {
  slug: string;
  code: string;
  name: string;
  event: string;
  eventDate: string;
}

const EVENT_LABELS: Record<string, string> = {
  delisted: "Delisted",
  renamed: "Renamed",
  merged: "Merged",
  acquired: "Acquired",
  failed: "Failed / wound up",
};

export default function DelistedSearch() {
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
        const res = await fetch(`/api/ghost-tickers/search?q=${encodeURIComponent(q)}`, {
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
      <label htmlFor="delisted-search" className="block text-sm font-semibold text-slate-700 mb-1.5">
        Former ASX code or company name
      </label>
      <div className="relative">
        <Icon name="search" size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          id="delisted-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. ABC or Acme Mining"
          autoComplete="off"
          className="w-full rounded-xl border-2 border-slate-200 bg-white pl-10 pr-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-amber-500 transition-colors"
          aria-describedby="delisted-search-status"
        />
        {status === "loading" && (
          <svg role="status" aria-label="Searching" className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
        )}
      </div>

      <div id="delisted-search-status" aria-live="polite" className="mt-3">
        {status === "idle" && (
          <p className="text-xs text-slate-500">Type at least two characters — code or name.</p>
        )}
        {status === "error" && (
          <p className="text-xs text-red-600" role="alert">
            Search isn&apos;t responding right now — try again in a moment.
          </p>
        )}
        {status === "done" && results && results.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            No removed company matches &ldquo;{query.trim()}&rdquo;. The code may still be listed —
            or check the spelling of the company name.
          </div>
        )}
        {status === "done" && results && results.length > 0 && (
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white overflow-hidden">
            {results.map((r) => (
              <li key={r.slug}>
                <Link
                  href={`/asx/delisted/${r.slug}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-amber-50/60 transition-colors"
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-slate-900 truncate">
                      <span className="font-mono text-amber-700">{r.code}</span> · {r.name}
                    </span>
                    <span className="block text-xs text-slate-500">
                      {EVENT_LABELS[r.event] ?? r.event} · {r.eventDate}
                    </span>
                  </span>
                  <Icon name="arrow-right" size={14} className="text-slate-400 shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
