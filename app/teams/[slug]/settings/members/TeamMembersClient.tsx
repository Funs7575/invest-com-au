"use client";

import { useCallback, useEffect, useState } from "react";

interface RosterMember {
  professionalId: number;
  name: string;
  firmName: string | null;
  role: "lead" | "member";
  status: string;
  publicTitle: string | null;
}

interface InvitableAdvisor {
  professionalId: number;
  name: string;
  firmName: string | null;
  type: string;
  specialties: string[];
  locationDisplay: string | null;
  verified: boolean;
}

export default function TeamMembersClient({
  teamId,
  isAdmin,
}: {
  teamId: number;
  slug: string;
  isAdmin: boolean;
}) {
  const [roster, setRoster] = useState<RosterMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<InvitableAdvisor[]>([]);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const loadRoster = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/team/members?teamId=${teamId}`);
    if (res.ok) {
      const body = (await res.json()) as { roster: RosterMember[] };
      setRoster(body.roster.filter((m) => m.status !== "removed"));
    }
    setLoading(false);
  }, [teamId]);

  useEffect(() => {
    void loadRoster();
  }, [loadRoster]);

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearching(true);
    setMsg(null);
    try {
      const res = await fetch(
        `/api/team/search-advisors?teamId=${teamId}&q=${encodeURIComponent(query)}`,
      );
      if (res.ok) {
        const body = (await res.json()) as { results: InvitableAdvisor[] };
        setResults(body.results);
      }
    } finally {
      setSearching(false);
    }
  };

  const invite = async (professionalId: number) => {
    setBusy(professionalId);
    setMsg(null);
    try {
      const res = await fetch("/api/team/invite-advisor", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ teamId, professionalId, role: "member" }),
      });
      const body = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !body.ok) throw new Error(body.error ?? "Invite failed.");
      setMsg("Invitation sent.");
      setResults((r) => r.filter((a) => a.professionalId !== professionalId));
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Invite failed.");
    } finally {
      setBusy(null);
    }
  };

  const manage = async (professionalId: number, action: "set_role" | "remove", role?: "lead" | "member") => {
    setBusy(professionalId);
    setMsg(null);
    try {
      const res = await fetch("/api/team/members", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ teamId, action, professionalId, role }),
      });
      const body = (await res.json().catch(() => ({}))) as { ok?: boolean };
      if (!res.ok || !body.ok) throw new Error("Action failed (owner can't be changed/removed).");
      await loadRoster();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-sm font-semibold text-slate-900 mb-3">Roster ({roster.length})</h2>
        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : (
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left px-4 py-2 font-semibold">Advisor</th>
                  <th className="text-left px-4 py-2 font-semibold">Role</th>
                  {isAdmin && <th className="text-right px-4 py-2 font-semibold">Manage</th>}
                </tr>
              </thead>
              <tbody>
                {roster.map((m) => (
                  <tr key={m.professionalId} className="border-t border-slate-100">
                    <td className="px-4 py-2">
                      <span className="font-medium text-slate-800">{m.name}</span>
                      {m.firmName && <span className="block text-xs text-slate-400">{m.firmName}</span>}
                    </td>
                    <td className="px-4 py-2 capitalize">
                      {m.role}
                      {m.status === "pending" && <span className="ml-1 text-xs text-amber-600">(pending)</span>}
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-2 text-right space-x-2 whitespace-nowrap">
                        <button
                          onClick={() => manage(m.professionalId, "set_role", m.role === "lead" ? "member" : "lead")}
                          disabled={busy === m.professionalId}
                          className="text-xs font-semibold text-sky-700 hover:underline disabled:opacity-50"
                        >
                          {m.role === "lead" ? "Make member" : "Make lead"}
                        </button>
                        <button
                          onClick={() => manage(m.professionalId, "remove")}
                          disabled={busy === m.professionalId}
                          className="text-xs font-semibold text-red-700 hover:underline disabled:opacity-50"
                        >
                          Remove
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {isAdmin && (
        <section>
          <h2 className="text-sm font-semibold text-slate-900 mb-3">Invite an advisor</h2>
          <form onSubmit={search} className="flex gap-2 mb-4">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search advisors by name…"
              className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={searching}
              className="bg-slate-900 text-white font-semibold rounded-lg px-4 py-2 text-sm disabled:opacity-50"
            >
              {searching ? "Searching…" : "Search"}
            </button>
          </form>
          <ul className="space-y-2">
            {results.map((a) => (
              <li
                key={a.professionalId}
                className="flex items-center justify-between border border-slate-200 rounded-lg px-4 py-2"
              >
                <span>
                  <span className="text-sm font-medium text-slate-800">{a.name}</span>
                  {a.verified && <span className="ml-1 text-xs text-emerald-600">✓</span>}
                  <span className="block text-xs text-slate-400">
                    {a.type.replace(/_/g, " ")}
                    {a.locationDisplay ? ` · ${a.locationDisplay}` : ""}
                  </span>
                </span>
                <button
                  onClick={() => invite(a.professionalId)}
                  disabled={busy === a.professionalId}
                  className="text-xs font-semibold text-emerald-700 hover:underline disabled:opacity-50"
                >
                  {busy === a.professionalId ? "Inviting…" : "Invite"}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {msg && <p className="text-sm text-slate-600" role="status">{msg}</p>}
    </div>
  );
}
