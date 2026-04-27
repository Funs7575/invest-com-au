"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";
import Icon from "@/components/Icon";
import AdvisorPhotoUpload from "@/components/AdvisorPhotoUpload";
import LeadScoreBadge from "@/components/LeadScoreBadge";
import { PROFESSIONAL_TYPE_LABELS } from "@/lib/types";
import AdvisorPortalLogin from "./AdvisorPortalLogin";
import type {
  Advisor, FirmMember, FirmInvite, FirmDetails, FirmAnalyticsMember, FirmAnalyticsSummary,
  Lead, BillingRecord, Stats, ViewDay, Review, WeeklyEnquiry, ProfileCompleteness,
  CategoryPricing, DisputeModal, ViewType,
} from "./types";

const DashboardTab = dynamic(() => import("./DashboardTab"));
const LeadsTab = dynamic(() => import("./LeadsTab"));
const AnalyticsTab = dynamic(() => import("./AnalyticsTab"));

export default function AdvisorPortalPage() {
  const [view, setView] = useState<ViewType>("login");
  const [advisor, setAdvisor] = useState<Advisor | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [firmMembers, setFirmMembers] = useState<FirmMember[]>([]);
  const [firmInvites, setFirmInvites] = useState<FirmInvite[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteStatus, setInviteStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [firmDetails, setFirmDetails] = useState<FirmDetails | null>(null);
  const [firmMemberCount, setFirmMemberCount] = useState(0);
  const [firmAnalytics, setFirmAnalytics] = useState<{ members: FirmAnalyticsMember[]; summary: FirmAnalyticsSummary | null } | null>(null);
  const [firmTab, setFirmTab] = useState<"members" | "analytics" | "settings">("members");
  const [editingFirm, setEditingFirm] = useState<Partial<FirmDetails> | null>(null);
  const [savingFirm, setSavingFirm] = useState(false);
  const [firmSaved, setFirmSaved] = useState(false);
  const [seatRequestSeats, setSeatRequestSeats] = useState("");
  const [seatRequestReason, setSeatRequestReason] = useState("");
  const [seatRequestStatus, setSeatRequestStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [inviteActionStatus, setInviteActionStatus] = useState<Record<number, "idle" | "loading" | "done" | "error">>({});
  const [viewsByDay, setViewsByDay] = useState<ViewDay[]>([]);
  const [billing, setBilling] = useState<BillingRecord[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [categoryPricing, setCategoryPricing] = useState<CategoryPricing | null>(null);
  const [weeklyEnquiries, setWeeklyEnquiries] = useState<WeeklyEnquiry[]>([]);
  const [profileCompleteness, setProfileCompleteness] = useState<ProfileCompleteness | null>(null);
  const [loading, setLoading] = useState(true);
  const [leadSearch, setLeadSearch] = useState("");
  const [leadStatusFilter, setLeadStatusFilter] = useState<"all" | "new" | "contacted" | "converted" | "lost">("all");
  const [leadSortByQuality, setLeadSortByQuality] = useState(false);
  const [hotLeadsOnly, setHotLeadsOnly] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  // Dispute modal
  const [disputeModal, setDisputeModal] = useState<DisputeModal | null>(null);
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeDetails, setDisputeDetails] = useState("");
  const [disputeSubmitting, setDisputeSubmitting] = useState(false);
  const [disputeError, setDisputeError] = useState("");
  const [disputeDone, setDisputeDone] = useState(false);

  // Billing / topup history
  const [topupHistory, setTopupHistory] = useState<{ id: number; amount_cents: number; status: string; created_at: string }[]>([]);

  // Notification preferences
  type NotifPrefs = { new_lead: boolean; weekly_summary: boolean; billing_alerts: boolean; review_new: boolean };
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>({ new_lead: true, weekly_summary: true, billing_alerts: true, review_new: false });
  const [savingNotifs, setSavingNotifs] = useState(false);
  const [notifSaved, setNotifSaved] = useState(false);
  const [notifPrefsLoaded, setNotifPrefsLoaded] = useState(false);

  // Onboarding banner
  const [dismissedOnboarding, setDismissedOnboarding] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (token) {
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
      const [inviteRes, firmRes] = await Promise.all([
        fetch("/api/advisor-auth/firm/invite"),
        fetch("/api/advisor-auth/firm"),
      ]);
      if (inviteRes.ok) {
        const data = await inviteRes.json();
        setFirmMembers(data.members || []);
        setFirmInvites(data.invitations || []);
      }
      if (firmRes.ok) {
        const data = await firmRes.json();
        setFirmDetails(data.firm || null);
        setFirmMemberCount(data.memberCount || 0);
        setEditingFirm(data.firm || null);
      }
    } catch { /* ignore */ }
  }, []);

  const loadFirmAnalytics = useCallback(async () => {
    try {
      const res = await fetch("/api/advisor-auth/firm/analytics");
      if (res.ok) {
        const data = await res.json();
        setFirmAnalytics(data);
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
        if (data.categoryPricing) setCategoryPricing(data.categoryPricing);
        if (data.advisor) setAdvisor(data.advisor);
      }
    } catch { /* ignore */ }
  }, []);

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

  const loadTopupHistory = async () => {
    try {
      const res = await fetch("/api/advisor-auth/topup");
      if (res.ok) {
        const data = await res.json();
        setTopupHistory(data.topups || []);
      }
    } catch { /* ignore */ }
  };

  const loadNotifPrefs = async () => {
    if (notifPrefsLoaded) return;
    try {
      const res = await fetch("/api/advisor-auth/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifPrefs(data.prefs || { new_lead: true, weekly_summary: true, billing_alerts: true, review_new: false });
        setNotifPrefsLoaded(true);
      }
    } catch { /* ignore */ }
  };

  const saveNotifPrefs = async () => {
    setSavingNotifs(true);
    try {
      const res = await fetch("/api/advisor-auth/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prefs: notifPrefs }),
      });
      if (res.ok) {
        setNotifSaved(true);
        setTimeout(() => setNotifSaved(false), 3000);
      }
    } catch { /* ignore */ }
    setSavingNotifs(false);
  };

  const submitDispute = async () => {
    if (!disputeModal || !disputeReason) return;
    setDisputeSubmitting(true);
    setDisputeError("");
    try {
      const res = await fetch("/api/advisor-auth/disputes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: disputeModal.leadId, reason: disputeReason, details: disputeDetails || null }),
      });
      if (res.ok) {
        setDisputeDone(true);
      } else {
        const d = await res.json();
        setDisputeError(d.error || "Failed to submit dispute.");
      }
    } catch {
      setDisputeError("Network error. Please try again.");
    }
    setDisputeSubmitting(false);
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

  if (view === "login") {
    return <AdvisorPortalLogin />;
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
    { key: "settings", label: "Settings", icon: "settings" },
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
              onClick={() => { setView(item.key as ViewType); if (item.key === "team") { loadFirmData(); } if (item.key === "billing") { loadTopupHistory(); } if (item.key === "settings") { loadNotifPrefs(); } }}
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
          <DashboardTab
            advisor={advisor}
            stats={stats}
            leads={leads}
            profileCompleteness={profileCompleteness}
            reviews={reviews}
            viewsByDay={viewsByDay}
            weeklyEnquiries={weeklyEnquiries}
            dismissedOnboarding={dismissedOnboarding}
            isPending={isPending}
            onNavigate={setView}
            onDismissOnboarding={() => setDismissedOnboarding(true)}
          />
        )}

        {/* ─── LEADS ─── */}
        {view === "leads" && (
          <LeadsTab
            leads={leads}
            advisor={advisor}
            stats={stats}
            categoryPricing={categoryPricing}
            leadSearch={leadSearch}
            leadStatusFilter={leadStatusFilter}
            leadSortByQuality={leadSortByQuality}
            hotLeadsOnly={hotLeadsOnly}
            onLeadSearchChange={setLeadSearch}
            onLeadStatusFilterChange={setLeadStatusFilter}
            onLeadSortByQualityChange={setLeadSortByQuality}
            onHotLeadsOnlyChange={setHotLeadsOnly}
            onLeadsUpdate={setLeads}
            onOpenDisputeModal={(m) => { setDisputeModal(m); setDisputeReason(""); setDisputeDetails(""); setDisputeError(""); setDisputeDone(false); }}
            onUpdateLeadStatus={updateLeadStatus}
            onUpdateLeadNotes={updateLeadNotes}
          />
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
                ~{Math.floor((advisor?.credit_balance_cents || 0) / (advisor?.lead_price_cents || categoryPricing?.price_cents || 4900))} leads remaining · ${((advisor?.lead_price_cents || categoryPricing?.price_cents || 4900) / 100).toFixed(0)}/lead · Lifetime spend: ${((advisor?.lifetime_lead_spend_cents || 0) / 100).toFixed(0)}
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
                    type="button"
                    onClick={async () => {
                      try {
                        const res = await fetch("/api/advisor-auth/topup", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ amount_cents: pack.price * 100, pack_slug: pack.slug }),
                        });
                        const data = await res.json();
                        if (data.url) window.location.href = data.url;
                        else alert(data.error || "Failed to create checkout session. Please try again.");
                      } catch (err) {
                        alert("Something went wrong. Please check you're logged in and try again.");
                        console.error("Topup error:", err);
                      }
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
                    type="button"
                    onClick={async () => {
                      try {
                        const res = await fetch("/api/advisor-auth/topup", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ amount_cents: 14900, pack_slug: "featured_monthly" }),
                        });
                        const data = await res.json();
                        if (data.url) window.location.href = data.url;
                        else alert(data.error || "Failed to create checkout session. Please try again.");
                      } catch (err) {
                        alert("Something went wrong. Please check you're logged in and try again.");
                        console.error("Featured topup error:", err);
                      }
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

            {/* Lead billing records */}
            <h2 className="text-base font-bold text-slate-900 mb-3">Lead Charges</h2>
            {billing.length > 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-8">
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
              <div className="bg-white border border-slate-200 rounded-xl p-6 text-center mb-8">
                <p className="text-sm text-slate-500">No lead charges yet.</p>
              </div>
            )}

            {/* Credit topup history */}
            <h2 className="text-base font-bold text-slate-900 mb-3">Top-up History</h2>
            {topupHistory.length > 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="grid grid-cols-3 bg-slate-50 text-xs font-semibold text-slate-600 px-4 py-2 border-b border-slate-200">
                  <span>Date</span>
                  <span className="text-right">Amount</span>
                  <span className="text-right">Status</span>
                </div>
                {topupHistory.map((t) => (
                  <div key={t.id} className="grid grid-cols-3 px-4 py-2.5 text-xs border-b border-slate-100 last:border-b-0">
                    <span className="text-slate-500">{new Date(t.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}</span>
                    <span className="text-right font-semibold text-slate-900">${(t.amount_cents / 100).toFixed(0)}</span>
                    <span className="text-right">
                      <span className={`px-1.5 py-0.5 rounded-full text-[0.56rem] font-bold ${
                        t.status === "completed" ? "bg-emerald-100 text-emerald-700" :
                        t.status === "failed" ? "bg-red-100 text-red-700" :
                        "bg-amber-100 text-amber-700"
                      }`}>{t.status}</span>
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-xl p-5 text-center">
                <p className="text-sm text-slate-500">No top-ups yet. Purchase credits above to get started.</p>
              </div>
            )}
          </>
        )}

        {/* ═══ ARTICLES ═══ */}
        {/* ── ANALYTICS ── */}
        {view === "analytics" && (
          <AnalyticsTab
            stats={stats}
            advisor={advisor}
            leads={leads}
            profileCompleteness={profileCompleteness}
            onNavigate={setView}
          />
        )}

        {view === "articles" && <AdvisorArticlesSection advisorId={advisor?.id} />}

        {/* ─── SETTINGS ─── */}
        {view === "settings" && (
          <div className="max-w-xl">
            <h1 className="text-xl font-bold text-slate-900 mb-1">Settings</h1>
            <p className="text-sm text-slate-500 mb-6">Manage your notification preferences.</p>

            <div className="bg-white border border-slate-200 rounded-xl p-5 mb-5">
              <h2 className="text-sm font-bold text-slate-900 mb-1">Email Notifications</h2>
              <p className="text-xs text-slate-500 mb-4">Control which emails you receive from Invest.com.au</p>
              <div className="space-y-4">
                {([
                  { key: "new_lead", label: "New lead received", desc: "Instant alert when someone enquires about your services" },
                  { key: "billing_alerts", label: "Billing alerts", desc: "Low credit balance warnings and payment confirmations" },
                  { key: "weekly_summary", label: "Weekly performance summary", desc: "Views, enquiries, and conversion stats every Monday" },
                  { key: "review_new", label: "New review submitted", desc: "Notification when a client submits a review" },
                ] as { key: keyof NotifPrefs; label: string; desc: string }[]).map(({ key, label, desc }) => (
                  <div key={key} className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-800">{label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNotifPrefs(p => ({ ...p, [key]: !p[key] }))}
                      className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none ${notifPrefs[key] ? "bg-violet-600" : "bg-slate-200"}`}
                      role="switch"
                      aria-checked={notifPrefs[key]}
                    >
                      <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${notifPrefs[key] ? "translate-x-4" : "translate-x-0"}`} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-3 mt-5 pt-4 border-t border-slate-100">
                <button
                  onClick={saveNotifPrefs}
                  disabled={savingNotifs}
                  className="px-5 py-2.5 bg-slate-900 text-white font-semibold rounded-lg text-sm hover:bg-slate-800 disabled:opacity-50 transition-colors"
                >
                  {savingNotifs ? "Saving..." : "Save Preferences"}
                </button>
                {notifSaved && <span className="text-sm text-emerald-600 font-medium">Saved!</span>}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 mb-5">
              <h2 className="text-sm font-bold text-slate-900 mb-1">Compliance documents</h2>
              <p className="text-xs text-slate-500 mb-3">
                Upload AFSL, ABN, proof of ID and insurance certificates. Files
                are reviewed by compliance within 1 business day.
              </p>
              <Link
                href="/advisor-portal/kyc"
                className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg px-4 py-2 text-sm transition-colors"
              >
                Manage KYC documents →
              </Link>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h2 className="text-sm font-bold text-slate-900 mb-3">Account</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold text-slate-600">Email</p>
                  <p className="text-sm text-slate-800 mt-0.5">{advisor?.email}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-600">Profile Status</p>
                  <p className={`text-sm font-semibold mt-0.5 ${advisor?.status === "active" ? "text-emerald-600" : "text-amber-600"}`}>{advisor?.status}</p>
                </div>
                <div className="pt-2 border-t border-slate-100">
                  <Link href={`/advisor/${advisor?.slug}`} target="_blank" className="text-sm text-violet-600 hover:text-violet-800 font-medium">
                    View Public Profile ↗
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── TEAM (firm admins only) ─── */}
        {view === "team" && isFirmAdmin && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{firmDetails?.name || "Team"}</h2>
                <p className="text-xs text-slate-500 mt-0.5">{firmMemberCount} of {firmDetails?.max_seats || 10} seats used</p>
              </div>
              {/* Seat bar */}
              <div className="flex items-center gap-2">
                <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-violet-500 rounded-full" style={{ width: `${Math.min((firmMemberCount / (firmDetails?.max_seats || 10)) * 100, 100)}%` }} />
                </div>
                <span className="text-[0.62rem] text-slate-400">{firmMemberCount}/{firmDetails?.max_seats || 10}</span>
              </div>
            </div>

            {/* Sub-tabs */}
            <div className="flex gap-1 mb-5 bg-slate-100 p-1 rounded-lg w-fit">
              {(["members", "analytics", "settings"] as const).map((t) => (
                <button key={t} onClick={() => { setFirmTab(t); if (t === "analytics" && !firmAnalytics) loadFirmAnalytics(); }}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${firmTab === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                  {t === "members" ? "Members & Invites" : t === "analytics" ? "Analytics" : "Firm Settings"}
                </button>
              ))}
            </div>

            {/* ── MEMBERS TAB ── */}
            {firmTab === "members" && (
              <>
                {/* Invite form */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 mb-5">
                  <h3 className="text-sm font-bold text-slate-900 mb-3">Invite a Team Member</h3>
                  {firmMemberCount >= (firmDetails?.max_seats || 10) ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
                      <strong>Seat limit reached.</strong> You&apos;ve used all {firmDetails?.max_seats} seats. Go to <button onClick={() => setFirmTab("settings")} className="underline font-semibold">Firm Settings</button> to request more seats.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <input value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="Name (optional)" className="px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                      <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="Email address *" className="px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                      <button onClick={sendInvite} disabled={inviteStatus === "sending" || !inviteEmail.trim()} className="px-4 py-2 bg-slate-900 text-white font-semibold rounded-lg text-sm hover:bg-slate-800 disabled:opacity-50 transition-colors">
                        {inviteStatus === "sending" ? "Sending..." : inviteStatus === "sent" ? "Sent!" : "Send Invite"}
                      </button>
                    </div>
                  )}
                  {inviteStatus === "error" && <p className="text-xs text-red-600 mt-2">Failed to send invite. Please try again.</p>}
                </div>

                {/* Current members */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 mb-5">
                  <h3 className="text-sm font-bold text-slate-900 mb-3">Team Members ({firmMembers.length})</h3>
                  {firmMembers.length === 0 ? (
                    <p className="text-sm text-slate-400">No team members yet. Invite your first advisor above.</p>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {firmMembers.map((m) => (
                        <div key={m.id} className="py-3 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            {m.photo_url ? (
                              <Image src={m.photo_url} alt="" width={36} height={36} className="w-9 h-9 rounded-full object-cover shrink-0" sizes="36px" />
                            ) : (
                              <div className="w-9 h-9 bg-violet-100 rounded-full flex items-center justify-center text-xs font-bold text-violet-600 shrink-0">{m.name?.[0]}</div>
                            )}
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                                {m.name}
                                {m.id === advisor?.id && <span className="text-[0.5rem] bg-violet-100 text-violet-700 px-1 py-0.5 rounded font-bold uppercase">You</span>}
                              </div>
                              <div className="text-[0.62rem] text-slate-500 truncate">{m.email} · {PROFESSIONAL_TYPE_LABELS[m.type as keyof typeof PROFESSIONAL_TYPE_LABELS] || m.type}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {m.verified && <span className="text-[0.56rem] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-semibold hidden md:inline">Verified</span>}
                            {/* Role selector */}
                            <select
                              value={m.role || (m.is_firm_admin ? "owner" : "member")}
                              disabled={m.id === advisor?.id}
                              onChange={async (e) => {
                                const newRole = e.target.value;
                                const res = await fetch("/api/advisor-auth/firm/member", {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ memberId: m.id, role: newRole }),
                                });
                                if (res.ok) {
                                  setFirmMembers(prev => prev.map(fm => fm.id === m.id ? { ...fm, role: newRole, is_firm_admin: newRole !== "member" } : fm));
                                } else {
                                  const d = await res.json();
                                  alert(d.error || "Failed to update role");
                                }
                              }}
                              className="text-[0.62rem] border border-slate-200 rounded px-1.5 py-1 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <option value="owner">Owner</option>
                              <option value="manager">Manager</option>
                              <option value="member">Member</option>
                            </select>
                            <span className={`text-[0.56rem] px-1.5 py-0.5 rounded font-semibold ${m.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{m.status}</span>
                            {m.id !== advisor?.id && (
                              <button
                                onClick={async () => {
                                  if (!confirm(`Remove ${m.name} from the firm? Their individual profile will remain active.`)) return;
                                  const res = await fetch(`/api/advisor-auth/firm/member?memberId=${m.id}`, { method: "DELETE" });
                                  if (res.ok) {
                                    setFirmMembers(prev => prev.filter(fm => fm.id !== m.id));
                                    setFirmMemberCount(c => c - 1);
                                  } else {
                                    const d = await res.json();
                                    alert(d.error || "Failed to remove member");
                                  }
                                }}
                                className="text-[0.56rem] text-red-500 hover:text-red-700 border border-red-200 px-1.5 py-0.5 rounded hover:bg-red-50 transition-colors"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Invitations */}
                {firmInvites.length > 0 && (
                  <div className="bg-white border border-slate-200 rounded-xl p-5">
                    <h3 className="text-sm font-bold text-slate-900 mb-3">Invitations</h3>
                    <div className="divide-y divide-slate-100">
                      {firmInvites.map((inv) => (
                        <div key={inv.id} className="py-3 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-slate-900">{inv.name || inv.email}</div>
                            {inv.name && <div className="text-[0.62rem] text-slate-500">{inv.email}</div>}
                            <div className="text-[0.56rem] text-slate-400 mt-0.5">
                              Sent {new Date(inv.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short" })} ·{" "}
                              {inv.status === "pending" ? `Expires ${new Date(inv.expires_at).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}` : `Status: ${inv.status}`}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-[0.56rem] px-1.5 py-0.5 rounded font-semibold ${
                              inv.status === "pending" ? "bg-amber-50 text-amber-700" :
                              inv.status === "accepted" ? "bg-emerald-50 text-emerald-700" :
                              inv.status === "revoked" ? "bg-red-50 text-red-600" :
                              "bg-slate-100 text-slate-500"
                            }`}>{inv.status}</span>
                            {(inv.status === "pending" || inv.status === "expired") && (
                              <button
                                disabled={inviteActionStatus[inv.id] === "loading"}
                                onClick={async () => {
                                  setInviteActionStatus(prev => ({ ...prev, [inv.id]: "loading" }));
                                  const res = await fetch("/api/advisor-auth/firm/invite", {
                                    method: "PATCH",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ inviteId: inv.id, action: "resend" }),
                                  });
                                  if (res.ok) {
                                    setInviteActionStatus(prev => ({ ...prev, [inv.id]: "done" }));
                                    setTimeout(() => setInviteActionStatus(prev => ({ ...prev, [inv.id]: "idle" })), 3000);
                                    loadFirmData();
                                  } else {
                                    const d = await res.json();
                                    alert(d.error || "Failed to resend");
                                    setInviteActionStatus(prev => ({ ...prev, [inv.id]: "error" }));
                                  }
                                }}
                                className="text-[0.56rem] text-blue-600 border border-blue-200 px-1.5 py-0.5 rounded hover:bg-blue-50 transition-colors disabled:opacity-50"
                              >
                                {inviteActionStatus[inv.id] === "loading" ? "…" : inviteActionStatus[inv.id] === "done" ? "Sent!" : "Resend"}
                              </button>
                            )}
                            {inv.status === "pending" && (
                              <button
                                disabled={inviteActionStatus[inv.id] === "loading"}
                                onClick={async () => {
                                  if (!confirm("Revoke this invitation?")) return;
                                  setInviteActionStatus(prev => ({ ...prev, [inv.id]: "loading" }));
                                  const res = await fetch("/api/advisor-auth/firm/invite", {
                                    method: "PATCH",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ inviteId: inv.id, action: "revoke" }),
                                  });
                                  if (res.ok) {
                                    loadFirmData();
                                  } else {
                                    const d = await res.json();
                                    alert(d.error || "Failed to revoke");
                                    setInviteActionStatus(prev => ({ ...prev, [inv.id]: "error" }));
                                  }
                                }}
                                className="text-[0.56rem] text-red-500 border border-red-200 px-1.5 py-0.5 rounded hover:bg-red-50 transition-colors disabled:opacity-50"
                              >
                                Revoke
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ── ANALYTICS TAB ── */}
            {firmTab === "analytics" && (
              <>
                {!firmAnalytics ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-6 h-6 border-2 border-slate-200 border-t-violet-600 rounded-full animate-spin" />
                  </div>
                ) : (
                  <>
                    {firmAnalytics.summary && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                        {[
                          { label: "Total Views (30d)", value: firmAnalytics.summary.totalViews30d, icon: "eye", color: "text-blue-600", bg: "bg-blue-50" },
                          { label: "Enquiries (30d)", value: firmAnalytics.summary.totalLeads30d, icon: "inbox", color: "text-violet-600", bg: "bg-violet-50" },
                          { label: "Conversion Rate", value: firmAnalytics.summary.conversionRate, icon: "target", color: "text-emerald-600", bg: "bg-emerald-50" },
                          { label: "Total Credits", value: `$${((firmAnalytics.summary.totalCreditCents || 0) / 100).toFixed(0)}`, icon: "credit-card", color: "text-amber-600", bg: "bg-amber-50" },
                        ].map((s, i) => (
                          <div key={i} className="bg-white border border-slate-200 rounded-xl p-4">
                            <div className={`w-8 h-8 ${s.bg} rounded-lg flex items-center justify-center mb-2`}>
                              <Icon name={s.icon} size={16} className={s.color} />
                            </div>
                            <p className="text-lg font-bold text-slate-900">{typeof s.value === "number" ? s.value.toLocaleString() : s.value}</p>
                            <p className="text-xs text-slate-500">{s.label}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                      <div className="px-4 py-3 border-b border-slate-100">
                        <h3 className="text-sm font-bold text-slate-900">Performance by Member</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="bg-slate-50 text-[0.62rem] font-semibold text-slate-500 uppercase tracking-wider">
                              <th className="px-4 py-2">Advisor</th>
                              <th className="px-4 py-2 text-right">Views (30d)</th>
                              <th className="px-4 py-2 text-right">Leads (30d)</th>
                              <th className="px-4 py-2 text-right">Converted</th>
                              <th className="px-4 py-2 text-right">Credits</th>
                              <th className="px-4 py-2 text-right">Total Billed</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {firmAnalytics.members.map((m) => (
                              <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-2.5">
                                  <div className="flex items-center gap-2">
                                    {m.photo_url ? (
                                      <Image src={m.photo_url} alt="" width={24} height={24} className="w-6 h-6 rounded-full object-cover shrink-0" sizes="24px" />
                                    ) : (
                                      <div className="w-6 h-6 bg-violet-100 rounded-full flex items-center justify-center text-[0.56rem] font-bold text-violet-600 shrink-0">{m.name?.[0]}</div>
                                    )}
                                    <div>
                                      <div className="font-semibold text-slate-900 text-xs">{m.name}</div>
                                      <div className="text-[0.56rem] text-slate-400">{m.role || "member"}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-2.5 text-right font-medium text-slate-700">{m.views30d}</td>
                                <td className="px-4 py-2.5 text-right font-medium text-slate-700">{m.leads30d}</td>
                                <td className="px-4 py-2.5 text-right">
                                  <span className={`text-[0.56rem] font-semibold ${m.convertedLeads > 0 ? "text-emerald-600" : "text-slate-400"}`}>{m.convertedLeads} ({m.conversionRate})</span>
                                </td>
                                <td className="px-4 py-2.5 text-right text-slate-600">${((m.credit_balance_cents || 0) / 100).toFixed(0)}</td>
                                <td className="px-4 py-2.5 text-right text-slate-600">${((m.totalBilledCents || 0) / 100).toFixed(0)}</td>
                              </tr>
                            ))}
                          </tbody>
                          {firmAnalytics.summary && (
                            <tfoot>
                              <tr className="bg-slate-50 font-bold text-xs border-t border-slate-200">
                                <td className="px-4 py-2.5 text-slate-700">Total ({firmAnalytics.summary.totalMembers} members)</td>
                                <td className="px-4 py-2.5 text-right text-slate-700">{firmAnalytics.summary.totalViews30d}</td>
                                <td className="px-4 py-2.5 text-right text-slate-700">{firmAnalytics.summary.totalLeads30d}</td>
                                <td className="px-4 py-2.5 text-right text-emerald-700">{firmAnalytics.summary.totalConverted} ({firmAnalytics.summary.conversionRate})</td>
                                <td className="px-4 py-2.5 text-right text-slate-700">${((firmAnalytics.summary.totalCreditCents || 0) / 100).toFixed(0)}</td>
                                <td className="px-4 py-2.5 text-right text-slate-700">${((firmAnalytics.summary.totalBilledCents || 0) / 100).toFixed(0)}</td>
                              </tr>
                            </tfoot>
                          )}
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}

            {/* ── SETTINGS TAB ── */}
            {firmTab === "settings" && editingFirm && (
              <>
                <div className="bg-white border border-slate-200 rounded-xl p-5 mb-5">
                  <h3 className="text-sm font-bold text-slate-900 mb-4">Firm Profile</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Firm Name</label>
                      <input
                        value={editingFirm.name || ""}
                        onChange={(e) => setEditingFirm(f => ({ ...f, name: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                        placeholder="e.g. Chen Advisory Group"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">About the Firm</label>
                      <textarea
                        value={editingFirm.bio || ""}
                        onChange={(e) => setEditingFirm(f => ({ ...f, bio: e.target.value }))}
                        rows={4}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                        placeholder="Describe your firm and its approach..."
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Website</label>
                        <input value={editingFirm.website || ""} onChange={(e) => setEditingFirm(f => ({ ...f, website: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="https://..." />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Phone</label>
                        <input value={editingFirm.phone || ""} onChange={(e) => setEditingFirm(f => ({ ...f, phone: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="02 XXXX XXXX" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Email</label>
                        <input type="email" value={editingFirm.email || ""} onChange={(e) => setEditingFirm(f => ({ ...f, email: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="info@firm.com.au" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">ABN</label>
                        <input value={editingFirm.abn || ""} onChange={(e) => setEditingFirm(f => ({ ...f, abn: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="XX XXX XXX XXX" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">AFSL Number</label>
                        <input value={editingFirm.afsl_number || ""} onChange={(e) => setEditingFirm(f => ({ ...f, afsl_number: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="e.g. 234567" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">State</label>
                        <select value={editingFirm.location_state || ""} onChange={(e) => setEditingFirm(f => ({ ...f, location_state: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                          <option value="">Select...</option>
                          {["NSW","VIC","QLD","WA","SA","TAS","ACT","NT"].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Suburb</label>
                      <input value={editingFirm.location_suburb || ""} onChange={(e) => setEditingFirm(f => ({ ...f, location_suburb: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="Sydney CBD" />
                    </div>
                    <div className="flex items-center gap-3 pt-2">
                      <button
                        onClick={async () => {
                          setSavingFirm(true);
                          try {
                            const res = await fetch("/api/advisor-auth/firm", {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify(editingFirm),
                            });
                            if (res.ok) {
                              const data = await res.json();
                              setFirmDetails(data.firm);
                              setEditingFirm(data.firm);
                              setFirmSaved(true);
                              setTimeout(() => setFirmSaved(false), 3000);
                            } else {
                              const d = await res.json();
                              alert(d.error || "Failed to save");
                            }
                          } finally { setSavingFirm(false); }
                        }}
                        disabled={savingFirm}
                        className="px-5 py-2.5 bg-slate-900 text-white font-semibold rounded-lg text-sm hover:bg-slate-800 disabled:opacity-50 transition-colors"
                      >
                        {savingFirm ? "Saving..." : "Save Changes"}
                      </button>
                      {firmSaved && <span className="text-sm text-emerald-600 font-medium">Saved!</span>}
                    </div>
                  </div>
                </div>

                {/* Seat upgrade */}
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Seat Limit</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Currently {firmMemberCount} of {firmDetails?.max_seats || 10} seats used.</p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${firmMemberCount >= (firmDetails?.max_seats || 10) ? "bg-red-100 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
                      {firmDetails?.max_seats || 10} seats
                    </span>
                  </div>

                  {seatRequestStatus === "sent" ? (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm text-emerald-700">
                      Request sent! Our team will review and update your seat limit within 1 business day.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Requested Seats</label>
                          <input
                            type="number"
                            value={seatRequestSeats}
                            onChange={(e) => setSeatRequestSeats(e.target.value)}
                            min={(firmDetails?.max_seats || 10) + 1}
                            max={200}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                            placeholder={`More than ${firmDetails?.max_seats || 10}`}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Reason (optional)</label>
                          <input
                            value={seatRequestReason}
                            onChange={(e) => setSeatRequestReason(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                            placeholder="Growing team, new office..."
                          />
                        </div>
                      </div>
                      <button
                        disabled={seatRequestStatus === "sending" || !seatRequestSeats}
                        onClick={async () => {
                          setSeatRequestStatus("sending");
                          const res = await fetch("/api/advisor-auth/firm/seat-request", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ requestedSeats: parseInt(seatRequestSeats), reason: seatRequestReason }),
                          });
                          if (res.ok) {
                            setSeatRequestStatus("sent");
                          } else {
                            const d = await res.json();
                            alert(d.error || "Failed to submit request");
                            setSeatRequestStatus("error");
                          }
                        }}
                        className="px-4 py-2 bg-violet-600 text-white font-semibold rounded-lg text-sm hover:bg-violet-700 disabled:opacity-50 transition-colors"
                      >
                        {seatRequestStatus === "sending" ? "Sending..." : "Request More Seats"}
                      </button>
                      <p className="text-[0.6rem] text-slate-400">Our team will review your request and update your seat limit within 1 business day. There&apos;s no charge for seat upgrades.</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ─── DISPUTE MODAL ─── */}
      {disputeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            {disputeDone ? (
              <div className="text-center py-4">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                </div>
                <h2 className="text-lg font-bold text-slate-900 mb-1">Dispute Submitted</h2>
                <p className="text-sm text-slate-500 mb-4">Our team will review this within 10 business days and notify you by email.</p>
                <button onClick={() => { setDisputeModal(null); loadData(); }} className="px-5 py-2.5 bg-slate-900 text-white font-semibold rounded-lg text-sm hover:bg-slate-800">Done</button>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Dispute Lead</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Lead from <strong>{disputeModal.leadName}</strong> · {disputeModal.daysLeft} day{disputeModal.daysLeft !== 1 ? "s" : ""} left to dispute</p>
                  </div>
                  <button onClick={() => setDisputeModal(null)} className="text-slate-400 hover:text-slate-600 text-lg leading-none">✕</button>
                </div>

                <div className="mb-4">
                  <p className="text-xs font-semibold text-slate-600 mb-2">Reason for dispute</p>
                  <div className="space-y-2">
                    {[
                      { value: "spam", label: "Spam or bot submission" },
                      { value: "wrong_number", label: "Wrong or disconnected number" },
                      { value: "fake_details", label: "Fake contact details" },
                      { value: "not_genuine", label: "Not a genuine enquiry" },
                      { value: "duplicate", label: "Duplicate lead" },
                      { value: "other", label: "Other reason" },
                    ].map((opt) => (
                      <label key={opt.value} className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${disputeReason === opt.value ? "border-violet-400 bg-violet-50" : "border-slate-200 hover:bg-slate-50"}`}>
                        <input
                          type="radio"
                          name="dispute-reason"
                          value={opt.value}
                          checked={disputeReason === opt.value}
                          onChange={() => setDisputeReason(opt.value)}
                          className="text-violet-600"
                        />
                        <span className="text-sm text-slate-700">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Additional details <span className="text-slate-400 font-normal">(optional{disputeReason === "other" ? ", required" : ""})</span></label>
                  <textarea
                    value={disputeDetails}
                    onChange={(e) => setDisputeDetails(e.target.value)}
                    rows={3}
                    placeholder="Describe the issue in detail..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                  />
                </div>

                {disputeError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700 mb-4">{disputeError}</div>
                )}

                <div className="flex items-center gap-3">
                  <button
                    onClick={submitDispute}
                    disabled={disputeSubmitting || !disputeReason || (disputeReason === "other" && !disputeDetails.trim())}
                    className="flex-1 py-2.5 bg-slate-900 text-white font-semibold rounded-lg text-sm hover:bg-slate-800 disabled:opacity-50 transition-colors"
                  >
                    {disputeSubmitting ? "Submitting..." : "Submit Dispute"}
                  </button>
                  <button onClick={() => setDisputeModal(null)} className="px-4 py-2.5 border border-slate-200 text-slate-600 font-medium rounded-lg text-sm hover:bg-slate-50 transition-colors">
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
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
