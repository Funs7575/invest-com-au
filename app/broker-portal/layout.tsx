"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Icon from "@/components/Icon";
import CountUp from "@/components/CountUp";
import BrokerHelpPanel from "@/components/BrokerHelpPanel";

const navItems = [
  { href: "/broker-portal", label: "Dashboard", icon: "bar-chart" },
  { href: "/broker-portal/campaigns", label: "Campaigns", icon: "megaphone" },
  { href: "/broker-portal/analytics", label: "Analytics", icon: "pie-chart" },
  { href: "/broker-portal/wallet", label: "Wallet", icon: "wallet" },
  { href: "/broker-portal/reports", label: "Reports", icon: "trending-up" },
  { href: "/broker-portal/invoices", label: "Invoices", icon: "file-text" },
  { href: "/broker-portal/conversions", label: "Conversions", icon: "target" },
  { href: "/broker-portal/creatives", label: "Creatives", icon: "image" },
  { href: "/broker-portal/ab-tests", label: "A/B Tests", icon: "git-branch" },
  { href: "/broker-portal/webhooks", label: "Webhooks", icon: "link" },
  { href: "/broker-portal/packages", label: "Packages", icon: "package" },
  { href: "/broker-portal/notifications", label: "Notifications", icon: "bell" },
  { href: "/broker-portal/support", label: "Support", icon: "message-circle" },
  { href: "/broker-portal/settings", label: "Settings", icon: "settings" },
];

export default function BrokerPortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [brokerName, setBrokerName] = useState("");
  const [balanceCents, setBalanceCents] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);

  const isLogin = pathname?.startsWith("/broker-portal/login") || pathname?.startsWith("/broker-portal/register");

  useEffect(() => {
    if (isLogin) return;
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/broker-portal/login");
        return;
      }

      const { data: account } = await supabase
        .from("broker_accounts")
        .select("company_name, full_name, broker_slug, status")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (!account || account.status !== "active") {
        router.push("/broker-portal/login");
        return;
      }

      setBrokerName(account.company_name || account.full_name);

      const { data: wallet } = await supabase
        .from("broker_wallets")
        .select("balance_cents")
        .eq("broker_slug", account.broker_slug)
        .maybeSingle();

      setBalanceCents(wallet?.balance_cents || 0);

      // Fetch unread notifications count
      const { count } = await supabase
        .from("broker_notifications")
        .select("id", { count: "exact", head: true })
        .eq("broker_slug", account.broker_slug)
        .eq("is_read", false);

      setUnreadCount(count || 0);
    };
    load();
  }, [pathname, router, isLogin]);

  // Login page gets no layout chrome
  if (isLogin) {
    return <>{children}</>;
  }

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/broker-portal/login");
    router.refresh();
  };

  const pageTitle = navItems.find(
    (item) => pathname === item.href || (item.href !== "/broker-portal" && pathname?.startsWith(item.href))
  )?.label || "Dashboard";

  const SidebarContent = () => (
    <>
      <div className="p-4 border-b border-slate-700/50">
        <Link href="/broker-portal" className="flex items-center gap-2.5" onClick={() => setMobileOpen(false)}>
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center shrink-0">
            <span className="text-slate-900 font-extrabold text-sm">I</span>
          </div>
          <div>
            <span className="text-sm font-bold text-white">Invest.com.au</span>
            <p className="text-[0.69rem] text-amber-400 font-semibold uppercase tracking-widest">Partner Portal</p>
          </div>
        </Link>
      </div>

      {/* Wallet balance */}
      <div className="p-4 border-b border-slate-700/50">
        <p className="text-[0.69rem] text-slate-400 uppercase tracking-wider font-bold mb-1">Wallet Balance</p>
        <p className="text-xl font-extrabold text-white">
          <CountUp end={balanceCents / 100} prefix="$" decimals={2} duration={1000} />
        </p>
        <Link
          href="/broker-portal/wallet"
          onClick={() => setMobileOpen(false)}
          className="text-xs text-amber-400 hover:text-amber-300 underline mt-1 inline-block"
        >
          Add Funds →
        </Link>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== "/broker-portal" && pathname?.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`sidebar-nav-item flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "is-active bg-slate-700/50 text-white"
                  : "text-slate-300 hover:bg-slate-700/30 hover:text-white"
              }`}
            >
              <Icon name={item.icon} size={16} className={isActive ? "text-amber-400" : "text-slate-400"} />
              {item.label}
              {item.label === "Notifications" && unreadCount > 0 && (
                <span className="ml-auto relative flex items-center justify-center">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-40 animate-ping" />
                  <span className="relative bg-amber-500 text-slate-900 text-[0.6rem] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-slate-700/50 space-y-1">
        {brokerName && (
          <p className="px-3 py-1 text-xs text-slate-400 truncate">{brokerName}</p>
        )}
        <Link
          href="/"
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-700/30 hover:text-white transition-colors"
        >
          <Icon name="globe" size={16} />
          View Site
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-700/30 hover:text-red-400 transition-colors"
        >
          <Icon name="log-out" size={16} />
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
        <span className="text-slate-900 font-bold text-sm">{pageTitle}</span>
        <span className="text-sm font-bold text-slate-700">
          ${(balanceCents / 100).toFixed(2)}
        </span>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-56 bg-slate-900 flex flex-col transform transition-transform duration-200 ease-in-out md:hidden ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <SidebarContent />
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 bg-slate-900 flex-col shrink-0">
        <SidebarContent />
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <div key={pathname} className="p-4 md:p-6 lg:p-8 portal-page-enter">{children}</div>
      </main>
      <BrokerHelpPanel />
    </div>
  );
}
