"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useShortlist } from "@/lib/hooks/useShortlist";
import { createClient } from "@/lib/supabase/client";
import BrokerCard from "@/components/BrokerCard";
import type { Broker } from "@/lib/types";

export default function ShortlistClient() {
  const { slugs, count, clear } = useShortlist();
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slugs.length === 0) {
      setBrokers([]);
      setLoading(false);
      return;
    }

    const supabase = createClient();
    supabase
      .from("brokers")
      .select("*")
      .in("slug", slugs)
      .eq("status", "active")
      .then(({ data }) => {
        if (data) {
          // Preserve the order the user saved them in
          const sorted = slugs
            .map((slug) => data.find((b) => b.slug === slug))
            .filter(Boolean) as Broker[];
          setBrokers(sorted);
        }
        setLoading(false);
      });
  }, [slugs]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-48 bg-slate-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (count === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
        <div className="text-4xl mb-4">
          <svg className="w-12 h-12 mx-auto text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-2">No brokers saved yet</h2>
        <p className="text-sm text-slate-500 mb-6">
          Tap the heart icon on any broker to save it to your shortlist for easy comparison.
        </p>
        <Link
          href="/compare"
          className="inline-block px-6 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors text-sm"
        >
          Browse Brokers &rarr;
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-slate-500">
          {count} broker{count !== 1 ? "s" : ""} saved
        </p>
        <button
          onClick={clear}
          className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors"
        >
          Clear All
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {brokers.map((broker) => (
          <BrokerCard key={broker.id} broker={broker} context="compare" />
        ))}
      </div>

      {count >= 2 && (
        <div className="text-center">
          <Link
            href={`/versus?vs=${brokers.slice(0, 4).map((b) => b.slug).join(",")}`}
            className="inline-block px-6 py-3 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 transition-colors text-sm"
          >
            Compare These Brokers &rarr;
          </Link>
        </div>
      )}
    </div>
  );
}
