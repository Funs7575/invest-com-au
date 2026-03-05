export default function FeeImpactLoading() {
  return (
    <div className="py-5 md:py-12 animate-pulse">
      <div className="container-custom max-w-4xl">
        <div className="h-6 md:h-10 w-56 md:w-80 bg-slate-200 rounded mb-2 md:mb-3" />
        <div className="h-3 md:h-5 w-72 md:w-96 bg-slate-100 rounded mb-6 md:mb-10" />
        <div className="bg-slate-100 rounded-xl h-64 md:h-80 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 bg-slate-100 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
