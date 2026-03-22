"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@/lib/hooks/useUser";
import { CURRENT_YEAR } from "@/lib/seo";
import ThemeToggle from "@/components/ThemeToggle";
import Icon from "@/components/Icon";

const propertyDropdown = [
  { label: "Investment Property", href: "/property", desc: "New developments, suburb data & more" },
  { label: "New Developments", href: "/property/listings", desc: "Off-the-plan apartments & houses" },
  { label: "Buyer's Agents", href: "/property/buyer-agents", desc: "Negotiation & off-market access" },
  { label: "Suburb Research", href: "/property/suburbs", desc: "Yields, growth & vacancy data" },
  { label: "Investment Loans", href: "/property/finance", desc: "Compare rates from major lenders" },
  { label: "FIRB & Foreign Buyers", href: "/property/foreign-investment", desc: "FIRB guide, surcharges & eligibility" },
  { label: "Mortgage Brokers", href: "/advisors/mortgage-brokers", desc: "Compare 30+ lenders — free" },
  { label: "Find an Advisor", href: "/find-advisor", desc: "Match with a verified professional" },
];

const foreignDropdown = [
  { label: "Foreign Investment Hub", href: "/foreign-investment", desc: "Start here — all verticals covered" },
  { label: "Shares for Non-Residents", href: "/foreign-investment/shares", desc: "Broker eligibility & withholding tax" },
  { label: "Crypto for Non-Residents", href: "/foreign-investment/crypto", desc: "AUSTRAC KYC & CGT treatment" },
  { label: "Savings & Interest WHT", href: "/foreign-investment/savings", desc: "10% withholding on interest" },
  { label: "Super & DASP", href: "/foreign-investment/super", desc: "Claim your super when leaving (35–65%)" },
  { label: "Tax Guide (DTA & WHT)", href: "/foreign-investment/tax", desc: "DTA treaties, CGT rules & residency" },
  { label: "Property (FIRB Guide)", href: "/property/foreign-investment", desc: "FIRB approval, stamp duty surcharges" },
  { label: "Find an Advisor", href: "/advisors/tax-agents", desc: "International tax specialists" },
];

const wealthDropdown = [
  { label: "Financial Planners", href: "/advisors/financial-planners", desc: "Wealth strategy & retirement" },
  { label: "SMSF Accountants", href: "/advisors/smsf-accountants", desc: "Self-managed super specialists" },
  { label: "Insurance Brokers", href: "/advisors/insurance-brokers", desc: "Life, income protection & business" },
  { label: "Tax Agents", href: "/advisors/tax-agents", desc: "Tax planning & lodgement" },
  { label: "Estate Planners", href: "/advisors/estate-planners", desc: "Wills, trusts & succession" },
  { label: "Wealth Managers", href: "/advisors/wealth-managers", desc: "Portfolio management" },
];

const platformsDropdown = [
  { label: "Compare Platforms", href: "/compare", desc: "Side-by-side comparison tool" },
  { label: `Best Platforms ${CURRENT_YEAR}`, href: "/best", desc: "Top picks by category" },
  { label: "Broker vs Broker", href: "/versus", desc: "Head-to-head matchups" },
  { label: "Deals & Offers", href: "/deals", desc: "Current promotions" },
  { label: "Platform Reviews", href: "/reviews", desc: "User ratings & reviews" },
  { label: "Platform Quiz", href: "/quiz", desc: "Get a platform match" },
];

const popularLinks = [
  { label: "Mortgage Brokers", href: "/advisors/mortgage-brokers" },
  { label: "Find an Advisor", href: "/find-advisor" },
  { label: `Best Platforms ${CURRENT_YEAR}`, href: "/article/best-share-trading-platforms-australia" },
  { label: "Buyer's Agents", href: "/advisors/buyers-agents" },
  { label: "Best Super Funds", href: "/best/super-funds" },
  { label: "Best ETFs", href: "/article/best-etfs-australia" },
];

