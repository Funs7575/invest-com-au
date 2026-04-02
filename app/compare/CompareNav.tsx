"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const NAV_ITEMS = [
  { label: "All Platforms", short: "All", href: "/compare", filter: null },
  { label: "Share Trading", short: "Shares", href: "/compare?filter=shares", filter: "shares" },
  { label: "ETFs", short: "ETFs", href: "/compare/etfs", filter: null, exactPath: "/compare/etfs" },
  { label: "Crypto", short: "Crypto", href: "/compare?filter=crypto", filter: "crypto" },
  { label: "Super Funds", short: "Super", href: "/compare/super", filter: null, exactPath: "/compare/super" },
  { label: "Savings", short: "Savings", href: "/compare?filter=savings", filter: "savings" },
  { label: "CFD & Forex", short: "CFD", href: "/compare?filter=cfd", filter: "cfd" },
  { label: "Insurance", short: "Insurance", href: "/compare/insurance", filter: null, exactPath: "/compare/insurance" },
  { label: "Non-Residents", short: "Non-Residents", href: "/compare/non-residents", filter: null, exactPath: "/compare/non-residents" },
];

export default function CompareNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeFilter = searchParams.get("filter") || searchParams.get("category");

  function isActive(item: typeof NAV_ITEMS[number]): boolean {
    // Exact path match (for dedicated sub-pages)
    if (item.exactPath) return pathname === item.exactPath;
    // Filter-based match
    if (item.filter) return pathname === "/compare" && activeFilter === item.filter;
    // "All Platforms" — active only when on /compare with no filter
    return pathname === "/compare" && !activeFilter;
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
