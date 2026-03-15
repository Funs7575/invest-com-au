"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";

/* ─── Types ─── */

interface Tool {
  slug: string;
  name: string;
  category: string;
  rating: number;
  description: string;
  pros: string[];
  pricing: string;
  url: string;
}

/* ─── Sample Data ─── */

const TOOLS: Tool[] = [
  {
    slug: "sharesight",
    name: "Sharesight",
    category: "Investing",
    rating: 4.5,
    description:
      "Portfolio tracking and tax reporting for Australian investors. Automatically tracks dividends, capital gains, and multi-currency holdings.",
    pros: ["Auto tax reports", "Multi-broker support", "Dividend tracking"],
    pricing: "Free / from $19/mo",
    url: "https://www.sharesight.com",
  },
  {
    slug: "pocketbook",
    name: "Pocketbook",
    category: "Budgeting",
    rating: 4.0,
    description:
      "Automatic spending tracker linked to your bank accounts. Categorises transactions and helps you set budgets effortlessly.",
    pros: ["Auto-categorisation", "Bill reminders", "Bank-linked"],
    pricing: "Free",
    url: "https://getpocketbook.com",
  },
  {
    slug: "frollo",
    name: "Frollo",
    category: "Budgeting",
    rating: 4.2,
    description:
      "Open banking budgeting app that gives you a single view of all your finances across multiple banks.",
    pros: ["Open Banking CDR", "Multi-bank view", "Goal tracking"],
    pricing: "Free",
    url: "https://www.frollo.com.au",
  },
  {
    slug: "pearler",
    name: "Pearler",
    category: "Investing",
    rating: 4.3,
    description:
      "Automated ETF investing for long-term investors. Set up auto-invest plans and dollar-cost average into your chosen ETFs.",
    pros: ["Auto-invest", "Community portfolios", "Long-term focus"],
    pricing: "$9.50/trade",
    url: "https://pearler.com",
  },
  {
    slug: "spaceship",
    name: "Spaceship",
    category: "Investing",
    rating: 4.1,
    description:
      "Micro-investing and super fund rolled into one. Invest in tech-focused portfolios or a low-fee super option.",
    pros: ["No fees under $5k", "Super option", "Simple UI"],
    pricing: "Free under $5k",
    url: "https://www.spaceship.com.au",
  },
  {
    slug: "xero",
    name: "Xero",
    category: "Tax",
    rating: 4.6,
    description:
      "Cloud accounting for small businesses. Manage invoicing, payroll, bank reconciliation, and BAS lodgement from one platform.",
    pros: ["Bank feeds", "BAS lodgement", "Payroll included"],
    pricing: "From $29/mo",
    url: "https://www.xero.com/au",
  },
  {
    slug: "myob",
    name: "MYOB",
    category: "Tax",
    rating: 4.0,
    description:
      "Accounting and payroll software trusted by Australian businesses for decades. Covers invoicing, expenses, and tax compliance.",
    pros: ["Payroll", "STP compliant", "BAS & tax"],
    pricing: "From $25/mo",
    url: "https://www.myob.com/au",
  },
  {
    slug: "stake",
    name: "Stake",
    category: "Investing",
    rating: 4.2,
    description:
      "Commission-free US share trading from Australia. Access Wall Street stocks and ETFs with no brokerage on US trades.",
    pros: ["Free US trades", "Fractional shares", "ASX + US"],
    pricing: "Free US trades + FX fee",
    url: "https://hellostake.com",
  },
  {
    slug: "raiz",
    name: "Raiz",
    category: "Investing",
    rating: 3.8,
    description:
      "Round-up micro-investing that turns your spare change into investments. Choose from diversified portfolios matched to your risk profile.",
    pros: ["Round-ups", "Low minimums", "Super option"],
    pricing: "$3.50/mo",
    url: "https://raizinvest.com.au",
  },
  {
    slug: "finder",
    name: "Finder",
    category: "Banking",
    rating: 4.0,
    description:
      "Comparison engine for financial products including savings accounts, credit cards, home loans, insurance, and share trading platforms.",
    pros: ["Wide coverage", "Rate alerts", "Independent reviews"],
    pricing: "Free",
    url: "https://www.finder.com.au",
  },
  {
    slug: "coinspot",
    name: "CoinSpot",
    category: "Crypto",
    rating: 4.1,
    description:
      "Australia's largest crypto exchange with 400+ coins. Buy, sell, and swap crypto with AUD deposits via PayID, BPAY, or bank transfer.",
    pros: ["400+ coins", "AUD deposits", "AUSTRAC registered"],
    pricing: "1% fee",
    url: "https://www.coinspot.com.au",
  },
  {
    slug: "up-bank",
    name: "Up Bank",
    category: "Banking",
    rating: 4.5,
    description:
      "Digital-first neobank offering fee-free spending and competitive savings rates. Beautiful app with smart budgeting features.",
    pros: ["No fees", "Instant notifications", "Savings vaults"],
    pricing: "Free",
    url: "https://up.com.au",
  },
  {
    slug: "superhero",
    name: "Superhero",
    category: "Investing",
    rating: 4.0,
    description:
      "Low-cost share trading platform with $2 ASX ETF trades and no-fee US trading. Also offers a superannuation product.",
    pros: ["$2 ETF trades", "Free US trades", "Super option"],
    pricing: "$2 ETF / $5 shares",
    url: "https://www.superhero.com.au",
  },
  {
    slug: "reckon",
    name: "Reckon",
    category: "Tax",
    rating: 3.9,
    description:
      "Affordable cloud accounting software for sole traders and small businesses. Covers invoicing, expenses, and tax reporting.",
    pros: ["Low cost", "ATO integration", "Mobile app"],
    pricing: "From $11/mo",
    url: "https://www.reckon.com/au",
  },
  {
    slug: "swyftx",
    name: "Swyftx",
    category: "Crypto",
    rating: 4.2,
    description:
      "Australian crypto exchange with 300+ assets, recurring buys, and a built-in tax reporting tool for crypto capital gains.",
    pros: ["Tax reports", "Recurring buys", "Demo mode"],
    pricing: "0.6% fee",
    url: "https://swyftx.com",
  },
];

