"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import Link from "next/link";

const quickFilters = [
  { label: "ASX Shares", href: "/compare" },
  { label: "US Stocks", href: "/compare" },
  { label: "Crypto", href: "/compare" },
  { label: "$0 Brokerage", href: "/compare" },
  { label: "SMSF", href: "/compare" },
];

export default function HomepageSearchBar() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/compare?q=${encodeURIComponent(query.trim())}`);
    } else {
      router.push("/compare");
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search brokers, fees, or features..."
            className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/30 focus:border-green-600 bg-white shadow-sm"
          />
        </div>
        <button
          type="submit"
          className="px-6 py-3.5 bg-green-700 text-white font-semibold rounded-xl hover:bg-green-800 transition-colors text-sm whitespace-nowrap shadow-sm"
        >
          Compare Now
        </button>
      </form>

      {/* Quick filter pills */}
      <div className="flex flex-wrap justify-center gap-2 mt-4">
        {quickFilters.map((filter) => (
          <Link
            key={filter.label}
            href={filter.href}
            className="px-3 py-1.5 bg-white/80 border border-slate-200 rounded-full text-xs font-medium text-slate-600 hover:bg-green-50 hover:border-green-200 hover:text-green-700 transition-colors"
          >
            {filter.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
