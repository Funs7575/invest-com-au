export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50 animate-pulse" aria-busy="true" aria-label="Loading company profile...">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
          <div className="h-3.5 w-24 bg-slate-200 rounded mb-1.5" />
          <div className="h-5 w-40 bg-slate-200 rounded" />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Profile field rows */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="px-5 py-3 flex items-center justify-between">
              <div className="h-4 w-28 bg-slate-200 rounded" />
              <div className="h-4 w-40 bg-slate-100 rounded" />
            </div>
          ))}
        </div>

        <div className="h-3 w-80 bg-slate-100 rounded mt-4" />
      </main>
    </div>
  );
}
