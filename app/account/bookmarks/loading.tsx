export default function Loading() {
  return (
    <div className="py-6 md:py-10 animate-pulse" aria-busy="true" aria-label="Loading reading list">
      <div className="container-custom max-w-3xl">
        <div className="h-3.5 w-24 bg-slate-200 rounded mb-3" />
        <div className="mb-6">
          <div className="h-8 w-44 bg-slate-200 rounded mb-2" />
          <div className="h-4 w-72 bg-slate-100 rounded" />
        </div>
        {/* tab bar */}
        <div className="flex gap-2 mb-5">
          {["All", "Articles", "Brokers", "Advisors"].map((t) => (
            <div key={t} className="h-8 w-20 bg-slate-200 rounded-full" />
          ))}
        </div>
        {/* bookmark cards */}
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-3 p-4 mb-3 border border-slate-100 rounded-xl">
            <div className="h-14 w-14 bg-slate-200 rounded-lg shrink-0" />
            <div className="flex-1">
              <div className="h-4 w-3/4 bg-slate-200 rounded mb-2" />
              <div className="h-3 w-1/2 bg-slate-100 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
