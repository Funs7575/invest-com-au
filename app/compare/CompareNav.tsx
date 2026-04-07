"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { label: "All Platforms", short: "All", href: "/compare" },
  { label: "Share Trading", short: "Shares", href: "/share-trading" },
  { label: "ETFs", short: "ETFs", href: "/compare/etfs" },
  { label: "Crypto", short: "Crypto", href: "/crypto" },
  { label: "Super Funds", short: "Super", href: "/compare/super" },
  { label: "Savings", short: "Savings", href: "/savings" },
  { label: "CFD & Forex", short: "CFD", href: "/cfd" },
  { label: "Insurance", short: "Insurance", href: "/compare/insurance" },
  { label: "Non-Residents", short: "Non-Residents", href: "/compare/non-residents" },
];

export default function CompareNav() {
  const pathname = usePathname();

  function isActive(item: typeof NAV_ITEMS[number]): boolean {
    return pathname === item.href || pathname.startsWith(item.href + "/");
  }

  return (
    <div className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
      <div className="container-custom">
        <nav className="flex items-center gap-0.5 overflow-x-auto scrollbar-none" aria-label="Compare sections">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`shrink-0 px-3 py-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
                  active
                    ? "border-amber-500 text-amber-700"
                    : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <span className="hidden sm:inline">{item.label}</span>
                <span className="sm:hidden">{item.short}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
