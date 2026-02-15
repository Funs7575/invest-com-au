"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import AdminShell from "@/components/AdminShell";
import type { Article } from "@/lib/types";

export default function AdminArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [editing, setEditing] = useState<Article | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  const supabase = createClient();

  const load = async () => {
    const { data } = await supabase.from("articles").select("*").order("created_at", { ascending: false });
    if (data) setArticles(data);
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (formData: FormData) => {
    setSaving(true);

    let sections: { heading: string; body: string }[] = [];
    try {
      const raw = formData.get("sections") as string;
      if (raw) sections = JSON.parse(raw);
    } catch { /* ignore */ }

    const record: Record<string, unknown> = {
      title: formData.get("title"),
      slug: formData.get("slug"),
      excerpt: formData.get("excerpt") || null,
      category: formData.get("category") || null,
      content: formData.get("content") || null,
      sections: sections.length ? sections : null,
      tags: formData.get("tags") ? (formData.get("tags") as string).split(",").map(t => t.trim()).filter(Boolean) : [],
      read_time: formData.get("read_time") ? Number(formData.get("read_time")) : null,
      related_brokers: formData.get("related_brokers") ? (formData.get("related_brokers") as string).split(",").map(t => t.trim()).filter(Boolean) : [],
      related_calc: formData.get("related_calc") || null,
      evergreen: formData.get("evergreen") === "on",
      published_at: formData.get("published_at") || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (editing) {
      await supabase.from("articles").update(record).eq("id", editing.id);
    } else {
      await supabase.from("articles").insert(record);
    }

    setSaving(false);
    setEditing(null);
    setCreating(false);
    load();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this article?")) return;
    await supabase.from("articles").delete().eq("id", id);
    load();
  };

  const showForm = editing || creating;
  const formArticle = editing || {} as Partial<Article>;

  return (
    <AdminShell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Articles</h1>
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
          className="bg-slate-800 border border-slate-700 rounded-lg p-6 space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Title</label>
              <input name="title" defaultValue={formArticle.title} required className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Slug</label>
              <input name="slug" defaultValue={formArticle.slug} required className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Excerpt</label>
            <textarea name="excerpt" defaultValue={formArticle.excerpt} rows={2} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Category</label>
              <input name="category" defaultValue={formArticle.category} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Read Time (min)</label>
              <input name="read_time" type="number" defaultValue={formArticle.read_time?.toString()} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Tags (comma-separated)</label>
              <input name="tags" defaultValue={formArticle.tags?.join(", ")} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Content</label>
            <textarea name="content" defaultValue={formArticle.content} rows={8} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50" />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Sections (JSON array)</label>
            <textarea name="sections" defaultValue={formArticle.sections ? JSON.stringify(formArticle.sections, null, 2) : ""} rows={6} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/50" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Related Brokers (slugs, comma-separated)</label>
              <input name="related_brokers" defaultValue={formArticle.related_brokers?.join(", ")} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Related Calculator</label>
              <input name="related_calc" defaultValue={formArticle.related_calc} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50" />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" name="evergreen" defaultChecked={formArticle.evergreen} className="w-4 h-4 rounded bg-slate-700 border-slate-600" />
            <span className="text-sm text-slate-300">Evergreen content</span>
          </label>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold rounded-lg px-6 py-2.5 text-sm transition-colors disabled:opacity-50">
              {saving ? "Saving..." : editing ? "Update Article" : "Create Article"}
            </button>
            <button type="button" onClick={() => { setEditing(null); setCreating(false); }} className="text-slate-400 hover:text-white px-4 py-2.5 text-sm">Cancel</button>
          </div>
        </form>
      ) : (
        <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-700/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Article</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Category</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Read Time</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {articles.map((article) => (
                <tr key={article.id} className="hover:bg-slate-700/30">
                  <td className="px-4 py-3">
                    <div className="text-sm font-semibold text-white">{article.title}</div>
                    <div className="text-xs text-slate-400">{article.slug}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-300">{article.category || "—"}</td>
                  <td className="px-4 py-3 text-sm text-slate-300">{article.read_time ? `${article.read_time} min` : "—"}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button onClick={() => setEditing(article)} className="text-xs text-amber-400 hover:text-amber-300">Edit</button>
                    <button onClick={() => handleDelete(article.id)} className="text-xs text-red-400 hover:text-red-300">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
