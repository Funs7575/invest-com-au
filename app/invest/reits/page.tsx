import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, SITE_NAME, CURRENT_YEAR } from "@/lib/seo";
import ContextualLeadMagnet from "@/components/ContextualLeadMagnet";
import { SHOW_RATINGS, SHOW_EDITORIAL_BADGES, SHOW_ADVISOR_RATINGS, SHOW_ADVISOR_VERIFIED_BADGE, FACTUAL_COMPARISON_DISCLAIMER, ADVISOR_DIRECTORY_HEADING, ADVISOR_DIRECTORY_SUBTEXT } from "@/lib/compliance-config";

export const metadata: Metadata = {
  title: `A-REITs — Australian Real Estate Investment Trusts (${CURRENT_YEAR})`,
  description:
    "Compare ASX-listed A-REITs by sector, yield, NTA discount and fees. Goodman Group, Stockland, Dexus, Scentre, Charter Hall — plus REIT ETFs like VAP and MVA.",
  alternates: { canonical: `${SITE_URL}/invest/reits` },
  openGraph: {
    title: `A-REITs — Australian Real Estate Investment Trusts (${CURRENT_YEAR})`,
    description:
      "Compare ASX-listed A-REITs by sector, yield, NTA discount and fees. Goodman Group, Stockland, Dexus, Scentre, Charter Hall — plus REIT ETFs like VAP and MVA.",
    url: `${SITE_URL}/invest/reits`,
  },
};

export const revalidate = 3600;

