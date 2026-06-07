export default function Loading() {
  return (
    <div className="py-6 md:py-10 animate-pulse" aria-busy="true" aria-label="Loading startup portal">
      <div className="container-custom max-w-5xl">
        <div className="h-8 w-44 bg-slate-200 rounded mb-2" />
        <div className="h-4 w-64 bg-slate-100 rounded mb-6" />
        {/* tab nav */}
        <div className="flex gap-2 mb-6 border-b border-slate-100 pb-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 w-24 bg-slate-200 rounded-lg" />
          ))}
        </div>
        {/* content cards */}
        <div className="grid sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-5 border border-slate-100 rounded-xl bg-white">
              <div className="h-4 w-36 bg-slate-200 rounded mb-3" />
              <div className="h-3 w-full bg-slate-100 rounded mb-2" />
              <div className="h-3 w-3/4 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
