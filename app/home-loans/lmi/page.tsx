import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL, absoluteUrl } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Lenders Mortgage Insurance (LMI) Explained Australia (${CURRENT_YEAR}) | invest.com.au`,
  description: `What is LMI in Australia, who it protects, how much it costs, and how to avoid it. LVR thresholds, cost tables, First Home Guarantee, and professional waivers. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Lenders Mortgage Insurance (LMI) Explained Australia (${CURRENT_YEAR})`,
    description: "LMI protects the lender — not you. Cost tables by LVR, ways to avoid LMI, First Home Guarantee, professional waivers, and the capitalisation trap explained.",
    url: `${SITE_URL}/home-loans/lmi`,
    images: [{ url: `/api/og?title=Lenders+Mortgage+Insurance+LMI+Explained`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/home-loans/lmi` },
};

const HERO_STATS = [
  { label: "Triggered when", value: "Deposit below 20%", sub: "LVR above 80%" },
  { label: "Typical cost", value: "1–3% of loan", sub: "Varies by lender and LVR" },
  { label: "Protects", value: "The lender", sub: "NOT the borrower" },
  { label: "Capitalised", value: "Yes — usually", sub: "Added to loan balance" },
];

const LMI_COSTS = [
  { lvr: "80% (no LMI)", deposit: "$400,000 deposit needed", lmi: "$0", notes: "Below the 80% trigger" },
  { lvr: "85%", deposit: "$75,000 deposit", lmi: "~$6,000–$8,000", notes: "Lender/insurer rates vary" },
  { lvr: "90%", deposit: "$50,000 deposit", lmi: "~$13,000–$17,000", notes: "Common entry point for FHBs" },
  { lvr: "95%", deposit: "$25,000 deposit", lmi: "~$18,000–$22,000", notes: "Higher risk, fewer lenders" },
];

const AVOID_STRATEGIES = [
  {
    title: "Save a 20% deposit",
    icon: "🏦",
    desc: "Eliminates LMI entirely. Takes longer but avoids the cost and increases your borrowing options. On a $600,000 property, a 20% deposit is $120,000 — a significant saving versus paying LMI.",
  },
  {
    title: "First Home Guarantee (FHBG)",
    icon: "🏛️",
    desc: "Federal scheme allowing eligible first home buyers to buy with a 5% deposit with a government guarantee — no LMI required. 35,000 places per year. Income caps ($125,000 singles, $200,000 couples) and property price caps apply by location.",
  },
  {
    title: "Family guarantor loan",
    icon: "👪",
    desc: "A parent or close relative goes guarantor on part of the loan using equity in their property. Can allow a low-deposit or zero-deposit purchase with no LMI if structured correctly. The guarantor carries real financial risk — independent legal advice is strongly recommended.",
  },
  {
    title: "Professional LMI waiver",
    icon: "🩺",
    desc: "Some lenders waive LMI for certain professions — doctors, dentists, lawyers, and accountants — at up to 90% LVR. You must be actively earning income in that profession. Criteria vary significantly between lenders; a mortgage broker can identify who qualifies.",
  },
];

const SCENARIO_COMPARISON = [
  {
    scenario: "First home buyer, 5% deposit, income under cap",
    lmi: "Not required",
    fhbg: "FHBG preferred — government guarantees 15%",
    winner: "FHBG",
  },
  {
    scenario: "First home buyer, 5% deposit, income over cap",
    lmi: "Required",
    fhbg: "Not eligible",
    winner: "LMI unavoidable",
  },
  {
    scenario: "Upgrader with 10% deposit, not first home buyer",
    lmi: "Required at 90% LVR",
    fhbg: "Not eligible (not first home buyer)",
    winner: "LMI or increase deposit",
  },
  {
    scenario: "Doctor with 10% deposit",
    lmi: "May be waived by some lenders",
    fhbg: "May be eligible if first home buyer",
    winner: "Professional waiver or FHBG",
  },
];

