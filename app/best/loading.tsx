export default function Loading() {
  return (
    <div className="animate-pulse">
      <section className="py-12 md:py-16">
        <div className="max-w-5xl mx-auto px-4">
          <div className="h-9 w-80 bg-slate-200 rounded mb-3 mx-auto" />
          <div className="h-5 w-96 max-w-full bg-slate-100 rounded mb-10 mx-auto" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="h-48 bg-white rounded-xl border border-slate-200" />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
