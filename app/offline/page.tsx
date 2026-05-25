import Link from "next/link";
import type { Metadata } from "next";
import Icon from "@/components/Icon";

export const metadata: Metadata = {
  title: "You're Offline | Invest.com.au",
  description: "It looks like you're offline. Some pages are available from cache.",
  robots: { index: false, follow: false },
};

/**
 * Offline fallback page — served by the service worker (sw.js) when a
 * navigation request fails and the page isn't in the HTML cache.
 *
 * This page is precached during SW install so it is always available,
 * even on first visit before any other pages are cached.
 *
 * Design matches the existing 404 / error page style.
 */
export default function OfflinePage() {
  return (
    <main className="min-h-[60vh] flex items-center justify-center px-4 py-16">
      <div className="text-center max-w-lg">
        {/* Visual icon */}
        <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-6">
          <Icon name="wifi-off" size={36} className="text-slate-300" />
        </div>

        <h1 className="text-xl md:text-2xl font-bold text-slate-900 mb-2">
          You&apos;re Offline
        </h1>
        <p className="text-sm md:text-base text-slate-500 mb-8 leading-relaxed">
          It looks like you&apos;ve lost your internet connection. Pages you&apos;ve
          visited recently may still be available below.
        </p>

        {/* Cached pages that are available offline */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
          <Link
            href="/"
            className="w-full sm:w-auto px-6 py-3 min-h-12 inline-flex items-center justify-center bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors"
          >
            Try Homepage
          </Link>
          <Link
            href="/compare"
            className="w-full sm:w-auto px-6 py-3 min-h-12 inline-flex items-center justify-center bg-white text-slate-900 text-sm font-semibold rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            Compare Platforms
          </Link>
        </div>

        {/* Other pages that may be cached */}
        <div className="border-t border-slate-100 pt-6">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">
            May be available offline
          </p>
          <div className="grid grid-cols-2 gap-2 text-left max-w-sm mx-auto">
            <Link
              href="/calculators"
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors group"
            >
              <Icon
                name="calculator"
                size={16}
                className="text-slate-400 group-hover:text-amber-500 transition-colors shrink-0"
              />
              <span className="text-xs font-medium text-slate-600">Fee Calculators</span>
            </Link>
            <Link
              href="/articles"
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors group"
            >
              <Icon
                name="lightbulb"
                size={16}
                className="text-slate-400 group-hover:text-amber-500 transition-colors shrink-0"
              />
              <span className="text-xs font-medium text-slate-600">Investing Guides</span>
            </Link>
          </div>
        </div>

        <p className="mt-8 text-xs text-slate-400">
          Reconnect to the internet to access the full site.
        </p>
      </div>
    </main>
  );
}
