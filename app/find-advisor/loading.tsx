export default function FindAdvisorLoading() {
  return (
    <div className="container-custom max-w-xl py-6 md:py-12 animate-pulse">
      <div className="flex gap-2 mb-6">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="flex-1 h-1.5 bg-slate-200 rounded-full" />)}</div>
      <div className="h-8 w-64 bg-slate-200 rounded mb-3" />
      <div className="h-4 w-48 bg-slate-100 rounded mb-8" />
      <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 bg-slate-100 rounded-xl" />)}</div>
    </div>
  );
}