export default async function ReitsPage() {
  const supabase = await createClient();
  const { data: brokers } = await supabase
    .from("brokers")
    .select("id, name, slug, rating, platform_type, asx_fee, us_fee, min_deposit, affiliate_url, deal, deal_text, icon")
    .eq("status", "active")
    .in("platform_type", ["share_broker"])
    .order("rating", { ascending: false })
    .limit(5);

  const { data: advisors } = await supabase
    .from("professionals")
    .select("slug, name, firm_name, type, location_display, rating, review_count, photo_url, verified")
    .eq("status", "active")
    .in("type", ["financial_planner", "property_advisor"])
    .order("rating", { ascending: false })
    .limit(3);

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Invest", url: `${SITE_URL}/invest` },
    { name: "A-REITs" },
  ]);

  const webPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `A-REITs — Australian Real Estate Investment Trusts (${CURRENT_YEAR})`,
    url: `${SITE_URL}/invest/reits`,
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      { "@type": "Question", name: "What are A-REITs?", acceptedAnswer: { "@type": "Answer", text: "Australian Real Estate Investment Trusts (A-REITs) are ASX-listed entities that own, operate, or finance income-producing real estate such as office towers, shopping centres, and industrial warehouses. They must distribute at least 90% of taxable income to unitholders, making them popular income investments with yields typically between 4-6%." } },
      { "@type": "Question", name: "How do I buy REITs on the ASX?", acceptedAnswer: { "@type": "Answer", text: "You can buy A-REITs through any ASX broker (CommSec, Stake, CMC Markets, etc.) just like buying ordinary shares. You can purchase individual REITs like Goodman Group (GMG) or Scentre Group (SCG), or buy a REIT ETF like VAP (Vanguard Australian Property Securities) for diversified exposure with a single trade." } },
      { "@type": "Question", name: "How are REIT distributions taxed in Australia?", acceptedAnswer: { "@type": "Answer", text: "A-REIT distributions typically contain a mix of income, capital gains, and tax-deferred (return of capital) components. The tax-deferred portion reduces your cost base rather than being taxed immediately, with CGT payable when you eventually sell your units. In an SMSF, distributions are taxed at 15% in accumulation or 0% in pension phase." } },
      { "@type": "Question", name: "What does NTA premium or discount mean for REITs?", acceptedAnswer: { "@type": "Answer", text: "NTA (Net Tangible Assets) represents the underlying value of a REIT's property portfolio per unit. When a REIT trades above its NTA, it is at a premium, which may indicate the market values its management quality or growth prospects. Trading below NTA indicates a discount, which may signal a buying opportunity or concerns about the portfolio's future value." } },
      { "@type": "Question", name: "What is the best REIT ETF in Australia?", acceptedAnswer: { "@type": "Answer", text: "VAP (Vanguard Australian Property Securities ETF) is the most popular A-REIT ETF with a low MER of 0.23% and exposure to around 30 A-REITs. MVA (VanEck Australian Property ETF) is another option with a slightly higher MER of 0.35%. For global REIT exposure, DJRE (BetaShares Global Real Estate ETF) covers approximately 100 REITs worldwide." } },
      { "@type": "Question", name: "How do REITs compare to direct property investment?", acceptedAnswer: { "@type": "Answer", text: "REITs offer liquidity (buy/sell instantly on ASX), diversification across multiple properties, professional management, and low minimums (from $500 via ETFs). Direct property offers leverage via mortgage, greater control, and potential tax benefits through negative gearing. REITs avoid the hassles of property management, vacancies, and maintenance but provide no ability to add value through renovation." } },
      { "@type": "Question", name: "Can SMSFs invest in REITs?", acceptedAnswer: { "@type": "Answer", text: "Yes, A-REITs and REIT ETFs are straightforward investments for SMSFs with no special restrictions. They are treated like any other ASX-listed investment. Distributions are taxed at 15% in accumulation phase or 0% in pension phase, making them tax-efficient income generators for SMSF portfolios." } },
      { "@type": "Question", name: "How do interest rates affect REIT prices?", acceptedAnswer: { "@type": "Answer", text: "A-REITs are highly sensitive to interest rate movements. Rising rates increase borrowing costs for REITs and make their distribution yields less attractive relative to bonds and term deposits, typically causing REIT prices to fall. Conversely, falling rates tend to boost REIT valuations. Most A-REITs carry gearing of 25-35%, so refinancing costs directly impact profitability." } },
    ],
  };

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPage) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* Hero */}
      <section className="relative bg-white border-b border-slate-100 overflow-hidden py-8 md:py-12">
        <div className="container-custom">
          <nav className="flex items-center gap-1.5 text-xs text-slate-500 mb-6" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-slate-900 transition-colors">Home</Link>
            <span className="text-slate-300">/</span>
            <Link href="/invest" className="hover:text-slate-900 transition-colors">Invest</Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-medium">A-REITs</span>
          </nav>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-xs font-semibold bg-amber-500 text-slate-900 px-3 py-1 rounded-full">
              Updated {CURRENT_YEAR}
            </span>
            <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
              ASX-Listed Property
            </span>
          </div>

          <h1 className="text-slate-900 text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-4 max-w-3xl">
            A-REITs: Australian Real Estate Investment Trusts
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed max-w-2xl">
            A-REITs let you invest in commercial property — office towers, shopping centres, industrial warehouses, and more — without buying a whole building. Listed on the ASX, they offer liquidity, diversification, and regular income distributions.
          </p>
          <div className="flex flex-wrap gap-3 mt-6">
            <Link
              href="/compare"
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors"
            >
              Compare Platforms &rarr;
            </Link>
            <Link
              href="/compare"
              className="inline-flex items-center gap-2 border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 font-semibold text-sm px-5 py-2.5 rounded-lg border transition-colors"
            >
              Filter Platforms
            </Link>
          </div>
        </div>
      </section>

      {/* Key stats */}
      <section className="py-10 bg-white border-b border-slate-100">
        <div className="container-custom">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { value: "$130B+", label: "A-REIT market capitalisation" },
              { value: "4–6%", label: "Average distribution yield" },
              { value: "40+", label: "A-REITs listed on ASX" },
              { value: "$500", label: "Minimum via ETF (e.g. VAP)" },
            ].map((s) => (
              <div key={s.label} className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-center">
                <p className="text-2xl font-extrabold text-amber-600">{s.value}</p>
                <p className="text-xs text-slate-600 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 1: What Are A-REITs */}
      <section className="py-14 bg-white">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 1</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">What Are A-REITs?</h2>

          <div className="prose prose-slate max-w-none">
            <p>
              Australian Real Estate Investment Trusts (A-REITs) are ASX-listed entities that own, operate, or finance income-producing real estate. They must distribute at least 90% of taxable income to unitholders, making them popular income investments. A-REITs provide exposure to commercial property sectors that are otherwise inaccessible to most retail investors.
            </p>
            <p>
              The S&amp;P/ASX 200 A-REIT index tracks the sector, and REIT ETFs like <strong>VAP</strong> (Vanguard Australian Property Securities) and <strong>MVA</strong> (VanEck Australian Property) offer diversified exposure with a single trade.
            </p>
          </div>
        </div>
      </section>

      {/* Section 2: A-REITs by Sector */}
      <section className="py-14 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 2</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">A-REITs by Sector</h2>

          <div className="space-y-6">
            {[
              {
                sector: "Industrial & Logistics",
                desc: "Warehouses, data centres, and distribution hubs — the top-performing REIT sector driven by e-commerce growth.",
                reits: [
                  { code: "GMG", name: "Goodman Group", cap: "$70B+", yield: "~1%", note: "Global logistics giant; growth-focused" },
                  { code: "CIP", name: "Centuria Industrial REIT", cap: "$3B", yield: "~5%", note: "Pure-play Australian industrial" },
                ],
              },
              {
                sector: "Retail",
                desc: "Shopping centres from regional malls to neighbourhood strips. Income is stable but faces structural headwinds from online retail.",
                reits: [
                  { code: "SCG", name: "Scentre Group", cap: "$18B", yield: "~4.5%", note: "Owns Westfield centres in Australia" },
                  { code: "VCX", name: "Vicinity Centres", cap: "$10B", yield: "~5%", note: "Chadstone, DFO, major retail malls" },
                ],
              },
              {
                sector: "Office",
                desc: "CBD office towers. Facing higher vacancy rates post-COVID as hybrid work persists, but long lease terms provide income stability.",
                reits: [
                  { code: "DXS", name: "Dexus", cap: "$8B", yield: "~5.5%", note: "Largest Australian office REIT" },
                  { code: "COF", name: "Centuria Office REIT", cap: "$1.2B", yield: "~7%", note: "Diversified metro office" },
                ],
              },
              {
                sector: "Diversified",
                desc: "Mix of property types — office, retail, industrial, and funds management — providing built-in diversification.",
                reits: [
                  { code: "SGP", name: "Stockland", cap: "$12B", yield: "~4.5%", note: "Residential, retail & logistics" },
                  { code: "MGR", name: "Mirvac Group", cap: "$9B", yield: "~4%", note: "Office, residential, industrial" },
                  { code: "CHC", name: "Charter Hall Group", cap: "$8B", yield: "~3%", note: "Funds management + direct property" },
                ],
              },
            ].map((s) => (
              <div key={s.sector} className="bg-white border border-slate-200 rounded-xl p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-2">{s.sector}</h3>
                <p className="text-sm text-slate-600 mb-4">{s.desc}</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="text-left py-2 px-3 font-semibold text-slate-700 border-b border-slate-200">Code</th>
                        <th className="text-left py-2 px-3 font-semibold text-slate-700 border-b border-slate-200">Name</th>
                        <th className="text-left py-2 px-3 font-semibold text-slate-700 border-b border-slate-200">Market Cap</th>
                        <th className="text-left py-2 px-3 font-semibold text-slate-700 border-b border-slate-200">Yield</th>
                        <th className="text-left py-2 px-3 font-semibold text-slate-700 border-b border-slate-200">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {s.reits.map((r, i) => (
                        <tr key={r.code} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                          <td className="py-2 px-3 font-bold text-amber-700 border-b border-slate-100">{r.code}</td>
                          <td className="py-2 px-3 text-slate-800 border-b border-slate-100">{r.name}</td>
                          <td className="py-2 px-3 text-slate-500 border-b border-slate-100">{r.cap}</td>
                          <td className="py-2 px-3 font-semibold text-slate-800 border-b border-slate-100">{r.yield}</td>
                          <td className="py-2 px-3 text-slate-500 border-b border-slate-100">{r.note}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Lead Magnet */}
      <section className="py-14 bg-white">
        <div className="container-custom max-w-4xl">
          <ContextualLeadMagnet segment="fee-audit" />
        </div>
      </section>

      {/* Section 3: REIT ETFs */}
      <section className="py-14 bg-white">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 3</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">A-REIT ETFs — Diversified Exposure</h2>
          <p className="text-slate-600 leading-relaxed mb-6">
            Instead of picking individual REITs, you can buy a single ETF for diversified exposure across the entire A-REIT sector.
          </p>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  <th className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">ETF</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">Manager</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">MER</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">Holdings</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">Yield</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { code: "VAP", manager: "Vanguard", mer: "0.23%", holdings: "~30 A-REITs", yield: "~4.5%" },
                  { code: "MVA", manager: "VanEck", mer: "0.35%", holdings: "~20 A-REITs", yield: "~5%" },
                  { code: "SLF", manager: "SPDR", mer: "0.40%", holdings: "~30 A-REITs", yield: "~4.5%" },
                  { code: "DJRE", manager: "BetaShares", mer: "0.36%", holdings: "~100 global REITs", yield: "~3.5%" },
                ].map((r, i) => (
                  <tr key={r.code} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                    <td className="py-2.5 px-3 font-bold text-amber-700 border-b border-slate-100">{r.code}</td>
                    <td className="py-2.5 px-3 text-slate-800 border-b border-slate-100">{r.manager}</td>
                    <td className="py-2.5 px-3 text-slate-800 border-b border-slate-100">{r.mer}</td>
                    <td className="py-2.5 px-3 text-slate-500 border-b border-slate-100">{r.holdings}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800 border-b border-slate-100">{r.yield}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Section 4: How to Evaluate */}
      <section className="py-14 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 4</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">How to Evaluate A-REITs</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { metric: "Distribution Yield", desc: "Annual distributions divided by unit price. Higher yield can signal higher risk or lower growth." },
              { metric: "NTA Premium/Discount", desc: "Price vs Net Tangible Assets per unit. Trading below NTA may indicate value; above may indicate a premium for quality." },
              { metric: "Weighted Average Lease Expiry (WALE)", desc: "Longer WALE means more income certainty. Look for 5+ years in quality REITs." },
              { metric: "Occupancy Rate", desc: "Percentage of rentable space leased. Above 95% is strong; below 90% warrants investigation." },
              { metric: "Gearing (Debt-to-Assets)", desc: "Most A-REITs target 25–35% gearing. Above 40% signals elevated financial risk." },
              { metric: "Sector Exposure", desc: "Industrial and logistics have structural tailwinds; retail and office face headwinds from e-commerce and hybrid work." },
            ].map((m) => (
              <div key={m.metric} className="bg-white border border-slate-200 rounded-xl p-5">
                <p className="font-bold text-slate-900">{m.metric}</p>
                <p className="text-sm text-slate-500 mt-1">{m.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 5: Tax */}
      <section className="py-14 bg-white">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 5</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Tax Treatment of A-REIT Distributions</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h3 className="font-bold text-slate-900 mb-4">Australian Residents</h3>
              <div className="prose prose-slate max-w-none prose-sm">
                <ul>
                  <li><strong>Distributions</strong> — a mix of income, capital gains, and tax-deferred (return of capital) components</li>
                  <li><strong>Tax-deferred component</strong> — reduces your cost base rather than being taxed immediately; CGT payable on sale</li>
                  <li><strong>CGT on units</strong> — 50% CGT discount if held 12+ months</li>
                  <li><strong>SMSF</strong> — distributions taxed at 15% (accumulation) or 0% (pension phase)</li>
                </ul>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h3 className="font-bold text-slate-900 mb-4">Non-Resident Investors</h3>
              <div className="prose prose-slate max-w-none prose-sm">
                <ul>
                  <li><strong>Withholding tax</strong> — Fund Payment WHT applies to A-REIT distributions to non-residents</li>
                  <li><strong>Rate</strong> — typically 15% under MIT (Managed Investment Trust) regime for treaty country residents</li>
                  <li><strong>Non-treaty countries</strong> — 30% withholding</li>
                  <li><strong>Capital gains</strong> — non-residents generally exempt from CGT on listed A-REIT units (unless holding &gt;10% of the trust)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Risk */}
      <section className="py-14 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <div className="bg-red-50 border border-red-200 rounded-xl p-5">
            <h3 className="font-bold text-red-800 mb-2">Key Risks</h3>
            <ul className="text-sm text-red-700 space-y-1.5">
              <li><strong>Interest rate sensitivity</strong> — A-REITs typically fall when rates rise, as higher rates increase borrowing costs and make yields less attractive relative to bonds</li>
              <li><strong>Sector risk</strong> — office REITs face structural vacancy from hybrid work; retail REITs face e-commerce disruption</li>
              <li><strong>Gearing risk</strong> — highly leveraged REITs face refinancing risk in tight credit markets</li>
              <li><strong>Concentration risk</strong> — some REITs have significant exposure to a single tenant or geography</li>
              <li><strong>NTA discount risk</strong> — units can trade at persistent discounts to underlying property values</li>
            </ul>
          </div>
        </div>
      </section>


      {/* Compare Platforms */}
      {brokers && brokers.length > 0 && (
        <section className="py-14 bg-slate-50">
          <div className="container-custom max-w-4xl">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Compare Platforms</p>
            <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Where to Buy A-REITs</h2>
            <p className="text-sm text-slate-500 mb-6">Top-rated Australian platforms ranked by fees, features, and user ratings.</p>
            <div className="space-y-3">
              {(brokers as { id: number; name: string; slug: string; rating: number | null; asx_fee: string | null; min_deposit: string | null; affiliate_url: string | null; deal: boolean | null; deal_text: string | null; icon: string | null }[]).map((broker, i) => (
                <div key={broker.id} className={`flex items-center gap-4 bg-white border rounded-xl p-4 ${i === 0 ? "border-amber-300 ring-1 ring-amber-100" : "border-slate-200"}`}>
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 text-sm font-bold text-slate-400">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-slate-900">{broker.name}</p>
                      {SHOW_EDITORIAL_BADGES && i === 0 && <span className="text-[0.6rem] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">TOP RATED</span>}
                      {broker.deal && <span className="text-[0.6rem] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">DEAL</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      {SHOW_RATINGS && broker.rating && <span className="text-xs text-amber-600 font-semibold">&#9733; {broker.rating.toFixed(1)}</span>}
                      {broker.asx_fee && <span className="text-xs text-slate-500">ASX: {broker.asx_fee}</span>}
                      {broker.min_deposit && <span className="text-xs text-slate-500">Min: {broker.min_deposit}</span>}
                    </div>
                    {broker.deal_text && <p className="text-xs text-green-700 mt-1">{broker.deal_text}</p>}
                  </div>
                  {broker.affiliate_url ? (
                    <a
                      href={`/go/${broker.slug}`}
                      target="_blank"
                      rel="noopener noreferrer nofollow sponsored"
                      className="shrink-0 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
                    >
                      Visit Site &rarr;
                    </a>
                  ) : (
                    <Link
                      href={`/broker/${broker.slug}`}
                      className="shrink-0 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
                    >
                      View Details
                    </Link>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 text-center">
              <Link href="/compare" className="text-sm font-semibold text-amber-600 hover:text-amber-700">
                Compare all platforms &rarr;
              </Link>
            </div>
            {!SHOW_EDITORIAL_BADGES && (
              <p className="text-xs text-slate-400 mt-3">{FACTUAL_COMPARISON_DISCLAIMER}</p>
            )}
          </div>
        </section>
      )}

      {/* Find an Advisor */}
      {advisors && advisors.length > 0 && (
        <section className="py-14 bg-white">
          <div className="container-custom max-w-4xl">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Expert Advisors</p>
            <h2 className="text-2xl font-extrabold text-slate-900 mb-2">{ADVISOR_DIRECTORY_HEADING}</h2>
            <p className="text-sm text-slate-500 mb-6">{ADVISOR_DIRECTORY_SUBTEXT}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(advisors as { slug: string; name: string; firm_name: string | null; type: string; location_display: string | null; rating: number | null; review_count: number | null; photo_url: string | null; verified: boolean | null }[]).map((advisor) => (
                <Link
                  key={advisor.slug}
                  href={`/advisor/${advisor.slug}`}
                  className="flex items-start gap-4 bg-white border border-slate-200 rounded-xl p-4 hover:border-amber-200 hover:shadow-md transition-all group"
                >
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
                    {advisor.photo_url ? (
                      <Image src={advisor.photo_url} alt={advisor.name} width={48} height={48} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-lg font-bold text-slate-400">{advisor.name.charAt(0)}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-slate-900 group-hover:text-amber-600 transition-colors">{advisor.name}</p>
                      {SHOW_ADVISOR_VERIFIED_BADGE && advisor.verified && <span className="text-[0.6rem] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">VERIFIED</span>}
                    </div>
                    {advisor.firm_name && <p className="text-xs text-slate-500">{advisor.firm_name}</p>}
                    <div className="flex items-center gap-2 mt-1">
                      {SHOW_ADVISOR_RATINGS && advisor.rating && <span className="text-xs text-amber-600 font-semibold">&#9733; {advisor.rating.toFixed(1)}</span>}
                      {SHOW_ADVISOR_RATINGS && advisor.review_count && advisor.review_count > 0 && <span className="text-xs text-slate-400">({advisor.review_count} reviews)</span>}
                      {advisor.location_display && <span className="text-xs text-slate-400">{advisor.location_display}</span>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            <div className="mt-4 text-center">
              <Link href="/advisors" className="text-sm font-semibold text-amber-600 hover:text-amber-700">
                Browse all advisors &rarr;
              </Link>
            </div>
          </div>
        </section>
      )}
      {/* Related guides */}
      <section className="py-14 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Related Guides</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Explore Related Investment Guides</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { title: "Commercial Property", href: "/invest/commercial-property", desc: "Invest in Australian commercial property — offices, retail, industrial." },
              { title: "Infrastructure", href: "/invest/infrastructure", desc: "Toll roads, airports, utilities and ports for stable inflation-linked income." },
              { title: "Dividend Investing", href: "/invest/dividend-investing", desc: "High-yield ASX stocks, franking credits explained, and dividend ETFs." },
              { title: "SMSF Investment Guide", href: "/invest/smsf", desc: "What SMSFs actually invest in — property, shares, crypto and more." },
            ].map((guide) => (
              <Link key={guide.href} href={guide.href} className="group bg-white border border-slate-200 rounded-xl p-5 hover:border-amber-200 hover:shadow-md transition-all">
                <h3 className="font-bold text-slate-900 group-hover:text-amber-600 transition-colors">{guide.title}</h3>
                <p className="text-sm text-slate-500 mt-1">{guide.desc}</p>
                <span className="inline-flex items-center text-amber-600 text-sm font-semibold mt-2">Read guide →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-14 bg-white">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">FAQ</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {faqSchema.mainEntity.map((faq: { name: string; acceptedAnswer: { text: string } }) => (
              <details key={faq.name} className="group bg-white border border-slate-200 rounded-xl">
                <summary className="flex items-center justify-between px-5 py-4 cursor-pointer text-sm font-bold text-slate-900 hover:text-amber-600 transition-colors">
                  {faq.name}
                  <svg className="w-4 h-4 text-slate-400 shrink-0 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </summary>
                <div className="px-5 pb-4 text-sm text-slate-600 leading-relaxed">{faq.acceptedAnswer.text}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-14 bg-white">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-xl p-8 flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
              <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-slate-900 mb-1">Get Help Building a Property Portfolio</h2>
              <p className="text-sm text-slate-500">
                A financial planner can help you determine the right REIT allocation for your portfolio, including tax-efficient strategies for SMSFs.
              </p>
            </div>
            <Link
              href="/advisors/financial-planners"
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors shrink-0"
            >
              Find a Financial Planner &rarr;
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
