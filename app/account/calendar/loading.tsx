export default function Loading() {
  return (
    <div className="py-6 md:py-10 animate-pulse" aria-busy="true" aria-label="Loading calendar">
      <div className="container-custom max-w-3xl">
        <div className="h-3.5 w-24 bg-slate-200 rounded mb-3" />
        <div className="mb-6">
          <div className="h-8 w-32 bg-slate-200 rounded mb-2" />
          <div className="h-4 w-56 bg-slate-100 rounded" />
        </div>
        {/* calendar grid */}
        <div className="p-4 border border-slate-100 rounded-xl bg-white mb-5">
          <div className="flex justify-between items-center mb-4">
            <div className="h-6 w-32 bg-slate-200 rounded" />
            <div className="flex gap-2">
              <div className="h-8 w-8 bg-slate-100 rounded" />
              <div className="h-8 w-8 bg-slate-100 rounded" />
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="h-9 bg-slate-50 rounded" />
            ))}
          </div>
        </div>
        {/* upcoming events */}
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-3 border-b border-slate-100">
            <div className="h-10 w-10 bg-slate-200 rounded-lg shrink-0" />
            <div className="flex-1">
              <div className="h-4 w-48 bg-slate-200 rounded mb-1" />
              <div className="h-3 w-32 bg-slate-100 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
