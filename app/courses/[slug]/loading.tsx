export default function Loading() {
  return (
    <div className="py-8 md:py-12 animate-pulse">
      <div className="container-custom max-w-4xl">
        {/* Breadcrumb */}
        <div className="h-3 w-40 bg-slate-100 rounded mb-6" />

        {/* Course header */}
        <div className="h-4 w-20 bg-slate-100 rounded-full mb-3" />
        <div className="h-8 w-80 bg-slate-200 rounded mb-2" />
        <div className="h-5 w-full bg-slate-100 rounded mb-4" />

        {/* Instructor */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-slate-200 rounded-full" />
          <div>
            <div className="h-4 w-28 bg-slate-200 rounded mb-1" />
            <div className="h-3 w-20 bg-slate-100 rounded" />
          </div>
        </div>

        {/* Module list */}
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-slate-200 p-4">
              <div className="h-5 w-48 bg-slate-200 rounded mb-2" />
              <div className="h-3 w-32 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
