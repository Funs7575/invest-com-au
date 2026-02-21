"use client";

import Link from "next/link";
import { useEffect } from "react";
import Icon from "@/components/Icon";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled error:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <Icon name="alert-triangle" size={48} className="text-slate-300 mx-auto mb-4" />
        <h1 className="text-2xl font-extrabold text-slate-900 mb-2">
          Something went wrong
        </h1>
        <p className="text-slate-600 mb-6">
          We hit an unexpected error. This has been logged and we&apos;ll look
          into it. Try refreshing or head back to the homepage.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={reset}
            className="px-6 py-3 bg-green-700 text-white font-semibold rounded-lg hover:bg-green-800 transition-colors text-sm"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="px-6 py-3 border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-colors text-sm"
          >
            Back to Homepage
          </Link>
        </div>
        {error.digest && (
          <p className="mt-6 text-xs text-slate-400">
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
