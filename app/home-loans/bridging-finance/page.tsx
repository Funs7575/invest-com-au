import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL, absoluteUrl } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Bridging Finance Explained Australia (${CURRENT_YEAR}) | invest.com.au`,
  description: `What is bridging finance in Australia, how peak debt and end debt work, closed vs open bridges, costs, risks, and when it makes sense. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Bridging Finance Explained Australia (${CURRENT_YEAR})`,
    description: "How bridging loans work — peak debt, end debt, costs breakdown, closed vs open bridges, key risks, and when bridging finance makes sense vs doesn't.",
    url: `${SITE_URL}/home-loans/bridging-finance`,
    images: [{ url: `/api/og?title=Bridging+Finance+Explained`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/home-loans/bridging-finance` },
};

const HERO_STATS = [
  { label: "Typical loan term", value: "6–12 months", sub: "Some lenders up to 24 months" },
  { label: "Rate premium", value: "1–2% above", sub: "Standard variable rate" },
  { label: "Structure", value: "Interest-only", sub: "Or interest capitalised" },
  { label: "Best for", value: "Buy before sell", sub: "Hot seller's markets" },
];

const COSTS = [
  { item: "Interest rate premium", typical: "0.5–2% above standard variable", notes: "Charged on peak debt during bridging period" },
  { item: "Establishment fee", typical: "$500–$1,500", notes: "Varies by lender" },
  { item: "Valuation fees (two properties)", typical: "$600–$1,200", notes: "Both existing and new property valued" },
  { item: "Exit / discharge fee", typical: "$300–$800", notes: "Paid when bridging loan closes" },
  { item: "Lenders mortgage insurance (if LVR > 80%)", typical: "$5,000–$30,000+", notes: "Avoid by maintaining sufficient equity" },
];

const BRIDGE_TYPES = [
  {
    type: "Closed bridge",
    how: "Sale already exchanged; settlement dates confirmed",
    when: "Least risky — lenders strongly prefer this structure",
    badge: "Lower risk",
    badgeColor: "text-green-700 bg-green-50 border-green-200",
  },
  {
    type: "Open bridge",
    how: "No buyer yet; selling period uncertain",
    when: "More risk — higher rate, stricter LVR, shorter maximum term",
    badge: "Higher risk",
    badgeColor: "text-amber-700 bg-amber-50 border-amber-200",
  },
];

const RISK_CARDS = [
  {
    title: "Property doesn't sell",
    icon: "⚠️",
    desc: "If your existing home doesn't sell within the bridging term, your lender may extend at a higher rate, place the loan in default, or force a sale at a distressed price. This is the primary risk of open bridging finance.",
  },
  {
    title: "Valuation risk",
    icon: "📉",
    desc: "The lender will value your existing property independently. If their valuation comes in below your estimate, your peak debt rises — and may push your LVR above the lender's threshold, requiring LMI or reducing how much you can borrow.",
  },
  {
    title: "Market timing",
    icon: "📈",
    desc: "If interest rates rise during your bridging period, carrying costs on peak debt increase significantly. On $1.1 million in peak debt, a 0.5% rate increase adds roughly $450/month in interest charges.",
  },
  {
    title: "Cash flow pressure",
    icon: "💸",
    desc: "During the bridging period you are effectively carrying two properties. If interest is capitalised (added to the loan balance), it compounds daily — the longer the bridging period, the larger the end debt.",
  },
];

const SUITABILITY = [
  { suits: "Hot seller's market — quick sales expected", doesnt: "Slow or soft market — long selling times likely" },
  { suits: "Strong existing equity (LVR below 60%)", doesnt: "Tight equity in existing home (LVR above 70%)" },
  { suits: "Short bridging period likely (under 6 months)", doesnt: "Uncertain or open-ended selling timeline" },
  { suits: "Financial buffer to cover carrying costs", doesnt: "Already stretched financially; no cash reserve" },
];

