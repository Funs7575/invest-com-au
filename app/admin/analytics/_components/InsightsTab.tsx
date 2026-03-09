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

interface InsightsTabProps {
  recentClicks: ClickRow[];
}

export default function InsightsTab({ recentClicks }: InsightsTabProps) {
  return (
    <div className="space-y-6">
      {/* Most-Compared Broker Pairs */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Most-Compared Broker Pairs</h2>
          <p className="text-xs text-slate-500">Which brokers do users view together? Based on session page-to-click patterns.</p>
        </div>
        <div className="p-4">
          {(() => {
            const pageBrokers: Record<string, Set<string>> = {};
            recentClicks.forEach((c) => {
              if (!pageBrokers[c.page]) pageBrokers[c.page] = new Set();
              pageBrokers[c.page].add(c.broker_slug);
            });
            const pairCounts: Record<string, number> = {};
            Object.values(pageBrokers).forEach((brokers) => {
              const arr = Array.from(brokers).sort();
              for (let i = 0; i < arr.length; i++) {
                for (let j = i + 1; j < arr.length; j++) {
                  const key = `${arr[i]}|${arr[j]}`;
                  pairCounts[key] = (pairCounts[key] || 0) + 1;
                }
              }
            });
            const pairs = Object.entries(pairCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
            if (pairs.length === 0) return <p className="text-sm text-slate-400">Not enough data yet.</p>;
            return (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-2 font-medium text-slate-500">Broker A</th>
                    <th className="text-left py-2 font-medium text-slate-500">Broker B</th>
                    <th className="text-right py-2 font-medium text-slate-500">Times Compared</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {pairs.map(([key, count]) => {
                    const [a, b] = key.split("|");
                    return (
                      <tr key={key}>
                        <td className="py-2 font-medium text-slate-800">{a}</td>
                        <td className="py-2 font-medium text-slate-800">{b}</td>
                        <td className="py-2 text-right text-slate-600">{count}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            );
          })()}
        </div>
      </div>

      {/* Content Performance */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Content Performance Score</h2>
          <p className="text-xs text-slate-500">Pages ranked by click-through rate.</p>
        </div>
        <div className="p-4">
          {(() => {
            const pageCounts: Record<string, number> = {};
            recentClicks.forEach((c) => { pageCounts[c.page] = (pageCounts[c.page] || 0) + 1; });
            const pages = Object.entries(pageCounts)
              .filter(([p]) => p && p !== "/" && !p.startsWith("/admin"))
              .sort((a, b) => b[1] - a[1])
              .slice(0, 15);
            if (pages.length === 0) return <p className="text-sm text-slate-400">Not enough data yet.</p>;
            const maxClicks = pages[0]?.[1] || 1;
            return (
              <div className="space-y-2">
                {pages.map(([pagePath, clicks]) => (
                  <div key={pagePath} className="flex items-center gap-3">
                    <span className="text-xs text-slate-600 w-48 truncate shrink-0" title={pagePath}>{pagePath}</span>
                    <div className="flex-1 h-5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${(clicks / maxClicks) * 100}%` }} />
                    </div>
                    <span className="text-xs font-mono text-slate-600 w-10 text-right">{clicks}</span>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Source -> Broker Cohort */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Source &rarr; Broker Cohort</h2>
          <p className="text-xs text-slate-500">Which traffic sources drive clicks to which brokers.</p>
        </div>
        <div className="p-4 overflow-x-auto">
          {(() => {
            const matrix: Record<string, Record<string, number>> = {};
            const allBrokerSlugs = new Set<string>();
            recentClicks.forEach((c) => {
              const src = c.source || "unknown";
              if (!matrix[src]) matrix[src] = {};
              matrix[src][c.broker_slug] = (matrix[src][c.broker_slug] || 0) + 1;
              allBrokerSlugs.add(c.broker_slug);
            });
            const sources = Object.keys(matrix).sort();
            const brokerList = Array.from(allBrokerSlugs).sort();
            if (sources.length === 0 || brokerList.length === 0) return <p className="text-sm text-slate-400">Not enough data yet.</p>;
            return (
              <table className="text-xs w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-2 pr-3 font-medium text-slate-500 sticky left-0 bg-white">Source</th>
                    {brokerList.map((b) => (
                      <th key={b} className="text-center py-2 px-2 font-medium text-slate-500 whitespace-nowrap">{b}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {sources.map((src) => (
                    <tr key={src}>
                      <td className="py-2 pr-3 font-medium text-slate-700 sticky left-0 bg-white">{src}</td>
                      {brokerList.map((b) => {
                        const val = matrix[src]?.[b] || 0;
                        return (
                          <td key={b} className={`py-2 px-2 text-center ${val > 0 ? "text-slate-800 font-medium" : "text-slate-300"}`}>
                            {val || "-"}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            );
          })()}
        </div>
      </div>

      {/* Email Capture Segments */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Email Capture Segments</h2>
          <p className="text-xs text-slate-500">Breakdown of email captures by lead magnet source.</p>
        </div>
        <div className="p-4">
          <p className="text-xs text-slate-400">Email capture segments will populate as contextual lead magnets are used across the site.</p>
        </div>
      </div>
    </div>
  );
}
