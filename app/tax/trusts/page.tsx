import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL, absoluteUrl } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Family Trust Tax Australia (${CURRENT_YEAR}) — Discretionary Trust Income, CGT & Strategies`,
  description: `How discretionary (family) trusts are taxed in Australia: income splitting, CGT discount, bucket company strategy, trust losses, and key ATO rules. Updated for ${CURRENT_YEAR}. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Family Trust Tax Australia (${CURRENT_YEAR}) — Discretionary Trust Income & CGT`,
    description:
      "How Australian discretionary trusts are taxed: income splitting to beneficiaries, 50% CGT discount, bucket company strategy, and ATO section 100A rules.",
    url: `${SITE_URL}/tax/trusts`,
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/tax/trusts` },
};

const TRUST_TYPES = [
  {
    title: "Discretionary (Family) Trust",
    badge: "Most Common",
    badgeColor: "bg-amber-100 text-amber-700 border-amber-200",
    body: "The trustee has full discretion to distribute income and capital to any beneficiary in any proportion, annually. There are no fixed entitlements — the trustee decides each year how income is allocated. Most commonly used for family wealth management and business income splitting.",
  },
  {
    title: "Unit Trust",
    badge: "Common",
    badgeColor: "bg-blue-100 text-blue-700 border-blue-200",
    body: "Beneficiaries hold fixed units, each representing a proportionate entitlement to trust income and capital. Common for property syndicates and joint ventures. Each unit-holder is taxed on their proportionate share — there is no discretion over distribution allocations.",
  },
  {
    title: "Testamentary Trust",
    badge: "Estate Planning",
    badgeColor: "bg-purple-100 text-purple-700 border-purple-200",
    body: "Created by a Will and comes into existence on the death of the testator. A key tax advantage: minor beneficiaries are taxed at adult marginal rates (not the penalty rates that apply to other trusts), making it highly effective for passing wealth to grandchildren or young children.",
  },
  {
    title: "Hybrid Trust",
    badge: "Less Common",
    badgeColor: "bg-slate-100 text-slate-600 border-slate-200",
    body: "Combines fixed and discretionary elements — some beneficiaries have fixed unit entitlements while other income is distributed at the trustee&apos;s discretion. Less common following ATO rulings post-2010 that tightened the tax treatment of hybrid arrangements.",
  },
];

const TAX_MECHANICS = [
  {
    component: "Distribution to adult resident beneficiary",
    treatment: "Taxed at beneficiary's marginal rate",
    highlight: false,
  },
  {
    component: "Distribution to resident minor (under 18)",
    treatment: "Penalty rates: 0% on first $416, 66% on $416–$1,307, 45% thereafter",
    highlight: true,
  },
  {
    component: "Trustee makes no distribution (accumulation)",
    treatment: "Taxed at top marginal rate: 47%",
    highlight: true,
  },
  {
    component: "Distribution to non-resident beneficiary",
    treatment: "Withholding at 47% on Australian-sourced income",
    highlight: true,
  },
  {
    component: "Capital gain distributed",
    treatment: "Eligible for 50% CGT discount if asset held 12+ months",
    highlight: false,
  },
  {
    component: "Franking credits",
    treatment: "Flow through to beneficiaries proportionally",
    highlight: false,
  },
];

const COMPARISON_ROWS = [
  {
    feature: "Tax rate",
    trust: "Beneficiary's marginal rate",
    company: "25–30%",
    individual: "Up to 47%",
  },
  {
    feature: "Income splitting",
    trust: "Yes — to low-income beneficiaries",
    company: "Dividend splitting possible",
    individual: "No",
  },
  {
    feature: "CGT discount",
    trust: "Yes (50% after 12 months)",
    company: "No",
    individual: "Yes (50%)",
  },
  {
    feature: "Asset protection",
    trust: "Strong — assets not personally owned",
    company: "Strong",
    individual: "None",
  },
  {
    feature: "Losses",
    trust: "Trapped in trust (not distributed)",
    company: "Trapped in company",
    individual: "Offset other income",
  },
  {
    feature: "Setup cost",
    trust: "$2,000–$5,000",
    company: "$1,500–$3,000",
    individual: "Nil",
  },
  {
    feature: "Annual compliance",
    trust: "$1,500–$3,000",
    company: "$1,500–$3,000",
    individual: "$0–$500",
  },
];

