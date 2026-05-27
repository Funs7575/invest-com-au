import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL, absoluteUrl } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

const FAQS = [
  {
    q: "Which has better long-term returns: shares or property?",
    a: "Historically, Australian shares and residential property have delivered similar long-term total returns — roughly 8–10% p.a. including dividends/rent and capital growth. The comparison depends heavily on which shares (ASX All Ords vs an individual stock), which property (Sydney vs regional, house vs unit), the time period measured, and whether leverage is applied. The key difference: property returns are commonly quoted as ungeared (no debt), but most property investors use leverage (mortgage), which amplifies both returns and risk.",
  },
  {
    q: "Is property safer than shares?",
    a: "Property feels safer because price volatility is invisible — you can't check the daily price of your house on your phone. But residential property prices do fall significantly in downturns (Sydney fell ~15–20% in 2017–19 and again in 2022). The lack of daily price visibility reduces panic selling, which is a real behavioral advantage. Shares are more liquid but mentally more volatile. Concentration risk is also a factor: a single investment property is a large, undiversified bet on one street in one suburb.",
  },
  {
    q: "Can I negative gear shares?",
    a: "Yes. If you borrow to buy shares and the interest costs exceed the dividend income, the loss is deductible against other income — exactly like property negative gearing. Using a margin loan or investment loan to buy shares is common. However, shares don't typically generate the same magnitude of leverage as property (most residential mortgages are 80% LVR; margin loans cap at 60-70% LVR on eligible stocks, often less). The negative gearing tax benefit is the same mechanism for both asset classes.",
  },
  {
    q: "What are the transaction costs for each?",
    a: "Property transaction costs are very high: stamp duty (3–5% of purchase price), conveyancing ($1,500–$3,000), building/pest inspections ($600–$1,200), and agent fees on sale (2–3% of sale price). On a $1M property, buying and selling can cost $70,000–$100,000+. Shares have very low transaction costs: brokerage of $0–$20 per trade for ETFs, with no stamp duty. This means shares require less capital gain to break even on a round-trip, and DCA investing small amounts regularly is practical.",
  },
  {
    q: "Do shares or property have better tax treatment?",
    a: "Both benefit from the 50% CGT discount after 12 months' ownership. Key differences: (1) Dividends from shares can carry franking credits (effectively a tax credit worth 30% of the dividend for most taxpayers) — no equivalent for rental income; (2) Depreciation deductions on new property (Div 40 plant/equipment, Div 43 building works) can significantly reduce taxable rental income with no cash outflow; (3) Property can leverage CGT main residence exemption (if lived in) and the 6-year rule; (4) Super is a highly tax-effective vehicle for shares but less so for direct property due to size constraints.",
  },
  {
    q: "Should I use my super to invest in property?",
    a: "Retail and industry super funds invest in property indirectly (through listed REITs and unlisted property trusts). Direct residential property in super via an SMSF is possible but requires $300,000+ fund balance, an LRBA for the mortgage, and means the property is professionally managed at market rent — you cannot live in it. For most people, keeping super invested in a diversified fund (including property allocations) is more efficient than the concentration and compliance cost of SMSF direct property.",
  },
];

