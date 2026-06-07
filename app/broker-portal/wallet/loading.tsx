export default function Loading() {
  return (
    <div className="animate-pulse space-y-6 p-6" aria-busy="true" aria-label="Loading wallet">
      {/* Balance card */}
      <div className="p-6 border border-slate-100 rounded-xl space-y-3">
        <div className="h-4 w-24 bg-slate-100 rounded" />
        <div className="h-10 w-40 bg-slate-200 rounded" />
        <div className="flex gap-3 mt-2">
          <div className="h-9 w-28 bg-slate-200 rounded-lg" />
          <div className="h-9 w-28 bg-slate-100 rounded-lg" />
        </div>
      </div>

      {/* Transaction list */}
      <div className="h-5 w-36 bg-slate-200 rounded" />
      <div className="border border-slate-100 rounded-xl overflow-hidden">
        <div className="flex gap-4 p-3 bg-slate-50 border-b border-slate-100">
          {["Date", "Description", "Amount", "Status"].map((_, i) => (
            <div key={i} className="flex-1 h-4 bg-slate-200 rounded" />
          ))}
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4 p-3 border-b border-slate-100 last:border-0">
            <div className="flex-1 h-4 bg-slate-100 rounded" />
            <div className="flex-1 h-4 bg-slate-100 rounded" />
            <div className="flex-1 h-4 bg-slate-100 rounded" />
            <div className="w-16 h-5 bg-slate-200 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
