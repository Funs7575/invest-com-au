export default function Loading() {
  return (
    <div className="animate-pulse space-y-4 p-6" aria-busy="true" aria-label="Loading team members">
      {/* Header + invite button */}
      <div className="flex items-center justify-between">
        <div className="h-7 w-32 bg-slate-200 rounded" />
        <div className="h-9 w-32 bg-slate-200 rounded-lg" />
      </div>

      {/* Team member rows */}
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="p-4 border border-slate-100 rounded-xl flex items-center gap-4">
          <div className="h-10 w-10 bg-slate-200 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-4 w-36 bg-slate-200 rounded" />
            <div className="h-3.5 w-24 bg-slate-100 rounded" />
          </div>
          <div className="h-5 w-20 bg-slate-200 rounded-full" />
          <div className="flex gap-2">
            <div className="h-8 w-16 bg-slate-100 rounded-lg" />
            <div className="h-8 w-16 bg-slate-100 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}
