import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, SITE_NAME, CURRENT_YEAR } from "@/lib/seo";
import ContextualLeadMagnet from "@/components/ContextualLeadMagnet";

export const metadata: Metadata = {
  title: `SMSF Investment Guide — What SMSFs Actually Invest In (${CURRENT_YEAR})`,
  description:
    "Comprehensive SMSF investment strategy guide — property through SMSF (LRBA), shares, crypto, collectibles, in-house asset rules, limited recourse borrowing, and platform comparison.",
  alternates: { canonical: `${SITE_URL}/invest/smsf` },
  openGraph: {
    title: `SMSF Investment Guide — What SMSFs Actually Invest In (${CURRENT_YEAR})`,
    description:
      "Comprehensive SMSF investment strategy guide — property through SMSF (LRBA), shares, crypto, collectibles, in-house asset rules, limited recourse borrowing, and platform comparison.",
    url: `${SITE_URL}/invest/smsf`,
  },
};

export const revalidate = 3600;

export default async function SmsfInvestmentPage() {
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
    .in("type", ["smsf_accountant", "financial_planner"])
    .order("verified", { ascending: false })
    .order("rating", { ascending: false })
    .limit(4);

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Invest", url: `${SITE_URL}/invest` },
    { name: "SMSF Investment Guide" },
  ]);

  const webPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `SMSF Investment Guide (${CURRENT_YEAR})`,
    url: `${SITE_URL}/invest/smsf`,
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      { "@type": "Question", name: "Can an SMSF invest in property?", acceptedAnswer: { "@type": "Answer", text: "Yes, SMSFs can invest in both residential and commercial property. Direct property is held by approximately 15% of SMSFs. An SMSF can even borrow to buy property using a Limited Recourse Borrowing Arrangement (LRBA), though this requires a bare trust structure and has strict rules. Commercial property can be leased to a member's business, but residential property cannot be used by any member or related party." } },
      { "@type": "Question", name: "What is a Limited Recourse Borrowing Arrangement (LRBA)?", acceptedAnswer: { "@type": "Answer", text: "An LRBA allows an SMSF to borrow money to purchase a single asset (typically property) through a bare trust. The key feature is that if the SMSF defaults, the lender can only seize the specific property — not other SMSF assets. LRBAs require a 20-30% deposit, carry interest rates 1-2% above standard investment loans, and the property cannot be significantly improved while the loan is outstanding." } },
      { "@type": "Question", name: "Can an SMSF hold cryptocurrency?", acceptedAnswer: { "@type": "Answer", text: "Yes, SMSFs can legally invest in cryptocurrency. However, crypto must be documented in the SMSF investment strategy with a risk assessment and allocation limits. It must be held in the name of the SMSF trustee (not personal wallets), valued at market value for annual financial statements, and have a complete audit trail. ASX-listed crypto ETFs (IBTC, IETH, EBTC, EETH) are a simpler alternative to direct crypto holdings." } },
      { "@type": "Question", name: "What are the collectibles rules for SMSFs?", acceptedAnswer: { "@type": "Answer", text: "SMSFs can hold collectibles (artwork, wine, jewellery, coins, cars) under strict ATO Regulation 13.18AA. Collectibles cannot be used or displayed by a member or related party, cannot be stored in a member's private residence, must be stored in a secure independent facility, must be insured within 7 days of acquisition, and all transfers must be at arm's length with independent valuations." } },
      { "@type": "Question", name: "What is the minimum SMSF balance recommended?", acceptedAnswer: { "@type": "Answer", text: "Most financial advisers recommend a minimum SMSF balance of $200,000-$500,000 to make the structure cost-effective. Annual running costs including audit, accounting, administration, and insurance typically range from $2,000-$5,000+. With a $200,000 balance, these costs represent 1-2.5% of assets — comparable to or higher than an industry super fund. Below this threshold, an industry or retail fund is usually more cost-effective." } },
      { "@type": "Question", name: "What is the in-house asset rule?", acceptedAnswer: { "@type": "Answer", text: "The in-house asset rule limits SMSF investments in related parties to 5% of total fund assets. In-house assets include loans to members, investments in related trusts or companies, and property leased to related parties. The key exception is commercial property leased to a member's business at market rent, which is exempt from this 5% limit — making it one of the most popular SMSF strategies." } },
      { "@type": "Question", name: "How does an SMSF compare to an industry super fund?", acceptedAnswer: { "@type": "Answer", text: "SMSFs offer full investment control, ability to hold direct property, access to specific assets like private credit and collectibles, and potential tax optimisation (especially franking credit strategies). Industry funds offer lower costs for smaller balances, professional management, group insurance, and no trustee responsibilities. SMSFs are best suited for engaged investors with $200K+ who want specific investment strategies not available through industry funds." } },
      { "@type": "Question", name: "What are the annual costs of running an SMSF?", acceptedAnswer: { "@type": "Answer", text: "Typical annual SMSF costs include: accounting and tax return preparation ($1,000-$2,500), independent audit ($500-$1,500), ASIC annual levy ($259), ATO supervisory levy ($259), investment platform/brokerage fees (variable), and optional financial advice. Total costs typically range from $2,000-$5,000+ per year depending on complexity. LRBAs and direct property add further costs for legal structures and compliance." } },
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
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-14 md:py-20">
        <div className="container-custom">
          <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-6" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <span className="text-slate-600">/</span>
            <Link href="/invest" className="hover:text-white transition-colors">Invest</Link>
            <span className="text-slate-600">/</span>
            <span className="text-slate-300">SMSF Investment Guide</span>
          </nav>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-xs font-semibold bg-amber-500 text-slate-900 px-3 py-1 rounded-full">
              Updated {CURRENT_YEAR}
            </span>
            <span className="text-xs font-semibold bg-slate-700 text-slate-200 px-3 py-1 rounded-full">
              600,000+ SMSFs &middot; $900B+ Assets
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-4 max-w-3xl">
            SMSF Investment Guide: What SMSFs Actually Invest In
          </h1>
          <p className="text-lg text-slate-300 leading-relaxed max-w-2xl">
            Australia has over 600,000 self-managed super funds controlling $900B+ in assets. This guide covers not just SMSF setup — but what SMSFs actually invest in and how, from property and shares to crypto and collectibles.
          </p>
          <div className="flex flex-wrap gap-3 mt-6">
            <Link
              href="/find-advisor"
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors"
            >
              Find an Advisor &rarr;
            </Link>
            <Link
              href="/quiz"
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold text-sm px-5 py-2.5 rounded-lg border border-white/20 transition-colors"
            >
              Take the Quiz (60s)
            </Link>
          </div>
        </div>
      </section>

      {/* Key stats */}
      <section className="py-10 bg-white border-b border-slate-100">
        <div className="container-custom">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { value: "600,000+", label: "Self-managed super funds in Australia" },
              { value: "$900B+", label: "Total SMSF assets under management" },
              { value: "15%", label: "Accumulation phase tax rate" },
              { value: "0%", label: "Pension phase tax rate" },
            ].map((s) => (
              <div key={s.label} className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-center">
                <p className="text-2xl font-extrabold text-amber-600">{s.value}</p>
                <p className="text-xs text-slate-600 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 1: SMSF Asset Allocation */}
      <section className="py-14 bg-white">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 1</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">How SMSFs Allocate Their Assets</h2>

          <div className="prose prose-slate max-w-none mb-6">
            <p>
              According to ATO data, Australian SMSFs collectively allocate their assets as follows:
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
            {[
              { asset: "Listed shares", pct: "~30%", note: "ASX stocks & ETFs" },
              { asset: "Cash & term deposits", pct: "~18%", note: "ADI deposits" },
              { asset: "Property (direct)", pct: "~15%", note: "Residential & commercial" },
              { asset: "Managed funds", pct: "~12%", note: "Active & passive" },
              { asset: "Bonds & fixed income", pct: "~8%", note: "Including hybrids" },
              { asset: "Other", pct: "~17%", note: "Crypto, collectibles, unlisted, private credit" },
            ].map((a) => (
              <div key={a.asset} className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-center">
                <p className="text-2xl font-extrabold text-amber-600">{a.pct}</p>
                <p className="text-sm font-bold text-slate-800 mt-1">{a.asset}</p>
                <p className="text-xs text-slate-500">{a.note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 2: Property Through SMSF */}
      <section className="py-14 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 2</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">Property Through SMSF (LRBA)</h2>

          <div className="prose prose-slate max-w-none mb-6">
            <p>
              SMSFs can borrow to buy property using a <strong>Limited Recourse Borrowing Arrangement (LRBA)</strong>. This is one of the most popular SMSF investment strategies — but also one of the most complex and regulated.
            </p>
          </div>

          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-3">How LRBA Works</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { step: "1. Bare trust", detail: "Property is held in a separate bare trust (holding trust) until the loan is fully repaid" },
                  { step: "2. Limited recourse", detail: "If the SMSF defaults, the lender can only seize the specific property — not other SMSF assets" },
                  { step: "3. Single asset", detail: "Each LRBA can only acquire a single acquirable asset (one property, not multiple)" },
                  { step: "4. No improvements", detail: "You can maintain the property but cannot make significant improvements while the loan is outstanding" },
                ].map((s) => (
                  <div key={s.step} className="bg-slate-50 rounded-lg p-3">
                    <p className="text-sm font-bold text-slate-900">{s.step}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{s.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-3">Key Rules</h3>
              <dl className="space-y-3">
                {[
                  { dt: "Sole purpose test", dd: "Property must be for retirement benefit only — no members or related parties can live in or use the property" },
                  { dt: "Arm's length", dd: "Must be purchased and rented at market rates; can buy commercial property from a member's business" },
                  { dt: "LVR (Leverage)", dd: "SMSF loans typically require 20–30% deposit; interest rates are 1–2% above standard investment loans" },
                  { dt: "Insurance", dd: "Property must be adequately insured in the name of the SMSF trustee" },
                  { dt: "Residential vs Commercial", dd: "Residential: cannot be leased to or used by any member. Commercial: CAN be leased to a member's business" },
                ].map((item) => (
                  <div key={item.dt} className="flex justify-between gap-3 py-2 border-b border-slate-100 last:border-0">
                    <dt className="text-sm text-slate-500 shrink-0">{item.dt}</dt>
                    <dd className="text-sm font-semibold text-slate-800 text-right">{item.dd}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </section>

      {/* Lead Magnet */}
      <section className="py-14 bg-white">
        <div className="container-custom max-w-4xl">
          <ContextualLeadMagnet segment="smsf-checklist" />
        </div>
      </section>

      {/* Section 3: Shares & ETFs in SMSF */}
      <section className="py-14 bg-white">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 3</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">Shares &amp; ETFs Through SMSF</h2>

          <div className="prose prose-slate max-w-none mb-6">
            <p>
              Listed shares are the most popular SMSF asset class (~30% of total assets). The combination of franked dividends and the concessional super tax rate makes SMSF share investing extremely tax-efficient.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h3 className="font-bold text-slate-900 mb-4">Tax Advantages</h3>
              <dl className="space-y-3">
                {[
                  { dt: "Dividends (accumulation)", dd: "15% tax (vs. up to 47% personal)" },
                  { dt: "Franking credits", dd: "30% credit offsets 15% tax = net refund" },
                  { dt: "Dividends (pension)", dd: "0% tax + full franking credit refund" },
                  { dt: "CGT (accumulation)", dd: "15% (or 10% if held 12+ months)" },
                  { dt: "CGT (pension)", dd: "0% — completely exempt" },
                ].map((item) => (
                  <div key={item.dt} className="flex justify-between gap-3 py-2 border-b border-slate-100 last:border-0">
                    <dt className="text-sm text-slate-500 shrink-0">{item.dt}</dt>
                    <dd className="text-sm font-semibold text-slate-800 text-right">{item.dd}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h3 className="font-bold text-slate-900 mb-4">SMSF Trading Platforms</h3>
              <div className="space-y-3">
                {[
                  { platform: "CommSec", desc: "Most popular SMSF broker; integrated with CommBank SMSF admin" },
                  { platform: "Interactive Brokers", desc: "Lowest fees for active SMSF traders; global market access" },
                  { platform: "Stake SMSF", desc: "SMSF-specific product; $0 ASX brokerage; auto admin reports" },
                  { platform: "CMC Markets Stockbroking", desc: "Low brokerage ($0 on first trade/day); SMSF-friendly" },
                  { platform: "Hatch Invest", desc: "US shares access for SMSFs; FX fees but no brokerage" },
                ].map((p) => (
                  <div key={p.platform} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-slate-900">{p.platform}</p>
                      <p className="text-xs text-slate-500">{p.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: Crypto Through SMSF */}
      <section className="py-14 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 4</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">Crypto Through SMSF</h2>

          <div className="prose prose-slate max-w-none mb-6">
            <p>
              SMSFs can legally invest in cryptocurrency, but trustees must ensure compliance with the <strong>sole purpose test</strong>, <strong>investment strategy requirements</strong>, and <strong>ATO valuation rules</strong>.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { rule: "Investment strategy", detail: "Crypto must be documented in the SMSF investment strategy with risk assessment and allocation limits" },
              { rule: "Custody", detail: "Crypto must be held in the name of the SMSF trustee (not personal wallets). Use institutional custody or SMSF-specific exchange accounts." },
              { rule: "Valuation", detail: "Crypto must be valued at market value for annual financial statements and auditing" },
              { rule: "Audit trail", detail: "Complete transaction records required for SMSF audit. Use crypto tax tools integrated with your SMSF admin." },
            ].map((r) => (
              <div key={r.rule} className="bg-white border border-slate-200 rounded-xl p-5">
                <p className="font-bold text-slate-900">{r.rule}</p>
                <p className="text-sm text-slate-500 mt-1">{r.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 5: Collectibles & In-House Assets */}
      <section className="py-14 bg-white">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 5</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">Collectibles &amp; In-House Asset Rules</h2>

          <div className="prose prose-slate max-w-none mb-6">
            <p>
              SMSFs can hold collectibles (artwork, wine, jewellery, coins, cars) but face strict ATO rules. The in-house assets rule also limits related-party transactions.
            </p>
          </div>

          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-3">Collectible Rules (Reg 13.18AA)</h3>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-start gap-2"><span className="text-red-500 font-bold shrink-0">x</span> Cannot be used or displayed by a member or related party</li>
                <li className="flex items-start gap-2"><span className="text-red-500 font-bold shrink-0">x</span> Cannot be stored in a member&apos;s private residence</li>
                <li className="flex items-start gap-2"><span className="text-green-600 font-bold shrink-0">✓</span> Must be stored in a secure, independent facility</li>
                <li className="flex items-start gap-2"><span className="text-green-600 font-bold shrink-0">✓</span> Must be insured in the name of the SMSF within 7 days of acquisition</li>
                <li className="flex items-start gap-2"><span className="text-green-600 font-bold shrink-0">✓</span> Transfers must be at arm&apos;s length and independently valued</li>
              </ul>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-3">In-House Asset Rule (5% limit)</h3>
              <div className="prose prose-slate max-w-none prose-sm">
                <p>
                  The in-house asset rule limits the value of investments in related parties (loans to members, investments in related trusts/companies, property leased to related parties) to <strong>5% of total SMSF assets</strong>. The key exception: commercial property leased to a member&apos;s business is exempt from this rule, making it a popular strategy.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 6: LRBA vs Other Strategies */}
      <section className="py-14 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 6</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">SMSF Investment Strategies Compared</h2>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  <th className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">Strategy</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">Return Type</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">Tax Efficiency</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">Complexity</th>
                  <th className="text-left py-2.5 px-3 font-semibold text-slate-700 border-b border-slate-200">Minimum</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { strategy: "Franked dividend shares", type: "Income + growth", tax: "Exceptional (franking refund)", complexity: "Low", min: "$5K" },
                  { strategy: "Index ETFs (VAS, VGS)", type: "Growth + income", tax: "High (low turnover)", complexity: "Very low", min: "$500" },
                  { strategy: "LRBA property", type: "Rental income + growth", tax: "Good (geared)", complexity: "Very high", min: "$200K+ SMSF balance" },
                  { strategy: "Private credit funds", type: "Income", tax: "Good (15% on interest)", complexity: "Medium", min: "$20K" },
                  { strategy: "Bank hybrids", type: "Income (franked)", tax: "Exceptional (franking refund)", complexity: "Low-medium", min: "$5K" },
                  { strategy: "Direct commercial property", type: "Rental income + growth", tax: "Good (related party lease ok)", complexity: "High", min: "$300K+ SMSF balance" },
                  { strategy: "Crypto (BTC/ETH via ETF)", type: "Growth", tax: "Good (standard CGT)", complexity: "Low", min: "$500" },
                ].map((r, i) => (
                  <tr key={r.strategy} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                    <td className="py-2.5 px-3 font-bold text-amber-700 border-b border-slate-100">{r.strategy}</td>
                    <td className="py-2.5 px-3 text-slate-800 border-b border-slate-100">{r.type}</td>
                    <td className="py-2.5 px-3 text-slate-500 border-b border-slate-100">{r.tax}</td>
                    <td className="py-2.5 px-3 text-slate-500 border-b border-slate-100">{r.complexity}</td>
                    <td className="py-2.5 px-3 text-slate-500 border-b border-slate-100">{r.min}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Risk */}
      <section className="py-14 bg-white">
        <div className="container-custom max-w-4xl">
          <div className="bg-red-50 border border-red-200 rounded-xl p-5">
            <h3 className="font-bold text-red-800 mb-2">Key SMSF Risks</h3>
            <ul className="text-sm text-red-700 space-y-1.5">
              <li><strong>Trustee liability</strong> — SMSF trustees are personally liable for compliance; ATO penalties for breaches can be severe</li>
              <li><strong>Concentration risk</strong> — many SMSFs are insufficiently diversified (e.g., single property via LRBA consuming 70%+ of assets)</li>
              <li><strong>LRBA cashflow risk</strong> — loan repayments continue regardless of rental vacancy or market downturns</li>
              <li><strong>Sole purpose test</strong> — all investments must be for the sole purpose of providing retirement benefits</li>
              <li><strong>Audit and compliance costs</strong> — annual audit, accounting, and admin costs of $2,000–$5,000+ p.a.</li>
              <li><strong>Minimum balance</strong> — generally not cost-effective for SMSF balances below $200,000–$500,000</li>
            </ul>
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


      {/* Compare Platforms */}
      {brokers && brokers.length > 0 && (
        <section className="py-14 bg-slate-50">
          <div className="container-custom max-w-4xl">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Compare Platforms</p>
            <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Best SMSF Trading Platforms</h2>
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
                      {i === 0 && <span className="text-[0.6rem] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">TOP RATED</span>}
                      {broker.deal && <span className="text-[0.6rem] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">DEAL</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      {broker.rating && <span className="text-xs text-amber-600 font-semibold">&#9733; {broker.rating.toFixed(1)}</span>}
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
          </div>
        </section>
      )}

      {/* Find an Advisor */}
      {advisors && advisors.length > 0 && (
        <section className="py-14 bg-white">
          <div className="container-custom max-w-4xl">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Expert Advisors</p>
            <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Speak to a Verified Professional</h2>
            <p className="text-sm text-slate-500 mb-6">ASIC-registered advisors verified by Invest.com.au. Free initial consultation.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(advisors as { slug: string; name: string; firm_name: string | null; type: string; location_display: string | null; rating: number | null; review_count: number | null; photo_url: string | null; verified: boolean | null }[]).map((advisor) => (
                <Link
                  key={advisor.slug}
                  href={`/advisor/${advisor.slug}`}
                  className="flex items-start gap-4 bg-white border border-slate-200 rounded-xl p-4 hover:border-amber-200 hover:shadow-md transition-all group"
                >
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
                    {advisor.photo_url ? (
                      <img src={advisor.photo_url} alt={advisor.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-lg font-bold text-slate-400">{advisor.name.charAt(0)}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-slate-900 group-hover:text-amber-600 transition-colors">{advisor.name}</p>
                      {advisor.verified && <span className="text-[0.6rem] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">VERIFIED</span>}
                    </div>
                    {advisor.firm_name && <p className="text-xs text-slate-500">{advisor.firm_name}</p>}
                    <div className="flex items-center gap-2 mt-1">
                      {advisor.rating && <span className="text-xs text-amber-600 font-semibold">&#9733; {advisor.rating.toFixed(1)}</span>}
                      {advisor.review_count && advisor.review_count > 0 && <span className="text-xs text-slate-400">({advisor.review_count} reviews)</span>}
                      {advisor.location_display && <span className="text-xs text-slate-400">{advisor.location_display}</span>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            <div className="mt-4 text-center">
              <Link href="/find-advisor" className="text-sm font-semibold text-amber-600 hover:text-amber-700">
                Browse all advisors &rarr;
              </Link>
            </div>
          </div>
        </section>
      )}
      {/* Related guides */}
      <section className="py-14 bg-white">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Related Guides</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Explore Related Investment Guides</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { title: "Dividend Investing", href: "/invest/dividend-investing", desc: "High-yield ASX stocks, franking credits explained, and dividend ETFs." },
              { title: "Private Credit & P2P Lending", href: "/invest/private-credit", desc: "Private credit funds and P2P platforms offering yields above term deposits." },
              { title: "A-REITs", href: "/invest/reits", desc: "ASX-listed property trusts for diversified real estate exposure and income." },
              { title: "Hybrid Securities", href: "/invest/hybrid-securities", desc: "ASX-listed bank hybrids offering franked yields above term deposits." },
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

      {/* CTA */}
      <section className="py-14 bg-slate-50">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-xl p-8 flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
              <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-slate-900 mb-1">Find an SMSF Specialist</h2>
              <p className="text-sm text-slate-500">
                An SMSF accountant can help with setup, compliance, investment strategy, and annual audit requirements.
              </p>
            </div>
            <Link
              href="/advisors/smsf-accountants"
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors shrink-0"
            >
              Find an SMSF Accountant &rarr;
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
