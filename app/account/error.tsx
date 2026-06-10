"use client";

import Link from "next/link";
import { logger } from "@/lib/logger";

const log = logger("account-error");

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  log.error("account page error", { digest: error.digest, message: error.message });

  return (
    <div className="py-16 px-4">
      <div className="max-w-md mx-auto text-center">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Something went wrong</h2>
        <p className="text-sm text-slate-500 mb-6">
          An error occurred loading this page. This is usually temporary — try again or return to your account.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="px-5 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-800 transition-colors"
          >
            Try Again
          </button>
          <Link
            href="/account"
            className="px-5 py-2.5 border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors"
          >
            Back to Account
          </Link>
        </div>
        {error.digest && (
          <p className="text-xs text-slate-500 mt-6">Error ID: {error.digest}</p>
        )}
      </div>
    </div>
  );
}
