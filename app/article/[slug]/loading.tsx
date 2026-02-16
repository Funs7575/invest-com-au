export default function Loading() {
  return (
    <div className="animate-pulse">
      {/* Dark hero */}
      <section className="bg-slate-900 py-16">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto">
            <div className="h-4 w-48 bg-slate-700 rounded mb-6" />
            <div className="flex gap-3 mb-4">
              <div className="h-5 w-16 bg-slate-700 rounded-full" />
              <div className="h-5 w-20 bg-slate-700 rounded-full" />
            </div>
            <div className="h-10 w-full bg-slate-700 rounded mb-3" />
            <div className="h-10 w-3/4 bg-slate-700 rounded mb-4" />
            <div className="h-5 w-full bg-slate-800 rounded" />
          </div>
        </div>
      </section>
      {/* Content area */}
      <div className="py-12">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto space-y-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-5 bg-slate-100 rounded" style={{ width: `${75 + (i % 3) * 10}%` }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
