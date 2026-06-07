export default function Loading() {
  return (
    <div className="py-6 md:py-10 animate-pulse" aria-busy="true" aria-label="Loading investor profile">
      <div className="container-custom max-w-2xl">
        <div className="h-3.5 w-24 bg-slate-200 rounded mb-3" />
        <div className="mb-6">
          <div className="h-8 w-44 bg-slate-200 rounded mb-2" />
          <div className="h-4 w-64 bg-slate-100 rounded" />
        </div>
        {/* risk score card */}
        <div className="p-5 border border-slate-100 rounded-xl bg-white mb-6">
          <div className="flex justify-between items-center mb-3">
            <div className="h-4 w-28 bg-slate-200 rounded" />
            <div className="h-6 w-20 bg-slate-200 rounded-full" />
          </div>
          <div className="h-2.5 w-full bg-slate-100 rounded-full" />
        </div>
        {/* form fields */}
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="mb-5">
            <div className="h-3.5 w-36 bg-slate-200 rounded mb-2" />
            <div className="h-10 w-full bg-slate-100 rounded-lg" />
          </div>
        ))}
        <div className="h-10 w-36 bg-slate-200 rounded-lg mt-4" />
      </div>
    </div>
  );
}
