export default function Loading() {
  return (
    <div className="py-6 md:py-10 animate-pulse" aria-busy="true" aria-label="Loading for advisors">
      <div className="container-custom max-w-3xl">
        <div className="h-3.5 w-40 bg-slate-200 rounded mb-4" />
        <div className="h-9 w-3/4 bg-slate-200 rounded mb-3" />
        <div className="h-5 w-1/2 bg-slate-100 rounded mb-6" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="mb-5">
            <div className="h-4 w-full bg-slate-100 rounded mb-1.5" />
            <div className="h-4 w-full bg-slate-100 rounded mb-1.5" />
            <div className="h-4 w-4/5 bg-slate-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
