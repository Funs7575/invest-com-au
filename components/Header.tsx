"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@/lib/hooks/useUser";
import { CURRENT_YEAR } from "@/lib/seo";
import Icon from "@/components/Icon";
import NotificationBell from "@/components/NotificationBell";
import ThemeToggle from "@/components/ThemeToggle";

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

const investMegaMenu = [
  {
    title: "Sectors & Assets",
    items: [
      { label: "Mining & Resources", href: "/invest/mining", desc: "Iron ore, copper & critical minerals" },
      { label: "Oil & Gas", href: "/invest/oil-gas", desc: "ASX majors, LNG, refineries" },
      { label: "Uranium", href: "/invest/uranium", desc: "Paladin, Boss Energy, ATOM ETF" },
      { label: "Lithium", href: "/invest/lithium", desc: "Pilbara producers & processing" },
      { label: "Hydrogen", href: "/invest/hydrogen", desc: "Green H2, fuel cells & HGEN ETF" },
      { label: "Gold & Precious Metals", href: "/invest/gold", desc: "Perth Mint, ETFs, ASX miners" },
      { label: "Renewable Energy", href: "/invest/renewable-energy", desc: "Solar, wind & battery" },
      { label: "Buy a Business", href: "/invest/buy-business", desc: "SME acquisitions" },
      { label: "Farmland & Agriculture", href: "/invest/farmland", desc: "Livestock, cropping, water" },
      { label: "Commercial Property", href: "/invest/commercial-property", desc: "Office, industrial, hotels" },
      { label: "Startups & Tech", href: "/invest/startups", desc: "VC, angel, crowdfunding" },
      { label: "Infrastructure", href: "/invest/infrastructure", desc: "Toll roads, airports, utilities" },
    ],
  },
  {
    title: "Markets & Trading",
    items: [
      { label: "Shares & ETFs", href: "/compare", desc: "Compare ASX trading platforms" },
      { label: "Managed & Index Funds", href: "/invest/managed-funds", desc: "Vanguard, Betashares, iShares" },
      { label: "Dividend Investing", href: "/invest/dividend-investing", desc: "Franking credits & high-yield ASX" },
      { label: "A-REITs", href: "/invest/reits", desc: "ASX-listed property trusts" },
      { label: "Options & Derivatives", href: "/invest/options-trading", desc: "ETOs, CFDs, warrants & futures" },
      { label: "Forex Trading", href: "/invest/forex", desc: "AUD/USD, ASIC-regulated brokers" },
      { label: "Commodities", href: "/invest/commodities", desc: "Gold, silver, oil & resource ETFs" },
    ],
  },
  {
    title: "Income & Alternatives",
    items: [
      { label: "Private Credit & P2P", href: "/invest/private-credit", desc: "La Trobe, Qualitas, Metrics" },
      { label: "Bonds & Fixed Income", href: "/invest/bonds", desc: "Government & corporate bonds" },
      { label: "Hybrid Securities", href: "/invest/hybrid-securities", desc: "Bank hybrids & APRA phase-out" },
      { label: "Alternatives", href: "/invest/alternatives", desc: "Wine, art, cars, watches & more" },
      { label: "Crypto Staking & DeFi", href: "/invest/crypto-staking", desc: "Staking, DeFi & crypto ETFs" },
      { label: "SMSF Investment Guide", href: "/invest/smsf", desc: "What SMSFs invest in & how" },
      { label: "Super & SMSF", href: "/compare/super", desc: "Super fund comparisons" },
    ],
  },
];

