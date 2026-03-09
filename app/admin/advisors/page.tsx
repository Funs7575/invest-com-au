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
  const [tab, setTab] = useState<"advisors" | "leads" | "reviews" | "outreach" | "applications" | "disputes">("advisors");
  const [applications, setApplications] = useState<Record<string, unknown>[]>([]);
  const [disputes, setDisputes] = useState<Record<string, unknown>[]>([]);
  const [advisors, setAdvisors] = useState<Professional[]>([]);
  const [leads, setLeads] = useState<(ProfessionalLead & { professional?: Professional })[]>([]);
  const [pendingReviews, setPendingReviews] = useState<(Record<string, unknown>)[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Professional> | null>(null);
  const [saving, setSaving] = useState(false);
  const [specialtyInput, setSpecialtyInput] = useState("");
  const [expandedAppId, setExpandedAppId] = useState<number | null>(null);
  const [appStatusFilter, setAppStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");

  const supabase = createClient();

  const loadData = useCallback(async () => {
    setLoading(true);
    const [advisorRes, leadRes, reviewRes, appRes, disputeRes] = await Promise.all([
      supabase.from("professionals").select("*").order("created_at", { ascending: false }),
      supabase.from("professional_leads").select("*, professionals(name, firm_name, type)").order("created_at", { ascending: false }).limit(100),
      supabase.from("professional_reviews").select("*, professionals(name)").order("created_at", { ascending: false }).limit(50),
      supabase.from("advisor_applications").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("lead_disputes").select("*, professional_leads(user_name, user_email), professionals(name)").order("created_at", { ascending: false }).limit(50),
    ]);
    setAdvisors((advisorRes.data as Professional[]) || []);
    setLeads((leadRes.data || []).map((l: Record<string, unknown>) => ({
      ...l,
      professional: (l as Record<string, unknown>).professionals as Professional | undefined,
    })) as (ProfessionalLead & { professional?: Professional })[]);
    setPendingReviews((reviewRes.data || []) as Record<string, unknown>[]);
    setApplications((appRes.data || []) as Record<string, unknown>[]);
    setDisputes((disputeRes.data || []) as Record<string, unknown>[]);
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
      <div className="flex gap-2 mb-6 flex-wrap">
        <button onClick={() => setTab("advisors")} className={`px-4 py-2 rounded-lg font-semibold text-sm ${tab === "advisors" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}>
          Advisors ({advisors.length})
        </button>
        <button onClick={() => setTab("leads")} className={`px-4 py-2 rounded-lg font-semibold text-sm ${tab === "leads" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}>
          Leads ({leads.length})
        </button>
        <button onClick={() => setTab("reviews")} className={`px-4 py-2 rounded-lg font-semibold text-sm ${tab === "reviews" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}>
          Reviews ({pendingReviews.filter((r) => r.status === "pending").length} pending)
        </button>
        <button onClick={() => setTab("outreach")} className={`px-4 py-2 rounded-lg font-semibold text-sm ${tab === "outreach" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}>
          Outreach
        </button>
        <button onClick={() => setTab("applications")} className={`px-4 py-2 rounded-lg font-semibold text-sm ${tab === "applications" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}>
          Applications ({applications.filter(a => a.status === "pending").length})
        </button>
        <button onClick={() => setTab("disputes")} className={`px-4 py-2 rounded-lg font-semibold text-sm ${tab === "disputes" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}>
          Disputes ({disputes.filter(d => d.status === "pending").length})
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
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Photo</label>
                  <div className="flex items-center gap-3">
                    {editing.photo_url && (
                      <img src={editing.photo_url} alt="Preview" className="w-12 h-12 rounded-full object-cover border border-slate-200" />
                    )}
                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const slug = editing.slug || "temp";
                          const ext = file.name.split(".").pop();
                          const path = `advisor-photos/${slug}.${ext}`;
                          const supabaseUpload = createClient();
                          const { error } = await supabaseUpload.storage.from("public").upload(path, file, { upsert: true });
                          if (!error) {
                            const { data: urlData } = supabaseUpload.storage.from("public").getPublicUrl(path);
                            setEditing({ ...editing, photo_url: urlData.publicUrl });
                          } else {
                            alert("Upload failed: " + error.message);
                          }
                        }}
                        className="w-full text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-slate-100 file:text-slate-600 file:font-semibold file:cursor-pointer hover:file:bg-slate-200"
                      />
                      <input
                        value={editing.photo_url || ""}
                        onChange={(e) => setEditing({ ...editing, photo_url: e.target.value })}
                        className="w-full px-3 py-1.5 border rounded-lg text-xs mt-1.5 text-slate-400"
                        placeholder="Or paste URL..."
                      />
                    </div>
                  </div>
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
                          {a.email && (
                            <button
                              onClick={async () => {
                                if (!confirm(`Send welcome email to ${a.email}?`)) return;
                                const res = await fetch("/api/advisor-welcome", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ name: a.name, email: a.email, firm_name: a.firm_name, slug: a.slug, type: a.type }),
                                });
                                alert(res.ok ? "Welcome email sent!" : "Failed to send email");
                              }}
                              className="text-xs text-purple-600 hover:text-purple-800 font-semibold"
                            >
                              Welcome Email
                            </button>
                          )}
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
        <>
          {/* CSV Export */}
          {leads.length > 0 && (
            <button
              onClick={() => {
                const csv = [
                  ["Date", "Name", "Email", "Phone", "Advisor", "Message", "Status"].join(","),
                  ...leads.map(l => [
                    new Date(l.created_at).toISOString().split("T")[0],
                    `"${l.user_name}"`,
                    l.user_email,
                    l.user_phone || "",
                    `"${l.professional?.name || ""}"`,
                    `"${(l.message || "").replace(/"/g, '""')}"`,
                    l.status,
                  ].join(","))
                ].join("\n");
                const blob = new Blob([csv], { type: "text/csv" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `advisor-leads-${new Date().toISOString().split("T")[0]}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="mb-4 px-4 py-2 bg-emerald-600 text-white font-semibold rounded-lg text-sm hover:bg-emerald-700"
            >
              Export CSV ({leads.length} leads)
            </button>
          )}
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
                  <td className="px-4 py-3 max-w-[250px]">
                    {l.message ? (
                      <details className="group">
                        <summary className="text-xs text-slate-500 truncate cursor-pointer hover:text-slate-700">{l.message}</summary>
                        <p className="text-xs text-slate-600 mt-1 whitespace-pre-wrap bg-slate-50 rounded p-2">{l.message}</p>
                      </details>
                    ) : <span className="text-xs text-slate-400">—</span>}
                  </td>
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
        </>
      )}

      {/* ─── REVIEWS TAB ─── */}
      {tab === "reviews" && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="px-4 py-3 font-semibold text-slate-600">Date</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Reviewer</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Advisor</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Rating</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Review</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pendingReviews.map((r) => (
                <tr key={String(r.id)} className={`hover:bg-slate-50 ${r.status === "pending" ? "bg-amber-50/30" : ""}`}>
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                    {new Date(String(r.created_at)).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-xs">{String(r.reviewer_name)}</div>
                    <div className="text-[0.62rem] text-slate-400">{String(r.reviewer_email)}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {String((r.professionals as Record<string, unknown>)?.name || `ID: ${r.professional_id}`)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-amber-400 text-xs">{"★".repeat(Number(r.rating) || 0)}</span>
                  </td>
                  <td className="px-4 py-3 max-w-[250px]">
                    {r.title ? <div className="text-xs font-semibold text-slate-800 truncate">{String(r.title)}</div> : null}
                    <div className="text-xs text-slate-500 truncate">{String(r.body || "")}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {r.status === "pending" && (
                        <>
                          <button
                            onClick={async () => {
                              await supabase.from("professional_reviews").update({ status: "approved" }).eq("id", r.id);
                              // Update advisor rating
                              const { data: allReviews } = await supabase.from("professional_reviews").select("rating").eq("professional_id", r.professional_id).eq("status", "approved");
                              if (allReviews && allReviews.length > 0) {
                                const avg = allReviews.reduce((s, rv) => s + rv.rating, 0) / allReviews.length;
                                await supabase.from("professionals").update({ rating: Math.round(avg * 10) / 10, review_count: allReviews.length }).eq("id", r.professional_id);
                              }
                              loadData();
                            }}
                            className="text-xs text-emerald-600 hover:text-emerald-800 font-semibold"
                          >
                            Approve
                          </button>
                          <button
                            onClick={async () => {
                              await supabase.from("professional_reviews").update({ status: "rejected" }).eq("id", r.id);
                              loadData();
                            }}
                            className="text-xs text-red-500 hover:text-red-700 font-semibold"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      <span className={`text-[0.62rem] font-semibold px-1.5 py-0.5 rounded-full ${
                        r.status === "approved" ? "bg-emerald-100 text-emerald-700" :
                        r.status === "rejected" ? "bg-red-100 text-red-600" :
                        "bg-amber-100 text-amber-700"
                      }`}>
                        {String(r.status)}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {pendingReviews.length === 0 && (
            <div className="text-center py-12 text-slate-400">No reviews yet.</div>
          )}
        </div>
      )}

      {/* ─── OUTREACH TAB ─── */}
      {tab === "outreach" && (
        <div className="max-w-xl">
          <p className="text-sm text-slate-600 mb-4">Send an invitation email to a financial professional to list on invest.com.au. The email explains the free listing model and asks them to reply with their details.</p>
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Advisor Name *</label>
              <input id="outreach-name" className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Sarah Chen" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Email *</label>
              <input id="outreach-email" type="email" className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="sarah@example.com" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Firm Name</label>
              <input id="outreach-firm" className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Chen Advisory" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Advisor Type</label>
              <select id="outreach-type" className="w-full px-3 py-2 border rounded-lg text-sm">
                {Object.entries(PROFESSIONAL_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <button
              onClick={async () => {
                const name = (document.getElementById("outreach-name") as HTMLInputElement).value;
                const email = (document.getElementById("outreach-email") as HTMLInputElement).value;
                const firm = (document.getElementById("outreach-firm") as HTMLInputElement).value;
                const type = (document.getElementById("outreach-type") as HTMLSelectElement).value;
                if (!name || !email) { alert("Name and email required"); return; }
                const res = await fetch("/api/advisor-outreach", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ to_email: email, to_name: name, firm_name: firm, advisor_type: type }),
                });
                alert(res.ok ? `Outreach email sent to ${email}!` : "Failed to send");
              }}
              className="w-full py-2.5 bg-slate-900 text-white font-semibold rounded-lg text-sm hover:bg-slate-800"
            >
              Send Invitation Email
            </button>
          </div>
        </div>
      )}

      {/* ─── APPLICATIONS TAB ─── */}
      {tab === "applications" && (
        <div>
          <p className="text-sm text-slate-600 mb-4">Review advisor applications. Expand each card to see full details, then approve or reject.</p>

          {/* Filter bar */}
          <div className="flex gap-2 mb-4">
            {(["all", "pending", "approved", "rejected"] as const).map((s) => {
              const count = s === "all" ? applications.length : applications.filter(a => a.status === s).length;
              return (
                <button
                  key={s}
                  onClick={() => setAppStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    appStatusFilter === s
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)} ({count})
                </button>
              );
            })}
          </div>

          {applications.filter(a => appStatusFilter === "all" || a.status === appStatusFilter).length === 0 ? (
            <div className="text-center py-12 text-slate-400">No {appStatusFilter === "all" ? "" : appStatusFilter + " "}applications.</div>
          ) : (
            <div className="space-y-3">
              {applications
                .filter(a => appStatusFilter === "all" || a.status === appStatusFilter)
                .map((app) => {
                  const isExpanded = expandedAppId === Number(app.id);
                  return (
                    <div key={String(app.id)} className={`bg-white border rounded-xl ${app.status === "pending" ? "border-amber-200 bg-amber-50/30" : "border-slate-200"}`}>
                      {/* Header row */}
                      <div className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-slate-900">{String(app.name)}</span>
                            {!!app.firm_name && <span className="text-xs text-slate-500">— {String(app.firm_name)}</span>}
                            <span className={`text-[0.56rem] font-bold px-1.5 py-0.5 rounded-full ${
                              app.status === "pending" ? "bg-amber-100 text-amber-700" :
                              app.status === "approved" ? "bg-emerald-100 text-emerald-700" :
                              "bg-red-100 text-red-600"
                            }`}>{String(app.status)}</span>
                            {!!app.account_type && (
                              <span className="text-[0.56rem] font-semibold text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded">
                                {app.account_type === "firm" ? "Firm" : "Individual"}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-slate-400 whitespace-nowrap ml-3">
                            {new Date(String(app.created_at)).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                        </div>

                        {/* Quick info row */}
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap text-xs text-slate-500">
                          <span>{String(app.email)}</span>
                          {!!app.phone && <span>{String(app.phone)}</span>}
                          <span className="text-slate-400">|</span>
                          <span>{PROFESSIONAL_TYPE_LABELS[String(app.type) as keyof typeof PROFESSIONAL_TYPE_LABELS] || String(app.type)}</span>
                          {(!!app.location_suburb || !!app.location_state) && (
                            <>
                              <span className="text-slate-400">|</span>
                              <span>{[app.location_suburb, app.location_state].filter(Boolean).map(String).join(", ")}</span>
                            </>
                          )}
                        </div>

                        {/* Expand/Collapse button */}
                        <button
                          onClick={() => setExpandedAppId(isExpanded ? null : Number(app.id))}
                          className="mt-2 text-xs font-semibold text-blue-600 hover:text-blue-800"
                        >
                          {isExpanded ? "Collapse" : "Expand Details"}
                        </button>
                      </div>

                      {/* Expanded detail view */}
                      {isExpanded && (
                        <div className="border-t border-slate-200 p-4 space-y-4">
                          {/* Credentials section */}
                          <div>
                            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">Credentials</h4>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              <div>
                                <span className="block text-[0.62rem] font-semibold text-slate-400 uppercase">AFSL</span>
                                <span className="text-xs text-slate-700">{app.afsl_number ? String(app.afsl_number) : "—"}</span>
                              </div>
                              <div>
                                <span className="block text-[0.62rem] font-semibold text-slate-400 uppercase">Registration / TAN</span>
                                <span className="text-xs text-slate-700">{app.registration_number ? String(app.registration_number) : "—"}</span>
                              </div>
                              <div>
                                <span className="block text-[0.62rem] font-semibold text-slate-400 uppercase">ABN</span>
                                <span className="text-xs text-slate-700">{app.abn ? String(app.abn) : "—"}</span>
                              </div>
                              <div>
                                <span className="block text-[0.62rem] font-semibold text-slate-400 uppercase">Website</span>
                                {app.website ? (
                                  <a href={String(app.website)} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:text-blue-800 truncate block">{String(app.website)}</a>
                                ) : (
                                  <span className="text-xs text-slate-700">—</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Photo */}
                          {!!app.photo_url && (
                            <div>
                              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">Photo</h4>
                              <img src={String(app.photo_url)} alt={String(app.name)} className="w-20 h-20 rounded-full object-cover border-2 border-slate-200" />
                            </div>
                          )}

                          {/* About section */}
                          <div>
                            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">About</h4>
                            {app.bio ? (
                              <p className="text-xs text-slate-600 whitespace-pre-wrap bg-slate-50 rounded-lg p-3 mb-2">{String(app.bio)}</p>
                            ) : (
                              <p className="text-xs text-slate-400 mb-2">No bio provided.</p>
                            )}
                            {!!app.specialties && String(app.specialties).trim() && (
                              <div className="mb-2">
                                <span className="text-[0.62rem] font-semibold text-slate-400 uppercase">Specialties</span>
                                <div className="flex flex-wrap gap-1.5 mt-1">
                                  {String(app.specialties).split(",").map((s: string) => s.trim()).filter(Boolean).map((s, i) => (
                                    <span key={i} className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">{s}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {!!app.fee_description && (
                              <div>
                                <span className="text-[0.62rem] font-semibold text-slate-400 uppercase">Fees</span>
                                <p className="text-xs text-slate-600 mt-0.5">{String(app.fee_description)}</p>
                              </div>
                            )}
                          </div>

                          {/* Location section */}
                          <div>
                            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">Location</h4>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <span className="block text-[0.62rem] font-semibold text-slate-400 uppercase">State</span>
                                <span className="text-xs text-slate-700">{app.location_state ? String(app.location_state) : "—"}</span>
                              </div>
                              <div>
                                <span className="block text-[0.62rem] font-semibold text-slate-400 uppercase">Suburb</span>
                                <span className="text-xs text-slate-700">{app.location_suburb ? String(app.location_suburb) : "—"}</span>
                              </div>
                            </div>
                          </div>

                          {/* Referral section */}
                          {!!app.referral_source && (
                            <div>
                              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">Referral</h4>
                              <span className="text-xs text-slate-600">{String(app.referral_source)}</span>
                            </div>
                          )}

                          {/* Action buttons for pending applications */}
                          {app.status === "pending" && (
                            <div className="flex gap-3 pt-2 border-t border-slate-100">
                              <button
                                onClick={async () => {
                                  if (!confirm(`Approve ${String(app.name)}? This will create their listing, send a magic link, and email them.`)) return;
                                  try {
                                    const res = await fetch("/api/admin/advisor-applications", {
                                      method: "PATCH",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ applicationId: app.id, action: "approve" }),
                                    });
                                    if (res.ok) {
                                      alert("Approved! Listing created and login link emailed.");
                                      setExpandedAppId(null);
                                      loadData();
                                    } else {
                                      const data = await res.json();
                                      alert(data.error || "Failed to approve.");
                                    }
                                  } catch { alert("Network error."); }
                                }}
                                className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 px-4 py-2 border border-emerald-200 rounded-lg hover:bg-emerald-50"
                              >Approve & Create Listing</button>
                              <button
                                onClick={async () => {
                                  const reason = prompt("Rejection reason (will be emailed to applicant):");
                                  if (reason == null) return;
                                  try {
                                    const res = await fetch("/api/admin/advisor-applications", {
                                      method: "PATCH",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ applicationId: app.id, action: "reject", rejectionReason: reason }),
                                    });
                                    if (res.ok) {
                                      alert("Rejected. Applicant has been notified.");
                                      setExpandedAppId(null);
                                      loadData();
                                    } else {
                                      const data = await res.json();
                                      alert(data.error || "Failed to reject.");
                                    }
                                  } catch { alert("Network error."); }
                                }}
                                className="text-xs font-semibold text-red-500 hover:text-red-700 px-4 py-2 border border-red-200 rounded-lg hover:bg-red-50"
                              >Reject</button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* ─── DISPUTES TAB ─── */}
      {tab === "disputes" && (
        <div>
          <p className="text-sm text-slate-600 mb-4">Review lead disputes from advisors. Approve to waive the charge or reject to uphold it.</p>
          {disputes.length === 0 ? (
            <div className="text-center py-12 text-slate-400">No disputes filed.</div>
          ) : (
            <div className="space-y-3">
              {disputes.map((d) => {
                const leadInfo = d.professional_leads as Record<string, unknown> | null;
                const proInfo = d.professionals as Record<string, unknown> | null;
                return (
                  <div key={String(d.id)} className={`bg-white border rounded-xl p-4 ${d.status === "pending" ? "border-amber-200 bg-amber-50/30" : "border-slate-200"}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900">Dispute #{String(d.id)}</span>
                          <span className={`text-[0.56rem] font-bold px-1.5 py-0.5 rounded-full ${
                            d.status === "pending" ? "bg-amber-100 text-amber-700" :
                            d.status === "approved" ? "bg-emerald-100 text-emerald-700" :
                            "bg-red-100 text-red-600"
                          }`}>{String(d.status)}</span>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          Filed by: {proInfo ? String(proInfo.name) : "Unknown"} · 
                          Lead: {leadInfo ? `${String(leadInfo.user_name)} (${String(leadInfo.user_email)})` : `Lead #${String(d.lead_id)}`}
                        </div>
                        <div className="text-xs text-slate-600 mt-1">
                          <strong>Reason:</strong> {String(d.reason).replace(/_/g, " ")}
                          {!!d.details && <span className="text-slate-500"> — {String(d.details)}</span>}
                        </div>
                      </div>
                      <span className="text-xs text-slate-400">{new Date(String(d.created_at)).toLocaleDateString("en-AU")}</span>
                    </div>
                    {d.status === "pending" && (
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={async () => {
                            // Waive the billing charge
                            if (d.billing_id) {
                              await supabase.from("advisor_billing").update({ status: "waived" }).eq("id", d.billing_id);
                            }
                            await supabase.from("lead_disputes").update({ status: "approved", resolved_at: new Date().toISOString() }).eq("id", d.id);
                            alert("Dispute approved — charge waived.");
                            loadData();
                          }}
                          className="text-xs font-semibold text-emerald-600 px-3 py-1.5 border border-emerald-200 rounded-lg hover:bg-emerald-50"
                        >Approve (Waive Charge)</button>
                        <button
                          onClick={async () => {
                            await supabase.from("lead_disputes").update({ status: "rejected", admin_notes: "Charge upheld", resolved_at: new Date().toISOString() }).eq("id", d.id);
                            loadData();
                          }}
                          className="text-xs font-semibold text-red-500 px-3 py-1.5 border border-red-200 rounded-lg hover:bg-red-50"
                        >Reject (Uphold Charge)</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
