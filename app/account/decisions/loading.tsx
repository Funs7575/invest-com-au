export default function Loading() {
  return (
    <div className="py-6 md:py-10 animate-pulse" aria-busy="true" aria-label="Loading decisions">
      <div className="container-custom max-w-3xl">
        <div className="h-3.5 w-24 bg-slate-200 rounded mb-3" />
        <div className="mb-6">
          <div className="h-8 w-36 bg-slate-200 rounded mb-2" />
          <div className="h-4 w-64 bg-slate-100 rounded" />
        </div>
        {/* decision cards */}
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-4 mb-3 border border-slate-100 rounded-xl bg-white">
            <div className="flex justify-between mb-2">
              <div className="h-4 w-48 bg-slate-200 rounded" />
              <div className="h-5 w-16 bg-slate-100 rounded-full" />
            </div>
            <div className="h-3 w-72 bg-slate-100 rounded mb-2" />
            <div className="h-3 w-56 bg-slate-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
