export default function AdvisorGuideLoading() {
  return (
    <div className="py-5 md:py-12 animate-pulse">
      <div className="container-custom max-w-3xl">
        <div className="h-3 w-32 bg-slate-200 rounded mb-4" />
        <div className="h-8 w-80 bg-slate-200 rounded mb-3" />
        <div className="h-4 w-full bg-slate-100 rounded mb-2" />
        <div className="h-4 w-3/4 bg-slate-100 rounded mb-8" />
        <div className="space-y-6">{Array.from({ length: 3 }).map((_, i) => <div key={i}><div className="h-6 w-48 bg-slate-200 rounded mb-2" /><div className="h-20 bg-slate-100 rounded" /></div>)}</div>
      </div>
    </div>
  );
}
