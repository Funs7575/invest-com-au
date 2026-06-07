export default function Loading() {
  return (
    <div className="py-6 md:py-10 animate-pulse" aria-busy="true" aria-label="Loading health scores">
      <div className="container-custom max-w-3xl">
        <div className="h-3.5 w-24 bg-slate-200 rounded mb-3" />
        <div className="mb-6">
          <div className="h-8 w-40 bg-slate-200 rounded mb-2" />
          <div className="h-4 w-60 bg-slate-100 rounded" />
        </div>
        {/* overall score ring placeholder */}
        <div className="flex flex-col items-center p-8 mb-6 border border-slate-100 rounded-2xl bg-white">
          <div className="h-32 w-32 bg-slate-200 rounded-full mb-4" />
          <div className="h-5 w-28 bg-slate-200 rounded mb-2" />
          <div className="h-4 w-48 bg-slate-100 rounded" />
        </div>
        {/* dimension score cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="p-4 border border-slate-100 rounded-xl bg-white">
              <div className="h-3 w-20 bg-slate-100 rounded mb-3" />
              <div className="h-8 w-12 bg-slate-200 rounded mb-2" />
              <div className="h-2 w-full bg-slate-100 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
