"use client";

/**
 * Debounced search island for the Adviser Register Atlas. Hits the
 * file-backed search endpoint (no DB) and renders linked results with
 * keyboard-friendly markup. States: idle hint, loading, results, none.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";

interface ResultRow {
  slug: string;
  name: string;
  number: string;
  role: string;
  licenseeName: string;
}

export default function AdviserRegisterSearch() {
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
        const res = await fetch(`/api/adviser-register/search?q=${encodeURIComponent(q)}`, {
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
      <label htmlFor="register-search" className="block text-sm font-semibold text-slate-700 mb-1.5">
        Adviser name, number, or licensee
      </label>
      <div className="relative">
        <Icon name="search" size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          id="register-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. Jane Citizen or 1234567"
          autoComplete="off"
          className="w-full rounded-xl border-2 border-slate-200 bg-white pl-10 pr-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-amber-500 transition-colors"
          aria-describedby="register-search-status"
        />
        {status === "loading" && (
          <svg role="status" aria-label="Searching" className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
        )}
      </div>

      <div id="register-search-status" aria-live="polite" className="mt-3">
        {status === "idle" && (
          <p className="text-xs text-slate-500">Start typing at least two characters to search the register.</p>
        )}
        {status === "error" && (
          <p className="text-xs text-red-600" role="alert">
            Search isn&apos;t responding right now — try again in a moment.
          </p>
        )}
        {status === "done" && results && results.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            No current adviser matches &ldquo;{query.trim()}&rdquo;. Check the spelling, or
            verify directly on{" "}
            <a
              href="https://moneysmart.gov.au/financial-advice/financial-advisers-register"
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-700 underline hover:text-amber-800"
            >
              MoneySmart
            </a>
            .
          </div>
        )}
        {status === "done" && results && results.length > 0 && (
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white overflow-hidden">
            {results.map((r) => (
              <li key={r.slug}>
                <Link
                  href={`/adviser-register/${r.slug}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-amber-50/60 transition-colors"
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-slate-900 truncate">{r.name}</span>
                    <span className="block text-xs text-slate-500 truncate">
                      {r.role} · {r.licenseeName}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-slate-500 tabular-nums">#{r.number}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
