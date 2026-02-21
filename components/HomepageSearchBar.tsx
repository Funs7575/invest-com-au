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
    <div className="max-w-2xl mx-auto relative mt-8">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Search brokers, fees, or features..."
          aria-label="Search brokers by name, fees, or features"
          className="w-full h-14 pl-12 pr-32 rounded-xl bg-white/95 backdrop-blur-sm border-2 border-white/20 shadow-2xl text-base text-slate-900 placeholder:text-slate-400 focus:border-green-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-700/30 transition-all duration-200"
        />
        <button
          onClick={handleSearch}
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-green-700 hover:bg-green-800 hover:scale-105 hover:shadow-[0_0_12px_rgba(21,128,61,0.3)] text-white font-bold px-5 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50 transition-all duration-200 text-sm"
        >
          Compare
        </button>
      </div>
    </div>
  );
}
