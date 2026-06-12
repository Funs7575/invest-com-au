export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <div className="h-3 w-32 bg-slate-200 rounded animate-pulse mb-4" />
        <div className="h-8 w-48 bg-slate-200 rounded animate-pulse mb-6" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="bg-white border border-slate-200 rounded-2xl p-5"
            >
              <div className="h-4 w-40 bg-slate-200 rounded animate-pulse mb-3" />
              <div className="h-3 w-56 bg-slate-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
