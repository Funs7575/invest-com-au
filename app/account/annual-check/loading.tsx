export default function Loading() {
  return (
    <div className="py-6 md:py-10 animate-pulse" aria-busy="true" aria-label="Loading annual check">
      <div className="container-custom max-w-3xl">
        <div className="h-3.5 w-24 bg-slate-200 rounded mb-3" />
        <div className="mb-6">
          <div className="h-8 w-40 bg-slate-200 rounded mb-2" />
          <div className="h-4 w-64 bg-slate-100 rounded" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-start gap-4 p-5 mb-3 border border-slate-100 rounded-xl bg-white">
            <div className="h-10 w-10 bg-slate-200 rounded-full shrink-0" />
            <div className="flex-1">
              <div className="h-4 w-56 bg-slate-200 rounded mb-2" />
              <div className="h-3 w-72 bg-slate-100 rounded mb-1" />
              <div className="h-3 w-48 bg-slate-100 rounded" />
            </div>
            <div className="h-6 w-11 bg-slate-200 rounded-full shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
