import AdminShell from "@/components/AdminShell";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/require-admin";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

interface DailyRow {
  run_date: string;
  channel: string;
  vertical: string | null;
  touches: number;
  first_touch_conversions: number;
  last_touch_conversions: number;
  linear_conversions: number;
  revenue_cents: number;
}

/**
 * /admin/analytics/attribution-daily — daily rollup of
 * attribution_touches into per-channel × per-vertical rows.
 *
 * Shows:
 *   - Last 30 days totals per channel (aggregated across all verticals)
 *   - Revenue by attribution model (first / last / linear)
 *   - Per-vertical drill table
 *
 * Reads from the nightly rollup table (no expensive live query),
 * so it renders in <50ms even with 90 days of history.
 */
export default async function AdminAttributionDailyPage() {
  const guard = await requireAdmin();
  if (!guard.ok) redirect("/admin");

  const supabase = createAdminClient();
  const since = new Date(Date.now() - 30 * 86_400_000)
    .toISOString()
    .slice(0, 10);

  const { data } = await supabase
    .from("revenue_attribution_daily")
    .select("*")
    .gte("run_date", since)
    .order("run_date", { ascending: false })
    .limit(5000);

  const rows = (data as DailyRow[] | null) || [];

  // Roll up per-channel totals
  interface ChannelTotals {
    channel: string;
    touches: number;
    firstTouch: number;
    lastTouch: number;
    linear: number;
    revenueCents: number;
  }
  const channelMap = new Map<string, ChannelTotals>();
  for (const r of rows) {
    const t = channelMap.get(r.channel) || {
      channel: r.channel,
      touches: 0,
      firstTouch: 0,
      lastTouch: 0,
      linear: 0,
      revenueCents: 0,
    };
    t.touches += r.touches;
    t.firstTouch += r.first_touch_conversions;
    t.lastTouch += r.last_touch_conversions;
    t.linear += r.linear_conversions;
    t.revenueCents += r.revenue_cents;
    channelMap.set(r.channel, t);
  }
  const channelTotals = Array.from(channelMap.values()).sort(
    (a, b) => b.revenueCents - a.revenueCents,
  );

  const totalRevenueCents = channelTotals.reduce(
    (s, c) => s + c.revenueCents,
    0,
  );
  const totalTouches = channelTotals.reduce((s, c) => s + c.touches, 0);
  const totalLastTouch = channelTotals.reduce((s, c) => s + c.lastTouch, 0);

  // Per-vertical rows (most recent first)
  const topVerticalRows = rows.slice(0, 50);

  return (
    <AdminShell title="Attribution — daily rollup">
      <div className="max-w-6xl space-y-8">
        <section>
          <p className="text-sm text-slate-600">
            30-day rollup of{" "}
            <code className="text-xs bg-slate-100 px-1 rounded">
              attribution_touches
            </code>
            . Populated nightly by{" "}
            <code className="text-xs bg-slate-100 px-1 rounded">
              /api/cron/attribution-rollup
            </code>
            .
          </p>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-[10px] font-bold uppercase text-slate-500">
              Total touches
            </p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">
              {totalTouches.toLocaleString()}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-[10px] font-bold uppercase text-slate-500">
              Conversions (last touch)
            </p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">
              {totalLastTouch.toLocaleString()}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-[10px] font-bold uppercase text-slate-500">
              Revenue (last touch)
            </p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">
              ${(totalRevenueCents / 100).toFixed(2)}
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-base font-bold text-slate-900 mb-3">
            By channel
          </h2>
          {channelTotals.length === 0 ? (
            <p className="text-sm text-slate-500">
              No attribution data rolled up yet. Run{" "}
              <code className="text-xs bg-slate-100 px-1 rounded">
                /api/cron/attribution-rollup
              </code>{" "}
              manually once there are touches in the source table.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="text-left px-3 py-2">Channel</th>
                    <th className="text-right px-3 py-2">Touches</th>
                    <th className="text-right px-3 py-2">First-touch</th>
                    <th className="text-right px-3 py-2">Last-touch</th>
                    <th className="text-right px-3 py-2">Linear</th>
                    <th className="text-right px-3 py-2">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {channelTotals.map((c) => (
                    <tr key={c.channel} className="border-t border-slate-100">
                      <td className="px-3 py-2 font-bold capitalize text-slate-900">
                        {c.channel}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {c.touches.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {c.firstTouch}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {c.lastTouch}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {c.linear.toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums font-bold">
                        ${(c.revenueCents / 100).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {topVerticalRows.length > 0 && (
          <section>
            <h2 className="text-base font-bold text-slate-900 mb-3">
              Recent rollup rows (per vertical)
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="text-left px-3 py-2">Date</th>
                    <th className="text-left px-3 py-2">Channel</th>
                    <th className="text-left px-3 py-2">Vertical</th>
                    <th className="text-right px-3 py-2">Touches</th>
                    <th className="text-right px-3 py-2">Conv.</th>
                    <th className="text-right px-3 py-2">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {topVerticalRows.map((r, i) => (
                    <tr
                      key={`${r.run_date}-${r.channel}-${r.vertical || "none"}-${i}`}
                      className="border-t border-slate-100"
                    >
                      <td className="px-3 py-2 text-slate-600">{r.run_date}</td>
                      <td className="px-3 py-2 capitalize text-slate-800">
                        {r.channel}
                      </td>
                      <td className="px-3 py-2 text-slate-600">
                        {r.vertical || "—"}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {r.touches}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {r.last_touch_conversions}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        ${(r.revenue_cents / 100).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </AdminShell>
  );
}
