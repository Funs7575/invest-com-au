import Link from "next/link";
import Icon from "@/components/Icon";

export default function ArticleNotFound() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center px-4 py-12">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
          <Icon name="file-text" size={28} className="text-slate-300" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">Article Not Found</h1>
        <p className="text-sm text-slate-500 mb-6">
          This article doesn&apos;t exist or may have been moved.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
          <Link
            href="/articles"
            className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors text-center"
          >
            Browse All Articles
          </Link>
          <Link
            href="/"
            className="w-full sm:w-auto px-5 py-2.5 border border-slate-200 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors text-center"
          >
            Go Home
          </Link>
        </div>
        <div className="border-t border-slate-100 pt-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Popular guides</p>
          <div className="grid grid-cols-1 gap-2 text-left max-w-sm mx-auto">
            <Link href="/articles" className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors group">
              <Icon name="lightbulb" size={16} className="text-slate-400 group-hover:text-amber-500 shrink-0" />
              <span className="text-xs font-medium text-slate-600">Investing for beginners</span>
            </Link>
            <Link href="/compare" className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors group">
              <Icon name="scale" size={16} className="text-slate-400 group-hover:text-amber-500 shrink-0" />
              <span className="text-xs font-medium text-slate-600">Compare broker fees</span>
            </Link>
            <Link href="/quiz" className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors group">
              <Icon name="target" size={16} className="text-slate-400 group-hover:text-amber-500 shrink-0" />
              <span className="text-xs font-medium text-slate-600">Find your match with the quiz</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
