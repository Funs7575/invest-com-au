"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";

interface SearchItem {
  title: string;
  href: string;
  category: string;
  description?: string;
}

const SEARCH_INDEX: SearchItem[] = [
  // Platforms
  { title: "Compare All Platforms", href: "/compare", category: "Platforms", description: "Side-by-side comparison of 100+ platforms" },
  { title: "Share Trading", href: "/share-trading", category: "Platforms", description: "ASX & international share brokers" },
  { title: "Crypto Exchanges", href: "/crypto", category: "Platforms", description: "AUSTRAC-registered crypto platforms" },
  { title: "Super Funds", href: "/compare/super", category: "Platforms", description: "Compare fees & performance" },
  { title: "Savings Accounts", href: "/savings", category: "Platforms", description: "High interest & at-call accounts" },
  { title: "ETFs", href: "/compare/etfs", category: "Platforms", description: "Exchange-traded funds comparison" },
  { title: "CFD & Forex", href: "/cfd", category: "Platforms", description: "Derivatives & currency trading" },
  { title: "Robo-Advisors", href: "/compare?filter=robo", category: "Platforms", description: "Automated portfolio management" },
  { title: "Current Deals & Offers", href: "/deals", category: "Platforms", description: "Live promotions from brokers" },

  // Investment Verticals
  { title: "All Investment Verticals", href: "/invest", category: "Invest", description: "Every way to invest in Australia" },
  { title: "Investment Marketplace", href: "/invest/listings", category: "Invest", description: "Browse active investment listings" },
  { title: "Mining & Resources", href: "/invest/mining", category: "Invest", description: "Iron ore, lithium, gold & critical minerals" },
  { title: "Buy a Business", href: "/invest/buy-business", category: "Invest", description: "SME acquisitions & franchise pathways" },
  { title: "Farmland & Agriculture", href: "/invest/farmland", category: "Invest", description: "Livestock, cropping, water rights" },
  { title: "Commercial Property", href: "/invest/commercial-property", category: "Invest", description: "Office, industrial, hotels" },
  { title: "Renewable Energy", href: "/invest/renewable-energy", category: "Invest", description: "Solar, wind, hydrogen & battery" },
  { title: "Startups & Tech", href: "/invest/startups", category: "Invest", description: "VC, angel investing & crowdfunding" },
  { title: "Private Credit & P2P", href: "/invest/private-credit", category: "Invest", description: "La Trobe, Qualitas, Metrics" },
  { title: "A-REITs", href: "/invest/reits", category: "Invest", description: "ASX-listed property trusts" },
  { title: "Managed & Index Funds", href: "/invest/managed-funds", category: "Invest", description: "Vanguard, Betashares, iShares" },
  { title: "Dividend Investing", href: "/invest/dividend-investing", category: "Invest", description: "High-yield ASX stocks & franking credits" },
  { title: "Options & Derivatives", href: "/invest/options-trading", category: "Invest", description: "ETOs, CFDs, warrants & futures" },
  { title: "Forex Trading", href: "/invest/forex", category: "Invest", description: "AUD/USD, ASIC-regulated brokers" },
  { title: "Commodities", href: "/invest/commodities", category: "Invest", description: "Gold, silver, oil & resource ETFs" },
  { title: "Alternative Investments", href: "/invest/alternatives", category: "Invest", description: "Wine, art, cars, watches & collectibles" },
  { title: "Infrastructure Funds", href: "/invest/infrastructure", category: "Invest", description: "Toll roads, airports, utilities" },
  { title: "Hybrid Securities", href: "/invest/hybrid-securities", category: "Invest", description: "Bank hybrids & APRA phase-out" },
  { title: "Crypto Staking & DeFi", href: "/invest/crypto-staking", category: "Invest", description: "Staking yields, DeFi & crypto ETFs" },
  { title: "SMSF Investment Guide", href: "/invest/smsf", category: "Invest", description: "What SMSFs invest in & how" },
  { title: "Bonds & Fixed Income", href: "/invest/bonds", category: "Invest", description: "Government & corporate bonds" },
  { title: "Gold & Precious Metals", href: "/invest/gold", category: "Invest", description: "Perth Mint, ETFs & bullion" },
  { title: "Private Equity", href: "/invest/private-equity", category: "Invest", description: "PE & hedge fund access" },
  { title: "IPOs & New Listings", href: "/invest/ipos", category: "Invest", description: "Upcoming ASX IPOs" },
  { title: "Franchise Opportunities", href: "/invest/franchise", category: "Invest", description: "Proven business models" },

  // Property
  { title: "Investment Property Hub", href: "/property", category: "Property", description: "Developments, suburb data & loans" },
  { title: "New Developments", href: "/property/listings", category: "Property", description: "Off-the-plan apartments & houses" },
  { title: "Suburb Research", href: "/property/suburbs", category: "Property", description: "Yields, growth & vacancy data" },
  { title: "Investment Loans", href: "/property/finance", category: "Property", description: "Compare rates from major lenders" },
  { title: "FIRB Guide", href: "/property/foreign-investment", category: "Property", description: "Foreign buyer rules & surcharges" },

  // Advisors
  { title: "Find an Advisor", href: "/find-advisor", category: "Advisors", description: "Browse all professional types" },
  { title: "Financial Planners", href: "/advisors/financial-planners", category: "Advisors", description: "Wealth strategy & retirement" },
  { title: "Mortgage Brokers", href: "/advisors/mortgage-brokers", category: "Advisors", description: "Compare 30+ lenders" },
  { title: "SMSF Accountants", href: "/advisors/smsf-accountants", category: "Advisors", description: "Self-managed super specialists" },
  { title: "Tax Agents", href: "/advisors/tax-agents", category: "Advisors", description: "Tax planning & lodgement" },
  { title: "Buyer's Agents", href: "/advisors/buyers-agents", category: "Advisors", description: "Off-market access & negotiation" },
  { title: "Insurance Brokers", href: "/advisors/insurance-brokers", category: "Advisors", description: "Life & income protection" },
  { title: "Wealth Managers", href: "/advisors/wealth-managers", category: "Advisors", description: "Portfolio management" },

  // Learn
  { title: "All Articles & Guides", href: "/articles", category: "Learn", description: "Educational investment content" },
  { title: "How-To Guides", href: "/how-to", category: "Learn", description: "Step-by-step investing guides" },
  { title: "Calculators", href: "/calculators", category: "Learn", description: "Brokerage, mortgage, retirement" },
  { title: "Glossary", href: "/glossary", category: "Learn", description: "Investment terms explained" },
  { title: "Foreign Investment Hub", href: "/foreign-investment", category: "Learn", description: "FIRB, tax, visa & country guides" },

  // Tools
  { title: "Brokerage Calculator", href: "/calculators", category: "Tools", description: "Compare trading costs" },
  { title: "Mortgage Calculator", href: "/mortgage-calculator", category: "Tools", description: "Repayment estimates" },
  { title: "Retirement Calculator", href: "/retirement-calculator", category: "Tools", description: "Project your retirement savings" },
  { title: "Savings Calculator", href: "/savings-calculator", category: "Tools", description: "Interest earnings projector" },
  { title: "SMSF Calculator", href: "/smsf-calculator", category: "Tools", description: "SMSF fee comparison" },
];

