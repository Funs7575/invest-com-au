"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import AdminShell from "@/components/AdminShell";
import type { Scenario } from "@/lib/types";

export default function AdminScenariosPage() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [editing, setEditing] = useState<Scenario | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  const supabase = createClient();

  const load = async () => {
    const { data } = await supabase.from("scenarios").select("*").order("created_at", { ascending: false });
    if (data) setScenarios(data);
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (formData: FormData) => {
    setSaving(true);
    const record: Record<string, unknown> = {
      title: formData.get("title"),
      slug: formData.get("slug"),
      hero_title: formData.get("hero_title") || null,
      icon: formData.get("icon") || null,
      problem: formData.get("problem") || null,
      solution: formData.get("solution") || null,
      brokers: formData.get("brokers") ? (formData.get("brokers") as string).split(",").map(t => t.trim()).filter(Boolean) : [],
      considerations: formData.get("considerations") ? (formData.get("considerations") as string).split("\n").filter(Boolean) : [],
      updated_at: new Date().toISOString(),
    };

    if (editing) {
      await supabase.from("scenarios").update(record).eq("id", editing.id);
    } else {
      await supabase.from("scenarios").insert(record);
    }

    setSaving(false);
    setEditing(null);
    setCreating(false);
    load();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this scenario?")) return;
    await supabase.from("scenarios").delete().eq("id", id);
    load();
  };

  const showForm = editing || creating;
  const formScenario = editing || {} as Partial<Scenario>;

  return (
    <AdminShell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Scenarios</h1>
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
              <label className="block text-xs font-medium text-slate-400 mb-1">Title</label>
              <input name="title" defaultValue={formScenario.title} required className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Slug</label>
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
              {scenarios.map((scenario) => (
                <tr key={scenario.id} className="hover:bg-slate-700/30">
                  <td className="px-4 py-3">
                    <div className="text-sm font-semibold text-white">{scenario.title}</div>
                    <div className="text-xs text-slate-400">{scenario.slug}</div>
                  </td>
                  <td className="px-4 py-3 text-2xl">{scenario.icon || "—"}</td>
                  <td className="px-4 py-3 text-sm text-slate-300">{scenario.brokers?.length || 0} brokers</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button onClick={() => setEditing(scenario)} className="text-xs text-amber-400 hover:text-amber-300">Edit</button>
                    <button onClick={() => handleDelete(scenario.id)} className="text-xs text-red-400 hover:text-red-300">Delete</button>
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
