"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import AdminShell from "@/components/AdminShell";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useToast } from "@/components/Toast";
import type { TeamMember } from "@/lib/types";

interface CalendarItem {
  id: number;
  title: string;
  target_keyword: string | null;
  secondary_keywords: string[];
  article_type: string;
  category: string | null;
  status: string;
  assigned_author_id: number | null;
  assigned_reviewer_id: number | null;
  target_publish_date: string | null;
  actual_publish_date: string | null;
  article_id: number | null;
  brief: string | null;
  related_brokers: string[];
  related_tools: string[];
  internal_links: string[];
  ai_draft_generated_at: string | null;
  ai_model: string | null;
  notes: string | null;
  priority: string;
  created_at: string;
  updated_at: string;
  author?: { id: number; full_name: string; slug: string } | null;
  reviewer?: { id: number; full_name: string; slug: string } | null;
}

const STATUSES = [
  { value: "planned", label: "Planned", color: "bg-slate-100 text-slate-600" },
  { value: "drafting", label: "Drafting", color: "bg-blue-50 text-blue-600" },
  { value: "draft_ready", label: "Draft Ready", color: "bg-indigo-50 text-indigo-600" },
  { value: "in_review", label: "In Review", color: "bg-amber-50 text-amber-600" },
  { value: "scheduled", label: "Scheduled", color: "bg-purple-50 text-purple-600" },
  { value: "published", label: "Published", color: "bg-green-50 text-green-600" },
  { value: "cancelled", label: "Cancelled", color: "bg-red-50 text-red-400" },
];

const ARTICLE_TYPES = ["article", "guide", "comparison", "how-to", "news", "update"];
const PRIORITIES = ["low", "normal", "high", "urgent"];

function statusBadge(status: string) {
  const s = STATUSES.find((st) => st.value === status) || STATUSES[0];
  return (
    <span className={`text-xs px-2 py-1 rounded-full font-medium ${s.color}`}>
      {s.label}
    </span>
  );
}

function priorityBadge(priority: string) {
  const colors: Record<string, string> = {
    low: "text-slate-400",
    normal: "text-slate-600",
    high: "text-amber-600 font-semibold",
    urgent: "text-red-600 font-bold",
  };
  return <span className={`text-xs ${colors[priority] || colors.normal}`}>{priority}</span>;
}

