export default function Loading() {
  return (
    <div className="py-12 animate-pulse">
      <div className="container-custom">
        <div className="h-10 w-64 bg-slate-200 rounded mb-4" />
        <div className="h-5 w-80 bg-slate-100 rounded mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="border border-slate-200 border-l-4 border-l-slate-300 rounded-lg p-8">
              <div className="h-10 w-10 bg-slate-200 rounded mb-4" />
              <div className="h-6 w-48 bg-slate-200 rounded mb-2" />
              <div className="h-4 w-full bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
