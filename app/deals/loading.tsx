export default function Loading() {
  return (
    <div className="py-12 animate-pulse">
      <div className="container-custom max-w-5xl">
        {/* Breadcrumb */}
        <div className="h-4 w-32 bg-slate-200 rounded mb-6" />
        <div className="h-10 w-72 bg-slate-200 rounded mb-3" />
        <div className="h-5 w-96 bg-slate-100 rounded mb-8" />
        {/* Deal cards */}
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="border border-slate-200 rounded-xl p-6 flex items-center gap-6">
              <div className="w-14 h-14 bg-slate-200 rounded-xl shrink-0" />
              <div className="flex-1">
                <div className="h-6 w-48 bg-slate-200 rounded mb-2" />
                <div className="h-4 w-72 bg-slate-100 rounded mb-2" />
                <div className="h-4 w-40 bg-slate-100 rounded" />
              </div>
              <div className="h-10 w-28 bg-slate-200 rounded-lg shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
