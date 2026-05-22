"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import SearchInput from "@/components/directory/SearchInput";
import { AFSL_STATUS_LABELS } from "@/lib/afsl-register";
import type { AfslSearchResult } from "@/lib/afsl-search";

/**
 * Client island for the public AFSL/AR lookup page.
 *
 * Live search against `/api/afsl-search`: debounced fetch on input, results
 * rendered into an `aria-live="polite"` region so screen-reader users hear the
 * count change. The labelled input comes from the canonical directory
 * `SearchInput` primitive (role="search", sr-only <label>).
 *
 * The page shell (heading, disclosure, JSON-LD) is a server component; this
 * island only owns the interactive search.
 */

const DEBOUNCE_MS = 300;
const MIN_QUERY = 2;

type Status = AfslSearchResult["status"];

function statusBadgeClasses(status: Status): string {
  switch (status) {
    case "current":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "suspended":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "cancelled":
    case "ceased":
      return "bg-rose-50 text-rose-700 border-rose-200";
    default:
      return "bg-slate-50 text-slate-700 border-slate-200";
  }
}

type FetchState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "done"; results: AfslSearchResult[]; query: string }
  | { kind: "error" };

export default function AfslLookupClient({
  initialQuery = "",
}: {
  initialQuery?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [state, setState] = useState<FetchState>({ kind: "idle" });
  const inputId = useId();
  // Track the latest in-flight request so a slow earlier response can't
  // overwrite a faster later one (last-write-wins by sequence).
  const seqRef = useRef(0);

  const runSearch = useCallback(async (term: string) => {
    const trimmed = term.trim();
    if (trimmed.length < MIN_QUERY) {
      seqRef.current += 1; // invalidate any in-flight request
      setState({ kind: "idle" });
      return;
    }
    const seq = ++seqRef.current;
    setState({ kind: "loading" });
    try {
      const res = await fetch(
        `/api/afsl-search?q=${encodeURIComponent(trimmed)}`,
      );
      if (seq !== seqRef.current) return; // a newer search superseded this one
      if (!res.ok) {
        setState({ kind: "error" });
        return;
      }
      const data = (await res.json()) as {
        results?: AfslSearchResult[];
        query?: string;
      };
      if (seq !== seqRef.current) return;
      setState({
        kind: "done",
        results: data.results ?? [],
        query: data.query ?? trimmed,
      });
    } catch {
      if (seq !== seqRef.current) return;
      setState({ kind: "error" });
    }
  }, []);

  // Debounce: re-run search 300ms after the query settles.
  useEffect(() => {
    const id = setTimeout(() => {
      void runSearch(query);
    }, DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [query, runSearch]);

  const results = state.kind === "done" ? state.results : [];
  const hasQuery = query.trim().length >= MIN_QUERY;

  return (
    <div className="space-y-5">
      <SearchInput
        id={inputId}
        value={query}
        onChange={setQuery}
        onSubmit={(v) => void runSearch(v)}
        placeholder="Search by firm name or AFSL number…"
        ariaLabel="Search the AFSL register by licensee name or number"
        className="max-w-xl"
      />

      {/* Live region: screen readers announce the result summary on change. */}
      <div aria-live="polite" className="sr-only">
        {state.kind === "loading" && "Searching the AFSL register…"}
        {state.kind === "done" &&
          `${results.length} ${results.length === 1 ? "result" : "results"} for ${state.query}`}
        {state.kind === "error" && "Search failed. Please try again."}
      </div>

      {state.kind === "loading" && (
        <p className="text-sm text-slate-500">Searching…</p>
      )}

      {state.kind === "error" && (
        <p className="text-sm text-rose-600">
          Something went wrong. Please try your search again.
        </p>
      )}

      {state.kind === "done" && hasQuery && (
        <p className="text-sm text-slate-600">
          <span className="font-semibold text-slate-900">
            {results.length}
          </span>{" "}
          {results.length === 1 ? "match" : "matches"} for &ldquo;
          {state.query}&rdquo;
        </p>
      )}

      {state.kind === "done" && hasQuery && results.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-5 text-sm text-slate-600">
          <p className="font-semibold text-slate-900 mb-1">No matches found</p>
          <p>
            We hold a cached subset of the ASIC register. Try a different
            spelling, or search{" "}
            <a
              href="https://connectonline.asic.gov.au/"
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="underline hover:text-slate-900"
            >
              ASIC Connect
            </a>{" "}
            directly for the authoritative, real-time record.
          </p>
        </div>
      )}

      {results.length > 0 && (
        <ul className="space-y-3">
          {results.map((r) => (
            <li
              key={r.afsl_number}
              className="rounded-xl border border-slate-200 p-4 hover:border-slate-300 transition-colors"
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <Link
                    href={`/afsl/${r.afsl_number}`}
                    className="font-semibold text-slate-900 hover:underline"
                  >
                    {r.licensee_name}
                  </Link>
                  <div className="text-xs text-slate-500 mt-0.5">
                    AFSL <span className="font-mono">{r.afsl_number}</span>
                  </div>
                </div>
                <span
                  className={`inline-flex items-center text-[0.65rem] font-semibold uppercase tracking-wider px-2 py-1 rounded-full border ${statusBadgeClasses(r.status)}`}
                >
                  {AFSL_STATUS_LABELS[r.status]}
                </span>
              </div>

              {r.conditions_summary && (
                <p className="text-sm text-slate-600 mt-2">
                  <span className="font-medium text-slate-700">
                    Conditions:
                  </span>{" "}
                  {r.conditions_summary}
                </p>
              )}

              <div className="mt-3 flex items-center gap-3 flex-wrap text-sm">
                <Link
                  href={`/afsl/${r.afsl_number}`}
                  className="text-slate-700 underline hover:text-slate-900"
                >
                  View record
                </Link>
                {r.advisor_slug && (
                  <Link
                    href={`/advisor/${r.advisor_slug}`}
                    className="inline-flex items-center gap-1 font-medium text-emerald-700 hover:text-emerald-800"
                  >
                    Advisor profile
                    {r.advisor_name ? `: ${r.advisor_name}` : ""} &rarr;
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
