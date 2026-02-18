"use client";

import { useState } from "react";
import Link from "next/link";

const navItems = [
  { name: "Compare", href: "/compare" },
  { name: "Best For", href: "/best" },
  { name: "Deals", href: "/deals" },
  { name: "Reviews", href: "/reviews" },
  { name: "Guides", href: "/articles" },
  { name: "Tools", href: "/calculators" },
];

const popularLinks = [
  { label: "Best Brokers 2026", href: "/article/best-share-trading-platforms-australia" },
  { label: "How to Invest", href: "/article/how-to-invest-australia" },
  { label: "Best ETFs", href: "/article/best-etfs-australia" },
  { label: "CommSec vs Stake", href: "/versus?vs=commsec,stake" },
];

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200">
      <div className="container-custom">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="text-xl font-bold text-green-800">
            Invest<span className="text-amber-500">.com.au</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-slate-700 hover:text-green-800 transition-colors"
              >
                {item.name}
              </Link>
            ))}
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
            aria-label="Toggle menu"
          >
            {menuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Slide-out Menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white">
          <nav className="container-custom py-4 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-3 text-sm font-medium text-slate-700 hover:bg-green-50 hover:text-green-800 rounded-lg transition-colors"
              >
                {item.name}
              </Link>
            ))}
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