const COMPARISON_ROWS = [
  { aspect: "Minimum entry", shares: "$0 (micro-investing) to $500 (broker)", property: "$50,000–$200,000 (deposit + costs)" },
  { aspect: "Leverage available", shares: "Up to 60–70% (margin loan)", property: "80–95% (mortgage, LMI above 80%)" },
  { aspect: "Liquidity", shares: "High — sell in seconds on ASX", property: "Low — weeks to months to sell" },
  { aspect: "Transaction costs", shares: "$0–$20 brokerage (ETFs)", property: "$50,000–$100,000+ (stamp duty, agents)" },
  { aspect: "Ongoing costs", shares: "0.04%–0.3% MER (ETFs)", property: "Rates, insurance, maintenance (~1–1.5% p.a.)" },
  { aspect: "Income", shares: "Dividends + franking credits", property: "Rent (fully taxable)" },
  { aspect: "CGT discount (12+ months)", shares: "50% discount", property: "50% discount" },
  { aspect: "Tax deductions", shares: "Interest, management fees", property: "Interest, rates, depreciation, repairs" },
  { aspect: "Diversification", shares: "Very easy with ETFs ($200 buys 300 stocks)", property: "Difficult (single large concentrated bet)" },
  { aspect: "Time commitment", shares: "Minimal with ETFs", property: "Significant (tenants, maintenance, compliance)" },
  { aspect: "Emotional volatility", shares: "Daily price visibility — hard emotionally", property: "Invisible volatility — easier to hold" },
  { aspect: "Leverage quality", shares: "Margin call risk — forced selling at bottom", property: "No margin call — bank calls only on default" },
];

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Shares vs Property — The Australian Comparison (${CURRENT_YEAR})`,
  description: `Shares vs property: returns, leverage, tax, liquidity, costs, and which is right for you. The definitive Australian comparison with data. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Shares vs Property Australia (${CURRENT_YEAR}) — Full Comparison`,
    description: "Historical returns, leverage, tax treatment, liquidity, and transaction costs compared. Which is better for Australian investors?",
    url: `${SITE_URL}/invest/shares-vs-property`,
    images: [{ url: `/api/og?title=${encodeURIComponent("Shares vs Property Australia")}&sub=${encodeURIComponent("Returns · Leverage · Tax · Liquidity · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/invest/shares-vs-property` },
};

export default function SharesVsPropertyPage() {
  const faq = faqJsonLd(FAQS);
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Invest", url: absoluteUrl("/invest") },
    { name: "Shares vs Property", url: absoluteUrl("/invest/shares-vs-property") },
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      {faq && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }} />}

      <div className="bg-white min-h-screen">
        {/* Hero */}
        <section className="bg-slate-900 text-white py-10 md:py-14">
          <div className="container-custom max-w-5xl">
            <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-5" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-white">Home</Link>
              <span className="text-slate-600">/</span>
              <Link href="/invest" className="hover:text-white">Invest</Link>
              <span className="text-slate-600">/</span>
              <span className="text-white font-medium">Shares vs Property</span>
            </nav>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="text-xs font-semibold bg-amber-500 text-slate-900 px-3 py-1 rounded-full">{UPDATED_LABEL}</span>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-4 max-w-3xl">
              Shares vs Property: The Australian Comparison ({CURRENT_YEAR})
            </h1>
            <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-2xl mb-8">
              Both have delivered strong long-term returns for Australians. The better choice depends on your capital, time horizon, tax position, and ability to handle volatility — not on which one &ldquo;wins.&rdquo;
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "ASX All Ords avg return (30yr)", value: "~10%" },
                { label: "Sydney property avg return (30yr)", value: "~8%" },
                { label: "Property stamp duty + agent fees", value: "$70K+" },
                { label: "ETF brokerage cost per trade", value: "$0–$20" },
              ].map((s) => (
                <div key={s.label} className="bg-white/10 rounded-xl p-4 text-center">
                  <p className="text-2xl font-extrabold text-amber-400">{s.value}</p>
                  <p className="text-xs text-slate-300 mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Returns section */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">Historical returns: the honest picture</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
                <h3 className="font-extrabold text-amber-900 mb-3">Australian shares (ASX All Ords)</h3>
                <ul className="space-y-2 text-sm text-slate-700">
                  <li>Long-run total return (dividends reinvested): ~10% p.a.</li>
                  <li>Franking credits add ~0.5–1% effective yield for resident investors</li>
                  <li>2000–2024: significant variability — dot-com crash, GFC, COVID, recovery</li>
                  <li>Entry costs: near-zero for ETFs</li>
                  <li>Diversification: instant with index ETF</li>
                </ul>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="font-extrabold text-slate-900 mb-3">Australian residential property</h3>
                <ul className="space-y-2 text-sm text-slate-700">
                  <li>Sydney long-run total return (rent + growth): ~8–9% p.a. (ungeared)</li>
                  <li>Strong leverage amplifies returns AND losses</li>
                  <li>Returns vary dramatically by location and type</li>
                  <li>Entry costs: $50,000–$200,000 (deposit + stamp duty)</li>
                  <li>Single asset = concentrated undiversified risk</li>
                </ul>
              </div>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm text-blue-900">
                <strong>Leverage reality check:</strong> When Australians say property &ldquo;outperforms&rdquo; shares, they usually mean geared property vs ungeared shares. Borrowing at 80% LVR to buy a $1M property and the value rises 8% means your $200K equity grows by $80K (40% return on equity). But if you borrowed at 80% to buy $1M of shares and they rose 8%, you&apos;d get the same. The leverage is what drives the return — not the asset class.
              </p>
            </div>
          </div>
        </section>

        {/* Full comparison table */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">Head-to-head comparison</h2>
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-slate-900 text-white">
                  <tr>
                    <th className="px-4 py-3 text-left font-extrabold">Factor</th>
                    <th className="px-4 py-3 text-left font-extrabold text-amber-300">Shares</th>
                    <th className="px-4 py-3 text-left font-extrabold">Property</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {COMPARISON_ROWS.map((r, i) => (
                    <tr key={r.aspect} className={i % 2 === 0 ? "" : "bg-slate-50"}>
                      <td className="px-4 py-3 font-bold text-slate-900">{r.aspect}</td>
                      <td className="px-4 py-3 text-slate-700">{r.shares}</td>
                      <td className="px-4 py-3 text-slate-700">{r.property}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Tax comparison */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">Tax treatment compared</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h3 className="font-extrabold text-slate-900">Shares tax advantages</h3>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-slate-700">
                  <p className="font-bold mb-1">Franking credits</p>
                  <p>Dividends from Australian companies carry a tax credit (franking credit) equal to the 30% company tax already paid. For an investor on 32.5% tax, a $1,000 franked dividend means ~$428 in franking credits offset against your tax bill.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  <p className="font-bold mb-1">Super-friendly</p>
                  <p>Shares in an SMSF or retail super fund are taxed at 15% (accumulation) or 0% (pension phase). Franking credits generate cash refunds inside super funds paying zero tax. This is a significant advantage over property in super.</p>
                </div>
              </div>
              <div className="space-y-3">
                <h3 className="font-extrabold text-slate-900">Property tax advantages</h3>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-slate-700">
                  <p className="font-bold mb-1">Depreciation deductions</p>
                  <p>New property investors can claim Div 40 (plant and equipment, e.g., appliances, carpets) and Div 43 (building allowance 2.5% of construction cost). These are non-cash deductions that reduce taxable rental income — no equivalent for shares.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  <p className="font-bold mb-1">Main residence exemption</p>
                  <p>Your primary home is CGT-free on sale. The 6-year rule also exempts a former home rented out for up to 6 years. No equivalent exemption exists for share portfolios.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Who should choose what */}
        <section className="py-12 bg-amber-50 border-y border-amber-200">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-amber-900 mb-6">Which suits your situation?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-amber-300 bg-white p-5">
                <h3 className="font-extrabold text-amber-900 mb-3">Shares may suit you if:</h3>
                <ul className="space-y-2 text-sm text-slate-700">
                  <li>You have limited capital (can start with $500)</li>
                  <li>You want liquidity — ability to sell quickly</li>
                  <li>You value diversification (ETF = 200–500 stocks)</li>
                  <li>You want minimal ongoing management time</li>
                  <li>You are investing through super (highly tax-efficient)</li>
                  <li>You are in a high tax bracket and want franking credits</li>
                </ul>
              </div>
              <div className="rounded-xl border border-amber-300 bg-white p-5">
                <h3 className="font-extrabold text-amber-900 mb-3">Property may suit you if:</h3>
                <ul className="space-y-2 text-sm text-slate-700">
                  <li>You have a stable income to service a mortgage</li>
                  <li>You want to use leverage without margin call risk</li>
                  <li>You have specific local market knowledge</li>
                  <li>You want to buy business premises in an SMSF</li>
                  <li>You respond better to invisible volatility (can&apos;t check the price daily)</li>
                  <li>You plan to live in it first (main residence exemption)</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-3xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">Frequently asked questions</h2>
            <div className="space-y-2">
              {FAQS.map((item) => (
                <details key={item.q} className="group rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
                  <summary className="flex items-center justify-between gap-3 px-5 py-4 cursor-pointer list-none font-bold text-slate-900 text-sm hover:bg-slate-100 transition-colors">
                    {item.q}
                    <span className="shrink-0 text-slate-400 group-open:rotate-180 transition-transform">&#9660;</span>
                  </summary>
                  <p className="px-5 pb-4 text-sm text-slate-700 leading-relaxed">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Compliance footer */}
        <section className="py-10 bg-slate-50 border-t border-slate-200">
          <div className="container-custom max-w-3xl">
            <p className="text-xs text-slate-500 leading-relaxed mb-6">{GENERAL_ADVICE_WARNING}</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <Link href="/invest/index-funds" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">
                Index funds guide &#8594;
              </Link>
              <Link href="/property" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">
                Property investing &#8594;
              </Link>
              <Link href="/property-vs-shares-calculator" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">
                Calculator &#8594;
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
