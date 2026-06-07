export default function Loading() {
  return (
    <div className="py-6 md:py-10 animate-pulse" aria-busy="true" aria-label="Loading workspaces">
      <div className="container-custom max-w-2xl">
        <div className="h-8 w-44 bg-slate-200 rounded mb-2 mx-auto" />
        <div className="h-4 w-56 bg-slate-100 rounded mb-8 mx-auto" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-5 mb-3 border border-slate-100 rounded-xl bg-white cursor-pointer">
            <div className="h-12 w-12 bg-slate-200 rounded-lg shrink-0" />
            <div className="flex-1">
              <div className="h-5 w-40 bg-slate-200 rounded mb-1" />
              <div className="h-3.5 w-56 bg-slate-100 rounded" />
            </div>
            <div className="h-5 w-5 bg-slate-100 rounded-full shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