export default function ContentCalendarPage() {
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editing, setEditing] = useState<CalendarItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CalendarItem | null>(null);
  const [generating, setGenerating] = useState<number | null>(null);
  const [staleArticles, setStaleArticles] = useState<{ id: number; title: string; slug: string; staleness_score: number }[]>([]);

  const supabase = createClient();
  const { toast } = useToast();

  const load = async () => {
    const { data } = await supabase
      .from("content_calendar")
      .select("*, author:team_members!assigned_author_id(id, full_name, slug), reviewer:team_members!assigned_reviewer_id(id, full_name, slug)")
      .order("target_publish_date", { ascending: true, nullsFirst: false });
    if (data) setItems(data);
    setLoading(false);
  };

  const loadTeamMembers = async () => {
    const { data } = await supabase
      .from("team_members")
      .select("*")
      .eq("status", "active")
      .order("full_name");
    if (data) setTeamMembers(data);
  };

  const loadStaleArticles = async () => {
    const { data } = await supabase
      .from("articles")
      .select("id, title, slug, staleness_score")
      .eq("needs_update", true)
      .order("staleness_score", { ascending: false })
      .limit(20);
    if (data) setStaleArticles(data);
  };

  useEffect(() => {
    load();
    loadTeamMembers();
    loadStaleArticles();
  }, []);

  const handleSave = async (formData: FormData) => {
    const title = formData.get("title") as string;
    if (!title?.trim()) {
      toast("Title is required", "error");
      return;
    }

    setSaving(true);

    const record: Record<string, unknown> = {
      title,
      target_keyword: formData.get("target_keyword") || null,
      secondary_keywords: formData.get("secondary_keywords")
        ? (formData.get("secondary_keywords") as string).split(",").map((s) => s.trim()).filter(Boolean)
        : [],
      article_type: formData.get("article_type") || "article",
      category: formData.get("category") || null,
      assigned_author_id: formData.get("assigned_author_id") ? Number(formData.get("assigned_author_id")) : null,
      assigned_reviewer_id: formData.get("assigned_reviewer_id") ? Number(formData.get("assigned_reviewer_id")) : null,
      target_publish_date: formData.get("target_publish_date") || null,
      brief: formData.get("brief") || null,
      related_brokers: formData.get("related_brokers")
        ? (formData.get("related_brokers") as string).split(",").map((s) => s.trim()).filter(Boolean)
        : [],
      related_tools: formData.get("related_tools")
        ? (formData.get("related_tools") as string).split(",").map((s) => s.trim()).filter(Boolean)
        : [],
      notes: formData.get("notes") || null,
      priority: formData.get("priority") || "normal",
    };

    if (editing) {
      record.status = formData.get("status") || editing.status;
    }

    try {
      if (editing) {
        const { error } = await supabase
          .from("content_calendar")
          .update(record)
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        record.status = "planned";
        const { error } = await supabase.from("content_calendar").insert(record);
        if (error) throw error;
      }
      toast(editing ? "Item updated" : "Item created", "success");
    } catch {
      toast("Failed to save", "error");
    }

    setSaving(false);
    setEditing(null);
    setCreating(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const { error } = await supabase.from("content_calendar").delete().eq("id", deleteTarget.id);
      if (error) throw error;
      toast("Item deleted", "success");
    } catch {
      toast("Failed to delete", "error");
    }
    setDeleteTarget(null);
    load();
  };

  const handleGenerateDraft = async (item: CalendarItem) => {
    if (item.status !== "planned") {
      toast("Draft can only be generated for planned items", "error");
      return;
    }
    setGenerating(item.id);
    try {
      const res = await fetch("/api/admin/content/generate-draft", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${prompt("Enter CRON_SECRET to authorize:")}`,
        },
        body: JSON.stringify({ calendarId: item.id }),
      });
      const data = await res.json();
      if (res.ok) {
        toast(`Draft created: ${data.title}`, "success");
        load();
      } else {
        toast(data.error || "Draft generation failed", "error");
      }
    } catch {
      toast("Network error generating draft", "error");
    }
    setGenerating(null);
  };

  const handleStatusChange = async (item: CalendarItem, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("content_calendar")
        .update({ status: newStatus })
        .eq("id", item.id);
      if (error) throw error;
      toast(`Status changed to ${newStatus}`, "success");
      load();
    } catch {
      toast("Failed to update status", "error");
    }
  };

  const showForm = editing || creating;
  const formItem = editing || ({} as Partial<CalendarItem>);

  const filteredItems = statusFilter === "all"
    ? items
    : items.filter((i) => i.status === statusFilter);

  const statusCounts = STATUSES.reduce(
    (acc, s) => {
      acc[s.value] = items.filter((i) => i.status === s.value).length;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <AdminShell>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Content Calendar</h1>
          <p className="text-sm text-slate-500 mt-1">Plan and schedule your content pipeline. Link items to articles for auto-publishing.</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setCreating(true)}
            className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold rounded-lg px-4 py-2 text-sm transition-colors"
          >
            + New Content
          </button>
        )}
      </div>

      {/* Pipeline overview */}
      {!showForm && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 mb-6">
          {STATUSES.map((s) => (
            <button
              key={s.value}
              onClick={() => setStatusFilter(statusFilter === s.value ? "all" : s.value)}
              className={`rounded-lg border p-3 text-center transition-colors ${
                statusFilter === s.value
                  ? "border-amber-500 bg-amber-50"
                  : "border-slate-200 bg-white hover:bg-slate-50"
              }`}
            >
              <div className="text-2xl font-bold text-slate-900">{statusCounts[s.value] || 0}</div>
              <div className="text-xs text-slate-500">{s.label}</div>
            </button>
          ))}
        </div>
      )}

      {showForm ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave(new FormData(e.currentTarget));
          }}
          className="bg-white border border-slate-200 rounded-lg p-6 space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Title <span className="text-red-600">*</span>
              </label>
              <input
                name="title"
                defaultValue={formItem.title}
                required
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Article Type</label>
              <select
                name="article_type"
                defaultValue={formItem.article_type || "article"}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              >
                {ARTICLE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1).replace("-", " ")}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Target Keyword</label>
              <input
                name="target_keyword"
                defaultValue={formItem.target_keyword || ""}
                placeholder="best online broker australia"
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Secondary Keywords (comma-separated)</label>
              <input
                name="secondary_keywords"
                defaultValue={(formItem.secondary_keywords || []).join(", ")}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Category</label>
              <input
                name="category"
                defaultValue={formItem.category || ""}
                placeholder="brokers, investing, guides"
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Brief / Instructions for AI</label>
            <textarea
              name="brief"
              defaultValue={formItem.brief || ""}
              rows={3}
              placeholder="Describe the angle, tone, key points to cover, and any specific data to include..."
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Author</label>
              <select
                name="assigned_author_id"
                defaultValue={formItem.assigned_author_id?.toString() || ""}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              >
                <option value="">Unassigned</option>
                {teamMembers
                  .filter((m) => m.role !== "expert_reviewer")
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name} ({m.role.replace("_", " ")})
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Reviewer</label>
              <select
                name="assigned_reviewer_id"
                defaultValue={formItem.assigned_reviewer_id?.toString() || ""}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              >
                <option value="">Unassigned</option>
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name} ({m.role.replace("_", " ")})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Target Publish Date</label>
              <input
                name="target_publish_date"
                type="date"
                defaultValue={formItem.target_publish_date || ""}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Related Brokers (slugs, comma-separated)</label>
              <input
                name="related_brokers"
                defaultValue={(formItem.related_brokers || []).join(", ")}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Related Tools (slugs, comma-separated)</label>
              <input
                name="related_tools"
                defaultValue={(formItem.related_tools || []).join(", ")}
                placeholder="fee-impact, compare, quiz"
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Priority</label>
              <select
                name="priority"
                defaultValue={formItem.priority || "normal"}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {editing && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
                <select
                  name="status"
                  defaultValue={formItem.status}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                >
                  {STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Notes</label>
                <input
                  name="notes"
                  defaultValue={formItem.notes || ""}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                />
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold rounded-lg px-6 py-2.5 text-sm transition-colors disabled:opacity-50"
            >
              {saving ? "Saving..." : editing ? "Update Item" : "Create Item"}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setCreating(false);
              }}
              className="text-slate-500 hover:text-slate-900 px-4 py-2.5 text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          {/* Status filter tabs */}
          <div className="flex flex-wrap gap-1 mb-4">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                statusFilter === "all"
                  ? "bg-green-700 text-white"
                  : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"
              }`}
            >
              All ({items.length})
            </button>
            {STATUSES.map((s) => (
              <button
                key={s.value}
                onClick={() => setStatusFilter(s.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  statusFilter === s.value
                    ? "bg-green-700 text-white"
                    : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"
                }`}
              >
                {s.label} ({statusCounts[s.value] || 0})
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-slate-400 text-sm">Loading...</div>
            ) : filteredItems.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                No content items{statusFilter !== "all" ? ` with status "${statusFilter}"` : ""}. Click &quot;+ New Content&quot; to start.
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Content</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Author</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase hidden lg:table-cell">Publish Date</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-semibold text-slate-900">{item.title}</div>
                          {priorityBadge(item.priority)}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {item.article_type} {item.target_keyword ? `\u00B7 "${item.target_keyword}"` : ""}{" "}
                          {item.category ? `\u00B7 ${item.category}` : ""}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {statusBadge(item.status)}
                        {item.ai_draft_generated_at && (
                          <div className="text-[10px] text-slate-400 mt-1">AI draft {new Date(item.ai_draft_generated_at).toLocaleDateString()}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="text-sm text-slate-600">{item.author?.full_name || "Unassigned"}</div>
                        {item.reviewer && (
                          <div className="text-xs text-slate-400">Reviewer: {item.reviewer.full_name}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <div className="text-sm text-slate-600">
                          {item.target_publish_date
                            ? new Date(item.target_publish_date).toLocaleDateString("en-AU", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })
                            : "\u2014"}
                        </div>
                        {item.actual_publish_date && (
                          <div className="text-xs text-green-600">
                            Published {new Date(item.actual_publish_date).toLocaleDateString("en-AU", {
                              day: "numeric",
                              month: "short",
                            })}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1 flex-wrap">
                          {item.status === "planned" && (
                            <button
                              onClick={() => handleGenerateDraft(item)}
                              disabled={generating === item.id}
                              className="text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 px-2 py-1 rounded transition-colors disabled:opacity-50"
                            >
                              {generating === item.id ? "Generating..." : "AI Draft"}
                            </button>
                          )}
                          {item.status === "draft_ready" && (
                            <button
                              onClick={() => handleStatusChange(item, "in_review")}
                              className="text-xs bg-amber-50 text-amber-600 hover:bg-amber-100 px-2 py-1 rounded transition-colors"
                            >
                              Send to Review
                            </button>
                          )}
                          {item.status === "in_review" && (
                            <button
                              onClick={() => handleStatusChange(item, "scheduled")}
                              className="text-xs bg-purple-50 text-purple-600 hover:bg-purple-100 px-2 py-1 rounded transition-colors"
                            >
                              Schedule
                            </button>
                          )}
                          {item.article_id && (
                            <a
                              href={`/admin/articles`}
                              className="text-xs text-green-600 hover:text-green-700 px-2 py-1"
                            >
                              Article
                            </a>
                          )}
                          <button
                            onClick={() => setEditing(item)}
                            className="text-xs text-amber-600 hover:text-amber-700 px-2 py-1"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setDeleteTarget(item)}
                            className="text-xs text-red-600 hover:text-red-300 px-2 py-1"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Stale Articles Section */}
          {staleArticles.length > 0 && (
            <div className="mt-8">
              <h2 className="text-lg font-bold text-slate-900 mb-3">Articles Needing Update</h2>
              <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Article</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Staleness Score</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {staleArticles.map((article) => (
                      <tr key={article.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div className="text-sm font-semibold text-slate-900">{article.title}</div>
                          <div className="text-xs text-slate-500">{article.slug}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-slate-100 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  article.staleness_score >= 50
                                    ? "bg-red-500"
                                    : article.staleness_score >= 30
                                    ? "bg-amber-500"
                                    : "bg-green-500"
                                }`}
                                style={{ width: `${Math.min(100, article.staleness_score)}%` }}
                              />
                            </div>
                            <span className="text-xs text-slate-600 font-medium">{article.staleness_score}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <a
                            href={`/article/${article.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-green-600 hover:text-green-700"
                          >
                            Preview
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Calendar Item"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </AdminShell>
  );
}
