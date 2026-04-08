import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL } from "@/lib/seo";
import { FOREIGN_INVESTOR_GENERAL_DISCLAIMER } from "@/lib/compliance";
import ForeignInvestmentNav from "../ForeignInvestmentNav";
import SectionHeading from "@/components/SectionHeading";

export const metadata: Metadata = {
  title: "Send Money to Australia — Best FX Transfer Options for Foreign Investors (2026)",
  description:
    "Compare the best ways to send money to Australia as a foreign investor. Wise vs OFX vs WorldFirst vs bank transfer — exchange rates, fees, and which to use for property settlement vs share investing. Updated March 2026.",
  openGraph: {
    title: "Send Money to Australia — FX Transfer Comparison 2026",
    description:
      "Wise, OFX, WorldFirst, and Remitly vs bank transfers: exchange rates, fees, transfer limits, and which to use for Australian property vs shares.",
    url: `${SITE_URL}/foreign-investment/send-money-australia`,
    images: [
      {
        url: `/api/og?title=${encodeURIComponent("Send Money to Australia")}&sub=${encodeURIComponent("FX Comparison · Wise · OFX · WorldFirst · Property · Shares")}`,
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/foreign-investment/send-money-australia` },
};

export const revalidate = 86400;

const PROVIDERS = [
  {
    name: "Wise",
    type: "FX Specialist",
    bestFor: "Everyday transfers, smaller amounts (under $50K)",
    fee: "~0.3–1.5% total cost",
    rate: "Mid-market rate + small fee",
    minTransfer: "No minimum",
    maxTransfer: "Varies by country",
    settlementOk: false,
    affiliateUrl: "https://wise.com",
    pros: ["Transparent pricing", "Real exchange rate", "Fast (often same-day)", "Multi-currency account", "Excellent for share account funding"],
    cons: ["Not accepted for property settlement", "Per-transfer fee model can add up on frequent small transfers"],
    rating: 4.8,
  },
  {
    name: "OFX",
    type: "FX Specialist",
    bestFor: "Large transfers, property settlement preparation",
    fee: "~0.5–1% margin",
    rate: "Competitive — better for large amounts",
    minTransfer: "AUD 1,000",
    maxTransfer: "No upper limit",
    settlementOk: false,
    affiliateUrl: "https://www.ofx.com",
    pros: ["No transfer fees on amounts over $10K", "Dedicated dealers for large amounts", "Forward contracts available (lock in rate)", "Excellent for property-related transfers"],
    cons: ["Not accepted directly for settlement (funds must go to your AU bank account first)", "Less competitive on smaller amounts"],
    rating: 4.6,
  },
  {
    name: "WorldFirst",
    type: "FX Specialist",
    bestFor: "Business transfers, high-value personal transfers",
    fee: "Competitive — negotiable for large amounts",
    rate: "Competitive spot rates",
    minTransfer: "AUD 1,000",
    maxTransfer: "No limit",
    settlementOk: false,
    affiliateUrl: "https://www.worldfirst.com",
    pros: ["Strong for business and high-net-worth", "Dedicated account managers", "Good for recurring transfers", "Part of Ant Group (reliable)"],
    cons: ["Better for business than retail", "Rate transparency less obvious upfront"],
    rating: 4.4,
  },
  {
    name: "Big Four Bank (ANZ/CBA/NAB/Westpac)",
    type: "Bank Transfer",
    bestFor: "Property settlement (required), convenience",
    fee: "~2–4% above mid-market rate",
    rate: "Significantly worse than specialists",
    minTransfer: "No minimum",
    maxTransfer: "Large amounts may need prior arrangement",
    settlementOk: true,
    affiliateUrl: null,
    pros: ["Required for property settlement (conveyancers only accept bank-issued transfers)", "Familiar, trusted", "Can handle large amounts without concern"],
    cons: ["Terrible exchange rates vs specialists", "Fees for international transfers ($20–35 per transfer)", "Never use for FX conversion if you can avoid it"],
    rating: 2.8,
  },
  {
    name: "Remitly",
    type: "Remittance Service",
    bestFor: "Smaller, frequent personal transfers",
    fee: "~1–3% depending on speed",
    rate: "Competitive for personal/consumer transfers",
    minTransfer: "No minimum",
    maxTransfer: "Lower limits than OFX/WorldFirst",
    settlementOk: false,
    affiliateUrl: "https://www.remitly.com",
    pros: ["Fast and reliable", "Good for personal smaller amounts", "Popular in South/Southeast Asia"],
    cons: ["Transfer limits may be too low for property down payments", "Not suitable for large investment transfers"],
    rating: 4.2,
  },
];

const COST_EXAMPLE_AMOUNT = 500_000;

function calcCost(marginPercent: number, amount: number) {
  return Math.round(amount * (marginPercent / 100));
}

const FAQS = [
  {
    question: "Can I use Wise to fund an Australian property purchase?",
    answer: "Wise is excellent for funding your Australian bank account in preparation for a property purchase, but it cannot be used directly for settlement. Property settlement in Australia requires a bank cheque or electronic funds transfer from an Australian bank account. The recommended approach: transfer funds from your home country to your Australian bank account using Wise or OFX (for better rates), then use your Australian bank account for the settlement itself.",
  },
  {
    question: "What exchange rate should I expect for AUD transfers?",
    answer: "The 'mid-market' rate is the true exchange rate — the one you see on Google or XE.com. Banks typically charge 2–4% above this rate. FX specialists like Wise charge 0.3–1.5% above mid-market. On a $500,000 transfer, the difference between a bank (3% margin) and Wise (0.5% margin) is approximately $12,500.",
  },
  {
    question: "Do I need to declare large transfers to Australia?",
    answer: "Australia's AUSTRAC (Australian Transaction Reports and Analysis Centre) monitors large cash transactions and international transfers. Your Australian bank must report transactions over $10,000 AUD to AUSTRAC. However, this is automatic and compliance is handled by the financial institutions — you don't need to do anything extra. For FIRB-related property purchases, you will need to demonstrate source of funds.",
  },
  {
    question: "How do forward contracts work for large property purchases?",
    answer: "A forward contract lets you lock in today's exchange rate for a transfer that will happen in the future — for example, when your off-the-plan property settles in 12 months. If AUD/SGD rate moves against you during that time, you're protected. Forward contracts are available through OFX, WorldFirst, and most FX specialists. A small deposit is typically required to secure the rate.",
  },
  {
    question: "What currencies can I transfer to Australia?",
    answer: "All major currencies including USD, EUR, GBP, SGD, HKD, CNY/CNH, AED, JPY, INR, and dozens more. For more exotic currencies, options are more limited — OFX and WorldFirst handle a broader range. Wise supports 40+ currencies.",
  },
];

export default function SendMoneyAustraliaPage() {
  return (
    <div className="bg-white min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", url: SITE_URL },
              { name: "Foreign Investment", url: `${SITE_URL}/foreign-investment` },
              { name: "Send Money to Australia" },
            ])
          ),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQS.map((faq) => ({
              "@type": "Question",
              name: faq.question,
              acceptedAnswer: { "@type": "Answer", text: faq.answer },
            })),
          }),
        }}
      />

      <ForeignInvestmentNav current="/foreign-investment/send-money-australia" />

      {/* ── Hero ── */}
      <section className="relative bg-white border-b border-slate-100 overflow-hidden py-8 md:py-12">
        <div className="container-custom">
          <nav className="text-xs text-slate-500 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span className="text-slate-300">/</span>
            <Link href="/foreign-investment" className="hover:text-slate-900">Foreign Investment</Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-medium">Send Money to Australia</span>
          </nav>

          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full text-xs font-semibold text-slate-600 mb-4">
              <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
              Updated March 2026
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-4 tracking-tight text-slate-900">
              Send Money to Australia:{" "}
              <span className="text-amber-500">Best Options for Foreign Investors</span>
            </h1>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed mb-6">
              Every foreign investor in Australia needs to move money here — whether for property, shares,
              or a bank account. Your choice of transfer method can save or cost you thousands.
              Here&apos;s the honest comparison.
            </p>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-sm text-amber-800 font-semibold">
                Quick recommendation: Use <strong>Wise or OFX</strong> for the currency conversion — save 2–3.5%
                vs your bank. Then <strong>transfer to your Australian bank account</strong> first before property settlement.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="container-custom py-8 md:py-12 space-y-12 md:space-y-16">

        {/* ── Cost comparison ── */}
        <section className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
          <h2 className="font-bold text-slate-800 mb-4">How much you save: ${(COST_EXAMPLE_AMOUNT / 1_000).toFixed(0)}K transfer example</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-amber-200">
                  <th className="text-left pb-2 font-semibold text-slate-600 text-xs">Provider</th>
                  <th className="text-right pb-2 font-semibold text-slate-600 text-xs">Est. margin</th>
                  <th className="text-right pb-2 font-semibold text-slate-600 text-xs">Cost on $500K</th>
                  <th className="text-right pb-2 font-semibold text-slate-600 text-xs">You receive</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-100">
                {[
                  { name: "Big Four Bank", margin: 3.0 },
                  { name: "WorldFirst", margin: 0.7 },
                  { name: "OFX", margin: 0.6 },
                  { name: "Wise", margin: 0.5 },
                ].map((p) => {
                  const cost = calcCost(p.margin, COST_EXAMPLE_AMOUNT);
                  const received = COST_EXAMPLE_AMOUNT - cost;
                  const isBest = p.margin === 0.5;
                  return (
                    <tr key={p.name} className={isBest ? "bg-emerald-50/50" : ""}>
                      <td className="py-2 font-medium text-slate-800">{p.name}</td>
                      <td className={`py-2 text-right font-semibold ${p.margin > 1 ? "text-red-600" : "text-emerald-600"}`}>{p.margin}%</td>
                      <td className={`py-2 text-right ${p.margin > 1 ? "text-red-600 font-bold" : "text-slate-600"}`}>
                        ${cost.toLocaleString("en-AU")}
                      </td>
                      <td className="py-2 text-right font-bold text-slate-800">
                        ${received.toLocaleString("en-AU")}
                        {isBest && <span className="ml-1 text-xs text-emerald-600">Best</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-500 mt-3">
            Illustrative example based on approximate rates. Actual rates vary by currency pair, amount, and market conditions.
            Exchange rate margins shown are estimates — check each provider for live rates before transferring.
          </p>
        </section>

        {/* ── Provider comparison ── */}
        <section>
          <SectionHeading
            eyebrow="Provider Comparison"
            title="FX transfer options compared"
            sub="Detailed breakdown for foreign investors moving money into Australia."
          />
          <div className="space-y-4">
            {PROVIDERS.map((p) => (
              <div key={p.name} className="border border-slate-200 rounded-2xl overflow-hidden hover:border-amber-200 transition-colors">
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-extrabold text-slate-900 text-base">{p.name}</h3>
                        <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{p.type}</span>
                        {p.settlementOk && (
                          <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Settlement OK</span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500">Best for: {p.bestFor}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-extrabold text-2xl text-amber-600">★ {p.rating.toFixed(1)}</p>
                      <p className="text-xs text-slate-400">rating</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    {[
                      { label: "Fee/Margin", value: p.fee },
                      { label: "Rate", value: p.rate },
                      { label: "Min Transfer", value: p.minTransfer },
                      { label: "Settlement", value: p.settlementOk ? "✓ Accepted" : "✗ Not accepted" },
                    ].map((item) => (
                      <div key={item.label} className="bg-slate-50 rounded-lg p-2">
                        <p className="text-xs text-slate-500 mb-0.5">{item.label}</p>
                        <p className={`text-xs font-bold ${item.label === "Settlement" && !p.settlementOk ? "text-red-600" : item.label === "Settlement" && p.settlementOk ? "text-emerald-600" : "text-slate-800"}`}>
                          {item.value}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-xs font-semibold text-emerald-700 mb-1.5">Pros</p>
                      <ul className="space-y-1">
                        {p.pros.map((pro) => (
                          <li key={pro} className="flex items-start gap-1.5 text-xs text-slate-600">
                            <svg className="w-3 h-3 text-emerald-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            {pro}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-red-600 mb-1.5">Cons</p>
                      <ul className="space-y-1">
                        {p.cons.map((con) => (
                          <li key={con} className="flex items-start gap-1.5 text-xs text-slate-600">
                            <svg className="w-3 h-3 text-red-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            {con}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {p.affiliateUrl && (
                    <a
                      href={p.affiliateUrl}
                      target="_blank"
                      rel="noopener noreferrer sponsored"
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold rounded-xl text-sm transition-colors"
                    >
                      Compare {p.name} Rates &rarr;
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Strategy guide ── */}
        <section>
          <SectionHeading
            eyebrow="Strategy"
            title="Which transfer method for which purpose?"
            sub="The best approach depends on what you&apos;re investing in."
          />
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              {
                purpose: "Funding an ASX brokerage account",
                recommendation: "Use Wise",
                reasoning: "Wise offers mid-market rates and low fees. Transfer from your home currency to your Australian bank account, then fund your broker. Interactive Brokers also accepts international wire transfers directly.",
                icon: "📈",
              },
              {
                purpose: "Australian property purchase (deposit)",
                recommendation: "Use OFX or WorldFirst — then your AU bank",
                reasoning: "Convert currency via OFX or WorldFirst to your Australian bank account. Your Australian bank then issues the settlement transfer. Never send property settlement funds directly through Wise — it won't be accepted.",
                icon: "🏠",
              },
              {
                purpose: "Receiving rental income (AUD to home country)",
                recommendation: "Wise for ongoing income",
                reasoning: "Wise's multi-currency accounts are excellent for receiving regular AUD income and converting to SGD, HKD, GBP, etc. Low per-transfer fees make it cost-effective for monthly rental income.",
                icon: "🏘️",
              },
              {
                purpose: "Large one-off transfer ($500K+)",
                recommendation: "OFX or WorldFirst (negotiate rate)",
                reasoning: "For high-value transfers, call OFX or WorldFirst and negotiate the rate. Their sales teams will offer better margins for large amounts. Consider a forward contract if settlement is months away.",
                icon: "💰",
              },
            ].map((item) => (
              <div key={item.purpose} className="border border-slate-200 rounded-xl p-5 hover:border-amber-200 transition-colors">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{item.icon}</span>
                  <h3 className="font-bold text-slate-800 text-sm">{item.purpose}</h3>
                </div>
                <div className="bg-amber-50 rounded-lg px-3 py-2 mb-3">
                  <p className="text-xs font-bold text-amber-700">Recommended: {item.recommendation}</p>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{item.reasoning}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── FAQs ── */}
        <section>
          <SectionHeading eyebrow="FAQs" title="FX transfer questions answered" />
          <div className="space-y-4">
            {FAQS.map((faq) => (
              <div key={faq.question} className="border border-slate-200 rounded-xl p-5">
                <h3 className="font-bold text-slate-800 text-sm mb-2">{faq.question}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Related ── */}
        <section>
          <SectionHeading eyebrow="Related" title="More for foreign investors" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { title: "Can Non-Residents Open an Australian Bank Account?", href: "/foreign-investment/guides/non-resident-bank-account" },
              { title: "Buy Property in Australia as a Foreigner", href: "/foreign-investment/guides/buy-property-australia-foreigner" },
              { title: "ASX Brokers for Non-Residents", href: "/compare/non-residents" },
              { title: "FIRB Property Guide", href: "/property/foreign-investment" },
              { title: "Tax Guide for Non-Residents", href: "/foreign-investment/tax" },
              { title: "Foreign Investment Hub", href: "/foreign-investment" },
            ].map((link) => (
              <Link key={link.href} href={link.href} className="group block p-4 border border-slate-200 rounded-xl hover:border-amber-300 hover:bg-amber-50/20 transition-all">
                <span className="font-semibold text-sm text-slate-800 group-hover:text-amber-700">{link.title} &rarr;</span>
              </Link>
            ))}
          </div>
        </section>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500 leading-relaxed">
            FX provider details are indicative only. Exchange rates fluctuate constantly. Affiliate links to FX providers may result in commission to Invest.com.au. This does not affect our analysis or recommendations. {FOREIGN_INVESTOR_GENERAL_DISCLAIMER}
          </p>
        </div>
      </div>
    </div>
  );
}
