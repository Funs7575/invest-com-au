export default function Loading() {
  return (
    <div className="py-6 md:py-10 animate-pulse" aria-busy="true" aria-label="Loading life event">
      <div className="container-custom max-w-3xl">
        <div className="h-3.5 w-32 bg-slate-200 rounded mb-4" />
        <div className="flex gap-4 mb-6">
          <div className="h-14 w-14 bg-slate-200 rounded-2xl shrink-0" />
          <div>
            <div className="h-8 w-48 bg-slate-200 rounded mb-2" />
            <div className="h-4 w-64 bg-slate-100 rounded" />
          </div>
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-5 mb-3 bg-white border border-slate-100 rounded-xl">
            <div className="h-5 w-48 bg-slate-200 rounded mb-2" />
            <div className="h-3.5 w-full bg-slate-100 rounded mb-1" />
            <div className="h-3.5 w-3/4 bg-slate-100 rounded mb-3" />
            <div className="h-9 w-28 bg-slate-200 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
