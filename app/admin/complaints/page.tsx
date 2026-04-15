import Link from "next/link";
import AdminShell from "@/components/AdminShell";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Admin complaints register dashboard.
 *
 * Shows:
 *   - Open complaints sorted by SLA due date (most urgent first)
 *   - Traffic-light buckets: overdue (red) / <7 days (amber) /
 *     >7 days (green)
 *   - SLA compliance percentage over the last 90 days
 *   - Per-category volume
 *
 * This is the ASIC RG 271 register. Every row is audit-inspectable.
 */
export default async function AdminComplaintsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const admin = createAdminClient();
  const now = new Date();

  const statusFilter = params.status || "active";
  const statusQuery =
    statusFilter === "all"
      ? null
      : statusFilter === "active"
        ? ["submitted", "acknowledged", "under_review"]
        : [statusFilter];

  const [complaintsRes, statsRes] = await Promise.all([
    (async () => {
      let q = admin
        .from("complaints_register")
        .select(
          "id, reference_id, complainant_email, complainant_name, subject, category, severity, status, sla_due_at, submitted_at, resolved_at, assigned_to",
        )
        .order("sla_due_at", { ascending: true })
        .limit(200);
      if (statusQuery) q = q.in("status", statusQuery);
      return q;
    })(),
    admin
      .from("complaints_register")
      .select("status, submitted_at, resolved_at, sla_due_at")
      .gte(
        "submitted_at",
        new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      ),
  ]);

  const rows = complaintsRes.data || [];
  const last90 = statsRes.data || [];

  // Compute 90-day SLA %
  const resolved = last90.filter((r) => r.resolved_at != null);
  const resolvedWithinSla = resolved.filter(
    (r) =>
      new Date(r.resolved_at as string).getTime() <=
      new Date(r.sla_due_at as string).getTime(),
  );
  const slaPct = resolved.length > 0 ? (resolvedWithinSla.length / resolved.length) * 100 : null;
  const openCount = last90.filter(
    (r) => !["resolved", "escalated_afca", "closed"].includes(r.status as string),
  ).length;

  return (
    <AdminShell
      title="Complaints register"
      subtitle="ASIC RG 271 Internal Dispute Resolution — 30-day SLA"
    >
      <div className="p-4 md:p-6 max-w-7xl">
        <nav className="text-xs text-slate-500 mb-3">
          <Link href="/admin/automation" className="hover:text-slate-900">
            ← Automation dashboard
          </Link>
        </nav>

        {/* ── Summary tiles ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="text-[0.6rem] uppercase tracking-wider text-slate-500">Open</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{openCount}</div>
            <div className="text-[0.65rem] text-slate-500 mt-0.5">last 90 days</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="text-[0.6rem] uppercase tracking-wider text-slate-500">SLA compliance</div>
            <div
              className={`text-2xl font-bold mt-1 ${
                slaPct == null
                  ? "text-slate-400"
                  : slaPct >= 95
                    ? "text-emerald-700"
                    : slaPct >= 80
                      ? "text-amber-700"
                      : "text-red-700"
              }`}
            >
              {slaPct == null ? "—" : `${slaPct.toFixed(1)}%`}
            </div>
            <div className="text-[0.65rem] text-slate-500 mt-0.5">target: 95% within 30 days</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="text-[0.6rem] uppercase tracking-wider text-slate-500">Resolved (90d)</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{resolved.length}</div>
          </div>
        </div>

        {/* ── Status filter ── */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="text-xs text-slate-500">Filter:</span>
          {["active", "submitted", "under_review", "resolved", "escalated_afca", "all"].map((s) => (
            <Link
              key={s}
              href={`/admin/complaints?status=${s}`}
              className={`text-[0.65rem] font-semibold px-2 py-1 rounded-full border ${
                statusFilter === s
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {s}
            </Link>
          ))}
        </div>

        {/* ── Register table ── */}
        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[0.6rem] uppercase tracking-wider text-slate-500 border-b border-slate-100 bg-slate-50">
                <th className="px-3 py-2 text-left font-semibold">Ref</th>
                <th className="px-3 py-2 text-left font-semibold">Subject</th>
                <th className="px-3 py-2 text-left font-semibold">Category</th>
                <th className="px-3 py-2 text-left font-semibold">Status</th>
                <th className="px-3 py-2 text-left font-semibold">SLA</th>
                <th className="px-3 py-2 text-left font-semibold">Complainant</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">
                    No complaints for this filter.
                  </td>
                </tr>
              )}
              {rows.map((r) => {
                const slaDue = new Date(r.sla_due_at as string).getTime();
                const daysLeft = (slaDue - now.getTime()) / (1000 * 60 * 60 * 24);
                const slaClass =
                  daysLeft < 0
                    ? "text-red-700 font-semibold"
                    : daysLeft < 7
                      ? "text-amber-700 font-semibold"
                      : "text-slate-700";
                const slaLabel =
                  daysLeft < 0
                    ? `${Math.abs(Math.ceil(daysLeft))} days overdue`
                    : daysLeft < 1
                      ? `<1 day`
                      : `${Math.ceil(daysLeft)} days`;
                return (
                  <tr
                    key={r.id as number}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50/40"
                  >
                    <td className="px-3 py-2 font-mono text-xs text-slate-700">
                      {r.reference_id}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-800 max-w-[30ch] truncate" title={r.subject as string}>
                      {r.subject}
                    </td>
                    <td className="px-3 py-2 text-[0.65rem] text-slate-600">{r.category}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`text-[0.6rem] font-semibold uppercase tracking-wider px-2 py-0.5 rounded ${
                          r.status === "resolved" || r.status === "closed"
                            ? "bg-emerald-100 text-emerald-800"
                            : r.status === "escalated_afca"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className={`px-3 py-2 text-[0.7rem] font-mono ${slaClass}`}>
                      {r.resolved_at ? "✓ resolved" : slaLabel}
                    </td>
                    <td className="px-3 py-2 text-[0.65rem] text-slate-500 truncate max-w-[24ch]" title={r.complainant_email as string}>
                      {r.complainant_email}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        <p className="mt-3 text-[0.65rem] text-slate-500">
          ASIC Regulatory Guide 271 (Internal Dispute Resolution)
          requires a 30-day SLA from receipt of a complaint. Rows
          past the SLA must be escalated to AFCA. Showing the most
          recent 200 rows.
        </p>
      </div>
    </AdminShell>
  );
}
