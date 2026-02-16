export default function Loading() {
  return (
    <div className="py-12 animate-pulse">
      <div className="container-custom max-w-3xl mx-auto">
        <div className="h-4 w-48 bg-slate-200 rounded mb-6" />
        <div className="flex items-start gap-4 mb-2">
          <div className="w-10 h-10 bg-slate-200 rounded shrink-0" />
          <div className="h-10 w-80 bg-slate-200 rounded" />
        </div>
        <div className="h-5 w-full bg-slate-100 rounded mb-8" />
        <div className="h-40 bg-red-50 rounded-xl mb-6" />
        <div className="h-40 bg-green-50 rounded-xl mb-8" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 bg-slate-100 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
