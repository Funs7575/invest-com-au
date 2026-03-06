export default function Loading() {
  return (
    <div className="py-12">
      <div className="container-custom max-w-3xl">
        <div className="h-8 w-64 bg-slate-200 rounded animate-pulse mb-3" />
        <div className="h-5 w-96 bg-slate-100 rounded animate-pulse mb-8" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl p-6">
              <div className="h-4 w-40 bg-slate-200 rounded animate-pulse mb-3" />
              <div className="h-3 w-full bg-slate-100 rounded animate-pulse mb-2" />
              <div className="h-3 w-3/4 bg-slate-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
