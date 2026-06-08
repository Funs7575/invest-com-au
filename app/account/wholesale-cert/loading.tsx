export default function Loading() {
  return (
    <div className="py-6 md:py-10 animate-pulse" aria-busy="true" aria-label="Loading wholesale certificate">
      <div className="container-custom max-w-2xl">
        <div className="h-3.5 w-24 bg-slate-200 rounded mb-3" />
        <div className="mb-6">
          <div className="h-8 w-52 bg-slate-200 rounded mb-2" />
          <div className="h-4 w-72 bg-slate-100 rounded" />
        </div>
        {/* status card */}
        <div className="p-6 border border-slate-100 rounded-2xl bg-white mb-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 bg-slate-200 rounded-full" />
            <div>
              <div className="h-5 w-36 bg-slate-200 rounded mb-1" />
              <div className="h-3 w-24 bg-slate-100 rounded" />
            </div>
          </div>
          <div className="h-3 w-full bg-slate-100 rounded mb-2" />
          <div className="h-3 w-4/5 bg-slate-100 rounded" />
        </div>
        {/* radio options */}
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3 p-4 mb-3 border border-slate-100 rounded-xl">
            <div className="h-5 w-5 bg-slate-200 rounded-full shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="h-4 w-52 bg-slate-200 rounded mb-1" />
              <div className="h-3 w-64 bg-slate-100 rounded" />
            </div>
          </div>
        ))}
        <div className="h-11 w-40 bg-slate-200 rounded-lg mt-4" />
      </div>
    </div>
  );
}
