"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";

/**
 * Controlled postcode + suburb autocomplete primitive.
 *
 * Renders an <input> with a search icon, a clear-X when populated,
 * and a results dropdown that opens on focus + character entry.
 * Closes on outside click and Escape. Selection commits via
 * `onSelect`; `onSelect(null)` is also sent when the user clears the
 * input (so consumers can drop any derived geo state).
 *
 * The search function is a prop so this works for both
 * /api/advisor-search/postcodes (current) and
 * /api/invest-search/postcodes (future Phase 4) without coupling.
 *
 * Debounce
 * --------
 * Keystrokes are debounced by `debounceMs` (default 200ms). The
 * existing /advisors LocationSearch used 250ms — close enough to
 * not be a behavioural regression when /advisors migrates.
 *
 * Generic result shape
 * --------------------
 * Result objects need at minimum `{ postcode, locality, state }`
 * for the visible label. Additional fields (lat/lng, etc.) flow
 * through `onSelect` to the consumer untouched.
 */
export interface PostcodeResult {
  postcode: string;
  locality: string;
  state: string;
  latitude: number;
  longitude: number;
}

export interface PostcodeAutocompleteProps {
  selected: PostcodeResult | null;
  onSelect: (next: PostcodeResult | null) => void;
  /**
   * Fetches up to ~5 candidate results for the supplied query.
   * Must handle its own debounce / cancellation if expensive —
   * this primitive's debounce is just a keystroke smoother.
   */
  search: (query: string, signal: AbortSignal) => Promise<PostcodeResult[]>;
  placeholder?: string;
  ariaLabel?: string;
  debounceMs?: number;
  className?: string;
}

export default function PostcodeAutocomplete({
  selected,
  onSelect,
  search,
  placeholder = "Postcode or suburb...",
  ariaLabel = "Search postcode or suburb",
  debounceMs = 200,
  className = "",
}: PostcodeAutocompleteProps) {
  const [query, setQuery] = useState(
    selected ? `${selected.locality}, ${selected.state}` : "",
  );
  const [results, setResults] = useState<PostcodeResult[]>([]);
  const [open, setOpen] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout>>(undefined);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Click outside to close
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Cleanup any pending debounce on unmount
  useEffect(() => () => {
    if (timeout.current) clearTimeout(timeout.current);
  }, []);

  const onChange = (next: string) => {
    setQuery(next);
    if (timeout.current) clearTimeout(timeout.current);
    if (next.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    const controller = new AbortController();
    timeout.current = setTimeout(async () => {
      try {
        const hits = await search(next.trim(), controller.signal);
        setResults(hits);
        setOpen(hits.length > 0);
      } catch {
        /* user kept typing or unmount — drop silently */
      }
    }, debounceMs);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const choose = (r: PostcodeResult) => {
    setQuery(`${r.locality}, ${r.state} ${r.postcode}`);
    setResults([]);
    setOpen(false);
    onSelect(r);
  };

  const clear = () => {
    setQuery("");
    setResults([]);
    setOpen(false);
    onSelect(null);
  };

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <Icon
        name="map-pin"
        size={14}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
        aria-hidden
      />
      <input
        type="text"
        role="combobox"
        value={query}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls="postcode-autocomplete-listbox"
        className="w-full pl-9 pr-9 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
      />
      {query && (
        <button
          type="button"
          onClick={clear}
          aria-label="Clear location"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-[11px] font-bold"
        >
          ×
        </button>
      )}
      {open && results.length > 0 && (
        <ul
          id="postcode-autocomplete-listbox"
          role="listbox"
          aria-label="Location suggestions"
          className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-y-auto"
        >
          {results.map((r) => (
            <li key={`${r.postcode}-${r.locality}-${r.state}`}>
              <button
                type="button"
                role="option"
                aria-selected={
                  selected?.postcode === r.postcode &&
                  selected?.locality === r.locality
                }
                onClick={() => choose(r)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-amber-50 transition-colors flex items-center justify-between gap-2"
              >
                <span className="truncate">
                  {r.locality}, {r.state}
                </span>
                <span className="text-xs text-slate-500 tabular-nums shrink-0">
                  {r.postcode}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
