export default function Loading() {
  return (
    <div className="py-6 md:py-10 animate-pulse" aria-busy="true" aria-label="Loading profile">
      <div className="container-custom max-w-2xl">
        <div className="h-3.5 w-24 bg-slate-200 rounded mb-3" />
        <div className="mb-6">
          <div className="h-8 w-24 bg-slate-200 rounded mb-2" />
          <div className="h-4 w-56 bg-slate-100 rounded" />
        </div>
        {/* avatar + name row */}
        <div className="flex items-center gap-4 mb-8">
          <div className="h-16 w-16 bg-slate-200 rounded-full" />
          <div>
            <div className="h-5 w-36 bg-slate-200 rounded mb-2" />
            <div className="h-3.5 w-48 bg-slate-100 rounded" />
          </div>
        </div>
        {/* form fields */}
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="mb-5">
            <div className="h-3.5 w-24 bg-slate-200 rounded mb-2" />
            <div className="h-10 w-full bg-slate-100 rounded-lg" />
          </div>
        ))}
        <div className="h-10 w-32 bg-slate-200 rounded-lg mt-4" />
      </div>
    </div>
  );
}