const FAQS = [
  {
    q: "Who does LMI actually protect?",
    a: "LMI protects the lender, not the borrower. If you default and the property is sold at a loss, LMI covers the lender's shortfall. However, the insurer can then pursue you for any shortfall they paid on your behalf — this is called subrogation. LMI provides no financial protection to the borrower despite the borrower paying the premium.",
  },
  {
    q: "How much does LMI cost in Australia?",
    a: "LMI costs vary significantly depending on the lender, LMI provider, LVR, and loan amount. At 90% LVR on a $500,000 loan, LMI might cost $13,000–$17,000. At 95% LVR, this can increase to $18,000–$22,000. The premium is calculated as a percentage of the loan amount, and the percentage increases non-linearly as LVR rises. Always ask your broker for an exact figure before proceeding.",
  },
  {
    q: "Can I get LMI refunded if I sell the property?",
    a: "Generally no. LMI premiums are not refundable if you sell the property. Some policies have a partial refund provision if the loan is repaid within the first year or two, but this is the exception rather than the rule. Portability provisions (carrying LMI to a new property) also generally do not apply.",
  },
  {
    q: "Is LMI tax deductible?",
    a: "LMI on an investment property loan is generally tax deductible, spread over 5 years or the loan term (whichever is shorter). LMI on a home loan (owner-occupied) is generally NOT tax deductible, as it is a personal capital expense. Consult a tax adviser for your specific situation.",
  },
  {
    q: "What is the difference between LMI and mortgage protection insurance?",
    a: "LMI (Lenders Mortgage Insurance) protects the lender. Mortgage protection insurance (also called home loan protection or income protection) is a separate product that protects the borrower — paying loan repayments if you are unable to work due to illness, injury, or redundancy. They are entirely different products. LMI is usually mandatory at high LVR; mortgage protection is voluntary.",
  },
  {
    q: "Can I avoid LMI with the First Home Guarantee?",
    a: "Yes. The First Home Guarantee (FHBG) allows eligible first home buyers to buy with as little as a 5% deposit without paying LMI — the government guarantees 15% of the property value instead. There are 35,000 places per year, with income caps ($125,000 for singles, $200,000 for couples) and property price caps that vary by location. If eligible, this is a significantly better outcome than paying LMI.",
  },
];

