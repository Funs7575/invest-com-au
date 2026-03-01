export default function Loading() {
  return (
    <div className="animate-pulse">
      <section className="py-12 md:py-16">
        <div className="max-w-4xl mx-auto px-4">
          <div className="h-9 w-96 max-w-full bg-slate-200 rounded mb-3" />
          <div className="h-5 w-full bg-slate-100 rounded mb-8" />
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-24 bg-white rounded-xl border border-slate-200 flex items-center px-5 gap-4">
                <div className="w-6 h-4 bg-slate-100 rounded" />
                <div className="w-10 h-10 bg-slate-100 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-slate-200 rounded" />
                  <div className="h-3 w-48 bg-slate-100 rounded" />
                </div>
                <div className="w-20 h-8 bg-slate-200 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
