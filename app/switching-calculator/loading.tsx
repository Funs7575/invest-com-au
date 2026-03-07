export default function Loading() {
  return (
    <div className="py-12">
      <div className="container-custom max-w-4xl animate-pulse">
        <div className="h-8 w-64 bg-slate-200 rounded mb-4" />
        <div className="h-4 w-96 bg-slate-100 rounded mb-8" />
        <div className="h-64 bg-slate-100 rounded-xl" />
      </div>
    </div>
  );
}
