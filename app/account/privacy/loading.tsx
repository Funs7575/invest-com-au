export default function Loading() {
  return (
    <div className="py-6 md:py-10 animate-pulse" aria-busy="true" aria-label="Loading privacy settings">
      <div className="container-custom max-w-2xl">
        <div className="h-3.5 w-24 bg-slate-200 rounded mb-3" />
        <div className="mb-6">
          <div className="h-8 w-40 bg-slate-200 rounded mb-2" />
          <div className="h-4 w-64 bg-slate-100 rounded" />
        </div>
        {/* settings sections */}
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-start justify-between py-5 border-b border-slate-100">
            <div className="flex-1 pr-8">
              <div className="h-4 w-40 bg-slate-200 rounded mb-2" />
              <div className="h-3 w-72 bg-slate-100 rounded mb-1" />
              <div className="h-3 w-56 bg-slate-100 rounded" />
            </div>
            <div className="h-6 w-11 bg-slate-200 rounded-full shrink-0 mt-0.5" />
          </div>
        ))}
        {/* danger zone */}
        <div className="mt-8 p-5 border border-red-100 rounded-xl bg-red-50">
          <div className="h-4 w-28 bg-red-200 rounded mb-3" />
          <div className="h-3 w-72 bg-red-100 rounded mb-4" />
          <div className="h-10 w-40 bg-red-200 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
