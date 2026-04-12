"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import AdminShell from "@/components/AdminShell";
import Icon from "@/components/Icon";
import ConfirmDialog from "@/components/ConfirmDialog";

interface LegalDoc {
  id: number;
  category: string;
  title: string;
  description: string | null;
  status: string;
  signed_at: string | null;
  expires_at: string | null;
  renewal_reminder_days: number | null;
  file_url: string | null;
  counterparty: string | null;
  responsible_person: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100 text-amber-700",
  expired: "bg-red-100 text-red-700",
  draft: "bg-slate-100 text-slate-600",
  needs_review: "bg-violet-100 text-violet-700",
};

const CATEGORY_ICONS: Record<string, string> = {
  agreement: "file-signature",
  policy: "scroll-text",
  registration: "building-2",
  insurance: "shield",
  compliance: "check-circle",
};

const CATEGORIES = ["all", "agreement", "policy", "registration", "insurance", "compliance"];

export default function LegalDashboardPage() {
  const [docs, setDocs] = useState<LegalDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [editing, setEditing] = useState<LegalDoc | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const supabase = createClient();

  const loadDocs = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("legal_documents").select("*").order("category").order("title");
    setDocs((data || []) as LegalDoc[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { loadDocs(); }, [loadDocs]);

  const filtered = filter === "all" ? docs : docs.filter(d => d.category === filter);

  const stats = {
    total: docs.length,
    active: docs.filter(d => d.status === "active").length,
    pending: docs.filter(d => d.status === "pending").length,
    expired: docs.filter(d => d.status === "expired" || (d.expires_at && new Date(d.expires_at) < new Date())).length,
    needsReview: docs.filter(d => d.status === "needs_review").length,
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    const { id, created_at: _created_at, updated_at: _updated_at, ...payload } = editing;
    if (id) {
      await supabase.from("legal_documents").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", id);
    } else {
      await supabase.from("legal_documents").insert(payload);
    }
    setSaving(false);
    setEditing(null);
    loadDocs();
  };

  const handleDelete = (id: number) => {
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (deleteId == null) return;
    await supabase.from("legal_documents").delete().eq("id", deleteId);
    setDeleteId(null);
    loadDocs();
  };

  return (
    <AdminShell title="Legal & Compliance" subtitle="Agreements, policies, registrations, insurance, and compliance status">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {[
          { label: "Total Documents", value: stats.total, color: "text-slate-900" },
          { label: "Active", value: stats.active, color: "text-emerald-600" },
          { label: "Pending", value: stats.pending, color: "text-amber-600" },
          { label: "Expired", value: stats.expired, color: "text-red-600" },
          { label: "Needs Review", value: stats.needsReview, color: "text-violet-600" },
        ].map(s => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-lg px-4 py-3 text-center">
            <p className="text-[0.6rem] text-slate-500 font-medium uppercase tracking-wider">{s.label}</p>
            <p className={`text-2xl font-extrabold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Urgent items alert */}
      {stats.pending > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-2">
            <Icon name="alert-triangle" size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-900">{stats.pending} items need attention</p>
              <p className="text-xs text-amber-700 mt-0.5">
                {docs.filter(d => d.status === "pending").slice(0, 3).map(d => d.title).join(", ")}
                {stats.pending > 3 ? `, and ${stats.pending - 3} more` : ""}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Category filter + add button */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex gap-1.5 flex-wrap">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${
                filter === cat ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {cat === "all" ? "All" : cat.charAt(0).toUpperCase() + cat.slice(1)}
              {cat !== "all" && ` (${docs.filter(d => d.category === cat).length})`}
            </button>
          ))}
        </div>
        <button
          onClick={() => setEditing({ id: 0, category: "agreement", title: "", description: "", status: "pending", signed_at: null, expires_at: null, renewal_reminder_days: 30, file_url: null, counterparty: "", responsible_person: "Founder", notes: "", created_at: "", updated_at: "" })}
          className="px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800"
        >
          + Add Document
        </button>
      </div>

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900 mb-4">{editing.id ? "Edit" : "Add"} Document</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Title</label>
                <input value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Category</label>
                  <select value={editing.category} onChange={e => setEditing({ ...editing, category: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm">
                    {CATEGORIES.filter(c => c !== "all").map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Status</label>
                  <select value={editing.status} onChange={e => setEditing({ ...editing, status: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm">
                    {["active", "pending", "expired", "draft", "needs_review"].map(s => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
                <textarea value={editing.description || ""} onChange={e => setEditing({ ...editing, description: e.target.value })} rows={2} className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Counterparty</label>
                  <input value={editing.counterparty || ""} onChange={e => setEditing({ ...editing, counterparty: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="e.g. Stripe, ASIC" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Responsible</label>
                  <input value={editing.responsible_person || ""} onChange={e => setEditing({ ...editing, responsible_person: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Signed Date</label>
                  <input type="date" value={editing.signed_at?.slice(0, 10) || ""} onChange={e => setEditing({ ...editing, signed_at: e.target.value ? new Date(e.target.value).toISOString() : null })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Expires</label>
                  <input type="date" value={editing.expires_at?.slice(0, 10) || ""} onChange={e => setEditing({ ...editing, expires_at: e.target.value ? new Date(e.target.value).toISOString() : null })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Document URL</label>
                <input value={editing.file_url || ""} onChange={e => setEditing({ ...editing, file_url: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="https://drive.google.com/..." />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Notes</label>
                <textarea value={editing.notes || ""} onChange={e => setEditing({ ...editing, notes: e.target.value })} rows={2} className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={handleSave} disabled={saving || !editing.title} className="px-5 py-2 bg-slate-900 text-white font-bold rounded-lg text-sm hover:bg-slate-800 disabled:opacity-50">
                {saving ? "Saving..." : "Save"}
              </button>
              <button onClick={() => setEditing(null)} className="px-5 py-2 bg-slate-100 text-slate-600 font-semibold rounded-lg text-sm hover:bg-slate-200">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Document list */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading...</div>
      ) : (
        <div className="space-y-2">
          {filtered.map(doc => (
            <div key={doc.id} className="bg-white border border-slate-200 rounded-lg px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors">
              <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
                <Icon name={CATEGORY_ICONS[doc.category] || "file"} size={16} className="text-slate-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900 truncate">{doc.title}</span>
                  <span className={`text-[0.6rem] font-bold px-1.5 py-0.5 rounded-full ${STATUS_STYLES[doc.status] || STATUS_STYLES.draft}`}>
                    {doc.status.replace("_", " ")}
                  </span>
                </div>
                <p className="text-xs text-slate-500 truncate mt-0.5">
                  {doc.counterparty && <span>{doc.counterparty}</span>}
                  {doc.counterparty && doc.description && <span className="mx-1">·</span>}
                  {doc.description}
                </p>
                {doc.expires_at && (
                  <p className={`text-[0.6rem] mt-0.5 ${new Date(doc.expires_at) < new Date() ? "text-red-600 font-bold" : "text-slate-400"}`}>
                    {new Date(doc.expires_at) < new Date() ? "EXPIRED" : "Expires"}: {new Date(doc.expires_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                )}
              </div>
              <div className="flex gap-1.5 shrink-0">
                {doc.file_url && (
                  <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="p-1.5 text-slate-400 hover:text-blue-600 rounded">
                    <Icon name="external-link" size={14} />
                  </a>
                )}
                <button onClick={() => setEditing(doc)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded">
                  <Icon name="pencil" size={14} />
                </button>
                <button onClick={() => handleDelete(doc.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded">
                  <Icon name="trash-2" size={14} />
                </button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-8 text-slate-400 text-sm">No documents in this category.</div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={deleteId != null}
        title="Delete legal document?"
        message="This legal document will be permanently removed. This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </AdminShell>
  );
}
