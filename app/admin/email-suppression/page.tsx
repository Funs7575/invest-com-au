"use client";

import { useCallback, useEffect, useState } from "react";

interface Row {
  id: string;
  contact_email: string;
  reason: string;
  suppressed_at: string;
  metadata: Record<string, unknown> | null;
}

const REASON_LABELS: Record<string, string> = {
  hard_bounce: "Hard bounce",
  soft_bounce_ladder_exhausted: "Soft bounces exhausted",
  complaint: "Complaint",
  manual_unsubscribe: "Manual unsubscribe",
  admin: "Admin override",
};

// FIN_NOTEBOOK item 18 — admin dashboard over public.suppression_list.
// Lets you audit who's suppressed and why, manually de-suppress (for
// "user emailed support saying they didn't unsubscribe" cases) and add
// new entries (e.g. user-requested permanent opt-out via support).
export default function EmailSuppressionPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [reasonFilter, setReasonFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (reasonFilter) params.set("reason", reasonFilter);
      params.set("limit", "200");
      const res = await fetch(`/api/admin/email-suppression?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = (await res.json()) as { rows: Row[]; total: number };
      setRows(body.rows);
      setTotal(body.total);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [q, reasonFilter]);

  useEffect(() => { load(); }, [load]);

  const handleUnsuppress = async (email: string) => {
    if (!window.confirm(`Remove ${email} from the suppression list?\n\nThey'll start receiving emails again on the next eligible send.`)) {
      return;
    }
    const res = await fetch(`/api/admin/email-suppression?email=${encodeURIComponent(email)}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      alert("Unsuppress failed");
      return;
    }
    load();
  };

  const handleAddManual = async () => {
    const email = window.prompt("Email to suppress:");
    if (!email) return;
    const reason = window.prompt(
      "Reason (one of: hard_bounce, soft_bounce_ladder_exhausted, complaint, manual_unsubscribe, admin):",
      "manual_unsubscribe",
    );
    if (!reason) return;
    const res = await fetch("/api/admin/email-suppression", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, reason }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      alert(`Suppress failed: ${body.error ?? "Unknown error"}`);
      return;
    }
    load();
  };

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Email suppression list</h1>
        <p className="mt-1 text-sm text-slate-600">
          Authoritative blocklist for outbound email. Hits here cause <code>lib/resend.ts:sendEmail</code> to
          bail before dispatch. Legacy bounces from <code>email_suppression_list</code> still block but
          aren&apos;t shown here — manage them via the email-performance page or the bounce-replay cron.
        </p>
      </header>

      <div className="flex items-end gap-3 mb-4">
        <div className="flex-1">
          <label className="block text-xs font-semibold text-slate-600 mb-1">Search (email substring)</label>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            placeholder="user@example.com"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Reason</label>
          <select
            value={reasonFilter}
            onChange={(e) => setReasonFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
          >
            <option value="">All</option>
            {Object.entries(REASON_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <button
          onClick={load}
          className="px-4 py-2 bg-slate-900 text-white font-semibold rounded-lg text-sm hover:bg-slate-800"
        >
          Refresh
        </button>
        <button
          onClick={handleAddManual}
          className="px-4 py-2 bg-rose-600 text-white font-semibold rounded-lg text-sm hover:bg-rose-700"
        >
          + Suppress address
        </button>
      </div>

      {err && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {err}
        </div>
      )}

      <p className="text-xs text-slate-500 mb-2">
        {loading ? "Loading..." : `${rows.length} shown of ${total} total`}
      </p>

      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-600">
            <tr>
              <th className="px-3 py-2 text-left">Email</th>
              <th className="px-3 py-2 text-left">Reason</th>
              <th className="px-3 py-2 text-left">Suppressed at</th>
              <th className="px-3 py-2 text-left">Metadata</th>
              <th className="px-3 py-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-slate-500">
                  {loading ? "Loading..." : "No matching rows."}
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-mono text-xs">{r.contact_email}</td>
                  <td className="px-3 py-2 text-xs">
                    <span className="inline-block px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {REASON_LABELS[r.reason] ?? r.reason}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-600">
                    {new Date(r.suppressed_at).toLocaleString("en-AU")}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-500 font-mono max-w-xs truncate">
                    {r.metadata && Object.keys(r.metadata).length > 0
                      ? JSON.stringify(r.metadata)
                      : "—"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => handleUnsuppress(r.contact_email)}
                      className="text-xs font-semibold text-emerald-700 hover:text-emerald-900"
                    >
                      Unsuppress
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
