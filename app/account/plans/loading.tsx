export default function Loading() {
  return (
    <div className="py-6 md:py-10 animate-pulse" aria-busy="true" aria-label="Loading plans">
      <div className="container-custom max-w-3xl">
        <div className="h-3.5 w-24 bg-slate-200 rounded mb-3" />
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="h-8 w-28 bg-slate-200 rounded mb-2" />
            <div className="h-4 w-52 bg-slate-100 rounded" />
          </div>
          <div className="h-10 w-32 bg-slate-200 rounded-lg" />
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-5 mb-3 bg-white border border-slate-100 rounded-xl flex gap-4">
            <div className="flex-1">
              <div className="h-5 w-48 bg-slate-200 rounded mb-2" />
              <div className="h-3.5 w-32 bg-slate-100 rounded mb-3" />
              <div className="flex gap-2">
                <div className="h-3.5 w-20 bg-slate-100 rounded" />
                <div className="h-3.5 w-20 bg-slate-100 rounded" />
              </div>
            </div>
            <div className="h-9 w-20 bg-slate-100 rounded-lg shrink-0 self-start mt-1" />
          </div>
        ))}
      </div>
    </div>
  );
}
