import AdminShell from "@/components/AdminShell";
import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Sponsored placement queue.
 *
 * Read-only view of every scheduled/active/ended booking. Editing
 * (add/cancel) is done via direct SQL for now — a web form sits one
 * PR away but the cron already handles the apply/clear lifecycle
 * once a row is inserted.
 */

interface Booking {
  id: number;
  broker_slug: string;
  tier: string;
  starts_at: string;
  ends_at: string;
  amount_cents: number | null;
  status: string;
  invoice_ref: string | null;
  notes: string | null;
  applied_at: string | null;
  cleared_at: string | null;
}

export default async function SponsoredQueuePage() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("sponsored_placement_bookings")
    .select("*")
    .order("starts_at", { ascending: false })
    .limit(200);

  const rows = (data ?? []) as Booking[];
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();

  const active = rows.filter((r) => r.status === "active");
  const scheduled = rows
    .filter((r) => r.status === "scheduled")
    .sort((a, z) => new Date(a.starts_at).getTime() - new Date(z.starts_at).getTime());
  const history = rows.filter((r) => r.status === "ended" || r.status === "cancelled");

  return (
    <AdminShell
      title="Sponsored placement queue"
      subtitle="Scheduled sponsorship slots applied by the daily cron"
    >
      <div className="max-w-5xl space-y-6">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600">
          <strong className="text-slate-800">How it works:</strong> insert a
          row into <code className="bg-white px-1 rounded">sponsored_placement_bookings</code>{" "}
          with <code className="bg-white px-1 rounded">broker_slug</code>,{" "}
          <code className="bg-white px-1 rounded">tier</code> (featured_partner
          / editors_pick / deal_of_month), <code className="bg-white px-1 rounded">starts_at</code>,{" "}
          <code className="bg-white px-1 rounded">ends_at</code>. The
          daily-1 cron{" "}
          <code className="bg-white px-1 rounded">/api/cron/sponsored-placement-apply</code>{" "}
          applies the tier to the broker row when the window opens and
          clears it when the window closes.
        </div>

        <Section title={`Active (${active.length})`} rows={active} now={now} accent="emerald" />
        <Section title={`Scheduled (${scheduled.length})`} rows={scheduled} now={now} accent="amber" />
        <Section title={`History — last ${history.length}`} rows={history.slice(0, 50)} now={now} accent="slate" />
      </div>
    </AdminShell>
  );
}

function Section({
  title,
  rows,
  now,
  accent,
}: {
  title: string;
  rows: Booking[];
  now: number;
  accent: "emerald" | "amber" | "slate";
}) {
  const palette = {
    emerald: "bg-emerald-50 border-emerald-200",
    amber: "bg-amber-50 border-amber-200",
    slate: "bg-slate-50 border-slate-200",
  }[accent];
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className={`px-4 py-3 border-b border-slate-100 ${palette}`}>
        <h2 className="text-sm font-extrabold text-slate-900">{title}</h2>
      </div>
      {rows.length === 0 ? (
        <div className="p-6 text-sm text-slate-500 text-center">No bookings.</div>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr className="text-left text-[11px] uppercase tracking-wide text-slate-600">
              <th className="px-4 py-2">Broker</th>
              <th className="px-3 py-2">Tier</th>
              <th className="px-3 py-2">Window</th>
              <th className="px-3 py-2 text-right">Amount</th>
              <th className="px-3 py-2">Invoice</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => {
              const starts = new Date(r.starts_at);
              const ends = new Date(r.ends_at);
              const inWindow = now >= starts.getTime() && now <= ends.getTime();
              return (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2 font-mono text-xs">
                    <Link href={`/broker/${r.broker_slug}`} className="text-amber-700 hover:text-amber-800">
                      {r.broker_slug}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-slate-700">
                      {r.tier}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-600 text-xs">
                    {starts.toLocaleDateString("en-AU")} → {ends.toLocaleDateString("en-AU")}{" "}
                    {inWindow && r.status === "scheduled" ? (
                      <span className="text-[10px] text-amber-700 font-bold">(window open but not yet applied — next cron)</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-xs">
                    {r.amount_cents != null
                      ? `$${(r.amount_cents / 100).toLocaleString("en-AU")}`
                      : "—"}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-500">
                    {r.invoice_ref ?? "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
