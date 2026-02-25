"use client";

import { useEffect } from "react";
import Icon from "@/components/Icon";

export default function BrokerPortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Broker portal error:", error);
  }, [error]);

  return (
    <div className="min-h-[50vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
          <Icon name="alert-triangle" size={28} className="text-red-500" />
        </div>
        <h1 className="text-xl font-extrabold text-slate-900 mb-2">
          Something went wrong
        </h1>
        <p className="text-sm text-slate-500 mb-6">
          We hit an unexpected error loading this page. This has been logged
          automatically. Try refreshing, or contact support if it persists.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={reset}
            className="px-5 py-2.5 bg-slate-900 text-white font-bold text-sm rounded-lg hover:bg-slate-800 transition-colors"
          >
            Try Again
          </button>
          <a
            href="/broker-portal/support"
            className="px-5 py-2.5 border border-slate-200 text-slate-700 font-bold text-sm rounded-lg hover:bg-slate-50 transition-colors"
          >
            Contact Support
          </a>
        </div>
        {error.digest && (
          <p className="mt-5 text-[0.69rem] text-slate-400">
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
