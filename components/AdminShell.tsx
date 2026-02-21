"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const navSections = [
  {
    label: "Overview",
    items: [
      { href: "/admin", label: "Dashboard", icon: "📊" },
      { href: "/admin/analytics", label: "Analytics", icon: "📈" },
    ],
  },
  {
    label: "Content",
    items: [
      { href: "/admin/brokers", label: "Brokers", icon: "🏦" },
      { href: "/admin/articles", label: "Articles", icon: "📝" },
      { href: "/admin/team-members", label: "Team Members", icon: "👥" },
      { href: "/admin/scenarios", label: "Scenarios", icon: "🎯" },
      { href: "/admin/quiz-questions", label: "Quiz Questions", icon: "❓" },
      { href: "/admin/user-reviews", label: "User Reviews", icon: "⭐" },
    ],
  },
  {
    label: "Monetisation",
    items: [
      { href: "/admin/affiliate-links", label: "Affiliate Links", icon: "🔗" },
      { href: "/admin/deal-of-month", label: "Deal of Month", icon: "🔥" },
      { href: "/admin/quiz-weights", label: "Quiz Weights", icon: "⚖️" },
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
    ],
  },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  };

  const SidebarContent = () => (
    <>
      <div className="p-4 border-b border-slate-700">
        <Link href="/admin" className="text-lg font-bold text-white" onClick={() => setMobileOpen(false)}>
          Invest.com.au
        </Link>
        <p className="text-xs text-slate-400">Admin Panel</p>
      </div>

      <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
        {navSections.map((section) => (
          <div key={section.label}>
            <div className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-wider px-3 mb-1">
              {section.label}
            </div>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-amber-500/10 text-amber-500"
                        : "text-slate-300 hover:bg-slate-700 hover:text-white"
                    }`}
                  >
                    <span className="text-base">{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-slate-700 space-y-1">
        <Link
          href="/"
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
        >
          <span className="text-base">🌐</span>
          View Site
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-700 hover:text-red-400 transition-colors"
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
          className="text-slate-700 p-1 -ml-1"
          aria-label="Open navigation"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className="text-slate-900 font-bold text-sm">Invest.com.au Admin</span>
        <div className="w-6" /> {/* Spacer for centering */}
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
          fixed inset-y-0 left-0 z-50 w-56 bg-slate-800 border-r border-slate-700 flex flex-col
          transform transition-transform duration-200 ease-in-out md:hidden
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <SidebarContent />
      </aside>

      {/* Desktop sidebar (always visible) */}
      <aside className="hidden md:flex w-56 bg-slate-800 border-r border-slate-700 flex-col shrink-0">
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-4 md:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
