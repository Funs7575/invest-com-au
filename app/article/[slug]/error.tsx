"use client";

import Link from "next/link";
import { useEffect } from "react";
import Icon from "@/components/Icon";

export default function ArticleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Article page error:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <Icon name="alert-triangle" size={48} className="text-slate-300 mx-auto mb-4" />
        <h1 className="text-2xl font-extrabold text-slate-900 mb-2">
          Couldn&apos;t load this article
        </h1>
        <p className="text-slate-600 mb-6">
          We had trouble loading this article. Try refreshing or browse our guides.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={reset}
            className="w-full sm:w-auto px-6 py-3 min-h-[48px] bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800 transition-colors text-sm"
          >
            Try Again
          </button>
          <Link
            href="/guides"
            className="w-full sm:w-auto px-6 py-3 min-h-[48px] inline-flex items-center justify-center border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-colors text-sm"
          >
            Browse Guides
          </Link>
        </div>
        {error.digest && (
          <p className="mt-6 text-xs text-slate-400">Error ID: {error.digest}</p>
        )}
      </div>
    </div>
  );
}
