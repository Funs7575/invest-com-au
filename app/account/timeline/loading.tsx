export default function Loading() {
  return (
    <div className="py-6 md:py-10 animate-pulse" aria-busy="true" aria-label="Loading timeline">
      <div className="container-custom max-w-2xl">
        <div className="h-3.5 w-24 bg-slate-200 rounded mb-3" />
        <div className="mb-6">
          <div className="h-8 w-32 bg-slate-200 rounded mb-2" />
          <div className="h-4 w-56 bg-slate-100 rounded" />
        </div>
        {/* timeline events */}
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex gap-4 mb-6">
            <div className="flex flex-col items-center">
              <div className="h-8 w-8 bg-slate-200 rounded-full shrink-0" />
              {i < 5 && <div className="w-0.5 h-10 bg-slate-100 mt-1" />}
            </div>
            <div className="flex-1 pb-2">
              <div className="h-4 w-48 bg-slate-200 rounded mb-1" />
              <div className="h-3 w-24 bg-slate-100 rounded mb-2" />
              <div className="h-3 w-64 bg-slate-100 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
