import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import Icon from "@/components/Icon";
import SectionHeading from "@/components/SectionHeading";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Buy a Business in Australia (${CURRENT_YEAR})`,
  description:
    "Comprehensive guide to buying a business in Australia. Types of businesses, valuation methods, due diligence, visa pathways, and FIRB rules for foreign buyers.",
  alternates: { canonical: `${SITE_URL}/invest/buy-business` },
  openGraph: {
    title: `Buy a Business in Australia (${CURRENT_YEAR})`,
    description:
      "Comprehensive guide to buying a business in Australia. Types of businesses, valuation methods, due diligence, visa pathways, and FIRB rules for foreign buyers.",
    url: `${SITE_URL}/invest/buy-business`,
  },
};

const BUY_BUSINESS_FAQS = faqJsonLd([
  {
    q: "How do I value a business when buying in Australia?",
    a: "Australian businesses are most commonly valued using an earnings-based method — a multiple of EBITDA (Earnings Before Interest, Tax, Depreciation, and Amortisation) or SDE (Seller's Discretionary Earnings). Small businesses typically sell at 1.5x–2.5x SDE; mid-market businesses at 3x–6x EBITDA; and larger businesses at 5x–10x or more. Asset-based valuations apply to businesses with significant tangible assets, while SaaS and online businesses are often valued on 2x–5x annual recurring revenue.",
  },
  {
    q: "What are the common deal structures for buying an Australian business?",
    a: "The most common structures are: (1) Asset purchase — the buyer acquires specified assets and liabilities, not the legal entity, giving more flexibility on what is included; (2) Share purchase — the buyer acquires the shares in the company, taking on all existing obligations; (3) Earn-out — part of the purchase price is deferred and contingent on future performance, often used to bridge valuation gaps; (4) Vendor finance — the seller accepts a portion of the purchase price as a structured payment over time. Each has different tax, stamp duty, and liability implications.",
  },
  {
    q: "What due diligence is required when buying a business in Australia?",
    a: "Key due diligence areas include: financial (3 years of P&L statements, BAS/GST returns, balance sheets, ATO tax returns, and 6 months of bank statements); operational (employee contracts and entitlements, supplier agreements, customer contracts, equipment condition, and lease terms); and legal (business licences, intellectual property, outstanding debts, legal proceedings, and environmental obligations). Engage both a business accountant and a commercial lawyer — 30–60 days is typical for a thorough process.",
  },
  {
    q: "Can I use my SMSF to buy a business?",
    a: "An SMSF can acquire business real property (commercial premises used wholly and exclusively in a business) under a limited recourse borrowing arrangement (LRBA), including from a related party at market value. However, an SMSF cannot acquire a business as an operating entity — it cannot own shares in a private operating company controlled by a related party unless it meets the in-house asset rules (limited to 5% of fund assets). Always seek specialist SMSF legal and financial advice before proceeding.",
  },
  {
    q: "What taxes apply when buying a business in Australia?",
    a: "Key taxes when buying an Australian business include: stamp duty (on asset purchases, calculated on the dutiable value of assets by state); GST (the sale may be GST-free as a going concern if certain conditions are met — get written agreement with the vendor); capital gains tax for the seller (which can affect negotiated price); and payroll tax implications if staff are transferred. In a share purchase, stamp duty may apply to the transfer of shares in certain states. Obtain tax advice specific to your deal structure from a qualified tax adviser.",
  },
]);

export default function BuyBusinessPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Invest", url: `${SITE_URL}/invest` },
    { name: "Buy a Business" },
  ]);

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      {BUY_BUSINESS_FAQS && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(BUY_BUSINESS_FAQS) }}
        />
      )}

      {/* Hero */}
      <section className="relative bg-white border-b border-slate-100 overflow-hidden py-8 md:py-12">
        <div className="container-custom">
          <nav className="flex items-center gap-1.5 text-xs text-slate-500 mb-6" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-slate-900 transition-colors">Home</Link>
            <Icon name="chevron-right" size={12} className="text-slate-300" />
            <Link href="/invest" className="hover:text-slate-900 transition-colors">Invest</Link>
            <Icon name="chevron-right" size={12} className="text-slate-300" />
            <span className="text-slate-900 font-medium">Buy a Business</span>
          </nav>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-xs font-semibold bg-amber-500 text-slate-900 px-3 py-1 rounded-full">
              Updated {CURRENT_YEAR}
            </span>
            <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
              Australian Guide
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-4 max-w-3xl text-slate-900">
            Buy a Business in Australia
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed max-w-2xl mb-8">
            From small cafes to established manufacturing businesses. Everything you need to know about acquiring a business in Australia — including visa pathways for international buyers.
          </p>

          <Link
            href="/invest/buy-business/listings"
            className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-base px-7 py-3.5 rounded-xl transition-colors shadow-lg"
          >
            Browse Businesses for Sale
            <Icon name="arrow-right" size={18} />
          </Link>
        </div>
      </section>

      {/* Browse Listings CTA */}
      <section className="bg-white pt-8">
        <div className="container-custom">
          <Link
            href="/invest/buy-business/listings"
            className="group flex items-center justify-between gap-4 p-5 bg-gradient-to-r from-emerald-50 to-emerald-100/40 border border-emerald-200 rounded-2xl mb-8 hover:border-emerald-300 hover:shadow-md transition-all"
          >
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wider text-emerald-700 mb-1">Browse Listings</p>
              <p className="text-lg font-extrabold text-slate-900">View all businesses for sale &rarr;</p>
              <p className="text-sm text-slate-600 mt-0.5">Active deals, FIRB-eligible, sub-categories &amp; more</p>
            </div>
            <svg className="w-8 h-8 text-emerald-600 shrink-0 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </section>

      {/* Quick stats */}
      <section className="py-10 bg-amber-50 border-b border-amber-100">
        <div className="container-custom">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { value: "50,000+", label: "Businesses sold annually" },
              { value: "$800K", label: "188A minimum business value" },
              { value: "$5M", label: "SIV complying investment" },
              { value: "$268M", label: "FIRB general threshold" },
            ].map((s) => (
              <div key={s.label} className="bg-white border border-amber-100 rounded-xl p-4 text-center">
                <p className="text-2xl font-extrabold text-amber-600">{s.value}</p>
                <p className="text-xs text-slate-600 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Business types */}
      <section className="py-14 bg-white">
        <div className="container-custom max-w-4xl">
          <SectionHeading
            eyebrow="Types of businesses"
            title="What Kind of Business Can You Buy?"
            sub="Australia has a diverse business landscape across every sector and price range."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
            {[
              {
                icon: "briefcase",
                title: "Independent Businesses",
                desc: "Established sole-trader and company-owned businesses — cafes, professional practices, service businesses, trades, and retail. Most common type for first-time buyers.",
              },
              {
                icon: "star",
                title: "Franchise Systems",
                desc: "Buy into a proven brand with training, supply chain, and marketing support. Investment from $50K (cleaning) to $1M+ (fast food). Reduced failure rate vs independent.",
              },
              {
                icon: "globe",
                title: "Online & E-Commerce",
                desc: "Amazon FBA businesses, Shopify stores, SaaS products, and content sites. Can be operated remotely — ideal for international investors seeking location-independent income.",
              },
              {
                icon: "trending-up",
                title: "Startups & Growth Companies",
                desc: "Earlier-stage businesses seeking a new owner-operator. Higher risk but lower purchase price. Often valued on potential rather than trailing earnings.",
              },
            ].map((item) => (
              <div key={item.title} className="bg-slate-50 border border-slate-200 rounded-xl p-6 flex gap-4">
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon name={item.icon} size={20} className="text-amber-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 mb-1">{item.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Valuation methods */}
          <SectionHeading
            eyebrow="Valuation"
            title="How Businesses Are Valued in Australia"
          />

          <div className="prose prose-slate max-w-none mb-10">
            <h3>Earnings-Based Valuation (Most Common)</h3>
            <p>
              Australian businesses are typically valued as a multiple of EBITDA (Earnings Before Interest, Tax, Depreciation, and Amortisation) or SDE (Seller&apos;s Discretionary Earnings). Multiples range from 1.5x–3x for small businesses to 5x–10x+ for larger, established businesses.
            </p>
            <ul>
              <li><strong>Small business (&lt;$500K revenue)</strong> — 1.5x–2.5x SDE</li>
              <li><strong>Mid-market ($500K–$5M EBITDA)</strong> — 3x–6x EBITDA</li>
              <li><strong>Larger businesses ($5M+ EBITDA)</strong> — 5x–10x+ EBITDA</li>
            </ul>

            <h3>Asset-Based Valuation</h3>
            <p>
              Used for businesses with significant tangible assets (plant, equipment, property, stock). The purchase price reflects the net asset value, sometimes with a small goodwill premium. Common in manufacturing, retail, and hospitality.
            </p>

            <h3>Revenue-Based Valuation</h3>
            <p>
              Common for SaaS, subscription, and online businesses. Typically 2x–5x annual recurring revenue (ARR). Depends heavily on churn rate, growth rate, and gross margins.
            </p>

            <h3>Industry-Specific Rules of Thumb</h3>
            <ul>
              <li>Cafes &amp; restaurants — 1x–2x annual net profit</li>
              <li>Professional practices (law, accounting, medicine) — 0.5x–1.5x annual revenue (patient/client list)</li>
              <li>Retail — stock at cost + goodwill</li>
              <li>Petrol stations — based on fuel volume + convenience income</li>
            </ul>
          </div>

          {/* Due diligence */}
          <SectionHeading
            eyebrow="Due diligence"
            title="What to Check Before You Buy"
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
            {[
              {
                title: "Financial Records",
                items: ["3 years P&L statements", "BAS (GST) returns", "Balance sheets", "ATO income tax returns", "Bank statements (6 months)"],
              },
              {
                title: "Operations",
                items: ["Employee contracts & entitlements", "Supplier agreements", "Customer contracts", "Equipment condition & maintenance", "Lease terms & options"],
              },
              {
                title: "Legal & Compliance",
                items: ["Business licences", "Intellectual property (trademarks, patents)", "Outstanding debts", "Legal proceedings", "Environmental obligations"],
              },
            ].map((col) => (
              <div key={col.title} className="bg-white border border-slate-200 rounded-xl p-5">
                <h3 className="font-bold text-slate-900 mb-3 text-sm">{col.title}</h3>
                <ul className="space-y-1.5">
                  {col.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-slate-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Visa pathways */}
          <SectionHeading
            eyebrow="Visa pathways"
            title="Business Visa Options for Foreign Buyers"
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
            {[
              {
                name: "Subclass 188A",
                label: "Business Innovation",
                detail: "Requires $800K business with 2 years operation. Provisional visa, leads to 888.",
              },
              {
                name: "Subclass 188B",
                label: "Investor Stream",
                detail: "$2.5M designated investment for 4 years. State nomination required.",
              },
              {
                name: "SIV (188C)",
                label: "Significant Investor",
                detail: "$5M in complying investments for 4 years. Most flexible for high net worth individuals.",
              },
              {
                name: "Subclass 888",
                label: "Permanent Residence",
                detail: "After satisfying provisional requirements. Business must meet turnover and employment criteria.",
              },
              {
                name: "Global Talent (858)",
                label: "Exceptional Talent",
                detail: "For founders and investors with exceptional tech or innovation credentials. Permanent from grant.",
              },
              {
                name: "State Specific",
                label: "State Nomination",
                detail: "NSW, VIC, QLD, SA, WA and TAS each run business nomination programs with varying thresholds.",
              },
            ].map((v) => (
              <div key={v.name} className="bg-white border border-slate-200 rounded-xl p-5">
                <p className="text-xs font-bold uppercase tracking-wide text-amber-600 mb-1">{v.name}</p>
                <p className="text-base font-bold text-slate-900">{v.label}</p>
                <p className="text-sm text-slate-500 mt-1">{v.detail}</p>
              </div>
            ))}
          </div>

          {/* Broker process */}
          <SectionHeading
            eyebrow="The process"
            title="How a Business Purchase Works"
          />

          <div className="space-y-3 mb-10">
            {[
              { step: "1", title: "Search & Shortlist", desc: "Browse listings, request information memoranda, shortlist businesses that match your criteria and budget." },
              { step: "2", title: "NDA & Initial Disclosure", desc: "Sign a Non-Disclosure Agreement before receiving detailed financial information from the vendor or broker." },
              { step: "3", title: "Valuation & Offer", desc: "Assess the asking price against your own valuation model. Make a conditional offer (subject to finance and due diligence)." },
              { step: "4", title: "Due Diligence", desc: "Engage an accountant for financial DD and a lawyer for legal DD. Typically 30–60 days to complete all checks." },
              { step: "5", title: "FIRB (if applicable)", desc: "Foreign investors may need FIRB approval before settling. Lodge application — typically 30 days for approval." },
              { step: "6", title: "Settlement", desc: "Exchange contracts, pay the purchase price. Transfer of business, employees, leases, and licences to new owner." },
            ].map((s) => (
              <div key={s.step} className="flex gap-4 bg-white border border-slate-200 rounded-xl p-5">
                <div className="w-8 h-8 rounded-full bg-amber-500 text-slate-900 font-extrabold text-sm flex items-center justify-center shrink-0">
                  {s.step}
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-sm">{s.title}</p>
                  <p className="text-sm text-slate-600 mt-0.5">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Browse CTA */}
      <section className="py-14 bg-white border-t border-slate-100">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-xl p-8 text-center">
            <h2 className="text-2xl font-extrabold text-slate-900 mb-3">Ready to Find Your Business?</h2>
            <p className="text-slate-500 text-sm mb-6 max-w-xl mx-auto">
              Browse active business listings across Australia — filtered by state, industry, and price range.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/invest/buy-business/listings"
                className="inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-6 py-3 rounded-xl text-sm"
              >
                Browse Businesses for Sale
                <Icon name="arrow-right" size={18} />
              </Link>
              <Link
                href="/find-advisor"
                className="inline-flex items-center justify-center gap-2 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold px-6 py-3 rounded-xl text-sm"
              >
                Browse Business Professionals
                <Icon name="user-check" size={18} />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
