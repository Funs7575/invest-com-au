export default function Loading() {
  return (
    <div
      className="max-w-3xl mx-auto px-4 py-16 animate-pulse"
      aria-busy="true"
      aria-label="Loading portfolio fee monitor..."
    >
      {/* Hero heading */}
      <div className="text-center mb-10">
        <div className="h-9 w-72 bg-slate-200 rounded mx-auto mb-3" />
        <div className="h-4 w-96 bg-slate-100 rounded mx-auto mb-1.5" />
        <div className="h-4 w-80 bg-slate-100 rounded mx-auto" />
      </div>

      {/* Email step card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-4 shadow-sm">
        <div className="h-5 w-40 bg-slate-200 rounded mb-4" />
        <div className="h-10 w-full bg-slate-100 rounded-lg mb-3" />
        <div className="h-10 w-full bg-slate-100 rounded-lg mb-4" />
        <div className="h-10 w-full bg-slate-200 rounded-lg" />
      </div>

      {/* Feature bullets */}
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-5 h-5 bg-slate-200 rounded-full shrink-0" />
            <div className="h-3.5 flex-1 bg-slate-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
