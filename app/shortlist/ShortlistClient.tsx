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
      <div className="space-y-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-36 bg-slate-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (count === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6 md:p-12 text-center">
        <svg className="w-8 h-8 md:w-12 md:h-12 mx-auto text-slate-300 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
        <h2 className="text-base md:text-lg font-bold text-slate-900 mb-1.5">No brokers saved yet</h2>
        <p className="text-xs md:text-sm text-slate-500 mb-4 md:mb-6">
          Tap the heart icon on any broker to save it here.
        </p>
        <Link
          href="/compare"
          className="inline-block px-5 py-2.5 md:px-6 md:py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors text-sm"
        >
          Browse Brokers &rarr;
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3 md:mb-6">
        <p className="text-xs md:text-sm text-slate-500">
          {count} broker{count !== 1 ? "s" : ""} saved
        </p>
        <button
          onClick={clear}
          className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors px-2 py-1"
        >
          Clear All
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
        {brokers.map((broker) => (
          <BrokerCard key={broker.id} broker={broker} context="compare" />
        ))}
      </div>

      {count >= 2 && (
        <div className="text-center mt-6 md:mt-10">
          <Link
            href={`/versus?vs=${brokers.slice(0, 4).map((b) => b.slug).join(",")}`}
            className="inline-block w-full md:w-auto px-6 py-3 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 transition-colors text-sm"
          >
            Compare These Brokers &rarr;
          </Link>
        </div>
      )}
    </div>
  );
}
