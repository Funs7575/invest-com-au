export default function Loading() {
  return (
    <div className="py-12 animate-pulse">
      <div className="container-custom">
        <div className="h-10 w-56 bg-slate-200 rounded mb-2" />
        <div className="h-5 w-80 bg-slate-100 rounded mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="p-6">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 bg-slate-200 rounded-lg" />
                  <div className="flex-1">
                    <div className="h-5 w-32 bg-slate-200 rounded mb-1" />
                    <div className="h-3 w-20 bg-slate-100 rounded" />
                  </div>
                </div>
                <div className="h-4 w-full bg-slate-100 rounded mb-2" />
                <div className="h-4 w-3/4 bg-slate-100 rounded" />
              </div>
              <div className="h-10 bg-slate-50 border-t border-slate-200" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