export default function LMIPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Home Loans", url: absoluteUrl("/home-loans") },
    { name: "Lenders Mortgage Insurance", url: absoluteUrl("/home-loans/lmi") },
  ]);
  const faqLd = faqJsonLd(FAQS.map((f) => ({ q: f.q, a: f.a })));

  return (
    <div className="bg-white min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      {faqLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />}

      {/* Hero */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-700 text-white py-14">
        <div className="container-custom">
          <nav className="text-sm text-slate-400 mb-4 flex items-center gap-1.5">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <span>/</span>
            <Link href="/home-loans" className="hover:text-white transition-colors">Home Loans</Link>
            <span>/</span>
            <span className="text-white">Lenders Mortgage Insurance</span>
          </nav>
          <div className="inline-block bg-slate-700 text-slate-300 text-xs font-medium px-3 py-1 rounded-full mb-4">
            General information only — not credit assistance
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
            Lenders Mortgage Insurance (LMI) Explained
          </h1>
          <p className="text-lg text-slate-300 max-w-2xl mb-8">
            LMI is triggered when your deposit is below 20%. Despite the name — and the fact that you pay the premium — it protects the lender, not you. Here&apos;s what it costs, when it applies, and how to avoid it.
          </p>
          {/* Key stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {HERO_STATS.map((stat) => (
              <div key={stat.label} className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                <p className="text-xs text-slate-400 mb-1">{stat.label}</p>
                <p className="text-lg font-bold text-white">{stat.value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{stat.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* What LMI is */}
      <section className="py-12 bg-white">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">What Is Lenders Mortgage Insurance?</h2>
          <p className="text-slate-600 mb-4">
            Lenders Mortgage Insurance is an insurance policy that protects the <strong>lender</strong> — not you — if you default on your home loan and the lender sells the property for less than the outstanding loan balance. The two main LMI providers in Australia are <strong>QBE LMI</strong> and <strong>Helia</strong> (formerly Genworth). Most major banks use one of these two.
          </p>
          {/* Critical misconception callout */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-6">
            <h3 className="font-bold text-amber-900 mb-2">The critical misconception</h3>
            <p className="text-amber-800 text-sm leading-relaxed">
              Despite paying the LMI premium yourself, you receive <strong>no protection</strong> from LMI. If you default and the lender sells the property at a shortfall, the LMI insurer covers the lender — but then the insurer can pursue <strong>you</strong> for the amount they paid out. This is called <em>subrogation</em>. LMI does not protect you from financial loss.
            </p>
          </div>
          <p className="text-slate-600 text-sm">
            The premium is a one-off cost (though it can be capitalised into the loan). It is calculated as a percentage of the loan amount and increases non-linearly as your LVR rises. Paying more for a higher LVR means paying a significantly higher LMI premium.
          </p>
        </div>
      </section>

      {/* When LMI applies */}
      <section className="py-12 bg-slate-50">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">When Does LMI Apply?</h2>
          <p className="text-slate-600 mb-5">
            LMI is generally required when the <strong>Loan-to-Value Ratio (LVR)</strong> exceeds 80%. LVR is calculated as:
          </p>
          <div className="bg-slate-900 text-green-400 font-mono text-sm rounded-xl p-4 mb-6">
            LVR = (Loan amount ÷ Property value) × 100
          </div>
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div className="bg-white border border-green-200 rounded-xl p-5">
              <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2">No LMI — 80% LVR</p>
              <p className="text-sm text-slate-700">$720,000 loan on a $900,000 property</p>
              <p className="text-xs text-slate-500 mt-1">$720k ÷ $900k × 100 = 80.0% — at the threshold, no LMI</p>
            </div>
            <div className="bg-white border border-red-200 rounded-xl p-5">
              <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-2">LMI applies — above 80%</p>
              <p className="text-sm text-slate-700">$730,000 loan on a $900,000 property</p>
              <p className="text-xs text-slate-500 mt-1">$730k ÷ $900k × 100 = 81.1% — LMI required</p>
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
            <p className="text-sm font-semibold text-blue-900 mb-1">Professional LMI waivers</p>
            <p className="text-sm text-blue-800">
              Some lenders offer LMI-free borrowing at up to 85–90% LVR for certain professions — doctors, dentists, lawyers, and accountants. These are known as professional LMI waivers. Criteria vary significantly between lenders. You must be actively earning income in that profession.
            </p>
          </div>
        </div>
      </section>

      {/* LMI Cost table */}
      <section className="py-12 bg-white">
        <div className="container-custom">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">LMI Cost Estimates by LVR</h2>
          <p className="text-sm text-slate-500 mb-6">Based on a $500,000 loan. Estimates only — actual premiums vary by lender and insurer.</p>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="text-left px-5 py-3">LVR</th>
                  <th className="text-left px-5 py-3">Deposit required</th>
                  <th className="text-left px-5 py-3">LMI estimate</th>
                  <th className="text-left px-5 py-3">Notes</th>
                </tr>
              </thead>
              <tbody>
                {LMI_COSTS.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                    <td className="px-5 py-3 font-medium text-slate-800">{row.lvr}</td>
                    <td className="px-5 py-3 text-slate-600">{row.deposit}</td>
                    <td className={`px-5 py-3 font-semibold ${i === 0 ? "text-green-700" : "text-red-700"}`}>{row.lmi}</td>
                    <td className="px-5 py-3 text-slate-500 text-xs">{row.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400 mt-3">
            LMI premiums vary significantly by lender and insurer. Use the First Home Guarantee or speak with a licensed mortgage broker to get exact figures for your situation.
          </p>
        </div>
      </section>

      {/* Ways to avoid LMI */}
      <section className="py-12 bg-slate-50">
        <div className="container-custom">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">4 Ways to Avoid LMI</h2>
          <div className="grid md:grid-cols-2 gap-5">
            {AVOID_STRATEGIES.map((s) => (
              <div key={s.title} className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="text-2xl mb-3">{s.icon}</div>
                <h3 className="font-bold text-slate-900 mb-2">{s.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Capitalisation section */}
      <section className="py-12 bg-white">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">LMI Added to the Loan (Capitalisation)</h2>
          <p className="text-slate-600 mb-5">
            Most lenders allow the LMI premium to be <strong>capitalised</strong> — added to the loan balance rather than paid upfront. This avoids a large upfront cash outlay, but the compounding effect is significant.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-5">
            <h3 className="font-semibold text-amber-900 mb-2">The true cost of capitalising LMI</h3>
            <p className="text-sm text-amber-800">
              A $15,000 LMI premium added to a 30-year loan at 6% interest costs approximately <strong>$32,000 in total</strong> over the life of the loan — more than double the original premium. If you have the cash available, paying the LMI premium upfront saves significant interest.
            </p>
          </div>
          <ul className="space-y-2 text-sm text-slate-600">
            <li className="flex items-start gap-2"><span className="text-slate-400 mt-0.5">•</span>Capitalised LMI increases your loan balance — and your ongoing repayments</li>
            <li className="flex items-start gap-2"><span className="text-slate-400 mt-0.5">•</span>It also increases your LVR slightly, which can affect your rate tier</li>
            <li className="flex items-start gap-2"><span className="text-slate-400 mt-0.5">•</span>Paying upfront is cheaper over the life of the loan if you have the funds</li>
          </ul>
        </div>
      </section>

      {/* LMI vs deposit guarantee schemes */}
      <section className="py-12 bg-slate-50">
        <div className="container-custom">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">LMI vs Government Deposit Guarantee Schemes</h2>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="text-left px-5 py-3">Scenario</th>
                  <th className="text-left px-5 py-3">Paying LMI</th>
                  <th className="text-left px-5 py-3">Government scheme (FHBG)</th>
                  <th className="text-left px-5 py-3">Better option</th>
                </tr>
              </thead>
              <tbody>
                {SCENARIO_COMPARISON.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                    <td className="px-5 py-3 text-slate-700 font-medium">{row.scenario}</td>
                    <td className="px-5 py-3 text-slate-600">{row.lmi}</td>
                    <td className="px-5 py-3 text-slate-600">{row.fhbg}</td>
                    <td className="px-5 py-3 font-semibold text-slate-800">{row.winner}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400 mt-3">
            Eligibility for government schemes changes each financial year. Confirm current criteria at housing.gov.au or with a licensed mortgage broker.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-12 bg-white">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <details key={i} className="group border border-slate-200 rounded-xl overflow-hidden">
                <summary className="flex items-center justify-between px-5 py-4 cursor-pointer font-medium text-slate-800 hover:bg-slate-50">
                  {faq.q}
                  <span className="ml-3 text-slate-400 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="px-5 pb-4 text-sm text-slate-600 leading-relaxed">{faq.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 bg-slate-50">
        <div className="container-custom text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-3">Understand Your LMI Position Before You Borrow</h2>
          <p className="text-slate-600 mb-6 max-w-xl mx-auto text-sm">
            A licensed mortgage broker can calculate your exact LMI exposure, identify whether you qualify for a professional waiver or the First Home Guarantee, and compare lender options at no cost to you.
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
      <section className="py-10 bg-white">
        <div className="container-custom">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Explore More Home Loan Guides</h2>
          <div className="flex flex-wrap gap-3">
            {[
              { label: "Refinancing Guide", href: "/home-loans/refinancing" },
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
            <strong>Credit disclaimer:</strong> This page is general information only. It does not constitute credit assistance under the National Consumer Credit Protection Act 2009 (Cth). Speak with a licensed mortgage broker or Australian Credit Licensee for advice on your specific circumstances.
          </p>
          <p>{GENERAL_ADVICE_WARNING}</p>
        </div>
      </footer>
    </div>
  );
}
