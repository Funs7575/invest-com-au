export default function ListingSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-white border border-slate-200 rounded-xl overflow-hidden animate-pulse">
          <div className="aspect-[16/9] bg-slate-100" />
          <div className="p-5 space-y-3">
            <div className="h-3 bg-slate-100 rounded w-1/3" />
            <div className="h-4 bg-slate-100 rounded w-3/4" />
            <div className="h-5 bg-slate-100 rounded w-1/4" />
            <div className="flex gap-2">
              <div className="h-6 bg-slate-100 rounded-full w-16" />
              <div className="h-6 bg-slate-100 rounded-full w-20" />
            </div>
            <div className="h-10 bg-slate-100 rounded-lg w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ComparisonTableSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="flex gap-2 mb-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-8 bg-slate-100 rounded-full w-24" />
        ))}
      </div>
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <div className="bg-slate-50 px-4 py-3 flex gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-3 bg-slate-200 rounded w-16" />
          ))}
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="px-4 py-4 flex items-center gap-4 border-t border-slate-100">
            <div className="w-8 h-8 bg-slate-100 rounded-lg" />
            <div className="h-4 bg-slate-100 rounded w-32" />
            <div className="h-3 bg-slate-100 rounded w-16 ml-auto" />
            <div className="h-3 bg-slate-100 rounded w-16" />
            <div className="h-8 bg-amber-100 rounded-lg w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdvisorCardSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-start gap-4 bg-white border border-slate-200 rounded-xl p-4 animate-pulse">
          <div className="w-12 h-12 bg-slate-100 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-slate-100 rounded w-1/2" />
            <div className="h-3 bg-slate-100 rounded w-1/3" />
            <div className="h-3 bg-slate-100 rounded w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );
}
