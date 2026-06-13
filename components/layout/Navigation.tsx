"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CURRENT_YEAR } from "@/lib/seo";
import { SHOW_BEST_PICKS, SHOW_MATCH_LANGUAGE, PRIMARY_CTA_TEXT, PRIMARY_CTA_HREF } from "@/lib/compliance-config";
import dynamic from "next/dynamic";
import AccountButton from "@/components/layout/AccountButton";
import { useUser } from "@/lib/hooks/useUser";
import ThemeToggle from "@/components/ThemeToggle";
import JourneyChip from "@/components/journey/JourneyChip";

const SearchOverlay = dynamic(() => import("@/components/SearchOverlay"), { ssr: false });
const LocationFlagButton = dynamic(() => import("@/components/layout/LocationFlagButton"), { ssr: false });

// ─── Mega-menu data ───────────────────────────────────────────────────────────

const platformsMenu = {
  byCategory: [
    { label: "Share Trading", href: "/share-trading", desc: "ASX & international shares" },
    { label: "ETFs", href: "/compare/etfs", desc: "Diversified index investing" },
    { label: "Super Funds", href: "/super", desc: "Compare fees & performance" },
    { label: "Savings Accounts", href: "/savings", desc: "High interest & at-call accounts" },
    { label: "Robo-Advisors", href: "/robo-advisors", desc: "Automated portfolio management" },
    { label: "Term Deposits", href: "/term-deposits", desc: "Government-guaranteed fixed rates" },
    {
      label: "Crypto Exchanges",
      href: "/crypto",
      desc: "AUSTRAC-registered platforms",
      riskLabel: "High Risk",
    },
    {
      label: "CFD & Forex",
      href: "/cfd",
      desc: "Derivatives & currency trading",
      riskLabel: "High Risk",
    },
    { label: "Non-Resident Brokers", href: "/compare/non-residents", desc: "Platforms that accept overseas investors" },
    { label: "Investing from Overseas", href: "/foreign-investment", desc: "Tax, FIRB rules & visa pathways" },
  ],
  tools: [
    ...(SHOW_BEST_PICKS ? [{ label: `Best Platforms ${CURRENT_YEAR}`, href: "/best" }] : []),
    { label: "Compare All Platforms", href: "/compare" },
    { label: "Broker vs Broker", href: "/versus" },
    { label: "Current Deals", href: "/deals" },
    ...(SHOW_MATCH_LANGUAGE ? [{ label: "Get Matched (60s)", href: "/get-matched" }] : []),
    { label: "Fee Calculator", href: "/calculators" },
    { label: "Financial Health Score", href: "/score" },
    { label: "My Wealth Stack", href: "/wealth-stack" },
    { label: "AI Concierge", href: "/concierge" },
  ],
};

// Find an advisor — three columns. The cross-border specialty pages were
// added in PR #337 and double as cross-border source-path triggers in
// app/api/advisor-enquiry/route.ts. Surfacing them in the nav makes the
// premium-pricing path discoverable, not buried.
const advisorsMenu = {
  wealth: [
    { label: "Financial Advisers Directory", href: "/advisors/financial-planners", desc: "Wealth strategy & retirement" },
    { label: "SMSF Accountants", href: "/advisors/smsf-accountants", desc: "Self-managed super specialists" },
    { label: "Tax Agents", href: "/advisors/tax-agents", desc: "Tax planning & lodgement" },
    { label: "Wealth Managers", href: "/advisors/wealth-managers", desc: "Portfolio management" },
    { label: "Full-Service Stockbrokers", href: "/brokers/full-service", desc: "Morgans, Ord Minnett, Shaw & more" },
    { label: "Insurance Brokers", href: "/advisors/insurance-brokers", desc: "Life & income protection" },
    { label: "Estate Planners", href: "/advisors/estate-planners", desc: "Wills, trusts & succession" },
  ],
  property: [
    { label: "Mortgage Brokers Directory", href: "/advisors/mortgage-brokers", desc: "Compare 30+ lenders — free" },
    { label: "Buyer's Agents", href: "/advisors/buyers-agents", desc: "Off-market access & negotiation" },
    { label: "Real Estate Agents", href: "/advisors/real-estate-agents", desc: "Selling & listing specialists" },
  ],
  crossBorder: [
    { label: "International Tax Specialists", href: "/advisors/international-tax-specialists", desc: "DTA, FATCA, FIRB, expat tax" },
    { label: "FIRB Specialists", href: "/advisors/firb-specialists", desc: "Non-resident property compliance" },
    { label: "Migration Agents", href: "/advisors/migration-agents", desc: "Visa pathways & investor visas" },
  ],
};

