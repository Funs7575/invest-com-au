export default function Loading() {
  return (
    <div className="animate-pulse space-y-6 p-6 max-w-2xl" aria-busy="true" aria-label="Loading new round form">
      {/* Header */}
      <div className="h-7 w-40 bg-slate-200 rounded" />
      <div className="h-4 w-64 bg-slate-100 rounded" />

      {/* Form fields */}
      <div className="space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-3.5 w-28 bg-slate-200 rounded" />
            <div className="h-10 w-full bg-slate-100 rounded-lg" />
          </div>
        ))}

        {/* Date range row */}
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-3.5 w-24 bg-slate-200 rounded" />
              <div className="h-10 w-full bg-slate-100 rounded-lg" />
            </div>
          ))}
        </div>

        {/* Textarea */}
        <div className="space-y-1.5">
          <div className="h-3.5 w-20 bg-slate-200 rounded" />
          <div className="h-24 w-full bg-slate-100 rounded-lg" />
        </div>
      </div>

      <div className="flex gap-3">
        <div className="h-10 w-32 bg-slate-200 rounded-lg" />
        <div className="h-10 w-24 bg-slate-100 rounded-lg" />
      </div>
    </div>
  );
}