const foreignDropdown = [
  { label: "Foreign Investment Hub", href: "/foreign-investment", desc: "Start here — all verticals covered" },
  { label: "Shares for Non-Residents", href: "/foreign-investment/shares", desc: "Broker eligibility & withholding tax" },
  { label: "Crypto for Non-Residents", href: "/foreign-investment/crypto", desc: "AUSTRAC KYC & CGT treatment" },
  { label: "Savings & Interest WHT", href: "/foreign-investment/savings", desc: "10% withholding on interest" },
  { label: "Super & DASP", href: "/foreign-investment/super", desc: "Claim your super when leaving (35–65%)" },
  { label: "Tax Guide (DTA & WHT)", href: "/foreign-investment/tax", desc: "DTA treaties, CGT rules & residency" },
  { label: "Property (FIRB Guide)", href: "/property/foreign-investment", desc: "FIRB approval, stamp duty surcharges" },
  { label: "Country Guides", href: "/foreign-investment", desc: "US, UK, Singapore, India & more" },
  { label: "Send Money to Australia", href: "/foreign-investment/send-money-australia", desc: "Compare FX rates & transfer fees" },
  { label: "International Tax Specialists", href: "/advisors/international-tax-specialists", desc: "Expat & cross-border tax advisors" },
  { label: "FIRB Specialists", href: "/advisors/firb-specialists", desc: "FIRB approval applications" },
  { label: "Migration Agents", href: "/advisors/migration-agents", desc: "Investor & skilled visa specialists" },
];

// Categorised advisor mega-menu — renders under the "Advisors" nav
// dropdown with four themed columns plus an "All" quick-links rail.
// When adding a new advisor type, append to the relevant column here.
const advisorsMegaMenu: { title: string; items: { label: string; href: string; desc: string }[] }[] = [
  {
    title: "Financial",
    items: [
      { label: "Financial Planners", href: "/advisors/financial-planners", desc: "Wealth strategy & retirement" },
      { label: "SMSF Accountants", href: "/advisors/smsf-accountants", desc: "Self-managed super specialists" },
      { label: "Wealth Managers", href: "/advisors/wealth-managers", desc: "Portfolio management for HNW" },
      { label: "Tax Agents", href: "/advisors/tax-agents", desc: "Tax planning & lodgement" },
    ],
  },
  {
    title: "Property",
    items: [
      { label: "Mortgage Brokers", href: "/advisors/mortgage-brokers", desc: "Compare 30+ lenders — free" },
      { label: "Buyers Agents", href: "/advisors/buyers-agents", desc: "Negotiation & off-market access" },
      { label: "Real Estate Agents", href: "/advisors/real-estate-agents", desc: "Licensed agents, suburb specialists" },
    ],
  },
  {
    title: "Business & Investment",
    items: [
      { label: "Business Brokers", href: "/advisors/business-brokers", desc: "Buy / sell SMEs & franchises" },
      { label: "Commercial Lawyers", href: "/advisors/commercial-lawyers", desc: "Contracts, M&A, structuring" },
      { label: "Migration Agents", href: "/advisors/migration-agents", desc: "Investor & skilled visas (MARA)" },
    ],
  },
  {
    title: "Mining & Energy",
    items: [
      { label: "Mining Lawyers", href: "/advisors/mining-lawyers", desc: "Tenements, JVs, FIRB approvals" },
      { label: "Energy Consultants", href: "/advisors/energy-consultants", desc: "Renewables, PPAs, grid connection" },
    ],
  },
];

