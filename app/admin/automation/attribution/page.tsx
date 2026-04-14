import Link from "next/link";
import AdminShell from "@/components/AdminShell";
import { createAdminClient } from "@/lib/supabase/admin";
import { rollupAttribution, type Channel } from "@/lib/attribution";

export const dynamic = "force-dynamic";

/**
 * Attribution dashboard — shows per-channel traffic + conversions
 * across three common models (first/last/linear) with a simple
 * revenue-per-channel split.
 */
export default async function AttributionPage() {
  const admin = createAdminClient();
  const thirtyDaysAgo = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const { data } = await admin
    .from("attribution_touches")
    .select("session_id, channel, event, value_cents")
    .gte("created_at", thirtyDaysAgo)
    .limit(50_000);

  const rollup = rollupAttribution(
    (data || []).map((r) => ({
      session_id: r.session_id as string,
      channel: r.channel as Channel,
      event: r.event as string,
      value_cents: (r.value_cents as number | null) ?? 0,
    })),
  );

  const rows = Object.values(rollup).sort(
    (a, b) => b.touches - a.touches,
  );

  const totals = rows.reduce(
    (acc, r) => {
      acc.touches += r.touches;
      acc.firstTouchConversions += r.firstTouchConversions;
      acc.lastTouchConversions += r.lastTouchConversions;
      acc.linearConversions += r.linearConversions;
      acc.revenueCents += r.revenueCents;
      return acc;
    },
    { touches: 0, firstTouchConversions: 0, lastTouchConversions: 0, linearConversions: 0, revenueCents: 0 },
  );

  return (
    <AdminShell
      title="Attribution"
      subtitle="30-day multi-touch channel rollup across first / last / linear models"
    >
      <div className="p-4 md:p-6 max-w-6xl">
        <nav className="text-xs text-slate-500 mb-3">
          <Link href="/admin/automation" className="hover:text-slate-900">
            ← Automation dashboard
          </Link>
        </nav>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <Stat label="Touches" value={totals.touches} />
          <Stat label="Conversions" value={totals.lastTouchConversions} />
          <Stat label="Linear conversions" value={Math.round(totals.linearConversions * 10) / 10} />
          <Stat label="Revenue" value={`$${(totals.revenueCents / 100).toLocaleString("en-AU")}`} />
        </div>

        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <header className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Per channel</h2>
            <p className="text-[0.65rem] text-slate-500">
              {rows.length === 0 ? "No touches recorded yet — wire /api/attribution/touch into client nav" : "Sorted by touch volume"}
            </p>
          </header>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[0.6rem] uppercase tracking-wider text-slate-500 border-b border-slate-100">
                <th className="px-4 py-2 text-left font-semibold">Channel</th>
                <th className="px-4 py-2 text-right font-semibold">Touches</th>
                <th className="px-4 py-2 text-right font-semibold">First-touch</th>
                <th className="px-4 py-2 text-right font-semibold">Last-touch</th>
                <th className="px-4 py-2 text-right font-semibold">Linear</th>
                <th className="px-4 py-2 text-right font-semibold">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">
                    No attribution data yet. Once the client beacon starts
                    posting to /api/attribution/touch, rollups appear here.
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r.channel} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-2 font-semibold text-slate-800">{r.channel}</td>
                  <td className="px-4 py-2 text-right font-mono text-slate-700">{r.touches.toLocaleString("en-AU")}</td>
                  <td className="px-4 py-2 text-right font-mono text-slate-700">{r.firstTouchConversions}</td>
                  <td className="px-4 py-2 text-right font-mono text-slate-700">{r.lastTouchConversions}</td>
                  <td className="px-4 py-2 text-right font-mono text-slate-700">{(Math.round(r.linearConversions * 10) / 10).toFixed(1)}</td>
                  <td className="px-4 py-2 text-right font-mono text-slate-700">${(r.revenueCents / 100).toLocaleString("en-AU")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <p className="mt-3 text-[0.65rem] text-slate-500">
          First-touch credits the channel that introduced the user.
          Last-touch credits the channel right before the conversion.
          Linear spreads credit evenly across every distinct channel in
          the session prior to conversion.
        </p>
      </div>
    </AdminShell>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3">
      <div className="text-[0.6rem] font-semibold uppercase tracking-wider text-slate-500">{label}</div>
      <div className="text-xl font-bold text-slate-900 mt-1">{value}</div>
    </div>
  );
}