// Browse Opportunities — IA refactor 2026-05-07. Demoted slugs (super,
// smsf, forex, options-trading, managed-funds, dividend-investing,
// reits, bonds, hybrid-securities, crypto-staking, ipos, ipo-calendar,
// commodities) are dropped from the mega-menu. Compare-tagged ones
// 301 to canonical Compare via next.config.ts; Guide-tagged ones stay
// live but are intentionally not surfaced in primary nav. Asset-class
// education users can find via search or the Compare links below.
const listingsMenu = {
  opportunities: [
    { label: "All Opportunities", href: "/invest", desc: "Australian investment marketplace" },
    { label: "Investment Funds", href: "/invest/funds", desc: "Managed, syndicated, infrastructure, wholesale" },
    { label: "Mining & Resources", href: "/invest/mining", desc: "Iron ore, copper & critical minerals" },
    { label: "Buy a Business", href: "/invest/buy-business", desc: "SME acquisitions" },
    { label: "Franchises", href: "/invest/franchise", desc: "Food, fitness, automotive franchises" },
    { label: "Farmland & Agriculture", href: "/invest/farmland", desc: "Livestock, cropping, water" },
    { label: "Renewable Energy", href: "/invest/renewable-energy", desc: "Solar, wind, battery" },
    { label: "Startups & Tech", href: "/invest/startups", desc: "VC, angel, crowdfunding" },
    { label: "Alternatives", href: "/invest/alternatives", desc: "Wine, art, cars, watches & more" },
    { label: "Royalty Streams", href: "/invest/royalties", desc: "Mining, music, IP & oil-gas royalties" },
    { label: "Income-Asset Businesses", href: "/invest/income-assets", desc: "Vending, ATMs, self-storage" },
  ],
  property: [
    { label: "Investment Property Hub", href: "/property", desc: "Listings, suburb data, loans" },
    { label: "New Developments", href: "/property/listings", desc: "Off-the-plan apartments & houses" },
    { label: "Suburb Research", href: "/property/suburbs", desc: "Yields, growth & vacancy data" },
    { label: "Commercial Property", href: "/invest/commercial-property", desc: "Office, industrial, hotels" },
    { label: "Foreign Buyer Rules (FIRB)", href: "/property/foreign-investment", desc: "FIRB calculator & compliance" },
  ],
  privateMarkets: [
    { label: "Private Credit & P2P", href: "/invest/private-credit", desc: "La Trobe, Qualitas, Metrics" },
    { label: "Private Equity", href: "/invest/private-equity", desc: "Listed PE structures, wholesale s708" },
    { label: "Pre-IPO (Wholesale)", href: "/invest/pre-ipo", desc: "Late-stage private placements" },
    { label: "Infrastructure", href: "/invest/infrastructure", desc: "Toll roads, airports, utilities" },
  ],
  sectorHubs: [
    { label: "Oil & Gas", href: "/invest/oil-gas", desc: "ASX majors, LNG, refineries" },
    { label: "Uranium", href: "/invest/uranium", desc: "Paladin, Boss Energy, ATOM ETF" },
    { label: "Lithium", href: "/invest/lithium", desc: "Pilbara producers & processing" },
    { label: "Hydrogen", href: "/invest/hydrogen", desc: "Green H2, fuel cells & HGEN ETF" },
    { label: "Gold & Precious Metals", href: "/invest/gold", desc: "Perth Mint, ETFs & ASX miners" },
    { label: "FIRB-Eligible Only", href: "/invest?firb=true", desc: "Foreign-investor relevant deals" },
    { label: "List an Opportunity →", href: "/invest/list", desc: "Post a deal to the marketplace" },
    { label: "Become a Sponsor →", href: "/advertise", desc: "Featured placement, disclosed" },
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
    { label: "Investing Basics", href: "/articles?category=beginners" },
    { label: "Tax Strategy Hub", href: "/tax" },
    { label: "Tax Return Guide", href: "/tax-return" },
    { label: "Insurance Hub", href: "/insurance" },
    { label: "Global Investing Hub", href: "/global-investing" },
    { label: "Life Event Checklists", href: "/just" },
    { label: "Property Investing", href: "/articles?category=property" },
    { label: "Crypto & Digital Assets", href: "/articles?category=crypto" },
  ],
  resources: [
    { label: "Investing by Occupation", href: "/investing-for" },
    { label: "Marketplace (Find a Provider)", href: "/marketplace" },
    { label: "All Articles", href: "/articles" },
    { label: "How-To Guides", href: "/how-to" },
    { label: "Glossary", href: "/glossary" },
    { label: "Community Forum", href: "/community" },
    { label: "Annual Report", href: "/reports/annual" },
    { label: "Write a Review", href: "/reviews/write" },
  ],
};

