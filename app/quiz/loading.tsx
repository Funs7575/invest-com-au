export default function Loading() {
  return (
    <div className="py-12 md:py-16 animate-pulse">
      <div className="container-custom max-w-2xl text-center">
        {/* Quiz header */}
        <div className="h-8 w-72 bg-slate-200 rounded mx-auto mb-3" />
        <div className="h-4 w-96 max-w-full bg-slate-100 rounded mx-auto mb-8" />

        {/* Progress bar placeholder */}
        <div className="h-2 w-full bg-slate-100 rounded-full mb-8" />

        {/* Question card */}
        <div className="rounded-xl border border-slate-200 p-6 md:p-8">
          <div className="h-6 w-3/4 bg-slate-200 rounded mx-auto mb-6" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 w-full bg-slate-100 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
