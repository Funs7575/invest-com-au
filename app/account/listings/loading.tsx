export default function Loading() {
  return (
    <div className="py-6 md:py-10 animate-pulse" aria-busy="true" aria-label="Loading listings">
      <div className="container-custom max-w-3xl">
        <div className="h-3.5 w-24 bg-slate-200 rounded mb-3" />
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="h-8 w-32 bg-slate-200 rounded mb-2" />
            <div className="h-4 w-52 bg-slate-100 rounded" />
          </div>
          <div className="h-10 w-32 bg-slate-200 rounded-lg" />
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-4 mb-3 bg-white border border-slate-100 rounded-xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 bg-slate-200 rounded-lg shrink-0" />
              <div className="flex-1">
                <div className="h-5 w-44 bg-slate-200 rounded mb-1" />
                <div className="h-3.5 w-24 bg-slate-100 rounded" />
              </div>
              <div className="h-6 w-16 bg-slate-100 rounded-full" />
            </div>
            <div className="flex gap-2">
              <div className="h-8 w-16 bg-slate-100 rounded-md" />
              <div className="h-8 w-14 bg-slate-100 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
