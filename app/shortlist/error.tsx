"use client";

import { useEffect } from "react";
import Link from "next/link";
import { logger } from "@/lib/logger";

const log = logger("error-boundary");

export default function ShortlistError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    log.error("Shortlist page error", { error: error.message });
  }, [error]);

  return (
    <div className="py-16 text-center">
      <div className="container-custom max-w-md">
        <h2 className="text-xl font-extrabold text-slate-900 mb-2">
          Couldn&apos;t load your shortlist
        </h2>
        <p className="text-sm text-slate-500 mb-6">
          Something went wrong loading your saved brokers. Please try again.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="px-5 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors"
          >
            Try Again
          </button>
          <Link
            href="/compare"
            className="px-5 py-2.5 border border-slate-200 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors"
          >
            Compare Brokers
          </Link>
        </div>
      </div>
    </div>
  );
}
