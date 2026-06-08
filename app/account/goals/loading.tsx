export default function Loading() {
  return (
    <div className="py-6 md:py-10 animate-pulse" aria-busy="true" aria-label="Loading goals">
      <div className="container-custom max-w-3xl">
        <div className="h-3.5 w-24 bg-slate-200 rounded mb-3" />
        <div className="mb-6">
          <div className="h-8 w-28 bg-slate-200 rounded mb-2" />
          <div className="h-4 w-56 bg-slate-100 rounded" />
        </div>
        {/* goal cards */}
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="p-5 mb-4 border border-slate-100 rounded-xl bg-white">
            <div className="flex justify-between mb-3">
              <div className="h-5 w-40 bg-slate-200 rounded" />
              <div className="h-5 w-16 bg-slate-100 rounded" />
            </div>
            <div className="h-2.5 w-full bg-slate-100 rounded-full mb-3">
              <div className={`h-2.5 bg-slate-200 rounded-full`} style={{ width: `${(i + 1) * 25}%` }} />
            </div>
            <div className="flex justify-between">
              <div className="h-3 w-20 bg-slate-100 rounded" />
              <div className="h-3 w-24 bg-slate-100 rounded" />
            </div>
          </div>
        ))}
        {/* add goal form */}
        <div className="h-12 w-full bg-slate-100 rounded-xl mt-2" />
      </div>
    </div>
  );
}
