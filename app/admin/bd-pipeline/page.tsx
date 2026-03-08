"use client";

import { useState, useEffect } from "react";
import Icon from "@/components/Icon";

type Deal = {
  id: number; company_name: string; contact_name: string | null; contact_email: string | null;
  contact_linkedin: string | null; partnership_type: string; status: string;
  cpa_rate: string | null; deal_notes: string | null; next_action: string | null;
  next_action_date: string | null; last_contact_date: string | null;
  created_at: string; updated_at: string;
};

const STATUSES = ["cold", "contacted", "warm", "negotiating", "signed", "declined", "paused"];
const TYPES = ["affiliate", "sponsored", "advisor", "media", "content", "bank", "super_fund"];

const STATUS_COLORS: Record<string, string> = {
  cold: "bg-slate-100 text-slate-700",
  contacted: "bg-blue-100 text-blue-700",
  warm: "bg-amber-100 text-amber-700",
  negotiating: "bg-violet-100 text-violet-700",
  signed: "bg-emerald-100 text-emerald-700",
  declined: "bg-red-100 text-red-700",
  paused: "bg-slate-200 text-slate-500",
};

const EMPTY: Partial<Deal> = {
  company_name: "", contact_name: "", contact_email: "", contact_linkedin: "",
  partnership_type: "affiliate", status: "cold", cpa_rate: "", deal_notes: "",
  next_action: "", next_action_date: "", last_contact_date: "",
};

export default function BDPipelinePage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Deal> | null>(null);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  const fetchDeals = async () => {
    const res = await fetch("/api/admin/bd-pipeline");
    setDeals(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchDeals(); }, []);

  const save = async () => {
    if (!editing?.company_name) return;
    setSaving(true);
    await fetch("/api/admin/bd-pipeline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing),
    });
    setEditing(null);
    setSaving(false);
    fetchDeals();
  };

  const remove = async (id: number) => {
    if (!confirm("Delete this deal?")) return;
    await fetch("/api/admin/bd-pipeline", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchDeals();
  };

  const filtered = filter === "all" ? deals : deals.filter(d => d.status === filter);
  const counts = STATUSES.reduce((acc, s) => ({ ...acc, [s]: deals.filter(d => d.status === s).length }), {} as Record<string, number>);

  if (loading) return <div className="p-6 animate-pulse"><div className="h-8 w-48 bg-slate-200 rounded mb-4" /><div className="h-64 bg-slate-100 rounded-xl" /></div>;

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900">BD Pipeline</h1>
          <p className="text-xs text-slate-500">{deals.length} partnerships tracked · {counts.signed || 0} signed · {counts.negotiating || 0} negotiating</p>
        </div>
        <button onClick={() => setEditing({ ...EMPTY })} className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800">+ Add Deal</button>
      </div>

      {/* Status filter pills */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        <button onClick={() => setFilter("all")} className={`px-3 py-1.5 text-xs font-semibold rounded-full ${filter === "all" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}>
          All ({deals.length})
        </button>
        {STATUSES.map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 text-xs font-semibold rounded-full capitalize ${filter === s ? "bg-slate-900 text-white" : STATUS_COLORS[s]}`}>
            {s} ({counts[s] || 0})
          </button>
        ))}
      </div>

      {/* Deal cards */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-500">
          {filter === "all" ? "No partnerships yet. Click '+ Add Deal' to start tracking your first broker conversation." : `No ${filter} deals.`}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(deal => (
            <div key={deal.id} className="bg-white border border-slate-200 rounded-lg p-4 hover:border-slate-300 transition-all">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-sm font-bold text-slate-900">{deal.company_name}</span>
                    <span className={`text-[0.56rem] font-bold px-1.5 py-0.5 rounded-full capitalize ${STATUS_COLORS[deal.status] || "bg-slate-100"}`}>{deal.status}</span>
                    <span className="text-[0.56rem] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded capitalize">{deal.partnership_type}</span>
                    {deal.cpa_rate && <span className="text-[0.56rem] bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.5 rounded">{deal.cpa_rate}</span>}
                  </div>
                  {deal.contact_name && <p className="text-xs text-slate-600">{deal.contact_name} {deal.contact_email && `· ${deal.contact_email}`}</p>}
                  {deal.next_action && (
                    <p className="text-xs text-violet-600 mt-1 font-semibold">
                      Next: {deal.next_action} {deal.next_action_date && `(${new Date(deal.next_action_date).toLocaleDateString("en-AU", { day: "numeric", month: "short" })})`}
                    </p>
                  )}
                  {deal.deal_notes && <p className="text-xs text-slate-400 mt-1 truncate">{deal.deal_notes}</p>}
                  <div className="text-[0.5rem] text-slate-300 mt-1">
                    {deal.last_contact_date && `Last contact: ${new Date(deal.last_contact_date).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}`}
                    {deal.last_contact_date && " · "}
                    Added {new Date(deal.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => setEditing(deal)} className="p-1.5 text-slate-400 hover:text-slate-700"><Icon name="settings" size={14} /></button>
                  <button onClick={() => remove(deal.id)} className="p-1.5 text-slate-400 hover:text-red-600"><Icon name="x-circle" size={14} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit / Add modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-100">
              <h2 className="text-base font-bold">{editing.id ? "Edit Deal" : "New Deal"}</h2>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700">Company Name *</label>
                <input value={editing.company_name || ""} onChange={e => setEditing({ ...editing, company_name: e.target.value })} className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg" placeholder="e.g. Pepperstone" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700">Contact Name</label>
                  <input value={editing.contact_name || ""} onChange={e => setEditing({ ...editing, contact_name: e.target.value })} className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">Contact Email</label>
                  <input value={editing.contact_email || ""} onChange={e => setEditing({ ...editing, contact_email: e.target.value })} className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">LinkedIn URL</label>
                <input value={editing.contact_linkedin || ""} onChange={e => setEditing({ ...editing, contact_linkedin: e.target.value })} className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg" placeholder="https://linkedin.com/in/..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700">Type</label>
                  <select value={editing.partnership_type || "affiliate"} onChange={e => setEditing({ ...editing, partnership_type: e.target.value })} className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg">
                    {TYPES.map(t => <option key={t} value={t} className="capitalize">{t.replace("_", " ")}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">Status</label>
                  <select value={editing.status || "cold"} onChange={e => setEditing({ ...editing, status: e.target.value })} className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg">
                    {STATUSES.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">CPA Rate / Deal Terms</label>
                <input value={editing.cpa_rate || ""} onChange={e => setEditing({ ...editing, cpa_rate: e.target.value })} className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg" placeholder="e.g. $400 per account, 60-day cookie" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">Notes</label>
                <textarea value={editing.deal_notes || ""} onChange={e => setEditing({ ...editing, deal_notes: e.target.value })} className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg h-20" placeholder="Conversation history, key details..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700">Next Action</label>
                  <input value={editing.next_action || ""} onChange={e => setEditing({ ...editing, next_action: e.target.value })} className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg" placeholder="e.g. Follow up email" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">Next Action Date</label>
                  <input type="date" value={editing.next_action_date || ""} onChange={e => setEditing({ ...editing, next_action_date: e.target.value })} className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">Last Contact Date</label>
                <input type="date" value={editing.last_contact_date || ""} onChange={e => setEditing({ ...editing, last_contact_date: e.target.value })} className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg" />
              </div>
            </div>
            <div className="p-5 border-t border-slate-100 flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg">Cancel</button>
              <button onClick={save} disabled={saving || !editing.company_name} className="px-4 py-2 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-slate-800 disabled:opacity-50">
                {saving ? "Saving..." : editing.id ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
