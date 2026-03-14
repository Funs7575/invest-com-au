export default function FindAdvisorLoading() {
  return (
    <div className="min-h-[70vh] flex flex-col bg-gradient-to-b from-violet-50/40 to-white">
      <div className="container-custom max-w-xl py-6 md:py-12 flex-1 animate-pulse">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-3 md:mb-6">
          <div className="h-3 w-10 bg-slate-200 rounded" />
          <div className="h-3 w-2 bg-slate-100 rounded" />
          <div className="h-3 w-14 bg-slate-200 rounded" />
          <div className="h-3 w-2 bg-slate-100 rounded" />
          <div className="h-3 w-24 bg-slate-200 rounded" />
        </div>
        {/* Progress bar */}
        <div className="mb-6 md:mb-8">
          <div className="flex justify-between mb-1.5">
            <div className="h-3 w-16 bg-slate-200 rounded" />
            <div className="h-3 w-8 bg-violet-200 rounded" />
          </div>
          <div className="h-2 bg-slate-200 rounded-full" />
        </div>
        {/* Question */}
        <div className="h-8 md:h-10 w-72 bg-slate-200 rounded mb-2" />
        <div className="h-4 w-56 bg-slate-100 rounded mb-5" />
        {/* Options */}
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 md:h-[4.5rem] bg-white border-2 border-slate-200 rounded-xl flex items-center gap-3 px-3">
              <div className="w-9 h-9 bg-slate-100 rounded-lg shrink-0" />
              <div className="flex-1">
                <div className="h-4 w-32 bg-slate-200 rounded mb-1" />
                <div className="h-3 w-48 bg-slate-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