const mobileNavSections = [
  {
    title: "Investing from Abroad",
    items: [
      { name: "Foreign Investment Hub", href: "/foreign-investment" },
      { name: "Shares for Non-Residents", href: "/foreign-investment/shares" },
      { name: "Crypto for Non-Residents", href: "/foreign-investment/crypto" },
      { name: "Savings & Interest WHT", href: "/foreign-investment/savings" },
      { name: "Super & DASP", href: "/foreign-investment/super" },
      { name: "Tax Guide (DTA & WHT)", href: "/foreign-investment/tax" },
    ],
  },
  {
    title: "Investment Property",
    items: [
      { name: "Property Hub", href: "/property" },
      { name: "New Developments", href: "/property/listings" },
      { name: "Buyer's Agents", href: "/property/buyer-agents" },
      { name: "Suburb Research", href: "/property/suburbs" },
      { name: "Investment Loans", href: "/property/finance" },
      { name: "FIRB & Foreign Buyers", href: "/property/foreign-investment" },
    ],
  },
  {
    title: "Advisors & Finance",
    items: [
      { name: "Mortgage Brokers", href: "/advisors/mortgage-brokers" },
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
      { name: "Compare", href: "/compare" },
      { name: "Best Platforms", href: "/best" },
      { name: "Deals & Offers", href: "/deals" },
      { name: "Reviews", href: "/reviews" },
      { name: "Broker vs Broker", href: "/versus" },
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

function DesktopDropdown({
  label,
  items,
  isActive,
}: {
  label: string;
  items: { label: string; href: string; desc: string }[];
  isActive: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const timeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  const enter = () => { clearTimeout(timeout.current); setOpen(true); };
  const leave = () => { timeout.current = setTimeout(() => setOpen(false), 150); };

  useEffect(() => {
    return () => clearTimeout(timeout.current);
  }, []);

  return (
    <div ref={ref} className="relative" onMouseEnter={enter} onMouseLeave={leave}>
      <button
        onClick={() => setOpen(!open)}
        className={`px-4 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-bold rounded-lg transition-colors flex items-center gap-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-700/40 ${
          isActive ? "text-slate-900 bg-slate-50" : ""
        }`}
      >
        {label}
        <Icon name="chevron-down" size={14} className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 z-50">
          <div className="bg-white rounded-xl border border-slate-200 shadow-lg py-2 min-w-[240px]">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="block px-5 py-2.5 hover:bg-slate-50 transition-colors group"
              >
                <div className="text-sm font-bold text-slate-900">{item.label}</div>
                <div className="text-xs text-slate-400">{item.desc}</div>
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
  const isPropertyActive = ["/property", "/advisors/mortgage-brokers", "/advisors/buyers-agents", "/advisors/real-estate-agents", "/find-advisor"].some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
  const isWealthActive = ["/advisors/financial-planners", "/advisors/smsf-accountants", "/advisors/insurance-brokers", "/advisors/tax-agents", "/advisors/estate-planners", "/advisors/wealth-managers"].some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
  const isForeignActive = pathname === "/foreign-investment" || pathname.startsWith("/foreign-investment/");

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50 shadow-[0_2px_20px_rgb(0,0,0,0.02)] transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 lg:h-20 items-center">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0 flex items-center group">
            <span className="font-bold text-xl lg:text-2xl text-slate-900 tracking-tight">
              Invest<span className="text-amber-500">.com.au</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex space-x-1 items-center ml-8" aria-label="Main navigation">
            <DesktopDropdown label="Property & Finance" items={propertyDropdown} isActive={isPropertyActive} />
            <DesktopDropdown label="Wealth & SMSF" items={wealthDropdown} isActive={isWealthActive} />
            <div className="h-6 w-px bg-slate-200 mx-2" />
            <DesktopDropdown label="Compare Platforms" items={platformsDropdown} isActive={isPlatformsActive} />
            <div className="h-6 w-px bg-slate-200 mx-2" />
            <DesktopDropdown label="Investing from Abroad" items={foreignDropdown} isActive={isForeignActive} />
          </nav>

          {/* Desktop CTA + Theme */}
          <div className="hidden lg:flex items-center gap-3">
            {/* ThemeToggle disabled — dark mode not yet styled */}
            <Link
              href="/find-advisor"
              className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-lg font-bold transition-all shadow-sm hover:shadow-md flex items-center gap-2 text-sm"
            >
              Match With an Advisor
              <Icon name="arrow-right" size={16} />
            </Link>
          </div>

          {/* Mobile: Theme + Hamburger */}
          <div className="lg:hidden flex items-center gap-1.5">
            {/* ThemeToggle disabled — dark mode not yet styled */}
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
        <div className="lg:hidden border-t border-slate-200 bg-white max-h-[80vh] overflow-y-auto">
          <nav className="max-w-7xl mx-auto px-4 sm:px-6 py-3 space-y-1" aria-label="Mobile navigation">
            {/* Grouped sections */}
            {mobileNavSections.map((section) => (
              <div key={section.title} className="pt-1.5 mt-1 border-t border-slate-100 first:border-t-0 first:mt-0 first:pt-0">
                <p className="px-3 pt-1 pb-0.5 text-[0.62rem] font-extrabold uppercase tracking-wider text-slate-400">{section.title}</p>
                {section.items.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      className={`block px-3 py-2.5 min-h-[44px] flex items-center text-[0.8rem] font-medium rounded-lg transition-colors ${isActive ? "bg-amber-50 text-amber-800 font-bold" : "text-slate-700 hover:bg-slate-50"}`}
                      {...(isActive ? { "aria-current": "page" as const } : {})}
                    >
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            ))}

            {/* Action buttons */}
            <div className="pt-2 mt-2 border-t border-slate-100 space-y-2 px-3">
              <Link
                href="/find-advisor"
                onClick={() => setMenuOpen(false)}
                className="block w-full py-3 min-h-[44px] text-center text-sm font-extrabold text-white bg-slate-900 rounded-xl hover:bg-slate-800 transition-colors"
              >
                Match With an Advisor
              </Link>
              <div className="flex gap-2">
                <Link
                  href="/quiz"
                  onClick={() => setMenuOpen(false)}
                  className="flex-1 py-2.5 min-h-[44px] flex items-center justify-center text-xs font-bold text-center text-amber-800 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
                >
                  Platform Quiz
                </Link>
                <Link
                  href="/compare"
                  onClick={() => setMenuOpen(false)}
                  className="flex-1 py-2.5 min-h-[44px] flex items-center justify-center text-xs font-bold text-center text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  Compare Platforms
                </Link>
              </div>
            </div>

            {/* Popular Links */}
            <div className="pt-1.5 mt-1 border-t border-slate-100">
              <p className="px-3 pt-1 pb-1 text-[0.62rem] font-extrabold uppercase tracking-wider text-slate-400">Popular</p>
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
