import { createClient } from "@/lib/supabase/server";
import SVGLineChart from "@/components/charts/SVGLineChart";

interface Props {
  brokerId: number;
  productKind: "savings_account" | "term_deposit";
  brokerName: string;
  daysBack?: number;
}

const PRODUCT_LABELS: Record<string, string> = {
  savings_account: "Savings rate",
  term_deposit: "Term deposit rate",
};

function bpsToPercent(bps: number): string {
  return (bps / 100).toFixed(2) + "%";
}

/**
 * Server component — reads savings_rate_snapshots for a given broker + product
 * kind and renders a time-series rate chart. Renders nothing if fewer than 2
 * data points exist (chart requires ≥2), so a newly-tracked broker doesn't
 * show an empty frame.
 */
export default async function SavingsRateHistoryChart({ brokerId, productKind, brokerName, daysBack = 90 }: Props) {
  let rows: { rate_bps: number; captured_at: string }[] = [];

  try {
    const supabase = await createClient();
    // eslint-disable-next-line react-hooks/purity
    const since = new Date(Date.now() - daysBack * 86_400_000).toISOString();
    const { data } = await supabase
      .from("savings_rate_snapshots")
      .select("rate_bps, captured_at")
      .eq("broker_id", brokerId)
      .eq("product_kind", productKind)
      .gte("captured_at", since)
      .order("captured_at", { ascending: true });
    rows = (data ?? []) as typeof rows;
  } catch {
    return null;
  }

  const data = rows.map((r) => ({
    label: new Date(r.captured_at).toLocaleDateString("en-AU", { day: "numeric", month: "short" }),
    value: r.rate_bps,
  }));

  if (data.length < 2) return null;

  const newest = data[data.length - 1]?.value ?? 0;
  const oldest = data[0]?.value ?? 0;
  const delta = newest - oldest;
  const chartTitle = PRODUCT_LABELS[productKind] ?? "Interest rate";

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <header className="flex items-baseline justify-between mb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">{chartTitle} history — {brokerName}</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Last {daysBack} days · {data.length} snapshots
          </p>
        </div>
        {delta !== 0 && (
          <p
            className={`text-xs font-semibold ${delta > 0 ? "text-emerald-600" : "text-red-600"}`}
            aria-label={`rate ${delta > 0 ? "increased" : "decreased"} ${Math.abs(delta / 100).toFixed(2)} percentage points`}
          >
            {delta > 0 ? "↑" : "↓"} {Math.abs(delta / 100).toFixed(2)}pp
          </p>
        )}
      </header>

      <SVGLineChart
        data={data}
        width={560}
        height={180}
        color={delta >= 0 ? "#059669" : "#dc2626"}
        showArea
        showGrid
        showDots={data.length <= 30}
        formatValue={bpsToPercent}
      />

      <p className="mt-3 text-[10px] text-slate-500">
        Rate snapshots are captured from published rate tables. Current rate: {bpsToPercent(newest)} p.a.
        Past rate changes are not a reliable indicator of future rates. General information only — verify with the provider.
      </p>
    </section>
  );
}
