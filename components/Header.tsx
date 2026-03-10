"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@/lib/hooks/useUser";
import { CURRENT_YEAR } from "@/lib/seo";
import ThemeToggle from "@/components/ThemeToggle";

const platformsDropdown = [
  { label: "Compare Platforms", href: "/compare", desc: "Side-by-side comparison tool" },
  { label: `Best Platforms ${CURRENT_YEAR}`, href: "/best", desc: "Top picks by category" },
  { label: "Broker vs Broker", href: "/versus", desc: "Head-to-head matchups" },
  { label: "Deals & Offers", href: "/deals", desc: "Current promotions" },
  { label: "Platform Reviews", href: "/reviews", desc: "User ratings & reviews" },
  { label: "Platform Quiz", href: "/quiz", desc: "Get a personalised match" },
];

const advisorsDropdown = [
  { label: "Find an Advisor", href: "/find-advisor", desc: "Match with a professional" },
  { label: "Advisor Directory", href: "/advisors", desc: "Browse all advisors" },
  { label: "Advisor Reviews", href: "/reviews?tab=advisors", desc: "Ratings & feedback" },
  { label: "Advisor Guides", href: "/advisor-guides", desc: "How to choose & compare" },
];

const learnDropdown = [
  { label: "Articles", href: "/articles", desc: "News & analysis" },
  { label: "How-To Guides", href: "/how-to", desc: "Step-by-step tutorials" },
  { label: "Calculators", href: "/calculators", desc: "Brokerage, CGT & more" },
  // { label: "Courses", href: "/courses", desc: "In-depth learning" }, // Hidden for launch
];

const popularLinks = [
  { label: `Best Platforms ${CURRENT_YEAR}`, href: "/article/best-share-trading-platforms-australia" },
  { label: "Best Super Funds", href: "/best/super-funds" },
  { label: "Find an Advisor", href: "/find-advisor" },
  { label: "Best Crypto", href: "/article/best-crypto-exchanges-australia" },
  { label: "Best Robo-Advisors", href: "/best/robo-advisors" },
  { label: "Best ETFs", href: "/article/best-etfs-australia" },
];

// Mobile nav — flat list grouped by section
const mobileNavSections = [
  {
    title: "Platforms",
    items: [
      { name: "Compare", href: "/compare" },
      { name: "Best Platforms", href: "/best" },
      { name: "Deals & Offers", href: "/deals" },
      { name: "Reviews", href: "/reviews" },
      { name: "Broker vs Broker", href: "/versus" },
    ],
  },
  {
    title: "Advisors",
    items: [
      { name: "Find an Advisor", href: "/find-advisor" },
      { name: "Advisor Directory", href: "/advisors" },
      { name: "Advisor Guides", href: "/advisor-guides" },
    ],
  },
  {
    title: "Learn",
    items: [
      { name: "Articles", href: "/articles" },
      { name: "How-To Guides", href: "/how-to" },
      { name: "Calculators", href: "/calculators" },
      // { name: "Courses", href: "/courses" }, // Hidden for launch
    ],
  },
];

