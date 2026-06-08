export default function Loading() {
  return (
    <div className="py-6 md:py-10 animate-pulse" aria-busy="true" aria-label="Loading org portal">
      <div className="container-custom max-w-5xl">
        <div className="h-8 w-44 bg-slate-200 rounded mb-2" />
        <div className="h-4 w-56 bg-slate-100 rounded mb-6" />
        <div className="flex gap-2 mb-6 border-b border-slate-100 pb-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 w-24 bg-slate-200 rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-5 border border-slate-100 rounded-xl bg-white">
              <div className="h-3 w-16 bg-slate-100 rounded mb-2" />
              <div className="h-8 w-10 bg-slate-200 rounded" />
            </div>
          ))}
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex justify-between items-center py-3 border-b border-slate-100">
            <div className="h-4 w-40 bg-slate-200 rounded" />
            <div className="h-4 w-16 bg-slate-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
