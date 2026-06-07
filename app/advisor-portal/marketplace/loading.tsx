export default function Loading() {
  return (
    <div className="animate-pulse space-y-6 p-6" aria-busy="true" aria-label="Loading marketplace">
      {/* Header */}
      <div className="h-7 w-40 bg-slate-200 rounded" />

      {/* Grid of 4 marketplace cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-4 border border-slate-100 rounded-xl space-y-3">
            <div className="h-12 w-12 bg-slate-200 rounded-lg" />
            <div className="h-5 w-28 bg-slate-200 rounded" />
            <div className="h-4 w-full bg-slate-100 rounded" />
            <div className="h-4 w-4/5 bg-slate-100 rounded" />
            <div className="h-8 w-full bg-slate-200 rounded-lg mt-1" />
          </div>
        ))}
      </div>
    </div>
  );
}
