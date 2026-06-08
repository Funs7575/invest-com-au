export default function Loading() {
  return (
    <div className="py-8 md:py-12 animate-pulse" aria-busy="true" aria-label="Loading CGT calculator">
      <div className="container-custom max-w-5xl">
        <div className="h-8 w-52 bg-slate-200 rounded mb-2 mx-auto" />
        <div className="h-4 w-64 bg-slate-100 rounded mb-8 mx-auto" />
        <div className="grid md:grid-cols-2 gap-6">
          <div className="p-6 border border-slate-100 rounded-2xl bg-white space-y-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i}>
                <div className="h-3.5 w-32 bg-slate-200 rounded mb-2" />
                <div className="h-10 w-full bg-slate-100 rounded-lg" />
              </div>
            ))}
          </div>
          <div className="p-6 border border-slate-100 rounded-2xl bg-white space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex justify-between py-2 border-b border-slate-50">
                <div className="h-4 w-36 bg-slate-100 rounded" />
                <div className="h-4 w-24 bg-slate-200 rounded" />
              </div>
            ))}
            <div className="pt-2">
              <div className="h-4 w-32 bg-slate-200 rounded mb-1" />
              <div className="h-10 w-40 bg-slate-300 rounded" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
