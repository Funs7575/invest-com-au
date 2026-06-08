export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 animate-pulse" aria-busy="true" aria-label="Loading login">
      <div className="w-full max-w-sm border border-slate-100 rounded-2xl p-8 space-y-5">
        <div className="h-8 w-32 bg-slate-200 rounded mx-auto" />
        <div className="h-4 w-48 bg-slate-100 rounded mx-auto" />

        <div className="space-y-4 mt-4">
          {/* Email field */}
          <div className="space-y-1.5">
            <div className="h-3.5 w-12 bg-slate-200 rounded" />
            <div className="h-10 w-full bg-slate-100 rounded-lg" />
          </div>
          {/* Password field */}
          <div className="space-y-1.5">
            <div className="h-3.5 w-20 bg-slate-200 rounded" />
            <div className="h-10 w-full bg-slate-100 rounded-lg" />
          </div>
        </div>

        <div className="h-10 w-full bg-slate-200 rounded-lg" />
        <div className="h-4 w-36 bg-slate-100 rounded mx-auto" />
      </div>
    </div>
  );
}
