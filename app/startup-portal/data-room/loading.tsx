export default function Loading() {
  return (
    <div className="animate-pulse space-y-4 p-6" aria-busy="true" aria-label="Loading data room">
      {/* Header + upload button */}
      <div className="flex items-center justify-between">
        <div className="h-7 w-36 bg-slate-200 rounded" />
        <div className="h-9 w-28 bg-slate-200 rounded-lg" />
      </div>

      {/* File list */}
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 border border-slate-100 rounded-xl">
          <div className="h-9 w-9 bg-slate-200 rounded-lg shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-4 w-48 bg-slate-200 rounded" />
            <div className="h-3 w-24 bg-slate-100 rounded" />
          </div>
          <div className="h-3.5 w-20 bg-slate-100 rounded shrink-0" />
          <div className="h-8 w-8 bg-slate-100 rounded-lg shrink-0" />
        </div>
      ))}
    </div>
  );
}
