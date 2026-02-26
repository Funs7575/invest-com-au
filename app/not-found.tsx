import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page Not Found | Invest.com.au",
  description: "The page you're looking for doesn't exist. Browse our broker comparisons, guides, and tools.",
};

export default function NotFound() {
  return (
    <main className="min-h-[60vh] flex items-center justify-center px-4 py-16">
      <div className="text-center max-w-md">
        <p className="text-7xl font-extrabold text-slate-200 mb-4">404</p>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          Page Not Found
        </h1>
        <p className="text-slate-500 mb-8 leading-relaxed">
          Sorry, we couldn&apos;t find the page you&apos;re looking for. It may have been
          moved or no longer exists.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="px-6 py-3 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors"
          >
            Go to Homepage
          </Link>
          <Link
            href="/compare"
            className="px-6 py-3 bg-white text-slate-900 text-sm font-semibold rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            Compare Brokers
          </Link>
        </div>
      </div>
    </main>
  );
}
