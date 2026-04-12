import Link from "next/link";
import Icon from "@/components/Icon";

export default function HowToNotFound() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center px-4 py-12">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
          <Icon name="list-checks" size={28} className="text-slate-300" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">Guide Not Found</h1>
        <p className="text-sm text-slate-500 mb-6">
          This how-to guide doesn&apos;t exist or may have moved.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
          <Link
            href="/how-to"
            className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors text-center"
          >
            All How-To Guides
          </Link>
          <Link
            href="/articles"
            className="w-full sm:w-auto px-5 py-2.5 border border-slate-200 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors text-center"
          >
            Browse Articles
          </Link>
        </div>
        <div className="border-t border-slate-100 pt-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Popular guides</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Link href="/how-to/buy-shares" className="px-3 py-1.5 rounded-full bg-slate-50 hover:bg-slate-100 text-xs font-medium text-slate-600 transition-colors">
              How to buy shares
            </Link>
            <Link href="/how-to/open-brokerage-account" className="px-3 py-1.5 rounded-full bg-slate-50 hover:bg-slate-100 text-xs font-medium text-slate-600 transition-colors">
              Open an account
            </Link>
            <Link href="/how-to/invest-in-etfs" className="px-3 py-1.5 rounded-full bg-slate-50 hover:bg-slate-100 text-xs font-medium text-slate-600 transition-colors">
              Invest in ETFs
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
