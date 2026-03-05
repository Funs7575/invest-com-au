export default function AdvisorsLoading() {
  return (
    <div className="py-5 md:py-12 animate-pulse">
      <div className="container-custom max-w-4xl">
        <div className="h-3 w-24 bg-slate-200 rounded mb-3" />
        <div className="h-6 w-56 bg-slate-200 rounded mb-1.5" />
        <div className="h-3 w-72 bg-slate-100 rounded mb-4" />
        <div className="h-10 w-full bg-slate-100 rounded-lg mb-3" />
        <div className="flex gap-2 mb-4">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-7 w-24 bg-slate-100 rounded-full shrink-0" />)}
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 flex gap-4">
              <div className="w-12 h-12 bg-slate-200 rounded-full shrink-0" />
              <div className="flex-1">
                <div className="h-4 w-36 bg-slate-200 rounded mb-2" />
                <div className="h-3 w-48 bg-slate-100 rounded mb-2" />
                <div className="flex gap-2">
                  <div className="h-5 w-20 bg-slate-100 rounded-full" />
                  <div className="h-5 w-16 bg-slate-100 rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
