"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import AdvisorPhotoUpload from "@/components/AdvisorPhotoUpload";
import { PROFESSIONAL_TYPE_LABELS } from "@/lib/types";

type Advisor = {
  id: number; name: string; slug: string; firm_name?: string; email?: string;
  photo_url?: string; type: string; location_display?: string; rating?: number;
  review_count?: number; verified?: boolean; bio?: string; specialties?: string[];
  fee_structure?: string; fee_description?: string; website?: string; phone?: string;
  booking_link?: string; booking_intro?: string;
  offer_text?: string; offer_terms?: string; offer_active?: boolean;
  firm_id?: number; is_firm_admin?: boolean; account_type?: string; status?: string;
  free_leads_used?: number; lead_price_cents?: number;
  credit_balance_cents?: number; lifetime_credit_cents?: number; lifetime_lead_spend_cents?: number;
  featured_until?: string;
};

type FirmMember = { id: number; name: string; slug: string; email?: string; type: string; photo_url?: string; verified?: boolean; status?: string; created_at: string };
type FirmInvite = { id: number; email: string; name?: string; status: string; created_at: string; expires_at: string };

type Lead = {
  id: number; user_name: string; user_email: string; user_phone?: string;
  message?: string; source_page?: string; status: string; advisor_notes?: string;
  contacted_at?: string; converted_at?: string; created_at: string;
  quality_score?: number; bill_amount_cents: number; billed: boolean;
};

type BillingRecord = {
  id: number; amount_cents: number; description: string; status: string;
  invoice_number?: string; created_at: string;
};

type Stats = {
  totalViews30d: number; totalLeads: number; leads30d: number;
  convertedLeads: number; conversionRate: string;
  totalBilledCents: number; pendingBilledCents: number; reviewCount: number;
  avgRating: string | null; bookingClicks30d: number;
  // Analytics
  phoneClicks: number; websiteClicks: number; bookingClicks: number;
  articleViews: number; searchImpressions: number;
  articles: { title: string; slug: string; views: number; clicks: number }[];
};

type ViewDay = { view_date: string; view_count: number };
type Review = { id: number; reviewer_name: string; rating: number; title?: string; body?: string; created_at: string; communication_rating?: number; expertise_rating?: number; value_for_money_rating?: number };
type WeeklyEnquiry = { weekLabel: string; count: number };
type ProfileCompleteness = { score: number; missingFields: string[] };

