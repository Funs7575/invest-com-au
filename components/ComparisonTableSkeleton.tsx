export default function ComparisonTableSkeleton() {
  return (
    <div className="my-10 animate-pulse">
      <div className="h-6 w-64 bg-slate-200 rounded mb-4" />
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <div className="bg-slate-50 px-5 py-3 flex gap-10">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-4 w-16 bg-slate-200 rounded" />
          ))}
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="px-5 py-4 flex items-center gap-10 border-t border-slate-100"
          >
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 bg-slate-200 rounded-lg" />
              <div className="h-4 w-28 bg-slate-200 rounded" />
            </div>
            <div className="h-4 w-14 bg-slate-200 rounded" />
            <div className="h-4 w-14 bg-slate-200 rounded" />
            <div className="h-4 w-20 bg-slate-200 rounded" />
            <div className="h-8 w-24 bg-slate-200 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
