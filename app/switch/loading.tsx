export default function Loading() {
  return (
    <div className="py-12 animate-pulse">
      <div className="container-custom max-w-3xl mx-auto">
        <div className="h-4 w-32 bg-slate-200 rounded mb-6" />
        <div className="h-10 w-80 bg-slate-200 rounded mb-2" />
        <div className="h-5 w-96 bg-slate-100 rounded mb-8" />
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="h-12 bg-slate-100 rounded-lg" />
          <div className="h-12 bg-slate-100 rounded-lg" />
          <div className="h-12 bg-slate-100 rounded-lg" />
          <div className="h-12 bg-slate-100 rounded-lg" />
        </div>
        <div className="h-48 bg-slate-100 rounded-xl" />
      </div>
    </div>
  );
}
