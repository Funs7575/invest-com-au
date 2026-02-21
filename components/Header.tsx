"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { name: "Compare", href: "/compare" },
  { name: "Best Brokers", href: "/best" },
  { name: "Deals", href: "/deals" },
  { name: "Reviews", href: "/reviews" },
  { name: "Learn", href: "/articles" },
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

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200">
      <div className="container-custom">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2 text-xl font-bold text-green-800">
            <svg
              viewBox="0 0 36 36"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-8 h-8 shrink-0"
              aria-hidden="true"
            >
              {/* Background circle */}
              <circle cx="18" cy="18" r="17" fill="#166534" />
              {/* Kangaroo - stylized, facing right */}
              <g transform="translate(7, 5) scale(0.85)">
                {/* Body */}
                <ellipse cx="14" cy="17" rx="5" ry="7" fill="white" />
                {/* Tail - sweeping curve */}
                <path d="M9 19 C5 16, 3 12, 5 8" stroke="white" strokeWidth="2.2" strokeLinecap="round" fill="none" />
                {/* Head */}
                <circle cx="17.5" cy="8.5" r="3.5" fill="white" />
                {/* Ear */}
                <ellipse cx="19" cy="5" rx="1.2" ry="2.5" fill="white" transform="rotate(15, 19, 5)" />
                {/* Eye */}
                <circle cx="18.8" cy="8" r="0.8" fill="#166534" />
                {/* Front arm */}
                <path d="M16 14 L19 17" stroke="white" strokeWidth="2" strokeLinecap="round" />
                {/* Back leg - strong */}
                <path d="M12 22 C11 25, 10 27, 8 28" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                {/* Front leg */}
                <path d="M15 22 C15.5 25, 16 27, 17 28" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
                {/* Foot - back */}
                <path d="M8 28 L5 28" stroke="white" strokeWidth="2" strokeLinecap="round" />
                {/* Foot - front */}
                <path d="M17 28 L20 28" stroke="white" strokeWidth="2" strokeLinecap="round" />
              </g>
            </svg>
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
                  className={`text-sm font-medium transition-colors ${isActive ? "text-green-800 font-bold" : "text-slate-700 hover:text-green-800"}`}
                  {...(isActive ? { "aria-current": "page" as const } : {})}
                >
                  {item.name}
                </Link>
              );
            })}
            <Link
              href="/article/how-to-invest-australia"
              className="text-sm text-green-700 font-medium hover:text-green-900 transition-colors"
            >
              New to investing?
            </Link>
            <Link
              href="/quiz"
              className="px-4 py-2 bg-green-700 text-white text-sm font-semibold rounded-lg hover:bg-green-800 transition-colors"
            >
              Broker Quiz
            </Link>
          </nav>

          {/* Mobile Hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 text-slate-700 hover:text-green-800 transition-colors"
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
            </div>
            {/* Popular Links */}
            <div className="pt-2 mt-2 border-t border-slate-100">
              <p className="px-4 py-1 text-[0.65rem] font-semibold uppercase tracking-wide text-slate-400">Popular</p>
              {popularLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="block px-4 py-2 text-xs text-slate-500 hover:text-green-700 transition-colors"
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
