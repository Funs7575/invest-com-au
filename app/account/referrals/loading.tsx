export default function Loading() {
  return (
    <div className="py-6 md:py-10 animate-pulse" aria-busy="true" aria-label="Loading referrals">
      <div className="container-custom max-w-3xl">
        <div className="h-3.5 w-24 bg-slate-200 rounded mb-3" />
        <div className="mb-6">
          <div className="h-8 w-32 bg-slate-200 rounded mb-2" />
          <div className="h-4 w-64 bg-slate-100 rounded" />
        </div>
        {/* referral link card */}
        <div className="p-5 border border-slate-100 rounded-xl bg-white mb-6">
          <div className="h-4 w-28 bg-slate-200 rounded mb-3" />
          <div className="flex gap-2">
            <div className="h-10 flex-1 bg-slate-100 rounded-lg" />
            <div className="h-10 w-20 bg-slate-200 rounded-lg" />
          </div>
        </div>
        {/* stats strip */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-4 border border-slate-100 rounded-xl text-center">
              <div className="h-7 w-12 bg-slate-200 rounded mx-auto mb-1" />
              <div className="h-3 w-16 bg-slate-100 rounded mx-auto" />
            </div>
          ))}
        </div>
        {/* referrals list */}
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-3 border-b border-slate-100">
            <div className="h-4 w-32 bg-slate-200 rounded" />
            <div className="h-4 w-16 bg-slate-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
