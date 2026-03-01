export default function ShortlistLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 pt-5 pb-8 md:pt-10 md:pb-12">
      <div className="animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-40 mb-1" />
        <div className="h-4 bg-slate-100 rounded w-64 mb-6" />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 bg-slate-100 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
