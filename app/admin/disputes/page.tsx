import type { Metadata } from "next";
import Link from "next/link";

import AdminShell from "@/components/AdminShell";
import { listOpenDisputes } from "@/lib/disputes";

export const metadata: Metadata = {
  title: "Dispute Queue — Admin",
  robots: "noindex, nofollow",
};

export const dynamic = "force-dynamic";

function formatAge(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  if (days >= 1) return `${days}d`;
  const hours = Math.floor(ms / (60 * 60 * 1000));
  if (hours >= 1) return `${hours}h`;
  const mins = Math.max(1, Math.floor(ms / (60 * 1000)));
  return `${mins}m`;
}

export default async function AdminDisputesPage() {
  const rows = await listOpenDisputes();

  return (
    <AdminShell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Brief Disputes</h1>
        <p className="text-sm text-slate-500 mt-1">
          Open and in-review mediation cases. Pick one to view the full chat
          history, bookings, tracker events, and resolve in favour of the
          consumer or provider.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
            <tr>
              <th className="text-left p-3">Brief</th>
              <th className="text-left p-3">Opener</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Age</th>
              <th className="text-right p-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-slate-400">
                  No open disputes right now.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="p-3">
                  <p className="font-semibold text-slate-900">
                    {r.brief_job_title ?? `Brief #${r.brief_id}`}
                  </p>
                  {r.brief_slug && (
                    <Link
                      href={`/briefs/${r.brief_slug}`}
                      target="_blank"
                      rel="noopener"
                      className="text-xs text-amber-600 hover:underline"
                    >
                      View consumer tracker
                    </Link>
                  )}
                </td>
                <td className="p-3 text-slate-700">
                  <p className="font-medium">{r.opened_by_kind}</p>
                  <p className="text-xs text-slate-500">{r.opened_by_email}</p>
                </td>
                <td className="p-3 text-slate-700">{r.status}</td>
                <td className="p-3 text-slate-700">{formatAge(r.created_at)}</td>
                <td className="p-3 text-right">
                  <Link
                    href={`/admin/disputes/${r.id}`}
                    className="rounded-xl bg-slate-900 text-white text-xs font-semibold px-3 py-2"
                  >
                    Review
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
