export default function Loading() {
  return (
    <div className="py-12 animate-pulse">
      <div className="container-custom">
        <div className="h-10 w-72 bg-slate-200 rounded mb-3" />
        <div className="h-5 w-96 bg-slate-100 rounded mb-10" />
        <div className="flex gap-2 mb-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-10 w-20 bg-slate-200 rounded-full" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="border border-slate-200 rounded-xl p-6">
              <div className="flex gap-2 mb-3">
                <div className="h-5 w-14 bg-slate-200 rounded-full" />
                <div className="h-5 w-16 bg-slate-100 rounded-full" />
              </div>
              <div className="h-6 w-full bg-slate-200 rounded mb-2" />
              <div className="h-4 w-full bg-slate-100 rounded mb-1" />
              <div className="h-4 w-3/4 bg-slate-100 rounded mb-4" />
              <div className="h-4 w-24 bg-green-100 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
