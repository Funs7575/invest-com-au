"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import {
  BRIEF_TEMPLATES,
  BRIEF_TEMPLATE_LABELS,
} from "@/lib/briefs/templates";
import type { BriefTemplate } from "@/lib/briefs/types";

interface TeamRow {
  id: number;
  slug: string;
  name: string;
  team_category: string;
  team_type: string;
  description: string | null;
  verification_status: string;
  accepts_briefs: boolean;
  public: boolean;
  accepted_brief_templates: string[];
  disclosure: string | null;
}

interface MemberRow {
  id: number;
  professional_id: number;
  member_role: string;
  public_title: string | null;
  status: string;
}

interface InvitationRow {
  id: number;
  email: string;
  name: string | null;
  status: string;
  expires_at: string;
  invited_role: string;
  token: string;
}

const TEAM_CATEGORIES = [
  { value: "smsf_property", label: "SMSF Property Team" },
  { value: "foreign_investor", label: "Foreign Investor Team" },
  { value: "expat", label: "Expat Investing Team" },
  { value: "commercial_property", label: "Commercial Property Team" },
  { value: "business_acquisition", label: "Business Acquisition Team" },
  { value: "due_diligence", label: "Opportunity Due Diligence Team" },
  { value: "retirement", label: "Retirement Planning Team" },
  { value: "custom", label: "Custom" },
];

const TEAM_TYPES = [
  { value: "same_firm", label: "Same firm" },
  { value: "independent", label: "Independent collaboration" },
  { value: "private_referral", label: "Private referral" },
  { value: "internal_firm", label: "Internal firm team" },
];

