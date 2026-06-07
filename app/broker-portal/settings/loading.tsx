export default function Loading() {
  return (
    <div className="animate-pulse space-y-6 p-6" aria-busy="true" aria-label="Loading settings">
      {/* Header */}
      <div className="h-7 w-32 bg-slate-200 rounded" />

      {/* Settings sections */}
      {Array.from({ length: 3 }).map((_, s) => (
        <div key={s} className="p-4 border border-slate-100 rounded-xl space-y-4">
          <div className="h-5 w-36 bg-slate-200 rounded" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-3.5 w-24 bg-slate-200 rounded" />
              <div className="h-10 w-full bg-slate-100 rounded-lg" />
            </div>
          ))}
        </div>
      ))}

      <div className="h-10 w-28 bg-slate-200 rounded-lg" />
    </div>
  );
}
