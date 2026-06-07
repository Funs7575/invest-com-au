export default function Loading() {
  return (
    <div className="py-6 md:py-10 animate-pulse" aria-busy="true" aria-label="Loading business upgrade">
      <div className="container-custom max-w-2xl">
        <div className="h-3.5 w-32 bg-slate-200 rounded mb-4" />
        <div className="mb-6">
          <div className="h-8 w-52 bg-slate-200 rounded mb-2" />
          <div className="h-4 w-64 bg-slate-100 rounded" />
        </div>
        {/* form fields */}
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="mb-4">
            <div className="h-3.5 w-28 bg-slate-200 rounded mb-1.5" />
            <div className="h-11 w-full bg-slate-100 rounded-lg" />
          </div>
        ))}
        <div className="h-12 w-full bg-slate-200 rounded-xl mt-6" />
      </div>
    </div>
  );
}
