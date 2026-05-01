"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CURRENT_YEAR } from "@/lib/seo";
import { SHOW_BEST_PICKS, SHOW_MATCH_LANGUAGE, PRIMARY_CTA_TEXT, PRIMARY_CTA_HREF } from "@/lib/compliance-config";
import dynamic from "next/dynamic";
import AccountButton from "@/components/layout/AccountButton";
import { useUser } from "@/lib/hooks/useUser";

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
    ...(SHOW_MATCH_LANGUAGE ? [{ label: "Platform Quiz (60s)", href: "/quiz" }] : []),
    { label: "Fee Calculator", href: "/calculators" },
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

// Post a job — keep the dropdown small. The reverse marketplace doesn't need a
// sprawling mega-menu; the primary action is "Post a brief", everything else
// is supporting context.
const postAJobMenu = {
  primary: { label: "Post a brief — free", href: "/quotes/post", desc: "60 seconds, no email needed to start" },
  supporting: [
    { label: "See active jobs", href: "/quotes", desc: "Recent briefs from Australian investors" },
    { label: "Recent wins", href: "/quotes/recent-wins", desc: "How others used the marketplace" },
  ],
};

// Browse listings — combines the old `opportunitiesMenu` (sectors / markets /
// income / tools) with property listings split out from the deleted
// `propertyMenu`. Property professionals (mortgage brokers, buyer's agents)
// moved to `advisorsMenu.property` instead.
const listingsMenu = {
  sectors: [
    { label: "Investment Funds", href: "/invest/funds", desc: "Managed, syndicated, infrastructure, wholesale" },
    { label: "Mining & Resources", href: "/invest/mining", desc: "Iron ore, copper & critical minerals" },
    { label: "Oil & Gas", href: "/invest/oil-gas", desc: "ASX majors, LNG, refineries" },
    { label: "Uranium", href: "/invest/uranium", desc: "Paladin, Boss Energy, ATOM ETF" },
    { label: "Lithium", href: "/invest/lithium", desc: "Pilbara producers & processing" },
    { label: "Hydrogen", href: "/invest/hydrogen", desc: "Green H2, fuel cells & HGEN ETF" },
    { label: "Gold & Precious Metals", href: "/invest/gold", desc: "Perth Mint, ETFs & ASX miners" },
    { label: "Renewable Energy", href: "/invest/renewable-energy", desc: "Solar, wind, battery" },
    { label: "Buy a Business", href: "/invest/buy-business", desc: "SME acquisitions" },
    { label: "Farmland & Agriculture", href: "/invest/farmland", desc: "Livestock, cropping, water" },
    { label: "Startups & Tech", href: "/invest/startups", desc: "VC, angel, crowdfunding" },
    { label: "Infrastructure", href: "/invest/infrastructure", desc: "Toll roads, airports, utilities" },
  ],
  property: [
    { label: "Investment Property Hub", href: "/property", desc: "Listings, suburb data, loans" },
    { label: "New Developments", href: "/property/listings", desc: "Off-the-plan apartments & houses" },
    { label: "Suburb Research", href: "/property/suburbs", desc: "Yields, growth & vacancy data" },
    { label: "Commercial Property", href: "/invest/commercial-property", desc: "Office, industrial, hotels" },
    { label: "Foreign Buyer Rules (FIRB)", href: "/property/foreign-investment", desc: "FIRB calculator & compliance" },
  ],
  marketsIncome: [
    { label: "Managed & Index Funds", href: "/invest/managed-funds", desc: "Vanguard, Betashares, iShares" },
    { label: "Dividend Investing", href: "/invest/dividend-investing", desc: "Franking credits & high-yield ASX" },
    { label: "A-REITs", href: "/invest/reits", desc: "ASX-listed property trusts" },
    { label: "Private Credit & P2P", href: "/invest/private-credit", desc: "La Trobe, Qualitas, Metrics" },
    { label: "Bonds & Fixed Income", href: "/invest/bonds", desc: "Government & corporate bonds" },
    { label: "Hybrid Securities", href: "/invest/hybrid-securities", desc: "Bank hybrids & APRA phase-out" },
    { label: "Alternatives", href: "/invest/alternatives", desc: "Wine, art, cars, watches & more" },
    { label: "Crypto Staking & DeFi", href: "/invest/crypto-staking", desc: "Staking, DeFi & crypto ETFs" },
    { label: "SMSF Investment Guide", href: "/invest/smsf", desc: "What SMSFs invest in & how" },
  ],
  tools: [
    // /invest IS the marketplace now (was the old /invest/listings before
    // pre-launch consolidation). Single canonical link, no redundant
    // "browse all" + "marketplace" entries.
    { label: "Investment Marketplace", href: "/invest" },
    { label: "Private Equity", href: "/invest/private-equity" },
    { label: "Options & Derivatives", href: "/invest/options-trading" },
    { label: "Forex Trading", href: "/invest/forex" },
    { label: "Commodities", href: "/invest/commodities" },
    { label: "IPO Calendar", href: "/invest/ipos" },
    { label: "FIRB-Eligible Only", href: "/invest?firb=true" },
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
    { label: "Tax & Super", href: "/articles?category=tax" },
    { label: "Property Investing", href: "/articles?category=property" },
    { label: "Crypto & Digital Assets", href: "/articles?category=crypto" },
  ],
  resources: [
    { label: "All Articles", href: "/articles" },
    { label: "How-To Guides", href: "/how-to" },
    { label: "Glossary", href: "/glossary" },
    { label: "Community Forum", href: "/community" },
    { label: "Annual Report", href: "/reports/annual" },
    { label: "Write a Review", href: "/reviews/write" },
  ],
};

