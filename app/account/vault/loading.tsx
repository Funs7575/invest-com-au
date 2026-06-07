export default function Loading() {
  return (
    <div className="py-6 md:py-10 animate-pulse" aria-busy="true" aria-label="Loading vault documents">
      <div className="container-custom max-w-3xl">
        <div className="h-3.5 w-24 bg-slate-200 rounded mb-3" />
        <div className="mb-6">
          <div className="h-8 w-36 bg-slate-200 rounded mb-2" />
          <div className="h-4 w-64 bg-slate-100 rounded" />
        </div>
        {/* upload drop zone */}
        <div className="h-28 w-full bg-slate-100 border-2 border-dashed border-slate-200 rounded-xl mb-6" />
        {/* document rows */}
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-3 border-b border-slate-100">
            <div className="h-9 w-9 bg-slate-200 rounded-lg shrink-0" />
            <div className="flex-1">
              <div className="h-4 w-48 bg-slate-200 rounded mb-1" />
              <div className="h-3 w-24 bg-slate-100 rounded" />
            </div>
            <div className="h-7 w-16 bg-slate-100 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
