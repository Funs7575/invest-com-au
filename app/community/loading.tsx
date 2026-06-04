import { Skeleton } from "@/components/Skeletons";

export default function CommunityLoading() {
  return (
    <div>
      {/* Hero placeholder */}
      <div className="bg-slate-800 py-16">
        <div className="container-custom max-w-4xl text-center space-y-4">
          <Skeleton className="h-9 w-56 mx-auto" />
          <Skeleton className="h-4 w-96 max-w-full mx-auto" />
          <Skeleton className="h-4 w-72 max-w-full mx-auto" />
          <Skeleton className="h-11 w-36 mx-auto rounded-xl" />
        </div>
      </div>

      {/* Stats bar + category grid */}
      <div className="container-custom max-w-4xl mt-6 space-y-6 pb-16">
        {/* Stats bar */}
        <div className="flex gap-6 bg-white border border-slate-200 rounded-xl px-6 py-4 animate-pulse">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>

        {/* Featured confessions banner */}
        <Skeleton className="h-16 w-full rounded-xl" />

        {/* Category cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-white border border-slate-200 rounded-xl p-5 flex items-start gap-4"
            >
              <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4" />
                <div className="flex gap-4 pt-1">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
