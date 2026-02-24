"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

export default function HomepageSearchBar() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  function handleSearch() {
    if (query.trim()) {
      router.push(`/compare?q=${encodeURIComponent(query.trim())}`);
    } else {
      router.push("/compare");
    }
  }

  return (
    <div className="max-w-2xl mx-auto relative mt-4 md:mt-8">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          inputMode="search"
          enterKeyHint="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Search brokers, fees, or features..."
          aria-label="Search brokers by name, fees, or features"
          className="w-full h-12 sm:h-14 pl-12 pr-4 sm:pr-32 rounded-xl bg-white border-2 border-slate-200 shadow-sm text-sm sm:text-base text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/30 transition-all duration-200"
        />
        <button
          onClick={handleSearch}
          className="hidden sm:block absolute right-2 top-1/2 -translate-y-1/2 bg-slate-900 hover:bg-slate-800 hover:scale-105 text-white font-bold px-5 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400/50 transition-all duration-200 text-sm"
        >
          Compare
        </button>
      </div>
    </div>
  );
}
