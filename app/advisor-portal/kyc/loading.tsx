export default function Loading() {
  return (
    <div className="animate-pulse space-y-6 p-6" aria-busy="true" aria-label="Loading KYC verification">
      {/* Header */}
      <div className="h-7 w-44 bg-slate-200 rounded" />
      <div className="h-4 w-72 bg-slate-100 rounded" />

      {/* Identity check sections */}
      <div className="p-4 border border-slate-100 rounded-xl space-y-4">
        <div className="h-5 w-36 bg-slate-200 rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-3.5 w-24 bg-slate-200 rounded" />
              <div className="h-10 w-full bg-slate-100 rounded-lg" />
            </div>
          ))}
        </div>
      </div>

      {/* File upload areas */}
      <div className="p-4 border border-slate-100 rounded-xl space-y-4">
        <div className="h-5 w-40 bg-slate-200 rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-32 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center gap-2">
              <div className="h-8 w-8 bg-slate-200 rounded-lg" />
              <div className="h-4 w-32 bg-slate-100 rounded" />
              <div className="h-3 w-24 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Status section */}
      <div className="p-4 border border-slate-100 rounded-xl space-y-3">
        <div className="h-5 w-32 bg-slate-200 rounded" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-5 w-5 bg-slate-200 rounded-full shrink-0" />
            <div className="h-4 w-48 bg-slate-100 rounded" />
            <div className="h-5 w-20 bg-slate-200 rounded-full ml-auto" />
          </div>
        ))}
      </div>

      <div className="h-10 w-36 bg-slate-200 rounded-lg" />
    </div>
  );
}
