"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import { PROFESSIONAL_TYPE_LABELS } from "@/lib/types";

type Advisor = {
  id: number; name: string; slug: string; firm_name?: string; email?: string;
  photo_url?: string; type: string; location_display?: string; rating?: number;
  review_count?: number; verified?: boolean; bio?: string; specialties?: string[];
  fee_structure?: string; fee_description?: string; website?: string; phone?: string;
};

type Lead = {
  id: number; user_name: string; user_email: string; user_phone?: string;
  message?: string; source_page?: string; status: string; advisor_notes?: string;
  contacted_at?: string; converted_at?: string; created_at: string;
};

type BillingRecord = {
  id: number; amount_cents: number; description: string; status: string;
  invoice_number?: string; created_at: string;
};

type Stats = {
  totalViews30d: number; totalLeads: number; leads30d: number;
  convertedLeads: number; conversionRate: string;
  totalBilledCents: number; pendingBilledCents: number; reviewCount: number;
};

type ViewDay = { view_date: string; view_count: number };
type Review = { id: number; reviewer_name: string; rating: number; title?: string; body?: string; created_at: string };

export default function AdvisorPortalPage() {
  const [view, setView] = useState<"login" | "dashboard" | "leads" | "profile" | "billing">("login");
  const [advisor, setAdvisor] = useState<Advisor | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [viewsByDay, setViewsByDay] = useState<ViewDay[]>([]);
  const [billing, setBilling] = useState<BillingRecord[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginStatus, setLoginStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [tokenFromUrl, setTokenFromUrl] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  // Check for magic link token in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (token) {
      setTokenFromUrl(token);
      verifyToken(token);
    } else {
      checkSession();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkSession = async () => {
    try {
      const res = await fetch("/api/advisor-auth/session");
      if (res.ok) {
        const { advisor: a } = await res.json();
        setAdvisor(a);
        setView("dashboard");
        loadData();
      } else {
        setView("login");
      }
    } catch {
      setView("login");
    }
    setLoading(false);
  };

  const verifyToken = async (token: string) => {
    try {
      const res = await fetch("/api/advisor-auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (res.ok) {
        const { advisor: a } = await res.json();
        setAdvisor(a);
        setView("dashboard");
        // Clean URL
        window.history.replaceState({}, "", "/advisor-portal");
        loadData();
      } else {
        const err = await res.json();
        alert(err.error || "Invalid or expired link. Please request a new one.");
        setView("login");
      }
    } catch {
      setView("login");
    }
    setLoading(false);
  };

  const loadData = useCallback(async () => {
    try {
      const res = await fetch("/api/advisor-auth/data");
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads);
        setStats(data.stats);
        setViewsByDay(data.viewsByDay);
        setBilling(data.billing);
        setReviews(data.reviews);
      }
    } catch { /* ignore */ }
  }, []);

  const sendLoginEmail = async () => {
    setLoginStatus("sending");
    try {
      const res = await fetch("/api/advisor-auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail }),
      });
      setLoginStatus(res.ok ? "sent" : "error");
    } catch {
      setLoginStatus("error");
    }
  };

  const logout = async () => {
    await fetch("/api/advisor-auth/session", { method: "DELETE" });
    setAdvisor(null);
    setView("login");
  };

  const updateLeadStatus = async (leadId: number, status: string) => {
    await fetch("/api/advisor-auth/data", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId, status }),
    });
    loadData();
  };

  const updateLeadNotes = async (leadId: number, notes: string) => {
    await fetch("/api/advisor-auth/data", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId, notes }),
    });
  };

  const saveProfile = async () => {
    if (!advisor) return;
    setSavingProfile(true);
    try {
      await fetch("/api/advisor-auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bio: advisor.bio,
          specialties: advisor.specialties,
          fee_structure: advisor.fee_structure,
          fee_description: advisor.fee_description,
          website: advisor.website,
          phone: advisor.phone,
        }),
      });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    } catch { /* ignore */ }
    setSavingProfile(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  // ─── LOGIN ───
  if (view === "login") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-6">
            <Link href="/" className="text-xl font-extrabold text-slate-900">Invest.com.au</Link>
            <p className="text-sm text-slate-500 mt-1">Advisor Portal</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            {loginStatus === "sent" ? (
              <div className="text-center py-4">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Icon name="mail" size={24} className="text-emerald-600" />
                </div>
                <h2 className="text-lg font-bold text-slate-900 mb-1">Check your email</h2>
                <p className="text-sm text-slate-500">We&apos;ve sent a login link to <strong>{loginEmail}</strong>. Click the link to access your dashboard.</p>
                <p className="text-xs text-slate-400 mt-3">The link expires in 15 minutes.</p>
                <button onClick={() => setLoginStatus("idle")} className="mt-4 text-xs text-slate-500 hover:text-slate-700">Try a different email</button>
              </div>
            ) : (
              <>
                <h2 className="text-lg font-bold text-slate-900 mb-1">Log in</h2>
                <p className="text-sm text-slate-500 mb-4">Enter the email address on your advisor listing. We&apos;ll send you a login link.</p>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  onKeyDown={(e) => e.key === "Enter" && sendLoginEmail()}
                />
                <button
                  onClick={sendLoginEmail}
                  disabled={loginStatus === "sending" || !loginEmail}
                  className="w-full py-2.5 bg-slate-900 text-white font-semibold rounded-lg text-sm hover:bg-slate-800 disabled:opacity-50 transition-colors"
                >
                  {loginStatus === "sending" ? "Sending..." : "Send Login Link"}
                </button>
                {loginStatus === "error" && (
                  <p className="text-xs text-red-600 mt-2 text-center">Something went wrong. Please try again.</p>
                )}
              </>
            )}
          </div>
          <p className="text-center text-xs text-slate-400 mt-4">
            Not listed yet? <Link href="/advisors" className="text-slate-600 hover:text-slate-900 font-medium">Join the directory →</Link>
          </p>
        </div>
      </div>
    );
  }

  // ─── PORTAL SHELL ───
  const navItems = [
    { key: "dashboard", label: "Dashboard", icon: "layout-dashboard" },
    { key: "leads", label: "Leads", icon: "inbox" },
    { key: "profile", label: "Profile", icon: "user" },
    { key: "billing", label: "Billing", icon: "credit-card" },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-sm font-bold text-white/70 hover:text-white">Invest.com.au</Link>
          <span className="text-white/30">·</span>
          <span className="text-sm font-semibold">Advisor Portal</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href={`/advisor/${advisor?.slug}`} target="_blank" className="text-xs text-white/60 hover:text-white">View Profile ↗</Link>
          <button onClick={logout} className="text-xs text-white/60 hover:text-white">Log Out</button>
        </div>
      </div>

      {/* Nav tabs */}
      <div className="bg-white border-b border-slate-200 px-4">
        <div className="max-w-5xl mx-auto flex gap-1 overflow-x-auto">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setView(item.key as typeof view)}
              className={`flex items-center gap-1.5 px-3 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                view === item.key
                  ? "border-slate-900 text-slate-900"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <Icon name={item.icon} size={16} />
              {item.label}
              {item.key === "leads" && leads.filter(l => l.status === "new").length > 0 && (
                <span className="bg-red-500 text-white text-[0.56rem] font-bold rounded-full px-1.5 py-0.5 ml-1">{leads.filter(l => l.status === "new").length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-6">

        {/* ─── DASHBOARD ─── */}
        {view === "dashboard" && (
          <>
            <h1 className="text-xl font-bold text-slate-900 mb-1">Welcome back, {advisor?.name?.split(" ")[0]}</h1>
            <p className="text-sm text-slate-500 mb-6">{advisor?.firm_name || PROFESSIONAL_TYPE_LABELS[advisor?.type as keyof typeof PROFESSIONAL_TYPE_LABELS]}</p>

            {/* KPI cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {[
                { label: "Profile Views", value: stats?.totalViews30d || 0, sub: "last 30 days", color: "text-blue-600" },
                { label: "Enquiries", value: stats?.leads30d || 0, sub: "last 30 days", color: "text-amber-600" },
                { label: "Conversion", value: `${stats?.conversionRate || 0}%`, sub: `${stats?.convertedLeads || 0} converted`, color: "text-emerald-600" },
                { label: "Rating", value: advisor?.rating || "—", sub: `${advisor?.review_count || 0} reviews`, color: "text-violet-600" },
              ].map((kpi, i) => (
                <div key={i} className="bg-white border border-slate-200 rounded-xl p-4">
                  <div className="text-xs text-slate-500 font-medium">{kpi.label}</div>
                  <div className={`text-2xl font-extrabold mt-1 ${kpi.color}`}>{kpi.value}</div>
                  <div className="text-[0.62rem] text-slate-400 mt-0.5">{kpi.sub}</div>
                </div>
              ))}
            </div>

            {/* Views chart (simple bar) */}
            {viewsByDay.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6">
                <h3 className="text-sm font-bold text-slate-900 mb-3">Profile Views (30 Days)</h3>
                <div className="flex items-end gap-0.5 h-20">
                  {viewsByDay.map((d, i) => {
                    const max = Math.max(...viewsByDay.map(v => v.view_count), 1);
                    const pct = (d.view_count / max) * 100;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center justify-end" title={`${d.view_date}: ${d.view_count} views`}>
                        <div className="w-full bg-blue-500 rounded-sm min-h-[2px]" style={{ height: `${Math.max(pct, 3)}%` }} />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recent leads */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-900">Recent Enquiries</h3>
                <button onClick={() => setView("leads")} className="text-xs text-amber-600 hover:text-amber-700 font-semibold">View All →</button>
              </div>
              {leads.length === 0 ? (
                <p className="text-sm text-slate-500 py-4 text-center">No enquiries yet. They&apos;ll appear here when investors contact you.</p>
              ) : (
                <div className="space-y-2">
                  {leads.slice(0, 5).map((lead) => (
                    <div key={lead.id} className={`flex items-center justify-between p-2.5 rounded-lg ${lead.status === "new" ? "bg-amber-50 border border-amber-200" : "bg-slate-50"}`}>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900 truncate">{lead.user_name}</div>
                        <div className="text-xs text-slate-500 truncate">{lead.user_email}</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span className={`text-[0.56rem] font-bold px-1.5 py-0.5 rounded-full ${
                          lead.status === "new" ? "bg-amber-100 text-amber-700" :
                          lead.status === "contacted" ? "bg-blue-100 text-blue-700" :
                          lead.status === "converted" ? "bg-emerald-100 text-emerald-700" :
                          "bg-slate-100 text-slate-500"
                        }`}>{lead.status}</span>
                        <span className="text-[0.56rem] text-slate-400">{new Date(lead.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick actions */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <button onClick={() => setView("profile")} className="bg-white border border-slate-200 rounded-xl p-4 text-left hover:bg-slate-50 transition-colors">
                <Icon name="user" size={20} className="text-slate-600 mb-2" />
                <div className="text-sm font-bold text-slate-900">Edit Profile</div>
                <div className="text-xs text-slate-500">Update bio, fees, specialties</div>
              </button>
              <Link href={`/advisor/${advisor?.slug}`} target="_blank" className="bg-white border border-slate-200 rounded-xl p-4 text-left hover:bg-slate-50 transition-colors">
                <Icon name="external-link" size={20} className="text-slate-600 mb-2" />
                <div className="text-sm font-bold text-slate-900">View Public Profile</div>
                <div className="text-xs text-slate-500">See how investors see you</div>
              </Link>
              <button onClick={() => setView("billing")} className="bg-white border border-slate-200 rounded-xl p-4 text-left hover:bg-slate-50 transition-colors">
                <Icon name="credit-card" size={20} className="text-slate-600 mb-2" />
                <div className="text-sm font-bold text-slate-900">Billing</div>
                <div className="text-xs text-slate-500">{stats?.pendingBilledCents ? `$${(stats.pendingBilledCents / 100).toFixed(0)} pending` : "No charges yet"}</div>
              </button>
            </div>
          </>
        )}

        {/* ─── LEADS ─── */}
        {view === "leads" && (
          <>
            <h1 className="text-xl font-bold text-slate-900 mb-1">Enquiries</h1>
            <p className="text-sm text-slate-500 mb-6">{stats?.totalLeads || 0} total · {leads.filter(l => l.status === "new").length} new</p>

            {leads.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
                <Icon name="inbox" size={40} className="text-slate-300 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-slate-900 mb-1">No enquiries yet</h3>
                <p className="text-sm text-slate-500">When investors submit a consultation request through your profile, they&apos;ll appear here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {leads.map((lead) => (
                  <div key={lead.id} className={`bg-white border rounded-xl p-4 ${lead.status === "new" ? "border-amber-200 bg-amber-50/30" : "border-slate-200"}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900">{lead.user_name}</span>
                          <span className={`text-[0.56rem] font-bold px-1.5 py-0.5 rounded-full ${
                            lead.status === "new" ? "bg-amber-100 text-amber-700" :
                            lead.status === "contacted" ? "bg-blue-100 text-blue-700" :
                            lead.status === "converted" ? "bg-emerald-100 text-emerald-700" :
                            lead.status === "lost" ? "bg-red-100 text-red-600" :
                            "bg-slate-100 text-slate-500"
                          }`}>{lead.status}</span>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          <a href={`mailto:${lead.user_email}`} className="text-blue-600 hover:underline">{lead.user_email}</a>
                          {lead.user_phone && <> · <a href={`tel:${lead.user_phone}`} className="text-blue-600 hover:underline">{lead.user_phone}</a></>}
                        </div>
                      </div>
                      <span className="text-xs text-slate-400">{new Date(lead.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}</span>
                    </div>
                    {lead.message && (
                      <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-600 mb-3 leading-relaxed">{lead.message}</div>
                    )}
                    <div className="flex items-center gap-2 flex-wrap">
                      {lead.status === "new" && (
                        <button onClick={() => updateLeadStatus(lead.id, "contacted")} className="text-xs font-semibold text-blue-600 hover:text-blue-800 px-2 py-1 border border-blue-200 rounded-lg hover:bg-blue-50">Mark Contacted</button>
                      )}
                      {(lead.status === "new" || lead.status === "contacted") && (
                        <button onClick={() => updateLeadStatus(lead.id, "converted")} className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 px-2 py-1 border border-emerald-200 rounded-lg hover:bg-emerald-50">Mark Converted</button>
                      )}
                      {lead.status !== "lost" && lead.status !== "converted" && (
                        <button onClick={() => updateLeadStatus(lead.id, "lost")} className="text-xs font-semibold text-red-500 hover:text-red-700 px-2 py-1 border border-red-200 rounded-lg hover:bg-red-50">Mark Lost</button>
                      )}
                      <input
                        type="text"
                        placeholder="Add a note..."
                        defaultValue={lead.advisor_notes || ""}
                        onBlur={(e) => updateLeadNotes(lead.id, e.target.value)}
                        className="flex-1 min-w-[120px] text-xs px-2 py-1 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ─── PROFILE ─── */}
        {view === "profile" && advisor && (
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-xl font-bold text-slate-900 mb-1">Edit Profile</h1>
                <p className="text-sm text-slate-500">Changes are saved to your public listing.</p>
              </div>
              <Link href={`/advisor/${advisor.slug}`} target="_blank" className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1">
                <Icon name="external-link" size={14} />
                Preview
              </Link>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Bio</label>
                <textarea
                  value={advisor.bio || ""}
                  onChange={(e) => setAdvisor({ ...advisor, bio: e.target.value })}
                  rows={5}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  placeholder="Tell investors about your experience and approach..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Fee Structure</label>
                <select
                  value={advisor.fee_structure || "fee-for-service"}
                  onChange={(e) => setAdvisor({ ...advisor, fee_structure: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                >
                  <option value="fee-for-service">Fee for Service</option>
                  <option value="commission">Commission Based</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="percentage">Percentage of AUM</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Fee Description (shown to investors)</label>
                <input
                  value={advisor.fee_description || ""}
                  onChange={(e) => setAdvisor({ ...advisor, fee_description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  placeholder="e.g. SOA from $3,300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Website</label>
                  <input
                    value={advisor.website || ""}
                    onChange={(e) => setAdvisor({ ...advisor, website: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Phone</label>
                  <input
                    value={advisor.phone || ""}
                    onChange={(e) => setAdvisor({ ...advisor, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    placeholder="04XX XXX XXX"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={saveProfile}
                  disabled={savingProfile}
                  className="px-5 py-2.5 bg-slate-900 text-white font-semibold rounded-lg text-sm hover:bg-slate-800 disabled:opacity-50 transition-colors"
                >
                  {savingProfile ? "Saving..." : "Save Changes"}
                </button>
                {profileSaved && <span className="text-sm text-emerald-600 font-medium">Saved!</span>}
              </div>
            </div>

            {/* Reviews section */}
            {reviews.length > 0 && (
              <div className="mt-6">
                <h2 className="text-lg font-bold text-slate-900 mb-3">Your Reviews ({reviews.length})</h2>
                <div className="space-y-3">
                  {reviews.map((r) => (
                    <div key={r.id} className="bg-white border border-slate-200 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold text-slate-900">{r.reviewer_name}</span>
                        <span className="text-amber-400 text-xs">{"★".repeat(r.rating)}</span>
                      </div>
                      {r.title && <div className="text-sm font-medium text-slate-800 mb-1">{r.title}</div>}
                      {r.body && <p className="text-xs text-slate-600 leading-relaxed">{r.body}</p>}
                      <div className="text-[0.56rem] text-slate-400 mt-2">{new Date(r.created_at).toLocaleDateString("en-AU")}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ─── BILLING ─── */}
        {view === "billing" && (
          <>
            <h1 className="text-xl font-bold text-slate-900 mb-1">Billing</h1>
            <p className="text-sm text-slate-500 mb-6">Track your enquiry charges and payment history.</p>

            {/* Billing summary */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="text-xs text-slate-500 font-medium">Total Charged</div>
                <div className="text-2xl font-extrabold text-slate-900 mt-1">${((stats?.totalBilledCents || 0) / 100).toFixed(0)}</div>
                <div className="text-[0.62rem] text-slate-400 mt-0.5">all time</div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="text-xs text-slate-500 font-medium">Outstanding</div>
                <div className="text-2xl font-extrabold text-amber-600 mt-1">${((stats?.pendingBilledCents || 0) / 100).toFixed(0)}</div>
                <div className="text-[0.62rem] text-slate-400 mt-0.5">pending / invoiced</div>
              </div>
            </div>

            {/* Free tier notice */}
            {(stats?.totalBilledCents || 0) === 0 && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6">
                <h3 className="text-sm font-bold text-emerald-900 mb-1 flex items-center gap-2">
                  <Icon name="gift" size={16} className="text-emerald-600" />
                  You&apos;re on the Free Plan
                </h3>
                <p className="text-xs text-emerald-700 leading-relaxed">
                  Your listing is currently free. We&apos;ll discuss per-enquiry pricing once you&apos;re seeing results from the platform.
                  No charges will be applied without your agreement.
                </p>
              </div>
            )}

            {/* Billing records */}
            {billing.length > 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="grid grid-cols-4 bg-slate-50 text-xs font-semibold text-slate-600 px-4 py-2 border-b border-slate-200">
                  <span>Date</span>
                  <span>Description</span>
                  <span className="text-right">Amount</span>
                  <span className="text-right">Status</span>
                </div>
                {billing.map((b) => (
                  <div key={b.id} className="grid grid-cols-4 px-4 py-2.5 text-xs border-b border-slate-100 last:border-b-0">
                    <span className="text-slate-500">{new Date(b.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}</span>
                    <span className="text-slate-700">{b.description}</span>
                    <span className="text-right font-semibold text-slate-900">${(b.amount_cents / 100).toFixed(2)}</span>
                    <span className="text-right">
                      <span className={`px-1.5 py-0.5 rounded-full text-[0.56rem] font-bold ${
                        b.status === "paid" ? "bg-emerald-100 text-emerald-700" :
                        b.status === "waived" ? "bg-slate-100 text-slate-500" :
                        "bg-amber-100 text-amber-700"
                      }`}>{b.status}</span>
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-xl p-6 text-center">
                <p className="text-sm text-slate-500">No billing records yet.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