const platformsDropdown = [
  { label: "Compare Platforms", href: "/compare", desc: "Side-by-side comparison tool" },
  { label: `Best Platforms ${CURRENT_YEAR}`, href: "/best", desc: "Top picks by category" },
  { label: "ETF Hub", href: "/etfs", desc: "Compare ASX & global ETFs by type" },
  { label: "Fee Tracker", href: "/fee-tracker", desc: "Every broker fee change, tracked" },
  { label: "Broker vs Broker", href: "/versus", desc: "Head-to-head matchups" },
  { label: "Deals & Offers", href: "/deals", desc: "Current promotions" },
  { label: "Platform Reviews", href: "/reviews", desc: "User ratings & reviews" },
  { label: "Platform Quiz", href: "/quiz", desc: "Get a platform match" },
  { label: "Best Broker For…", href: "/best-for", desc: "Ranked picks for 50+ scenarios" },
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
    title: "Invest by Sector",
    items: [
      { name: "All Investment Verticals", href: "/invest" },
      { name: "Mining & Resources", href: "/invest/mining" },
      { name: "Oil & Gas", href: "/invest/oil-gas" },
      { name: "Uranium", href: "/invest/uranium" },
      { name: "Lithium", href: "/invest/lithium" },
      { name: "Hydrogen", href: "/invest/hydrogen" },
      { name: "Gold & Precious Metals", href: "/invest/gold" },
      { name: "Buy a Business", href: "/invest/buy-business" },
      { name: "Farmland & Agriculture", href: "/invest/farmland" },
      { name: "Commercial Property", href: "/invest/commercial-property" },
      { name: "Renewable Energy", href: "/invest/renewable-energy" },
      { name: "Startups & Tech", href: "/invest/startups" },
      { name: "Private Credit & P2P", href: "/invest/private-credit" },
      { name: "A-REITs", href: "/invest/reits" },
      { name: "Managed & Index Funds", href: "/invest/managed-funds" },
      { name: "Dividend Investing", href: "/invest/dividend-investing" },
      { name: "Options & Derivatives", href: "/invest/options-trading" },
      { name: "Forex Trading", href: "/invest/forex" },
      { name: "Commodities", href: "/invest/commodities" },
      { name: "Alternatives", href: "/invest/alternatives" },
      { name: "Infrastructure", href: "/invest/infrastructure" },
      { name: "Hybrid Securities", href: "/invest/hybrid-securities" },
      { name: "Crypto Staking & DeFi", href: "/invest/crypto-staking" },
      { name: "SMSF Investment Guide", href: "/invest/smsf" },
    ],
  },
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
    title: "Advisors — Financial",
    items: [
      { name: "Financial Planners", href: "/advisors/financial-planners" },
      { name: "SMSF Accountants", href: "/advisors/smsf-accountants" },
      { name: "Wealth Managers", href: "/advisors/wealth-managers" },
      { name: "Tax Agents", href: "/advisors/tax-agents" },
      { name: "Insurance Brokers", href: "/advisors/insurance-brokers" },
      { name: "Estate Planners", href: "/advisors/estate-planners" },
    ],
  },
  {
    title: "Advisors — Property",
    items: [
      { name: "Mortgage Brokers", href: "/advisors/mortgage-brokers" },
      { name: "Buyers Agents", href: "/advisors/buyers-agents" },
      { name: "Real Estate Agents", href: "/advisors/real-estate-agents" },
    ],
  },
  {
    title: "Advisors — Business & Investment",
    items: [
      { name: "Business Brokers", href: "/advisors/business-brokers" },
      { name: "Commercial Lawyers", href: "/advisors/commercial-lawyers" },
      { name: "Migration Agents", href: "/advisors/migration-agents" },
    ],
  },
  {
    title: "Advisors — Mining & Energy",
    items: [
      { name: "Mining Lawyers", href: "/advisors/mining-lawyers" },
      { name: "Energy Consultants", href: "/advisors/energy-consultants" },
    ],
  },
  {
    title: "Advisors — All",
    items: [
      { name: "View All Advisors", href: "/advisors" },
      { name: "Advanced Search", href: "/advisors/search" },
      { name: "Find-an-Advisor Quiz", href: "/find-advisor" },
      { name: "List Your Practice", href: "/for-advisors" },
    ],
  },
  {
    title: "Compare Platforms",
    items: [
      { name: "Compare", href: "/compare" },
      { name: "Best Platforms", href: "/best" },
      { name: "Best Broker For…", href: "/best-for" },
      { name: "ETF Hub", href: "/etfs" },
      { name: "Fee Tracker", href: "/fee-tracker" },
      { name: "Deals & Offers", href: "/deals" },
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

function InvestMegaDropdown({ isActive }: { isActive: boolean }) {
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
        Invest
        <Icon name="chevron-down" size={14} className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 z-50">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl p-5 flex gap-6" style={{ width: "720px" }}>
            {investMegaMenu.map((col) => (
              <div key={col.title} className="flex-1 min-w-0">
                <p className="text-[0.65rem] font-extrabold uppercase tracking-wider text-amber-500 mb-2 px-2">{col.title}</p>
                <div className="space-y-0.5">
                  {col.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="block px-2 py-1.5 rounded-lg hover:bg-slate-50 transition-colors group"
                    >
                      <div className="text-sm font-bold text-slate-900 group-hover:text-amber-600 transition-colors">{item.label}</div>
                      <div className="text-[0.68rem] text-slate-400 leading-tight">{item.desc}</div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
            <div className="border-l border-slate-100 pl-5 flex flex-col justify-between" style={{ minWidth: "140px" }}>
              <div>
                <p className="text-[0.65rem] font-extrabold uppercase tracking-wider text-amber-500 mb-2">Quick Links</p>
                <Link href="/invest" onClick={() => setOpen(false)} className="block text-sm font-bold text-slate-900 hover:text-amber-600 py-1 transition-colors">
                  All Verticals
                </Link>
                <Link href="/invest/listings" onClick={() => setOpen(false)} className="block text-sm font-bold text-slate-900 hover:text-amber-600 py-1 transition-colors">
                  Marketplace
                </Link>
                <Link href="/invest/gold" onClick={() => setOpen(false)} className="block text-sm font-bold text-slate-900 hover:text-amber-600 py-1 transition-colors">
                  Gold
                </Link>
                <Link href="/invest/ipos" onClick={() => setOpen(false)} className="block text-sm font-bold text-slate-900 hover:text-amber-600 py-1 transition-colors">
                  IPOs
                </Link>
                <Link href="/invest/private-equity" onClick={() => setOpen(false)} className="block text-sm font-bold text-slate-900 hover:text-amber-600 py-1 transition-colors">
                  Private Equity
                </Link>
                <Link href="/invest/list" onClick={() => setOpen(false)} className="block text-sm font-bold text-slate-900 hover:text-amber-600 py-1 transition-colors">
                  List a Listing
                </Link>
              </div>
              <Link
                href="/invest"
                onClick={() => setOpen(false)}
                className="mt-3 flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-xs px-3 py-2 rounded-lg transition-colors"
              >
                Browse All <Icon name="arrow-right" size={12} />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Advisors mega dropdown — categorised four-column layout plus an
 * "All" quick-links rail with Advanced Search. Mirrors the invest
 * mega dropdown structure so the nav feels consistent.
 */
function AdvisorsMegaDropdown({ isActive }: { isActive: boolean }) {
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
        aria-haspopup="true"
        aria-expanded={open}
      >
        Advisors
        <Icon name="chevron-down" size={14} className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      {open && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 z-50">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl p-5 flex gap-6" style={{ width: "820px" }}>
            {advisorsMegaMenu.map((col) => (
              <div key={col.title} className="flex-1 min-w-0">
                <p className="text-[0.65rem] font-extrabold uppercase tracking-wider text-amber-500 mb-2 px-2">{col.title}</p>
                <div className="space-y-0.5">
                  {col.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="block px-2 py-1.5 rounded-lg hover:bg-slate-50 transition-colors group"
                    >
                      <div className="text-sm font-bold text-slate-900 group-hover:text-amber-600 transition-colors">{item.label}</div>
                      <div className="text-[0.68rem] text-slate-400 leading-tight">{item.desc}</div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
            <div className="border-l border-slate-100 pl-5 flex flex-col justify-between" style={{ minWidth: "150px" }}>
              <div>
                <p className="text-[0.65rem] font-extrabold uppercase tracking-wider text-amber-500 mb-2">All</p>
                <Link href="/advisors" onClick={() => setOpen(false)} className="block text-sm font-bold text-slate-900 hover:text-amber-600 py-1 transition-colors">
                  View All Advisors
                </Link>
                <Link href="/advisors/search" onClick={() => setOpen(false)} className="block text-sm font-bold text-slate-900 hover:text-amber-600 py-1 transition-colors">
                  Advanced Search
                </Link>
                <Link href="/find-advisor" onClick={() => setOpen(false)} className="block text-sm font-bold text-slate-900 hover:text-amber-600 py-1 transition-colors">
                  Find-an-Advisor Quiz
                </Link>
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <p className="text-[0.6rem] uppercase tracking-wider text-slate-400 mb-1">Specialists</p>
                  <Link href="/advisors/firb-specialists" onClick={() => setOpen(false)} className="block text-xs text-slate-600 hover:text-amber-600 py-0.5 transition-colors">
                    FIRB Specialists
                  </Link>
                  <Link href="/advisors/international-tax-specialists" onClick={() => setOpen(false)} className="block text-xs text-slate-600 hover:text-amber-600 py-0.5 transition-colors">
                    International Tax
                  </Link>
                </div>
              </div>
              <Link
                href="/for-advisors"
                onClick={() => setOpen(false)}
                className="mt-3 flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-xs px-3 py-2 rounded-lg transition-colors"
              >
                List your practice <Icon name="arrow-right" size={12} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

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
  useUser();

  // Close mobile menu on route change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMenuOpen(false);
  }, [pathname]);

  const isPlatformsActive = ["/compare", "/best", "/versus", "/deals", "/reviews", "/quiz"].some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
  const isPropertyActive = ["/property", "/advisors/mortgage-brokers", "/advisors/buyers-agents", "/advisors/real-estate-agents", "/find-advisor"].some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
  // Active when the user is anywhere in the advisor directory or the
  // search / apply flows.
  const isAdvisorsActive =
    pathname === "/advisors" ||
    pathname.startsWith("/advisors/") ||
    pathname.startsWith("/advisor/") ||
    pathname.startsWith("/find-advisor") ||
    pathname.startsWith("/for-advisors");
  const isForeignActive = pathname === "/foreign-investment" || pathname.startsWith("/foreign-investment/");
  const isInvestActive = pathname === "/invest" || pathname.startsWith("/invest/");

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
            <InvestMegaDropdown isActive={isInvestActive} />
            <DesktopDropdown label="Property & Finance" items={propertyDropdown} isActive={isPropertyActive} />
            <AdvisorsMegaDropdown isActive={isAdvisorsActive} />
            <div className="h-6 w-px bg-slate-200 mx-2" />
            <DesktopDropdown label="Compare Platforms" items={platformsDropdown} isActive={isPlatformsActive} />
            <div className="h-6 w-px bg-slate-200 mx-2" />
            <DesktopDropdown label="Investing from Abroad" items={foreignDropdown} isActive={isForeignActive} />
          </nav>

          {/* Desktop CTA + Theme */}
          <div className="hidden lg:flex items-center gap-3">
            <ThemeToggle />
            <NotificationBell />
            <Link
              href="/quiz"
              className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-lg font-bold transition-all shadow-sm hover:shadow-md flex items-center gap-2 text-sm"
            >
              Start Free Match
              <Icon name="arrow-right" size={16} />
            </Link>
          </div>

          {/* Mobile: Theme + Hamburger */}
          <div className="lg:hidden flex items-center gap-1.5">
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
                href="/quiz"
                onClick={() => setMenuOpen(false)}
                className="block w-full py-3 min-h-[44px] text-center text-sm font-extrabold text-white bg-amber-500 rounded-xl hover:bg-amber-600 transition-colors"
              >
                Start Free Match
              </Link>
              <div className="flex gap-2">
                <Link
                  href="/find-advisor"
                  onClick={() => setMenuOpen(false)}
                  className="flex-1 py-2.5 min-h-[44px] flex items-center justify-center text-xs font-bold text-center text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  Find Advisor
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
