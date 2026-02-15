"use client";

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
      { href: "/admin/scenarios", label: "Scenarios", icon: "🎯" },
      { href: "/admin/quiz-questions", label: "Quiz Questions", icon: "❓" },
    ],
  },
  {
    label: "Monetisation",
    items: [
      { href: "/admin/affiliate-links", label: "Affiliate Links", icon: "🔗" },
      { href: "/admin/deal-of-month", label: "Deal of Month", icon: "🔥" },
      { href: "/admin/quiz-weights", label: "Quiz Weights", icon: "⚖️" },
    ],
  },
  {
    label: "Settings",
    items: [
      { href: "/admin/site-settings", label: "Site Settings", icon: "⚙️" },
      { href: "/admin/calculator-config", label: "Calculator Config", icon: "🧮" },
      { href: "/admin/export-import", label: "Export / Import", icon: "💾" },
    ],
  },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-slate-900 flex">
      {/* Sidebar */}
      <aside className="w-56 bg-slate-800 border-r border-slate-700 flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-700">
          <Link href="/admin" className="text-lg font-bold text-white">
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
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
