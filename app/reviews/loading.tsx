export default function Loading() {
  return (
    <div className="py-12 animate-pulse">
      <div className="container-custom">
        <div className="h-10 w-56 bg-slate-200 rounded mb-2" />
        <div className="h-5 w-80 bg-slate-100 rounded mb-8" />
        {/* Section heading */}
        <div className="h-7 w-52 bg-slate-200 rounded mb-4" />
        {/* Review cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="p-6">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 bg-slate-200 rounded-lg" />
                  <div className="flex-1">
                    <div className="h-6 w-36 bg-slate-200 rounded mb-1" />
                    <div className="h-4 w-20 bg-slate-100 rounded" />
                  </div>
                </div>
                <div className="h-4 w-full bg-slate-100 rounded mb-3" />
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <div className="h-4 w-16 bg-slate-100 rounded" />
                    <div className="h-4 w-12 bg-slate-200 rounded" />
                  </div>
                  <div className="flex justify-between">
                    <div className="h-4 w-16 bg-slate-100 rounded" />
                    <div className="h-4 w-12 bg-slate-200 rounded" />
                  </div>
                </div>
              </div>
              <div className="px-6 py-3 bg-slate-50 border-t border-slate-200">
                <div className="h-4 w-28 bg-slate-200 rounded mx-auto" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