export default function TeamsManagerClient() {
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [detail, setDetail] = useState<{
    team: TeamRow;
    members: MemberRow[];
    invitations: InvitationRow[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newTeam, setNewTeam] = useState({
    name: "",
    team_category: "",
    team_type: "",
    description: "",
    disclosure: "",
    accepted_brief_templates: [] as BriefTemplate[],
  });

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");

  const loadTeams = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/expert-teams");
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to load teams");
      setTeams(json.teams ?? []);
      if (json.teams?.length > 0 && selected === null) {
        setSelected(json.teams[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load teams");
    } finally {
      setLoading(false);
    }
  }, [selected]);

  const loadDetail = useCallback(async (id: number) => {
    try {
      const res = await fetch(`/api/expert-teams/${id}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to load team");
      setDetail(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load team");
    }
  }, []);

  useEffect(() => {
    void loadTeams();
  }, [loadTeams]);

  useEffect(() => {
    if (selected) void loadDetail(selected);
  }, [selected, loadDetail]);

  async function submitNewTeam() {
    setError(null);
    try {
      const res = await fetch("/api/expert-teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newTeam.name,
          team_category: newTeam.team_category,
          team_type: newTeam.team_type,
          description: newTeam.description || undefined,
          disclosure: newTeam.disclosure || undefined,
          accepted_brief_templates: newTeam.accepted_brief_templates,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to create team");
      setNewTeam({
        name: "",
        team_category: "",
        team_type: "",
        description: "",
        disclosure: "",
        accepted_brief_templates: [],
      });
      setCreating(false);
      await loadTeams();
      setSelected(json.team.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create team");
    }
  }

  async function sendInvite() {
    if (!selected) return;
    setError(null);
    try {
      const res = await fetch(`/api/expert-teams/${selected}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to send invite");
      setInviteEmail("");
      await loadDetail(selected);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send invite");
    }
  }

  async function submitForVerification() {
    if (!selected) return;
    setError(null);
    try {
      const res = await fetch(`/api/expert-teams/${selected}/submit`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(
          json?.missing
            ? `Missing required fields: ${json.missing.join(", ")}`
            : (json?.error ?? "Failed to submit"),
        );
      }
      await loadDetail(selected);
      await loadTeams();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit");
    }
  }

  if (loading) return <p className="text-sm text-slate-500">Loading teams…</p>;

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Your teams
          </h2>
          <button
            type="button"
            onClick={() => setCreating((v) => !v)}
            className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-900 text-xs font-bold px-3 py-1.5 rounded-lg"
          >
            <Icon name="plus" size={14} /> {creating ? "Cancel" : "Create team"}
          </button>
        </div>

        {creating && (
          <div className="border border-slate-200 rounded-xl p-4 mb-4 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Team name
              </label>
              <input
                value={newTeam.name}
                onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Category
                </label>
                <select
                  value={newTeam.team_category}
                  onChange={(e) =>
                    setNewTeam({ ...newTeam, team_category: e.target.value })
                  }
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="">Select…</option>
                  {TEAM_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Type
                </label>
                <select
                  value={newTeam.team_type}
                  onChange={(e) =>
                    setNewTeam({ ...newTeam, team_type: e.target.value })
                  }
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="">Select…</option>
                  {TEAM_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Public description
              </label>
              <textarea
                rows={3}
                value={newTeam.description}
                onChange={(e) =>
                  setNewTeam({ ...newTeam, description: e.target.value })
                }
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Disclosure
              </label>
              <textarea
                rows={2}
                value={newTeam.disclosure}
                onChange={(e) =>
                  setNewTeam({ ...newTeam, disclosure: e.target.value })
                }
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Accepted brief templates
              </label>
              <div className="flex flex-wrap gap-2">
                {BRIEF_TEMPLATES.map((t) => {
                  const checked = newTeam.accepted_brief_templates.includes(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() =>
                        setNewTeam({
                          ...newTeam,
                          accepted_brief_templates: checked
                            ? newTeam.accepted_brief_templates.filter((x) => x !== t)
                            : [...newTeam.accepted_brief_templates, t],
                        })
                      }
                      className={`text-xs px-2 py-1 rounded-full border ${
                        checked
                          ? "bg-amber-100 border-amber-400 text-amber-900"
                          : "bg-slate-100 border-slate-200 text-slate-700"
                      }`}
                    >
                      {BRIEF_TEMPLATE_LABELS[t]}
                    </button>
                  );
                })}
              </div>
            </div>
            <button
              type="button"
              onClick={submitNewTeam}
              className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3 py-2 rounded-lg"
            >
              Save draft team
            </button>
          </div>
        )}

        {teams.length === 0 ? (
          <p className="text-sm text-slate-500">
            You don&apos;t have any teams yet. Create one above.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {teams.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelected(t.id)}
                className={`text-left p-3 rounded-xl border ${
                  selected === t.id
                    ? "border-amber-500 ring-2 ring-amber-300 bg-amber-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <p className="text-sm font-bold text-slate-900">{t.name}</p>
                <p className="text-xs text-slate-500">
                  {t.team_category.replace(/_/g, " ")} · {t.team_type.replace(/_/g, " ")}
                </p>
                <p className="text-[10px] font-semibold uppercase mt-1 tracking-widest text-slate-500">
                  {t.verification_status}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {detail && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between gap-4 mb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {detail.team.name}
              </h2>
              <p className="text-xs text-slate-500">
                {detail.team.verification_status} ·
                {detail.team.public ? " public" : " not listed"} ·
                {detail.team.accepts_briefs ? " accepting briefs" : " not accepting briefs"}
              </p>
            </div>
            {detail.team.verification_status === "draft" && (
              <button
                type="button"
                onClick={submitForVerification}
                className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3 py-2 rounded-lg"
              >
                Submit for verification <Icon name="arrow-right" size={12} />
              </button>
            )}
            {detail.team.verification_status === "verified" && (
              <Link
                href={`/teams/${detail.team.slug}`}
                className="text-xs text-amber-600 underline"
              >
                View public profile
              </Link>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <section>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                Members ({detail.members.filter((m) => m.status === "active").length})
              </h3>
              <ul className="space-y-1 text-sm text-slate-700">
                {detail.members.map((m) => (
                  <li key={m.id} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                    Pro #{m.professional_id} · {m.member_role}
                    <span
                      className={`text-[10px] font-semibold uppercase tracking-wider ml-2 ${
                        m.status === "active" ? "text-emerald-700" : "text-slate-400"
                      }`}
                    >
                      {m.status}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                Invite a member
              </h3>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="email"
                  placeholder="email@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="flex-1 border border-slate-300 rounded-md px-3 py-2 text-sm"
                />
                <input
                  type="text"
                  placeholder="role"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-28 border border-slate-300 rounded-md px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={sendInvite}
                  className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-900 text-xs font-bold px-3 py-2 rounded-lg"
                >
                  Invite
                </button>
              </div>
              <ul className="text-xs text-slate-600 space-y-1 mt-3">
                {detail.invitations.map((inv) => (
                  <li key={inv.id} className="flex items-center justify-between">
                    <span>
                      {inv.email}
                      <span className="text-slate-400 ml-2">· {inv.status}</span>
                    </span>
                    {inv.status === "pending" && (
                      <code className="text-[10px] bg-slate-100 px-1 py-0.5 rounded">
                        token={inv.token.slice(0, 8)}…
                      </code>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
