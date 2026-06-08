export default function Loading() {
  return (
    <div
      className="max-w-3xl mx-auto px-4 sm:px-6 py-8 animate-pulse"
      aria-busy="true"
      aria-label="Loading saved searches"
    >
      <div className="h-4 w-24 bg-slate-100 rounded mb-3" />
      <div className="h-7 w-44 bg-slate-200 rounded-lg mb-2" />
      <div className="h-4 w-64 bg-slate-100 rounded mb-6" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between gap-4">
            <div className="space-y-1.5 flex-1">
              <div className="h-4 w-40 bg-slate-200 rounded" />
              <div className="h-3 w-64 bg-slate-100 rounded" />
            </div>
            <div className="h-8 w-20 bg-slate-100 rounded-lg shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
