"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import AdminShell from "@/components/AdminShell";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useToast } from "@/components/Toast";
import type { Scenario } from "@/lib/types";

const PAGE_SIZE = 15;

export default function AdminScenariosPage() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [editing, setEditing] = useState<Scenario | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<Scenario | null>(null);

  const supabase = createClient();
  const { toast } = useToast();

  const load = async () => {
    const { data } = await supabase.from("scenarios").select("*").order("created_at", { ascending: false });
    if (data) setScenarios(data);
  };

  useEffect(() => { load(); }, []);

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
      const existing = scenarios.find(s => s.slug === slug && s.id !== editing?.id);
      if (existing) {
        toast(`Slug "${slug}" is already used by "${existing.title}"`, "error");
        return;
      }
    }

    setSaving(true);
    const record: Record<string, unknown> = {
      title,
      slug,
      hero_title: formData.get("hero_title") || null,
      icon: formData.get("icon") || null,
      problem: formData.get("problem") || null,
      solution: formData.get("solution") || null,
      brokers: formData.get("brokers") ? (formData.get("brokers") as string).split(",").map(t => t.trim()).filter(Boolean) : [],
      considerations: formData.get("considerations") ? (formData.get("considerations") as string).split("\n").filter(Boolean) : [],
      updated_at: new Date().toISOString(),
    };

    try {
      if (editing) {
        const { error } = await supabase.from("scenarios").update(record).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("scenarios").insert(record);
        if (error) throw error;
      }
      toast("Scenario saved", "success");
    } catch {
      toast("Failed to save scenario", "error");
    }

    setSaving(false);
    setEditing(null);
    setCreating(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const { error } = await supabase.from("scenarios").delete().eq("id", deleteTarget.id);
      if (error) throw error;
      toast("Scenario deleted", "success");
    } catch {
      toast("Failed to delete scenario", "error");
    }
    setDeleteTarget(null);
    load();
  };

  const showForm = editing || creating;
  const formScenario = editing || {} as Partial<Scenario>;

  const filteredScenarios = scenarios.filter((s) =>
    s.title.toLowerCase().includes(search.toLowerCase()) ||
    s.slug.toLowerCase().includes(search.toLowerCase())
  );

  // Reset page when search changes
  useEffect(() => { setPage(0); }, [search]);

  const totalPages = Math.ceil(filteredScenarios.length / PAGE_SIZE);
  const paginatedScenarios = filteredScenarios.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <AdminShell>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Scenarios</h1>
          <p className="text-sm text-slate-400 mt-1">{scenarios.length} scenarios</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setCreating(true)}
            className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold rounded-lg px-4 py-2 text-sm transition-colors"
          >
            + Add Scenario
          </button>
        )}
      </div>

      {showForm ? (
        <form
          onSubmit={(e) => { e.preventDefault(); handleSave(new FormData(e.currentTarget)); }}
          className="bg-slate-800 border border-slate-700 rounded-lg p-6 space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Title <span className="text-red-400">*</span></label>
              <input name="title" defaultValue={formScenario.title} required className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Slug <span className="text-red-400">*</span></label>
              <input name="slug" defaultValue={formScenario.slug} required className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Icon (emoji)</label>
              <input name="icon" defaultValue={formScenario.icon} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Hero Title</label>
            <input name="hero_title" defaultValue={formScenario.hero_title} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50" />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Problem</label>
            <textarea name="problem" defaultValue={formScenario.problem} rows={4} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50" />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Solution</label>
            <textarea name="solution" defaultValue={formScenario.solution} rows={4} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50" />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Brokers (slugs, comma-separated)</label>
            <input name="brokers" defaultValue={formScenario.brokers?.join(", ")} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50" />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Considerations (one per line)</label>
            <textarea name="considerations" defaultValue={formScenario.considerations?.join("\n")} rows={4} className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold rounded-lg px-6 py-2.5 text-sm transition-colors disabled:opacity-50">
              {saving ? "Saving..." : editing ? "Update Scenario" : "Create Scenario"}
            </button>
            <button type="button" onClick={() => { setEditing(null); setCreating(false); }} className="text-slate-400 hover:text-white px-4 py-2.5 text-sm">Cancel</button>
          </div>
        </form>
      ) : (
        <>
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search scenarios by title or slug..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Scenario</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Icon</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Brokers</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {paginatedScenarios.map((scenario) => (
                  <tr key={scenario.id} className="hover:bg-slate-700/30">
                    <td className="px-4 py-3">
                      <div className="text-sm font-semibold text-white">{scenario.title}</div>
                      <div className="text-xs text-slate-400">{scenario.slug}</div>
                    </td>
                    <td className="px-4 py-3 text-2xl">{scenario.icon || "—"}</td>
                    <td className="px-4 py-3 text-sm text-slate-300">{scenario.brokers?.length || 0} brokers</td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button onClick={() => setEditing(scenario)} className="text-xs text-amber-400 hover:text-amber-300">Edit</button>
                      <button onClick={() => setDeleteTarget(scenario)} className="text-xs text-red-400 hover:text-red-300">Delete</button>
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
                className="px-3 py-1.5 text-sm text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                &larr; Prev
              </button>
              <span className="text-sm text-slate-400">
                Page {page + 1} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="px-3 py-1.5 text-sm text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
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
        title="Delete Scenario"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </AdminShell>
  );
}
