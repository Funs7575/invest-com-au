"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AdminSearch from "@/components/AdminSearch";
import AdminNotifications from "@/components/AdminNotifications";
import AdminHelpPanel from "@/components/AdminHelpPanel";
import ThemeToggle from "@/components/ThemeToggle";

const navSections = [
  {
    label: "Overview",
    items: [
      { href: "/admin", label: "Dashboard", icon: "📊" },
      { href: "/admin/analytics", label: "Analytics", icon: "📈" },
      { href: "/admin/moderation", label: "Moderation", icon: "🛡️", badge: true },
      { href: "/admin/compliance", label: "Compliance", icon: "⚕️" },
    ],
  },
  {
    label: "Content",
    items: [
      { href: "/admin/brokers", label: "Brokers", icon: "🏦" },
      { href: "/admin/articles", label: "Articles", icon: "📝" },
      { href: "/admin/content-calendar", label: "Content Calendar", icon: "📅" },
      { href: "/admin/team-members", label: "Team Members", icon: "👥" },
      { href: "/admin/scenarios", label: "Scenarios", icon: "🎯" },
      { href: "/admin/quiz-questions", label: "Quiz Questions", icon: "❓" },
      { href: "/admin/user-reviews", label: "User Reviews", icon: "⭐" },
      { href: "/admin/questions", label: "Questions", icon: "💬" },
      { href: "/admin/switch-stories", label: "Switch Stories", icon: "🔄" },
      { href: "/admin/broker-transfer-guides", label: "Transfer Guides", icon: "📋" },
      { href: "/admin/health-scores", label: "Health Scores", icon: "🛡️" },
      { href: "/admin/regulatory-alerts", label: "Reg. Alerts", icon: "📢" },
      { href: "/admin/quarterly-reports", label: "Quarterly Reports", icon: "📊" },
    ],
  },
  {
    label: "Marketplace",
    items: [
      { href: "/admin/marketplace", label: "Overview", icon: "🏪" },
      { href: "/admin/marketplace/campaigns", label: "Campaigns", icon: "📣" },
      { href: "/admin/marketplace/brokers", label: "Broker Accounts", icon: "🤝" },
      { href: "/admin/marketplace/placements", label: "Placements", icon: "📍" },
      { href: "/admin/marketplace/sponsor-billing", label: "Sponsor Billing", icon: "💰" },
      { href: "/admin/marketplace/reconciliation", label: "Reconciliation", icon: "🔍" },
      { href: "/admin/marketplace/support", label: "Support Tickets", icon: "🎫" },
      { href: "/admin/marketplace/intelligence", label: "Intelligence", icon: "🧠" },
      { href: "/admin/marketplace/funnel", label: "Funnel Analytics", icon: "🔬" },
    ],
  },
  {
    label: "Monetisation",
    items: [
      { href: "/admin/affiliate-links", label: "Affiliate Links", icon: "🔗" },
      { href: "/admin/deal-of-month", label: "Deal of Month", icon: "🔥" },
      { href: "/admin/quiz-weights", label: "Quiz Weights", icon: "⚖️" },
      { href: "/admin/pro-subscribers", label: "Pro Members", icon: "💎" },
      { href: "/admin/pro-deals", label: "Pro Deals", icon: "🎁" },
      { href: "/admin/subscribers", label: "Subscribers", icon: "📧" },
    ],
  },
  {
    label: "Settings",
    items: [
      { href: "/admin/site-settings", label: "Site Settings", icon: "⚙️" },
      { href: "/admin/calculator-config", label: "Calculator Config", icon: "🧮" },
      { href: "/admin/export-import", label: "Export / Import", icon: "💾" },
      { href: "/admin/audit-log", label: "Audit Log", icon: "📋" },
      { href: "/admin/autopilot", label: "Autopilot", icon: "🤖" },
    ],
  },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  // Fetch pending moderation count for badge
  useEffect(() => {
    async function fetchPendingCount() {
      try {
        const supabase = createClient();
        const [reviews, stories, questions] = await Promise.all([
          supabase.from("user_reviews").select("id", { count: "exact", head: true }).in("status", ["pending", "verified"]),
          supabase.from("switch_stories").select("id", { count: "exact", head: true }).in("status", ["pending", "verified"]),
          supabase.from("broker_questions").select("id", { count: "exact", head: true }).eq("status", "pending"),
        ]);
        setPendingCount((reviews.count || 0) + (stories.count || 0) + (questions.count || 0));
      } catch {
        // Silently fail - badge just won't show
      }
    }
    fetchPendingCount();
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  };

  const SidebarContent = () => (
    <>
      <div className="p-4 border-b border-slate-700/50">
        <Link href="/admin" className="flex items-center gap-2.5" onClick={() => setMobileOpen(false)}>
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center shrink-0">
            <span className="text-slate-900 font-extrabold text-sm">I</span>
          </div>
          <div>
            <span className="text-sm font-bold text-white">invest.com.au</span>
            <p className="text-[0.65rem] text-amber-400 font-semibold uppercase tracking-widest">Admin Panel</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
        {navSections.map((section) => (
          <div key={section.label}>
            <div className="text-[0.65rem] font-semibold text-slate-500 uppercase tracking-wider px-3 mb-1">
              {section.label}
            </div>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
                const showBadge = "badge" in item && (item as { badge?: boolean }).badge && pendingCount > 0;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                      isActive
                        ? "bg-amber-500/15 text-amber-500 font-semibold"
                        : "text-slate-400 hover:text-white hover:bg-white/5 font-medium"
                    }`}
                  >
                    <span className="text-base">{item.icon}</span>
                    {item.label}
                    {showBadge && (
                      <span className="ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                        {pendingCount > 99 ? "99+" : pendingCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-slate-700/50 space-y-1">
        <Link
          href="/"
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
        >
          <span className="text-base">🌐</span>
          View Site
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-white/5 hover:text-red-400 transition-colors"
        >
          <span className="text-base">🚪</span>
          Sign Out
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-50 md:flex">
      {/* Mobile top bar */}
      <div className="md:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <button
          onClick={() => setMobileOpen(true)}
          className="text-amber-500 p-1 -ml-1"
          aria-label="Open navigation"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className="text-slate-900 font-bold text-sm">invest.com.au Admin</span>
        <ThemeToggle />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar (slide-in) */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-56 bg-slate-900 border-r border-slate-700/50 flex flex-col
          transform transition-transform duration-200 ease-in-out md:hidden
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <SidebarContent />
      </aside>

      {/* Desktop sidebar (always visible) */}
      <aside className="hidden md:flex w-56 bg-slate-900 border-r border-slate-700/50 flex-col shrink-0">
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Top toolbar */}
        <div className="hidden md:flex items-center justify-end gap-2 bg-white border-b border-slate-200 px-6 py-3">
          <button
            onClick={() => {
              window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
            }}
            className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Search...
            <kbd className="ml-2 text-[0.6rem] px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded font-medium">⌘K</kbd>
          </button>
          <AdminNotifications />
          <ThemeToggle />
        </div>
        <div className="p-4 md:px-6 md:pt-4 md:pb-6 lg:px-8 lg:pb-8">{children}</div>
      </main>

      {/* Global Search */}
      <AdminSearch />

      {/* Page-specific help panel */}
      <AdminHelpPanel />
    </div>
  );
}
