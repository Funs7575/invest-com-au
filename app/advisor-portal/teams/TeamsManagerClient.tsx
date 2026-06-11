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
  team_story?: string | null;
  specialty_tags?: string[];
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

  // Public-presentation editor (description / story / specialty tags).
  const [presentation, setPresentation] = useState({
    description: "",
    team_story: "",
    specialty_tags: [] as string[],
  });
  const [tagDraft, setTagDraft] = useState("");
  const [presentationState, setPresentationState] = useState<"idle" | "saving" | "saved" | "story_pending">("idle");

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
      const team = json.team as TeamRow;
      setPresentation({
        description: team.description ?? "",
        team_story: team.team_story ?? "",
        specialty_tags: team.specialty_tags ?? [],
      });
      setPresentationState("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load team");
    }
  }, []);

  async function savePresentation() {
    if (!selected) return;
    setError(null);
    setPresentationState("saving");
    try {
      const res = await fetch(`/api/expert-teams/${selected}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: presentation.description || null,
          team_story: presentation.team_story || null,
          specialty_tags: presentation.specialty_tags,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to save");
      setPresentationState(json.team_story_pending ? "story_pending" : "saved");
    } catch (err) {
      setPresentationState("idle");
      setError(err instanceof Error ? err.message : "Failed to save");
    }
  }

  function addTag() {
    const tag = tagDraft.trim().toLowerCase().replace(/\s+/g, "_").slice(0, 60);
    if (!tag) return;
    setPresentation((p) =>
      p.specialty_tags.includes(tag) || p.specialty_tags.length >= 12
        ? p
        : { ...p, specialty_tags: [...p.specialty_tags, tag] },
    );
    setTagDraft("");
  }

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
        <div role="alert" className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
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
              <label htmlFor="tm-name" className="block text-xs font-semibold text-slate-700 mb-1">
                Team name
              </label>
              <input
                id="tm-name"
                value={newTeam.name}
                onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="tm-category" className="block text-xs font-semibold text-slate-700 mb-1">
                  Category
                </label>
                <select
                  id="tm-category"
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
                <label htmlFor="tm-type" className="block text-xs font-semibold text-slate-700 mb-1">
                  Type
                </label>
                <select
                  id="tm-type"
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
              <label htmlFor="tm-description" className="block text-xs font-semibold text-slate-700 mb-1">
                Public description
              </label>
              <textarea
                id="tm-description"
                rows={3}
                value={newTeam.description}
                onChange={(e) =>
                  setNewTeam({ ...newTeam, description: e.target.value })
                }
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="tm-disclosure" className="block text-xs font-semibold text-slate-700 mb-1">
                Disclosure
              </label>
              <textarea
                id="tm-disclosure"
                rows={2}
                value={newTeam.disclosure}
                onChange={(e) =>
                  setNewTeam({ ...newTeam, disclosure: e.target.value })
                }
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <p className="block text-xs font-semibold text-slate-700 mb-1">
                Accepted brief templates
              </p>
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

          {/* Public presentation — what visitors see on /teams/[slug] */}
          <section className="border border-slate-200 rounded-xl p-4 mb-6">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1">
              Public presentation
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              Shown on your public team page. Factual descriptions only — no
              performance promises or forward-looking claims.
            </p>
            <div className="space-y-3">
              <div>
                <label htmlFor="tm-edit-description" className="block text-xs font-semibold text-slate-700 mb-1">
                  Short description
                </label>
                <textarea
                  id="tm-edit-description"
                  rows={2}
                  maxLength={600}
                  value={presentation.description}
                  onChange={(e) => setPresentation({ ...presentation, description: e.target.value })}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="tm-edit-story" className="block text-xs font-semibold text-slate-700 mb-1">
                  Our story <span className="font-normal text-slate-400">(long-form, optional)</span>
                </label>
                <textarea
                  id="tm-edit-story"
                  rows={5}
                  maxLength={5000}
                  value={presentation.team_story}
                  onChange={(e) => setPresentation({ ...presentation, team_story: e.target.value })}
                  placeholder="How the team came together, how you work, who you help…"
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                />
                <p className="text-[10px] text-slate-500 mt-0.5 text-right">
                  {presentation.team_story.length}/5000
                </p>
              </div>
              <div>
                <label htmlFor="tm-edit-tag" className="block text-xs font-semibold text-slate-700 mb-1">
                  Specialty tags <span className="font-normal text-slate-500">(max 12)</span>
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {presentation.specialty_tags.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold bg-violet-50 text-violet-700 border border-violet-200 rounded-full px-2 py-0.5"
                    >
                      {t.replace(/_/g, " ")}
                      <button
                        type="button"
                        aria-label={`Remove ${t.replace(/_/g, " ")} tag`}
                        onClick={() =>
                          setPresentation((p) => ({
                            ...p,
                            specialty_tags: p.specialty_tags.filter((x) => x !== t),
                          }))
                        }
                        className="text-violet-400 hover:text-violet-700"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="tm-edit-tag"
                    type="text"
                    placeholder="e.g. SMSF lending"
                    value={tagDraft}
                    onChange={(e) => setTagDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                    className="flex-1 border border-slate-300 rounded-md px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={addTag}
                    className="text-xs font-bold border border-slate-300 hover:border-slate-400 text-slate-700 px-3 py-2 rounded-lg"
                  >
                    Add tag
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={savePresentation}
                  disabled={presentationState === "saving"}
                  className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-xs font-bold px-3 py-2 rounded-lg"
                >
                  {presentationState === "saving" ? "Saving…" : "Save presentation"}
                </button>
                {presentationState === "saved" && (
                  <span className="text-xs font-semibold text-emerald-700">Saved ✓</span>
                )}
                {presentationState === "story_pending" && (
                  <span className="text-xs text-amber-700">
                    Saved — story publishing is rolling out and will apply shortly; your other changes are live.
                  </span>
                )}
              </div>
            </div>
          </section>

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
                  type="email" autoCapitalize="off" autoCorrect="off" spellCheck={false}
                  autoComplete="email"
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
                      <span className="text-slate-500 ml-2">· {inv.status}</span>
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
