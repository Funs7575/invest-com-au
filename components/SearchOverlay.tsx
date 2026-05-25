"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useReducer,
  useMemo,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import type { UnifiedSearchResults } from "@/lib/search";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SearchResultItem {
  key: string;
  category: "Brokers" | "Advisors" | "Articles" | "Glossary" | "Tools";
  href: string;
  title: string;
  subtitle: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_ICONS: Record<string, string> = {
  Brokers: "trending-up",
  Advisors: "users",
  Articles: "book-open",
  Glossary: "file-text",
  Tools: "calculator",
};

const QUICK_LINKS = [
  { title: "Compare Platforms", href: "/compare", icon: "trending-up" },
  { title: "Investment Marketplace", href: "/invest", icon: "layers" },
  { title: "Browse Advisors", href: "/advisors", icon: "users" },
  { title: "Current Deals", href: "/deals", icon: "zap" },
  { title: "Calculators", href: "/calculators", icon: "calculator" },
  { title: "Foreign Investors", href: "/foreign-investment", icon: "globe" },
];

// ─── State machine ────────────────────────────────────────────────────────────

type SearchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; results: SearchResultItem[]; total: number }
  | { status: "error"; message: string };

type SearchAction =
  | { type: "LOADING" }
  | { type: "SUCCESS"; results: SearchResultItem[]; total: number }
  | { type: "ERROR"; message: string }
  | { type: "RESET" };

function searchReducer(_: SearchState, action: SearchAction): SearchState {
  switch (action.type) {
    case "LOADING":
      return { status: "loading" };
    case "SUCCESS":
      return { status: "success", results: action.results, total: action.total };
    case "ERROR":
      return { status: "error", message: action.message };
    case "RESET":
      return { status: "idle" };
  }
}

// ─── Result flattener ─────────────────────────────────────────────────────────

