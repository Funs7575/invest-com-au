"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import Icon from "@/components/Icon";
import AdvisorPortalLogin from "./AdvisorPortalLogin";
import { CoAuthorInvitesBanner, InviteCoAuthorButton } from "./CoAuthorPanel";
import { anyFetchFailed } from "@/lib/advisor-portal/load-state";
import { deriveProfileCompleteness } from "@/lib/advisor-portal/profile-completeness";
import type {
  Advisor,
  Lead, Stats, ViewDay, Review, WeeklyEnquiry, ProfileCompleteness,
  CategoryPricing, DisputeModal, ViewType,
} from "./types";
import type { BillingSummary } from "./billing/types";

const DashboardTab = dynamic(() => import("./DashboardTab"));
const LeadsTab = dynamic(() => import("./LeadsTab"));
const AnalyticsTab = dynamic(() => import("./AnalyticsTab"));
const CPDTab = dynamic(() => import("./CPDTab"));
const ProfileTab = dynamic(() => import("./ProfileTab"));
const ProfileDetailsTab = dynamic(() => import("./ProfileDetailsTab"));
const BillingTab = dynamic(() => import("./BillingTab"));
const SettingsTab = dynamic(() => import("./SettingsTab"));
const TeamTab = dynamic(() => import("./TeamTab"));
const WidgetBuilderTab = dynamic(() => import("./WidgetBuilderTab"));
const EmbedKitTab = dynamic(() => import("./EmbedKitTab"));
const CourseBuilderTab = dynamic(() => import("./CourseBuilderTab"));
const EventsTab = dynamic(() => import("./EventsTab"));
const BadgesTab = dynamic(() => import("./BadgesTab"));
const IdealClientBuilderTab = dynamic(() => import("@/components/IdealClientBuilder"));
const FeedTab = dynamic(() => import("./FeedTab"));
const CaseStudiesTab = dynamic(() => import("./CaseStudiesTab"));
const ReviewsTab = dynamic(() => import("./ReviewsTab"));
const EarnTab = dynamic(() => import("./EarnTab"));
const SchedulingTab = dynamic(() => import("./SchedulingTab"));

/** Score threshold below which new advisors are auto-redirected to the onboarding route. */
const AUTO_ONBOARDING_SCORE_THRESHOLD = 40;
/** localStorage key — once set, the auto-redirect to /advisor-portal/onboarding never fires. */
const ONBOARDING_SEEN_KEY = "advisor-onboarding-seen";