const ALTERNATIVES = [
  {
    title: "Sell first, rent temporarily",
    icon: "🏠",
    desc: "The lowest-risk path. Sell your home, settle, then rent while you search for and purchase your next property. Eliminates bridging risk entirely. Requires flexibility on timing and willingness to move twice.",
  },
  {
    title: "Conditional purchase (subject to sale)",
    icon: "📋",
    desc: "Make your purchase offer conditional on selling your existing home. Accepted more readily in slower markets where sellers have fewer competing offers. Gives you protection but may lose you the property in a competitive market.",
  },
  {
    title: "Port your existing mortgage",
    icon: "🔄",
    desc: "Some lenders allow you to transfer (port) your existing home loan to a new property, keeping the same rate and avoiding discharge fees. Availability depends on your lender's policy and the new loan amount. Ask your broker before arranging bridging finance.",
  },
  {
    title: "Family guarantee",
    icon: "👪",
    desc: "A parent or close relative uses equity in their property to guarantee part of your purchase. Can reduce or eliminate the need for bridging if structured carefully. The guarantor carries real financial risk — independent legal advice is essential.",
  },
];

const FAQS = [
  {
    q: "Do I need to sell my existing home to get bridging finance?",
    a: "No — that is the whole point of bridging finance. It lets you buy a new property before selling your existing one. However, lenders will assess your ability to service peak debt (both loans combined) and will want confidence that your existing home will sell within the bridging term. A closed bridge (where you have already exchanged contracts on your existing property) is easier to obtain and at better terms than an open bridge.",
  },
  {
    q: "What happens if my property doesn't sell during the bridging period?",
    a: "Your options depend on your lender's policy. Many lenders will negotiate a short extension — often at a higher rate — if they believe the property is genuinely being marketed. If the loan reaches a point of default, the lender may require you to sell the property (potentially at auction) to repay the bridging loan. This is the key risk of open bridging finance and why a realistic assessment of your property's saleability is critical before proceeding.",
  },
  {
    q: "Can I get bridging finance with an existing mortgage?",
    a: "Yes. Most borrowers seeking bridging finance already have a mortgage on their existing property. The existing mortgage balance is factored into the peak debt calculation. Lenders will assess whether you can service peak debt (existing mortgage + new purchase loan) and will require evidence that the existing property will sell and reduce the combined debt to an acceptable end debt level.",
  },
  {
    q: "How much deposit do I need for bridging finance?",
    a: "Bridging finance is typically structured around your equity position rather than a cash deposit. Lenders generally require the combined LVR across both properties (peak debt divided by combined property values) to stay within their policy — typically 70–80%. If the combined LVR exceeds 80%, lenders mortgage insurance (LMI) may apply or the application may be declined. Strong equity in your existing home is the most important factor.",
  },
  {
    q: "Is bridging finance available for investment properties?",
    a: "Yes, bridging finance can be used for investment property purchases as well as owner-occupied purchases. However, lender appetite varies — some lenders are more conservative with investment bridging. The same peak debt and end debt principles apply. A licensed mortgage broker can identify lenders who are active in investment bridging and compare your options.",
  },
  {
    q: "Who are the main bridging finance lenders in Australia?",
    a: "Most of the major banks (ANZ, CBA, NAB, Westpac) and a range of non-bank lenders offer bridging finance products, though their criteria, rates, and maximum terms vary significantly. Some non-bank lenders and specialist short-term credit providers offer more flexible bridging terms than the major banks. Because bridging finance is a specialist product with meaningful differences between lenders, comparing options through a licensed mortgage broker is strongly recommended.",
  },
];

