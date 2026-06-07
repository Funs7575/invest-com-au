export default function Loading() {
  return (
    <div
      className="py-6 md:py-10 animate-pulse"
      aria-busy="true"
      aria-label="Loading notifications"
    >
      <div className="container-custom max-w-3xl">
        <div className="h-3 w-24 bg-slate-100 rounded mb-3" />
        <div className="h-7 w-40 bg-slate-200 rounded-lg mb-1" />
        <div className="h-4 w-24 bg-slate-100 rounded mb-6" />
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 flex items-start gap-3">
              <div className="w-8 h-8 bg-slate-200 rounded-full shrink-0 mt-0.5" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-48 bg-slate-200 rounded" />
                <div className="h-3 w-full bg-slate-100 rounded" />
                <div className="h-3 w-24 bg-slate-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