export default function AdvisorPortalPage() {
  const router = useRouter();
  const [view, setView] = useState<ViewType>("login");
  const [advisor, setAdvisor] = useState<Advisor | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [viewsByDay, setViewsByDay] = useState<ViewDay[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [categoryPricing, setCategoryPricing] = useState<CategoryPricing | null>(null);
  const [weeklyEnquiries, setWeeklyEnquiries] = useState<WeeklyEnquiry[]>([]);
  const [profileCompleteness, setProfileCompleteness] = useState<ProfileCompleteness | null>(null);
  const [billingSummary, setBillingSummary] = useState<BillingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [leadSearch, setLeadSearch] = useState("");
  const [leadStatusFilter, setLeadStatusFilter] = useState<"all" | "new" | "contacted" | "converted" | "lost">("all");
  const [leadSortByQuality, setLeadSortByQuality] = useState(false);
  const [hotLeadsOnly, setHotLeadsOnly] = useState(false);

  // Dispute modal
  const [disputeModal, setDisputeModal] = useState<DisputeModal | null>(null);
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeDetails, setDisputeDetails] = useState("");
  const [disputeSubmitting, setDisputeSubmitting] = useState(false);
  const [disputeError, setDisputeError] = useState("");
  const [disputeDone, setDisputeDone] = useState(false);

  const [verifyError, setVerifyError] = useState<string | null>(null);

  // Onboarding banner — persisted via sessionStorage so it re-appears on next
  // login but stays dismissed for the current browser session.
  const [dismissedOnboarding, setDismissedOnboarding] = useState(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem("advisor-onboarding-banner-dismissed") === "1";
  });
  const [dataLoadedAt, setDataLoadedAt] = useState<Date | null>(null);
  const [moreNavOpen, setMoreNavOpen] = useState(false);

  // Dashboard load error (ADV-003): surface a banner instead of silently
  // swallowing fetch failures so advisors aren't left staring at a blank shell.
  const [loadError, setLoadError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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

  /** Auto-redirect to the guided onboarding route if the advisor is below the
   *  starter threshold and hasn't been through onboarding yet. */
  const maybeRedirectToOnboarding = useCallback((a: Advisor) => {
    if (typeof window === "undefined") return false;
    if (localStorage.getItem(ONBOARDING_SEEN_KEY)) return false;
    const completeness = deriveProfileCompleteness(a as unknown as Record<string, unknown>);
    if (completeness.score < AUTO_ONBOARDING_SCORE_THRESHOLD) {
      router.push("/advisor-portal/onboarding");
      return true;
    }
    return false;
  }, [router]);

  const checkSession = async () => {
    try {
      const res = await fetch("/api/advisor-auth/session");
      if (res.ok) {
        const { advisor: a } = await res.json();
        setAdvisor(a);
        if (!maybeRedirectToOnboarding(a)) {
          setView(a.status === "pending" ? "dashboard" : "dashboard");
          if (a.status !== "pending") loadData();
        }
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
        // Clean URL first, then check onboarding redirect.
        window.history.replaceState({}, "", "/advisor-portal");
        if (!maybeRedirectToOnboarding(a)) {
          setView("dashboard");
          loadData();
        }
      } else {
        const err = await res.json();
        setVerifyError(err.error || "Invalid or expired link. Please request a new one.");
        setView("login");
      }
    } catch {
      setView("login");
    }
    setLoading(false);
  };

  const loadData = useCallback(async () => {
    // ADV-003: track each call independently so a single failed/unavailable API
    // surfaces a banner rather than being silently swallowed.
    const [dashResult, summaryResult] = await Promise.allSettled([
      fetch("/api/advisor-dashboard"),
      fetch("/api/advisor-auth/billing-summary"),
    ]);

    let parseFailed = false;

    if (dashResult.status === "fulfilled" && dashResult.value.ok) {
      try {
        const data = await dashResult.value.json();
        setLeads(data.leads);
        setStats(data.stats);
        setViewsByDay(data.viewsByDay);
        setReviews(data.reviews);
        setWeeklyEnquiries(data.weeklyEnquiries || []);
        setProfileCompleteness(data.profileCompleteness || null);
        if (data.categoryPricing) setCategoryPricing(data.categoryPricing);
        if (data.advisor) setAdvisor(data.advisor);
      } catch {
        parseFailed = true;
      }
    }

    if (summaryResult.status === "fulfilled" && summaryResult.value.ok) {
      try {
        const summary = (await summaryResult.value.json()) as BillingSummary;
        setBillingSummary(summary);
      } catch {
        parseFailed = true;
      }
    }

    setLoadError(parseFailed || anyFetchFailed([dashResult, summaryResult]));
    setDataLoadedAt(new Date());
  }, []);

  const refreshData = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

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
          <div aria-hidden="true" className="w-8 h-8 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin mx-auto mb-3" />
          <p role="status" className="text-sm text-slate-500">Loading…</p>
        </div>
      </div>
    );
  }

  if (view === "login") {
    return (
      <>
        {verifyError && (
          <div className="max-w-md mx-auto mt-6 px-4">
            <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{verifyError}</p>
          </div>
        )}
        <AdvisorPortalLogin />
      </>
    );
  }

  // ─── PORTAL SHELL ───
  const isPending = advisor?.status === "pending";
  const isFirmAdmin = advisor?.is_firm_admin && advisor?.firm_id;

  // ADV-006: top 7 tabs shown on mobile; rest collapse to "More…"
  const MOBILE_TOP_KEYS = new Set(["dashboard", "leads", "profile", "analytics", "reviews", "billing", "articles"]);

  const navItems = [
    { key: "dashboard", label: "Dashboard", icon: "layout-dashboard" },
    { key: "leads", label: "Leads", icon: "inbox" },
    { key: "analytics", label: "Analytics", icon: "bar-chart" },
    { key: "cpd", label: "CPD", icon: "award" },
    { key: "feed", label: "Feed", icon: "activity" },
    { key: "articles", label: "Articles", icon: "file-text" },
    { key: "case-studies", label: "Case Studies", icon: "briefcase" },
    { key: "reviews", label: "Reviews", icon: "star" },
    { key: "courses", label: "Courses", icon: "book-open" },
    { key: "events", label: "Events", icon: "calendar" },
    { key: "scheduling", label: "Scheduling", icon: "clock" },
    { key: "badges", label: "Badges", icon: "award" },
    { key: "ideal-client", label: "Ideal Client", icon: "target" },
    { key: "profile", label: "Profile", icon: "user" },
    { key: "profile-details", label: "Profile Details", icon: "layers" },
    { key: "billing", label: "Billing", icon: "credit-card" },
    { key: "earn", label: "Earn", icon: "gift" },
    ...(isFirmAdmin ? [{ key: "team", label: "Team", icon: "users" }] : []),
    { key: "widgets", label: "Widgets", icon: "code-2" },
    { key: "embed-kit", label: "Embed Kit", icon: "link" },
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
          <Link href={`/advisor/${advisor?.slug}`} target="_blank" rel="noopener noreferrer" className="text-xs text-white/60 hover:text-white">View Profile ↗</Link>
          <button onClick={logout} className="text-xs text-white/60 hover:text-white">Log Out</button>
        </div>
      </div>

      {/* Nav tabs — ADV-006: desktop scrollable, mobile shows top 7 + More dropdown */}
      <div className="bg-white border-b border-slate-200 px-4">
        <div role="tablist" aria-label="Advisor portal navigation" className="max-w-5xl mx-auto flex gap-1 overflow-x-auto">
          {navItems.map((item) => (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={view === item.key}
              onClick={() => { setView(item.key as ViewType); setMoreNavOpen(false); }}
              className={`${!MOBILE_TOP_KEYS.has(item.key) ? "hidden sm:flex" : "flex"} items-center gap-1.5 px-3 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-inset ${
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
          {/* AJ-1: route-level tabs — shown on desktop only (collapse in More on mobile) */}
          <Link
            href="/advisor-portal/briefs"
            className="hidden sm:flex items-center gap-1.5 px-3 py-3 text-sm font-medium border-b-2 border-transparent text-slate-500 hover:text-slate-700 whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-inset"
          >
            <Icon name="briefcase" size={16} />
            Briefs
          </Link>
          <Link
            href="/advisor-portal/auctions"
            className="hidden sm:flex items-center gap-1.5 px-3 py-3 text-sm font-medium border-b-2 border-transparent text-slate-500 hover:text-slate-700 whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-inset"
          >
            <Icon name="activity" size={16} />
            Auctions
          </Link>
          <Link
            href="/advisor-portal/marketplace"
            className="hidden sm:flex items-center gap-1.5 px-3 py-3 text-sm font-medium border-b-2 border-transparent text-slate-500 hover:text-slate-700 whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-inset"
          >
            <Icon name="store" size={16} />
            Marketplace
          </Link>
          <Link
            href="/advisor-portal/prospects"
            className="hidden sm:flex items-center gap-1.5 px-3 py-3 text-sm font-medium border-b-2 border-transparent text-slate-500 hover:text-slate-700 whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-inset"
          >
            <Icon name="inbox" size={16} />
            Prospects
          </Link>
          <Link
            href="/advisor-portal/teams"
            className="hidden sm:flex items-center gap-1.5 px-3 py-3 text-sm font-medium border-b-2 border-transparent text-slate-500 hover:text-slate-700 whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-inset"
          >
            <Icon name="users" size={16} />
            Expert Teams
          </Link>
          {/* Mobile-only "More…" dropdown for non-top-7 tabs */}
          <div className="relative sm:hidden flex items-center">
            <button
              type="button"
              aria-expanded={moreNavOpen}
              aria-haspopup="menu"
              aria-label="More navigation items"
              onClick={() => setMoreNavOpen(o => !o)}
              className={`flex items-center gap-1 px-3 py-3 text-sm font-medium border-b-2 whitespace-nowrap ${
                !MOBILE_TOP_KEYS.has(view)
                  ? "border-slate-900 text-slate-900"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              More
              <svg className={`w-3.5 h-3.5 transition-transform ${moreNavOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {moreNavOpen && (
              <div className="absolute top-full left-0 z-30 bg-white border border-slate-200 rounded-xl shadow-lg py-1 min-w-[180px]">
                {navItems.filter(i => !MOBILE_TOP_KEYS.has(i.key)).map(item => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => { setView(item.key as ViewType); setMoreNavOpen(false); }}
                    className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-left transition-colors ${
                      view === item.key ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Icon name={item.icon} size={15} />
                    {item.label}
                  </button>
                ))}
                {/* ADV-024: route-level links also in mobile More dropdown */}
                {[
                  { href: "/advisor-portal/briefs", icon: "briefcase", label: "Briefs" },
                  { href: "/advisor-portal/auctions", icon: "activity", label: "Auctions" },
                  { href: "/advisor-portal/marketplace", icon: "store", label: "Marketplace" },
                  { href: "/advisor-portal/prospects", icon: "inbox", label: "Prospects" },
                  { href: "/advisor-portal/teams", icon: "users", label: "Expert Teams" },
                ].map(link => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMoreNavOpen(false)}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                  >
                    <Icon name={link.icon} size={15} />
                    {link.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-6">

        {/* ─── LOAD ERROR BANNER (ADV-003) ─── */}
        {loadError && (
          <div
            role="alert"
            className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3"
          >
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
              <Icon name="alert-triangle" size={16} className="text-red-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-red-900">Some data couldn&apos;t be loaded</h3>
              <p className="text-xs text-red-700 mt-0.5">
                We couldn&apos;t reach part of your dashboard. Some figures may be out of date or missing.
              </p>
            </div>
            <button
              type="button"
              onClick={refreshData}
              disabled={refreshing}
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-700 bg-white border border-red-300 rounded-lg hover:bg-red-100 disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            >
              <Icon name="rotate-ccw" size={14} className={refreshing ? "animate-spin" : ""} />
              {refreshing ? "Refreshing…" : "Try again"}
            </button>
          </div>
        )}

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

        {/* ─── PORTAL-WIDE SETUP NUDGE ───
            The dashboard carries the full onboarding checklist; every OTHER
            tab gets this slim strip so an incomplete profile is never out of
            sight. Completeness derives live from the advisor row (same lib as
            the wizard + dashboard API), and the CTA lands on the dashboard
            where the checklist + wizard live. Respects the same dismissal. */}
        {advisor &&
          view !== "dashboard" &&
          !dismissedOnboarding &&
          (() => {
            const completeness = deriveProfileCompleteness(
              advisor as unknown as Record<string, unknown>,
            );
            if (completeness.score >= 80) return null;
            const next = completeness.steps.find((s) => !s.complete);
            return (
              <div
                role="complementary"
                aria-label="Profile completion"
                className="bg-violet-50 border border-violet-200 rounded-xl px-4 py-2.5 mb-6 flex items-center gap-3"
              >
                <div
                  className="hidden sm:block w-20 h-1.5 bg-violet-100 rounded-full overflow-hidden shrink-0"
                  role="progressbar"
                  aria-valuenow={completeness.score}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Profile ${completeness.score}% complete`}
                >
                  <div
                    className="h-full bg-violet-500 rounded-full"
                    style={{ width: `${completeness.score}%` }}
                  />
                </div>
                <p className="text-xs text-violet-900 flex-1 min-w-0 truncate">
                  <span className="font-bold">{completeness.score}% complete</span>
                  {next && (
                    <span className="text-violet-700">
                      {" "}— next: {next.title.toLowerCase()}
                    </span>
                  )}
                </p>
                <button
                  onClick={() => setView("dashboard")}
                  className="shrink-0 text-xs font-bold text-violet-700 hover:text-violet-900 underline underline-offset-2 min-h-11 px-1"
                >
                  Continue setup →
                </button>
                <button
                  onClick={() => {
                    sessionStorage.setItem("advisor-onboarding-banner-dismissed", "1");
                    setDismissedOnboarding(true);
                  }}
                  aria-label="Dismiss setup reminder"
                  className="shrink-0 w-8 h-8 min-h-0 flex items-center justify-center rounded-lg text-violet-400 hover:text-violet-600 hover:bg-violet-100"
                >
                  ✕
                </button>
              </div>
            );
          })()}

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
            onDismissOnboarding={() => {
              sessionStorage.setItem("advisor-onboarding-banner-dismissed", "1");
              setDismissedOnboarding(true);
            }}
            billingSummary={billingSummary}
            dataLoadedAt={dataLoadedAt}
            onRefresh={loadData}
            onAdvisorChange={setAdvisor}
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
            onNavigate={setView}
          />
        )}

        {/* ─── PROFILE ─── */}
        {view === "profile" && advisor && (
          <ProfileTab
            advisor={advisor}
            reviews={reviews}
            onAdvisorChange={setAdvisor}
          />
        )}

        {/* ─── PROFILE DETAILS ─── */}
        {view === "profile-details" && (
          <ProfileDetailsTab advisor={advisor} />
        )}

        {/* ─── BILLING ─── */}
        {view === "billing" && (
          <BillingTab
            advisor={advisor}
            stats={stats}
            onNavigate={setView}
            initialSummary={billingSummary}
          />
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

        {/* ─── CASE STUDIES ─── */}
        {view === "case-studies" && <CaseStudiesTab advisor={advisor} />}

        {/* ─── REVIEWS ─── */}
        {view === "reviews" && <ReviewsTab advisor={advisor} />}

        {/* ─── FEED ─── */}
        {view === "feed" && (
          <FeedTab advisor={advisor} />
        )}

        {/* ─── CPD TRACKER ─── */}
        {view === "cpd" && <CPDTab />}

        {/* ─── BADGES ─── */}
        {view === "badges" && <BadgesTab advisor={advisor} />}

        {/* ─── IDEAL CLIENT PROFILE ─── */}
        {view === "ideal-client" && <IdealClientBuilderTab />}

        {/* ─── COURSES ─── */}
        {view === "courses" && (
          <CourseBuilderTab advisor={advisor} />
        )}

        {/* ─── EVENTS ─── */}
        {view === "events" && (
          <EventsTab advisor={advisor} />
        )}

        {/* ─── SETTINGS ─── */}
        {view === "settings" && (
          <SettingsTab advisor={advisor} />
        )}

        {/* ─── EARN / REFERRALS ─── */}
        {view === "earn" && (
          <EarnTab advisor={advisor} />
        )}

        {/* ─── SCHEDULING (booking-v2 — self-gates when flag off) ─── */}
        {view === "scheduling" && <SchedulingTab advisor={advisor} />}

        {/* ─── TEAM (firm admins only) ─── */}
        {view === "team" && isFirmAdmin && (
          <TeamTab advisor={advisor} />
        )}

        {/* ─── WIDGETS ─── */}
        {view === "widgets" && (
          <WidgetBuilderTab />
        )}

        {/* ─── EMBED KIT ─── */}
        {view === "embed-kit" && (
          <EmbedKitTab />
        )}

      </div>

      {/* ─── DISPUTE MODAL ─── */}
      {disputeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onKeyDown={(e) => { if (e.key === "Escape") setDisputeModal(null); }}>
          <div role="dialog" aria-modal="true" aria-labelledby="dispute-modal-title" className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
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
                    <h2 id="dispute-modal-title" className="text-base font-bold text-slate-900">Dispute Lead</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Lead from <strong>{disputeModal.leadName}</strong> · {disputeModal.daysLeft} day{disputeModal.daysLeft !== 1 ? "s" : ""} left to dispute</p>
                  </div>
                  <button onClick={() => setDisputeModal(null)} aria-label="Close dispute modal" className="text-slate-500 hover:text-slate-600 text-lg leading-none">✕</button>
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
                  <label htmlFor="dispute-details" className="block text-xs font-semibold text-slate-600 mb-1.5">Additional details <span className="text-slate-500 font-normal">(optional{disputeReason === "other" ? ", required" : ""})</span></label>
                  <textarea
                    id="dispute-details"
                    value={disputeDetails}
                    onChange={(e) => setDisputeDetails(e.target.value)}
                    rows={3}
                    placeholder="Describe the issue in detail..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                  />
                </div>

                {disputeError && (
                  <div role="alert" className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700 mb-4">{disputeError}</div>
                )}

                <div className="flex items-center gap-3">
                  <button
                    onClick={submitDispute}
                    disabled={disputeSubmitting || !disputeReason || (disputeReason === "other" && !disputeDetails.trim())}
                    className="flex-1 py-2.5 bg-slate-900 text-white font-semibold rounded-lg text-sm hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
            <label htmlFor="art-title" className="block text-xs font-bold text-slate-700 mb-1">Title *</label>
            <input id="art-title" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. 5 SMSF Mistakes I See Every Tax Season" className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/30" />
            {title.length > 0 && title.length < 20 && <p className="text-[0.58rem] text-amber-600 mt-0.5">Title should be at least 20 characters for good SEO</p>}
            {title.length > 80 && <p className="text-[0.58rem] text-amber-600 mt-0.5">Title is over 80 characters — may be truncated in search results</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="art-category" className="block text-xs font-bold text-slate-700 mb-1">Category</label>
              <select id="art-category" value={category} onChange={e => setCategory(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="art-tier" className="block text-xs font-bold text-slate-700 mb-1">Publication Tier</label>
              <select id="art-tier" value={tier} onChange={e => setTier(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg">
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
            <label htmlFor="art-excerpt" className="block text-xs font-bold text-slate-700 mb-1">Excerpt <span className="font-normal text-slate-500">(1-2 sentences for preview cards)</span></label>
            <textarea id="art-excerpt" value={excerpt} onChange={e => setExcerpt(e.target.value)} placeholder="Brief summary of what the article covers..." rows={2} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/30 resize-vertical" />
          </div>

          <div>
            <label htmlFor="art-content" className="block text-xs font-bold text-slate-700 mb-1">Content * <span className="font-normal text-slate-500">(Markdown supported)</span></label>
            <textarea id="art-content" value={content} onChange={e => setContent(e.target.value)} placeholder={"Write your article here. Use **bold**, *italic*, ## headings, and - bullet points.\n\nRemember to include a general advice disclaimer, e.g.:\n\"This is general information only and does not constitute personal financial advice. Consider your own circumstances before acting.\""} rows={16} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/30 resize-vertical font-mono" />
            <div className="flex items-center justify-between mt-1">
              <p className={`text-[0.58rem] ${wc < 600 ? "text-amber-600" : "text-emerald-600"}`}>{wc} words {wc < 600 ? `(${600 - wc} more needed)` : "✓"}</p>
              <p className="text-[0.58rem] text-slate-500">~{Math.max(1, Math.ceil(wc / 250))} min read</p>
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
                <a href="/content-license" target="_blank" rel="noopener noreferrer" className="text-violet-600 underline hover:text-violet-800">Content Licence Agreement</a>{" "}
                and grant Invest.com.au a licence to publish, edit, and distribute this article. I understand articles that violate these guidelines will be rejected or require revision.
              </span>
            </label>
          </div>

          <div className="flex gap-2">
            <button onClick={() => handleSave("save")} disabled={saving || !title.trim() || !content.trim()} aria-busy={saving} className="px-4 py-2.5 border border-slate-300 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              {saving ? "Saving..." : "Save Draft"}
            </button>
            <button
              onClick={() => handleSave("submit")}
              disabled={saving || !title.trim() || !content.trim() || wc < 300 || hasErrors || !acknowledged}
              aria-busy={saving}
              className="px-4 py-2.5 bg-violet-600 text-white text-sm font-bold rounded-lg hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
            <div className="text-[0.5rem] text-slate-500 mt-0.5">{t.desc}</div>
          </div>
        ))}
      </div>

      {/* Pending co-author invitations addressed to this advisor */}
      <CoAuthorInvitesBanner />

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
                <div className="flex items-center gap-3 text-[0.62rem] text-slate-500">
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
                {a.status !== "rejected" && <InviteCoAuthorButton articleId={a.id} />}
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
                  <Link href={`/expert/${a.slug}`} target="_blank" rel="noopener noreferrer" className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50">View</Link>
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
