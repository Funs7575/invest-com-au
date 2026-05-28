"use client";

import { useEffect } from "react";
import Link from "next/link";
import { logger } from "@/lib/logger";

const log = logger("error-boundary");

export default function CostsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    log.error("Costs page error", { error: error.message, digest: error.digest });
  }, [error]);

  return (
    <div className="py-16 text-center">
      <div className="container-custom max-w-md">
        <h2 className="text-xl font-extrabold text-slate-900 mb-2">
          Couldn&apos;t load fee calculator
        </h2>
        <p className="text-sm text-slate-500 mb-6">
          We couldn&apos;t load the fee calculator. Please try again.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="px-5 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="px-5 py-2.5 border border-slate-200 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors"
          >
            Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
