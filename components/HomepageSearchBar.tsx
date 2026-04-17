"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

const Search = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
);

const ADVISOR_KEYWORDS = [
  "advisor", "adviser", "planner", "accountant", "smsf", "tax", "mortgage",
  "estate", "insurance", "buyer", "wealth", "aged care", "crypto advisor",
  "debt", "counsellor", "financial advice", "financial planner", "help",
];

export default function HomepageSearchBar() {
  const [query, setQuery] = useState("");
  const [showHint, setShowHint] = useState(false);
  const router = useRouter();
  const hintTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  const isAdvisorQuery = ADVISOR_KEYWORDS.some((kw) =>
    query.toLowerCase().includes(kw)
  );

  useEffect(() => {
    if (isAdvisorQuery) {
      hintTimeout.current = setTimeout(() => setShowHint(true), 300);
    } else {
      setShowHint(false);
    }
    return () => clearTimeout(hintTimeout.current);
  }, [isAdvisorQuery]);

  function handleSearch() {
    if (isAdvisorQuery && query.trim()) {
      router.push(`/advisors?q=${encodeURIComponent(query.trim())}`);
    } else if (query.trim()) {
      router.push(`/compare?q=${encodeURIComponent(query.trim())}`);
    } else {
      router.push("/compare");
    }
  }

  return (
    <div className="max-w-2xl mx-auto relative mt-3 md:mt-8 z-20">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          inputMode="search"
          enterKeyHint="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Search platforms, advisors, fees, or features..."
          aria-label="Search platforms and advisors"
          className="w-full h-12 sm:h-14 pl-12 pr-4 sm:pr-32 rounded-xl bg-white border-2 border-slate-200 shadow-sm text-sm sm:text-base text-slate-900 placeholder:text-slate-500 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/30 transition-all duration-200"
        />
        <button
          onClick={handleSearch}
          className="hidden sm:block absolute right-2 top-1/2 -translate-y-1/2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-5 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400/50 transition-all duration-200 text-sm"
        >
          {isAdvisorQuery ? "Find Advisors" : "Compare"}
        </button>
      </div>

      {/* Advisor detection hint */}
      {showHint && (
        <div className="absolute left-0 right-0 -bottom-1 translate-y-full bg-white border border-slate-200 rounded-xl p-3 shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <p className="text-xs text-slate-600 font-medium">
            Looking for a financial professional? Press Enter to search our{" "}
            <span className="font-bold text-slate-800">advisor directory</span>, or{" "}
            <button
              onClick={() => {
                setShowHint(false);
                router.push(`/compare?q=${encodeURIComponent(query.trim())}`);
              }}
              className="underline hover:text-slate-900 font-bold text-amber-600"
            >
              search platforms instead
            </button>
          </p>
        </div>
      )}
    </div>
  );
}
