export default function ApplyLoading() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 animate-pulse">
      <div className="w-full max-w-lg">
        <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-6 md:p-8">
          {/* Broker identity */}
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-xl bg-slate-200 shrink-0" />
            <div className="flex-1">
              <div className="h-6 w-40 bg-slate-200 rounded mb-2" />
              <div className="h-4 w-56 bg-slate-100 rounded" />
            </div>
          </div>

          {/* Rating */}
          <div className="h-4 w-32 bg-slate-100 rounded mb-5" />

          {/* Key fees grid */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-slate-50 rounded-lg p-3">
                <div className="h-2.5 w-12 bg-slate-200 rounded mx-auto mb-2" />
                <div className="h-4 w-10 bg-slate-200 rounded mx-auto" />
              </div>
            ))}
          </div>

          {/* Trust signals */}
          <div className="flex gap-2 mb-5">
            <div className="h-6 w-28 bg-slate-100 rounded-full" />
            <div className="h-6 w-32 bg-slate-100 rounded-full" />
            <div className="h-6 w-20 bg-slate-100 rounded-full" />
          </div>

          {/* Pros */}
          <div className="space-y-2 mb-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-4 bg-slate-100 rounded w-4/5" />
            ))}
          </div>

          {/* CTA button */}
          <div className="h-12 bg-slate-200 rounded-lg w-full mb-3" />

          {/* Back link */}
          <div className="h-4 w-32 bg-slate-100 rounded mx-auto" />
        </div>
      </div>
    </div>
  );
}
