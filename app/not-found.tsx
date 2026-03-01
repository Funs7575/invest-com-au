import Link from "next/link";
import type { Metadata } from "next";
import Icon from "@/components/Icon";

export const metadata: Metadata = {
  title: "Page Not Found | Invest.com.au",
  description: "The page you're looking for doesn't exist. Browse our broker comparisons, guides, and tools.",
};

export default function NotFound() {
  return (
    <main className="min-h-[60vh] flex items-center justify-center px-4 py-16">
      <div className="text-center max-w-lg">
        {/* Visual icon */}
        <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-6">
          <Icon name="search" size={36} className="text-slate-300" />
        </div>

        <p className="text-6xl md:text-7xl font-extrabold text-slate-200 mb-3">404</p>
        <h1 className="text-xl md:text-2xl font-bold text-slate-900 mb-2">
          Page Not Found
        </h1>
        <p className="text-sm md:text-base text-slate-500 mb-8 leading-relaxed">
          Sorry, we couldn&apos;t find the page you&apos;re looking for. It may have been
          moved or no longer exists.
        </p>

        {/* Primary CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
          <Link
            href="/"
            className="w-full sm:w-auto px-6 py-3 min-h-[48px] inline-flex items-center justify-center bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors"
          >
            Go to Homepage
          </Link>
          <Link
            href="/compare"
            className="w-full sm:w-auto px-6 py-3 min-h-[48px] inline-flex items-center justify-center bg-white text-slate-900 text-sm font-semibold rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            Compare Brokers
          </Link>
        </div>

        {/* Suggested popular pages */}
        <div className="border-t border-slate-100 pt-6">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">Popular Pages</p>
          <div className="grid grid-cols-2 gap-2 text-left max-w-sm mx-auto">
            <Link href="/quiz" className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors group">
              <Icon name="target" size={16} className="text-slate-400 group-hover:text-amber-500 transition-colors shrink-0" />
              <span className="text-xs font-medium text-slate-600">Broker Match Quiz</span>
            </Link>
            <Link href="/calculators" className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors group">
              <Icon name="calculator" size={16} className="text-slate-400 group-hover:text-amber-500 transition-colors shrink-0" />
              <span className="text-xs font-medium text-slate-600">Fee Calculators</span>
            </Link>
            <Link href="/guides" className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors group">
              <Icon name="lightbulb" size={16} className="text-slate-400 group-hover:text-amber-500 transition-colors shrink-0" />
              <span className="text-xs font-medium text-slate-600">Investing Guides</span>
            </Link>
            <Link href="/shortlist" className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors group">
              <Icon name="star" size={16} className="text-slate-400 group-hover:text-amber-500 transition-colors shrink-0" />
              <span className="text-xs font-medium text-slate-600">My Shortlist</span>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
