"use client";

import Link from "next/link";

export default function AdvisorProfileError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-[50vh] flex items-center justify-center px-4 py-12">
      <div className="text-center max-w-md">
        <div className="text-4xl mb-4">👤</div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">Profile unavailable</h1>
        <p className="text-sm text-slate-500 mb-6">We couldn&apos;t load this advisor&apos;s profile. Try refreshing.</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button onClick={reset} className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors">Try Again</button>
          <Link href="/advisors" className="w-full sm:w-auto px-5 py-2.5 border border-slate-200 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors">Browse Advisors</Link>
        </div>
      </div>
    </div>
  );
}
