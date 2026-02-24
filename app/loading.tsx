export default function Loading() {
  return (
    <div className="animate-pulse">
      {/* Ticker placeholder */}
      <div className="h-10 bg-slate-100" />

      {/* Hero section */}
      <section className="bg-white py-12 md:py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          {/* Badge */}
          <div className="h-6 w-48 bg-slate-100 rounded-full mx-auto mb-4" />
          {/* H1 lines */}
          <div className="h-9 md:h-12 w-[80%] max-w-lg bg-slate-200 rounded mx-auto mb-2" />
          <div className="h-9 md:h-12 w-[60%] max-w-sm bg-slate-200 rounded mx-auto mb-4" />
          {/* Subtitle */}
          <div className="h-5 w-[70%] max-w-md bg-slate-100 rounded mx-auto mb-8" />
          {/* Search bar */}
          <div className="h-14 max-w-xl mx-auto bg-slate-100 rounded-2xl mb-6" />
          {/* Two CTA buttons */}
          <div className="flex gap-3 justify-center mb-8">
            <div className="h-12 w-40 bg-slate-200 rounded-xl" />
            <div className="h-12 w-40 bg-slate-100 rounded-xl" />
          </div>
          {/* Trust signals */}
          <div className="flex flex-wrap justify-center gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-5 w-28 bg-slate-100 rounded" />
            ))}
          </div>
        </div>
      </section>

      {/* Logo strip */}
      <section className="py-6 border-y border-slate-100">
        <div className="container-custom">
          <div className="flex items-center justify-center gap-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="w-20 h-8 bg-slate-100 rounded hidden md:block" />
            ))}
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={`m-${i}`} className="w-16 h-7 bg-slate-100 rounded md:hidden" />
            ))}
          </div>
        </div>
      </section>

      {/* Comparison table section */}
      <section className="py-12 md:py-16">
        <div className="container-custom">
          {/* Heading */}
          <div className="text-center mb-8">
            <div className="h-8 w-72 bg-slate-200 rounded mx-auto mb-3" />
            <div className="h-5 w-96 max-w-full bg-slate-100 rounded mx-auto" />
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2 mb-4 px-4 md:px-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-8 w-28 bg-slate-100 rounded-full shrink-0" />
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block">
            {/* Table header */}
            <div className="h-10 bg-slate-50 rounded-t-xl border border-slate-100 mb-px" />
            {/* Table rows */}
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-14 bg-white border-b border-slate-100 flex items-center px-5 gap-4">
                <div className="w-6 h-4 bg-slate-100 rounded" />
                <div className="w-8 h-8 bg-slate-100 rounded-lg" />
                <div className="w-28 h-4 bg-slate-100 rounded" />
                <div className="flex-1" />
                <div className="w-16 h-4 bg-slate-100 rounded" />
                <div className="w-16 h-4 bg-slate-100 rounded" />
                <div className="w-12 h-4 bg-slate-100 rounded" />
                <div className="w-20 h-8 bg-slate-200 rounded-lg" />
              </div>
            ))}
          </div>

          {/* Mobile rows */}
          <div className="md:hidden divide-y divide-slate-100">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="py-3.5 px-4">
                <div className="flex items-center gap-3 mb-2.5">
                  <div className="w-7 h-4 bg-slate-100 rounded" />
                  <div className="w-9 h-9 bg-slate-100 rounded-lg" />
                  <div className="flex-1">
                    <div className="h-4 w-24 bg-slate-200 rounded mb-1" />
                    <div className="h-3 w-20 bg-slate-100 rounded" />
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-10">
                  <div className="h-3 w-14 bg-slate-100 rounded" />
                  <div className="h-3 w-14 bg-slate-100 rounded" />
                  <div className="flex-1" />
                  <div className="w-16 h-8 bg-slate-200 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Deals section */}
      <section className="py-12 bg-slate-50">
        <div className="container-custom">
          <div className="h-7 w-48 bg-slate-200 rounded mb-6 mx-auto" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-36 bg-white rounded-xl border border-slate-200" />
            <div className="h-36 bg-white rounded-xl border border-slate-200 hidden md:block" />
            <div className="h-36 bg-white rounded-xl border border-slate-200 hidden md:block" />
          </div>
        </div>
      </section>
    </div>
  );
}