function flattenResults(data: UnifiedSearchResults): SearchResultItem[] {
  const items: SearchResultItem[] = [];

  for (const b of data.brokers) {
    items.push({
      key: `broker-${b.slug}`,
      category: "Brokers",
      href: `/broker/${b.slug}`,
      title: b.name,
      subtitle: b.tagline ?? null,
    });
  }
  for (const a of data.advisors) {
    items.push({
      key: `advisor-${a.slug}`,
      category: "Advisors",
      href: `/advisor/${a.slug}`,
      title: a.name,
      subtitle: [a.firm_name, a.location_display].filter(Boolean).join(" · "),
    });
  }
  for (const art of data.articles) {
    items.push({
      key: `article-${art.slug}`,
      category: "Articles",
      href: `/article/${art.slug}`,
      title: art.title,
      subtitle: art.excerpt ?? null,
    });
  }
  for (const g of data.glossary) {
    items.push({
      key: `glossary-${g.slug}`,
      category: "Glossary",
      href: `/glossary#${g.slug}`,
      title: g.term,
      subtitle: g.definition.length > 100 ? g.definition.slice(0, 97) + "…" : g.definition,
    });
  }
  for (const t of data.tools) {
    items.push({
      key: `tool-${t.slug}`,
      category: "Tools",
      href: t.href,
      title: t.title,
      subtitle: t.description,
    });
  }

  return items;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SearchOverlay({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [state, dispatch] = useReducer(searchReducer, { status: "idle" });
  const [activeIndex, setActiveIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const abortRef = useRef<AbortController | undefined>(undefined);
  const router = useRouter();

  // ─── Fetch search results ──────────────────────────────────────────────────

  const doSearch = useCallback((q: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    dispatch({ type: "LOADING" });

    fetch(`/api/search?q=${encodeURIComponent(q)}`, {
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error("Search failed");
        return res.json() as Promise<UnifiedSearchResults>;
      })
      .then((data) => {
        const results = flattenResults(data);
        dispatch({ type: "SUCCESS", results, total: results.length });
      })
      .catch((err: Error) => {
        if (err.name === "AbortError") return; // Normal — new query superseded this one
        dispatch({ type: "ERROR", message: "Search failed. Please try again." });
      });
  }, []);

  // ─── Debounce query changes ────────────────────────────────────────────────

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (query.length < 2) {
      dispatch({ type: "RESET" });
      abortRef.current?.abort();
      return;
    }
    debounceRef.current = setTimeout(() => doSearch(query), 200);
    return () => clearTimeout(debounceRef.current);
  }, [query, doSearch]);

  // ─── Reset active index on new results ────────────────────────────────────

  useEffect(() => {
    setActiveIndex(-1);
  }, [state]);

  // ─── Global Cmd/Ctrl+K shortcut ────────────────────────────────────────────

  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (!isOpen) {
          // Signal to parent to open — we can't call onClose here but
          // Navigation wires this up via the same setSearchOpen toggle.
          // Re-dispatch as a custom event the Navigation listener catches.
          window.dispatchEvent(new CustomEvent("invest:search:open"));
        }
      }
    };
    window.addEventListener("keydown", handleGlobalKey);
    return () => window.removeEventListener("keydown", handleGlobalKey);
  }, [isOpen]);

  // ─── Focus + ESC + keyboard nav ───────────────────────────────────────────

  const flatItems = useMemo(
    () => (state.status === "success" ? state.results : []),
    [state],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (!flatItems.length) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, flatItems.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, -1));
      } else if (e.key === "Enter" && activeIndex >= 0) {
        e.preventDefault();
        const item = flatItems[activeIndex];
        if (item) {
          router.push(item.href);
          onClose();
        }
      }
    },
    [onClose, flatItems, activeIndex, router]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      setTimeout(() => inputRef.current?.focus(), 50);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleKeyDown]);

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const el = listRef.current.querySelector<HTMLElement>(
        `[data-result-index="${activeIndex}"]`
      );
      el?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  // ─── Reset on close ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      dispatch({ type: "RESET" });
      setActiveIndex(-1);
      abortRef.current?.abort();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // ─── Grouped results by category ──────────────────────────────────────────

  const grouped: Partial<Record<string, SearchResultItem[]>> = {};
  for (const item of flatItems) {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category]!.push(item);
  }

  // Build a flat index for keyboard nav — same order as rendered
  let itemIndex = 0;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-[200]"
      role="dialog"
      aria-modal="true"
      aria-label="Search"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Search panel */}
      <div className="relative max-w-2xl mx-4 sm:mx-auto mt-[10vh]">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
          {/* Input row */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
            {state.status === "loading" ? (
              <svg
                className="w-5 h-5 text-amber-400 shrink-0 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                />
              </svg>
            ) : (
              <Icon name="search" size={20} className="text-slate-400 shrink-0" />
            )}
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search brokers, advisors, articles, glossary…"
              className="flex-1 text-base text-slate-900 placeholder:text-slate-500 outline-none bg-transparent"
              aria-label="Search"
              aria-autocomplete="list"
              aria-controls="search-results"
              aria-activedescendant={
                activeIndex >= 0 ? `search-result-${activeIndex}` : undefined
              }
            />
            <div className="hidden sm:flex items-center gap-1.5 shrink-0">
              <kbd className="flex items-center gap-1 px-2 py-1 text-[0.6rem] font-semibold text-slate-400 bg-slate-100 rounded-md border border-slate-200">
                ⌘K
              </kbd>
              <kbd className="flex items-center gap-1 px-2 py-1 text-[0.6rem] font-semibold text-slate-400 bg-slate-100 rounded-md border border-slate-200">
                ESC
              </kbd>
            </div>
          </div>

          {/* Results area */}
          <div
            id="search-results"
            ref={listRef}
            className="max-h-[60vh] overflow-y-auto"
            role="listbox"
            aria-label="Search results"
          >
            {/* Empty-query state: quick links */}
            {query.length < 2 && (
              <div className="px-5 py-6">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Quick Links
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {QUICK_LINKS.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={onClose}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 group-hover:bg-amber-50 transition-colors">
                        <Icon
                          name={link.icon}
                          size={14}
                          className="text-slate-500 group-hover:text-amber-600"
                        />
                      </div>
                      <span className="text-sm font-semibold text-slate-700 group-hover:text-slate-900">
                        {link.title}
                      </span>
                    </Link>
                  ))}
                </div>
                <p className="mt-4 text-xs text-slate-400">
                  Tip: press{" "}
                  <kbd className="inline-flex items-center px-1.5 py-0.5 text-[0.6rem] font-semibold bg-slate-100 border border-slate-200 rounded">
                    ⌘K
                  </kbd>{" "}
                  to open search from anywhere
                </p>
              </div>
            )}

            {/* Loading */}
            {state.status === "loading" && query.length >= 2 && (
              <div className="px-5 py-8 text-center">
                <p className="text-sm text-slate-500">Searching…</p>
              </div>
            )}

            {/* Error */}
            {state.status === "error" && (
              <div className="px-5 py-8 text-center">
                <Icon name="alert-circle" size={24} className="text-red-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">{state.message}</p>
              </div>
            )}

            {/* No results */}
            {state.status === "success" && flatItems.length === 0 && (
              <div className="px-5 py-8 text-center">
                <Icon name="search" size={24} className="text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">
                  No results for &ldquo;{query}&rdquo;
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Try a different term, or{" "}
                  <Link
                    href={`/search?q=${encodeURIComponent(query)}`}
                    onClick={onClose}
                    className="text-amber-600 hover:underline"
                  >
                    see full results
                  </Link>
                </p>
              </div>
            )}

            {/* Results grouped by category */}
            {state.status === "success" && flatItems.length > 0 && (
              <div className="py-3">
                {Object.entries(grouped).map(([category, items]) => {
                  if (!items?.length) return null;
                  return (
                    <div key={category} className="mb-2 last:mb-0">
                      <p className="px-5 py-1.5 text-[0.6rem] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <Icon
                          name={CATEGORY_ICONS[category] ?? "file"}
                          size={10}
                          className="text-slate-400"
                        />
                        {category}
                      </p>
                      {items.map((item) => {
                        const idx = itemIndex++;
                        const isActive = idx === activeIndex;
                        return (
                          <Link
                            key={item.key}
                            id={`search-result-${idx}`}
                            href={item.href}
                            onClick={onClose}
                            data-result-index={idx}
                            role="option"
                            aria-selected={isActive}
                            className={`flex items-center gap-3 px-5 py-2.5 transition-colors group ${
                              isActive
                                ? "bg-amber-50"
                                : "hover:bg-amber-50"
                            }`}
                          >
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                                isActive
                                  ? "bg-amber-100"
                                  : "bg-slate-100 group-hover:bg-amber-100"
                              }`}
                            >
                              <Icon
                                name={CATEGORY_ICONS[category] ?? "file"}
                                size={14}
                                className={`transition-colors ${
                                  isActive
                                    ? "text-amber-600"
                                    : "text-slate-500 group-hover:text-amber-600"
                                }`}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p
                                className={`text-sm font-semibold truncate transition-colors ${
                                  isActive
                                    ? "text-amber-700"
                                    : "text-slate-900 group-hover:text-amber-700"
                                }`}
                              >
                                {item.title}
                              </p>
                              {item.subtitle && (
                                <p className="text-xs text-slate-400 truncate">
                                  {item.subtitle}
                                </p>
                              )}
                            </div>
                            <Icon
                              name="arrow-right"
                              size={14}
                              className={`shrink-0 transition-colors ${
                                isActive
                                  ? "text-amber-500"
                                  : "text-slate-300 group-hover:text-amber-500"
                              }`}
                            />
                          </Link>
                        );
                      })}
                    </div>
                  );
                })}

                {/* See all results link */}
                <div className="border-t border-slate-100 mx-5 mt-2 pt-2">
                  <Link
                    href={`/search?q=${encodeURIComponent(query)}`}
                    onClick={onClose}
                    className="flex items-center justify-center gap-2 py-2 text-sm text-amber-600 hover:text-amber-700 font-semibold transition-colors"
                  >
                    See all results for &ldquo;{query}&rdquo;
                    <Icon name="arrow-right" size={14} />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
