export default function Loading() {
  return (
    <div className="py-12 animate-pulse">
      <div className="container-custom max-w-4xl">
        <div className="h-4 w-48 bg-slate-200 rounded mb-6" />
        <div className="flex items-start gap-6 mb-8">
          <div className="w-16 h-16 bg-slate-200 rounded-xl shrink-0" />
          <div className="flex-1">
            <div className="h-9 w-72 bg-slate-200 rounded mb-2" />
            <div className="h-5 w-96 bg-slate-100 rounded mb-2" />
            <div className="flex gap-2">
              <div className="h-5 w-20 bg-slate-100 rounded-full" />
              <div className="h-5 w-16 bg-slate-100 rounded-full" />
            </div>
          </div>
        </div>
        <div className="h-64 bg-slate-100 rounded-xl mb-6" />
        <div className="h-48 bg-slate-100 rounded-xl" />
      </div>
    </div>
  );
}
