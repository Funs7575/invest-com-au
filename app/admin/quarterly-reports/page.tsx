"use client";

import { useEffect, useState, useCallback } from "react";
import AdminShell from "@/components/AdminShell";
import { createClient } from "@/lib/supabase/client";
import type { QuarterlyReport } from "@/lib/types";

interface FormData {
  title: string;
  slug: string;
  quarter: string;
  year: number;
  executive_summary: string;
  sections: string; // JSON string for editing
  key_findings: string; // JSON string for editing
  fee_changes_summary: string; // JSON string for editing
  new_entrants: string; // comma-separated
  status: "draft" | "published";
}

const emptyForm: FormData = {
  title: "",
  slug: "",
  quarter: "Q1",
  year: new Date().getFullYear(),
  executive_summary: "",
  sections: "[]",
  key_findings: "[]",
  fee_changes_summary: "[]",
  new_entrants: "",
  status: "draft",
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function QuarterlyReportsPage() {
  const supabase = createClient();
  const [items, setItems] = useState<QuarterlyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("quarterly_reports")
      .select("*")
      .order("year", { ascending: false })
      .order("quarter", { ascending: false });
    if (data) setItems(data as QuarterlyReport[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const startCreate = () => {
    setCreating(true);
    setEditing(null);
    setForm(emptyForm);
  };

  const startEdit = (item: QuarterlyReport) => {
    setEditing(item.id);
    setCreating(false);
    setForm({
      title: item.title,
      slug: item.slug,
      quarter: item.quarter,
      year: item.year,
      executive_summary: item.executive_summary || "",
      sections: JSON.stringify(item.sections || [], null, 2),
      key_findings: JSON.stringify(item.key_findings || [], null, 2),
      fee_changes_summary: JSON.stringify(
        item.fee_changes_summary || [],
        null,
        2
      ),
      new_entrants: (item.new_entrants || []).join(", "),
      status: item.status,
    });
  };

  const cancel = () => {
    setEditing(null);
    setCreating(false);
    setForm(emptyForm);
  };

  const save = async () => {
    if (!form.title) {
      showMessage("error", "Title is required");
      return;
    }

    let sectionsJson, keyFindingsJson, feeChangesJson;
    try {
      sectionsJson = JSON.parse(form.sections);
    } catch {
      showMessage("error", "Invalid JSON in Sections field");
      return;
    }
    try {
      keyFindingsJson = JSON.parse(form.key_findings);
    } catch {
      showMessage("error", "Invalid JSON in Key Findings field");
      return;
    }
    try {
      feeChangesJson = JSON.parse(form.fee_changes_summary);
    } catch {
      showMessage("error", "Invalid JSON in Fee Changes Summary field");
      return;
    }

    setSaving(true);
    const payload = {
      title: form.title,
      slug: form.slug || slugify(form.title),
      quarter: form.quarter,
      year: form.year,
      executive_summary: form.executive_summary || null,
      sections: sectionsJson,
      key_findings: keyFindingsJson,
      fee_changes_summary: feeChangesJson,
      new_entrants: form.new_entrants
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      status: form.status,
      published_at:
        form.status === "published" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    };

    let error;
    if (editing) {
      ({ error } = await supabase
        .from("quarterly_reports")
        .update(payload)
        .eq("id", editing));
    } else {
      ({ error } = await supabase.from("quarterly_reports").insert(payload));
    }

    setSaving(false);
    if (error) {
      showMessage("error", error.message);
    } else {
      showMessage("success", editing ? "Report updated" : "Report created");
      cancel();
      load();
    }
  };

  const deleteItem = async (id: number) => {
    if (!confirm("Delete this quarterly report?")) return;
    const { error } = await supabase
      .from("quarterly_reports")
      .delete()
      .eq("id", id);
    if (error) {
      showMessage("error", error.message);
    } else {
      showMessage("success", "Report deleted");
      load();
    }
  };

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Quarterly Reports</h1>
            <p className="text-sm text-slate-500">
              Manage quarterly industry reports and analysis
            </p>
          </div>
          <button
            onClick={startCreate}
            className="px-4 py-2 bg-green-700 text-white text-sm font-bold rounded-lg hover:bg-green-800 transition-colors"
          >
            + New Report
          </button>
        </div>

        {message && (
          <div
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              message.type === "success"
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Form */}
        {(creating || editing) && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-bold">
              {editing ? "Edit Report" : "Create Report"}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => {
                    const title = e.target.value;
                    setForm({
                      ...form,
                      title,
                      slug: creating ? slugify(title) : form.slug,
                    });
                  }}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Slug
                </label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) =>
                    setForm({ ...form, slug: e.target.value })
                  }
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Quarter
                </label>
                <select
                  value={form.quarter}
                  onChange={(e) =>
                    setForm({ ...form, quarter: e.target.value })
                  }
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="Q1">Q1</option>
                  <option value="Q2">Q2</option>
                  <option value="Q3">Q3</option>
                  <option value="Q4">Q4</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Year
                </label>
                <input
                  type="number"
                  value={form.year}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      year: parseInt(e.target.value) || new Date().getFullYear(),
                    })
                  }
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Status
                </label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      status: e.target.value as FormData["status"],
                    })
                  }
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Executive Summary
              </label>
              <textarea
                rows={4}
                value={form.executive_summary}
                onChange={(e) =>
                  setForm({ ...form, executive_summary: e.target.value })
                }
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Sections (JSON)
              </label>
              <textarea
                rows={8}
                value={form.sections}
                onChange={(e) =>
                  setForm({ ...form, sections: e.target.value })
                }
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono"
                placeholder='[{"heading":"Market Overview","body":"..."}]'
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Key Findings (JSON)
              </label>
              <textarea
                rows={5}
                value={form.key_findings}
                onChange={(e) =>
                  setForm({ ...form, key_findings: e.target.value })
                }
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono"
                placeholder='["Finding 1","Finding 2"]'
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Fee Changes Summary (JSON)
              </label>
              <textarea
                rows={5}
                value={form.fee_changes_summary}
                onChange={(e) =>
                  setForm({ ...form, fee_changes_summary: e.target.value })
                }
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono"
                placeholder='[{"broker":"...","field":"...","old_value":"...","new_value":"..."}]'
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                New Entrants (comma-separated)
              </label>
              <input
                type="text"
                value={form.new_entrants}
                onChange={(e) =>
                  setForm({ ...form, new_entrants: e.target.value })
                }
                placeholder="Broker A, Broker B"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={save}
                disabled={saving}
                className="px-4 py-2 bg-green-700 text-white text-sm font-bold rounded-lg hover:bg-green-800 transition-colors disabled:opacity-50"
              >
                {saving ? "Saving..." : editing ? "Update" : "Create"}
              </button>
              <button
                onClick={cancel}
                className="px-4 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="text-center py-12 text-slate-400">Loading...</div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">
                      Title
                    </th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-600">
                      Quarter / Year
                    </th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-600">
                      Status
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">
                      Published
                    </th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-slate-100 hover:bg-slate-50"
                    >
                      <td className="px-4 py-3 font-medium">{item.title}</td>
                      <td className="px-4 py-3 text-center">
                        {item.quarter} {item.year}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                            item.status === "published"
                              ? "bg-green-50 text-green-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {item.published_at
                          ? new Date(item.published_at).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => startEdit(item)}
                          className="text-xs text-green-700 hover:underline mr-3"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteItem(item.id)}
                          className="text-xs text-red-500 hover:underline"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-8 text-center text-slate-400"
                      >
                        No quarterly reports yet. Click &quot;+ New Report&quot; to
                        create one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