const PITFALLS = [
  {
    title: "Trust losses are quarantined",
    body: "Section 102 rules prevent trust losses from being distributed to beneficiaries. Unlike a sole trader who can offset business losses against other income, losses generated inside a trust are trapped and can only be carried forward to offset future trust income — subject to passing the trust loss provisions.",
  },
  {
    title: "Unpaid Present Entitlements (UPEs) and Division 7A",
    body: "When a trustee resolves to distribute income to a company beneficiary but does not actually pay the cash, an Unpaid Present Entitlement (UPE) is created. The ATO treats UPEs to private companies as loans subject to Division 7A. If not documented under a complying loan agreement, the UPE is treated as an unfranked dividend in the hands of the individual shareholder.",
  },
  {
    title: "Family trust election required to use trust losses",
    body: "To access the trust loss provisions and carry forward losses, a trust must make a Family Trust Election (FTE), which locks the trust into a narrow family group definition. Once made, distributions outside the family group attract significant tax penalties. The election should not be made without considering all future beneficiaries.",
  },
  {
    title: "Section 100A — ATO scrutiny of non-arm's length distributions",
    body: "The ATO's section 100A rules target arrangements where trust income is distributed to a low-tax-rate beneficiary, but the economic benefit flows back to a higher-tax-rate person. For example, income distributed to an adult child who informally returns the funds to parents. The ATO has significantly increased audit activity in this area since 2022.",
  },
];

const FAQS = [
  {
    q: "Does a discretionary trust pay tax?",
    a: "No, the trust itself is not a taxpayer. Income is distributed to beneficiaries who pay tax at their individual marginal rates. If the trustee fails to distribute trust income by the end of the financial year, the trustee is assessed on the undistributed amount at the top marginal rate of 47%.",
  },
  {
    q: "Can a trust distribute income to reduce tax?",
    a: "Yes, income splitting is a key benefit of discretionary trusts — the trustee can direct income to lower-income family members each year to utilise their lower marginal rates. However, distributions to minors under 18 are taxed at penalty rates (not adult rates, except in testamentary trusts). The ATO's section 100A rules also scrutinise arrangements where the economic benefit does not match the legal entitlement — for example, distributing to a low-income adult child who informally returns the money to high-income parents.",
  },
  {
    q: "What is a bucket company?",
    a: "A bucket company is a related private company (typically a trustee or beneficiary company) to which the trustee resolves to distribute trust income. The company is taxed at 25% (base rate entity, for passively-held investment income) or 30%, effectively capping the tax rate on that income. Care is required around Division 7A — if funds are then loaned back to individuals from the company, a complying loan agreement is required to avoid deemed dividend treatment. Bucket companies require proper corporate governance, annual minutes, and ongoing accounting.",
  },
  {
    q: "Are capital gains taxed differently in a trust?",
    a: "Capital gains flow through to beneficiaries and the 50% CGT discount applies if the underlying asset was held for 12 months or more before disposal. The trustee can designate a specific beneficiary to receive the discounted capital gain in the annual trustee resolution, allowing the gain to be streamed to the most tax-effective beneficiary.",
  },
  {
    q: "Can trust losses be offset against other income?",
    a: "No. Trust losses are quarantined within the trust under section 102 rules. They can be carried forward and offset against future trust income, but only if the trust passes the trust loss provisions — either via a Family Trust Election (narrow family group test) or the 50% stake test. Trust losses cannot offset a beneficiary's salary, dividends, or rental income.",
  },
  {
    q: "What records must a trust keep?",
    a: "The trustee must maintain: the original trust deed and any deed amendments, annual trustee resolutions directing income distributions (must be executed before 30 June each year), the trust tax return, beneficiary statements, and all asset records for CGT purposes. Records should be kept for at least 5 years after the relevant activity, and for longer where CGT assets are involved.",
  },
];

