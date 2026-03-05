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
  const [tab, setTab] = useState<"advisors" | "leads" | "reviews" | "outreach">("advisors");
  const [advisors, setAdvisors] = useState<Professional[]>([]);
  const [leads, setLeads] = useState<(ProfessionalLead & { professional?: Professional })[]>([]);
  const [pendingReviews, setPendingReviews] = useState<(Record<string, unknown>)[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Professional> | null>(null);
  const [saving, setSaving] = useState(false);
  const [specialtyInput, setSpecialtyInput] = useState("");

  const supabase = createClient();

  const loadData = useCallback(async () => {
    setLoading(true);
    const [advisorRes, leadRes, reviewRes] = await Promise.all([
      supabase.from("professionals").select("*").order("created_at", { ascending: false }),
      supabase.from("professional_leads").select("*, professionals(name, firm_name, type)").order("created_at", { ascending: false }).limit(100),
      supabase.from("professional_reviews").select("*, professionals(name)").order("created_at", { ascending: false }).limit(50),
    ]);
    setAdvisors((advisorRes.data as Professional[]) || []);
    setLeads((leadRes.data || []).map((l: Record<string, unknown>) => ({
      ...l,
      professional: (l as Record<string, unknown>).professionals as Professional | undefined,
    })) as (ProfessionalLead & { professional?: Professional })[]);
    setPendingReviews((reviewRes.data || []) as Record<string, unknown>[]);
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
                <tr key={r.id as number} className={`hover:bg-slate-50 ${r.status === "pending" ? "bg-amber-50/30" : ""}`}>
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                    {new Date(r.created_at as string).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-xs">{r.reviewer_name as string}</div>
                    <div className="text-[0.62rem] text-slate-400">{r.reviewer_email as string}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {(r.professionals as Record<string, unknown>)?.name as string || `ID: ${r.professional_id}`}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-amber-400 text-xs">{"★".repeat(r.rating as number)}</span>
                  </td>
                  <td className="px-4 py-3 max-w-[250px]">
                    {r.title && <div className="text-xs font-semibold text-slate-800 truncate">{r.title as string}</div>}
                    <div className="text-xs text-slate-500 truncate">{r.body as string}</div>
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
                        {r.status as string}
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
    </div>
  );
}
