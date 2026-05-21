import AdminShell from "@/components/AdminShell";
import { listImpersonations } from "@/lib/admin-impersonation";

export const dynamic = "force-dynamic";

/**
 * Admin impersonation visibility (audit §5 #13).
 *
 * The impersonate-as-user feature was API-only and audit-logged to
 * admin_impersonations, but there was no surface to SEE who is (or was)
 * impersonating whom. On an AFSL platform that live visibility matters. This
 * read-only view lists active sessions first, then recent history.
 */
function fmt(ts: string | null): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("en-AU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminImpersonationsPage() {
  const rows = await listImpersonations();
  const active = rows.filter((r) => !r.ended_at);

  return (
    <AdminShell
      title="Impersonations"
      subtitle="Who is (or was) impersonating whom. Live sessions first; full audit history below."
    >
      <div className="mb-4 flex flex-wrap gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Active now</p>
          <p className={`mt-1 text-2xl font-bold ${active.length > 0 ? "text-amber-600" : "text-slate-900"}`}>
            {active.length}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Recent (last {rows.length})</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{rows.length}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No impersonation sessions recorded.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Target user</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Admin (user id)</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Started</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Ended</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      {r.ended_at ? (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">Ended</span>
                      ) : (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">● Active</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900">{r.target_email}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{r.admin_user_id}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{fmt(r.started_at)}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{fmt(r.ended_at)}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{r.actions_taken?.length ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
