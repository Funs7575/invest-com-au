export default function Loading() {
  return (
    <div className="py-8 md:py-12 animate-pulse" aria-busy="true" aria-label="Loading portfolio X-ray">
      <div className="container-custom max-w-5xl">
        <div className="h-8 w-48 bg-slate-200 rounded mb-2 mx-auto" />
        <div className="h-4 w-72 bg-slate-100 rounded mb-8 mx-auto" />
        <div className="grid md:grid-cols-5 gap-6">
          {/* holdings list */}
          <div className="md:col-span-3 p-6 border border-slate-100 rounded-2xl bg-white">
            <div className="h-4 w-24 bg-slate-200 rounded mb-4" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex justify-between items-center py-3 border-b border-slate-50">
                <div className="h-4 w-20 bg-slate-200 rounded" />
                <div className="h-4 w-16 bg-slate-100 rounded" />
                <div className="h-4 w-16 bg-slate-100 rounded" />
              </div>
            ))}
            {/* add form */}
            <div className="flex gap-2 mt-4">
              {[30, 30, 20, 20].map((w, i) => (
                <div key={i} className="h-10 bg-slate-100 rounded-lg" style={{ width: `${w}%` }} />
              ))}
            </div>
          </div>
          {/* analysis panel */}
          <div className="md:col-span-2 p-6 border border-slate-100 rounded-2xl bg-white space-y-4">
            <div className="h-4 w-24 bg-slate-200 rounded" />
            <div className="h-40 w-full bg-slate-100 rounded-xl" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex justify-between">
                <div className="h-3.5 w-24 bg-slate-100 rounded" />
                <div className="h-3.5 w-16 bg-slate-200 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
