export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 animate-pulse" aria-busy="true" aria-label="Loading registration">
      <div className="w-full max-w-md border border-slate-100 rounded-2xl p-8 space-y-5">
        <div className="h-8 w-44 bg-slate-200 rounded" />
        <div className="h-4 w-56 bg-slate-100 rounded" />

        <div className="space-y-4 mt-2">
          {/* Name row */}
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="h-3.5 w-20 bg-slate-200 rounded" />
                <div className="h-10 w-full bg-slate-100 rounded-lg" />
              </div>
            ))}
          </div>
          {/* Single fields */}
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-3.5 w-24 bg-slate-200 rounded" />
              <div className="h-10 w-full bg-slate-100 rounded-lg" />
            </div>
          ))}
        </div>

        <div className="h-10 w-full bg-slate-200 rounded-lg" />
        <div className="h-4 w-40 bg-slate-100 rounded mx-auto" />
      </div>
    </div>
  );
}
