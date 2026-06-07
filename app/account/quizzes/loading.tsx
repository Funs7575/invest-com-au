export default function Loading() {
  return (
    <div className="py-6 md:py-10 animate-pulse" aria-busy="true" aria-label="Loading quiz history">
      <div className="container-custom max-w-3xl">
        <div className="h-3.5 w-24 bg-slate-200 rounded mb-3" />
        <div className="mb-6">
          <div className="h-8 w-36 bg-slate-200 rounded mb-2" />
          <div className="h-4 w-60 bg-slate-100 rounded" />
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-4 mb-3 border border-slate-100 rounded-xl bg-white">
            <div className="flex justify-between mb-2">
              <div className="h-4 w-44 bg-slate-200 rounded" />
              <div className="h-4 w-20 bg-slate-100 rounded" />
            </div>
            <div className="flex gap-2 mt-3">
              <div className="h-6 w-24 bg-slate-100 rounded-full" />
              <div className="h-6 w-20 bg-slate-100 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
