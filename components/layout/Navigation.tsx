"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CURRENT_YEAR } from "@/lib/seo";

// ─── Mega-menu data ───────────────────────────────────────────────────────────

const platformsMenu = {
  popular: [
    { label: "Interactive Brokers", href: "/broker/interactive-brokers", badge: "Editor's Choice" },
    { label: "CMC Markets", href: "/broker/cmc-markets", badge: "Best Deal" },
    { label: "Stake", href: "/broker/stake" },
    { label: "Moomoo", href: "/broker/moomoo" },
  ],
  byCategory: [
    { label: "Share Trading", href: "/compare?category=shares" },
    { label: "Crypto Exchanges", href: "/compare?category=crypto" },
    { label: "Super Funds", href: "/best/super-funds" },
    { label: "Robo-Advisors", href: "/best/robo-advisors" },
    { label: "Savings Accounts", href: "/compare?filter=savings" },
    { label: "Term Deposits", href: "/best/term-deposits" },
  ],
  tools: [
    { label: `Best Platforms ${CURRENT_YEAR}`, href: "/best" },
    { label: "Compare All Platforms", href: "/compare" },
    { label: "Broker vs Broker", href: "/versus" },
    { label: "Current Deals", href: "/deals" },
    { label: "Platform Quiz (60s)", href: "/quiz" },
    { label: "Fee Calculator", href: "/calculators" },
  ],
};

const advisorsMenu = {
  property: [
    { label: "Mortgage Brokers", href: "/advisors/mortgage-brokers", desc: "Compare 30+ lenders — free" },
    { label: "Buyer's Agents", href: "/advisors/buyers-agents", desc: "Off-market access & negotiation" },
    { label: "Real Estate Agents", href: "/advisors/real-estate-agents", desc: "Selling & listing specialists" },
  ],
  wealth: [
    { label: "Financial Planners", href: "/advisors/financial-planners", desc: "Wealth strategy & retirement" },
    { label: "SMSF Accountants", href: "/advisors/smsf-accountants", desc: "Self-managed super specialists" },
    { label: "Insurance Brokers", href: "/advisors/insurance-brokers", desc: "Life & income protection" },
    { label: "Tax Agents", href: "/advisors/tax-agents", desc: "Tax planning & lodgement" },
    { label: "Estate Planners", href: "/advisors/estate-planners", desc: "Wills, trusts & succession" },
    { label: "Wealth Managers", href: "/advisors/wealth-managers", desc: "Portfolio management" },
  ],
};

const learnMenu = {
  guides: [
    { label: "Best Platforms for Beginners", href: "/article/best-share-trading-platforms-australia" },
    { label: "How to Buy US Stocks", href: "/article/how-to-buy-us-stocks" },
    { label: "Tax Loss Harvesting Guide", href: "/article/tax-loss-harvesting" },
    { label: "Best ETFs in Australia", href: "/article/best-etfs-australia" },
  ],
  topics: [
    { label: "Investing Basics", href: "/articles?topic=investing-basics" },
    { label: "Tax & Super", href: "/articles?topic=tax-strategy" },
    { label: "Property Investing", href: "/articles?topic=property" },
    { label: "Crypto & Digital Assets", href: "/articles?topic=crypto" },
  ],
  tools: [
    { label: "All Calculators", href: "/calculators" },
    { label: "Mortgage Calculator", href: "/mortgage-calculator" },
    { label: "Retirement Calculator", href: "/retirement-calculator" },
    { label: "Glossary", href: "/glossary" },
    { label: "All Articles", href: "/articles" },
    { label: "How-To Guides", href: "/how-to" },
  ],
};

// ─── Mega-menu dropdown component ────────────────────────────────────────────