export default function AdvisorPortalPage() {
  const [view, setView] = useState<"login" | "dashboard" | "leads" | "analytics" | "profile" | "billing" | "articles" | "team">("login");
  const [advisor, setAdvisor] = useState<Advisor | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [firmMembers, setFirmMembers] = useState<FirmMember[]>([]);
  const [firmInvites, setFirmInvites] = useState<FirmInvite[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteStatus, setInviteStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [viewsByDay, setViewsByDay] = useState<ViewDay[]>([]);
  const [billing, setBilling] = useState<BillingRecord[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [weeklyEnquiries, setWeeklyEnquiries] = useState<WeeklyEnquiry[]>([]);
  const [profileCompleteness, setProfileCompleteness] = useState<ProfileCompleteness | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginMode, setLoginMode] = useState<"magic" | "password" | "signup">("magic");
  const [loginStatus, setLoginStatus] = useState<"idle" | "sending" | "sent" | "error" | "success">("idle");
  const [loginError, setLoginError] = useState("");
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
        setView(a.status === "pending" ? "dashboard" : "dashboard");
        if (a.status !== "pending") loadData();
      } else {
        setView("login");
      }
    } catch {
      setView("login");
    }
    setLoading(false);
  };

  const loadFirmData = useCallback(async () => {
    try {
      const res = await fetch("/api/advisor-auth/firm/invite");
      if (res.ok) {
        const data = await res.json();
        setFirmMembers(data.members || []);
        setFirmInvites(data.invitations || []);
      }
    } catch { /* ignore */ }
  }, []);

  const sendInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviteStatus("sending");
    try {
      const res = await fetch("/api/advisor-auth/firm/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim(), name: inviteName.trim() || undefined }),
      });
      if (res.ok) {
        setInviteStatus("sent");
        setInviteEmail("");
        setInviteName("");
        loadFirmData();
        setTimeout(() => setInviteStatus("idle"), 3000);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to send invite");
        setInviteStatus("error");
      }
    } catch {
      setInviteStatus("error");
    }
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
      const res = await fetch("/api/advisor-dashboard");
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads);
        setStats(data.stats);
        setViewsByDay(data.viewsByDay);
        setBilling(data.billing);
        setReviews(data.reviews);
        setWeeklyEnquiries(data.weeklyEnquiries || []);
        setProfileCompleteness(data.profileCompleteness || null);
        if (data.advisor) setAdvisor(data.advisor);
      }
    } catch { /* ignore */ }
  }, []);

  const handleLogin = async () => {
    setLoginStatus("sending");
    setLoginError("");
    try {
      const res = await fetch("/api/advisor-auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword, mode: loginMode }),
      });
      const data = await res.json();
      
      if (!res.ok) {
        setLoginError(data.error || "Something went wrong.");
        setLoginStatus("error");
        return;
      }
      
      if (loginMode === "magic") {
        setLoginStatus("sent");
      } else if (loginMode === "signup" && data.needsConfirmation) {
        setLoginStatus("sent");
      } else {
        // Password login or signup with auto-confirm — reload to pick up session
        setLoginStatus("success");
        window.location.reload();
      }
    } catch {
      setLoginError("Network error. Please try again.");
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
          booking_link: advisor.booking_link,
          booking_intro: advisor.booking_intro,
          offer_text: advisor.offer_text || null,
          offer_terms: advisor.offer_terms || null,
          offer_active: advisor.offer_active || false,
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
                <p className="text-xs text-slate-400 mt-3">Check spam if you don&apos;t see it within a minute.</p>
                <button onClick={() => { setLoginStatus("idle"); setLoginError(""); }} className="mt-4 text-xs text-slate-500 hover:text-slate-700">Try a different email</button>
              </div>
            ) : loginStatus === "success" ? (
              <div className="text-center py-4">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Icon name="check" size={24} className="text-emerald-600" />
                </div>
                <h2 className="text-lg font-bold text-slate-900 mb-1">Logging you in...</h2>
              </div>
            ) : (
              <>
                <h2 className="text-lg font-bold text-slate-900 mb-1">
                  {loginMode === "signup" ? "Create your account" : "Log in"}
                </h2>
                <p className="text-sm text-slate-500 mb-4">
                  {loginMode === "magic" ? "We'll email you a secure login link." : loginMode === "signup" ? "Set up a password for your advisor account." : "Enter your email and password."}
                </p>
                
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  onKeyDown={(e) => e.key === "Enter" && (loginMode === "magic" ? handleLogin() : null)}
                />
                
                {loginMode !== "magic" && (
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder={loginMode === "signup" ? "Create a password (8+ characters)" : "Password"}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  />
                )}
                
                <button
                  onClick={handleLogin}
                  disabled={loginStatus === "sending" || !loginEmail || (loginMode !== "magic" && !loginPassword)}
                  className="w-full py-2.5 bg-slate-900 text-white font-semibold rounded-lg text-sm hover:bg-slate-800 disabled:opacity-50 transition-colors"
                >
                  {loginStatus === "sending" ? "Please wait..." : loginMode === "magic" ? "Send Login Link" : loginMode === "signup" ? "Create Account" : "Log In"}
                </button>
                
                {loginError && (
                  <p className="text-xs text-red-600 mt-2 text-center">{loginError}</p>
                )}
                
                {/* Mode switchers */}
                <div className="mt-4 pt-3 border-t border-slate-100 text-center space-y-1.5">
                  {loginMode === "magic" ? (
                    <>
                      <button onClick={() => { setLoginMode("password"); setLoginError(""); }} className="text-xs text-slate-500 hover:text-slate-700 block w-full">
                        Use password instead
                      </button>
                      <button onClick={() => { setLoginMode("signup"); setLoginError(""); }} className="text-xs text-violet-600 hover:text-violet-800 block w-full font-medium">
                        First time? Set up a password
                      </button>
                    </>
                  ) : loginMode === "password" ? (
                    <>
                      <button onClick={() => { setLoginMode("magic"); setLoginError(""); }} className="text-xs text-slate-500 hover:text-slate-700 block w-full">
                        Use magic link instead
                      </button>
                      <button onClick={() => { setLoginMode("signup"); setLoginError(""); }} className="text-xs text-violet-600 hover:text-violet-800 block w-full font-medium">
                        First time? Create account
                      </button>
                    </>
                  ) : (
                    <button onClick={() => { setLoginMode("password"); setLoginError(""); }} className="text-xs text-slate-500 hover:text-slate-700 block w-full">
                      Already have an account? Log in
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
          <p className="text-center text-xs text-slate-400 mt-4">
            Not listed yet? <Link href="/for-advisors" className="text-slate-600 hover:text-slate-900 font-medium">Join the directory →</Link>
          </p>
        </div>
      </div>
    );
  }

  // ─── PORTAL SHELL ───
  const isPending = advisor?.status === "pending";
  const isFirmAdmin = advisor?.is_firm_admin && advisor?.firm_id;

  const navItems = [
    { key: "dashboard", label: "Dashboard", icon: "layout-dashboard" },
    { key: "leads", label: "Leads", icon: "inbox" },
    { key: "analytics", label: "Analytics", icon: "bar-chart" },
    { key: "articles", label: "Articles", icon: "file-text" },
    { key: "profile", label: "Profile", icon: "user" },
    { key: "billing", label: "Billing", icon: "credit-card" },
    ...(isFirmAdmin ? [{ key: "team", label: "Team", icon: "users" }] : []),
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
              type="button"
              onClick={() => { setView(item.key as typeof view); if (item.key === "team") loadFirmData(); }}
              className={`flex items-center gap-1.5 px-3 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-inset ${
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

        {/* ─── PENDING BANNER ─── */}
        {isPending && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
            <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
              <Icon name="clock" size={16} className="text-amber-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-900">Application Under Review</h3>
              <p className="text-xs text-amber-700 mt-0.5">Your application is being reviewed by our team. We&apos;ll verify your credentials and activate your listing within 48 hours. You&apos;ll receive an email when your profile goes live.</p>
              <p className="text-[0.62rem] text-amber-600 mt-2">While you wait, you can set up your profile below so it&apos;s ready when approved.</p>
            </div>
          </div>
        )}

        {/* ─── DASHBOARD ─── */}
        {view === "dashboard" && (
          <>
            <h1 className="text-xl font-bold text-slate-900 mb-1">Welcome{isPending ? "" : " back"}, {advisor?.name?.split(" ")[0]}</h1>
            <p className="text-sm text-slate-500 mb-6">{advisor?.firm_name || PROFESSIONAL_TYPE_LABELS[advisor?.type as keyof typeof PROFESSIONAL_TYPE_LABELS]}</p>

            {/* ── Stats cards row ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {[
                { label: "Profile Views", value: stats?.totalViews30d || 0, sub: "last 30 days", icon: "eye", color: "text-blue-600", bg: "bg-blue-50" },
                { label: "Enquiries", value: stats?.leads30d || 0, sub: "last 30 days", icon: "inbox", color: "text-violet-600", bg: "bg-violet-50" },
                { label: "Booking Clicks", value: stats?.bookingClicks30d || 0, sub: "last 30 days", icon: "calendar", color: "text-emerald-600", bg: "bg-emerald-50" },
                { label: "Avg Rating", value: stats?.avgRating || (advisor?.rating ? Number(advisor.rating).toFixed(1) : "\u2014"), sub: `${stats?.reviewCount || advisor?.review_count || 0} reviews`, icon: "star", color: "text-amber-600", bg: "bg-amber-50" },
              ].map((kpi, i) => (
                <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs text-slate-500 font-medium">{kpi.label}</div>
                    <div className={`w-8 h-8 ${kpi.bg} rounded-lg flex items-center justify-center`}><Icon name={kpi.icon} size={16} className={kpi.color} /></div>
                  </div>
                  <div className="text-2xl font-extrabold text-slate-900">{typeof kpi.value === "number" ? kpi.value.toLocaleString() : kpi.value}</div>
                  <div className="text-[0.62rem] text-slate-400 mt-0.5">{kpi.sub}</div>
                </div>
              ))}
            </div>

            {/* Credit balance banner */}
            <div className="bg-gradient-to-r from-violet-600 to-violet-800 rounded-xl p-4 mb-6 text-white flex items-center justify-between">
              <div>
                <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-violet-200">Lead Credit Balance</p>
                <p className="text-2xl font-extrabold">${((advisor?.credit_balance_cents || 0) / 100).toFixed(0)}</p>
                <p className="text-[0.62rem] text-violet-200 mt-0.5">
                  {(advisor?.free_leads_used || 0) < 2
                    ? `${2 - (advisor?.free_leads_used || 0)} free leads remaining`
                    : `~${Math.floor((advisor?.credit_balance_cents || 0) / (advisor?.lead_price_cents || 3980))} leads remaining`
                  }
                </p>
              </div>
              <button
                onClick={() => setView("billing")}
                className="px-5 py-2.5 bg-white text-violet-700 text-sm font-bold rounded-lg hover:bg-violet-50 transition-colors shrink-0"
              >
                Buy Credits
              </button>
            </div>

            {/* ── Profile Completeness ── */}
            {profileCompleteness && profileCompleteness.score < 100 && (
              <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold text-slate-900">Profile Completeness</h3>
                  <span className={`text-sm font-extrabold ${profileCompleteness.score >= 80 ? "text-emerald-600" : profileCompleteness.score >= 50 ? "text-amber-600" : "text-red-500"}`}>
                    {profileCompleteness.score}%
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden mb-3">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      profileCompleteness.score >= 80 ? "bg-emerald-500" : profileCompleteness.score >= 50 ? "bg-amber-500" : "bg-red-500"
                    }`}
                    style={{ width: `${profileCompleteness.score}%` }}
                  />
                </div>
                {profileCompleteness.missingFields.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    <span className="text-[0.62rem] text-slate-500 mr-1">Missing:</span>
                    {profileCompleteness.missingFields.map((f) => (
                      <button
                        key={f}
                        onClick={() => setView("profile")}
                        className="text-[0.58rem] font-medium text-violet-600 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-full hover:bg-violet-100 transition-colors"
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Performance Chart: Enquiries per week (last 8 weeks) ── */}
            {weeklyEnquiries.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6">
                <h3 className="text-sm font-bold text-slate-900 mb-1">Enquiries Per Week</h3>
                <p className="text-[0.62rem] text-slate-400 mb-4">Last 8 weeks</p>
                <div className="flex items-end gap-2 h-28">
                  {weeklyEnquiries.map((w, i) => {
                    const max = Math.max(...weeklyEnquiries.map(wk => wk.count), 1);
                    const pct = (w.count / max) * 100;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1">
                        <span className="text-[0.56rem] font-bold text-slate-700">{w.count}</span>
                        <div
                          className="w-full bg-violet-500 rounded-t-md transition-all duration-300 hover:bg-violet-600"
                          style={{ height: `${Math.max(pct, 4)}%`, minHeight: "3px" }}
                          title={`${w.weekLabel}: ${w.count} enquiries`}
                        />
                        <span className="text-[0.5rem] text-slate-400 whitespace-nowrap">{w.weekLabel}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Views chart (daily, 30 days) ── */}
            {viewsByDay.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6">
                <h3 className="text-sm font-bold text-slate-900 mb-1">Profile Views</h3>
                <p className="text-[0.62rem] text-slate-400 mb-3">Daily views over the last 30 days</p>
                <div className="flex items-end gap-0.5 h-20">
                  {viewsByDay.map((d, i) => {
                    const max = Math.max(...viewsByDay.map(v => v.view_count), 1);
                    const pct = (d.view_count / max) * 100;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center justify-end" title={`${d.view_date}: ${d.view_count} views`}>
                        <div className="w-full bg-blue-500 rounded-sm min-h-[2px] hover:bg-blue-600 transition-colors" style={{ height: `${Math.max(pct, 3)}%` }} />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Recent leads table ── */}
            <div className="bg-white border border-slate-200 rounded-xl mb-6 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">Recent Enquiries</h3>
                <button onClick={() => setView("leads")} className="text-xs text-violet-600 hover:text-violet-700 font-semibold">View All &rarr;</button>
              </div>
              {leads.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <Icon name="inbox" size={28} className="text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">No enquiries yet. They&apos;ll appear here when investors contact you.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 text-[0.62rem] font-semibold text-slate-500 uppercase tracking-wider">
                        <th className="px-4 py-2">Name</th>
                        <th className="px-4 py-2">Date</th>
                        <th className="px-4 py-2 text-center">Quality</th>
                        <th className="px-4 py-2">Status</th>
                        <th className="px-4 py-2">Message</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {leads.slice(0, 8).map((lead) => (
                        <tr key={lead.id} className={`text-xs ${lead.status === "new" ? "bg-violet-50/40" : "hover:bg-slate-50"} transition-colors`}>
                          <td className="px-4 py-2.5">
                            <div className="font-semibold text-slate-900">{lead.user_name}</div>
                            <div className="text-[0.58rem] text-slate-400">{lead.user_email}</div>
                          </td>
                          <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">
                            {new Date(lead.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            {lead.quality_score != null ? (
                              <span className={`inline-block w-6 h-6 leading-6 text-center text-[0.56rem] font-bold rounded-full ${
                                lead.quality_score >= 80 ? "bg-emerald-100 text-emerald-700" :
                                lead.quality_score >= 50 ? "bg-amber-100 text-amber-700" :
                                "bg-slate-100 text-slate-500"
                              }`}>{lead.quality_score}</span>
                            ) : (
                              <span className="text-slate-300">&mdash;</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={`text-[0.56rem] font-bold px-2 py-0.5 rounded-full ${
                              lead.status === "new" ? "bg-violet-100 text-violet-700" :
                              lead.status === "contacted" ? "bg-blue-100 text-blue-700" :
                              lead.status === "converted" ? "bg-emerald-100 text-emerald-700" :
                              lead.status === "lost" ? "bg-red-100 text-red-600" :
                              "bg-slate-100 text-slate-500"
                            }`}>{lead.status}</span>
                          </td>
                          <td className="px-4 py-2.5 text-slate-500 max-w-[200px] truncate">
                            {lead.message ? lead.message.slice(0, 80) + (lead.message.length > 80 ? "..." : "") : <span className="text-slate-300">&mdash;</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* ── Latest Reviews ── */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-900">Latest Reviews</h3>
                {reviews.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-amber-400 text-sm">{"★".repeat(Math.round(Number(stats?.avgRating || advisor?.rating || 0)))}</span>
                    <span className="text-xs font-bold text-slate-700">{stats?.avgRating || (advisor?.rating ? Number(advisor.rating).toFixed(1) : "N/A")}</span>
                    <span className="text-[0.62rem] text-slate-400">({stats?.reviewCount || 0})</span>
                  </div>
                )}
              </div>
              {reviews.length === 0 ? (
                <div className="py-6 text-center">
                  <Icon name="star" size={28} className="text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">No reviews yet. Ask happy clients to leave a review on your profile.</p>
                  <Link href={`/advisor/${advisor?.slug}`} target="_blank" className="inline-block mt-2 text-xs font-semibold text-violet-600 hover:text-violet-700">Share review link &rarr;</Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {reviews.slice(0, 4).map((r) => (
                    <div key={r.id} className="border border-slate-100 rounded-lg p-3 hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-violet-100 rounded-full flex items-center justify-center text-[0.56rem] font-bold text-violet-700">
                            {r.reviewer_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="text-sm font-semibold text-slate-900">{r.reviewer_name}</span>
                            <div className="text-[0.56rem] text-slate-400">{new Date(r.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5">
                          {[1,2,3,4,5].map(s => (
                            <span key={s} className={`text-sm ${s <= r.rating ? "text-amber-400" : "text-slate-200"}`}>★</span>
                          ))}
                        </div>
                      </div>
                      {r.title && <div className="text-xs font-semibold text-slate-800 mb-1">{r.title}</div>}
                      {r.body && <p className="text-xs text-slate-600 leading-relaxed">{r.body.slice(0, 200)}{r.body.length > 200 ? "..." : ""}</p>}
                      {(r.communication_rating || r.expertise_rating || r.value_for_money_rating) && (
                        <div className="flex gap-3 mt-2">
                          {r.communication_rating && <span className="text-[0.56rem] text-slate-400">Communication: <strong className="text-slate-600">{r.communication_rating}/5</strong></span>}
                          {r.expertise_rating && <span className="text-[0.56rem] text-slate-400">Expertise: <strong className="text-slate-600">{r.expertise_rating}/5</strong></span>}
                          {r.value_for_money_rating && <span className="text-[0.56rem] text-slate-400">Value: <strong className="text-slate-600">{r.value_for_money_rating}/5</strong></span>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Quick actions ── */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <button onClick={() => setView("profile")} className="bg-white border border-slate-200 rounded-xl p-4 text-left hover:bg-slate-50 hover:shadow-sm transition-all">
                <Icon name="user" size={20} className="text-violet-600 mb-2" />
                <div className="text-sm font-bold text-slate-900">Edit Profile</div>
                <div className="text-xs text-slate-500">Update bio, fees, specialties</div>
              </button>
              <Link href={`/advisor/${advisor?.slug}`} target="_blank" className="bg-white border border-slate-200 rounded-xl p-4 text-left hover:bg-slate-50 hover:shadow-sm transition-all">
                <Icon name="external-link" size={20} className="text-blue-600 mb-2" />
                <div className="text-sm font-bold text-slate-900">View Public Profile</div>
                <div className="text-xs text-slate-500">See how investors see you</div>
              </Link>
              <button onClick={() => setView("billing")} className="bg-white border border-slate-200 rounded-xl p-4 text-left hover:bg-slate-50 hover:shadow-sm transition-all">
                <Icon name="credit-card" size={20} className="text-emerald-600 mb-2" />
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
            <p className="text-sm text-slate-500 mb-4">{stats?.totalLeads || 0} total · {leads.filter(l => l.status === "new").length} new</p>

            {/* Lead pricing & credit balance */}
            <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 mb-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xs font-bold text-violet-800 mb-1">Your Lead Account</h3>
                  <p className="text-xs text-violet-600">
                    {advisor?.free_leads_used !== undefined && advisor.free_leads_used < 2
                      ? <>You have <strong>{2 - (advisor.free_leads_used || 0)} free leads</strong> remaining. After that, leads are deducted from your credit balance.</>
                      : (advisor?.credit_balance_cents || 0) > 0
                        ? <>Leads are deducted from your credit balance. Each enquiry is exclusive to you.</>
                        : <>Your credit balance is empty. <strong>Top up to continue receiving leads.</strong></>
                    }
                  </p>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <span className="text-lg font-extrabold text-violet-900">${((advisor?.credit_balance_cents || 0) / 100).toFixed(0)}</span>
                  <span className="text-[0.6rem] text-violet-500 block">credit balance</span>
                </div>
              </div>
              {/* Credit Pack Options */}
              <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-violet-200/60">
                {[
                  { name: "Starter", leads: 5, price: 199, slug: "starter", badge: "" },
                  { name: "Growth", leads: 12, price: 449, slug: "growth", badge: "Popular" },
                  { name: "Scale", leads: 25, price: 799, slug: "scale", badge: "Best Value" },
                ].map((pack) => (
                  <button
                    key={pack.slug}
                    type="button"
                    tabIndex={0}
                    onClick={async () => {
                      const res = await fetch("/api/advisor-auth/topup", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ amount_cents: pack.price * 100, pack_slug: pack.slug }),
                      });
                      const data = await res.json();
                      if (data.url) window.location.href = data.url;
                      else alert(data.error || "Failed to create checkout session");
                    }}
                    className={`relative flex flex-col items-center p-2.5 rounded-lg border text-center transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 ${
                      pack.slug === "growth"
                        ? "bg-violet-600 text-white border-violet-600 hover:bg-violet-700"
                        : "bg-white text-slate-700 border-slate-200 hover:border-violet-300"
                    }`}
                  >
                    {pack.badge && (
                      <span className={`absolute -top-2 text-[0.5rem] font-bold px-1.5 py-0.5 rounded-full ${
                        pack.slug === "growth" ? "bg-amber-400 text-amber-900" : "bg-emerald-100 text-emerald-700"
                      }`}>{pack.badge}</span>
                    )}
                    <span className="text-[0.6rem] font-bold uppercase tracking-wider opacity-70 mt-1">{pack.name}</span>
                    <span className="text-lg font-extrabold">${pack.price}</span>
                    <span className="text-[0.55rem] opacity-70">{pack.leads} leads · ${Math.round(pack.price / pack.leads)}/ea</span>
                  </button>
                ))}
              </div>
            </div>

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
                      {lead.quality_score != null && (
                        <span className={`text-[0.56rem] font-semibold px-1.5 py-0.5 rounded-full ${
                          lead.quality_score >= 60 ? "bg-emerald-100 text-emerald-700" :
                          lead.quality_score >= 30 ? "bg-amber-100 text-amber-700" :
                          "bg-slate-100 text-slate-500"
                        }`}>Quality: {lead.quality_score}/100</span>
                      )}
                      {lead.bill_amount_cents > 0 && (
                        <span className="text-[0.56rem] text-slate-400">${(lead.bill_amount_cents / 100).toFixed(0)} billed</span>
                      )}
                      {lead.bill_amount_cents === 0 && lead.billed === false && (
                        <span className="text-[0.56rem] text-emerald-600 font-semibold">Free trial lead</span>
                      )}
                      {lead.status === "new" && (
                        <button onClick={() => updateLeadStatus(lead.id, "contacted")} className="text-xs font-semibold text-blue-600 hover:text-blue-800 px-2 py-1 border border-blue-200 rounded-lg hover:bg-blue-50">Mark Contacted</button>
                      )}
                      {(lead.status === "new" || lead.status === "contacted") && (
                        <button onClick={() => updateLeadStatus(lead.id, "converted")} className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 px-2 py-1 border border-emerald-200 rounded-lg hover:bg-emerald-50">Mark Converted</button>
                      )}
                      {lead.status !== "lost" && lead.status !== "converted" && (
                        <button onClick={() => updateLeadStatus(lead.id, "lost")} className="text-xs font-semibold text-red-500 hover:text-red-700 px-2 py-1 border border-red-200 rounded-lg hover:bg-red-50">Mark Lost</button>
                      )}
                      {(() => {
                        const daysSince = Math.floor((Date.now() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24));
                        const canDispute = daysSince <= 14 && lead.billed;
                        const daysLeft = 14 - daysSince;
                        return (
                          <button
                            onClick={async () => {
                              const reason = prompt("Dispute reason:\n1. spam\n2. wrong_number\n3. fake_details\n4. not_genuine\n5. duplicate\n6. other\n\nEnter reason:");
                              if (!reason) return;
                              const validReasons = ["spam", "wrong_number", "fake_details", "not_genuine", "duplicate", "other"];
                              const r = validReasons.includes(reason) ? reason : "other";
                              const details = r === "other" ? prompt("Please describe the issue:") : null;
                              const res = await fetch("/api/advisor-auth/disputes", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ leadId: lead.id, reason: r, details }),
                              });
                              if (res.ok) alert("Dispute submitted. We'll review within 10 business days.");
                              else { const d = await res.json(); alert(d.error || "Failed to submit dispute."); }
                            }}
                            disabled={!canDispute}
                            className={`text-xs font-semibold px-2 py-1 border rounded-lg ${canDispute ? "text-slate-400 hover:text-slate-600 border-slate-200 hover:bg-slate-50" : "text-slate-300 border-slate-100 cursor-not-allowed"}`}
                            title={!canDispute ? (daysSince > 14 ? "Dispute window closed (14 days)" : "Free leads cannot be disputed") : `${daysLeft} days left to dispute`}
                          >
                            Dispute{canDispute && daysLeft <= 5 ? ` (${daysLeft}d left)` : ""}
                          </button>
                        );
                      })()}
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
              {/* Profile Photo */}
              <div className="flex flex-col items-center pb-2 border-b border-slate-100">
                <AdvisorPhotoUpload
                  currentPhotoUrl={advisor.photo_url}
                  advisorSlug={advisor.slug}
                  onPhotoUpdated={(url) => setAdvisor({ ...advisor, photo_url: url })}
                />
              </div>

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

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Booking Link (Calendly / Cal.com)</label>
                <input
                  value={advisor.booking_link || ""}
                  onChange={(e) => setAdvisor({ ...advisor, booking_link: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  placeholder="https://calendly.com/your-name/30min"
                />
                <p className="text-[0.55rem] text-slate-400 mt-1">Paste your Calendly or Cal.com link. A &quot;Book Free Call&quot; button will appear on your profile.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Booking Intro (optional)</label>
                <input
                  value={advisor.booking_intro || ""}
                  onChange={(e) => setAdvisor({ ...advisor, booking_intro: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  placeholder="e.g. Book a free 30-minute consultation"
                />
              </div>

              {/* Special Offer / Deal */}
              <div className="border-t border-slate-100 pt-4 mt-2">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <label className="block text-sm font-bold text-slate-900">Special Offer</label>
                    <p className="text-[0.62rem] text-slate-500">Create a promotional offer shown on your profile and the Deals page.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAdvisor({ ...advisor, offer_active: !advisor.offer_active })}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${advisor.offer_active ? "bg-violet-600" : "bg-slate-200"}`}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition-transform ${advisor.offer_active ? "translate-x-5" : "translate-x-0"}`} />
                  </button>
                </div>

                {advisor.offer_active && (
                  <div className="space-y-3 bg-violet-50 border border-violet-200/60 rounded-lg p-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Offer Headline</label>
                      <input
                        value={advisor.offer_text || ""}
                        onChange={(e) => setAdvisor({ ...advisor, offer_text: e.target.value })}
                        className="w-full px-3 py-2 border border-violet-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                        placeholder="e.g. Free 30-minute initial consultation"
                        maxLength={100}
                      />
                      <p className="text-[0.55rem] text-slate-400 mt-1">Keep it short and compelling. This is the main text investors see.</p>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Terms & Conditions (optional)</label>
                      <input
                        value={advisor.offer_terms || ""}
                        onChange={(e) => setAdvisor({ ...advisor, offer_terms: e.target.value })}
                        className="w-full px-3 py-2 border border-violet-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                        placeholder="e.g. New clients only. Valid until March 2026."
                        maxLength={200}
                      />
                    </div>
                    {advisor.offer_text && (
                      <div className="bg-white border border-violet-100 rounded-lg p-3">
                        <p className="text-[0.58rem] font-bold uppercase tracking-wider text-violet-500 mb-1">Preview</p>
                        <p className="text-sm font-bold text-violet-700">{advisor.offer_text}</p>
                        {advisor.offer_terms && <p className="text-[0.62rem] text-violet-500 mt-0.5">{advisor.offer_terms}</p>}
                      </div>
                    )}
                  </div>
                )}
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
            <h1 className="text-xl font-bold text-slate-900 mb-1">Billing & Credits</h1>
            <p className="text-sm text-slate-500 mb-6">Purchase lead credits and view your payment history.</p>

            {/* Current balance */}
            <div className="bg-violet-50 border border-violet-200 rounded-xl p-5 mb-6">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-bold text-violet-900">Credit Balance</h3>
                <span className="text-2xl font-extrabold text-violet-900">${((advisor?.credit_balance_cents || 0) / 100).toFixed(0)}</span>
              </div>
              <p className="text-xs text-violet-600">
                ~{Math.floor((advisor?.credit_balance_cents || 0) / (advisor?.lead_price_cents || 3980))} leads remaining · Lifetime spend: ${((advisor?.lifetime_lead_spend_cents || 0) / 100).toFixed(0)}
              </p>
            </div>

            {/* Credit Packs */}
            <h2 className="text-base font-bold text-slate-900 mb-3">Buy Lead Credits</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
              {[
                { name: "Starter", leads: 5, price: 199, perLead: 39.80, slug: "starter", badge: "", desc: "Perfect for testing" },
                { name: "Growth", leads: 12, price: 449, perLead: 37.42, slug: "growth", badge: "Most Popular", desc: "Best for most advisors" },
                { name: "Scale", leads: 25, price: 799, perLead: 31.96, slug: "scale", badge: "Best Value", desc: "20% savings per lead" },
              ].map((pack) => (
                <div key={pack.slug} className={`relative bg-white border rounded-xl p-5 text-center ${pack.slug === "growth" ? "border-violet-400 ring-2 ring-violet-100" : "border-slate-200"}`}>
                  {pack.badge && (
                    <span className={`absolute -top-2.5 left-1/2 -translate-x-1/2 text-[0.6rem] font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap ${
                      pack.slug === "growth" ? "bg-violet-600 text-white" : "bg-emerald-100 text-emerald-700"
                    }`}>{pack.badge}</span>
                  )}
                  <h3 className="text-sm font-bold text-slate-900 mt-1">{pack.name}</h3>
                  <div className="text-3xl font-extrabold text-slate-900 my-2">${pack.price}</div>
                  <p className="text-xs text-slate-500 mb-1">{pack.leads} exclusive leads</p>
                  <p className="text-xs text-slate-400 mb-3">${pack.perLead.toFixed(2)} per lead</p>
                  <button
                    onClick={async () => {
                      const res = await fetch("/api/advisor-auth/topup", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ amount_cents: pack.price * 100, pack_slug: pack.slug }),
                      });
                      const data = await res.json();
                      if (data.url) window.location.href = data.url;
                      else alert(data.error || "Failed to create checkout session");
                    }}
                    className={`w-full py-2.5 rounded-lg text-sm font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 ${
                      pack.slug === "growth"
                        ? "bg-violet-600 text-white hover:bg-violet-700"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    Buy {pack.name}
                  </button>
                  <p className="text-[0.6rem] text-slate-400 mt-2">{pack.desc}</p>
                </div>
              ))}
            </div>

            {/* Billing summary */}
            {/* Featured Advisor */}
            <h2 className="text-base font-bold text-slate-900 mb-3">Boost Your Visibility</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
              <div className="bg-white border border-amber-200 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Icon name="star" size={18} className="text-amber-500" />
                  <h3 className="text-sm font-bold text-slate-900">Featured Advisor</h3>
                </div>
                <div className="text-2xl font-extrabold text-slate-900 mb-1">$149<span className="text-sm font-normal text-slate-400">/month</span></div>
                <ul className="text-xs text-slate-600 space-y-1 mb-3">
                  <li className="flex items-center gap-1.5"><Icon name="check" size={12} className="text-emerald-500" />Featured badge on your profile</li>
                  <li className="flex items-center gap-1.5"><Icon name="check" size={12} className="text-emerald-500" />Priority listing on city pages</li>
                  <li className="flex items-center gap-1.5"><Icon name="check" size={12} className="text-emerald-500" />Gold border on search results</li>
                  <li className="flex items-center gap-1.5"><Icon name="check" size={12} className="text-emerald-500" />Monthly performance report</li>
                </ul>
                {advisor?.featured_until && new Date(advisor.featured_until) > new Date() ? (
                  <p className="text-xs text-amber-700 font-semibold">Active until {new Date(advisor.featured_until).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}</p>
                ) : (
                  <button
                    onClick={async () => {
                      const res = await fetch("/api/advisor-auth/topup", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ amount_cents: 14900, pack_slug: "featured_monthly" }),
                      });
                      const data = await res.json();
                      if (data.url) window.location.href = data.url;
                      else alert(data.error || "Failed to create checkout session");
                    }}
                    className="w-full py-2 rounded-lg text-sm font-bold bg-amber-500 text-white hover:bg-amber-600 transition-all"
                  >
                    Get Featured
                  </button>
                )}
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Icon name="file-text" size={18} className="text-violet-500" />
                  <h3 className="text-sm font-bold text-slate-900">Expert Article</h3>
                </div>
                <div className="text-2xl font-extrabold text-slate-900 mb-1">$299<span className="text-sm font-normal text-slate-400">/article</span></div>
                <ul className="text-xs text-slate-600 space-y-1 mb-3">
                  <li className="flex items-center gap-1.5"><Icon name="check" size={12} className="text-emerald-500" />SEO-optimised article on invest.com.au</li>
                  <li className="flex items-center gap-1.5"><Icon name="check" size={12} className="text-emerald-500" />Permanent placement with your byline</li>
                  <li className="flex items-center gap-1.5"><Icon name="check" size={12} className="text-emerald-500" />Backlink to your advisor profile</li>
                  <li className="flex items-center gap-1.5"><Icon name="check" size={12} className="text-emerald-500" />Builds your E-E-A-T authority</li>
                </ul>
                <button
                  onClick={() => setView("articles")}
                  className="w-full py-2 rounded-lg text-sm font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all"
                >
                  Write an Article →
                </button>
              </div>
            </div>

            <h2 className="text-base font-bold text-slate-900 mb-3">Payment History</h2>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="text-xs text-slate-500 font-medium">Total Charged</div>
                <div className="text-2xl font-extrabold text-slate-900 mt-1">${((stats?.totalBilledCents || 0) / 100).toFixed(0)}</div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="text-xs text-slate-500 font-medium">Outstanding</div>
                <div className="text-2xl font-extrabold text-amber-600 mt-1">${((stats?.pendingBilledCents || 0) / 100).toFixed(0)}</div>
              </div>
            </div>

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

        {/* ═══ ARTICLES ═══ */}
        {/* ── ANALYTICS ── */}
        {view === "analytics" && (
          <div className="space-y-4 md:space-y-6">
            <div>
              <h2 className="text-lg md:text-xl font-bold text-slate-900">Performance Analytics</h2>
              <p className="text-xs text-slate-500 mt-0.5">How your profile and content are performing across invest.com.au</p>
            </div>

            {/* Top-level metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Profile Views", value: stats?.totalViews30d || 0, sub: "last 30 days", icon: "eye", color: "text-blue-600", bg: "bg-blue-50" },
                { label: "Enquiries", value: stats?.leads30d || 0, sub: "last 30 days", icon: "inbox", color: "text-violet-600", bg: "bg-violet-50" },
                { label: "Conversion Rate", value: stats?.conversionRate || "0%", sub: "views → enquiries", icon: "target", color: "text-emerald-600", bg: "bg-emerald-50" },
                { label: "Rating", value: advisor?.rating ? `${advisor.rating}/5` : "—", sub: `${advisor?.review_count || 0} reviews`, icon: "star", color: "text-amber-600", bg: "bg-amber-50" },
              ].map((s, i) => (
                <div key={i} className="bg-white border border-slate-200 rounded-xl p-3 md:p-4">
                  <div className={`w-8 h-8 ${s.bg} rounded-lg flex items-center justify-center mb-2`}>
                    <Icon name={s.icon} size={16} className={s.color} />
                  </div>
                  <p className="text-lg md:text-2xl font-bold text-slate-900">{typeof s.value === "number" ? s.value.toLocaleString() : s.value}</p>
                  <p className="text-[0.6rem] md:text-xs text-slate-500">{s.label}</p>
                  <p className="text-[0.55rem] md:text-[0.6rem] text-slate-400">{s.sub}</p>
                </div>
              ))}
            </div>

            {/* Engagement breakdown */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-5">
              <h3 className="text-sm font-bold text-slate-900 mb-3">Engagement Breakdown</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                  { label: "Phone Clicks", value: stats?.phoneClicks || 0, icon: "phone" },
                  { label: "Website Visits", value: stats?.websiteClicks || 0, icon: "globe" },
                  { label: "Booking Clicks", value: stats?.bookingClicks || 0, icon: "calendar" },
                  { label: "Article Views", value: stats?.articleViews || 0, icon: "file-text" },
                  { label: "Search Appearances", value: stats?.searchImpressions || 0, icon: "search" },
                ].map((m, i) => (
                  <div key={i} className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-50">
                    <Icon name={m.icon} size={16} className="text-slate-400 shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-slate-900">{m.value.toLocaleString()}</p>
                      <p className="text-[0.55rem] text-slate-400">{m.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Lead funnel */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-5">
              <h3 className="text-sm font-bold text-slate-900 mb-3">Lead Funnel</h3>
              <div className="grid grid-cols-4 gap-2 text-center">
                {[
                  { label: "Total Leads", value: stats?.totalLeads || 0, color: "bg-blue-100 text-blue-700" },
                  { label: "Contacted", value: leads.filter(l => l.status === "contacted").length, color: "bg-amber-100 text-amber-700" },
                  { label: "Converted", value: stats?.convertedLeads || 0, color: "bg-emerald-100 text-emerald-700" },
                  { label: "Lost", value: leads.filter(l => l.status === "lost").length, color: "bg-slate-100 text-slate-600" },
                ].map((s, i) => (
                  <div key={i} className={`rounded-xl p-3 ${s.color}`}>
                    <p className="text-lg md:text-xl font-bold">{s.value}</p>
                    <p className="text-[0.55rem] md:text-xs font-medium">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Article performance */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-5">
              <h3 className="text-sm font-bold text-slate-900 mb-1">Article Performance</h3>
              <p className="text-[0.6rem] text-slate-400 mb-3">How your published expert articles are performing</p>
              {(stats?.articles || []).length > 0 ? (
                <div className="space-y-2">
                  {(stats?.articles as { title: string; views: number; clicks: number; slug: string }[] || []).map((art, i) => (
                    <div key={i} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-slate-900 truncate">{art.title}</p>
                      </div>
                      <div className="flex items-center gap-4 text-[0.6rem] text-slate-500 shrink-0 ml-3">
                        <span><strong className="text-slate-700">{art.views}</strong> views</span>
                        <span><strong className="text-slate-700">{art.clicks}</strong> profile clicks</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-sm text-slate-400">
                  <Icon name="file-text" size={24} className="text-slate-300 mx-auto mb-2" />
                  No articles published yet. <button onClick={() => setView("articles")} className="text-violet-600 hover:text-violet-800 font-medium">Write one →</button>
                </div>
              )}
            </div>

            {/* Tips */}
            <div className="bg-gradient-to-r from-violet-50 to-blue-50 border border-violet-200 rounded-xl p-4 md:p-5">
              <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                <Icon name="lightbulb" size={16} className="text-amber-500" />
                Tips to Improve Performance
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-600">
                {[
                  profileCompleteness && profileCompleteness.score < 100 ? `Complete your profile (${profileCompleteness.score}%) — complete profiles get 3x more enquiries` : null,
                  !advisor?.photo_url?.startsWith("http") || advisor?.photo_url?.includes("ui-avatars") ? "Add a real profile photo — advisors with photos get 2.5x more clicks" : null,
                  !advisor?.booking_link ? "Add a booking link — lets investors schedule directly from your profile" : null,
                  (stats?.articles || []).length === 0 ? "Publish an expert article — advisors with articles get 40% more profile views" : null,
                  advisor?.review_count === 0 ? "Ask a client to leave a review — ratings build trust with new enquiries" : null,
                ].filter(Boolean).map((tip, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 bg-white/60 rounded-lg">
                    <Icon name="arrow-right" size={12} className="text-violet-500 shrink-0 mt-0.5" />
                    <span>{tip}</span>
                  </div>
                ))}
                {[profileCompleteness?.score === 100, advisor?.photo_url && !advisor.photo_url.includes("ui-avatars"), advisor?.booking_link, (stats?.articles || []).length > 0, (advisor?.review_count || 0) > 0].every(Boolean) && (
                  <div className="col-span-full text-center py-2 text-emerald-600 font-medium">
                    <Icon name="check-circle" size={16} className="inline mr-1" />
                    Your profile is fully optimised!
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {view === "articles" && <AdvisorArticlesSection advisorId={advisor?.id} />}

        {/* ─── TEAM (firm admins only) ─── */}
        {view === "team" && isFirmAdmin && (
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-1">Team Management</h2>
            <p className="text-sm text-slate-500 mb-6">Invite advisors to join your firm on Invest.com.au. Each member gets their own verified profile.</p>

            {/* Invite form */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6">
              <h3 className="text-sm font-bold text-slate-900 mb-3">Invite a Team Member</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="Name (optional)" className="px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="Email address *" className="px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                <button onClick={sendInvite} disabled={inviteStatus === "sending" || !inviteEmail.trim()} className="px-4 py-2 bg-slate-900 text-white font-semibold rounded-lg text-sm hover:bg-slate-800 disabled:opacity-50 transition-colors">
                  {inviteStatus === "sending" ? "Sending..." : inviteStatus === "sent" ? "Sent!" : "Send Invite"}
                </button>
              </div>
              {inviteStatus === "error" && <p className="text-xs text-red-600 mt-2">Failed to send invite. Please try again.</p>}
            </div>

            {/* Current members */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6">
              <h3 className="text-sm font-bold text-slate-900 mb-3">Team Members ({firmMembers.length})</h3>
              {firmMembers.length === 0 ? (
                <p className="text-sm text-slate-400">No team members yet. Invite your first advisor above.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {firmMembers.map((m) => (
                    <div key={m.id} className="py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {m.photo_url ? (
                          <img src={m.photo_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 bg-violet-100 rounded-full flex items-center justify-center text-xs font-bold text-violet-600">{m.name?.[0]}</div>
                        )}
                        <div>
                          <div className="text-sm font-semibold text-slate-900">{m.name}</div>
                          <div className="text-[0.62rem] text-slate-500">{m.email} · {PROFESSIONAL_TYPE_LABELS[m.type as keyof typeof PROFESSIONAL_TYPE_LABELS] || m.type}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {m.verified && <span className="text-[0.56rem] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-semibold">Verified</span>}
                        <span className={`text-[0.56rem] px-1.5 py-0.5 rounded font-semibold ${m.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{m.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pending invitations */}
            {firmInvites.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <h3 className="text-sm font-bold text-slate-900 mb-3">Pending Invitations</h3>
                <div className="divide-y divide-slate-100">
                  {firmInvites.map((inv) => (
                    <div key={inv.id} className="py-3 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-slate-900">{inv.name || inv.email}</div>
                        {inv.name && <div className="text-[0.62rem] text-slate-500">{inv.email}</div>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[0.56rem] px-1.5 py-0.5 rounded font-semibold ${inv.status === "pending" ? "bg-amber-50 text-amber-700" : inv.status === "accepted" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{inv.status}</span>
                        <span className="text-[0.56rem] text-slate-400">Expires {new Date(inv.expires_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══ ADVISOR ARTICLES SECTION ═══
type ArticleItem = {
  id: number; title: string; slug: string; content: string; excerpt: string;
  status: string; category: string; tags: string[];
  created_at: string; submitted_at: string | null; published_at: string | null;
  view_count: number; click_count: number; admin_notes: string | null;
  rejection_reason: string | null;
  pricing_tier: string; payment_status: string; price_cents: number;
};

const CATEGORIES = ["Investing", "Super & SMSF", "Tax & Strategy", "Property", "Retirement", "Insurance", "Estate Planning", "General"];
const PRICING_TIERS = [
  { key: "free", label: "Free", desc: "Article on your advisor profile only — no placement on hub", price: "Free" },
  { key: "standard", label: "Standard — $199", desc: "Article with author byline + profile link on Expert hub", price: "$199" },
  { key: "premium", label: "Featured — $399", desc: "Above + homepage Expert Insights + newsletter feature", price: "$399" },
];

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  submitted: "bg-blue-100 text-blue-700",
  in_review: "bg-amber-100 text-amber-700",
  revision_requested: "bg-orange-100 text-orange-700",
  approved: "bg-emerald-100 text-emerald-700",
  published: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-700",
};

function AdvisorArticlesSection({ advisorId }: { advisorId?: number }) {
  const [articles, setArticles] = useState<ArticleItem[]>([]);
  const [mode, setMode] = useState<"list" | "write">("list");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [guidelines, setGuidelines] = useState<{ key: string; title: string; description: string }[]>([]);

  // Editor state
  const [editId, setEditId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [category, setCategory] = useState("General");
  const [tier, setTier] = useState("standard");

  useEffect(() => {
    if (!advisorId) return;
    fetch(`/api/advisor-articles?mode=advisor&professional_id=${advisorId}`)
      .then(r => r.json())
      .then(setArticles)
      .finally(() => setLoading(false));
    fetch("/api/advisor-articles?mode=guidelines")
      .then(r => r.json())
      .then(setGuidelines)
      .catch(() => {});
  }, [advisorId, mode]);

  const resetForm = () => { setEditId(null); setTitle(""); setContent(""); setExcerpt(""); setCategory("General"); setTier("standard"); };

  const handleSave = async (action: "save" | "submit") => {
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    try {
      if (editId) {
        await fetch("/api/advisor-articles", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editId, title, content, excerpt, category, pricing_tier: tier, action: action === "submit" ? "submit" : undefined }),
        });
      } else {
        await fetch("/api/advisor-articles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ professional_id: advisorId, title, content, excerpt, category, pricing_tier: tier, action: action === "submit" ? "submit" : undefined }),
        });
      }
      resetForm();
      setMode("list");
      // Refresh
      const res = await fetch(`/api/advisor-articles?mode=advisor&professional_id=${advisorId}`);
      setArticles(await res.json());
    } finally { setSaving(false); }
  };

  const [acknowledged, setAcknowledged] = useState(false);

  // Live content compliance checks
  const contentChecks = (() => {
    const wc = content.split(/\s+/).filter(Boolean).length;
    const lower = content.toLowerCase();
    const checks: { key: string; label: string; pass: boolean; severity: "error" | "warn" | "info" }[] = [
      { key: "words", label: `Minimum 600 words (${wc}/600)`, pass: wc >= 600, severity: wc < 300 ? "error" : "warn" },
      { key: "title", label: "Title is 20-80 characters", pass: title.length >= 20 && title.length <= 80, severity: "warn" },
      { key: "excerpt", label: "Excerpt is provided (50+ chars)", pass: (excerpt?.length || 0) >= 50, severity: "warn" },
      { key: "no_promo", label: "No promotional language detected", pass: !/(contact me|call us|my firm|visit our website|book a consultation with me|sign up now)/i.test(content), severity: "error" },
      { key: "no_guarantees", label: "No performance guarantees", pass: !/(guaranteed returns|will earn|promise.*return|guaranteed.*profit)/i.test(content), severity: "error" },
      { key: "disclaimer", label: "Contains general advice disclaimer", pass: /(general (advice|information)|not personal (financial )?advice|consult a (qualified )?professional)/i.test(content) || wc < 200, severity: "warn" },
      { key: "no_links", label: "No external self-promotion links", pass: !/(https?:\/\/(?!invest\.com\.au))/i.test(content) || /https?:\/\/(ato\.gov|asic\.gov|moneysmart)/i.test(content), severity: "warn" },
      { key: "aus_focus", label: "References Australian context", pass: /(australia|australian|asic|ato|asx|super(annuation)?|centrelink|franking|aud)/i.test(lower) || wc < 200, severity: "info" },
    ];
    return checks;
  })();
  const hasErrors = contentChecks.some(c => !c.pass && c.severity === "error");
  const passCount = contentChecks.filter(c => c.pass).length;

  if (loading) return <div className="animate-pulse space-y-3"><div className="h-8 w-48 bg-slate-200 rounded" /><div className="h-24 bg-slate-100 rounded-xl" /></div>;

  // ── EDITOR VIEW ──
  if (mode === "write") {
    const wc = content.split(/\s+/).filter(Boolean).length;
    return (
      <div>
        <button onClick={() => { resetForm(); setAcknowledged(false); setMode("list"); }} className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-700 mb-4">
          <Icon name="arrow-left" size={14} /> Back to articles
        </button>

        <h2 className="text-lg font-bold text-slate-900 mb-4">{editId ? "Edit Article" : "Write New Article"}</h2>

        {/* ═══ COMPLIANCE BRIEFING ═══ */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 md:p-5 mb-5">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center shrink-0">
              <Icon name="shield" size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Content & Compliance Guidelines</h3>
              <p className="text-xs text-slate-500 mt-0.5">All articles are reviewed by our editorial team before publication. Please ensure your content meets these requirements.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
            {/* Regulatory compliance */}
            <div className="bg-white/70 border border-amber-100 rounded-lg p-3">
              <h4 className="text-[0.65rem] font-bold text-amber-800 uppercase tracking-wide mb-1.5">Regulatory Requirements</h4>
              <ul className="text-[0.62rem] text-slate-600 space-y-1">
                <li className="flex gap-1.5"><span className="text-amber-500 shrink-0">⚖️</span> Include a <strong>general advice warning</strong> where applicable</li>
                <li className="flex gap-1.5"><span className="text-amber-500 shrink-0">🚫</span> <strong>No performance guarantees</strong> — never promise or imply specific returns</li>
                <li className="flex gap-1.5"><span className="text-amber-500 shrink-0">📋</span> State that content is <strong>general in nature, not personal advice</strong></li>
                <li className="flex gap-1.5"><span className="text-amber-500 shrink-0">🇦🇺</span> Reference <strong>Australian regulations</strong> (ASIC, ATO, APRA) where relevant</li>
              </ul>
            </div>

            {/* Content standards */}
            <div className="bg-white/70 border border-amber-100 rounded-lg p-3">
              <h4 className="text-[0.65rem] font-bold text-amber-800 uppercase tracking-wide mb-1.5">Content Standards</h4>
              <ul className="text-[0.62rem] text-slate-600 space-y-1">
                <li className="flex gap-1.5"><span className="text-amber-500 shrink-0">📝</span> Minimum <strong>600 words</strong>, recommended 800-1,500</li>
                <li className="flex gap-1.5"><span className="text-amber-500 shrink-0">🎯</span> <strong>Educational and informational</strong> — not a sales pitch for your firm</li>
                <li className="flex gap-1.5"><span className="text-amber-500 shrink-0">✅</span> <strong>Factual claims must be accurate</strong> and current (tax rates, rules, etc.)</li>
                <li className="flex gap-1.5"><span className="text-amber-500 shrink-0">🆕</span> Must be <strong>100% original</strong> — not published elsewhere or AI-generated without editing</li>
              </ul>
            </div>

            {/* What to avoid */}
            <div className="bg-white/70 border border-red-100 rounded-lg p-3">
              <h4 className="text-[0.65rem] font-bold text-red-700 uppercase tracking-wide mb-1.5">Will Be Rejected</h4>
              <ul className="text-[0.62rem] text-slate-600 space-y-1">
                <li className="flex gap-1.5"><span className="text-red-400 shrink-0">✗</span> Direct promotion of your firm or services (&quot;contact me&quot;, &quot;book a consultation&quot;)</li>
                <li className="flex gap-1.5"><span className="text-red-400 shrink-0">✗</span> Specific product recommendations presented as personal advice</li>
                <li className="flex gap-1.5"><span className="text-red-400 shrink-0">✗</span> External links to your own website or booking page</li>
                <li className="flex gap-1.5"><span className="text-red-400 shrink-0">✗</span> Plagiarised, scraped, or unsubstantially AI-generated content</li>
              </ul>
            </div>

            {/* What works well */}
            <div className="bg-white/70 border border-emerald-100 rounded-lg p-3">
              <h4 className="text-[0.65rem] font-bold text-emerald-700 uppercase tracking-wide mb-1.5">What Performs Best</h4>
              <ul className="text-[0.62rem] text-slate-600 space-y-1">
                <li className="flex gap-1.5"><span className="text-emerald-500 shrink-0">★</span> Real-world case studies (anonymised) from your practice</li>
                <li className="flex gap-1.5"><span className="text-emerald-500 shrink-0">★</span> Practical step-by-step guidance readers can act on</li>
                <li className="flex gap-1.5"><span className="text-emerald-500 shrink-0">★</span> Common mistakes or misconceptions you see clients make</li>
                <li className="flex gap-1.5"><span className="text-emerald-500 shrink-0">★</span> Timely topics (EOFY, super changes, market events)</li>
              </ul>
            </div>
          </div>

          {/* Dynamic guidelines from DB */}
          {guidelines.length > 0 && (
            <details className="group">
              <summary className="text-[0.62rem] font-semibold text-amber-700 cursor-pointer hover:text-amber-900">View full editorial guidelines ({guidelines.length} rules)</summary>
              <ul className="text-[0.62rem] text-slate-500 space-y-1 mt-2 pl-2 border-l-2 border-amber-200">
                {guidelines.map(g => (
                  <li key={g.key}><strong className="text-slate-600">{g.title}:</strong> {g.description}</li>
                ))}
              </ul>
            </details>
          )}

          <p className="text-[0.56rem] text-amber-600 mt-2">Your published article will link to your professional profile, building your credibility and driving enquiries. Better content = more visibility.</p>
        </div>

        {/* ═══ ARTICLE FORM ═══ */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. 5 SMSF Mistakes I See Every Tax Season" className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/30" />
            {title.length > 0 && title.length < 20 && <p className="text-[0.58rem] text-amber-600 mt-0.5">Title should be at least 20 characters for good SEO</p>}
            {title.length > 80 && <p className="text-[0.58rem] text-amber-600 mt-0.5">Title is over 80 characters — may be truncated in search results</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Publication Tier</label>
              <select value={tier} onChange={e => setTier(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg">
                {PRICING_TIERS.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
            </div>
          </div>

          <div className="bg-violet-50 border border-violet-200 rounded-lg p-3">
            <p className="text-xs font-bold text-violet-700 mb-1">{PRICING_TIERS.find(t => t.key === tier)?.label}</p>
            <p className="text-xs text-violet-600">{PRICING_TIERS.find(t => t.key === tier)?.desc}</p>
            <p className="text-[0.6rem] text-violet-400 mt-1">Payment is collected after admin approval, before publication.</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Excerpt <span className="font-normal text-slate-400">(1-2 sentences for preview cards)</span></label>
            <textarea value={excerpt} onChange={e => setExcerpt(e.target.value)} placeholder="Brief summary of what the article covers..." rows={2} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/30 resize-vertical" />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Content * <span className="font-normal text-slate-400">(Markdown supported)</span></label>
            <textarea value={content} onChange={e => setContent(e.target.value)} placeholder={"Write your article here. Use **bold**, *italic*, ## headings, and - bullet points.\n\nRemember to include a general advice disclaimer, e.g.:\n\"This is general information only and does not constitute personal financial advice. Consider your own circumstances before acting.\""} rows={16} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/30 resize-vertical font-mono" />
            <div className="flex items-center justify-between mt-1">
              <p className={`text-[0.58rem] ${wc < 600 ? "text-amber-600" : "text-emerald-600"}`}>{wc} words {wc < 600 ? `(${600 - wc} more needed)` : "✓"}</p>
              <p className="text-[0.58rem] text-slate-400">~{Math.max(1, Math.ceil(wc / 250))} min read</p>
            </div>
          </div>

          {/* ═══ LIVE COMPLIANCE CHECKS ═══ */}
          {(content.length > 100 || title.length > 5) && (
            <div className={`border rounded-xl p-3 ${hasErrors ? "bg-red-50 border-red-200" : passCount === contentChecks.length ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
              <div className="flex items-center gap-2 mb-2">
                <Icon name={hasErrors ? "alert-triangle" : passCount === contentChecks.length ? "check-circle" : "info"} size={14} />
                <h4 className="text-xs font-bold text-slate-700">
                  Content Checks ({passCount}/{contentChecks.length} passing)
                </h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                {contentChecks.map(c => (
                  <div key={c.key} className="flex items-center gap-1.5 text-[0.62rem]">
                    <span className={c.pass ? "text-emerald-500" : c.severity === "error" ? "text-red-500" : "text-amber-500"}>
                      {c.pass ? "✓" : c.severity === "error" ? "✗" : "!"}
                    </span>
                    <span className={c.pass ? "text-slate-500" : c.severity === "error" ? "text-red-700 font-semibold" : "text-amber-700"}>{c.label}</span>
                  </div>
                ))}
              </div>
              {hasErrors && <p className="text-[0.56rem] text-red-600 mt-1.5 font-semibold">Fix the errors above before submitting. Articles with compliance issues will be rejected.</p>}
            </div>
          )}

          {/* ═══ ACKNOWLEDGEMENT + SUBMIT ═══ */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input type="checkbox" checked={acknowledged} onChange={e => setAcknowledged(e.target.checked)} className="w-4 h-4 mt-0.5 rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
              <span className="text-xs text-slate-600 leading-relaxed">
                I confirm this article is <strong>original content</strong>, complies with the <strong>editorial guidelines</strong> above, does not constitute <strong>personal financial advice</strong>, and does not contain <strong>promotional material</strong> for my firm or any specific product. I agree to the{" "}
                <a href="/content-license" target="_blank" className="text-violet-600 underline hover:text-violet-800">Content Licence Agreement</a>{" "}
                and grant Invest.com.au a licence to publish, edit, and distribute this article. I understand articles that violate these guidelines will be rejected or require revision.
              </span>
            </label>
          </div>

          <div className="flex gap-2">
            <button onClick={() => handleSave("save")} disabled={saving || !title.trim() || !content.trim()} className="px-4 py-2.5 border border-slate-300 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50 disabled:opacity-40 transition-colors">
              {saving ? "Saving..." : "Save Draft"}
            </button>
            <button
              onClick={() => handleSave("submit")}
              disabled={saving || !title.trim() || !content.trim() || wc < 300 || hasErrors || !acknowledged}
              className="px-4 py-2.5 bg-violet-600 text-white text-sm font-bold rounded-lg hover:bg-violet-700 disabled:opacity-40 transition-colors"
            >
              {saving ? "Submitting..." : "Submit for Review"}
            </button>
            {!acknowledged && content.length > 100 && (
              <span className="self-center text-[0.62rem] text-amber-600">Please acknowledge the guidelines above</span>
            )}
            {wc > 0 && wc < 300 && (
              <span className="self-center text-[0.62rem] text-amber-600">Min 300 words to submit ({wc}/300)</span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── LIST VIEW ──
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Your Articles</h2>
          <p className="text-xs text-slate-500">Write expert content — get published on Invest.com.au with your profile linked.</p>
        </div>
        <button onClick={() => { resetForm(); setMode("write"); }} className="px-4 py-2 bg-violet-600 text-white text-sm font-bold rounded-lg hover:bg-violet-700 transition-colors flex items-center gap-1.5">
          <Icon name="plus" size={16} /> Write Article
        </button>
      </div>

      {/* Pricing overview */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        {PRICING_TIERS.map(t => (
          <div key={t.key} className="bg-white border border-slate-200 rounded-lg p-3 text-center">
            <div className="text-sm font-extrabold text-slate-900">{t.price}</div>
            <div className="text-[0.58rem] text-slate-500 capitalize">{t.key}</div>
            <div className="text-[0.5rem] text-slate-400 mt-0.5">{t.desc}</div>
          </div>
        ))}
      </div>

      {articles.length > 0 ? (
        <div className="space-y-2">
          {articles.map(a => (
            <div key={a.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-bold text-slate-900 truncate">{a.title}</h3>
                  <span className={`shrink-0 text-[0.56rem] font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[a.status] || "bg-slate-100 text-slate-600"}`}>
                    {a.status.replace("_", " ")}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[0.62rem] text-slate-400">
                  <span>{a.category}</span>
                  <span className="capitalize">{a.pricing_tier} tier</span>
                  <span>{a.payment_status}</span>
                  {a.published_at && <span>{new Date(a.published_at).toLocaleDateString("en-AU")}</span>}
                </div>
                {a.admin_notes && a.status === "revision_requested" && (
                  <div className="mt-2 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 text-xs text-orange-700">
                    <strong>Admin feedback:</strong> {a.admin_notes}
                  </div>
                )}
                {a.rejection_reason && a.status === "rejected" && (
                  <div className="mt-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
                    <strong>Reason:</strong> {a.rejection_reason}
                  </div>
                )}
                {a.admin_notes && a.status === "approved" && (
                  <div className="mt-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-xs text-emerald-700">
                    <strong>Editor note:</strong> {a.admin_notes}
                  </div>
                )}
                {a.status === "published" && (
                  <div className="flex items-center gap-3 mt-1.5 text-[0.62rem] text-slate-500">
                    <span>{a.view_count} views</span>
                    <span>{a.click_count} profile clicks</span>
                  </div>
                )}
              </div>
              <div className="flex gap-1.5 shrink-0">
                {(a.status === "draft" || a.status === "revision_requested") && (
                  <button onClick={() => {
                    setEditId(a.id);
                    setTitle(a.title);
                    setContent(a.content || "");
                    setExcerpt(a.excerpt || "");
                    setCategory(a.category || "General");
                    setTier(a.pricing_tier || "standard");
                    setMode("write");
                  }} className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50">Edit</button>
                )}
                {a.status === "published" && a.slug && (
                  <Link href={`/expert/${a.slug}`} target="_blank" className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50">View</Link>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
          <Icon name="file-text" size={32} className="text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-900 mb-1">No articles yet</h3>
          <p className="text-xs text-slate-500 mb-4">Write expert content to build your reputation and reach more investors.</p>
          <button onClick={() => { resetForm(); setMode("write"); }} className="px-4 py-2 bg-violet-600 text-white text-sm font-bold rounded-lg hover:bg-violet-700">Write Your First Article →</button>
        </div>
      )}
    </div>
  );
}
