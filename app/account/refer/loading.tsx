export default function Loading() {
  return (
    <div className="py-6 md:py-10 animate-pulse" aria-busy="true" aria-label="Loading refer a friend">
      <div className="container-custom max-w-2xl">
        <div className="h-3.5 w-24 bg-slate-200 rounded mb-3" />
        <div className="mb-6">
          <div className="h-8 w-44 bg-slate-200 rounded mb-2" />
          <div className="h-4 w-64 bg-slate-100 rounded" />
        </div>
        {/* referral link */}
        <div className="p-5 border border-slate-100 rounded-xl bg-white mb-5">
          <div className="h-4 w-24 bg-slate-200 rounded mb-3" />
          <div className="flex gap-2">
            <div className="h-11 flex-1 bg-slate-100 rounded-lg" />
            <div className="h-11 w-24 bg-slate-200 rounded-lg" />
          </div>
        </div>
        {/* stats */}
        <div className="grid grid-cols-3 gap-4 mb-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-4 border border-slate-100 rounded-xl text-center">
              <div className="h-8 w-10 bg-slate-200 rounded mx-auto mb-1" />
              <div className="h-3 w-16 bg-slate-100 rounded mx-auto" />
            </div>
          ))}
        </div>
        {/* reward info */}
        <div className="p-5 border border-violet-100 rounded-xl bg-violet-50">
          <div className="h-4 w-36 bg-violet-200 rounded mb-3" />
          <div className="h-3 w-full bg-violet-100 rounded mb-2" />
          <div className="h-3 w-3/4 bg-violet-100 rounded" />
        </div>
      </div>
    </div>
  );
}
