"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Professional, ProfessionalLead } from "@/lib/types";
import { PROFESSIONAL_TYPE_LABELS } from "@/lib/types";

const EMPTY_ADVISOR: Partial<Professional> = {
  name: "", slug: "", firm_name: "", type: "smsf_accountant", specialties: [],
  location_state: "", location_suburb: "", location_display: "",
  afsl_number: "", bio: "", email: "", phone: "", website: "",
  fee_structure: "", fee_description: "", verified: false, status: "active",
};

export default function AdminAdvisorsPage() {
  const [tab, setTab] = useState<"advisors" | "leads">("advisors");
  const [advisors, setAdvisors] = useState<Professional[]>([]);
  const [leads, setLeads] = useState<(ProfessionalLead & { professional?: Professional })[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Professional> | null>(null);
  const [saving, setSaving] = useState(false);
  const [specialtyInput, setSpecialtyInput] = useState("");

  const supabase = createClient();

  const loadData = useCallback(async () => {
    setLoading(true);
    const [advisorRes, leadRes] = await Promise.all([
      supabase.from("professionals").select("*").order("created_at", { ascending: false }),
      supabase.from("professional_leads").select("*, professionals(name, firm_name, type)").order("created_at", { ascending: false }).limit(100),
    ]);
    setAdvisors((advisorRes.data as Professional[]) || []);
    setLeads((leadRes.data || []).map((l: Record<string, unknown>) => ({
      ...l,
      professional: (l as Record<string, unknown>).professionals as Professional | undefined,
    })) as (ProfessionalLead & { professional?: Professional })[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSave = async () => {
    if (!editing?.name || !editing?.slug) return;
    setSaving(true);
    const payload = {
      ...editing,
      slug: editing.slug!.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-"),
    };
    
    if (editing.id) {
      await supabase.from("professionals").update(payload).eq("id", editing.id);
    } else {
      await supabase.from("professionals").insert(payload);
    }
    setSaving(false);
    setEditing(null);
    loadData();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this advisor? This cannot be undone.")) return;
    await supabase.from("professionals").delete().eq("id", id);
    loadData();
  };

  const updateLeadStatus = async (id: number, status: string) => {
    await supabase.from("professional_leads").update({ status }).eq("id", id);
    loadData();
  };

  const addSpecialty = () => {
    if (!specialtyInput.trim() || !editing) return;
    setEditing({ ...editing, specialties: [...(editing.specialties || []), specialtyInput.trim()] });
    setSpecialtyInput("");
  };

  const removeSpecialty = (idx: number) => {
    if (!editing) return;
    setEditing({ ...editing, specialties: (editing.specialties || []).filter((_, i) => i !== idx) });
  };

  const autoSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, "-");

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Advisor Directory Management</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button onClick={() => setTab("advisors")} className={`px-4 py-2 rounded-lg font-semibold text-sm ${tab === "advisors" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}>
          Advisors ({advisors.length})
        </button>
        <button onClick={() => setTab("leads")} className={`px-4 py-2 rounded-lg font-semibold text-sm ${tab === "leads" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}>
          Leads ({leads.length})
        </button>
      </div>

      {/* ─── ADVISORS TAB ─── */}
      {tab === "advisors" && (
        <>
          <button onClick={() => setEditing({ ...EMPTY_ADVISOR })} className="mb-4 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg text-sm hover:bg-blue-700">
            + Add Advisor
          </button>

          {/* Edit/Create Form */}
          {editing && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6 shadow-sm">
              <h2 className="text-lg font-bold mb-4">{editing.id ? "Edit Advisor" : "Add New Advisor"}</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Name *</label>
                  <input value={editing.name || ""} onChange={(e) => setEditing({ ...editing, name: e.target.value, ...(!editing.id ? { slug: autoSlug(e.target.value) } : {}) })} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Sarah Chen" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Slug *</label>
                  <input value={editing.slug || ""} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="sarah-chen" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Firm Name</label>
                  <input value={editing.firm_name || ""} onChange={(e) => setEditing({ ...editing, firm_name: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Chen Advisory" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Type *</label>
                  <select value={editing.type || "smsf_accountant"} onChange={(e) => setEditing({ ...editing, type: e.target.value as Professional["type"] })} className="w-full px-3 py-2 border rounded-lg text-sm">
                    {Object.entries(PROFESSIONAL_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Email</label>
                  <input type="email" value={editing.email || ""} onChange={(e) => setEditing({ ...editing, email: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="sarah@example.com" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Phone</label>
                  <input value={editing.phone || ""} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="02 1234 5678" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Location (Display)</label>
                  <input value={editing.location_display || ""} onChange={(e) => setEditing({ ...editing, location_display: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Sydney CBD, NSW" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">State</label>
                  <select value={editing.location_state || ""} onChange={(e) => setEditing({ ...editing, location_state: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm">
                    <option value="">Select state</option>
                    {["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"].map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">AFSL / Registration #</label>
                  <input value={editing.afsl_number || ""} onChange={(e) => setEditing({ ...editing, afsl_number: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="AFSL 234567" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Fee Description</label>
                  <input value={editing.fee_description || ""} onChange={(e) => setEditing({ ...editing, fee_description: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="From $2,200/yr" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Website</label>
                  <input value={editing.website || ""} onChange={(e) => setEditing({ ...editing, website: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="https://..." />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Photo URL</label>
                  <input value={editing.photo_url || ""} onChange={(e) => setEditing({ ...editing, photo_url: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="https://..." />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Bio</label>
                <textarea value={editing.bio || ""} onChange={(e) => setEditing({ ...editing, bio: e.target.value })} rows={3} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Professional bio..." />
              </div>
              <div className="mt-4">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Specialties</label>
                <div className="flex gap-2 mb-2">
                  <input value={specialtyInput} onChange={(e) => setSpecialtyInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSpecialty())} className="flex-1 px-3 py-2 border rounded-lg text-sm" placeholder="e.g. SMSF Setup" />
                  <button onClick={addSpecialty} className="px-3 py-2 bg-slate-100 rounded-lg text-sm font-semibold hover:bg-slate-200">Add</button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(editing.specialties || []).map((s, i) => (
                    <span key={i} className="inline-flex items-center gap-1 text-xs bg-slate-100 px-2 py-1 rounded-full">
                      {s} <button onClick={() => removeSpecialty(i)} className="text-red-500 hover:text-red-700">&times;</button>
                    </span>
                  ))}
                </div>
              </div>
              <div className="mt-4 flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={editing.verified || false} onChange={(e) => setEditing({ ...editing, verified: e.target.checked })} />
                  <span className="font-semibold">Verified</span>
                </label>
                <select value={editing.status || "active"} onChange={(e) => setEditing({ ...editing, status: e.target.value })} className="px-3 py-2 border rounded-lg text-sm">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
              <div className="mt-6 flex gap-3">
                <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-slate-900 text-white font-semibold rounded-lg text-sm hover:bg-slate-800 disabled:opacity-50">
                  {saving ? "Saving..." : "Save"}
                </button>
                <button onClick={() => setEditing(null)} className="px-6 py-2 border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Advisor list */}
          {loading ? (
            <div className="text-slate-400 text-sm">Loading...</div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-slate-600">Name</th>
                    <th className="px-4 py-3 font-semibold text-slate-600">Type</th>
                    <th className="px-4 py-3 font-semibold text-slate-600">Location</th>
                    <th className="px-4 py-3 font-semibold text-slate-600">Verified</th>
                    <th className="px-4 py-3 font-semibold text-slate-600">Status</th>
                    <th className="px-4 py-3 font-semibold text-slate-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {advisors.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="font-semibold">{a.name}</div>
                        <div className="text-xs text-slate-400">{a.firm_name}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{PROFESSIONAL_TYPE_LABELS[a.type]}</td>
                      <td className="px-4 py-3 text-slate-600">{a.location_display || "—"}</td>
                      <td className="px-4 py-3">{a.verified ? <span className="text-blue-600 font-semibold">Yes</span> : <span className="text-slate-400">No</span>}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${a.status === "active" ? "bg-emerald-100 text-emerald-700" : a.status === "pending" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"}`}>
                          {a.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => setEditing(a)} className="text-xs text-blue-600 hover:text-blue-800 font-semibold">Edit</button>
                          <a href={`/advisor/${a.slug}`} target="_blank" className="text-xs text-slate-500 hover:text-slate-700 font-semibold">View</a>
                          <button onClick={() => handleDelete(a.id)} className="text-xs text-red-500 hover:text-red-700 font-semibold">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {advisors.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                  <p className="mb-2">No advisors yet.</p>
                  <button onClick={() => setEditing({ ...EMPTY_ADVISOR })} className="text-blue-600 font-semibold hover:text-blue-800">Add your first advisor →</button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ─── LEADS TAB ─── */}
      {tab === "leads" && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="px-4 py-3 font-semibold text-slate-600">Date</th>
                <th className="px-4 py-3 font-semibold text-slate-600">User</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Advisor</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Message</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leads.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                    {new Date(l.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold">{l.user_name}</div>
                    <div className="text-xs text-slate-400">{l.user_email}</div>
                    {l.user_phone && <div className="text-xs text-slate-400">{l.user_phone}</div>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{l.professional?.name || `ID: ${l.professional_id}`}</td>
                  <td className="px-4 py-3 text-xs text-slate-500 max-w-[200px] truncate">{l.message || "—"}</td>
                  <td className="px-4 py-3">
                    <select
                      value={l.status}
                      onChange={(e) => updateLeadStatus(l.id, e.target.value)}
                      className={`text-xs font-semibold px-2 py-1 rounded-lg border ${
                        l.status === "new" ? "border-blue-200 text-blue-700 bg-blue-50" :
                        l.status === "contacted" ? "border-amber-200 text-amber-700 bg-amber-50" :
                        l.status === "converted" ? "border-emerald-200 text-emerald-700 bg-emerald-50" :
                        "border-slate-200 text-slate-500"
                      }`}
                    >
                      <option value="new">New</option>
                      <option value="sent">Sent to Advisor</option>
                      <option value="contacted">Contacted</option>
                      <option value="converted">Converted</option>
                      <option value="lost">Lost</option>
                      <option value="spam">Spam</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {leads.length === 0 && (
            <div className="text-center py-12 text-slate-400">No leads yet. They&apos;ll appear here when users submit enquiries.</div>
          )}
        </div>
      )}
    </div>
  );
}
