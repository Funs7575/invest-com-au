"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  { href: "/broker-portal", label: "Dashboard", icon: "📊" },
  { href: "/broker-portal/campaigns", label: "Campaigns", icon: "📣" },
  { href: "/broker-portal/wallet", label: "Wallet", icon: "💰" },
  { href: "/broker-portal/reports", label: "Reports", icon: "📈" },
  { href: "/broker-portal/settings", label: "Settings", icon: "⚙️" },
];

export default function BrokerPortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [brokerName, setBrokerName] = useState("");
  const [balanceCents, setBalanceCents] = useState(0);

  // Don't apply layout on login page
  if (pathname?.startsWith("/broker-portal/login")) {
    return <>{children}</>;
  }

  useEffect(() => {
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
    };
    load();
  }, [pathname, router]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/broker-portal/login");
    router.refresh();
  };

  const SidebarContent = () => (
    <>
      <div className="p-4 border-b border-green-800">
        <Link href="/broker-portal" className="text-lg font-bold text-white" onClick={() => setMobileOpen(false)}>
          Invest.com.au
        </Link>
        <p className="text-xs text-green-300">Partner Portal</p>
      </div>

      {/* Wallet balance */}
      <div className="p-4 border-b border-green-800">
        <p className="text-[0.65rem] text-green-400 uppercase tracking-wider font-bold mb-1">Wallet Balance</p>
        <p className="text-xl font-extrabold text-white">
          ${(balanceCents / 100).toLocaleString("en-AU", { minimumFractionDigits: 2 })}
        </p>
        <Link
          href="/broker-portal/wallet"
          onClick={() => setMobileOpen(false)}
          className="text-xs text-green-300 hover:text-white underline mt-1 inline-block"
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
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-green-600/20 text-white"
                  : "text-green-200 hover:bg-green-800 hover:text-white"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-green-800 space-y-1">
        {brokerName && (
          <p className="px-3 py-1 text-xs text-green-400 truncate">{brokerName}</p>
        )}
        <Link
          href="/"
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-green-300 hover:bg-green-800 hover:text-white transition-colors"
        >
          <span className="text-base">🌐</span>
          View Site
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-green-300 hover:bg-green-800 hover:text-red-300 transition-colors"
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
        <span className="text-slate-900 font-bold text-sm">Partner Portal</span>
        <span className="text-sm font-bold text-green-700">
          ${(balanceCents / 100).toFixed(0)}
        </span>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-56 bg-green-900 flex flex-col transform transition-transform duration-200 ease-in-out md:hidden ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <SidebarContent />
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 bg-green-900 flex-col shrink-0">
        <SidebarContent />
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <div className="p-4 md:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