export default function TrustsTaxPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Tax", url: absoluteUrl("/tax") },
    { name: "Family Trusts & Tax", url: absoluteUrl("/tax/trusts") },
  ]);
  const faq = faqJsonLd(FAQS);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      {faq && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }} />}
      <div className="bg-white min-h-screen">

        {/* Hero */}
        <section className="bg-slate-900 text-white py-10 md:py-14">
          <div className="container-custom">
            <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-5" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-white">Home</Link>
              <span className="text-slate-600">/</span>
              <Link href="/tax" className="hover:text-white">Tax</Link>
              <span className="text-slate-600">/</span>
              <span className="text-white font-medium">Family Trusts &amp; Tax</span>
            </nav>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="text-xs font-semibold bg-amber-500 text-slate-900 px-3 py-1 rounded-full">Updated {CURRENT_YEAR}</span>
              <span className="text-xs font-semibold bg-slate-700 text-slate-200 px-3 py-1 rounded-full">ATO Rules {CURRENT_YEAR}</span>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-3 max-w-3xl">
              Family Trust Taxation in Australia
            </h1>
            <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-3xl">
              How discretionary (family) trusts are taxed in Australia — income splitting, CGT discount,
              the bucket company strategy, trust losses, and key ATO anti-avoidance rules.
            </p>
          </div>
        </section>

        {/* Key Stats */}
        <section className="bg-white py-8 border-b border-slate-100">
          <div className="container-custom">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                {
                  v: "Marginal rate",
                  l: "Trust distributions taxed at",
                  sub: "Beneficiary's individual rate applies",
                },
                {
                  v: "$0",
                  l: "Trust-level tax rate",
                  sub: "The trust itself is not a taxpayer",
                },
                {
                  v: "50%",
                  l: "CGT discount available",
                  sub: "If asset held 12+ months",
                },
                {
                  v: "Annual",
                  l: "Trust tax return required",
                  sub: "Plus trustee resolutions by 30 June",
                },
              ].map((s) => (
                <div key={s.l} className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                  <div className="text-2xl font-extrabold text-slate-900">{s.v}</div>
                  <div className="text-xs font-bold text-slate-700 mt-0.5">{s.l}</div>
                  <div className="text-xs text-slate-500">{s.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Types of Trusts */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">Types of trusts in Australia</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {TRUST_TYPES.map((t) => (
                <div key={t.title} className="rounded-xl border border-slate-200 bg-white p-5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="font-extrabold text-slate-900">{t.title}</h3>
                    <span className={`shrink-0 text-xs font-semibold px-2 py-1 rounded-full border ${t.badgeColor}`}>
                      {t.badge}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">{t.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How Trust Income is Taxed */}
        <section className="py-10 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">How trust income is taxed</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-800 text-white">
                    <th className="text-left py-3 px-4 text-xs font-bold w-1/2">Component</th>
                    <th className="text-left py-3 px-4 text-xs font-bold">Tax treatment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {TAX_MECHANICS.map((row) => (
                    <tr key={row.component} className={row.highlight ? "bg-amber-50" : "bg-white hover:bg-slate-50 transition-colors"}>
                      <td className="py-3 px-4 text-xs font-semibold text-slate-800">{row.component}</td>
                      <td className="py-3 px-4 text-xs text-slate-700">{row.treatment}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs text-slate-400 mt-2">Rates for FY2025–26. Excludes Medicare Levy (2%). Verify at ato.gov.au.</p>
            </div>
          </div>
        </section>

        {/* Bucket Company Strategy */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">Bucket company strategy</h2>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 space-y-4">
              <p className="text-sm text-slate-700 leading-relaxed">
                A <strong>bucket company</strong> is a related private company that receives a distribution from the trust.
                Instead of income flowing to an individual at up to 47% marginal rate, it is resolved to the company,
                which pays company tax at <strong>25%</strong> (base rate entity — passively-held investment income)
                or <strong>30%</strong> (otherwise). This &quot;caps&quot; the effective tax rate on that income.
              </p>
              <div className="rounded-lg border border-amber-300 bg-white p-4">
                <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-2">Division 7A Risk</p>
                <p className="text-sm text-slate-700 leading-relaxed">
                  If the funds sitting in the bucket company are subsequently lent back to individuals (shareholders or associates),
                  Division 7A treats the loan as an unfranked deemed dividend unless a <strong>complying loan agreement</strong> is
                  in place with minimum interest and maximum repayment terms. Failure to document correctly results in the full
                  loan amount being included in the individual&apos;s assessable income.
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">Not a Set-and-Forget Strategy</p>
                <p className="text-sm text-slate-600 leading-relaxed">
                  The bucket company requires proper corporate governance — annual trustee resolutions specifying the distribution,
                  company board minutes, and ongoing tax returns for the company. Accountants typically charge $1,500–$3,000 p.a.
                  for compliance. It is most effective when income levels are sustained and the tax differential justifies the additional cost.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Trust vs Other Structures */}
        <section className="py-10 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">Trust vs other structures</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-800 text-white">
                    <th className="text-left py-3 px-4 text-xs font-bold">Feature</th>
                    <th className="text-center py-3 px-4 text-xs font-bold">Discretionary Trust</th>
                    <th className="text-center py-3 px-4 text-xs font-bold">Company</th>
                    <th className="text-center py-3 px-4 text-xs font-bold">Sole Trader / Individual</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {COMPARISON_ROWS.map((row) => (
                    <tr key={row.feature} className="bg-white hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 text-xs font-bold text-slate-800">{row.feature}</td>
                      <td className="py-3 px-4 text-center text-xs text-emerald-700 font-medium">{row.trust}</td>
                      <td className="py-3 px-4 text-center text-xs text-slate-600">{row.company}</td>
                      <td className="py-3 px-4 text-center text-xs text-slate-600">{row.individual}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs text-slate-400 mt-2">General comparison only. Costs vary by accountant and complexity. Seek professional advice for your specific situation.</p>
            </div>
          </div>
        </section>

        {/* Common Pitfalls */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">Common trust tax pitfalls</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {PITFALLS.map((p) => (
                <div key={p.title} className="rounded-xl border border-red-200 bg-red-50 p-5">
                  <div className="flex items-start gap-2 mb-2">
                    <span className="text-red-600 font-black text-lg leading-none shrink-0">!</span>
                    <h3 className="font-extrabold text-red-900">{p.title}</h3>
                  </div>
                  <p className="text-sm text-red-800 leading-relaxed">{p.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section className="py-12 bg-slate-50 border-t border-slate-200">
          <div className="container-custom max-w-3xl">
            <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Frequently asked questions</h2>
            <div className="space-y-3">
              {FAQS.map((item) => (
                <details key={item.q} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                  <summary className="flex items-center justify-between px-5 py-4 cursor-pointer font-bold text-slate-900 hover:bg-slate-50">
                    {item.q}
                  </summary>
                  <div className="px-5 pb-4 text-sm text-slate-700 leading-relaxed">{item.a}</div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Compliance + nav */}
        <section className="py-10 bg-slate-100 border-t border-slate-200">
          <div className="container-custom max-w-4xl">
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">{GENERAL_ADVICE_WARNING} Trust taxation is a complex area of law. This guide is general in nature and does not constitute tax advice. Consult a registered tax agent or solicitor before establishing or modifying a trust structure.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <Link href="/tax" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">Tax hub &#8594;</Link>
              <Link href="/tax/capital-gains" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">Capital Gains Tax guide &#8594;</Link>
              <Link href="/advisors/tax-agents" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">Find a tax agent &#8594;</Link>
            </div>
          </div>
        </section>

      </div>
    </>
  );
}