function MegaMenuDropdown({
  label,
  children,
  isActive,
}: {
  label: string;
  children: React.ReactNode;
  isActive?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const ref = useRef<HTMLDivElement>(null);

  const enter = useCallback(() => {
    clearTimeout(timeout.current);
    setOpen(true);
  }, []);

  const leave = useCallback(() => {
    timeout.current = setTimeout(() => setOpen(false), 120);
  }, []);

  useEffect(() => () => clearTimeout(timeout.current), []);

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={enter}
      onMouseLeave={leave}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1 px-3 py-2 text-sm font-semibold rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400
          ${isActive
            ? "text-slate-900 bg-slate-50"
            : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {label}
        <svg
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute left-0 top-full pt-2 z-50 min-w-[600px]"
          role="menu"
        >
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/60 overflow-hidden">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Mobile menu ──────────────────────────────────────────────────────────────

const mobileSections = [
  {
    title: "Property & Finance",
    items: [
      { name: "Mortgage Brokers", href: "/advisors/mortgage-brokers" },
      { name: "Buyer's Agents", href: "/advisors/buyers-agents" },
      { name: "Real Estate Agents", href: "/advisors/real-estate-agents" },
      { name: "Find an Advisor", href: "/find-advisor" },
      { name: "All Advisors", href: "/advisors" },
    ],
  },
  {
    title: "Wealth & SMSF",
    items: [
      { name: "Financial Planners", href: "/advisors/financial-planners" },
      { name: "SMSF Accountants", href: "/advisors/smsf-accountants" },
      { name: "Insurance Brokers", href: "/advisors/insurance-brokers" },
      { name: "Tax Agents", href: "/advisors/tax-agents" },
      { name: "Estate Planners", href: "/advisors/estate-planners" },
    ],
  },
  {
    title: "Compare Platforms",
    items: [
      { name: "Compare All Platforms", href: "/compare" },
      { name: "Best Platforms", href: "/best" },
      { name: "Deals & Offers", href: "/deals" },
      { name: "Broker vs Broker", href: "/versus" },
      { name: "Platform Quiz", href: "/quiz" },
    ],
  },
  {
    title: "Learn",
    items: [
      { name: "Articles & Guides", href: "/articles" },
      { name: "How-To Guides", href: "/how-to" },
      { name: "Calculators", href: "/calculators" },
      { name: "Glossary", href: "/glossary" },
    ],
  },
];

// ─── Main Navigation ──────────────────────────────────────────────────────────

export function Navigation() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const isPlatformsActive = ["/compare", "/best", "/versus", "/deals", "/broker"].some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
  const isAdvisorsActive = ["/advisors", "/find-advisor", "/advisor/"].some(
    (p) => pathname === p || pathname.startsWith(p)
  );
  const isLearnActive = ["/articles", "/article/", "/how-to", "/calculators", "/glossary"].some(
    (p) => pathname === p || pathname.startsWith(p)
  );

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-slate-200 shadow-[0_1px_0_0_rgba(0,0,0,0.04)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 lg:h-[68px] items-center justify-between gap-4">

          {/* Logo */}
          <Link
            href="/"
            className="shrink-0 font-extrabold text-xl lg:text-2xl text-slate-900 tracking-tight"
            aria-label="Invest.com.au — Home"
          >
            Invest<span className="text-amber-500">.com.au</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1" aria-label="Main navigation">

            {/* Platforms Mega-Menu */}
            <MegaMenuDropdown label="Platforms" isActive={isPlatformsActive}>
              <div className="grid grid-cols-3 gap-0 p-6">
                <div>
                  <p className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-wider mb-3">Popular</p>
                  <div className="space-y-1">
                    {platformsMenu.popular.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-amber-50 hover:text-amber-900 rounded-lg transition-colors"
                      >
                        {item.label}
                        {item.badge && (
                          <span className="text-[0.6rem] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-wider mb-3">By Category</p>
                  <div className="space-y-1">
                    {platformsMenu.byCategory.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="block px-3 py-2 text-sm text-slate-700 hover:bg-amber-50 hover:text-amber-900 rounded-lg transition-colors"
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-wider mb-3">Tools & Lists</p>
                  <div className="space-y-1">
                    {platformsMenu.tools.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="block px-3 py-2 text-sm text-slate-700 hover:bg-amber-50 hover:text-amber-900 rounded-lg transition-colors"
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </MegaMenuDropdown>

            {/* Advisors Mega-Menu */}
            <MegaMenuDropdown label="Advisors" isActive={isAdvisorsActive}>
              <div className="p-6">
                {/* Top CTA */}
                <Link
                  href="/find-advisor"
                  className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl mb-5 hover:border-amber-300 transition-colors group"
                >
                  <div>
                    <p className="font-bold text-slate-900 text-sm">Get Matched Free</p>
                    <p className="text-xs text-slate-500 mt-0.5">Answer 4 questions — we'll find your best fit</p>
                  </div>
                  <svg className="w-5 h-5 text-amber-500 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-wider mb-3">Property & Finance</p>
                    <div className="space-y-1">
                      {advisorsMenu.property.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          className="block px-3 py-2.5 rounded-lg hover:bg-amber-50 transition-colors"
                        >
                          <div className="text-sm font-semibold text-slate-800">{item.label}</div>
                          <div className="text-xs text-slate-400">{item.desc}</div>
                        </Link>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-wider mb-3">Wealth & SMSF</p>
                    <div className="space-y-1">
                      {advisorsMenu.wealth.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          className="block px-3 py-2.5 rounded-lg hover:bg-amber-50 transition-colors"
                        >
                          <div className="text-sm font-semibold text-slate-800">{item.label}</div>
                          <div className="text-xs text-slate-400">{item.desc}</div>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </MegaMenuDropdown>

            {/* Learn Mega-Menu */}
            <MegaMenuDropdown label="Learn" isActive={isLearnActive}>
              <div className="grid grid-cols-3 gap-0 p-6">
                <div>
                  <p className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-wider mb-3">Popular Guides</p>
                  <div className="space-y-1">
                    {learnMenu.guides.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="block px-3 py-2 text-sm text-slate-700 hover:bg-amber-50 hover:text-amber-900 rounded-lg transition-colors"
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-wider mb-3">By Topic</p>
                  <div className="space-y-1">
                    {learnMenu.topics.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="block px-3 py-2 text-sm text-slate-700 hover:bg-amber-50 hover:text-amber-900 rounded-lg transition-colors"
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-wider mb-3">Tools & Resources</p>
                  <div className="space-y-1">
                    {learnMenu.tools.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="block px-3 py-2 text-sm text-slate-700 hover:bg-amber-50 hover:text-amber-900 rounded-lg transition-colors"
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </MegaMenuDropdown>
          </nav>

          {/* Desktop CTAs */}
          <div className="hidden lg:flex items-center gap-3">
            <Link
              href="/compare"
              className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors px-3 py-2 rounded-lg hover:bg-slate-50"
            >
              Compare
            </Link>
            <Link
              href="/find-advisor"
              className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm hover:shadow-md active:scale-[0.97] flex items-center gap-2"
            >
              Find Advisor
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {/* Mobile hamburger */}
          <div className="lg:hidden flex items-center gap-2">
            <Link
              href="/find-advisor"
              className="bg-amber-500 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all hover:bg-amber-600"
            >
              Find Advisor
            </Link>
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-700 rounded-lg hover:bg-slate-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              aria-controls="mobile-menu"
            >
              {mobileOpen ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile slide-down menu */}
      {mobileOpen && (
        <div
          id="mobile-menu"
          className="lg:hidden border-t border-slate-100 bg-white max-h-[85vh] overflow-y-auto"
          aria-label="Mobile navigation"
        >
          <nav className="max-w-7xl mx-auto px-4 sm:px-6 py-4 space-y-0.5">
            {mobileSections.map((section, si) => (
              <div key={section.title} className={si > 0 ? "border-t border-slate-100 pt-3 mt-1" : ""}>
                <p className="px-3 pb-1 text-[0.6rem] font-extrabold uppercase tracking-widest text-slate-400">
                  {section.title}
                </p>
                {section.items.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center justify-between px-3 py-3 min-h-[48px] rounded-xl text-sm font-medium transition-colors ${
                        active
                          ? "bg-amber-50 text-amber-800 font-bold"
                          : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                      {...(active ? { "aria-current": "page" as const } : {})}
                    >
                      {item.name}
                      <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  );
                })}
              </div>
            ))}

            {/* Bottom action buttons */}
            <div className="border-t border-slate-100 pt-4 mt-2 space-y-2 pb-2">
              <Link
                href="/find-advisor"
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-center w-full py-3.5 min-h-[48px] bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm rounded-xl transition-colors"
              >
                Find an Advisor — Free
              </Link>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/compare"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center py-3 min-h-[48px] border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Compare Platforms
                </Link>
                <Link
                  href="/quiz"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center py-3 min-h-[48px] border border-amber-200 bg-amber-50 text-amber-800 font-semibold text-xs rounded-xl hover:bg-amber-100 transition-colors"
                >
                  Platform Quiz
                </Link>
              </div>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
