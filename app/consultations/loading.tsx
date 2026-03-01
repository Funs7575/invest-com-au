export default function Loading() {
  return (
    <div className="py-8 md:py-12 animate-pulse">
      <div className="container-custom max-w-5xl">
        {/* Breadcrumb */}
        <div className="h-3 w-36 bg-slate-100 rounded mb-6" />

        {/* Header */}
        <div className="h-8 w-72 bg-slate-200 rounded mb-2" />
        <div className="h-4 w-full max-w-lg bg-slate-100 rounded mb-8" />

        {/* Consultation cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-slate-200 p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-slate-200 rounded-full" />
                <div>
                  <div className="h-4 w-28 bg-slate-200 rounded mb-1" />
                  <div className="h-3 w-20 bg-slate-100 rounded" />
                </div>
              </div>
              <div className="h-4 w-full bg-slate-100 rounded mb-2" />
              <div className="h-4 w-2/3 bg-slate-100 rounded mb-4" />
              <div className="flex items-center justify-between">
                <div className="h-5 w-16 bg-slate-200 rounded" />
                <div className="h-10 w-24 bg-slate-100 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
