export default function Loading() {
  return (
    <div className="animate-pulse">
      {/* Ticker placeholder */}
      <div className="h-10 bg-slate-100" />
      {/* Hero */}
      <section className="bg-white py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="h-10 w-96 bg-slate-200 rounded mx-auto mb-4" />
          <div className="h-6 w-80 bg-slate-100 rounded mx-auto mb-6" />
          <div className="flex gap-3 justify-center mb-6">
            <div className="h-12 w-40 bg-slate-200 rounded-lg" />
            <div className="h-12 w-40 bg-slate-100 rounded-lg" />
          </div>
          <div className="h-16 max-w-2xl mx-auto bg-slate-100 rounded-2xl" />
        </div>
      </section>
      {/* Table section */}
      <section className="py-12">
        <div className="container-custom">
          <div className="h-8 w-48 bg-slate-200 rounded mb-6" />
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-16 bg-slate-100 rounded-xl" />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
