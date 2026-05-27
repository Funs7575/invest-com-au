import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `How to Compare Super Funds in Australia (${CURRENT_YEAR} Guide) | invest.com.au`,
  description: `How to compare Australian super funds: investment returns (10-year net), fees, insurance, investment options, MySuper vs Choice, and how to read a PDS. Includes the 6 questions to ask. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `How to Compare Super Funds (${CURRENT_YEAR} Guide)`,
    description: "Comparing Australian super funds: net 10-year returns, fees, insurance, investment options, MySuper performance test, and PDS reading guide.",
    url: `${SITE_URL}/super/compare-guide`,
    images: [{ url: `/api/og?title=${encodeURIComponent("How to Compare Super Funds")}&sub=${encodeURIComponent("Returns · Fees · Insurance · PDS · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/super/compare-guide` },
};

const COMPARISON_CRITERIA = [
  {
    criterion: "Net investment returns (10-year)",
    why: "The most important metric. Use net returns (after fees and taxes) not gross. Compare over 10+ years — short-term performance is largely noise.",
    where: "ATO YourSuper comparison tool (ato.gov.au/yoursuper); APRA MySuper heatmap; Superannuation Performance Comparison Tool (moneysmart.gov.au)",
    watch: "Compare like for like — balanced option vs balanced option. A 'high growth' option in one fund vs a 'balanced' in another is meaningless comparison.",
  },
  {
    criterion: "Administration fees",
    why: "Fixed admin fees (e.g. $78/year flat) hurt small balances more than large ones. Percentage fees (0.15–0.8% p.a.) compound significantly over decades.",
    where: "Product Disclosure Statement (PDS), ASIC's super fee comparison tool",
    watch: "Some funds show low investment fees but high insurance premiums — check total cost including insurance.",
  },
  {
    criterion: "Investment options",
    why: "Most default members are in 'MySuper' balanced options. If you want lifecycle investing, ethical options, direct equities, or sector tilts, you need a choice fund.",
    where: "Fund website — Investment menu / investment options section",
    watch: "More investment options ≠ better fund. A simple, low-cost balanced index option often outperforms complex active strategies net of fees.",
  },
  {
    criterion: "Insurance (life, TPD, income protection)",
    why: "Employer super funds include default insurance. Premiums reduce your balance — compare premiums and coverage, and check if your existing cover will be cancelled on rollover.",
    where: "PDS or insurance guide for the fund; call the fund to confirm your insurance balance before rolling over",
    watch: "Rolling all super into one fund can cancel existing insurance in the funds you consolidate from. If you have a pre-existing condition, getting new insurance may be impossible.",
  },
  {
    criterion: "MySuper performance test result",
    why: "APRA tests all MySuper products against a benchmark. Funds that underperform for 2 consecutive years are banned from accepting new members.",
    where: "APRA heatmap; fund must notify members of underperformance",
    watch: "Performance test is backward-looking. A fund that just passed the test may have done so after years of underperformance.",
  },
  {
    criterion: "Financial strength and history",
    why: "Industry super funds (AusSuper, Aware, Hostplus) have long track records. Newer or smaller retail funds carry more institutional risk.",
    where: "APRA statistics; fund annual reports",
    watch: "Not-for-profit industry funds generally have lower fee structures than retail funds — the ownership model matters.",
  },
];

const FUND_TYPES = [
  { type: "Industry super fund", examples: "AustralianSuper, Aware Super, Hostplus, REST", fees: "Typically low (0.5–0.8% incl. investment fees)", returns: "Generally competitive long-term; many are APRA top performers", who: "Most employees; default award-based super" },
  { type: "Retail super fund", examples: "AMP, BT, MLC, OnePath", fees: "Higher (0.8–1.5%+)", returns: "Historically underperformed industry funds net of fees", who: "Often employer-mandated; financial adviser-driven" },
  { type: "SMSF", examples: "Self-managed; any trustee", fees: "Fixed $1,500–$5,000/year + audit", returns: "Depends entirely on member's investment strategy", who: "$200k+ balances wanting control, direct property, or specific investment strategies" },
  { type: "Corporate super fund", examples: "Fund operated by employer for staff", fees: "Varies; often competitive due to bulk purchasing", returns: "Varies", who: "Employees of companies with dedicated employer super arrangements" },
];

const FAQS = [
  {
    q: "What is the YourSuper comparison tool and should I use it?",
    a: "The ATO&apos;s YourSuper tool (ato.gov.au/yoursuper) is a government-run comparison platform that shows all MySuper products, their 10-year net returns, fees, and whether they passed APRA&apos;s performance test. It&apos;s a reliable starting point because the data comes directly from APRA and is standardised — unlike fund marketing materials. Limitation: it only covers MySuper (default balanced options), not the full investment menus of choice funds. For comparing non-default investment options or specialist funds, you&apos;ll need the PDS of each fund.",
  },
  {
    q: "How much does 0.5% extra in fees cost over a career?",
    a: "A lot. On a $100,000 super balance with 8% annual return: after 30 years, an additional 0.5% fee annually (1.0% vs 0.5%) results in approximately $60,000–$80,000 less in your final balance. On a $500,000 balance, the compounding difference over 20 years is $150,000–$200,000. This is why the annual fee comparison matters significantly — a 0.4% difference in fees on a large balance over a long period is worth more than the time it takes to compare.",
  },
  {
    q: "Should I consolidate all my super into one fund?",
    a: "Usually yes — but check insurance before you act. If you have multiple super funds, you&apos;re paying multiple sets of admin fees and potentially multiple insurance premiums for overlapping coverage. Consolidating into your best-performing, lowest-fee fund saves money. However: (1) if you have existing default insurance in a fund you&apos;re closing, it cancels — you may not be able to get equivalent cover in the new fund, especially if you have a health condition; (2) some older employer funds have exit fees; (3) some industry fund defined benefit components cannot be rolled over. Call each fund before requesting a rollover to understand the insurance consequences.",
  },
  {
    q: "What is a Product Disclosure Statement (PDS) and what should I check in it?",
    a: "A PDS is the legal document describing all material details of a super fund product. Key things to check: (1) Fees section — administration fee, investment fee, indirect cost ratio, buy/sell spread, switching fee; (2) Investment option details — return objective, benchmark, asset allocation ranges; (3) Insurance — default cover levels, premiums (how they change with age), exclusions, definition of TPD; (4) Exit rules — cooling-off period, transfer rules; (5) Complaints — dispute resolution process. ASIC requires all PDSs to use standardised fee disclosure since 2013, making comparisons easier. Download PDSs from the fund website or ASIC&apos;s Moneysmart comparator.",
  },
];

export default function SuperCompareGuidePage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Super", url: `${SITE_URL}/super` },
    { name: "How to Compare Super Funds" },
  ]);
  const faqLd = faqJsonLd(FAQS.map(f => ({ q: f.q, a: f.a })));

  return (
    <div className="bg-white min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />

      {/* Hero */}
      <section className="border-b border-slate-100 py-8 md:py-12">
        <div className="container-custom max-w-4xl">
          <nav className="text-xs text-slate-500 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-slate-900">Home</Link><span>/</span>
            <Link href="/super" className="hover:text-slate-900">Super</Link><span>/</span>
            <span className="text-slate-900 font-medium">Compare Super Funds</span>
          </nav>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">
            How to compare super funds in Australia ({CURRENT_YEAR})
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed mb-3">
            Not all super funds are equal — a 0.5% fee difference on a $300,000 balance costs
            you $150,000 over 20 years. Here&apos;s how to compare net returns, fees, insurance, and
            investment options using the ATO YourSuper tool and APRA data.
          </p>
          <p className="text-xs text-slate-400">{UPDATED_LABEL} · General information only · Not financial advice</p>
        </div>
      </section>

      {/* Key comparison criteria */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-5">6 criteria for comparing super funds</h2>
          <div className="space-y-4">
            {COMPARISON_CRITERIA.map((c, i) => (
              <div key={i} className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-900 px-5 py-3">
                  <p className="text-sm font-bold text-white">{c.criterion}</p>
                </div>
                <div className="p-5 grid sm:grid-cols-3 gap-4 bg-white">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Why it matters</p>
                    <p className="text-sm text-slate-700 leading-relaxed">{c.why}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Where to find it</p>
                    <p className="text-sm text-slate-700 leading-relaxed">{c.where}</p>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-1">Watch out for</p>
                    <p className="text-xs text-amber-800 leading-relaxed">{c.watch}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Fund types */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-5">Types of super fund</h2>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-900">
                  <th className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide">Fund type</th>
                  <th className="text-left px-3 py-3 text-xs font-bold text-white uppercase tracking-wide">Examples</th>
                  <th className="text-left px-3 py-3 text-xs font-bold text-white uppercase tracking-wide">Typical fees</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide">Best for</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {FUND_TYPES.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-900 text-xs">{row.type}</td>
                    <td className="px-3 py-3 text-xs text-slate-600">{row.examples}</td>
                    <td className="px-3 py-3 text-xs text-slate-600">{row.fees}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 leading-relaxed">{row.who}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Callout */}
      <section className="py-8 border-b border-slate-100 bg-amber-50">
        <div className="container-custom max-w-4xl">
          <div className="flex gap-4">
            <span className="text-2xl shrink-0" aria-hidden>💡</span>
            <div>
              <p className="font-bold text-slate-900 mb-1">Use the ATO YourSuper tool — it&apos;s the most reliable comparison</p>
              <p className="text-sm text-slate-700 leading-relaxed">
                The ATO&apos;s YourSuper comparison tool (ato.gov.au/yoursuper) shows all MySuper products with standardised APRA data: 10-year net returns, fees, and performance test results. It&apos;s the starting point ASIC recommends. For funds that passed the APRA test, also compare investment options beyond the default balanced fund — if you have 30+ years to retirement, a high-growth option may deliver meaningfully better long-term outcomes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Frequently asked questions</h2>
          <div className="space-y-4">
            {FAQS.map((faq, i) => (
              <details key={i} className="group border border-slate-200 rounded-xl p-4">
                <summary className="cursor-pointer list-none font-bold text-slate-900 flex items-start justify-between gap-3">
                  {faq.q}
                  <span className="shrink-0 text-slate-400 group-open:rotate-180 transition-transform text-lg leading-none">▾</span>
                </summary>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Related */}
      <section className="py-8 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-xl font-extrabold text-slate-900 mb-4">Related guides</h2>
          <div className="flex flex-wrap gap-3">
            {[
              { href: "/compare/super", label: "Compare super funds" },
              { href: "/super/contributions", label: "Super contributions guide" },
              { href: "/super/consolidation", label: "Consolidate super" },
              { href: "/smsf", label: "SMSF hub" },
              { href: "/super", label: "Super hub" },
            ].map(link => (
              <Link key={link.href} href={link.href} className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-full text-sm font-semibold text-slate-700 hover:border-amber-300 hover:text-amber-700 transition-colors">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-8 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <p className="text-[11px] text-slate-500 leading-relaxed">
            <strong>General advice warning.</strong> {GENERAL_ADVICE_WARNING} Super fund performance data, fees, and APRA test results change annually. This page is general information only; it is not financial advice. Choosing a super fund is a personal decision — consult a licensed financial adviser if you need personalised super advice.
          </p>
        </div>
      </section>
    </div>
  );
}
