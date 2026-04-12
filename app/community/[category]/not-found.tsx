import Link from "next/link";
import Icon from "@/components/Icon";

export default function CategoryNotFound() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center px-4 py-12">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
          <Icon name="message-circle" size={28} className="text-slate-300" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">Category Not Found</h1>
        <p className="text-sm text-slate-500 mb-6">
          This community category doesn&apos;t exist or may have been archived.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
          <Link
            href="/community"
            className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors text-center"
          >
            Browse All Categories
          </Link>
          <Link
            href="/community/new"
            className="w-full sm:w-auto px-5 py-2.5 border border-slate-200 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors text-center"
          >
            Start a Discussion
          </Link>
        </div>
        <div className="border-t border-slate-100 pt-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Popular categories</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Link href="/community/general" className="px-3 py-1.5 rounded-full bg-slate-50 hover:bg-slate-100 text-xs font-medium text-slate-600 transition-colors">
              General
            </Link>
            <Link href="/community/brokers" className="px-3 py-1.5 rounded-full bg-slate-50 hover:bg-slate-100 text-xs font-medium text-slate-600 transition-colors">
              Brokers
            </Link>
            <Link href="/community/etfs" className="px-3 py-1.5 rounded-full bg-slate-50 hover:bg-slate-100 text-xs font-medium text-slate-600 transition-colors">
              ETFs
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
