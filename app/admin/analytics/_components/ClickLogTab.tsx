"use client";

interface ClickRow {
  id: number;
  broker_name: string;
  broker_slug: string;
  source: string;
  page: string;
  layer: string;
  clicked_at: string;
}

interface ClickLogTabProps {
  loading: boolean;
  recentClicks: ClickRow[];
  page: number;
  setPage: (page: number) => void;
  totalPages: number;
  pageSize: number;
}

export default function ClickLogTab({
  loading,
  recentClicks,
  page,
  setPage,
  totalPages,
  pageSize,
}: ClickLogTabProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Click Log</h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="px-3 py-1 bg-slate-100 rounded text-slate-600 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >Prev</button>
            <span className="text-slate-500">Page {page + 1}{totalPages > 0 ? ` of ${totalPages}` : ""}</span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={recentClicks.length < pageSize}
              className="px-3 py-1 bg-slate-100 rounded text-slate-600 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >Next</button>
          </div>
        </div>
      </div>
      {loading ? (
        <div className="p-4 space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="animate-pulse flex gap-4">
              <div className="h-4 w-24 bg-slate-200 rounded" />
              <div className="h-4 w-20 bg-slate-200 rounded" />
              <div className="h-4 w-32 bg-slate-200 rounded" />
              <div className="h-4 w-16 bg-slate-200 rounded" />
            </div>
          ))}
        </div>
      ) : recentClicks.length === 0 ? (
        <div className="p-8 text-center text-slate-500">No clicks recorded yet.</div>
      ) : (
        <div className="overflow-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Broker</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Source</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Page</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Layer</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {recentClicks.map((click) => (
                <tr key={click.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2 text-sm text-slate-900">{click.broker_name}</td>
                  <td className="px-4 py-2 text-xs text-slate-600">{click.source || "\u2014"}</td>
                  <td className="px-4 py-2 text-xs text-slate-500 max-w-[200px] truncate">{click.page}</td>
                  <td className="px-4 py-2 text-xs text-slate-500">{click.layer || "\u2014"}</td>
                  <td className="px-4 py-2 text-xs text-slate-500 whitespace-nowrap">{new Date(click.clicked_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
