/**
 * Shared atomic skeleton primitive. Used by route-level loading.tsx
 * files to give every async page a proper perceived-performance
 * loading state instead of a flash of white.
 */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-100 rounded ${className}`} />;
}

/**
 * Generic content-detail page skeleton — breadcrumb + header + 3 cards.
 * Used by /briefs/[slug], /account/plans/[id], /outcome/[token] etc.
 */
export function DetailPageSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
        <Skeleton className="h-3 w-48" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Profile page skeleton — for /advisor/[slug], /teams/[slug].
 * Hero with avatar + 3-col detail grid.
 */
export function ProfilePageSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <Skeleton className="h-3 w-48 mb-4" />
        <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6">
          <div className="flex items-start gap-5">
            <Skeleton className="w-20 h-20 rounded-2xl" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-4 w-1/3" />
              <div className="flex gap-2 pt-1">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Dashboard skeleton — for /account.
 * Hero card + 3 KPI tiles + 2 feed sections.
 */
export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <Skeleton className="h-3 w-32 mb-2" />
          <Skeleton className="h-8 w-2/3 mb-3" />
          <Skeleton className="h-10 w-40 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl p-4">
              <Skeleton className="h-3 w-20 mb-2" />
              <Skeleton className="h-7 w-16" />
            </div>
          ))}
        </div>
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
            <Skeleton className="h-4 w-1/3" />
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="flex items-center gap-3 py-1">
                <Skeleton className="w-8 h-8 rounded-full" />
                <Skeleton className="h-3 flex-1" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ListingSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-white border border-slate-200 rounded-xl overflow-hidden animate-pulse">
          <div className="aspect-[16/9] bg-slate-100" />
          <div className="p-5 space-y-3">
            <div className="h-3 bg-slate-100 rounded w-1/3" />
            <div className="h-4 bg-slate-100 rounded w-3/4" />
            <div className="h-5 bg-slate-100 rounded w-1/4" />
            <div className="flex gap-2">
              <div className="h-6 bg-slate-100 rounded-full w-16" />
              <div className="h-6 bg-slate-100 rounded-full w-20" />
            </div>
            <div className="h-10 bg-slate-100 rounded-lg w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ComparisonTableSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="flex gap-2 mb-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-8 bg-slate-100 rounded-full w-24" />
        ))}
      </div>
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <div className="bg-slate-50 px-4 py-3 flex gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-3 bg-slate-200 rounded w-16" />
          ))}
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="px-4 py-4 flex items-center gap-4 border-t border-slate-100">
            <div className="w-8 h-8 bg-slate-100 rounded-lg" />
            <div className="h-4 bg-slate-100 rounded w-32" />
            <div className="h-3 bg-slate-100 rounded w-16 ml-auto" />
            <div className="h-3 bg-slate-100 rounded w-16" />
            <div className="h-8 bg-amber-100 rounded-lg w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdvisorCardSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-start gap-4 bg-white border border-slate-200 rounded-xl p-4 animate-pulse">
          <div className="w-12 h-12 bg-slate-100 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-slate-100 rounded w-1/2" />
            <div className="h-3 bg-slate-100 rounded w-1/3" />
            <div className="h-3 bg-slate-100 rounded w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );
}
