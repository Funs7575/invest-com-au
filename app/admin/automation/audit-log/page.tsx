import Link from "next/link";
import AdminShell from "@/components/AdminShell";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

interface AuditRow {
  id: number;
  admin_email: string;
  feature: string;
  action: string;
  target_row_id: number | null;
  target_verdict: string | null;
  reason: string | null;
  context: Record<string, unknown> | null;
  created_at: string;
}

const ACTION_COLOUR: Record<string, string> = {
  override: "bg-blue-100 text-blue-800",
  trigger: "bg-slate-100 text-slate-700",
  config: "bg-purple-100 text-purple-800",
  bulk: "bg-amber-100 text-amber-800",
  kill_switch: "bg-red-100 text-red-800",
};

/**
 * Unified audit log page.
 *
 * One feed view over admin_action_log with simple filtering on
 * feature + action + admin email. Defaults to the last 500 rows,
 * most recent first. Admin-only via the AdminShell layout.
 */
export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ feature?: string; action?: string; admin?: string }>;
}) {
  const params = await searchParams;
  const admin = createAdminClient();
  let query = admin
    .from("admin_action_log")
    .select("id, admin_email, feature, action, target_row_id, target_verdict, reason, context, created_at")
    .order("created_at", { ascending: false })
    .limit(500);

  if (params.feature) query = query.eq("feature", params.feature);
  if (params.action) query = query.eq("action", params.action);
  if (params.admin) query = query.eq("admin_email", params.admin);

  const { data } = await query;
  const rows = (data || []) as AuditRow[];

  return (
    <AdminShell title="Admin action audit log" subtitle="Every classifier override, config change, bulk action and kill switch">
      <div className="p-4 md:p-6 max-w-7xl">
        <nav className="text-xs text-slate-500 mb-3">
          <Link href="/admin/automation" className="hover:text-slate-900">
            ← Automation dashboard
          </Link>
        </nav>

        {/* Filters — plain links, no JS */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="text-xs text-slate-500">Filter:</span>
          {["override", "trigger", "config", "bulk", "kill_switch"].map((a) => (
            <Link
              key={a}
              href={`/admin/automation/audit-log?action=${a}`}
              className={`text-[0.65rem] font-semibold px-2 py-1 rounded-full border ${
                params.action === a
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {a}
            </Link>
          ))}
          {params.action || params.feature || params.admin ? (
            <Link
              href="/admin/automation/audit-log"
              className="text-[0.65rem] font-semibold px-2 py-1 rounded-full text-slate-500 hover:text-slate-900"
            >
              clear
            </Link>
          ) : null}
        </div>

        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[0.6rem] uppercase tracking-wider text-slate-500 border-b border-slate-100 bg-slate-50">
                <th className="px-3 py-2 text-left font-semibold">When</th>
                <th className="px-3 py-2 text-left font-semibold">Who</th>
                <th className="px-3 py-2 text-left font-semibold">Feature</th>
                <th className="px-3 py-2 text-left font-semibold">Action</th>
                <th className="px-3 py-2 text-left font-semibold">Target</th>
                <th className="px-3 py-2 text-left font-semibold">Reason</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                    No matching audit rows.
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/40">
                  <td className="px-3 py-2 text-xs text-slate-600 whitespace-nowrap">
                    {new Date(r.created_at).toLocaleString("en-AU")}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-800 truncate max-w-[18ch]">{r.admin_email}</td>
                  <td className="px-3 py-2 text-xs font-mono text-slate-700">{r.feature}</td>
                  <td className="px-3 py-2">
                    <span className={`text-[0.6rem] font-semibold uppercase tracking-wider px-2 py-0.5 rounded ${ACTION_COLOUR[r.action] || "bg-slate-100 text-slate-700"}`}>
                      {r.action}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-700">
                    {r.target_row_id ? `#${r.target_row_id}` : r.action === "bulk" ? `${(r.context as { row_count?: number } | null)?.row_count ?? "?"} rows` : "—"}
                    {r.target_verdict && (
                      <span className="ml-1 text-slate-500">→ {r.target_verdict}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-600 truncate max-w-[40ch]">{r.reason || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <p className="mt-3 text-[0.65rem] text-slate-500">Showing most recent 500. Older rows remain in the table.</p>
      </div>
    </AdminShell>
  );
}
