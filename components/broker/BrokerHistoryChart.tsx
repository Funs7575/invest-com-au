import {
  readBrokerHistory,
  type BrokerSnapshotRow,
} from "@/lib/price-snapshots";
import SVGLineChart from "@/components/charts/SVGLineChart";

interface Props {
  slug: string;
  /** Which fee field to chart. Defaults to ASX brokerage. */
  metric?: "asx_fee_value" | "us_fee_value" | "fx_rate" | "inactivity_fee_value";
  /** Lookback window in days. Defaults to 30. */
  daysBack?: number;
  title?: string;
  className?: string;
}

const METRIC_LABEL: Record<string, { title: string; format: (v: number) => string }> = {
  asx_fee_value: {
    title: "ASX brokerage ($)",
    format: (v) => `$${v.toFixed(2)}`,
  },
  us_fee_value: {
    title: "US brokerage",
    format: (v) => (v < 5 ? `${v.toFixed(2)}%` : `$${v.toFixed(2)}`),
  },
  fx_rate: {
    title: "FX rate (%)",
    format: (v) => `${v.toFixed(2)}%`,
  },
  inactivity_fee_value: {
    title: "Inactivity fee",
    format: (v) => (v === 0 ? "Free" : `$${v.toFixed(2)}`),
  },
};

/**
 * Server component — reads the broker's snapshot history for the
 * requested metric and renders it as a time-series chart. Silently
 * renders nothing if there are fewer than 2 data points (the
 * underlying SVGLineChart requires at least 2), so a freshly-
 * tracked broker doesn't show an empty frame.
 *
 * This is intentionally a server component so the query happens
 * at build/ISR time and the client never ships the chart library
 * (there is no library — it's pure SVG).
 */
export default async function BrokerHistoryChart({
  slug,
  metric = "asx_fee_value",
  daysBack = 30,
  title,
  className,
}: Props) {
  const since = new Date(Date.now() - daysBack * 86_400_000).toISOString();
  const rows = await readBrokerHistory(slug, since);
  const label = METRIC_LABEL[metric] || { title: metric, format: String };

  const data = rows
    .map((r: BrokerSnapshotRow) => {
      const val = r[metric];
      if (val == null) return null;
      return {
        label: new Date(r.captured_at).toLocaleDateString("en-AU", {
          day: "numeric",
          month: "short",
        }),
        value: Number(val),
      };
    })
    .filter((p): p is { label: string; value: number } => p !== null);

  if (data.length < 2) return null;

  const newest = data[data.length - 1].value;
  const oldest = data[0].value;
  const delta = newest - oldest;
  const pctDelta = oldest !== 0 ? (delta / oldest) * 100 : 0;
  const deltaPositive = delta > 0;

  return (
    <section
      className={
        className ||
        "rounded-xl border border-slate-200 bg-white p-5"
      }
    >
      <header className="flex items-baseline justify-between mb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            {title || label.title}
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Last {daysBack} days · {data.length} snapshots
          </p>
        </div>
        {delta !== 0 && (
          <p
            className={`text-xs font-semibold ${
              deltaPositive ? "text-red-600" : "text-emerald-600"
            }`}
            aria-label={`${deltaPositive ? "increased" : "decreased"} ${Math.abs(pctDelta).toFixed(1)} percent`}
          >
            {deltaPositive ? "↑" : "↓"} {Math.abs(pctDelta).toFixed(1)}%
          </p>
        )}
      </header>

      <SVGLineChart
        data={data}
        width={560}
        height={180}
        color={deltaPositive ? "#dc2626" : "#059669"}
        showArea
        showGrid
        showDots={data.length <= 30}
        formatValue={label.format}
      />

      <p className="mt-3 text-[10px] text-slate-400">
        Snapshots captured hourly. {label.format(newest)} is the most recent
        value, {label.format(oldest)} was the value {daysBack} days ago.
        Past fee changes are not a reliable indicator of future changes.
      </p>
    </section>
  );
}
