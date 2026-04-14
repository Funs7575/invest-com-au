"use client";

/**
 * Shared route error boundary.
 *
 * Each route-group error.tsx can just re-export this instead of
 * defining their own ~40 lines of copy. Reports to Sentry on mount
 * and surfaces a friendly retry button.
 *
 *     // app/foo/error.tsx
 *     "use client";
 *     export { default } from "@/components/RouteErrorBoundary";
 */

import { useEffect } from "react";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";

export default function RouteErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md text-center">
        <div className="mb-4 text-5xl" aria-hidden="true">
          ⚠️
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 mb-2">
          Something went wrong on this page
        </h1>
        <p className="text-sm text-slate-600 leading-relaxed mb-6">
          We&apos;ve logged the error and our engineers will take a look. You
          can try reloading this page, or head back to somewhere safe.
        </p>
        <div className="flex gap-2 justify-center flex-wrap">
          <button
            type="button"
            onClick={() => reset()}
            className="px-4 py-2 rounded bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800"
          >
            Try again
          </button>
          <Link
            href="/"
            className="px-4 py-2 rounded bg-white border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50"
          >
            Home
          </Link>
        </div>
        {error.digest && (
          <p className="mt-6 text-[0.65rem] text-slate-400 font-mono">
            Reference: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