export default function BridgingFinancePage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Home Loans", url: absoluteUrl("/home-loans") },
    { name: "Bridging Finance", url: absoluteUrl("/home-loans/bridging-finance") },
  ]);
  const faqLd = faqJsonLd(FAQS.map((f) => ({ q: f.q, a: f.a })));

  return (
    <div className="bg-white min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      {faqLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />}

      {/* Hero */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-700 text-white py-14">
        <div className="container-custom">
          <nav aria-label="Breadcrumb" className="text-sm text-slate-500 mb-4 flex items-center gap-1.5">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <span>/</span>
            <Link href="/home-loans" className="hover:text-white transition-colors">Home Loans</Link>
            <span>/</span>
            <span className="text-white">Bridging Finance</span>
          </nav>
          <div className="inline-block bg-slate-700 text-slate-300 text-xs font-medium px-3 py-1 rounded-full mb-4">
            General information only — not credit assistance
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
            Bridging Finance Explained
          </h1>
          <p className="text-lg text-slate-300 max-w-2xl mb-8">
            Bridging finance lets you buy your next home before you&apos;ve sold your existing one. Here&apos;s how peak debt works, what it costs, the real risks involved, and when it makes sense versus when it doesn&apos;t.
          </p>
          {/* Key stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {HERO_STATS.map((stat) => (
              <div key={stat.label} className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                <p className="text-xs text-slate-500 mb-1">{stat.label}</p>
                <p className="text-lg font-bold text-white">{stat.value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{stat.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* What is bridging finance */}
      <section className="py-12 bg-white">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">What Is Bridging Finance?</h2>
          <p className="text-slate-600 mb-4">
            Bridging finance (also called a bridging loan) is a short-term loan used to <strong>bridge the gap</strong> between the settlement of your new property purchase and the settlement of your existing property sale. It allows you to buy your next home without waiting until you have sold your current one.
          </p>
          <p className="text-slate-600 mb-5">
            Typical bridging loans run for <strong>6 to 12 months</strong>, with some lenders offering terms up to 24 months for open bridges. During the bridging period, repayments are usually structured as interest-only — or interest is capitalised (added to the loan balance) and repaid when the existing property settles.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
            <h3 className="font-bold text-amber-900 mb-2">The rate trade-off</h3>
            <p className="text-amber-800 text-sm leading-relaxed">
              Bridging loans carry a <strong>rate premium of typically 1–2% above the standard variable rate</strong>. Because this premium is charged on the full peak debt — which includes both your existing mortgage and the new purchase loan — the cost compounds quickly on large balances. A clear, realistic timeline for selling your existing property is essential before committing.
            </p>
          </div>
        </div>
      </section>

      {/* How it works — Peak debt vs end debt */}
      <section className="py-12 bg-slate-50">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">How It Works: Peak Debt and End Debt</h2>
          <p className="text-slate-600 mb-6">
            Understanding peak debt and end debt is central to assessing any bridging loan. The lender is primarily concerned with whether your end debt is serviceable after your existing property sells.
          </p>

          {/* Worked example */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden mb-6">
            <div className="bg-slate-800 text-white px-6 py-4">
              <p className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Worked Example</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Your situation</p>
                  <ul className="space-y-2 text-sm text-slate-700">
                    <li className="flex justify-between"><span>Existing home value</span><strong>$800,000</strong></li>
                    <li className="flex justify-between"><span>Existing mortgage</span><strong>$200,000</strong></li>
                    <li className="flex justify-between"><span>New property price</span><strong>$900,000</strong></li>
                    <li className="flex justify-between"><span>Expected sale price</span><strong>$600,000</strong></li>
                  </ul>
                </div>
                <div className="space-y-3">
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">Peak debt</p>
                    <p className="text-xl font-bold text-blue-900">$1,100,000</p>
                    <p className="text-xs text-blue-700 mt-1">$200,000 existing + $900,000 new purchase</p>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1">End debt</p>
                    <p className="text-xl font-bold text-green-900">$500,000</p>
                    <p className="text-xs text-green-700 mt-1">$1,100,000 peak − $600,000 sale proceeds</p>
                  </div>
                </div>
              </div>
              <div className="bg-slate-900 text-green-400 font-mono text-sm rounded-xl p-4 mt-2">
                Peak debt = existing mortgage + new purchase price<br />
                End debt = peak debt − sale proceeds from existing home
              </div>
            </div>
          </div>

          <p className="text-slate-600 text-sm">
            During the bridging period, interest accrues on the full peak debt of $1,100,000 — not just the new purchase. Once the existing property settles at $600,000, the bridging loan converts to a standard mortgage at the end debt of $500,000. This is why the rate premium and bridging term both significantly affect the true cost.
          </p>
        </div>
      </section>

      {/* Closed vs open bridging */}
      <section className="py-12 bg-white">
        <div className="container-custom">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Closed vs Open Bridging Finance</h2>
          <p className="text-sm text-slate-500 mb-6">The type of bridge you qualify for depends on whether you have an existing buyer for your property.</p>
          <div className="grid md:grid-cols-2 gap-5">
            {BRIDGE_TYPES.map((b) => (
              <div key={b.type} className="bg-white rounded-xl border border-slate-200 p-6">
                <div className={`inline-block text-xs font-semibold px-3 py-1 rounded-full border mb-4 ${b.badgeColor}`}>
                  {b.badge}
                </div>
                <h3 className="font-bold text-slate-900 text-lg mb-2">{b.type}</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">How it works</p>
                    <p className="text-sm text-slate-700">{b.how}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">When to use</p>
                    <p className="text-sm text-slate-600">{b.when}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 bg-blue-50 border border-blue-200 rounded-xl p-5 max-w-3xl">
            <p className="text-sm font-semibold text-blue-900 mb-1">Lender preference</p>
            <p className="text-sm text-blue-800">
              Lenders strongly prefer closed bridges because the sale outcome is confirmed. If you are in a position to exchange contracts on your existing home before applying, doing so will improve your rate, maximum loan term, and likelihood of approval.
            </p>
          </div>
        </div>
      </section>

      {/* Costs table */}
      <section className="py-12 bg-slate-50">
        <div className="container-custom">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Bridging Finance Cost Breakdown</h2>
          <p className="text-sm text-slate-500 mb-6">Typical ranges only — actual costs depend on your lender, loan size, and bridging term.</p>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table aria-label="Bridging finance cost breakdown" className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th scope="col" className="text-left px-5 py-3">Cost</th>
                  <th scope="col" className="text-left px-5 py-3">Typical range</th>
                  <th scope="col" className="text-left px-5 py-3">Notes</th>
                </tr>
              </thead>
              <tbody>
                {COSTS.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                    <td className="px-5 py-3 font-medium text-slate-800">{row.item}</td>
                    <td className="px-5 py-3 text-amber-700 font-semibold">{row.typical}</td>
                    <td className="px-5 py-3 text-slate-500 text-xs">{row.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-500 mt-3">
            The interest rate premium is charged on peak debt for the entire bridging period — this is often the largest cost. Model your carrying costs carefully before committing.
          </p>
        </div>
      </section>

      {/* Risks */}
      <section className="py-12 bg-white">
        <div className="container-custom">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">4 Key Risks of Bridging Finance</h2>
          <div className="grid md:grid-cols-2 gap-5">
            {RISK_CARDS.map((r) => (
              <div key={r.title} className="bg-slate-50 rounded-xl border border-slate-200 p-6">
                <div className="text-2xl mb-3">{r.icon}</div>
                <h3 className="font-bold text-slate-900 mb-2">{r.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{r.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Suitability table */}
      <section className="py-12 bg-slate-50">
        <div className="container-custom">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">When Bridging Finance Makes Sense vs When It Doesn&apos;t</h2>
          <p className="text-sm text-slate-500 mb-6">Bridging finance is a powerful tool in the right circumstances — and a costly mistake in the wrong ones.</p>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table aria-label="When bridging finance suits vs does not suit" className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th scope="col" className="text-left px-5 py-3 text-green-300">Bridging suits</th>
                  <th scope="col" className="text-left px-5 py-3 text-red-300">Bridging doesn&apos;t suit</th>
                </tr>
              </thead>
              <tbody>
                {SUITABILITY.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                    <td className="px-5 py-3 text-green-800 font-medium">
                      <span className="mr-2 text-green-500">✓</span>{row.suits}
                    </td>
                    <td className="px-5 py-3 text-red-800">
                      <span className="mr-2 text-red-400">✗</span>{row.doesnt}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Alternatives */}
      <section className="py-12 bg-white">
        <div className="container-custom">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Alternatives to Bridging Finance</h2>
          <p className="text-sm text-slate-500 mb-6">Before committing to a bridging loan, consider whether one of these alternatives is more appropriate for your situation.</p>
          <div className="grid md:grid-cols-2 gap-5">
            {ALTERNATIVES.map((alt) => (
              <div key={alt.title} className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="text-2xl mb-3">{alt.icon}</div>
                <h3 className="font-bold text-slate-900 mb-2">{alt.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{alt.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-12 bg-slate-50">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <details key={i} className="group border border-slate-200 rounded-xl overflow-hidden">
                <summary className="flex items-center justify-between px-5 py-4 cursor-pointer font-medium text-slate-800 hover:bg-slate-50 bg-white">
                  {faq.q}
                  <span className="ml-3 text-slate-500 group-open:rotate-180 transition-transform" aria-hidden="true">▼</span>
                </summary>
                <div className="px-5 pb-4 pt-1 text-sm text-slate-600 leading-relaxed bg-white">{faq.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 bg-white">
        <div className="container-custom text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-3">Explore Your Bridging Finance Options</h2>
          <p className="text-slate-600 mb-6 max-w-xl mx-auto text-sm">
            A licensed mortgage broker can model your peak debt and end debt, compare bridging products across multiple lenders, and help you understand whether bridging finance is the right path — at no cost to you.
          </p>
          <Link
            href="/advisors/mortgage-brokers"
            className="inline-block bg-slate-800 text-white font-semibold px-8 py-3 rounded-xl hover:bg-slate-900 transition-colors"
          >
            Find a Licensed Mortgage Broker
          </Link>
        </div>
      </section>

      {/* Related links */}
      <section className="py-10 bg-slate-50">
        <div className="container-custom">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Explore More Home Loan Guides</h2>
          <div className="flex flex-wrap gap-3">
            {[
              { label: "Refinancing Guide", href: "/home-loans/refinancing" },
              { label: "Lenders Mortgage Insurance", href: "/home-loans/lmi" },
              { label: "Variable vs Fixed Rate", href: "/home-loans/variable" },
              { label: "Fixed Rate Guide", href: "/home-loans/fixed" },
              { label: "Offset & Redraw", href: "/home-loans/offset-redraw" },
              { label: "Investment Loans", href: "/home-loans/investment" },
              { label: "Find a Mortgage Broker", href: "/advisors/mortgage-brokers" },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="bg-white border border-slate-200 text-slate-700 text-sm font-medium px-4 py-2 rounded-lg hover:border-slate-400 hover:text-slate-900 transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Compliance footer */}
      <footer className="py-8 bg-white border-t border-slate-100">
        <div className="container-custom max-w-3xl text-xs text-slate-500 space-y-2">
          <p>
            <strong>Credit disclaimer:</strong> This information is general in nature and does not constitute credit advice. Credit assistance is provided by licensed credit providers. You should consider whether any credit product is appropriate for your circumstances before applying. invest.com.au is not licensed to provide credit assistance under the National Consumer Credit Protection Act 2009 (Cth). Consult a licensed mortgage broker or Australian Credit Licensee for advice specific to your situation.
          </p>
          <p>{GENERAL_ADVICE_WARNING}</p>
        </div>
      </footer>
    </div>
  );
}
