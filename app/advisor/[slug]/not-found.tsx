import Link from "next/link";
import Icon from "@/components/Icon";

export default function AdvisorNotFound() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center px-4 py-12">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
          <Icon name="user-x" size={28} className="text-slate-300" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">Advisor Not Found</h1>
        <p className="text-sm text-slate-500 mb-6">
          This advisor profile doesn&apos;t exist or may have been removed.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/advisors" className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors text-center">
            Browse All Advisors
          </Link>
          <Link href="/quiz" className="w-full sm:w-auto px-5 py-2.5 border border-slate-200 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors text-center">
            Platform Quiz
          </Link>
        </div>
      </div>
    </div>
  );
}