function DesktopDropdown({
  label,
  items,
  isActive,
  accentColor = "blue",
}: {
  label: string;
  items: { label: string; href: string; desc: string }[];
  isActive: boolean;
  accentColor?: "blue" | "violet";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const timeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  const enter = () => { clearTimeout(timeout.current); setOpen(true); };
  const leave = () => { timeout.current = setTimeout(() => setOpen(false), 150); };

  useEffect(() => {
    return () => clearTimeout(timeout.current);
  }, []);

  const accentClasses = accentColor === "violet"
    ? { active: "text-violet-700 font-bold", hover: "hover:bg-violet-50", indicator: "bg-violet-600" }
    : { active: "text-blue-700 font-bold", hover: "hover:bg-blue-50", indicator: "bg-blue-600" };

  return (
    <div ref={ref} className="relative" onMouseEnter={enter} onMouseLeave={leave}>
      <button
        onClick={() => setOpen(!open)}
        className={`text-sm font-medium transition-colors rounded px-1 py-1 focus:outline-none focus:ring-2 focus:ring-blue-700/40 flex items-center gap-0.5 ${
          isActive ? accentClasses.active : "text-slate-700 hover:text-slate-900"
        }`}
      >
        {label}
        <svg className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 pt-1.5 z-50">
          <div className="bg-white rounded-xl border border-slate-200 shadow-lg py-1.5 min-w-[220px]">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`block px-4 py-2.5 ${accentClasses.hover} transition-colors group`}
              >
                <div className="text-sm font-semibold text-slate-900 group-hover:text-slate-900">{item.label}</div>
                <div className="text-[0.62rem] text-slate-400">{item.desc}</div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const { user, loading } = useUser();

  // Close mobile menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const isPlatformsActive = ["/compare", "/best", "/versus", "/deals", "/reviews", "/quiz"].some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
  const isAdvisorsActive = ["/advisors", "/find-advisor", "/advisor-guides", "/advisor"].some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
  const isLearnActive = ["/articles", "/article", "/how-to", "/calculators"].some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200">
      <div className="container-custom">
        <div className="flex items-center justify-between h-12 md:h-16">
          <Link href="/" className="flex items-center text-lg md:text-xl font-bold text-slate-900">
            <span>Invest<span className="text-amber-500">.com.au</span></span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-2 lg:gap-3.5 ml-6" aria-label="Main navigation">
            <DesktopDropdown label="Platforms" items={platformsDropdown} isActive={isPlatformsActive} />
            <DesktopDropdown label="Advisors" items={advisorsDropdown} isActive={isAdvisorsActive} accentColor="violet" />
            <DesktopDropdown label="Learn" items={learnDropdown} isActive={isLearnActive} />

            <Link
              href="/quiz"
              className="px-3 py-1.5 bg-amber-600 text-white text-xs font-semibold rounded-lg hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:ring-offset-2 transition-colors"
            >
              Quiz
            </Link>
            <Link
              href="/find-advisor"
              className="px-3 py-1.5 bg-violet-600 text-white text-xs font-semibold rounded-lg hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:ring-offset-2 transition-colors"
            >
              Find Advisor
            </Link>
            {/* Pro / Account — hidden for launch */}
            {/* TODO: Re-enable when subscription product launches */}
            <ThemeToggle />
          </nav>

          {/* Mobile: Theme + Hamburger */}
          <div className="md:hidden flex items-center gap-1.5">
            <ThemeToggle />
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-700 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-700/40 rounded-lg transition-colors"
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
      </div>

      {/* Mobile Slide-out Menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white max-h-[80vh] overflow-y-auto">
          <nav className="container-custom py-3 space-y-1" aria-label="Mobile navigation">
            {/* Beginner CTA */}
            <Link
              href="/article/how-to-invest-australia"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-900 bg-slate-50 rounded-lg transition-colors"
            >
              <span className="shrink-0 w-5 h-5 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center text-[0.6rem] font-bold">?</span>
              New to investing? Start here
            </Link>

            {/* Grouped sections */}
            {mobileNavSections.map((section) => (
              <div key={section.title} className="pt-1.5 mt-1 border-t border-slate-100">
                <p className="px-3 pt-1 pb-0.5 text-[0.62rem] font-semibold uppercase tracking-wider text-slate-400">{section.title}</p>
                {section.items.map((item) => {
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
              </div>
            ))}

            {/* Quiz + Advisor + Pro — action buttons */}
            <div className="pt-1.5 mt-1 border-t border-slate-100 space-y-2 px-3">
              <div className="flex gap-2">
                <Link
                  href="/quiz"
                  onClick={() => setMenuOpen(false)}
                  className="flex-1 py-2.5 min-h-[44px] flex items-center justify-center text-xs font-semibold text-center text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition-colors"
                >
                  Platform Quiz
                </Link>
                <Link
                  href="/find-advisor"
                  onClick={() => setMenuOpen(false)}
                  className="flex-1 py-2.5 min-h-[44px] flex items-center justify-center text-xs font-semibold text-center text-white bg-violet-600 rounded-lg hover:bg-violet-700 transition-colors"
                >
                  Find Advisor
                </Link>
              </div>
              {/* Pro button hidden for launch */}
            </div>

            {/* Auth — hidden for launch */}

            {/* Popular Links */}
            <div className="pt-1.5 mt-1 border-t border-slate-100">
              <p className="px-3 pt-1 pb-1 text-[0.62rem] font-semibold uppercase tracking-wider text-slate-400">Popular</p>
              <div className="flex flex-wrap gap-1.5 px-3 pb-1">
                {popularLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="text-[0.69rem] font-medium text-slate-600 bg-slate-50 px-3 py-1.5 min-h-[44px] inline-flex items-center rounded-full hover:bg-slate-100 hover:text-slate-900 transition-colors"
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
