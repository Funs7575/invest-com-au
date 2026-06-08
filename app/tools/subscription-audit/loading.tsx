export default function Loading() {
  return (
    <div className="py-8 md:py-12 animate-pulse" aria-busy="true" aria-label="Loading subscription audit">
      <div className="container-custom max-w-3xl">
        <div className="h-8 w-56 bg-slate-200 rounded mb-2 mx-auto" />
        <div className="h-4 w-72 bg-slate-100 rounded mb-8 mx-auto" />
        <div className="p-6 border border-slate-100 rounded-2xl bg-white mb-5">
          <div className="h-4 w-36 bg-slate-200 rounded mb-3" />
          <div className="h-32 w-full bg-slate-100 rounded-lg mb-3" />
          <div className="h-10 w-32 bg-slate-200 rounded-lg" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex justify-between items-center p-4 mb-2 border border-slate-100 rounded-xl">
            <div className="h-4 w-44 bg-slate-200 rounded" />
            <div className="h-4 w-16 bg-slate-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
