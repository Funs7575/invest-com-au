export default function VersusLoading() {
  return (
    <div className="pt-5 pb-8 md:py-12">
      <div className="container-custom max-w-5xl">
        <div className="animate-pulse">
          <div className="h-3 bg-slate-200 rounded w-32 mb-6" />
          <div className="h-9 bg-slate-200 rounded w-56 mb-2" />
          <div className="h-4 bg-slate-100 rounded w-72 mb-8" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="w-12 h-12 bg-slate-200 rounded-lg mx-auto mb-3" />
                <div className="h-4 bg-slate-200 rounded w-24 mx-auto mb-1" />
                <div className="h-3 bg-slate-100 rounded w-16 mx-auto" />
              </div>
            ))}
          </div>
          <div className="h-64 bg-slate-50 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
