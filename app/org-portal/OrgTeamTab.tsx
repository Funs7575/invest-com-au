"use client";

import { useState, useEffect } from "react";
import Icon from "@/components/Icon";
import type { Organisation } from "./types";

interface TeamMember {
  id: number;
  invited_email: string;
  role: string;
  status: string;
  invited_at: string;
}

type Props = {
  org: Organisation | null;
};

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-teal-100 text-teal-700",
  editor: "bg-blue-100 text-blue-700",
  viewer: "bg-slate-100 text-slate-600",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100 text-amber-700",
  revoked: "bg-red-100 text-red-600",
};

const ROLE_DESCRIPTIONS: Record<string, string> = {
  admin: "Full access including billing and team management",
  editor: "Create and edit courses, view students",
  viewer: "Read-only dashboard access",
};

export default function OrgTeamTab({ org: _org }: Props) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  // Invite form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("editor");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/org-auth/team");
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          if (cancelled) return;
          setMembers(data.members ?? []);
        }
      } catch { /* ignore */ }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteError("");
    setInviteSuccess(false);
    try {
      const res = await fetch("/api/org-auth/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      if (res.ok) {
        const data = await res.json();
        setMembers((prev) => [...prev, data.member]);
        setInviteEmail("");
        setInviteSuccess(true);
        setTimeout(() => setInviteSuccess(false), 3000);
      } else {
        const d = await res.json();
        setInviteError(d.error ?? "Failed to send invite.");
      }
    } catch {
      setInviteError("Network error. Please try again.");
    }
    setInviting(false);
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-8 w-48 bg-slate-200 rounded" />
        <div className="h-32 bg-slate-100 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-bold text-slate-900 mb-1">Team</h1>
      <p className="text-sm text-slate-500 mb-6">Invite colleagues to help manage your organisation portal.</p>

      {/* Invite form */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-5">
        <h2 className="text-sm font-bold text-slate-900 mb-3">Invite Team Member</h2>
        <div className="space-y-3">
          <div>
            <label htmlFor="ot-email" className="block text-xs font-semibold text-slate-600 mb-1">Email address</label>
            <input
              id="ot-email"
              type="email" autoCapitalize="off" autoCorrect="off" spellCheck={false}
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="colleague@organisation.com"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              onKeyDown={(e) => e.key === "Enter" && handleInvite()}
            />
          </div>
          <div>
            <label htmlFor="ot-role" className="block text-xs font-semibold text-slate-600 mb-1">Role</label>
            <select
              id="ot-role"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            >
              <option value="admin">Admin</option>
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>
            <p className="text-[0.62rem] text-slate-500 mt-1">{ROLE_DESCRIPTIONS[inviteRole]}</p>
          </div>

          {inviteError && (
            <p role="alert" className="text-xs text-red-600">{inviteError}</p>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={handleInvite}
              disabled={inviting || !inviteEmail.trim()}
              className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 text-white font-semibold rounded-lg text-sm hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Icon name="user-plus" size={16} />
              {inviting ? "Inviting..." : "Invite"}
            </button>
            {inviteSuccess && (
              <span className="text-sm text-emerald-600 font-medium flex items-center gap-1">
                <Icon name="check-circle" size={16} />
                Invite sent!
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Members list */}
      {members.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-6 text-center">
          <Icon name="users" size={28} className="text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-700 font-semibold mb-1">No team members yet</p>
          <p className="text-sm text-slate-500 mb-3">Use the form above to invite your first team member.</p>
          <button
            type="button"
            onClick={() => document.getElementById("ot-email")?.scrollIntoView({ behavior: "smooth", block: "center" })}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 text-white text-sm font-semibold rounded-lg hover:bg-teal-700 transition-colors"
          >
            <Icon name="user-plus" size={13} aria-hidden />
            Invite a team member
          </button>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900">Members ({members.length})</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {members.map((m) => (
              <div key={m.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{m.invited_email}</p>
                  <p className="text-[0.58rem] text-slate-500 mt-0.5">
                    Invited {new Date(m.invited_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[0.56rem] font-bold px-2 py-0.5 rounded-full capitalize ${ROLE_COLORS[m.role] ?? "bg-slate-100 text-slate-600"}`}>
                    {m.role}
                  </span>
                  <span className={`text-[0.56rem] font-bold px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[m.status] ?? "bg-slate-100 text-slate-600"}`}>
                    {m.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
