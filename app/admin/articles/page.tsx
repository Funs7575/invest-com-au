"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import AdminShell from "@/components/AdminShell";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useToast } from "@/components/Toast";
import type { Article, TeamMember } from "@/lib/types";

const PAGE_SIZE = 15;

export default function AdminArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [editing, setEditing] = useState<Article | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<Article | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft">("all");
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  const supabase = createClient();
  const { toast } = useToast();

  const load = async () => {
    const { data } = await supabase.from("articles").select("*").order("created_at", { ascending: false });
    if (data) setArticles(data);
  };

  const loadTeamMembers = async () => {
    const { data } = await supabase.from("team_members").select("*").eq("status", "active").order("full_name");
    if (data) setTeamMembers(data);
  };

  useEffect(() => { load(); loadTeamMembers(); }, []);

  const handleSave = async (formData: FormData) => {
    const title = formData.get("title") as string;
    const slug = formData.get("slug") as string;

    if (!title || !title.trim()) {
      toast("Title is required", "error");
      return;
    }
    if (!slug || !slug.trim()) {
      toast("Slug is required", "error");
      return;
    }

    // Duplicate slug check
    if (!editing || editing.slug !== slug) {
      const existing = articles.find(a => a.slug === slug && a.id !== editing?.id);
      if (existing) {
        toast(`Slug "${slug}" is already used by "${existing.title}"`, "error");
        return;
      }
    }

    setSaving(true);

    let sections: { heading: string; body: string }[] = [];
    try {
      const raw = formData.get("sections") as string;
      if (raw) sections = JSON.parse(raw);
    } catch { /* ignore */ }

    const record: Record<string, unknown> = {
      title,
      slug,
      excerpt: formData.get("excerpt") || null,
      category: formData.get("category") || null,
      content: formData.get("content") || null,
      sections: sections.length ? sections : null,
      tags: formData.get("tags") ? (formData.get("tags") as string).split(",").map(t => t.trim()).filter(Boolean) : [],
      read_time: formData.get("read_time") ? Number(formData.get("read_time")) : null,
      related_brokers: formData.get("related_brokers") ? (formData.get("related_brokers") as string).split(",").map(t => t.trim()).filter(Boolean) : [],
      related_calc: formData.get("related_calc") || null,
      cover_image_url: formData.get("cover_image_url") || null,
      evergreen: formData.get("evergreen") === "on",
      status: formData.get("status") || "published",
      published_at: formData.get("published_at") || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      author_name: formData.get("author_name") || null,
      author_title: formData.get("author_title") || null,
      author_linkedin: formData.get("author_linkedin") || null,
      author_twitter: formData.get("author_twitter") || null,
      author_id: formData.get("author_id") ? Number(formData.get("author_id")) : null,
      reviewer_id: formData.get("reviewer_id") ? Number(formData.get("reviewer_id")) : null,
      reviewed_at: formData.get("reviewed_at") || null,
      changelog: (() => {
        try {
          const raw = formData.get("changelog") as string;
          return raw ? JSON.parse(raw) : (editing as any)?.changelog || [];
        } catch { return (editing as any)?.changelog || []; }
      })(),
    };

    try {
      if (editing) {
        const { error } = await supabase.from("articles").update(record).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("articles").insert(record);
        if (error) throw error;
      }
      toast("Article saved", "success");
    } catch {
      toast("Failed to save article", "error");
    }

    setSaving(false);
    setEditing(null);
    setCreating(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const { error } = await supabase.from("articles").delete().eq("id", deleteTarget.id);
      if (error) throw error;
      toast("Article deleted", "success");
    } catch {
      toast("Failed to delete article", "error");
    }
    setDeleteTarget(null);
    load();
  };

  const toggleStatus = async (article: Article) => {
    const newStatus = article.status === "draft" ? "published" : "draft";
    const { error } = await supabase.from("articles").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("id", article.id);
    if (error) {
      toast("Failed to update status", "error");
    } else {
      toast(`Article ${newStatus === "published" ? "published" : "moved to draft"}`, "success");
      load();
    }
  };

  const showForm = editing || creating;
  const formArticle = editing || {} as Partial<Article>;

  const filteredArticles = articles.filter((a) => {
    const matchesSearch = a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.slug.toLowerCase().includes(search.toLowerCase()) ||
      (a.category || "").toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || (a.status || "published") === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Reset page when search changes
  useEffect(() => { setPage(0); }, [search, statusFilter]);

  const totalPages = Math.ceil(filteredArticles.length / PAGE_SIZE);
  const paginatedArticles = filteredArticles.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const draftCount = articles.filter(a => a.status === "draft").length;
  const publishedCount = articles.filter(a => (a.status || "published") === "published").length;

  return (
    <AdminShell>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Articles</h1>
          <p className="text-sm text-slate-500 mt-1">{publishedCount} published, {draftCount} draft</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setCreating(true)}
            className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold rounded-lg px-4 py-2 text-sm transition-colors"
          >
            + Add Article
          </button>
        )}
      </div>

      {showForm ? (
        <form
          onSubmit={(e) => { e.preventDefault(); handleSave(new FormData(e.currentTarget)); }}
          className="bg-white border border-slate-200 rounded-lg p-6 space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Title <span className="text-red-600">*</span></label>
              <input name="title" defaultValue={formArticle.title} required className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Slug <span className="text-red-600">*</span></label>
              <input name="slug" defaultValue={formArticle.slug} required className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
              <select name="status" defaultValue={formArticle.status || "published"} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30">
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Excerpt</label>
            <textarea name="excerpt" defaultValue={formArticle.excerpt} rows={2} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Category</label>
              <input name="category" defaultValue={formArticle.category} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Read Time (min)</label>
              <input name="read_time" type="number" defaultValue={formArticle.read_time?.toString()} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Tags (comma-separated)</label>
              <input name="tags" defaultValue={formArticle.tags?.join(", ")} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Content</label>
            <textarea name="content" defaultValue={formArticle.content} rows={8} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30" />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Sections (JSON array)</label>
            <textarea name="sections" defaultValue={formArticle.sections ? JSON.stringify(formArticle.sections, null, 2) : ""} rows={6} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/30" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Related Brokers (slugs, comma-separated)</label>
              <input name="related_brokers" defaultValue={formArticle.related_brokers?.join(", ")} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Related Calculator</label>
              <input name="related_calc" defaultValue={formArticle.related_calc} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">Cover Image URL</label>
              <input name="cover_image_url" defaultValue={formArticle.cover_image_url || ""} placeholder="https://images.unsplash.com/..." className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30" />
              {formArticle.cover_image_url && (
                <img src={formArticle.cover_image_url} alt="Cover preview" className="mt-2 rounded-lg h-24 object-cover" />
              )}
            </div>
          </div>

          {/* Author/Reviewer (structured — from team_members) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Author (Team Member)</label>
              <select name="author_id" defaultValue={formArticle.author_id?.toString() || ""} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30">
                <option value="">None (use legacy fields)</option>
                {teamMembers.filter(m => m.role !== 'expert_reviewer').map(m => (
                  <option key={m.id} value={m.id}>{m.full_name} ({m.role.replace('_', ' ')})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Reviewer (Team Member)</label>
              <select name="reviewer_id" defaultValue={formArticle.reviewer_id?.toString() || ""} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30">
                <option value="">None</option>
                {teamMembers.map(m => (
                  <option key={m.id} value={m.id}>{m.full_name} ({m.role.replace('_', ' ')})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Reviewed At</label>
              <input name="reviewed_at" type="date" defaultValue={formArticle.reviewed_at ? new Date(formArticle.reviewed_at).toISOString().split('T')[0] : ""} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30" />
            </div>
          </div>

          {/* Changelog */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Changelog (JSON array)</label>
            <textarea name="changelog" defaultValue={formArticle.changelog ? JSON.stringify(formArticle.changelog, null, 2) : "[]"} rows={3} placeholder='[{"date": "2026-02-18", "summary": "Updated fee data for all brokers"}]' className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/30" />
          </div>

          {/* Legacy author fields */}
          <details className="border border-slate-100 rounded-lg">
            <summary className="px-3 py-2 text-xs font-medium text-slate-400 cursor-pointer hover:text-slate-600">Legacy Author Fields (flat text — used when no team member selected)</summary>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Author Name</label>
                <input name="author_name" defaultValue={formArticle.author_name} placeholder="Market Research Team" className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Author Title</label>
                <input name="author_title" defaultValue={formArticle.author_title} placeholder="Invest.com.au" className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Author LinkedIn URL</label>
                <input name="author_linkedin" defaultValue={formArticle.author_linkedin} placeholder="https://linkedin.com/in/..." className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Author Twitter URL</label>
                <input name="author_twitter" defaultValue={formArticle.author_twitter} placeholder="https://x.com/..." className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30" />
              </div>
            </div>
          </details>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" name="evergreen" defaultChecked={formArticle.evergreen} className="w-4 h-4 rounded bg-slate-200 border-slate-300" />
            <span className="text-sm text-slate-600">Evergreen content</span>
          </label>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold rounded-lg px-6 py-2.5 text-sm transition-colors disabled:opacity-50">
              {saving ? "Saving..." : editing ? "Update Article" : "Create Article"}
            </button>
            <button type="button" onClick={() => { setEditing(null); setCreating(false); }} className="text-slate-500 hover:text-slate-900 px-4 py-2.5 text-sm">Cancel</button>
          </div>
        </form>
      ) : (
        <>
          {/* Search + Status Filter */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <input
              type="text"
              placeholder="Search articles by title, slug, or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
            />
            <div className="flex bg-white border border-slate-200 rounded-lg overflow-hidden shrink-0">
              {(["all", "published", "draft"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-2 text-xs font-medium transition-colors ${
                    statusFilter === s ? "bg-green-700 text-white" : "text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  {s === "all" ? `All (${articles.length})` : s === "published" ? `Published (${publishedCount})` : `Draft (${draftCount})`}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Article</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Author</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Category</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {paginatedArticles.map((article) => (
                  <tr key={article.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="text-sm font-semibold text-slate-900">{article.title}</div>
                      <div className="text-xs text-slate-500">{article.slug}</div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleStatus(article)}
                        className={`text-xs px-2 py-1 rounded-full font-medium transition-colors ${
                          (article.status || "published") === "published"
                            ? "bg-green-50 text-green-600 hover:bg-green-100"
                            : "bg-amber-50 text-amber-600 hover:bg-amber-100"
                        }`}
                      >
                        {(article.status || "published") === "published" ? "Published" : "Draft"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 hidden md:table-cell">{article.author_name || "Team"}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 hidden md:table-cell">{article.category || "\u2014"}</td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <a href={`/article/${article.slug}`} target="_blank" rel="noopener noreferrer" className="text-xs text-green-600 hover:text-green-700">Preview</a>
                      <button onClick={() => setEditing(article)} className="text-xs text-amber-600 hover:text-amber-700">Edit</button>
                      <button onClick={() => setDeleteTarget(article)} className="text-xs text-red-600 hover:text-red-300">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                &larr; Prev
              </button>
              <span className="text-sm text-slate-500">
                Page {page + 1} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Next &rarr;
              </button>
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Article"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </AdminShell>
  );
}
