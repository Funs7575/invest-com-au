"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ReviewsError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error("Reviews page error:", error);
  }, [error]);

  return (
    <div className="py-16 text-center">
      <div className="container-custom max-w-md">
        <h2 className="text-xl font-extrabold text-slate-900 mb-2">
          Couldn&apos;t load reviews
        </h2>
        <p className="text-sm text-slate-500 mb-6">
          Something went wrong loading broker reviews. Please try again.
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
