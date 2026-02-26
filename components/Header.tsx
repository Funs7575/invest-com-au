"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@/lib/hooks/useUser";

const navItems = [
  { name: "Compare", href: "/compare" },
  { name: "Best", href: "/best" },
  { name: "Deals", href: "/deals" },
  { name: "Reviews", href: "/reviews" },
  { name: "Calculators", href: "/calculators" },
  { name: "Vs", href: "/versus" },
  { name: "Learn", href: "/articles" },
];

const popularLinks = [
  { label: "Best Brokers 2026", href: "/article/best-share-trading-platforms-australia" },
  { label: "How to Invest", href: "/article/how-to-invest-australia" },
  { label: "Best ETFs", href: "/article/best-etfs-australia" },
  { label: "CommSec vs Stake", href: "/versus?vs=commsec,stake" },
];

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const { user, loading } = useUser();

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200">
      <div className="container-custom">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center text-xl font-bold text-slate-900">
            <span>Invest<span className="text-amber-500">.com.au</span></span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-3.5 lg:gap-5 ml-6" aria-label="Main navigation">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-sm font-medium transition-colors rounded focus:outline-none focus:ring-2 focus:ring-blue-700/40 ${isActive ? "text-blue-700 font-bold" : "text-slate-700 hover:text-slate-900"}`}
                  {...(isActive ? { "aria-current": "page" as const } : {})}
                >
                  {item.name}
                </Link>
              );
            })}
            <Link
              href="/quiz"
              className="px-4 py-2 bg-amber-600 text-white text-sm font-semibold rounded-lg hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:ring-offset-2 transition-colors"
              style={{ backgroundColor: '#d97706' }}
            >
              Broker Quiz
            </Link>
            {/* Pro / Account */}
            {!loading && (
              user ? (
                <Link
                  href="/account"
                  className="flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] text-sm font-semibold rounded-full transition-colors border border-slate-200 text-slate-700 hover:bg-slate-50"
                  title="My Account"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Account
                </Link>
              ) : (
                <Link
                  href="/pro"
                  className="px-3.5 py-2 min-h-[44px] flex items-center bg-amber-500/10 text-amber-700 text-sm font-semibold rounded-full hover:bg-amber-500/20 transition-colors border border-amber-500/20"
                >
                  Pro
                </Link>
              )
            )}
          </nav>

          {/* Mobile Hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-700 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-700/40 rounded-lg transition-colors"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
          >
            {menuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Slide-out Menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white">
          <nav className="container-custom py-3 space-y-px" aria-label="Mobile navigation">
            {/* Beginner CTA — compact inline */}
            <Link
              href="/article/how-to-invest-australia"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-900 bg-slate-50 rounded-lg transition-colors"
            >
              <span className="shrink-0 w-5 h-5 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center text-[0.6rem] font-bold">?</span>
              New to investing? Start here →
            </Link>

            {/* Main nav */}
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={`block px-3 py-2.5 min-h-[44px] flex items-center text-[0.8rem] font-medium rounded-lg transition-colors ${isActive ? "bg-blue-50 text-blue-700 font-bold" : "text-slate-700 hover:bg-slate-50"}`}
                  {...(isActive ? { "aria-current": "page" as const } : {})}
                >
                  {item.name}
                </Link>
              );
            })}

            {/* Quiz + Pro — side by side buttons */}
            <div className="pt-1.5 mt-1 border-t border-slate-100 flex gap-2 px-3">
              <Link
                href="/quiz"
                onClick={() => setMenuOpen(false)}
                className="flex-1 py-2.5 min-h-[44px] flex items-center justify-center text-xs font-semibold text-center text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition-colors"
                style={{ backgroundColor: '#d97706' }}
              >
                Broker Quiz
              </Link>
              <Link
                href="/pro"
                onClick={() => setMenuOpen(false)}
                className="flex-1 py-2.5 min-h-[44px] flex items-center justify-center text-xs font-semibold text-center text-amber-700 bg-amber-50 rounded-lg hover:bg-amber-100 border border-amber-200 transition-colors"
              >
                Investor Pro ✦
              </Link>
            </div>

            {/* Auth */}
            <div className="pt-1.5 mt-1 border-t border-slate-100">
              {!loading && (
                user ? (
                  <Link
                    href="/account"
                    onClick={() => setMenuOpen(false)}
                    className="block px-3 py-2 min-h-[44px] flex items-center text-[0.8rem] font-medium text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                  >
                    My Account
                  </Link>
                ) : (
                  <Link
                    href="/auth/login"
                    onClick={() => setMenuOpen(false)}
                    className="block px-3 py-2 min-h-[44px] flex items-center text-[0.8rem] font-medium text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                  >
                    Sign In
                  </Link>
                )
              )}
            </div>

            {/* Popular Links — compact row of pills */}
            <div className="pt-1.5 mt-1 border-t border-slate-100">
              <p className="px-3 pt-1 pb-1 text-[0.62rem] font-semibold uppercase tracking-wider text-slate-400">Popular</p>
              <div className="flex flex-wrap gap-1.5 px-3 pb-1">
                {popularLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="text-[0.69rem] font-medium text-slate-600 bg-slate-50 px-3 py-1.5 min-h-[36px] inline-flex items-center rounded-full hover:bg-slate-100 hover:text-slate-900 transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
