/**
 * Shared route loading skeleton.
 *
 * Drop into any route-group loading.tsx that just needs a generic
 * "something's rendering" placeholder without bespoke layout matching.
 *
 *     // app/foo/loading.tsx
 *     export { default } from "@/components/RouteLoadingSkeleton";
 */

export default function RouteLoadingSkeleton() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-2xl space-y-4" aria-live="polite" aria-busy="true">
        <div className="h-6 w-48 bg-slate-200 animate-pulse rounded" />
        <div className="h-4 w-3/4 bg-slate-100 animate-pulse rounded" />
        <div className="h-4 w-2/3 bg-slate-100 animate-pulse rounded" />
        <div className="h-40 w-full bg-slate-100 animate-pulse rounded" />
        <div className="h-4 w-1/2 bg-slate-100 animate-pulse rounded" />
        <div className="h-4 w-1/3 bg-slate-100 animate-pulse rounded" />
      </div>
    </div>
  );
}
