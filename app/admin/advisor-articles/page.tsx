"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";

type Article = {
  id: number; title: string; slug: string; content: string; excerpt: string;
  status: string; category: string; pricing_tier: string; payment_status: string;
  price_cents: number; author_name: string; author_firm: string; author_slug: string;
  admin_notes: string | null; rejection_reason: string | null;
  created_at: string; submitted_at: string | null; published_at: string | null;
  view_count: number; click_count: number;
  professionals?: { name: string; slug: string; firm_name: string } | null;
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  submitted: "bg-blue-100 text-blue-700",
  in_review: "bg-amber-100 text-amber-700",
  revision_requested: "bg-orange-100 text-orange-700",
  approved: "bg-emerald-100 text-emerald-700",
  published: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-700",
};

const STATUS_FILTER = ["all", "submitted", "in_review", "approved", "published", "revision_requested", "rejected", "draft"];

export default function AdminAdvisorArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<Article | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [paymentRef, setPaymentRef] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchArticles = async () => {
    const url = filter === "all" ? "/api/advisor-articles?mode=admin" : `/api/advisor-articles?mode=admin&status=${filter}`;
    const res = await fetch(url);
    setArticles(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchArticles(); }, [filter]);

  const doAction = async (action: string, extra: Record<string, string> = {}) => {
    if (!selected) return;
    setActionLoading(true);
    await fetch("/api/advisor-articles", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: selected.id, action, ...extra }),
    });
    setSelected(null);
    setAdminNotes(""); setRejectionReason(""); setPaymentRef("");
    await fetchArticles();
    setActionLoading(false);
  };

  const pendingCount = articles.filter(a => a.status === "submitted").length;

  if (loading) return <div className="p-6 animate-pulse"><div className="h-8 w-48 bg-slate-200 rounded mb-4" /><div className="h-64 bg-slate-100 rounded-xl" /></div>;

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Advisor Articles</h1>
          <p className="text-xs text-slate-500">{articles.length} articles · {pendingCount} pending review</p>
        </div>
        <Link href="/expert" target="_blank" className="text-xs font-semibold text-violet-600 hover:text-violet-800">View Public Page ↗</Link>
      </div>

      {/* Status filter */}
      <div className="flex gap-1.5 overflow-x-auto mb-4 pb-1">
        {STATUS_FILTER.map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all ${filter === s ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
            {s === "all" ? "All" : s.replace("_", " ")}
            {s === "submitted" && pendingCount > 0 && <span className="ml-1 bg-red-500 text-white text-[0.5rem] rounded-full px-1.5 py-0.5">{pendingCount}</span>}
          </button>
        ))}
      </div>

      {/* Article list + detail split view */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* List */}
        <div className="lg:col-span-2 space-y-2">
          {articles.map(a => (
            <button key={a.id} onClick={() => { setSelected(a); setAdminNotes(a.admin_notes || ""); }} className={`w-full text-left bg-white border rounded-lg p-3 hover:shadow-md transition-all ${selected?.id === a.id ? "border-violet-400 ring-2 ring-violet-400/20" : "border-slate-200"}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[0.5rem] font-bold px-1.5 py-0.5 rounded-full ${STATUS_COLORS[a.status]}`}>{a.status.replace("_", " ")}</span>
                <span className="text-[0.5rem] text-slate-400 capitalize">{a.pricing_tier}</span>
                <span className={`text-[0.5rem] font-semibold ${a.payment_status === "paid" ? "text-emerald-600" : a.payment_status === "waived" ? "text-blue-600" : "text-slate-400"}`}>{a.payment_status}</span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 truncate">{a.title}</h3>
              <p className="text-[0.62rem] text-slate-500">By {a.author_name} · {a.category}</p>
            </button>
          ))}
          {articles.length === 0 && (
            <div className="bg-white border border-slate-200 rounded-lg p-6 text-center text-sm text-slate-500">No articles in this status.</div>
          )}
        </div>

        {/* Detail panel */}
        <div className="lg:col-span-3">
          {selected ? (
            <div className="bg-white border border-slate-200 rounded-xl p-5 sticky top-20">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold text-slate-900">{selected.title}</h2>
                <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600"><Icon name="x" size={18} /></button>
              </div>

              <div className="flex flex-wrap gap-2 mb-3 text-xs">
                <span className={`font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[selected.status]}`}>{selected.status.replace("_", " ")}</span>
                <span className="text-slate-500">By <Link href={`/advisor/${selected.author_slug}`} target="_blank" className="text-violet-600 hover:underline">{selected.author_name}</Link></span>
                <span className="text-slate-500">{selected.category}</span>
                <span className="text-slate-500 capitalize">{selected.pricing_tier} (${(selected.price_cents / 100).toFixed(0)})</span>
                <span className={selected.payment_status === "paid" ? "text-emerald-600 font-semibold" : "text-slate-400"}>{selected.payment_status}</span>
              </div>

              {/* Content preview */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 max-h-64 overflow-y-auto mb-4 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                {selected.content}
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-500 mb-4">
                <span>{selected.content?.split(/\s+/).length || 0} words</span>
                <span>Created {new Date(selected.created_at).toLocaleDateString("en-AU")}</span>
                {selected.submitted_at && <span>Submitted {new Date(selected.submitted_at).toLocaleDateString("en-AU")}</span>}
                {selected.published_at && <span>Published {new Date(selected.published_at).toLocaleDateString("en-AU")}</span>}
                <span>{selected.view_count} views · {selected.click_count} clicks</span>
              </div>

              {/* Admin notes */}
              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-700 mb-1">Admin Notes (visible to advisor)</label>
                <textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)} rows={2} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" placeholder="Feedback for the advisor..." />
              </div>

              {/* Actions based on status */}
              <div className="flex flex-wrap gap-2">
                {(selected.status === "submitted" || selected.status === "in_review") && (
                  <>
                    <button onClick={() => doAction("approve", { admin_notes: adminNotes })} disabled={actionLoading} className="px-3 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 disabled:opacity-50">
                      ✓ Approve
                    </button>
                    <button onClick={() => doAction("request_revision", { admin_notes: adminNotes || "Please revise based on feedback" })} disabled={actionLoading} className="px-3 py-2 bg-orange-500 text-white text-xs font-bold rounded-lg hover:bg-orange-600 disabled:opacity-50">
                      ↻ Request Revision
                    </button>
                    <button onClick={() => { const reason = prompt("Rejection reason:"); if (reason) doAction("reject", { rejection_reason: reason }); }} disabled={actionLoading} className="px-3 py-2 bg-red-500 text-white text-xs font-bold rounded-lg hover:bg-red-600 disabled:opacity-50">
                      ✗ Reject
                    </button>
                  </>
                )}
                {selected.status === "approved" && (
                  <>
                    {selected.payment_status === "unpaid" && (
                      <>
                        <div className="flex items-center gap-1.5">
                          <input value={paymentRef} onChange={e => setPaymentRef(e.target.value)} placeholder="Payment ref" className="px-2 py-1.5 text-xs border border-slate-200 rounded-lg w-32" />
                          <button onClick={() => doAction("mark_paid", { payment_reference: paymentRef || "manual" })} disabled={actionLoading} className="px-3 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 disabled:opacity-50">
                            Mark Paid
                          </button>
                        </div>
                        <button onClick={() => doAction("waive_fee")} disabled={actionLoading} className="px-3 py-2 border border-slate-300 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50 disabled:opacity-50">
                          Waive Fee
                        </button>
                      </>
                    )}
                    {(selected.payment_status === "paid" || selected.payment_status === "waived") && (
                      <button onClick={() => doAction("publish")} disabled={actionLoading} className="px-4 py-2 bg-green-600 text-white text-sm font-bold rounded-lg hover:bg-green-700 disabled:opacity-50">
                        🚀 Publish Now
                      </button>
                    )}
                  </>
                )}
                {selected.status === "published" && selected.slug && (
                  <Link href={`/expert/${selected.slug}`} target="_blank" className="px-3 py-2 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50">
                    View Published ↗
                  </Link>
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
