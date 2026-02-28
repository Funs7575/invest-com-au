"use client";

interface TableSkeletonProps {
  /** Number of skeleton rows to render */
  rows?: number;
  /** Number of columns per row */
  cols?: number;
  /** Whether to show a header skeleton row */
  showHeader?: boolean;
}

export default function TableSkeleton({
  rows = 5,
  cols = 5,
  showHeader = true,
}: TableSkeletonProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden animate-pulse">
      {showHeader && (
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex gap-4">
          {Array.from({ length: cols }).map((_, i) => (
            <div
              key={`h-${i}`}
              className="h-3 rounded bg-slate-200"
              style={{ width: `${60 + Math.random() * 60}px` }}
            />
          ))}
        </div>
      )}
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <div key={rowIdx} className="px-4 py-3.5 flex items-center gap-4">
            {Array.from({ length: cols }).map((_, colIdx) => (
              <div
                key={colIdx}
                className={`h-3 rounded ${colIdx === 0 ? "bg-slate-200 w-32" : "bg-slate-100"}`}
                style={{
                  width: colIdx === 0 ? undefined : `${40 + ((rowIdx + colIdx) % 4) * 20}px`,
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
