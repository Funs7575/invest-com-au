"use client";

import { useEffect, useState, useCallback } from "react";
import AdminShell from "@/components/AdminShell";
import ConfirmDialog from "@/components/ConfirmDialog";
import { createClient } from "@/lib/supabase/client";
import { downloadCSV } from "@/lib/csv-export";
import TableSkeleton from "@/components/TableSkeleton";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import type { RegulatoryAlert } from "@/lib/types";

interface FormData {
  title: string;
  slug: string;
  body: string;
  source_url: string;
  source_name: string;
  alert_type: "tax" | "regulatory" | "super" | "reporting";
  severity: "info" | "important" | "urgent";
  effective_date: string;
  impact_summary: string;
  action_items: string; // JSON string for editing
  status: "draft" | "published";
}

const emptyForm: FormData = {
  title: "",
  slug: "",
  body: "",
  source_url: "",
  source_name: "",
  alert_type: "regulatory",
  severity: "info",
  effective_date: "",
  impact_summary: "",
  action_items: "[]",
  status: "draft",
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function RegulatoryAlertsPage() {
  const supabase = createClient();
  const [items, setItems] = useState<RegulatoryAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [sortKey, setSortKey] = useState<string>("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [deleteTarget, setDeleteTarget] = useState<RegulatoryAlert | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const dirty = creating || editing !== null;
  const { confirmNavigation } = useUnsavedChanges(dirty);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("regulatory_alerts")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setItems(data as RegulatoryAlert[]);
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

  const startEdit = (item: RegulatoryAlert) => {
    setEditing(item.id);
    setCreating(false);
    setForm({
      title: item.title,
      slug: item.slug,
      body: item.body || "",
      source_url: item.source_url || "",
      source_name: item.source_name || "",
      alert_type: item.alert_type,
      severity: item.severity,
      effective_date: item.effective_date || "",
      impact_summary: item.impact_summary || "",
      action_items: JSON.stringify(item.action_items || [], null, 2),
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

    let actionItemsJson;
    try {
      actionItemsJson = JSON.parse(form.action_items);
    } catch {
      showMessage("error", "Invalid JSON in Action Items field");
      return;
    }

    setSaving(true);
    const payload = {
      title: form.title,
      slug: form.slug || slugify(form.title),
      body: form.body || null,
      source_url: form.source_url || null,
      source_name: form.source_name || null,
      alert_type: form.alert_type,
      severity: form.severity,
      effective_date: form.effective_date || null,
      impact_summary: form.impact_summary || null,
      action_items: actionItemsJson,
      status: form.status,
      published_at:
        form.status === "published" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    };

    let error;
    if (editing) {
      ({ error } = await supabase
        .from("regulatory_alerts")
        .update(payload)
        .eq("id", editing));
    } else {
      ({ error } = await supabase.from("regulatory_alerts").insert(payload));
    }

    setSaving(false);
    if (error) {
      showMessage("error", error.message);
    } else {
      showMessage("success", editing ? "Alert updated" : "Alert created");
      cancel();
      load();
    }
  };

  const deleteItem = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase
      .from("regulatory_alerts")
      .delete()
      .eq("id", deleteTarget.id);
    if (error) {
      showMessage("error", error.message);
    } else {
      showMessage("success", "Alert deleted");
      load();
    }
    setDeleteTarget(null);
  };

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sorted = [...items].sort((a, b) => {
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

  const alertTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      tax: "bg-purple-50 text-purple-700",
      regulatory: "bg-blue-50 text-blue-700",
      super: "bg-teal-50 text-teal-700",
      reporting: "bg-amber-50 text-amber-700",
    };
    return styles[type] || "bg-slate-50 text-slate-700";
  };

  const severityBadge = (severity: string) => {
    const styles: Record<string, string> = {
      info: "bg-blue-50 text-blue-700",
      important: "bg-amber-50 text-amber-700",
      urgent: "bg-red-50 text-red-700",
    };
    return styles[severity] || "bg-slate-50 text-slate-700";
  };

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Regulatory Alerts</h1>
            <p className="text-sm text-slate-500">
              Track regulatory changes affecting brokers — ASIC actions, license changes, compliance requirements.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const rows = items.map((item) => [
                  item.title,
                  item.alert_type,
                  item.severity,
                  item.status,
                  item.effective_date || "",
                  item.source_name || "",
                  item.impact_summary || "",
                ]);
                downloadCSV("regulatory-alerts.csv", ["Title", "Type", "Severity", "Status", "Effective Date", "Source", "Impact Summary"], rows);
              }}
              className="px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-lg hover:bg-emerald-100 border border-emerald-200 transition-colors"
            >
              Export CSV ↓
            </button>
            <button
              onClick={startCreate}
              className="px-4 py-2 bg-emerald-700 text-white text-sm font-bold rounded-lg hover:bg-emerald-800 transition-colors"
            >
              + New Alert
            </button>
          </div>
        </div>

        {message && (
          <div
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              message.type === "success"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
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
              {editing ? "Edit Alert" : "Create Alert"}
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

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Body
              </label>
              <textarea
                rows={6}
                value={form.body}
                onChange={(e) =>
                  setForm({ ...form, body: e.target.value })
                }
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Source URL
                </label>
                <input
                  type="text"
                  value={form.source_url}
                  onChange={(e) =>
                    setForm({ ...form, source_url: e.target.value })
                  }
                  placeholder="https://..."
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Source Name
                </label>
                <input
                  type="text"
                  value={form.source_name}
                  onChange={(e) =>
                    setForm({ ...form, source_name: e.target.value })
                  }
                  placeholder="e.g. ATO, ASIC"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Alert Type
                </label>
                <select
                  value={form.alert_type}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      alert_type: e.target.value as FormData["alert_type"],
                    })
                  }
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="tax">Tax</option>
                  <option value="regulatory">Regulatory</option>
                  <option value="super">Super</option>
                  <option value="reporting">Reporting</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Severity
                </label>
                <select
                  value={form.severity}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      severity: e.target.value as FormData["severity"],
                    })
                  }
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="info">Info</option>
                  <option value="important">Important</option>
                  <option value="urgent">Urgent</option>
                </select>
                <p className="text-xs text-slate-400 mt-0.5">critical &gt; high &gt; medium &gt; low. Critical alerts are shown prominently to users.</p>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Effective Date
                </label>
                <input
                  type="date"
                  value={form.effective_date}
                  onChange={(e) =>
                    setForm({ ...form, effective_date: e.target.value })
                  }
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
                <p className="text-xs text-slate-400 mt-0.5">When the regulation takes effect.</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Impact Summary
                </label>
                <input
                  type="text"
                  value={form.impact_summary}
                  onChange={(e) =>
                    setForm({ ...form, impact_summary: e.target.value })
                  }
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Action Items (JSON)
              </label>
              <textarea
                rows={5}
                value={form.action_items}
                onChange={(e) =>
                  setForm({ ...form, action_items: e.target.value })
                }
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono"
                placeholder='[{"text":"Review new CGT rules","url":"https://..."}]'
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={save}
                disabled={saving}
                className="px-4 py-2 bg-emerald-700 text-white text-sm font-bold rounded-lg hover:bg-emerald-800 transition-colors disabled:opacity-50"
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
          <TableSkeleton rows={4} cols={6} />
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 cursor-pointer select-none hover:text-slate-900" onClick={() => toggleSort("title")}>
                      Title {sortKey === "title" ? (sortDir === "asc" ? "\u2191" : "\u2193") : ""}
                    </th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-600 cursor-pointer select-none hover:text-slate-900" onClick={() => toggleSort("alert_type")}>
                      Type {sortKey === "alert_type" ? (sortDir === "asc" ? "\u2191" : "\u2193") : ""}
                    </th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-600 cursor-pointer select-none hover:text-slate-900" onClick={() => toggleSort("severity")}>
                      Severity {sortKey === "severity" ? (sortDir === "asc" ? "\u2191" : "\u2193") : ""}
                    </th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-600 cursor-pointer select-none hover:text-slate-900" onClick={() => toggleSort("status")}>
                      Status {sortKey === "status" ? (sortDir === "asc" ? "\u2191" : "\u2193") : ""}
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 cursor-pointer select-none hover:text-slate-900" onClick={() => toggleSort("effective_date")}>
                      Effective Date {sortKey === "effective_date" ? (sortDir === "asc" ? "\u2191" : "\u2193") : ""}
                    </th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-slate-100 hover:bg-slate-50"
                    >
                      <td className="px-4 py-3 font-medium">{item.title}</td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${alertTypeBadge(
                            item.alert_type
                          )}`}
                        >
                          {item.alert_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${severityBadge(
                            item.severity
                          )}`}
                        >
                          {item.severity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                            item.status === "published"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {item.effective_date || "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => startEdit(item)}
                          className="text-xs text-emerald-700 hover:underline mr-3"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteTarget(item)}
                          className="text-xs text-red-500 hover:underline"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={6}>
                        <div className="text-center py-12">
                          <div className="text-3xl mb-2">📋</div>
                          <p className="text-sm font-medium text-slate-700 mb-1">No regulatory alerts yet</p>
                          <p className="text-xs text-slate-400 max-w-sm mx-auto">
                            Regulatory alerts notify users about important changes to tax rules, ASIC regulations, superannuation laws, or reporting requirements that may affect their investments.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Regulatory Alert"
        message={`Delete "${deleteTarget?.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={deleteItem}
        onCancel={() => setDeleteTarget(null)}
      />
    </AdminShell>
  );
}
