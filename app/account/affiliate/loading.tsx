export default function Loading() {
  return (
    <div className="py-6 md:py-10 animate-pulse" aria-busy="true" aria-label="Loading affiliate dashboard">
      <div className="container-custom max-w-3xl">
        <div className="h-3.5 w-24 bg-slate-200 rounded mb-3" />
        <div className="mb-6">
          <div className="h-8 w-44 bg-slate-200 rounded mb-2" />
          <div className="h-4 w-64 bg-slate-100 rounded" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-4 border border-slate-100 rounded-xl bg-white">
              <div className="h-3 w-16 bg-slate-100 rounded mb-2" />
              <div className="h-7 w-20 bg-slate-200 rounded" />
            </div>
          ))}
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex justify-between items-center py-3 border-b border-slate-100">
            <div className="h-4 w-40 bg-slate-200 rounded" />
            <div className="h-4 w-20 bg-slate-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
