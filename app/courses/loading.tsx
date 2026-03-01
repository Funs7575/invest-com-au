export default function Loading() {
  return (
    <div className="py-8 md:py-12 animate-pulse">
      <div className="container-custom max-w-5xl">
        {/* Header */}
        <div className="h-8 w-64 bg-slate-200 rounded mb-2" />
        <div className="h-4 w-96 bg-slate-100 rounded mb-8" />

        {/* Course cards grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-slate-200 p-5">
              <div className="h-4 w-20 bg-slate-100 rounded-full mb-3" />
              <div className="h-5 w-full bg-slate-200 rounded mb-2" />
              <div className="h-4 w-3/4 bg-slate-100 rounded mb-4" />
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 bg-slate-100 rounded-full" />
                <div className="h-3 w-24 bg-slate-100 rounded" />
              </div>
              <div className="h-10 w-full bg-slate-100 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
