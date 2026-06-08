export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50 animate-pulse" aria-busy="true" aria-label="Loading ESIC verification...">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
          <div className="h-3 w-40 bg-slate-200 rounded mb-2" />
          <div className="h-5 w-40 bg-slate-200 rounded mb-1.5" />
          <div className="h-3.5 w-80 bg-slate-100 rounded" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Status card */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-slate-100 rounded-full" />
            <div>
              <div className="h-4 w-36 bg-slate-200 rounded mb-1.5" />
              <div className="h-3 w-24 bg-slate-100 rounded" />
            </div>
          </div>
          <div className="h-3.5 w-full bg-slate-100 rounded mb-2" />
          <div className="h-3.5 w-3/4 bg-slate-100 rounded" />
        </div>

        {/* Self-attestation form card */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-4">
          <div className="h-5 w-48 bg-slate-200 rounded mb-3" />
          <div className="h-3.5 w-full bg-slate-100 rounded mb-1.5" />
          <div className="h-3.5 w-5/6 bg-slate-100 rounded mb-4" />

          <div className="space-y-3 mb-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-4 h-4 bg-slate-200 rounded mt-0.5" />
                <div className="flex-1">
                  <div className="h-3.5 w-full bg-slate-100 rounded mb-1" />
                  <div className="h-3.5 w-3/4 bg-slate-100 rounded" />
                </div>
              </div>
            ))}
          </div>

          <div className="h-10 w-40 bg-slate-200 rounded-lg" />
        </div>

        {/* Upload documents card */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="h-5 w-44 bg-slate-200 rounded mb-3" />
          <div className="h-24 bg-slate-50 rounded-lg border border-dashed border-slate-200 mb-3" />
          <div className="h-3.5 w-56 bg-slate-100 rounded" />
        </div>
      </main>
    </div>
  );
}
