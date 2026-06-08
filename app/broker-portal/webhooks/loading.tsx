export default function Loading() {
  return (
    <div className="space-y-6 max-w-3xl animate-pulse" aria-busy="true" aria-label="Loading webhooks...">
      {/* Page title */}
      <div>
        <div className="h-7 w-48 bg-slate-200 rounded mb-1.5" />
        <div className="h-4 w-96 bg-slate-100 rounded" />
      </div>

      {/* API key card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="h-5 w-24 bg-slate-200 rounded" />
          <div className="h-3.5 w-32 bg-slate-100 rounded" />
        </div>
        {/* Key field */}
        <div className="flex items-center gap-2">
          <div className="h-10 flex-1 bg-slate-100 rounded-lg" />
          <div className="h-10 w-10 bg-slate-100 rounded-lg" />
          <div className="h-10 w-10 bg-slate-100 rounded-lg" />
        </div>
      </div>

      {/* Webhook URL card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="h-5 w-32 bg-slate-200 rounded mb-3" />
        <div className="h-3.5 w-96 bg-slate-100 rounded mb-3" />
        <div className="flex items-center gap-2">
          <div className="h-10 flex-1 bg-slate-100 rounded-lg" />
          <div className="h-10 w-20 bg-slate-200 rounded-lg" />
        </div>
      </div>

      {/* Event types card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="h-5 w-36 bg-slate-200 rounded mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-4 h-4 bg-slate-200 rounded" />
              <div className="h-4 w-48 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Test endpoint card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="h-5 w-32 bg-slate-200 rounded mb-3" />
        <div className="h-3.5 w-80 bg-slate-100 rounded mb-4" />
        <div className="h-9 w-36 bg-slate-200 rounded-lg" />
      </div>
    </div>
  );
}