/* ─── Config ─── */

const CATEGORY_TABS = ["All", "Budgeting", "Investing", "Banking", "Tax", "Super", "Crypto"] as const;
type CategoryTab = (typeof CATEGORY_TABS)[number];

const CATEGORY_BADGE_COLORS: Record<string, string> = {
  Budgeting: "bg-blue-100 text-blue-700",
  Investing: "bg-emerald-100 text-emerald-700",
  Banking: "bg-amber-100 text-amber-700",
  Tax: "bg-purple-100 text-purple-700",
  Super: "bg-teal-100 text-teal-700",
  Crypto: "bg-orange-100 text-orange-700",
};

function renderStars(rating: number) {
  const full = Math.floor(rating);
  const hasHalf = rating - full >= 0.3;
  const stars: string[] = [];
  for (let i = 0; i < full; i++) stars.push("full");
  if (hasHalf) stars.push("half");
  while (stars.length < 5) stars.push("empty");
  return stars;
}

/* ─── Component ─── */

export default function ToolsClient() {
  const [categoryTab, setCategoryTab] = useState<CategoryTab>("All");

  const filtered = useMemo(() => {
    if (categoryTab === "All") return TOOLS;
    return TOOLS.filter(
      (t) => t.category === categoryTab || t.category.includes(categoryTab)
    );
  }, [categoryTab]);

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-r from-purple-600 to-purple-800 text-white py-10 md:py-16">
        <div className="container-custom">
          <nav className="text-xs text-purple-200 mb-3">
            <Link href="/" className="hover:text-white">
              Home
            </Link>
            <span className="mx-1.5">/</span>
            <span className="text-white">Financial Tools</span>
          </nav>
          <h1 className="text-2xl md:text-4xl font-extrabold mb-2">
            Best Financial Tools &amp; Apps
          </h1>
          <p className="text-sm md:text-lg text-purple-100 max-w-2xl">
            Discover the top fintech tools for budgeting, investing, tax, banking, super, and
            crypto in Australia.
          </p>
        </div>
      </section>

      <div className="container-custom py-6 md:py-10">
        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2 mb-6" role="tablist" aria-label="Filter by category">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab}
              role="tab"
              aria-selected={categoryTab === tab}
              onClick={() => setCategoryTab(tab)}
              className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
                categoryTab === tab
                  ? "bg-purple-700 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Card Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {filtered.map((tool) => {
            const stars = renderStars(tool.rating);
            const badgeColor = CATEGORY_BADGE_COLORS[tool.category] || "bg-slate-100 text-slate-700";

            return (
              <div
                key={tool.slug}
                className="border border-slate-200 rounded-xl bg-white hover:shadow-lg transition-shadow flex flex-col"
              >
                <div className="p-4 md:p-5 flex flex-col flex-1">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-base md:text-lg font-bold text-slate-900">
                      {tool.name}
                    </h3>
                    <span
                      className={`text-[0.65rem] md:text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${badgeColor}`}
                    >
                      {tool.category}
                    </span>
                  </div>

                  {/* Stars */}
                  <div className="flex items-center gap-1 mb-2">
                    {stars.map((type, i) => (
                      <svg
                        key={i}
                        className={`w-4 h-4 ${
                          type === "full"
                            ? "text-amber-400"
                            : type === "half"
                            ? "text-amber-300"
                            : "text-slate-200"
                        }`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                    <span className="text-xs text-slate-500 ml-1">{tool.rating}</span>
                  </div>

                  {/* Description */}
                  <p className="text-xs md:text-sm text-slate-600 mb-3 line-clamp-3 flex-1">
                    {tool.description}
                  </p>

                  {/* Pros */}
                  <ul className="space-y-1 mb-3">
                    {tool.pros.map((pro) => (
                      <li key={pro} className="flex items-center gap-1.5 text-xs text-slate-600">
                        <Icon name="check-circle" size={12} className="text-emerald-500 shrink-0" />
                        {pro}
                      </li>
                    ))}
                  </ul>

                  {/* Pricing */}
                  <p className="text-xs font-semibold text-slate-700 mb-3">
                    {tool.pricing}
                  </p>

                  {/* CTA */}
                  <a
                    href={tool.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 w-full px-4 py-2.5 bg-purple-700 hover:bg-purple-800 text-white text-sm font-semibold rounded-lg transition-colors mt-auto"
                  >
                    <Icon name="external-link" size={14} className="text-white" />
                    Visit
                  </a>
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <p className="text-sm md:text-lg font-medium mb-1">No tools found</p>
            <p className="text-xs md:text-sm">Try selecting a different category.</p>
          </div>
        )}

        {/* SEO Content */}
        <section className="border-t border-slate-200 pt-8 mt-10">
          <h2 className="text-lg md:text-2xl font-extrabold text-slate-900 mb-3">
            The Australian Fintech Landscape
          </h2>
          <div className="prose prose-slate prose-sm max-w-none text-slate-600 space-y-3">
            <p>
              Australia has one of the most vibrant fintech ecosystems in the Asia-Pacific region.
              From neobanks like Up Bank to portfolio trackers like Sharesight, Australians have
              access to a growing range of digital financial tools that make managing money easier
              and more transparent.
            </p>
            <p>
              Open Banking (via the Consumer Data Right) is accelerating innovation, enabling apps
              like Frollo to aggregate financial data across institutions. Meanwhile, micro-investing
              platforms such as Raiz and Spaceship have lowered the barrier to entry for new
              investors, allowing people to start investing with just a few dollars.
            </p>
            <p>
              Whether you are looking for a budgeting app, a share trading platform, crypto
              exchange, or cloud accounting software for your business, the tools above represent
              some of the most popular and well-reviewed options available to Australians in 2026.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
