"use client";

import Link from "next/link";
import { useEffect } from "react";
import Icon from "@/components/Icon";
import { logger } from "@/lib/logger";

const log = logger("error-boundary");

/**
 * Error boundary for the /invest/ segment and all nested listing / vertical
 * pages that don't define their own. Previously a render-time failure
 * anywhere under /invest/ crashed to the Next.js default 500 page with no
 * recovery path and no error-id for support. This mirrors the /compare/
 * boundary pattern.
 */
export default function InvestError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    log.error("Invest segment error", { error: error.message, digest: error.digest });
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <Icon name="alert-triangle" size={48} className="text-slate-300 mx-auto mb-4" />
        <h1 className="text-2xl font-extrabold text-slate-900 mb-2">
          Couldn&apos;t load investment opportunities
        </h1>
        <p className="text-slate-600 mb-6">
          We had trouble loading this page. Try refreshing, or browse all
          listings while we look into it.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={reset}
            className="w-full sm:w-auto px-6 py-3 min-h-[48px] bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800 transition-colors text-sm"
          >
            Try Again
          </button>
          <Link
            href="/invest/listings"
            className="w-full sm:w-auto px-6 py-3 min-h-[48px] inline-flex items-center justify-center border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-colors text-sm"
          >
            Browse All Listings
          </Link>
        </div>
        {error.digest && (
          <p className="mt-6 text-xs text-slate-400">Error ID: {error.digest}</p>
        )}
      </div>
    </div>
  );
}
