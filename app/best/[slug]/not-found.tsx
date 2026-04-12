import Link from "next/link";
import Icon from "@/components/Icon";

export default function BestCategoryNotFound() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center px-4 py-12">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
          <Icon name="trophy" size={28} className="text-slate-300" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">Category Not Found</h1>
        <p className="text-sm text-slate-500 mb-6">
          That &quot;best&quot; category doesn&apos;t exist. Try one of our popular rankings below.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
          <Link
            href="/best"
            className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors text-center"
          >
            All Best-Of Lists
          </Link>
          <Link
            href="/compare"
            className="w-full sm:w-auto px-5 py-2.5 border border-slate-200 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors text-center"
          >
            Compare Brokers
          </Link>
        </div>
        <div className="border-t border-slate-100 pt-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Popular rankings</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Link href="/best/brokers" className="px-3 py-1.5 rounded-full bg-slate-50 hover:bg-slate-100 text-xs font-medium text-slate-600 transition-colors">
              Best brokers
            </Link>
            <Link href="/best/etf-platforms" className="px-3 py-1.5 rounded-full bg-slate-50 hover:bg-slate-100 text-xs font-medium text-slate-600 transition-colors">
              Best for ETFs
            </Link>
            <Link href="/best/beginners" className="px-3 py-1.5 rounded-full bg-slate-50 hover:bg-slate-100 text-xs font-medium text-slate-600 transition-colors">
              Best for beginners
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
