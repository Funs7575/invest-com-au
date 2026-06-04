"use client";

/**
 * FirmPortalNav — shared sibling navigation for the firm-admin portal
 * (P2-5). The Performance · Billing · Jobs cross-link strip previously only
 * existed on /firm-portal/analytics, so the other three pages had no way to
 * reach their siblings. Lifted into app/firm-portal/layout.tsx and extended
 * to include Analytics + active-state highlighting.
 *
 * Mobile-friendly: the link row scrolls horizontally (overflow-x-auto).
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "@/components/Icon";

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const ITEMS: NavItem[] = [
  { href: "/firm-portal/performance", label: "Performance", icon: "users" },
  { href: "/firm-portal/billing", label: "Billing", icon: "credit-card" },
  { href: "/firm-portal/jobs", label: "Jobs", icon: "briefcase" },
  { href: "/firm-portal/analytics", label: "Analytics", icon: "bar-chart" },
];

export default function FirmPortalNav() {
  const pathname = usePathname() ?? "";

  return (
    <div className="bg-white border-b border-slate-200">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <Link
          href="/firm-portal/performance"
          className="text-xs font-semibold text-slate-700 hover:text-violet-600 transition-colors whitespace-nowrap"
        >
          Firm Portal
        </Link>
        <nav
          aria-label="Firm portal sections"
          className="flex items-center gap-3 text-xs overflow-x-auto"
        >
          {ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex items-center gap-1 whitespace-nowrap transition-colors ${
                  isActive
                    ? "text-violet-700 font-semibold"
                    : "text-slate-500 hover:text-violet-600"
                }`}
              >
                <Icon name={item.icon} size={12} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
