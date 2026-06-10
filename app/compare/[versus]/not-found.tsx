import Link from "next/link";
import Icon from "@/components/Icon";

// Co-located not-found boundary. Without it, `notFound()` in this route falls
// back to the root boundary, which the @netlify/plugin-nextjs runtime serves as
// a 500 ("Server Error") instead of a graceful not-found page. The 8 other
// dynamic routes that already ship a co-located not-found.tsx degrade cleanly;
// this one and the invest-listings route were the two that still 500'd.
export default function CompareNotFound() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center px-4 py-12">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
          <Icon name="scale" size={28} className="text-slate-300" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">Comparison Not Found</h1>
        <p className="text-sm text-slate-500 mb-6">
          We couldn&apos;t find that comparison. One or more brokers may have been renamed or removed.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
          <Link
            href="/compare"
            className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors text-center"
          >
            Compare All Brokers
          </Link>
          <Link
            href="/best"
            className="w-full sm:w-auto px-5 py-2.5 border border-slate-200 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors text-center"
          >
            Best-Of Rankings
          </Link>
        </div>
        <div className="border-t border-slate-100 pt-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Popular comparisons</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Link href="/versus/commsec-vs-stake" className="px-3 py-1.5 rounded-full min-h-9 bg-slate-50 hover:bg-slate-100 text-xs font-medium text-slate-600 transition-colors">
              CommSec vs Stake
            </Link>
            <Link href="/versus/selfwealth-vs-pearler" className="px-3 py-1.5 rounded-full min-h-9 bg-slate-50 hover:bg-slate-100 text-xs font-medium text-slate-600 transition-colors">
              SelfWealth vs Pearler
            </Link>
            <Link href="/best/brokers" className="px-3 py-1.5 rounded-full min-h-9 bg-slate-50 hover:bg-slate-100 text-xs font-medium text-slate-600 transition-colors">
              Best brokers
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
