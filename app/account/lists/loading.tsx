export default function Loading() {
  return (
    <div
      className="max-w-3xl mx-auto px-4 sm:px-6 py-8 animate-pulse"
      aria-busy="true"
      aria-label="Loading lists"
    >
      {/* Header */}
      <div className="h-7 w-32 bg-slate-200 rounded-lg mb-2" />
      <div className="h-4 w-64 bg-slate-100 rounded mb-6" />

      {/* Create list form skeleton */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6 flex gap-3">
        <div className="h-10 flex-1 bg-slate-100 rounded-lg" />
        <div className="h-10 w-28 bg-slate-200 rounded-lg" />
      </div>

      {/* List cards skeleton */}
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="h-5 w-36 bg-slate-200 rounded" />
              <div className="h-4 w-16 bg-slate-100 rounded" />
            </div>
            <div className="h-3 w-full bg-slate-100 rounded mb-2" />
            <div className="h-3 w-2/3 bg-slate-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
