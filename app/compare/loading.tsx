export default function Loading() {
  return (
    <div className="py-12 animate-pulse">
      <div className="container-custom">
        <div className="h-10 w-80 bg-slate-200 rounded mb-2" />
        <div className="h-5 w-96 bg-slate-100 rounded mb-6" />
        {/* Filter pills */}
        <div className="flex gap-2 mb-6">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-10 w-24 bg-slate-200 rounded-full" />
          ))}
        </div>
        {/* Desktop table */}
        <div className="hidden md:block border border-slate-200 rounded-lg overflow-hidden">
          <div className="bg-slate-50 h-12" />
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-16 border-t border-slate-100 flex items-center px-4 gap-8">
              <div className="h-4 w-28 bg-slate-200 rounded" />
              <div className="h-4 w-16 bg-slate-100 rounded" />
              <div className="h-4 w-16 bg-slate-100 rounded" />
              <div className="h-4 w-16 bg-slate-100 rounded" />
              <div className="h-8 w-24 bg-slate-200 rounded-lg ml-auto" />
            </div>
          ))}
        </div>
        {/* Mobile cards */}
        <div className="md:hidden space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-48 bg-slate-100 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
