import Icon from "@/components/Icon";
import type { PriceSnapshot } from "@/lib/commodities";

interface Props {
  snapshots: Record<string, PriceSnapshot>;
}

interface Benchmark {
  ref: string;
  name: string;
  unit: string;
  description: string;
}

const BENCHMARKS: Benchmark[] = [
  {
    ref: "brent-crude",
    name: "Brent crude",
    unit: "USD / bbl",
    description: "North Sea light-sweet benchmark",
  },
  {
    ref: "wti-crude",
    name: "WTI crude",
    unit: "USD / bbl",
    description: "US light-sweet benchmark",
  },
  {
    ref: "jkm-lng",
    name: "JKM LNG",
    unit: "USD / mmBTU",
    description: "Japan-Korea-Marker LNG spot",
  },
];

function formatPrice(snapshot: PriceSnapshot, unit: string): string {
  // JKM in mmBTU is stored with 100x scaling (minor units) — detect by unit.
  const divisor = unit.includes("mmBTU") ? 100 : 100;
  const value = snapshot.price_minor_units / divisor;
  return value.toLocaleString("en-AU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatCapturedAt(iso: string): string {
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Editorial energy-price widget.
 *
 * Renders the most recent price snapshot for Brent, WTI and JKM
 * above the oil-gas hub. Data comes from the commodity_price_snapshots
 * table and is reviewed editorially — the widget always shows its
 * captured_at date so readers can judge freshness.
 *
 * If no snapshots exist the widget returns null rather than
 * rendering a stale or empty row.
 */
export default function EnergyPriceWidget({ snapshots }: Props) {
  const available = BENCHMARKS.filter((b) => snapshots[b.ref]);
  if (available.length === 0) return null;

  // Display the oldest captured_at across shown benchmarks so a stale
  // snapshot pulls down the headline date honestly.
  const oldest = available
    .map((b) => snapshots[b.ref]!.captured_at)
    .sort()[0]!;

  return (
    <section
      aria-label="Energy benchmark snapshot"
      className="bg-slate-900 text-white border-b border-slate-800"
    >
      <div className="container-custom py-4">
        <div className="flex items-start md:items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-amber-400">
            <Icon name="activity" size={14} />
            Energy benchmark snapshot
            <span className="hidden sm:inline text-slate-400 font-normal normal-case">
              · editorial, as at {formatCapturedAt(oldest)}
            </span>
          </div>
          <div className="flex flex-wrap gap-4 md:gap-6">
            {available.map((b) => {
              const s = snapshots[b.ref]!;
              return (
                <div key={b.ref} className="text-sm">
                  <span className="text-slate-400 text-[11px] uppercase tracking-wide mr-2">
                    {b.name}
                  </span>
                  <span className="font-extrabold text-white">
                    {formatPrice(s, b.unit)}
                  </span>
                  <span className="text-slate-400 text-[11px] ml-1">
                    {b.unit}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        <p className="text-[10px] text-slate-500 mt-1.5 sm:hidden">
          Editorial snapshot · as at {formatCapturedAt(oldest)}
        </p>
      </div>
    </section>
  );
}
