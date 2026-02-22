"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@/lib/hooks/useUser";

const navItems = [
  { name: "Compare", href: "/compare" },
  { name: "Best Brokers", href: "/best" },
  { name: "Deals", href: "/deals" },
  { name: "Reviews", href: "/reviews" },
  { name: "Stories", href: "/stories" },
  { name: "Learn", href: "/articles" },
  { name: "Courses", href: "/courses" },
  { name: "Calculators", href: "/calculators" },
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
          <Link href="/" className="flex items-center gap-1.5 text-xl font-bold text-green-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/kangaroo-icon.svg"
              alt=""
              className="w-9 h-9 shrink-0"
              aria-hidden="true"
            />
            <span>Invest<span className="text-amber-500">.com.au</span></span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6" aria-label="Main navigation">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-sm font-medium transition-colors rounded focus:outline-none focus:ring-2 focus:ring-green-700/40 ${isActive ? "text-green-800 font-bold" : "text-slate-700 hover:text-green-800"}`}
                  {...(isActive ? { "aria-current": "page" as const } : {})}
                >
                  {item.name}
                </Link>
              );
            })}
            <Link
              href="/article/how-to-invest-australia"
              className="text-sm text-green-700 font-medium hover:text-green-900 rounded focus:outline-none focus:ring-2 focus:ring-green-700/40 transition-colors"
            >
              New to investing?
            </Link>
            <Link
              href="/quiz"
              className="px-4 py-2 bg-green-700 text-white text-sm font-semibold rounded-lg hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-green-700/40 focus:ring-offset-2 transition-colors"
            >
              Broker Quiz
            </Link>
            {/* Pro / Account */}
            {!loading && (
              user ? (
                <Link
                  href="/account"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-full transition-colors border border-slate-200 text-slate-700 hover:bg-slate-50"
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
                  className="px-3 py-1.5 bg-amber-500/10 text-amber-700 text-sm font-semibold rounded-full hover:bg-amber-500/20 transition-colors border border-amber-500/20"
                >
                  Pro
                </Link>
              )
            )}
          </nav>

          {/* Mobile Hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-700 hover:text-green-800 focus:outline-none focus:ring-2 focus:ring-green-700/40 rounded-lg transition-colors"
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
          <nav className="container-custom py-4 space-y-1" aria-label="Mobile navigation">
            <Link
              href="/article/how-to-invest-australia"
              onClick={() => setMenuOpen(false)}
              className="block px-4 py-3 text-sm font-semibold text-green-700 bg-green-50 rounded-lg transition-colors"
            >
              New to investing? Start here &rarr;
            </Link>
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={`block px-4 py-3 text-sm font-medium rounded-lg transition-colors ${isActive ? "bg-green-50 text-green-800 font-bold" : "text-slate-700 hover:bg-green-50 hover:text-green-800"}`}
                  {...(isActive ? { "aria-current": "page" as const } : {})}
                >
                  {item.name}
                </Link>
              );
            })}
            <div className="pt-2 mt-2 border-t border-slate-100">
              <Link
                href="/quiz"
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-3 text-sm font-semibold text-green-700 hover:bg-green-50 rounded-lg transition-colors"
              >
                Take The Quiz
              </Link>
              <Link
                href="/pro"
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-3 text-sm font-semibold text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
              >
                Investor Pro ✦
              </Link>
            </div>
            {/* Auth */}
            <div className="pt-2 mt-2 border-t border-slate-100">
              {!loading && (
                user ? (
                  <Link
                    href="/account"
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                  >
                    My Account
                  </Link>
                ) : (
                  <Link
                    href="/auth/login"
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                  >
                    Sign In
                  </Link>
                )
              )}
            </div>
            {/* Popular Links */}
            <div className="pt-2 mt-2 border-t border-slate-100">
              <p className="px-4 py-1 text-[0.65rem] font-semibold uppercase tracking-wide text-slate-400">Popular</p>
              {popularLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="block px-4 py-3 text-sm text-slate-600 hover:text-green-700 transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
