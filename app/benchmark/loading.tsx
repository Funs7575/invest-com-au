export default function BenchmarkLoading() {
  return (
    <div className="py-5 md:py-12 animate-pulse">
      <div className="container-custom max-w-4xl">
        <div className="h-6 md:h-10 w-48 md:w-72 bg-slate-200 rounded mb-2 md:mb-3" />
        <div className="h-3 md:h-5 w-64 md:w-96 bg-slate-100 rounded mb-6 md:mb-10" />
        <div className="h-10 w-full bg-slate-100 rounded-lg mb-4" />
        <div className="bg-slate-100 rounded-xl h-72 md:h-96" />
      </div>
    </div>
  );
}
