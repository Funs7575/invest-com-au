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
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Search PDS data (e.g. Swyftx fees, SMSF features)..."
          className="w-full h-16 pl-12 pr-32 rounded-2xl border-2 border-gray-100 shadow-xl text-lg focus:border-green-500 focus:outline-none"
        />
        <button
          onClick={handleSearch}
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-green-700 hover:bg-green-800 hover:scale-105 hover:shadow-[0_0_12px_rgba(21,128,61,0.3)] text-white font-semibold px-6 py-2.5 rounded-xl transition-all duration-200"
        >
          Compare
        </button>
      </div>
    </div>
  );
}
