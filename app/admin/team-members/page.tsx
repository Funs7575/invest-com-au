"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import AdminShell from "@/components/AdminShell";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useToast } from "@/components/Toast";
import { downloadCSV } from "@/lib/csv-export";
import type { TeamMember } from "@/lib/types";

const ROLES = [
  { value: "contributor", label: "Contributor" },
  { value: "staff_writer", label: "Staff Writer" },
  { value: "editor", label: "Editor" },
  { value: "expert_reviewer", label: "Expert Reviewer" },
];

const ROLE_COLORS: Record<string, string> = {
  contributor: "bg-slate-100 text-slate-600",
  staff_writer: "bg-blue-50 text-blue-600",
  editor: "bg-amber-50 text-amber-600",
  expert_reviewer: "bg-emerald-50 text-emerald-700",
};

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function TeamMembersPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<TeamMember | null>(null);
  const [autoSlug, setAutoSlug] = useState(true);

  const supabase = createClient();
  const { toast } = useToast();

  const load = async () => {
    const { data, error } = await supabase
      .from("team_members")
      .select("*")
      .order("full_name");
    if (error) {
      toast("Error loading team members", "error");
    } else {
      setMembers(data || []);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSave = async (formData: FormData) => {
    const full_name = (formData.get("full_name") as string)?.trim();
    const slug = (formData.get("slug") as string)?.trim();

    if (!full_name) {
      toast("Full name is required", "error");
      return;
    }
    if (!slug) {
      toast("Slug is required", "error");
      return;
    }

    // Duplicate slug check
    const existing = members.find(
      (m) => m.slug === slug && m.id !== editing?.id
    );
    if (existing) {
      toast(`Slug "${slug}" is already used by "${existing.full_name}"`, "error");
      return;
    }

    setSaving(true);

    const credentialsRaw = (formData.get("credentials") as string) || "";
    const credentials = credentialsRaw
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    const publicationsRaw = (formData.get("publications") as string) || "";
    let publications: { name: string; url: string }[] = [];
    try {
      if (publicationsRaw.trim()) {
        publications = JSON.parse(publicationsRaw);
      }
    } catch {
      // Try line-by-line: "Name | URL"
      publications = publicationsRaw
        .split("\n")
        .map((line) => {
          const [name, url] = line.split("|").map((s) => s.trim());
          return name && url ? { name, url } : null;
        })
        .filter(Boolean) as { name: string; url: string }[];
    }

    const record: Record<string, unknown> = {
      full_name,
      slug,
      role: formData.get("role") || "contributor",
      short_bio: formData.get("short_bio") || null,
      credentials: credentials.length ? credentials : [],
      disclosure: formData.get("disclosure") || null,
      linkedin_url: formData.get("linkedin_url") || null,
      twitter_url: formData.get("twitter_url") || null,
      publications: publications.length ? publications : [],
      avatar_url: formData.get("avatar_url") || null,
      status: formData.get("status") || "active",
      updated_at: new Date().toISOString(),
    };

    try {
      if (editing) {
        const { error } = await supabase
          .from("team_members")
          .update(record)
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("team_members").insert(record);
        if (error) throw error;
      }
      toast("Team member saved", "success");
    } catch {
      toast("Failed to save team member", "error");
    }

    setSaving(false);
    setEditing(null);
    setCreating(false);
    setAutoSlug(true);
    load();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const { error } = await supabase
        .from("team_members")
        .delete()
        .eq("id", deleteTarget.id);
      if (error) throw error;
      toast("Team member deleted", "success");
    } catch {
      toast("Failed to delete team member", "error");
    }
    setDeleteTarget(null);
    load();
  };

  const showForm = editing || creating;
  const formMember = editing || ({} as Partial<TeamMember>);

  const filteredMembers = members.filter(
    (m) =>
      m.full_name.toLowerCase().includes(search.toLowerCase()) ||
      m.slug.toLowerCase().includes(search.toLowerCase()) ||
      m.role.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = members.filter((m) => m.status === "active").length;

  return (
    <AdminShell>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Team Members</h1>
          <p className="text-sm text-slate-500 mt-1">
            Editorial team shown on articles and the about page. Link team members as article authors. {activeCount} active, {members.length - activeCount} inactive.
          </p>
        </div>
        {!showForm && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const rows = filteredMembers.map((m) => [
                  m.full_name,
                  m.slug,
                  m.role,
                  m.status,
                  m.linkedin_url || "",
                  m.twitter_url || "",
                ]);
                downloadCSV("team-members.csv", ["Name", "Slug", "Role", "Status", "LinkedIn", "Twitter"], rows);
              }}
              className="px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-lg hover:bg-emerald-100 border border-emerald-200 transition-colors"
            >
              Export CSV ↓
            </button>
            <button
              onClick={() => {
                setCreating(true);
                setAutoSlug(true);
              }}
              className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold rounded-lg px-4 py-2 text-sm transition-colors"
            >
              + Add Member
            </button>
          </div>
        )}
      </div>

      {showForm ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave(new FormData(e.currentTarget));
          }}
          className="bg-white border border-slate-200 rounded-lg p-6 space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Full Name <span className="text-red-600">*</span>
              </label>
              <input
                name="full_name"
                defaultValue={formMember.full_name}
                required
                onChange={(e) => {
                  if (autoSlug && !editing) {
                    const slugInput = e.currentTarget.form?.querySelector(
                      'input[name="slug"]'
                    ) as HTMLInputElement;
                    if (slugInput) slugInput.value = slugify(e.target.value);
                  }
                }}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Slug <span className="text-red-600">*</span>
              </label>
              <input
                name="slug"
                defaultValue={formMember.slug}
                required
                onChange={() => setAutoSlug(false)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Role
              </label>
              <select
                name="role"
                defaultValue={formMember.role || "contributor"}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Short Bio
            </label>
            <textarea
              name="short_bio"
              defaultValue={formMember.short_bio}
              rows={3}
              placeholder="2-4 sentences about experience and expertise..."
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Credentials <span className="text-slate-400 font-normal">(one per line)</span>
            </label>
            <textarea
              name="credentials"
              defaultValue={formMember.credentials?.join("\n")}
              rows={3}
              placeholder={"AFSL holder\nCFA Charterholder\n10+ years in financial markets"}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Disclosure Statement
            </label>
            <textarea
              name="disclosure"
              defaultValue={formMember.disclosure}
              rows={2}
              placeholder="e.g. Holds shares in ASX-listed ETFs. Does not hold positions in any broker reviewed."
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                LinkedIn URL
              </label>
              <input
                name="linkedin_url"
                defaultValue={formMember.linkedin_url}
                placeholder="https://linkedin.com/in/..."
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Twitter URL
              </label>
              <input
                name="twitter_url"
                defaultValue={formMember.twitter_url}
                placeholder="https://x.com/..."
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Avatar URL
            </label>
            <input
              name="avatar_url"
              defaultValue={formMember.avatar_url}
              placeholder="https://..."
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
            />
            <p className="text-xs text-slate-400 mt-0.5">Headshot image URL — shown on articles and the about page</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Publications{" "}
              <span className="text-slate-400 font-normal">
                (JSON array or &quot;Name | URL&quot; per line)
              </span>
            </label>
            <textarea
              name="publications"
              defaultValue={
                formMember.publications?.length
                  ? JSON.stringify(formMember.publications, null, 2)
                  : ""
              }
              rows={3}
              placeholder={'[{"name": "AFR", "url": "https://afr.com/author/..."}]'}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/30"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Status
            </label>
            <select
              name="status"
              defaultValue={formMember.status || "active"}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30 max-w-xs"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold rounded-lg px-6 py-2.5 text-sm transition-colors disabled:opacity-50"
            >
              {saving
                ? "Saving..."
                : editing
                ? "Update Member"
                : "Create Member"}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setCreating(false);
                setAutoSlug(true);
              }}
              className="text-slate-500 hover:text-slate-900 px-4 py-2.5 text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          {/* Search */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search by name, slug, or role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full max-w-md bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
            />
          </div>

          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                    Member
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                    Role
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase hidden lg:table-cell">
                    Links
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {member.avatar_url ? (
                          <img
                            src={member.avatar_url}
                            alt={member.full_name}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold">
                            {member.full_name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-semibold text-slate-900">
                            {member.full_name}
                          </div>
                          <div className="text-xs text-slate-500">
                            {member.slug}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-1 rounded-full font-medium ${
                          ROLE_COLORS[member.role] || "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {ROLES.find((r) => r.value === member.role)?.label ||
                          member.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span
                        className={`text-xs px-2 py-1 rounded-full font-medium ${
                          member.status === "active"
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {member.status === "active" ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="flex items-center gap-2">
                        {member.linkedin_url && (
                          <a
                            href={member.linkedin_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline"
                          >
                            LinkedIn
                          </a>
                        )}
                        {member.twitter_url && (
                          <a
                            href={member.twitter_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-slate-600 hover:underline"
                          >
                            Twitter
                          </a>
                        )}
                        {!member.linkedin_url && !member.twitter_url && (
                          <span className="text-xs text-slate-400">&mdash;</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <a
                        href={`/authors/${member.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-emerald-600 hover:text-emerald-700"
                      >
                        Preview
                      </a>
                      <button
                        onClick={() => {
                          setEditing(member);
                          setAutoSlug(false);
                        }}
                        className="text-xs text-amber-600 hover:text-amber-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteTarget(member)}
                        className="text-xs text-red-600 hover:text-red-300"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredMembers.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-sm text-slate-500"
                    >
                      {search
                        ? "No team members match your search."
                        : "No team members yet. Add your first member above."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Team Member"
        message={`Are you sure you want to delete "${deleteTarget?.full_name}"? Articles and reviews linked to this member will lose their author/reviewer association.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </AdminShell>
  );
}
