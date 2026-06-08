export default function Loading() {
  return (
    <div className="py-6 md:py-10 animate-pulse" aria-busy="true" aria-label="Loading startup thesis">
      <div className="container-custom max-w-2xl">
        <div className="h-3.5 w-24 bg-slate-200 rounded mb-3" />
        <div className="mb-6">
          <div className="h-8 w-40 bg-slate-200 rounded mb-2" />
          <div className="h-4 w-64 bg-slate-100 rounded" />
        </div>
        {/* criteria fields */}
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="mb-5">
            <div className="h-3.5 w-36 bg-slate-200 rounded mb-2" />
            <div className="h-10 w-full bg-slate-100 rounded-lg" />
          </div>
        ))}
        {/* tags row */}
        <div className="flex gap-2 flex-wrap mb-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-7 w-20 bg-slate-200 rounded-full" />
          ))}
        </div>
        <div className="h-10 w-36 bg-slate-200 rounded-lg" />
      </div>
    </div>
  );
}
