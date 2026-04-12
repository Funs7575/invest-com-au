import Link from "next/link";
import Icon from "@/components/Icon";

export default function AdvisorGuideNotFound() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center px-4 py-12">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
          <Icon name="book-open" size={28} className="text-slate-300" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">Guide Not Found</h1>
        <p className="text-sm text-slate-500 mb-6">
          This advisor guide doesn&apos;t exist or may have been removed.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
          <Link
            href="/advisor-guides"
            className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors text-center"
          >
            All Advisor Guides
          </Link>
          <Link
            href="/advisors"
            className="w-full sm:w-auto px-5 py-2.5 border border-slate-200 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors text-center"
          >
            Browse Advisors
          </Link>
        </div>
        <div className="border-t border-slate-100 pt-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">You might like</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Link href="/advisor-guides" className="px-3 py-1.5 rounded-full bg-slate-50 hover:bg-slate-100 text-xs font-medium text-slate-600 transition-colors">
              All guides
            </Link>
            <Link href="/advisors" className="px-3 py-1.5 rounded-full bg-slate-50 hover:bg-slate-100 text-xs font-medium text-slate-600 transition-colors">
              Find an advisor
            </Link>
            <Link href="/articles" className="px-3 py-1.5 rounded-full bg-slate-50 hover:bg-slate-100 text-xs font-medium text-slate-600 transition-colors">
              Articles
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
