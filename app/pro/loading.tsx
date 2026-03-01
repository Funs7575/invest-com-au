export default function ProLoading() {
  return (
    <div className="py-12">
      <div className="container-custom max-w-4xl text-center">
        <div className="animate-pulse">
          <div className="h-6 bg-amber-200 rounded-full w-32 mx-auto mb-4" />
          <div className="h-10 bg-slate-200 rounded w-80 mx-auto mb-3" />
          <div className="h-5 bg-slate-100 rounded w-96 mx-auto mb-10" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-xl p-6">
                <div className="h-5 bg-slate-200 rounded w-24 mb-2" />
                <div className="h-8 bg-slate-200 rounded w-20 mb-4" />
                <div className="space-y-2 mb-6">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <div key={j} className="h-3 bg-slate-100 rounded w-full" />
                  ))}
                </div>
                <div className="h-12 bg-slate-200 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
