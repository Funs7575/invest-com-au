export default function Loading() {
  return (
    <div className="animate-pulse space-y-4 p-6" aria-busy="true" aria-label="Loading deals">
      {/* Header */}
      <div className="h-7 w-28 bg-slate-200 rounded" />

      {/* Deal items */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="p-4 border border-slate-100 rounded-xl space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="h-5 w-52 bg-slate-200 rounded" />
            <div className="h-5 w-20 bg-slate-200 rounded-full shrink-0" />
          </div>
          <div className="h-4 w-full bg-slate-100 rounded" />
          <div className="flex items-center gap-4">
            <div className="h-3.5 w-24 bg-slate-100 rounded" />
            <div className="h-3.5 w-20 bg-slate-100 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
