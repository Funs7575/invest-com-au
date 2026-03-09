"use client";

import SVGBarChart from "@/components/charts/SVGBarChart";
import { SkeletonRows } from "./AnalyticsSkeletons";

interface ArticlePerf {
  slug: string;
  title: string;
  views: number;
  avgTimeOnPage: number;
  bounceRate: number;
}

interface ContentTabProps {
  loading: boolean;
  articlePerf: ArticlePerf[];
}

export default function ContentTab({ loading, articlePerf }: ContentTabProps) {
  return (
    <div className="space-y-6">
      {/* Top Articles by Views */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Top Articles by Views</h2>
          <p className="text-xs text-slate-500">Based on affiliate click data from article pages.</p>
        </div>
        {loading ? (
          <SkeletonRows count={8} />
        ) : articlePerf.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No article performance data yet. Clicks from /learn/, /guides/, and /blog/ pages will appear here.</div>
        ) : (
          <div className="p-4">
            <SVGBarChart
              data={articlePerf.map((a) => ({
                label: a.title,
                value: a.views,
              }))}
              color="#2563eb"
              formatValue={(v) => `${v} views`}
              width={600}
            />
          </div>
        )}
      </div>

      {/* Article Engagement Metrics */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Article Engagement</h2>
          <p className="text-xs text-slate-500">Estimated engagement metrics from click behavior patterns.</p>
        </div>
        {loading ? (
          <SkeletonRows count={8} />
        ) : articlePerf.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No data yet.</div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Article</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase">Views</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase">Avg Time</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase">Bounce Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {articlePerf.map((a) => (
                <tr key={a.slug} className="hover:bg-slate-50">
                  <td className="px-4 py-2 text-sm text-slate-900 max-w-xs truncate">{a.title}</td>
                  <td className="px-4 py-2 text-sm text-right text-amber-600 font-semibold">{a.views}</td>
                  <td className="px-4 py-2 text-sm text-right text-slate-600">
                    {Math.floor(a.avgTimeOnPage / 60)}m {a.avgTimeOnPage % 60}s
                  </td>
                  <td className="px-4 py-2 text-sm text-right">
                    <span className={a.bounceRate > 50 ? "text-red-600" : a.bounceRate > 35 ? "text-amber-600" : "text-emerald-600"}>
                      {a.bounceRate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Content Freshness / Needs Update */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Content Freshness</h2>
          <p className="text-xs text-slate-500">Articles that may need updating based on click performance and age.</p>
        </div>
        <div className="p-4">
          {articlePerf.length === 0 ? (
            <p className="text-sm text-slate-400">No articles to evaluate yet.</p>
          ) : (
            <div className="space-y-3">
              {articlePerf
                .filter((a) => a.bounceRate > 40 || a.avgTimeOnPage < 60)
                .map((a) => {
                  const score = Math.round(100 - a.bounceRate + Math.min(a.avgTimeOnPage / 3, 30));
                  const scoreColor = score > 70 ? "text-emerald-600 bg-emerald-50" : score > 40 ? "text-amber-600 bg-amber-50" : "text-red-600 bg-red-50";
                  return (
                    <div key={a.slug} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{a.title}</p>
                        <p className="text-xs text-slate-500">{a.slug}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${scoreColor}`}>
                          Score: {score}
                        </span>
                        {a.bounceRate > 50 && (
                          <span className="text-xs text-red-500 font-medium">High bounce</span>
                        )}
                        {a.avgTimeOnPage < 60 && (
                          <span className="text-xs text-amber-500 font-medium">Low engagement</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              {articlePerf.filter((a) => a.bounceRate > 40 || a.avgTimeOnPage < 60).length === 0 && (
                <p className="text-sm text-emerald-600">All articles are performing well!</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