// ─── Tools & Calculators mega-menu (NEW) ─────────────────────────────────────
const toolsMenu = {
  feeTools: [
    { label: "Quick Audit", href: "/quick-audit", desc: "30-second fee snapshot", badge: "NEW" },
    { label: "Switching Calculator", href: "/switching-calculator", desc: "How much could you save?" },
    { label: "Fee Simulator", href: "/fee-simulator", desc: "Real-time across all brokers", badge: "NEW" },
    { label: "Trade Cost Calculator", href: "/trade-cost-calculator", desc: "What does a trade really cost?" },
    { label: "US Share Costs", href: "/us-share-costs-calculator", desc: "Brokerage + FX hidden fees" },
    { label: "All Calculators (25)", href: "/calculators", desc: "Browse the full collection" },
  ],
  portfolioTax: [
    { label: "Portfolio X-Ray", href: "/portfolio-xray", desc: "Diversification + concentration", badge: "NEW" },
    { label: "Tax Optimizer", href: "/tax-optimizer", desc: "CGT, harvesting & franking", badge: "NEW" },
    { label: "CGT Calculator", href: "/cgt-calculator", desc: "Capital gains tax estimate" },
    { label: "Franking Credits", href: "/franking-credits-calculator", desc: "Dividend tax + grossing-up" },
    { label: "Compound Interest", href: "/compound-interest-calculator", desc: "Project investment growth" },
    { label: "FIRE Calculator", href: "/fire-calculator", desc: "Financial independence number" },
  ],
  property: [
    { label: "Mortgage Calculator", href: "/mortgage-calculator", desc: "Repayments & interest" },
    { label: "Property Yield", href: "/property-yield-calculator", desc: "Gross & net rental yield" },
    { label: "Property vs Shares", href: "/property-vs-shares-calculator", desc: "Compare returns" },
    { label: "Retirement Calculator", href: "/retirement-calculator", desc: "Project your super" },
    { label: "SMSF Calculator", href: "/smsf-calculator", desc: "Is SMSF worth it?" },
    { label: "CHESS Lookup", href: "/chess-lookup", desc: "Is your broker safe?" },
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
        // whitespace-nowrap prevents multi-word labels ("Find an advisor",
        // "Compare platforms", "Browse listings", "Post a job") from breaking
        // onto two lines when the flex parent runs out of horizontal room.
        // Without it, narrow viewports (1024-1180px) showed stacked words.
        // Tightened px-3 → px-2.5 + parent gap-1 → gap-0.5 to claw back
        // ~30px across the 6-item row on narrow screens.
        className={`flex items-center gap-1 px-2.5 py-2 text-[0.8125rem] font-semibold rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 whitespace-nowrap
          ${isActive
            ? "text-slate-900 bg-slate-50"
            : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {label}
        <svg
          className={`w-3 h-3 text-slate-500 transition-transform duration-200 shrink-0 ${open ? "rotate-180" : ""}`}
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
          className={`absolute left-0 top-full pt-2 z-50 ${menuWidth}`}
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
    ],
  },
  {
    title: "Post a job",
    items: [
      { name: "Post a brief — free", href: "/quotes/post" },
      { name: "See active jobs", href: "/quotes" },
      { name: "Recent wins", href: "/quotes/recent-wins" },
    ],
  },
  {
    title: "Browse listings",
    items: [
      { name: "Investment Marketplace", href: "/invest" },
      { name: "Investment Funds", href: "/invest/funds" },
      { name: "Mining & Resources", href: "/invest/mining" },
      { name: "Oil & Gas", href: "/invest/oil-gas" },
      { name: "Uranium", href: "/invest/uranium" },
      { name: "Lithium", href: "/invest/lithium" },
      { name: "Hydrogen", href: "/invest/hydrogen" },
      { name: "Gold & Precious Metals", href: "/invest/gold" },
      { name: "Renewable Energy", href: "/invest/renewable-energy" },
      { name: "Buy a Business", href: "/invest/buy-business" },
      { name: "Farmland & Agriculture", href: "/invest/farmland" },
      { name: "Startups & Tech", href: "/invest/startups" },
      { name: "Infrastructure", href: "/invest/infrastructure" },
      { name: "Investment Property Hub", href: "/property" },
      { name: "New Developments", href: "/property/listings" },
      { name: "Suburb Research", href: "/property/suburbs" },
      { name: "Commercial Property", href: "/invest/commercial-property" },
      { name: "Foreign Buyer Rules (FIRB)", href: "/property/foreign-investment" },
      { name: "Managed & Index Funds", href: "/invest/managed-funds" },
      { name: "Dividend Investing", href: "/invest/dividend-investing" },
      { name: "A-REITs", href: "/invest/reits" },
      { name: "Private Credit & P2P", href: "/invest/private-credit" },
      { name: "Bonds & Fixed Income", href: "/invest/bonds" },
      { name: "Hybrid Securities", href: "/invest/hybrid-securities" },
      { name: "Alternatives", href: "/invest/alternatives" },
      { name: "Crypto Staking & DeFi", href: "/invest/crypto-staking" },
      { name: "SMSF Investment Guide", href: "/invest/smsf" },
      { name: "Options & Derivatives", href: "/invest/options-trading" },
      { name: "Forex Trading", href: "/invest/forex" },
      { name: "Private Equity", href: "/invest/private-equity" },
      { name: "IPO Calendar", href: "/invest/ipos" },
    ],
  },
  {
    title: "Tools & Calculators",
    items: [
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
    ],
  },
  {
    title: "Learn & Community",
    items: [
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

  const isPlatformsActive = ["/compare", "/best", "/versus", "/deals", "/broker"].some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
  // Find an advisor — covers the directory, profile pages, and the dedicated
  // specialist landing pages that double as cross-border source-path triggers
  // (international-tax-specialists / firb-specialists / migration-agents).
  const isAdvisorsActive = ["/advisors", "/find-advisor", "/advisor/"].some(
    (p) => pathname === p || pathname.startsWith(p)
  );
  // Post a job — the quotes reverse-marketplace surface.
  const isPostAJobActive = pathname.startsWith("/quotes");
  const isLearnActive = ["/articles", "/article/", "/how-to", "/glossary", "/community", "/reports", "/reviews/write"].some(
    (p) => pathname === p || pathname.startsWith(p)
  );
  const isToolsActive = [
    "/calculators",
    "/quick-audit",
    "/portfolio-xray",
    "/tax-optimizer",
    "/fee-simulator",
    "/switching-calculator",
    "/trade-cost-calculator",
    "/us-share-costs-calculator",
    "/cgt-calculator",
    "/franking-credits-calculator",
    "/chess-lookup",
    "/mortgage-calculator",
    "/retirement-calculator",
    "/property-yield-calculator",
    "/property-vs-shares-calculator",
    "/smsf-calculator",
    "/compound-interest-calculator",
    "/fire-calculator",
    "/dividend-reinvestment-calculator",
    "/tco-calculator",
    "/savings-calculator",
    "/super-contributions-calculator",
    "/debt-calculator",
  ].some((p) => pathname === p || pathname.startsWith(p));
  // Browse listings — covers /invest/* sectors AND /property/* (property
  // dissolved as a top-level; listings half lives here, professionals half
  // moved to Find an advisor).
  const isListingsActive = pathname.startsWith("/invest") || pathname.startsWith("/property");

  return (
    <>
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-200 shadow-sm">
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
            <MegaMenuDropdown label="Compare platforms" isActive={isPlatformsActive} menuWidth="min-w-[560px]">
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
            <MegaMenuDropdown label="Find an advisor" isActive={isAdvisorsActive} menuWidth="min-w-[760px]">
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
                      <p className="text-xs text-slate-500 mt-0.5">Post a brief &mdash; free, quotes in 24h</p>
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

            {/* ─── 3. Post a job (NEW top-level — moat product) ────────────────── */}
            <MegaMenuDropdown label="Post a job" isActive={isPostAJobActive} menuWidth="min-w-[420px]">
              <div className="p-6">
                <div className="mb-4">
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Describe what you need. Up to 5 verified advisors come back with quotes &mdash; free, no email needed to start. <span className="font-semibold text-slate-700">Quotes in 24h.</span>
                  </p>
                </div>
                <Link
                  href={postAJobMenu.primary.href}
                  className="flex items-center justify-between p-4 bg-emerald-500 hover:bg-emerald-600 rounded-xl mb-3 transition-colors group"
                >
                  <div>
                    <p className="font-bold text-white text-sm">{postAJobMenu.primary.label}</p>
                    <p className="text-xs text-emerald-50 mt-0.5">{postAJobMenu.primary.desc}</p>
                  </div>
                  <svg className="w-5 h-5 text-white shrink-0 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
                <div className="space-y-0.5">
                  {postAJobMenu.supporting.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="block px-3 py-2 rounded-lg hover:bg-emerald-50 transition-colors"
                    >
                      <div className="text-sm font-semibold text-slate-800">{item.label}</div>
                      <div className="text-xs text-slate-500">{item.desc}</div>
                    </Link>
                  ))}
                </div>
              </div>
            </MegaMenuDropdown>

            {/* ─── 4. Browse listings ──────────────────────────────────────────── */}
            <MegaMenuDropdown label="Browse listings" isActive={isListingsActive} menuWidth="min-w-[800px]">
              <div className="p-5">
                <Link
                  href="/invest"
                  className="flex items-center justify-between p-3 bg-gradient-to-r from-amber-50 to-amber-100/60 border border-amber-200 rounded-xl mb-4 hover:border-amber-300 transition-colors group"
                >
                  <div>
                    <p className="font-bold text-slate-900 text-sm">Browse the full marketplace</p>
                    <p className="text-xs text-slate-500 mt-0.5">Every active deal across 27 verticals &mdash; filterable in one place</p>
                  </div>
                  <svg className="w-5 h-5 text-amber-600 shrink-0 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>

                <div className="grid grid-cols-4 gap-5">
                  <div>
                    <p className="text-[0.60rem] font-bold text-amber-500 uppercase tracking-wider mb-2">Sectors &amp; Assets</p>
                    <div className="space-y-0.5">
                      {listingsMenu.sectors.map((item) => (
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
                    <p className="text-[0.60rem] font-bold text-amber-500 uppercase tracking-wider mb-2">Markets &amp; Income</p>
                    <div className="space-y-0.5">
                      {listingsMenu.marketsIncome.map((item) => (
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
                    <p className="text-[0.60rem] font-bold text-amber-500 uppercase tracking-wider mb-2">Quick Links</p>
                    <div className="space-y-0.5">
                      {listingsMenu.tools.map((item) => (
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

            {/* Tools & Calculators Mega-Menu (NEW) */}
            <MegaMenuDropdown label="Tools" isActive={isToolsActive} menuWidth="min-w-[720px]">
              <div className="p-6">
                {/* Top CTA */}
                <Link
                  href="/quick-audit"
                  className="flex items-center justify-between p-3.5 bg-gradient-to-r from-emerald-50 to-emerald-100/60 border border-emerald-200 rounded-xl mb-5 hover:border-emerald-300 transition-colors group"
                >
                  <div>
                    <p className="font-bold text-slate-900 text-sm">How much are you paying in fees?</p>
                    <p className="text-xs text-slate-500 mt-0.5">30-second audit — instant savings calculator</p>
                  </div>
                  <svg className="w-5 h-5 text-emerald-600 shrink-0 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>

                <div className="grid grid-cols-3 gap-5">
                  <div>
                    <p className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-wider mb-3">Fee Tools</p>
                    <div className="space-y-0.5">
                      {toolsMenu.feeTools.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          className="block px-2 py-2 rounded-lg hover:bg-emerald-50 transition-colors group/item"
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-semibold text-slate-800 group-hover/item:text-emerald-900">{item.label}</span>
                            {item.badge && (
                              <span className="text-[0.55rem] font-extrabold px-1 py-0.5 bg-amber-100 text-amber-700 rounded uppercase tracking-wide">
                                {item.badge}
                              </span>
                            )}
                          </div>
                          <div className="text-[0.65rem] text-slate-500">{item.desc}</div>
                        </Link>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-wider mb-3">Portfolio & Tax</p>
                    <div className="space-y-0.5">
                      {toolsMenu.portfolioTax.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          className="block px-2 py-2 rounded-lg hover:bg-emerald-50 transition-colors group/item"
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-semibold text-slate-800 group-hover/item:text-emerald-900">{item.label}</span>
                            {item.badge && (
                              <span className="text-[0.55rem] font-extrabold px-1 py-0.5 bg-amber-100 text-amber-700 rounded uppercase tracking-wide">
                                {item.badge}
                              </span>
                            )}
                          </div>
                          <div className="text-[0.65rem] text-slate-500">{item.desc}</div>
                        </Link>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-wider mb-3">Property & Retirement</p>
                    <div className="space-y-0.5">
                      {toolsMenu.property.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          className="block px-2 py-2 rounded-lg hover:bg-emerald-50 transition-colors group/item"
                        >
                          <div className="text-sm font-semibold text-slate-800 group-hover/item:text-emerald-900">{item.label}</div>
                          <div className="text-[0.65rem] text-slate-500">{item.desc}</div>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </MegaMenuDropdown>

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
            <LocationFlagButton />
            <button
              onClick={() => setSearchOpen(true)}
              className="p-2.5 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              aria-label="Search"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            <AccountButton />
            <Link
              href="/quiz"
              className="bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-900 px-4 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm hover:shadow-md active:scale-[0.97] inline-flex items-center gap-2 cursor-pointer"
            >
              Take the quiz
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {/* Mobile buttons */}
          <div className="lg:hidden flex items-center gap-1.5">
            <button
              onClick={() => setSearchOpen(true)}
              className="p-2 min-w-11 min-h-11 flex items-center justify-center text-slate-500 rounded-lg hover:bg-slate-100 transition-colors"
              aria-label="Search"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            <Link
              href="/quiz"
              className="bg-amber-500 text-slate-900 px-4 py-2 rounded-lg text-xs font-bold transition-all hover:bg-amber-600 min-h-11 inline-flex items-center cursor-pointer"
            >
              Take the quiz
            </Link>
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="p-2 min-w-11 min-h-11 flex items-center justify-center text-slate-700 rounded-lg hover:bg-slate-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
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
          className="lg:hidden border-t border-slate-100 bg-white max-h-[85vh] overflow-y-auto"
          aria-label="Mobile navigation"
        >
          <nav className="max-w-7xl mx-auto px-4 sm:px-6 py-4 space-y-0.5">
            {currentMobileSections.map((section, si) => (
              <div key={section.title} className={si > 0 ? "border-t border-slate-100 pt-3 mt-1" : ""}>
                <p className="px-3 pb-1 text-[0.6rem] font-extrabold uppercase tracking-widest text-slate-500">
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

            {/* Account section — previously desktop-only, now mirrored for
                mobile so logged-in users can reach /account, /shortlist etc
                and logged-out users can reach sign-in/sign-up from any page. */}
            <div className="border-t border-slate-100 pt-3 mt-1">
              <p className="px-3 pb-1 text-[0.6rem] font-extrabold uppercase tracking-widest text-slate-500">
                Account
              </p>
              {user ? (
                <>
                  <Link
                    href="/account"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-between px-3 py-3 min-h-12 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                  >
                    My Account
                    <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                  <Link
                    href="/shortlist"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-between px-3 py-3 min-h-12 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                  >
                    My Shortlist
                    <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                  <Link
                    href="/account/saved"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-between px-3 py-3 min-h-12 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                  >
                    Saved Comparisons
                    <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                  <Link
                    href="/fee-alerts"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-between px-3 py-3 min-h-12 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                  >
                    Fee Alerts
                    <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </>
              ) : (
                <div className="flex gap-2 px-3 py-2">
                  <Link
                    href="/auth/login"
                    onClick={() => setMobileOpen(false)}
                    className="flex-1 flex items-center justify-center py-3 min-h-12 rounded-xl text-sm font-semibold text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/auth/signup"
                    onClick={() => setMobileOpen(false)}
                    className="flex-1 flex items-center justify-center py-3 min-h-12 rounded-xl text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors"
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>

            {/* Single full-width CTA */}
            <div className="border-t border-slate-100 pt-4 mt-2 pb-2">
              <Link
                href={PRIMARY_CTA_HREF}
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-center w-full py-3.5 min-h-13 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm rounded-xl transition-colors"
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
