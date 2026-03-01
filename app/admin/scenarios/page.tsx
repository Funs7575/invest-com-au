"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import AdminShell from "@/components/AdminShell";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useToast } from "@/components/Toast";
import { downloadCSV } from "@/lib/csv-export";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import type { Scenario } from "@/lib/types";

const PAGE_SIZE = 15;

export default function AdminScenariosPage() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [editing, setEditing] = useState<Scenario | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string>("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<Scenario | null>(null);
  const [cloneSource, setCloneSource] = useState<Partial<Scenario> | null>(null);
  const [formKey, setFormKey] = useState(0);

  const supabase = createClient();
  const { toast } = useToast();

  const dirty = creating || editing !== null;
  const { confirmNavigation } = useUnsavedChanges(dirty);

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
    setCloneSource(null);
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

  const handleClone = (scenario: Scenario) => {
    setEditing(null);
    setCloneSource({
      ...scenario,
      title: scenario.title + " (Copy)",
      slug: scenario.slug + "-copy",
    });
    setCreating(true);
    setFormKey((k) => k + 1);
  };

  const showForm = editing || creating;
  const formScenario = editing || cloneSource || {} as Partial<Scenario>;

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const filteredScenarios = scenarios.filter((s) =>
    s.title.toLowerCase().includes(search.toLowerCase()) ||
    s.slug.toLowerCase().includes(search.toLowerCase())
  );

  const sortedScenarios = [...filteredScenarios].sort((a, b) => {
    if (!sortKey) return 0;
    const aVal = a[sortKey as keyof typeof a];
    const bVal = b[sortKey as keyof typeof b];
    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return 1;
    if (bVal == null) return -1;
    const cmp = typeof aVal === "number" && typeof bVal === "number"
      ? aVal - bVal
      : String(aVal).localeCompare(String(bVal));
    return sortDir === "asc" ? cmp : -cmp;
  });

  // Reset page when search changes
  useEffect(() => { setPage(0); }, [search]);

  const totalPages = Math.ceil(sortedScenarios.length / PAGE_SIZE);
  const paginatedScenarios = sortedScenarios.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <AdminShell>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Scenarios</h1>
          <p className="text-sm text-slate-500 mt-1">{scenarios.length} scenarios</p>
          <p className="text-sm text-slate-500">Investment scenario guides linking users to the best brokers for their situation.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => downloadCSV(
              "scenarios.csv",
              ["Title", "Slug", "Description", "Status"],
              scenarios.map((s) => [
                s.title,
                s.slug,
                s.problem || "",
                s.brokers?.length ? "Active" : "Draft",
              ])
            )}
            className="px-3 py-1.5 bg-green-50 text-green-700 text-xs font-semibold rounded-lg hover:bg-green-100 border border-green-200 transition-colors"
          >
            Export CSV
          </button>
          {!showForm && (
            <button
              onClick={() => setCreating(true)}
              className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold rounded-lg px-4 py-2 text-sm transition-colors"
            >
              + Add Scenario
            </button>
          )}
        </div>
      </div>

      {showForm ? (
        <form
          key={formKey}
          onSubmit={(e) => { e.preventDefault(); handleSave(new FormData(e.currentTarget)); }}
          className="bg-white border border-slate-200 rounded-lg p-6 space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Title <span className="text-red-600">*</span></label>
              <input name="title" defaultValue={formScenario.title} required className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Slug <span className="text-red-600">*</span></label>
              <input name="slug" defaultValue={formScenario.slug} required className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30" />
              <p className="text-xs text-slate-400 mt-0.5">URL path — e.g. &quot;kids&quot; creates /scenario/kids</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Icon (emoji)</label>
              <input name="icon" defaultValue={formScenario.icon} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Hero Title</label>
            <input name="hero_title" defaultValue={formScenario.hero_title} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30" />
            <p className="text-xs text-slate-400 mt-0.5">Large heading shown at the top of the scenario page.</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Problem</label>
            <textarea name="problem" defaultValue={formScenario.problem} rows={4} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30" />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Solution</label>
            <textarea name="solution" defaultValue={formScenario.solution} rows={4} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30" />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Brokers (slugs, comma-separated)</label>
            <input name="brokers" defaultValue={formScenario.brokers?.join(", ")} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30" />
            <p className="text-xs text-slate-400 mt-0.5">Comma-separated broker slugs to feature in this scenario.</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Considerations (one per line)</label>
            <textarea name="considerations" defaultValue={formScenario.considerations?.join("\n")} rows={4} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30" />
            <p className="text-xs text-slate-400 mt-0.5">One bullet point per line — shown as key things to consider.</p>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold rounded-lg px-6 py-2.5 text-sm transition-colors disabled:opacity-50">
              {saving ? "Saving..." : editing ? "Update Scenario" : "Create Scenario"}
            </button>
            <button type="button" onClick={() => { setEditing(null); setCreating(false); setCloneSource(null); }} className="text-slate-500 hover:text-slate-900 px-4 py-2.5 text-sm">Cancel</button>
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
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
            />
          </div>
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase cursor-pointer select-none hover:text-slate-900" onClick={() => toggleSort("title")}>
                    Scenario {sortKey === "title" ? (sortDir === "asc" ? "\u2191" : "\u2193") : ""}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Icon</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Brokers</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {paginatedScenarios.map((scenario) => (
                  <tr key={scenario.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="text-sm font-semibold text-slate-900">{scenario.title}</div>
                      <div className="text-xs text-slate-500">{scenario.slug}</div>
                    </td>
                    <td className="px-4 py-3 text-2xl">{scenario.icon || "—"}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{scenario.brokers?.length || 0} brokers</td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <a href={`/scenario/${scenario.slug}`} target="_blank" rel="noopener noreferrer" className="text-xs text-green-600 hover:text-green-700">Preview</a>
                      <button onClick={() => handleClone(scenario)} className="text-xs text-blue-600 hover:underline mr-3">Clone</button>
                      <button onClick={() => setEditing(scenario)} className="text-xs text-amber-600 hover:text-amber-700">Edit</button>
                      <button onClick={() => setDeleteTarget(scenario)} className="text-xs text-red-600 hover:text-red-300">Delete</button>
                    </td>
                  </tr>
                ))}
                {scenarios.length === 0 && (
                  <tr>
                    <td colSpan={4}>
                      <div className="text-center py-12">
                        <div className="text-3xl mb-2">🎯</div>
                        <p className="text-sm font-medium text-slate-700 mb-1">No scenarios yet</p>
                        <p className="text-xs text-slate-400 max-w-sm mx-auto">
                          Scenarios are guided investment use-cases (e.g. &quot;First-time investor&quot; or &quot;SMSF setup&quot;) that recommend specific brokers based on a user&apos;s situation.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
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