// ─── Mega-menu dropdown component ────────────────────────────────────────────

function MegaMenuDropdown({
  label,
  children,
  isActive,
  menuWidth = "min-w-140",
}: {
  label: string;
  children: React.ReactNode;
  isActive?: boolean;
  menuWidth?: string;
}) {
  const [open, setOpen] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const enter = useCallback(() => {
    clearTimeout(timeout.current);
    setOpen(true);
  }, []);

  const leave = useCallback(() => {
    timeout.current = setTimeout(() => setOpen(false), 120);
  }, []);

  // Keyboard users must be able to dismiss the dropdown (WCAG 2.1.1).
  // Escape closes it and returns focus to the trigger button.
  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      setOpen(false);
      triggerRef.current?.focus();
    }
  }, []);

  // Close when focus leaves the menu entirely (Tab past the last item).
  // relatedTarget is the element receiving focus; if it's outside this
  // wrapper, the menu has been tabbed out of and should collapse.
  const onBlur = useCallback((e: React.FocusEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
      setOpen(false);
    }
  }, []);

  useEffect(() => () => clearTimeout(timeout.current), []);

  // Close on Escape and return focus to the trigger button
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={enter}
      onMouseLeave={leave}
      onKeyDown={onKeyDown}
      onBlur={onBlur}
    >
      <button
        ref={triggerRef}
        onClick={() => setOpen((v) => !v)}
        // whitespace-nowrap prevents multi-word labels ("Find an advisor",
        // "Compare platforms", "Browse listings", "Post a job") from breaking
        // onto two lines when the flex parent runs out of horizontal room.
        // Without it, narrow viewports (1024-1180px) showed stacked words.
        // Tightened px-3 → px-2.5 + parent gap-1 → gap-0.5 to claw back
        // ~30px across the 6-item row on narrow screens.
        className={`flex items-center gap-1 px-2.5 py-2 text-[0.8125rem] font-semibold rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 whitespace-nowrap
          ${isActive
            ? "text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-800"
            : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800"
          }`}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {label}
        <svg
          className={`w-3 h-3 text-slate-500 dark:text-slate-500 transition-transform duration-200 shrink-0 ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className={`absolute left-0 top-full pt-2 z-50 ${menuWidth}`}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl shadow-slate-200/60 dark:shadow-slate-900/80 overflow-hidden">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Mobile menu — collapsed to 3 sections ───────────────────────────────────

// Mobile sections — mirror the desktop four-ways order:
//   Compare platforms · Find an advisor · Post a job · Browse listings · Tools · Learn
const mobileSections = [
  {
    title: "Compare platforms",
    items: [
      { name: "Compare All Platforms", href: "/compare" },
      { name: "Share Trading", href: "/share-trading" },
      { name: "ETFs", href: "/compare/etfs" },
      { name: "Super Funds", href: "/super" },
      { name: "Crypto Exchanges", href: "/crypto" },
      { name: "Savings Accounts", href: "/savings" },
      { name: "Robo-Advisors", href: "/robo-advisors" },
      { name: "Term Deposits", href: "/term-deposits" },
      { name: "CFD & Forex", href: "/cfd" },
      { name: "Non-Resident Brokers", href: "/compare/non-residents" },
      { name: "Deals & Offers", href: "/deals" },
      { name: "Investing from Overseas", href: "/foreign-investment" },
    ],
  },
  {
    title: "Find an advisor",
    items: [
      { name: "All Advisors Directory", href: "/advisors" },
      { name: "Financial Advisers", href: "/advisors/financial-planners" },
      { name: "SMSF Accountants", href: "/advisors/smsf-accountants" },
      { name: "Tax Agents", href: "/advisors/tax-agents" },
      { name: "Mortgage Brokers", href: "/advisors/mortgage-brokers" },
      { name: "Buyer's Agents", href: "/advisors/buyers-agents" },
      { name: "Real Estate Agents", href: "/advisors/real-estate-agents" },
      { name: "Wealth Managers", href: "/advisors/wealth-managers" },
      { name: "Insurance Brokers", href: "/advisors/insurance-brokers" },
      { name: "Estate Planners", href: "/advisors/estate-planners" },
      { name: "International Tax Specialists", href: "/advisors/international-tax-specialists" },
      { name: "FIRB Specialists", href: "/advisors/firb-specialists" },
      { name: "Migration Agents", href: "/advisors/migration-agents" },
      { name: "List Your Practice →", href: "/for-advisors" },
      { name: "List Your Courses →", href: "/for-providers" },
    ],
  },
  {
    title: "Post a Request",
    items: [
      { name: "Post a request — free", href: "/quotes/post" },
      { name: "See active requests", href: "/quotes" },
      { name: "Recent wins", href: "/quotes/recent-wins" },
    ],
  },
  {
    title: "Marketplace",
    items: [
      { name: "All Opportunities", href: "/invest" },
      { name: "Investment Funds", href: "/invest/funds" },
      { name: "Mining & Resources", href: "/invest/mining" },
      { name: "Oil & Gas (sector hub)", href: "/invest/oil-gas" },
      { name: "Uranium (sector hub)", href: "/invest/uranium" },
      { name: "Lithium (sector hub)", href: "/invest/lithium" },
      { name: "Hydrogen (sector hub)", href: "/invest/hydrogen" },
      { name: "Gold & Precious Metals (sector hub)", href: "/invest/gold" },
      { name: "Renewable Energy", href: "/invest/renewable-energy" },
      { name: "Buy a Business", href: "/invest/buy-business" },
      { name: "Franchises", href: "/invest/franchise" },
      { name: "Farmland & Agriculture", href: "/invest/farmland" },
      { name: "Startups & Tech", href: "/invest/startups" },
      { name: "Infrastructure", href: "/invest/infrastructure" },
      { name: "Investment Property Hub", href: "/property" },
      { name: "New Developments", href: "/property/listings" },
      { name: "Suburb Research", href: "/property/suburbs" },
      { name: "Commercial Property", href: "/invest/commercial-property" },
      { name: "Foreign Buyer Rules (FIRB)", href: "/property/foreign-investment" },
      { name: "Private Credit & P2P", href: "/invest/private-credit" },
      { name: "Alternatives", href: "/invest/alternatives" },
      { name: "Private Equity", href: "/invest/private-equity" },
      { name: "Pre-IPO (Wholesale)", href: "/invest/pre-ipo" },
      { name: "Royalty Streams", href: "/invest/royalties" },
      { name: "Income-Asset Businesses", href: "/invest/income-assets" },
      { name: "List an Opportunity →", href: "/invest/list" },
      { name: "Become a Sponsor →", href: "/advertise" },
    ],
  },
  {
    title: "Tools & Calculators",
    items: [
      { name: "Financial Health Score", href: "/score" },
      { name: "My Wealth Stack", href: "/wealth-stack" },
      { name: "AI Concierge", href: "/concierge" },
      { name: "Quick Audit (30s)", href: "/quick-audit" },
      { name: "Switching Calculator", href: "/switching-calculator" },
      { name: "Fee Simulator", href: "/fee-simulator" },
      { name: "Portfolio X-Ray", href: "/portfolio-xray" },
      { name: "Tax Optimizer", href: "/tax-optimizer" },
      { name: "Trade Cost Calculator", href: "/trade-cost-calculator" },
      { name: "US Share Costs", href: "/us-share-costs-calculator" },
      { name: "CGT Calculator", href: "/cgt-calculator" },
      { name: "Franking Credits", href: "/franking-credits-calculator" },
      { name: "Mortgage Calculator", href: "/mortgage-calculator" },
      { name: "Retirement Calculator", href: "/retirement-calculator" },
      { name: "All Calculators (25)", href: "/calculators" },
      { name: "CHESS Lookup", href: "/chess-lookup" },
      { name: "Fee Alerts", href: "/fee-alerts" },
      { name: "Embed Widgets", href: "/embed" },
    ],
  },
  {
    title: "Learn & Community",
    items: [
      { name: "Life Event Checklists", href: "/just" },
      { name: "Investing by Occupation", href: "/investing-for" },
      { name: "Marketplace (Find a Provider)", href: "/marketplace" },
      { name: "Tax Strategy Hub", href: "/tax" },
      { name: "Tax Return Guide", href: "/tax-return" },
      { name: "Retirement Hub", href: "/retirement" },
      { name: "Aged Care Hub", href: "/aged-care" },
      { name: "Insurance Hub", href: "/insurance" },
      { name: "Home Loans Hub", href: "/home-loans" },
      { name: "Global Investing Hub", href: "/global-investing" },
      { name: "Investment Confessions", href: "/community/confessions" },
      { name: "Articles & Guides", href: "/articles" },
      { name: "How-To Guides", href: "/how-to" },
      { name: "Glossary", href: "/glossary" },
      { name: "Community Forum", href: "/community" },
      { name: "Annual Report", href: "/reports/annual" },
      { name: "Write a Review", href: "/reviews/write" },
    ],
  },
];

// Separate sections for logged-out vs logged-in users
const mobileAccountSectionLoggedOut = {
  title: "Account",
  items: [
    { name: "Sign In", href: "/auth/login" },
    { name: "Create Account", href: "/auth/signup" },
    { name: "Fee Alerts", href: "/fee-alerts" },
  ],
};

const mobileAccountSectionLoggedIn = {
  title: "My Account",
  items: [
    { name: "My Account", href: "/account" },
    { name: "Saved Comparisons", href: "/account/saved" },
    { name: "My Shortlist", href: "/shortlist" },
    { name: "Edit Profile", href: "/account/profile" },
    { name: "Refer a Friend", href: "/account/referrals" },
    { name: "Fee Alerts", href: "/fee-alerts" },
  ],
};

// ─── Main Navigation ──────────────────────────────────────────────────────────

export function Navigation() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const pathname = usePathname();
  const { user } = useUser();

  // Build mobile menu sections — swap the account section based on login state
  const currentMobileSections = [
    ...mobileSections,
    user ? mobileAccountSectionLoggedIn : mobileAccountSectionLoggedOut,
  ];

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  // Listen for Cmd/Ctrl+K event dispatched by SearchOverlay when it's not yet open
  useEffect(() => {
    const handler = () => setSearchOpen(true);
    window.addEventListener("invest:search:open", handler);
    return () => window.removeEventListener("invest:search:open", handler);
  }, []);

  const isPlatformsActive = ["/compare", "/best", "/versus", "/deals", "/broker"].some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
  // Find an advisor — covers the directory, profile pages, and the dedicated
  // specialist landing pages that double as cross-border source-path triggers
  // (international-tax-specialists / firb-specialists / migration-agents).
  const isAdvisorsActive = ["/advisors", "/find-advisor", "/advisor/"].some(
    (p) => pathname === p || pathname.startsWith(p)
  );
  // Post-a-job + Tools active-state checks were removed in v5 — both
  // mega-menus dropped from the top nav. The "Get matched" right-side CTA
  // covers /quotes; calculators are accessed in-context from /calculators
  // and elsewhere.
  const isLearnActive = ["/articles", "/article/", "/how-to", "/glossary", "/community", "/reports", "/reviews/write"].some(
    (p) => pathname === p || pathname.startsWith(p)
  );
  // Browse listings — covers /invest/* sectors AND /property/* (property
  // dissolved as a top-level; listings half lives here, professionals half
  // moved to Find an advisor).
  const isListingsActive = pathname.startsWith("/invest") || pathname.startsWith("/property");

  return (
    <>
    <header className="sticky top-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-slate-900/50">
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
          <nav className="hidden lg:flex items-center gap-0.5" aria-label="Main navigation">

            {/* ─── 1. Compare Platforms ────────────────────────────────────────── */}
            <MegaMenuDropdown label="Compare" isActive={isPlatformsActive} menuWidth="min-w-[560px]">
              <div className="p-6">
                <div className="mb-4">
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Brokers, super, crypto, savings, robo &mdash; fees side-by-side, verified monthly. <span className="font-semibold text-slate-700">80 platforms.</span>
                  </p>
                </div>
                <Link
                  href={PRIMARY_CTA_HREF}
                  className="flex items-center justify-between p-3.5 bg-gradient-to-r from-amber-50 to-amber-100/60 border border-amber-200 rounded-xl mb-5 hover:border-amber-300 transition-colors group"
                >
                  <div>
                    <p className="font-bold text-slate-900 text-sm">Not sure where to start?</p>
                    <p className="text-xs text-slate-500 mt-0.5">Filter platforms by your preferences &mdash; 60 seconds</p>
                  </div>
                  <svg className="w-5 h-5 text-amber-600 shrink-0 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-wider mb-3">By Category</p>
                    <div className="space-y-0.5">
                      {platformsMenu.byCategory.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          className="block px-3 py-2 rounded-lg hover:bg-amber-50 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-800">{item.label}</span>
                            {item.riskLabel && (
                              <span className="text-[0.58rem] font-bold px-1.5 py-0.5 bg-red-50 text-red-600 rounded-full border border-red-100 uppercase tracking-wide">
                                {item.riskLabel}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500">{item.desc}</div>
                        </Link>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-wider mb-3">Tools & Lists</p>
                    <div className="space-y-0.5">
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
              </div>
            </MegaMenuDropdown>

            {/* ─── 2. Find an advisor ──────────────────────────────────────────── */}
            <MegaMenuDropdown label="Experts" isActive={isAdvisorsActive} menuWidth="min-w-[760px]">
              <div className="p-6">
                <div className="mb-4">
                  <p className="text-xs text-slate-500 leading-relaxed">
                    ASIC-registered. Browse 30+ specialties &mdash; planners, mortgage brokers, accountants. <span className="font-semibold text-slate-700">167 advisors.</span>
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-5">
                  <Link
                    href="/advisors"
                    className="flex items-center justify-between p-3.5 bg-gradient-to-r from-amber-50 to-amber-100/60 border border-amber-200 rounded-xl hover:border-amber-300 transition-colors group"
                  >
                    <div>
                      <p className="font-bold text-slate-900 text-sm">Browse all advisors</p>
                      <p className="text-xs text-slate-500 mt-0.5">Search by location &amp; specialty</p>
                    </div>
                    <svg className="w-5 h-5 text-amber-600 shrink-0 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                  {/* Cross-link to the reverse-marketplace flow. Sits next to
                      "Browse all advisors" so the visitor sees both modes
                      side-by-side at the moment of intent — browse profiles
                      vs have advisors come to them. Emerald to match the
                      Post-a-job homepage card and the dedicated Post a job
                      mega-menu styling, signalling "this is a different
                      product, not a sub-feature of advisor browsing." */}
                  <Link
                    href="/quotes/post"
                    className="flex items-center justify-between p-3.5 bg-gradient-to-r from-emerald-50 to-emerald-100/60 border border-emerald-200 rounded-xl hover:border-emerald-300 transition-colors group"
                  >
                    <div>
                      <p className="font-bold text-slate-900 text-sm">Or have them come to you</p>
                      <p className="text-xs text-slate-500 mt-0.5">Post a Request &mdash; free, quotes in 24h</p>
                    </div>
                    <svg className="w-5 h-5 text-emerald-600 shrink-0 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>

                <div className="grid grid-cols-3 gap-5">
                  <div>
                    <p className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-wider mb-3">Wealth & Tax</p>
                    <div className="space-y-0.5">
                      {advisorsMenu.wealth.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          className="block px-2 py-1.5 rounded-lg hover:bg-amber-50 transition-colors"
                        >
                          <div className="text-[0.8rem] font-semibold text-slate-800">{item.label}</div>
                          <div className="text-[0.65rem] text-slate-500 leading-tight">{item.desc}</div>
                        </Link>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-wider mb-3">Property</p>
                    <div className="space-y-0.5">
                      {advisorsMenu.property.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          className="block px-2 py-1.5 rounded-lg hover:bg-amber-50 transition-colors"
                        >
                          <div className="text-[0.8rem] font-semibold text-slate-800">{item.label}</div>
                          <div className="text-[0.65rem] text-slate-500 leading-tight">{item.desc}</div>
                        </Link>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-wider mb-3">Cross-border</p>
                    <div className="space-y-0.5">
                      {advisorsMenu.crossBorder.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          className="block px-2 py-1.5 rounded-lg hover:bg-amber-50 transition-colors"
                        >
                          <div className="text-[0.8rem] font-semibold text-slate-800">{item.label}</div>
                          <div className="text-[0.65rem] text-slate-500 leading-tight">{item.desc}</div>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </MegaMenuDropdown>

            {/* "Post a job" was removed in the v5 redesign — the "Get matched"
                CTA on the right side of the nav is now the canonical entry to
                the reverse-marketplace flow. The Find an advisor mega-menu
                also has a side-by-side "Or have them come to you →" cross-link
                to /quotes/post for visitors who land on Experts first. */}

            {/* ─── 4. Browse Opportunities ─────────────────────────────────────── */}
            <MegaMenuDropdown label="Marketplace" isActive={isListingsActive} menuWidth="min-w-[800px]">
              <div className="p-5">
                <Link
                  href="/invest"
                  className="flex items-center justify-between p-3 bg-gradient-to-r from-amber-50 to-amber-100/60 border border-amber-200 rounded-xl mb-4 hover:border-amber-300 transition-colors group"
                >
                  <div>
                    <p className="font-bold text-slate-900 text-sm">Browse the full opportunities marketplace</p>
                    <p className="text-xs text-slate-500 mt-0.5">Every active deal across opportunity verticals &mdash; filterable in one place</p>
                  </div>
                  <svg className="w-5 h-5 text-amber-600 shrink-0 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>

                <div className="grid grid-cols-4 gap-5">
                  <div>
                    <p className="text-[0.60rem] font-bold text-amber-500 uppercase tracking-wider mb-2">Browse opportunities</p>
                    <div className="space-y-0.5">
                      {listingsMenu.opportunities.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          className="block px-2 py-1.5 rounded-lg hover:bg-amber-50 transition-colors"
                        >
                          <div className="text-[0.8rem] font-semibold text-slate-800">{item.label}</div>
                          <div className="text-[0.65rem] text-slate-500 leading-tight">{item.desc}</div>
                        </Link>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[0.60rem] font-bold text-amber-500 uppercase tracking-wider mb-2">Property</p>
                    <div className="space-y-0.5">
                      {listingsMenu.property.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          className="block px-2 py-1.5 rounded-lg hover:bg-amber-50 transition-colors"
                        >
                          <div className="text-[0.8rem] font-semibold text-slate-800">{item.label}</div>
                          <div className="text-[0.65rem] text-slate-500 leading-tight">{item.desc}</div>
                        </Link>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[0.60rem] font-bold text-amber-500 uppercase tracking-wider mb-2">Private &amp; alternatives</p>
                    <div className="space-y-0.5">
                      {listingsMenu.privateMarkets.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          className="block px-2 py-1.5 rounded-lg hover:bg-amber-50 transition-colors"
                        >
                          <div className="text-[0.8rem] font-semibold text-slate-800">{item.label}</div>
                          <div className="text-[0.65rem] text-slate-500 leading-tight">{item.desc}</div>
                        </Link>
                      ))}
                    </div>
                  </div>
                  <div className="border-l border-slate-100 pl-4">
                    <p className="text-[0.60rem] font-bold text-amber-500 uppercase tracking-wider mb-2">Sector hubs &amp; supply</p>
                    <div className="space-y-0.5">
                      {listingsMenu.sectorHubs.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          className="block px-2 py-1.5 text-[0.8rem] text-slate-700 hover:bg-amber-50 hover:text-amber-900 rounded-lg transition-colors"
                        >
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </MegaMenuDropdown>

            {/* "Tools" was removed as a top-level mega-menu in v5 — the four
                top-level slots are reserved for Compare / Listings / Experts /
                Learn. Calculators and tools remain accessible via /calculators
                directly and via in-context links from comparison + sector
                pillar pages. */}

            {/* Learn Mega-Menu */}
            <MegaMenuDropdown label="Learn" isActive={isLearnActive} menuWidth="min-w-[540px]">
              <div className="grid grid-cols-3 gap-0 p-6">
                <div>
                  <p className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-wider mb-3">Popular Guides</p>
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
                  <p className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-wider mb-3">By Topic</p>
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
                  <p className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-wider mb-3">Resources</p>
                  <div className="space-y-1">
                    {learnMenu.resources.map((item) => (
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

          {/* Desktop CTA area */}
          <div className="hidden lg:flex items-center gap-2">
            <JourneyChip />
            <LocationFlagButton />
            <ThemeToggle />
            <button
              onClick={() => setSearchOpen(true)}
              className="p-2.5 rounded-xl text-slate-500 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              aria-label="Search"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            <AccountButton />
            <Link
              href="/get-matched"
              className="bg-gradient-to-br from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:from-amber-700 active:to-orange-700 text-slate-900 px-4 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm hover:shadow-md active:scale-[0.97] inline-flex items-center gap-2 cursor-pointer"
            >
              {SHOW_MATCH_LANGUAGE ? "Get matched" : "Take the quiz"}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {/* Mobile buttons */}
          <div className="lg:hidden flex items-center gap-1.5">
            <ThemeToggle />
            <button
              onClick={() => setSearchOpen(true)}
              className="p-2 min-w-11 min-h-11 flex items-center justify-center text-slate-500 dark:text-slate-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Search"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            <Link
              href="/get-matched"
              className="bg-gradient-to-br from-amber-500 to-orange-500 text-slate-900 px-4 py-2 rounded-lg text-xs font-bold transition-all hover:from-amber-600 hover:to-orange-600 min-h-11 inline-flex items-center cursor-pointer"
            >
              {SHOW_MATCH_LANGUAGE ? "Get Matched" : "Take the quiz"}
            </Link>
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="p-2 min-w-11 min-h-11 flex items-center justify-center text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
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

      {/* Mobile slide-down menu — 3 sections */}
      {mobileOpen && (
        <div
          id="mobile-menu"
          className="lg:hidden border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 max-h-[85vh] overflow-y-auto"
          aria-label="Mobile navigation"
        >
          <nav className="max-w-7xl mx-auto px-4 sm:px-6 py-4 space-y-0.5">
            {currentMobileSections.map((section, si) => (
              <div key={section.title} className={si > 0 ? "border-t border-slate-100 dark:border-slate-700 pt-3 mt-1" : ""}>
                <p className="px-3 pb-1 text-[0.6rem] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-500">
                  {section.title}
                </p>
                {section.items.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center justify-between px-3 py-3 min-h-12 rounded-xl text-sm font-medium transition-colors ${
                        active
                          ? "bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 font-bold"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
                      }`}
                      {...(active ? { "aria-current": "page" as const } : {})}
                    >
                      {item.name}
                      <svg className="w-4 h-4 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  );
                })}
              </div>
            ))}

            {/* Single full-width CTA */}
            <div className="border-t border-slate-100 dark:border-slate-700 pt-4 mt-2 pb-2">
              <Link
                href={PRIMARY_CTA_HREF}
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-center w-full py-3.5 min-h-13 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold text-sm rounded-xl transition-colors"
              >
                {PRIMARY_CTA_TEXT} &rarr;
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>

      {/* Search overlay */}
      <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
