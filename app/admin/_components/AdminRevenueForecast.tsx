"use client";

interface RevenueByBroker {
  broker_name: string;
  broker_slug: string;
  clicks: number;
  estimated_epc: number;
  estimated_revenue: number;
}

interface Props {
  revenueStats: RevenueByBroker[];
  totalClicks: number;
  marketplaceRevenue: number;
}

export default function AdminRevenueForecast({ revenueStats, totalClicks, marketplaceRevenue }: Props) {
  if (revenueStats.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Revenue Forecast</h2>
        <div className="text-center py-6">
          <div className="text-3xl mb-2">📉</div>
          <p className="text-sm text-slate-500">No revenue data yet</p>
          <p className="text-xs text-slate-400 mt-1">Set EPC values in Affiliate Links to enable forecasting</p>
        </div>
      </div>
    );
  }

  const totalAffRev = revenueStats.reduce((s, r) => s + r.estimated_revenue, 0);
  const totalRevClicks = revenueStats.reduce((s, r) => s + r.clicks, 0);
  const avgEpc = totalRevClicks > 0 ? totalAffRev / totalRevClicks : 0;
  const dailyAvgClicks = totalClicks > 0 ? totalClicks / 30 : 0;
  const mktRev = marketplaceRevenue;

  const month30 = dailyAvgClicks * 30 * avgEpc + mktRev;
  const month60 = dailyAvgClicks * 60 * avgEpc + mktRev * 2;
  const month90 = dailyAvgClicks * 90 * avgEpc + mktRev * 3;
  const annual = dailyAvgClicks * 365 * avgEpc + mktRev * 12;

  const forecasts = [
    { label: "30-Day", value: month30, color: "emerald" },
    { label: "60-Day", value: month60, color: "emerald" },
    { label: "90-Day", value: month90, color: "emerald" },
    { label: "Annual", value: annual, color: "amber" },
  ];

  const maxForecast = annual || 1;

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6">
      <h2 className="text-lg font-semibold text-slate-900 mb-4">Revenue Forecast</h2>
      <div className="space-y-4">
        {/* Key assumptions */}
        <div className="bg-slate-50 rounded-lg p-3 space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-slate-500">Avg. daily clicks</span>
            <span className="text-slate-700 font-medium">{dailyAvgClicks.toFixed(1)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-500">Avg. EPC</span>
            <span className="text-slate-700 font-medium">${avgEpc.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-500">Marketplace MRR</span>
            <span className="text-slate-700 font-medium">${mktRev.toFixed(2)}</span>
          </div>
        </div>

        {/* Forecast bars */}
        <div className="space-y-3">
          {forecasts.map((f) => (
            <div key={f.label}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-600">{f.label}</span>
                <span className={`font-bold ${f.color === "amber" ? "text-amber-600" : "text-emerald-600"}`}>
                  ${f.value >= 1000 ? `${(f.value / 1000).toFixed(1)}k` : f.value.toFixed(0)}
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${f.color === "amber" ? "bg-amber-500" : "bg-emerald-500"}`}
                  style={{ width: `${Math.max((f.value / maxForecast) * 100, 2)}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="pt-3 border-t border-slate-200">
          <p className="text-[0.6rem] text-slate-400 leading-relaxed">
            Based on current click rates and EPC values. Actual revenue depends on affiliate agreement terms, conversion rates, and traffic growth.
          </p>
        </div>
      </div>
    </div>
  );
}
