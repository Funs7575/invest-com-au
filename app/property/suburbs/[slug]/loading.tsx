export default function SuburbDetailLoading() {
  return (
    <div className="bg-white min-h-screen animate-pulse">
      {/* Hero skeleton */}
      <section className="bg-white border-b border-slate-100">
        <div className="container-custom py-6 md:py-8">
          <div className="h-3 w-48 bg-slate-100 rounded mb-4" />
          <div className="h-8 w-64 bg-slate-100 rounded mb-2" />
          <div className="h-4 w-80 bg-slate-100 rounded" />

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-slate-50 rounded-xl p-3 text-center">
                <div className="h-6 w-20 bg-slate-100 rounded mx-auto mb-1" />
                <div className="h-3 w-16 bg-slate-100 rounded mx-auto" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="container-custom py-6 md:py-8 space-y-8">
        {/* Capital Growth skeleton */}
        <section>
          <div className="h-5 w-40 bg-slate-100 rounded mb-3" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 text-center">
                <div className="h-7 w-16 bg-slate-100 rounded mx-auto mb-1" />
                <div className="h-3 w-12 bg-slate-100 rounded mx-auto" />
              </div>
            ))}
          </div>
        </section>

        {/* Demographics skeleton */}
        <section>
          <div className="h-5 w-36 bg-slate-100 rounded mb-3" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-slate-50 rounded-xl p-3">
                <div className="h-3 w-16 bg-slate-200 rounded mb-1" />
                <div className="h-5 w-20 bg-slate-200 rounded" />
              </div>
            ))}
          </div>
        </section>

        {/* Why Invest skeleton */}
        <section>
          <div className="h-5 w-52 bg-slate-100 rounded mb-2" />
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
            <div className="h-3 w-full bg-slate-100 rounded" />
            <div className="h-3 w-5/6 bg-slate-100 rounded" />
            <div className="h-3 w-4/6 bg-slate-100 rounded" />
          </div>
        </section>

        {/* Market Comparison table skeleton */}
        <section>
          <div className="h-5 w-56 bg-slate-100 rounded mb-3" />
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className={`flex justify-between px-4 py-3 ${i === 0 ? "bg-slate-50 border-b border-slate-200" : "border-b border-slate-100"}`}>
                <div className="h-4 w-32 bg-slate-100 rounded" />
                <div className="h-4 w-20 bg-slate-100 rounded" />
                <div className="h-4 w-20 bg-slate-100 rounded" />
              </div>
            ))}
          </div>
        </section>

        {/* CTA skeleton */}
        <section>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-center">
            <div className="h-4 w-48 bg-slate-100 rounded mx-auto mb-3" />
            <div className="h-10 w-44 bg-slate-200 rounded-lg mx-auto" />
          </div>
        </section>
      </div>
    </div>
  );
}
