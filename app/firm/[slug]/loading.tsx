export default function FirmProfileLoading() {
  return (
    <div className="min-h-screen bg-white animate-pulse">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="h-3 w-40 bg-slate-100 rounded" />
        </div>
      </div>

      {/* Hero */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 py-8 md:py-12">
        <div className="max-w-5xl mx-auto px-4 flex items-center gap-5">
          <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-700 rounded-2xl shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-6 bg-slate-700 rounded w-48" />
            <div className="h-4 bg-slate-800 rounded w-64" />
            <div className="flex gap-2 mt-2">
              <div className="h-5 w-20 bg-slate-700 rounded-full" />
              <div className="h-5 w-24 bg-slate-700 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-5xl mx-auto px-4 py-6 md:py-8 space-y-6">
        <div className="h-20 bg-slate-100 rounded-xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 bg-slate-100 rounded-xl" />
          ))}
        </div>
        <div className="space-y-3">
          <div className="h-5 bg-slate-100 rounded w-32" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 border border-slate-100 rounded-xl">
              <div className="w-10 h-10 bg-slate-100 rounded-full" />
              <div className="flex-1 space-y-1">
                <div className="h-4 bg-slate-100 rounded w-36" />
                <div className="h-3 bg-slate-100 rounded w-24" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
