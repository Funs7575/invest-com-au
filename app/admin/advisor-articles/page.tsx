"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";

type Article = {
  id: number; title: string; slug: string; content: string; excerpt: string;
  status: string; category: string; pricing_tier: string; payment_status: string;
  price_cents: number; author_name: string; author_firm: string; author_slug: string;
  admin_notes: string | null; rejection_reason: string | null;
  created_at: string; submitted_at: string | null; published_at: string | null;
  reviewed_at: string | null; reviewed_by: string | null;
  view_count: number; click_count: number;
  meta_title: string | null; meta_description: string | null;
  professionals?: { name: string; slug: string; firm_name: string; email: string } | null;
};

type ModLog = { id: number; action: string; performed_by: string; notes: string | null; old_status: string | null; new_status: string | null; created_at: string };

const SC: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600", submitted: "bg-blue-100 text-blue-700", in_review: "bg-amber-100 text-amber-700",
  revision_requested: "bg-orange-100 text-orange-700", approved: "bg-emerald-100 text-emerald-700",
  published: "bg-green-100 text-green-800", rejected: "bg-red-100 text-red-700",
};

const FILTERS = ["all", "submitted", "in_review", "approved", "published", "revision_requested", "rejected", "draft"];

export default function AdminAdvisorArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<Article | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [paymentRef, setPaymentRef] = useState("");
  const [busy, setBusy] = useState(false);
  const [modLog, setModLog] = useState<ModLog[]>([]);
  const [tab, setTab] = useState<"review" | "edit" | "log">("review");

  // Edit state
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editExcerpt, setEditExcerpt] = useState("");
  const [editMetaTitle, setEditMetaTitle] = useState("");
  const [editMetaDesc, setEditMetaDesc] = useState("");

  const fetchArticles = useCallback(async () => {
    const url = filter === "all" ? "/api/advisor-articles?mode=admin" : `/api/advisor-articles?mode=admin&status=${filter}`;
    const res = await fetch(url);
    setArticles(await res.json());
    setLoading(false);
  }, [filter]);

  useEffect(() => { fetchArticles(); }, [fetchArticles]);

  const selectArticle = useCallback(async (a: Article) => {
    setSelected(a);
    setAdminNotes(a.admin_notes || "");
    setEditTitle(a.title); setEditContent(a.content); setEditExcerpt(a.excerpt || "");
    setEditMetaTitle(a.meta_title || ""); setEditMetaDesc(a.meta_description || "");
    setTab("review");
    // Fetch moderation log
    const res = await fetch(`/api/advisor-articles?mode=moderation_log&article_id=${a.id}`);
    setModLog(await res.json());
  }, []);

  const doAction = async (action: string, extra: Record<string, string> = {}) => {
    if (!selected) return;
    setBusy(true);
    await fetch("/api/advisor-articles", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: selected.id, action, ...extra }),
    });
    setSelected(null); setAdminNotes(""); setPaymentRef("");
    await fetchArticles();
    setBusy(false);
  };

  const saveEdit = async () => {
    if (!selected) return;
    setBusy(true);
    await fetch("/api/advisor-articles", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: selected.id, action: "admin_edit", title: editTitle, content: editContent, excerpt: editExcerpt, meta_title: editMetaTitle || undefined, meta_description: editMetaDesc || undefined }),
    });
    // Refresh
    const res = await fetch(`/api/advisor-articles?mode=admin`);
    const refreshed: Article[] = await res.json();
    setArticles(refreshed);
    const updated = refreshed.find(a => a.id === selected.id);
    if (updated) selectArticle(updated);
    setBusy(false);
  };

  const pending = articles.filter(a => a.status === "submitted").length;
  const wordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

  // Quality indicators
  const getQuality = (a: Article) => {
    const issues: string[] = [];
    const wc = wordCount(a.content || "");
    if (wc < 300) issues.push(`Too short (${wc} words, min 500 recommended)`);
    else if (wc < 500) issues.push(`Short (${wc} words, 800+ recommended)`);
    if (!a.excerpt || a.excerpt.length < 50) issues.push("Excerpt too short or missing");
    if (a.title.length < 20) issues.push("Title too short");
    if (a.title.length > 80) issues.push("Title too long for SEO (>80 chars)");
    if ((a.content || "").includes("contact me") || (a.content || "").includes("my firm") || (a.content || "").includes("call us")) issues.push("May contain promotional language");
    return issues;
  };

  if (loading) return <div className="p-6 animate-pulse"><div className="h-8 w-48 bg-slate-200 rounded mb-4" /><div className="h-64 bg-slate-100 rounded-xl" /></div>;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Article Moderation</h1>
          <p className="text-xs text-slate-500">{articles.length} articles · {pending} pending review</p>
        </div>
        <Link href="/expert" target="_blank" className="text-xs font-semibold text-violet-600 hover:text-violet-800">View Public Page ↗</Link>
      </div>

      {/* Status filters */}
      <div className="flex gap-1.5 overflow-x-auto mb-4 pb-1">
        {FILTERS.map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all ${filter === s ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
            {s === "all" ? "All" : s.replace("_", " ")}
            {s === "submitted" && pending > 0 && <span className="ml-1 bg-red-500 text-white text-[0.5rem] rounded-full px-1.5 py-0.5">{pending}</span>}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Article list */}
        <div className="lg:col-span-2 space-y-2 max-h-[80vh] overflow-y-auto">
          {articles.map(a => {
            const issues = getQuality(a);
            return (
              <button key={a.id} onClick={() => selectArticle(a)} className={`w-full text-left bg-white border rounded-lg p-3 hover:shadow-md transition-all ${selected?.id === a.id ? "border-violet-400 ring-2 ring-violet-400/20" : "border-slate-200"}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[0.5rem] font-bold px-1.5 py-0.5 rounded-full ${SC[a.status] || SC.draft}`}>{a.status.replace("_", " ")}</span>
                  <span className="text-[0.5rem] text-slate-400 capitalize">{a.pricing_tier}</span>
                  <span className={`text-[0.5rem] font-semibold ${a.payment_status === "paid" ? "text-emerald-600" : a.payment_status === "waived" ? "text-blue-600" : "text-slate-400"}`}>{a.payment_status}</span>
                  {issues.length > 0 && <span className="text-[0.5rem] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-bold">{issues.length} issues</span>}
                </div>
                <h3 className="text-sm font-bold text-slate-900 truncate">{a.title}</h3>
                <p className="text-[0.62rem] text-slate-500">By {a.author_name} · {a.category} · {wordCount(a.content || "")} words</p>
              </button>
            );
          })}
          {articles.length === 0 && <div className="bg-white border border-slate-200 rounded-lg p-6 text-center text-sm text-slate-500">No articles.</div>}
        </div>

        {/* Detail panel */}
        <div className="lg:col-span-3">
          {selected ? (
            <div className="bg-white border border-slate-200 rounded-xl sticky top-20 max-h-[85vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-slate-100">
                <h2 className="text-base font-bold text-slate-900 truncate">{selected.title}</h2>
                <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600"><Icon name="x" size={18} /></button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-slate-100">
                {(["review", "edit", "log"] as const).map(t => (
                  <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all ${tab === t ? "border-violet-600 text-violet-700" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
                    {t === "review" ? "Review" : t === "edit" ? "Edit Content" : "Audit Log"}
                  </button>
                ))}
              </div>

              <div className="p-4">
                {/* ── REVIEW TAB ── */}
                {tab === "review" && (
                  <div className="space-y-4">
                    {/* Meta */}
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className={`font-bold px-2 py-0.5 rounded-full ${SC[selected.status]}`}>{selected.status.replace("_", " ")}</span>
                      <span className="text-slate-500">By <Link href={`/advisor/${selected.author_slug}`} target="_blank" className="text-violet-600 hover:underline">{selected.author_name}</Link></span>
                      <span className="text-slate-500">{selected.category}</span>
                      <span className="text-slate-500 capitalize">{selected.pricing_tier} (${(selected.price_cents / 100).toFixed(0)})</span>
                      <span className={selected.payment_status === "paid" ? "text-emerald-600 font-semibold" : "text-slate-400"}>{selected.payment_status}</span>
                    </div>

                    {/* Quality check */}
                    {(() => {
                      const issues = getQuality(selected);
                      if (issues.length === 0) return <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-700 flex items-center gap-2"><Icon name="check-circle" size={14} /> Content passes all quality checks</div>;
                      return (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                          <p className="text-xs font-bold text-amber-700 mb-1">Quality Issues ({issues.length})</p>
                          {issues.map((issue, i) => <p key={i} className="text-xs text-amber-600">• {issue}</p>)}
                        </div>
                      );
                    })()}

                    {/* Content preview */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-700">Content Preview</span>
                        <span className="text-[0.62rem] text-slate-400">{wordCount(selected.content || "")} words</span>
                      </div>
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 max-h-48 overflow-y-auto text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                        {selected.content}
                      </div>
                    </div>

                    {/* Dates */}
                    <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                      <span>Created: {new Date(selected.created_at).toLocaleDateString("en-AU")}</span>
                      {selected.submitted_at && <span>Submitted: {new Date(selected.submitted_at).toLocaleDateString("en-AU")}</span>}
                      {selected.reviewed_at && <span>Reviewed: {new Date(selected.reviewed_at).toLocaleDateString("en-AU")} by {selected.reviewed_by}</span>}
                      {selected.published_at && <span>Published: {new Date(selected.published_at).toLocaleDateString("en-AU")}</span>}
                      <span>{selected.view_count} views · {selected.click_count} clicks</span>
                    </div>

                    {/* Admin notes */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Admin Notes <span className="font-normal text-slate-400">(visible to advisor)</span></label>
                      <textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)} rows={2} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" placeholder="Feedback for the advisor..." />
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                      {(selected.status === "submitted" || selected.status === "in_review") && (
                        <>
                          <button onClick={() => doAction("approve", { admin_notes: adminNotes })} disabled={busy} className="px-3 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 disabled:opacity-50">✓ Approve</button>
                          <button onClick={() => doAction("request_revision", { admin_notes: adminNotes || "Please revise" })} disabled={busy} className="px-3 py-2 bg-orange-500 text-white text-xs font-bold rounded-lg hover:bg-orange-600 disabled:opacity-50">↻ Request Revision</button>
                          <button onClick={() => { const r = prompt("Rejection reason:"); if (r) doAction("reject", { rejection_reason: r }); }} disabled={busy} className="px-3 py-2 bg-red-500 text-white text-xs font-bold rounded-lg hover:bg-red-600 disabled:opacity-50">✗ Reject</button>
                        </>
                      )}
                      {selected.status === "approved" && selected.payment_status === "unpaid" && (
                        <>
                          <div className="flex items-center gap-1.5">
                            <input value={paymentRef} onChange={e => setPaymentRef(e.target.value)} placeholder="Payment ref" className="px-2 py-1.5 text-xs border border-slate-200 rounded-lg w-28" />
                            <button onClick={() => doAction("mark_paid", { payment_reference: paymentRef || "manual" })} disabled={busy} className="px-3 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg disabled:opacity-50">Mark Paid</button>
                          </div>
                          <button onClick={() => doAction("waive_fee")} disabled={busy} className="px-3 py-2 border border-slate-300 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50 disabled:opacity-50">Waive Fee</button>
                        </>
                      )}
                      {selected.status === "approved" && (selected.payment_status === "paid" || selected.payment_status === "waived") && (
                        <button onClick={() => doAction("publish")} disabled={busy} className="px-4 py-2 bg-green-600 text-white text-sm font-bold rounded-lg hover:bg-green-700 disabled:opacity-50">🚀 Publish Now</button>
                      )}
                      {selected.status === "published" && selected.slug && (
                        <Link href={`/expert/${selected.slug}`} target="_blank" className="px-3 py-2 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50">View Published ↗</Link>
                      )}
                    </div>
                  </div>
                )}

                {/* ── EDIT TAB ── */}
                {tab === "edit" && (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-500">Edit the article content before publishing. Changes are saved separately from status actions.</p>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Title</label>
                      <input value={editTitle} onChange={e => setEditTitle(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Excerpt</label>
                      <textarea value={editExcerpt} onChange={e => setEditExcerpt(e.target.value)} rows={2} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-slate-700">Content (Markdown)</label>
                        <span className="text-[0.62rem] text-slate-400">{wordCount(editContent)} words</span>
                      </div>
                      <textarea value={editContent} onChange={e => setEditContent(e.target.value)} rows={14} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg font-mono resize-vertical" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Meta Title <span className="font-normal text-slate-400">(SEO)</span></label>
                        <input value={editMetaTitle} onChange={e => setEditMetaTitle(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" placeholder="Auto-generated if empty" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Meta Description</label>
                        <input value={editMetaDesc} onChange={e => setEditMetaDesc(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" placeholder="Auto-generated if empty" />
                      </div>
                    </div>
                    <button onClick={saveEdit} disabled={busy} className="px-4 py-2 bg-violet-600 text-white text-sm font-bold rounded-lg hover:bg-violet-700 disabled:opacity-50">
                      {busy ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                )}

                {/* ── AUDIT LOG TAB ── */}
                {tab === "log" && (
                  <div>
                    <p className="text-xs text-slate-500 mb-3">Complete history of moderation actions on this article.</p>
                    {modLog.length > 0 ? (
                      <div className="space-y-2">
                        {modLog.map(log => (
                          <div key={log.id} className="flex items-start gap-3 text-xs border-b border-slate-100 pb-2">
                            <div className="w-16 shrink-0 text-[0.56rem] text-slate-400">
                              {new Date(log.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                              <br />
                              {new Date(log.created_at).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" })}
                            </div>
                            <div className="flex-1">
                              <span className={`font-bold px-1.5 py-0.5 rounded text-[0.56rem] ${SC[log.new_status || ""] || "bg-slate-100 text-slate-600"}`}>{log.action.replace("_", " ")}</span>
                              <span className="text-slate-500 ml-2">by {log.performed_by}</span>
                              {log.notes && <p className="text-slate-600 mt-0.5">{log.notes}</p>}
                              {log.old_status && log.new_status && <p className="text-slate-400 text-[0.56rem]">{log.old_status} → {log.new_status}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 text-center py-4">No moderation history yet.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-500 sticky top-20">
              Select an article to review
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
