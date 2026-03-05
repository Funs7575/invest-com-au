export default function AdvisorProfileLoading() {
  return (
    <div className="py-5 md:py-12 animate-pulse">
      <div className="container-custom max-w-3xl">
        <div className="h-3 w-32 bg-slate-200 rounded mb-3" />
        <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-6 mb-4">
          <div className="flex gap-4">
            <div className="w-16 h-16 bg-slate-200 rounded-full shrink-0" />
            <div className="flex-1">
              <div className="h-5 w-40 bg-slate-200 rounded mb-2" />
              <div className="h-3 w-28 bg-slate-100 rounded mb-2" />
              <div className="h-3 w-48 bg-slate-100 rounded" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 bg-slate-100 rounded-lg" />)}
        </div>
        <div className="h-32 bg-slate-100 rounded-xl mb-4" />
        <div className="h-64 bg-slate-100 rounded-xl" />
      </div>
    </div>
  );
}