const CATEGORY_ICONS: Record<string, string> = {
  Platforms: "trending-up",
  Invest: "layers",
  Property: "building",
  Advisors: "users",
  Learn: "book-open",
  Tools: "calculator",
};

export default function SearchOverlay({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const results = query.length >= 2
    ? SEARCH_INDEX.filter(
        (item) =>
          item.title.toLowerCase().includes(query.toLowerCase()) ||
          (item.description?.toLowerCase().includes(query.toLowerCase())) ||
          item.category.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 8)
    : [];

  const grouped = results.reduce<Record<string, SearchItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      setTimeout(() => inputRef.current?.focus(), 50);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleKeyDown]);

  useEffect(() => {
    if (!isOpen) setQuery("");
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200]" role="dialog" aria-modal="true" aria-label="Search">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />

      {/* Search panel */}
      <div className="relative max-w-2xl mx-auto mt-[10vh] mx-4">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
          {/* Search input */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
            <Icon name="search" size={20} className="text-slate-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search platforms, verticals, advisors, tools..."
              className="flex-1 text-base text-slate-900 placeholder:text-slate-400 outline-none bg-transparent"
              aria-label="Search"
            />
            <kbd className="hidden sm:flex items-center gap-1 px-2 py-1 text-[0.6rem] font-semibold text-slate-400 bg-slate-100 rounded-md border border-slate-200">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div className="max-h-[60vh] overflow-y-auto">
            {query.length < 2 ? (
              <div className="px-5 py-6">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Quick Links</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { title: "Compare Platforms", href: "/compare", icon: "trending-up" },
                    { title: "Investment Marketplace", href: "/invest/listings", icon: "layers" },
                    { title: "Browse Advisors", href: "/advisors", icon: "users" },
                    { title: "Current Deals", href: "/deals", icon: "zap" },
                    { title: "Calculators", href: "/calculators", icon: "calculator" },
                    { title: "Foreign Investors", href: "/foreign-investment", icon: "globe" },
                  ].map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={onClose}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 group-hover:bg-amber-50 transition-colors">
                        <Icon name={link.icon} size={14} className="text-slate-500 group-hover:text-amber-600" />
                      </div>
                      <span className="text-sm font-semibold text-slate-700 group-hover:text-slate-900">{link.title}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ) : results.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <Icon name="search" size={24} className="text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No results for &ldquo;{query}&rdquo;</p>
                <p className="text-xs text-slate-400 mt-1">Try a different search term</p>
              </div>
            ) : (
              <div className="py-3">
                {Object.entries(grouped).map(([category, items]) => (
                  <div key={category} className="mb-2 last:mb-0">
                    <p className="px-5 py-1.5 text-[0.6rem] font-bold uppercase tracking-wider text-slate-400">{category}</p>
                    {items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onClose}
                        className="flex items-center gap-3 px-5 py-2.5 hover:bg-amber-50 transition-colors group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 group-hover:bg-amber-100 transition-colors">
                          <Icon name={CATEGORY_ICONS[category] || "file"} size={14} className="text-slate-500 group-hover:text-amber-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 group-hover:text-amber-700 truncate">{item.title}</p>
                          {item.description && <p className="text-xs text-slate-400 truncate">{item.description}</p>}
                        </div>
                        <Icon name="arrow-right" size={14} className="text-slate-300 shrink-0 group-hover:text-amber-500" />
                      </Link>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
