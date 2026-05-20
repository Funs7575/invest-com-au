"use client";

import { useEffect, useState } from "react";

interface Member {
  id: number;
  role: string;
  status: string;
  brokerAccountId: string;
  joinedAt: string;
}

interface Org {
  id: number;
  name: string;
  slug: string;
  status: string;
  maxSeats: number;
}

interface TeamResponse {
  org: Org | null;
  members: Member[];
  canManage?: boolean;
}

const ROLES = ["owner", "finance", "ops", "technical", "member"] as const;

export default function BrokerTeamPage() {
  const [data, setData] = useState<TeamResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<(typeof ROLES)[number]>("member");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/broker-team", { method: "GET" });
      if (res.ok) setData((await res.json()) as TeamResponse);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/broker-team", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; ok?: boolean };
      if (!res.ok || !body.ok) {
        throw new Error(body.error ?? "Invitation failed.");
      }
      setMsg(`Invitation sent to ${email}.`);
      setEmail("");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Invitation failed.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-slate-500">Loading team…</p>;
  }

  if (!data?.org) {
    return (
      <div className="max-w-xl">
        <h1 className="text-xl font-bold text-slate-900 mb-2">Team</h1>
        <p className="text-sm text-slate-600">
          Your account isn&apos;t part of a partner organisation yet. Contact
          the partnerships team to set up a multi-seat team.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-bold text-slate-900 mb-1">{data.org.name} — Team</h1>
      <p className="text-sm text-slate-500 mb-6">
        {data.members.length} of {data.org.maxSeats} seats used.
      </p>

      <div className="border border-slate-200 rounded-xl overflow-hidden mb-8">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-4 py-2 font-semibold">Member</th>
              <th className="text-left px-4 py-2 font-semibold">Role</th>
              <th className="text-left px-4 py-2 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.members.map((m) => (
              <tr key={m.id} className="border-t border-slate-100">
                <td className="px-4 py-2 font-mono text-xs text-slate-600">
                  {m.brokerAccountId.slice(0, 8)}…
                </td>
                <td className="px-4 py-2 capitalize">{m.role}</td>
                <td className="px-4 py-2 capitalize text-slate-500">{m.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.canManage ? (
        <form onSubmit={invite} className="border border-slate-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-3">Invite a team member</h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@example.com"
              className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as (typeof ROLES)[number])}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm capitalize"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <button
              type="submit"
              disabled={busy}
              className="bg-amber-500 text-slate-900 font-semibold rounded-lg px-4 py-2 text-sm disabled:opacity-50"
            >
              {busy ? "Sending…" : "Send invite"}
            </button>
          </div>
          {msg && <p className="text-xs mt-3 text-slate-600" role="status">{msg}</p>}
        </form>
      ) : (
        <p className="text-xs text-slate-500">
          Only the team owner can invite members.
        </p>
      )}
    </div>
  );
}
