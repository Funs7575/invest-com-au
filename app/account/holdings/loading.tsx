export default function Loading() {
  return (
    <div
      className="max-w-4xl mx-auto px-4 sm:px-6 py-8 animate-pulse"
      aria-busy="true"
      aria-label="Loading holdings"
    >
      {/* Header */}
      <div className="h-7 w-40 bg-slate-200 rounded-lg mb-2" />
      <div className="h-4 w-72 bg-slate-100 rounded mb-6" />

      {/* Add holding form skeleton */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6">
        <div className="h-5 w-28 bg-slate-200 rounded mb-3" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 bg-slate-100 rounded-lg" />
          ))}
        </div>
        <div className="h-10 w-32 bg-slate-200 rounded-lg mt-3" />
      </div>

      {/* Holdings list skeleton */}
      <div className="h-5 w-28 bg-slate-200 rounded mb-3" />
      <div className="border border-slate-200 rounded-xl divide-y divide-slate-100">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="px-4 py-3 flex items-center justify-between gap-4">
            <div className="space-y-1.5 flex-1">
              <div className="h-4 w-16 bg-slate-200 rounded" />
              <div className="h-3 w-48 bg-slate-100 rounded" />
            </div>
            <div className="h-4 w-20 bg-slate-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
