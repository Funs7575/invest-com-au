"use client";

import Link from "next/link";
import { useEffect } from "react";
import Icon from "@/components/Icon";
import { logger } from "@/lib/logger";

const log = logger("error-boundary");

/**
 * Error boundary for the /auth/ segment (login, signup, reset, magic link
 * callbacks). A thrown error in any auth flow previously crashed to the
 * default 500 page, leaving the user with no way to recover except by
 * clearing cookies. This provides explicit links to alternate recovery
 * paths instead.
 */
export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    log.error("Auth flow error", { error: error.message, digest: error.digest });
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <Icon name="alert-triangle" size={48} className="text-slate-300 mx-auto mb-4" />
        <h1 className="text-2xl font-extrabold text-slate-900 mb-2">
          Authentication problem
        </h1>
        <p className="text-slate-600 mb-6">
          We had trouble with this sign-in step. Try again, or use one of
          the alternate paths below.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={reset}
            className="w-full sm:w-auto px-6 py-3 min-h-[48px] bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800 transition-colors text-sm"
          >
            Try Again
          </button>
          <Link
            href="/auth/login"
            className="w-full sm:w-auto px-6 py-3 min-h-[48px] inline-flex items-center justify-center border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-colors text-sm"
          >
            Back to Sign In
          </Link>
        </div>
        <p className="mt-4 text-xs text-slate-500">
          Forgot your password?{" "}
          <Link href="/auth/reset-password" className="text-amber-600 hover:underline font-semibold">
            Reset it here
          </Link>
        </p>
        {error.digest && (
          <p className="mt-6 text-xs text-slate-400">Error ID: {error.digest}</p>
        )}
      </div>
    </div>
  );
}
