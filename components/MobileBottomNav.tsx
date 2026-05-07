"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Sticky mobile bottom navigation — four tabs that mirror the homepage
// route cards: Compare / Opportunities / Experts / Get Matched. The
// fourth tab points at /quiz (the guided matching flow).
const TABS: ReadonlyArray<{ label: string; href: string; icon: React.ReactNode; matchPrefix: string }> = [
  {
    label: "Compare",
    href: "/compare",
    matchPrefix: "/compare",
    icon: (
      <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path d="M3 12h4l3-9 4 18 3-9h4" />
      </svg>
    ),
  },
  {
    label: "Opportunities",
    href: "/invest",
    matchPrefix: "/invest",
    icon: (
      <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    ),
  },
  {
    label: "Experts",
    href: "/advisors",
    matchPrefix: "/advisors",
    icon: (
      <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" />
        <path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
  {
    label: "Get Matched",
    href: "/quiz",
    matchPrefix: "/quiz",
    icon: (
      <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
      </svg>
    ),
  },
];

const HIDDEN_PREFIXES = ["/admin", "/auth", "/broker-portal", "/quiz"];

export default function MobileBottomNav() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  // Avoid SSR/CSR mismatch: don't render the bar until after hydration so
  // pathname-based "active tab" highlighting reflects the real route.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional initial mount-only state set
    setMounted(true);
  }, []);

  const isHidden = HIDDEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (!mounted || isHidden) return null;

  return (
    <nav
      aria-label="Mobile primary navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-sm border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] safe-area-inset-bottom"
    >
      <ul className="grid grid-cols-4 m-0 p-0 list-none">
        {TABS.map((tab) => {
          const active =
            pathname === tab.matchPrefix || pathname.startsWith(tab.matchPrefix + "/");
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                className={`flex flex-col items-center justify-center gap-1 py-2 min-h-14 text-[0.65rem] font-bold transition-colors ${
                  active ? "text-amber-600" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span aria-hidden>{tab.icon}</span>
                <span>{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
