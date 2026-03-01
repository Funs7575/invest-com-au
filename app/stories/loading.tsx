export default function Loading() {
  return (
    <div className="animate-pulse">
      <section className="py-12 md:py-16">
        <div className="max-w-4xl mx-auto px-4">
          <div className="h-8 w-64 bg-slate-200 rounded mb-4" />
          <div className="h-5 w-96 max-w-full bg-slate-100 rounded mb-8" />
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-4 bg-slate-100 rounded w-full" />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
