import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, absoluteUrl } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

const FAQS = [
  {
    q: "What does ESG stand for and how does it affect investments?",
    a: "ESG stands for Environmental, Social, and Governance — the three categories of non-financial risk and impact used to evaluate companies and funds. Environmental: climate change, carbon emissions, water usage, biodiversity impact. Social: labour practices, supply chain conditions, data privacy, community relationships. Governance: board independence, executive pay, shareholder rights, anti-corruption policies. ESG ratings are assigned by agencies including MSCI ESG, Sustainalytics, and ISS. Different agencies use different methodologies, meaning the same company can receive divergent ESG ratings.",
  },
  {
    q: "Does ethical investing mean accepting lower returns?",
    a: "The evidence is mixed and evolving. Pre-2022, many ESG indexes outperformed conventional indexes — partly because high ESG scores correlated with quality factors (strong governance) and because tech companies (low-emissions, governance-focused) dominated the period. Post-2022, energy stocks surged while many ESG funds underperformed due to underweights in oil and gas. The academic consensus is that ESG constraints slightly reduce diversification (excluding sectors), which may marginally impact long-run risk-adjusted returns — but the effect is small and not consistently negative. Sector composition differences often explain short-term divergence more than ESG per se.",
  },
  {
    q: "What is greenwashing and how do I identify it?",
    a: "Greenwashing is when an investment product is marketed as more sustainable or ethical than it actually is. Common signs: (1) Vague claims ('green', 'responsible', 'clean') without specific exclusions or methodologies disclosed. (2) A fund name implies ethical focus (e.g., 'Sustainable Future') but holds fossil fuel companies because they have 'improving trajectories'. (3) Using best-in-class ESG screening rather than exclusions — still holding the 'best' oil company in class. (4) Minimal deviation from conventional index benchmarks. ASIC Action: In Australia, ASIC's Information Sheet 271 and updated guidance under ASIC Regulatory Guide 228 now require specific disclosures about sustainability claims. Check the fund's PDS for exact exclusions and methodology.",
  },
  {
    q: "What are the main approaches to ethical or ESG investing?",
    a: "There are four main approaches: (1) Negative screening (exclusion): explicitly exclude companies in harmful industries (weapons, tobacco, gambling, fossil fuels, alcohol). Most commonly used by Australian ethical funds. (2) Positive screening (best-in-class): invest in companies with the highest ESG scores within each industry, rather than excluding industries. (3) ESG integration: use ESG data as an additional risk factor alongside financial analysis, without mandatory exclusions. (4) Impact investing: invest specifically to generate measurable positive social or environmental outcomes (social impact bonds, green bonds, microfinance).",
  },
  {
    q: "Are ethical super funds performing well in Australia?",
    a: "Australian Ethical and Future Super (two of the most values-aligned funds) have produced competitive long-run returns — Australian Ethical's balanced option has returned approximately 8-10% p.a. over 10 years as at 2025-26, competitive with industry fund peers. However, past performance varies by option and year. The Super Ratings and Rainmaker benchmarks include ESG fund comparisons. Note that 'ethical' super funds vary enormously in their definitions: some exclude only tobacco, others exclude fossil fuels entirely. Always check the fund's investment option PDS for exact exclusions.",
  },
  {
    q: "How is ethical investing taxed differently in Australia?",
    a: "It is not taxed differently. The tax treatment of returns from ethical or ESG investments — capital gains (with 50% discount after 12 months), dividends (with franking credits), and interest income — is identical to conventional investments. Holding an ESG ETF in a super fund, SMSF, or personal account follows the same tax rules as any other ETF or managed fund.",
  },
];

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Ethical & ESG Investing Australia (${CURRENT_YEAR}) — Funds, ETFs & Super`,
  description:
    "Guide to ethical and ESG investing in Australia. ESG ETFs (FAIR, ETHI, VESG), ethical super funds, negative screening, greenwashing red flags, and how ESG funds compare on returns.",
  alternates: { canonical: `${SITE_URL}/invest/ethical-investing` },
  openGraph: {
    title: `Ethical & ESG Investing Australia (${CURRENT_YEAR})`,
    description: "ESG ETFs, ethical super funds, screening approaches, greenwashing red flags, and return comparisons.",
    url: `${SITE_URL}/invest/ethical-investing`,
  },
};

export default function EthicalInvestingPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Invest", url: absoluteUrl("/invest") },
    { name: "Ethical Investing", url: absoluteUrl("/invest/ethical-investing") },
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
              <Link href="/invest" className="hover:text-white">Invest</Link>
              <span className="text-slate-600">/</span>
              <span className="text-white font-medium">Ethical Investing</span>
            </nav>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="text-xs font-semibold bg-amber-500 text-slate-900 px-3 py-1 rounded-full">Updated {CURRENT_YEAR}</span>
              <span className="text-xs font-semibold bg-green-600 text-white px-3 py-1 rounded-full">ESG · Impact · Values-based</span>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-3 max-w-3xl">
              Ethical &amp; ESG Investing in Australia
            </h1>
            <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-3xl">
              Ethical, ESG, responsible, and sustainable investing are overlapping terms for strategies that consider environmental, social, or governance factors alongside financial returns. Here is how to navigate the Australian landscape without falling for greenwashing.
            </p>
          </div>
        </section>

        {/* Key Stats */}
        <section className="bg-white py-8 border-b border-slate-100">
          <div className="container-custom">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { v: ">$1.5T", l: "Responsible investment in AUS", sub: "RIAA estimates, 2024" },
                { v: "4", l: "Main ESG approaches", sub: "Exclusion, best-in-class, integration, impact" },
                { v: "ASIC", l: "Greenwashing regulator", sub: "RG 228 sustainability disclosures" },
                { v: "Identical", l: "Tax treatment", sub: "Same CGT, dividends, franking rules" },
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

        {/* ESG approaches */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">Four approaches to ethical investing</h2>
            <div className="space-y-4">
              {[
                {
                  title: "Negative screening (exclusions)",
                  badge: "Most common in Australia",
                  badgeColor: "bg-green-100 text-green-700",
                  body: "Explicitly excludes companies or industries that conflict with defined values — tobacco, weapons, gambling, alcohol, fossil fuels, pornography. Most Australian ethical fund managers use negative screening as a baseline. The key question is how strict the exclusions are: does the fund exclude all fossil fuel involvement (even pipelines or oil services), or only direct coal/oil producers? Check the PDS for the exact exclusion list.",
                },
                {
                  title: "Best-in-class ESG integration",
                  badge: "Large index providers",
                  badgeColor: "bg-blue-100 text-blue-700",
                  body: "Instead of excluding industries, invest in the best-scoring companies within each industry sector. This means an oil company with strong governance and low methane leakage could be included. Used by MSCI ESG Leaders indexes and many broad ESG ETFs. This approach maintains diversification but is less values-aligned than exclusion-based funds. Best-in-class rarely resonates with investors seeking to avoid harmful sectors entirely.",
                },
                {
                  title: "ESG integration (risk management)",
                  badge: "Mainstream finance",
                  badgeColor: "bg-slate-100 text-slate-700",
                  body: "ESG factors are incorporated as additional risk considerations alongside traditional financial analysis, without mandatory exclusions or minimum scores. A fund manager may underweight companies with poor labour practices (higher reputational risk) or avoid coal companies (stranded asset risk). This is how most large institutional fund managers (AustralianSuper, MLC, Colonial) describe their process. Not the same as a specifically 'ethical' or 'responsible' fund.",
                },
                {
                  title: "Impact investing",
                  badge: "Measurable outcomes",
                  badgeColor: "bg-purple-100 text-purple-700",
                  body: "Investing with the explicit intention of generating measurable positive social or environmental outcomes alongside financial returns. Examples: social impact bonds, green bonds, microfinance funds, direct investment in renewable energy projects. Typically available only to wholesale investors and institutions in Australia. Retail access exists through some managed funds and ETFs with impact mandates, but pure impact investing at retail scale is limited.",
                },
              ].map((item) => (
                <div key={item.title} className="rounded-xl border border-slate-200 bg-white p-5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="font-extrabold text-slate-900">{item.title}</h3>
                    <span className={`shrink-0 text-xs font-semibold px-2 py-1 rounded-full ${item.badgeColor}`}>{item.badge}</span>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ASX-listed ESG ETFs */}
        <section className="py-10 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">ESG ETFs on the ASX</h2>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-white">
                  <tr>
                    <th className="text-left p-4 font-bold text-slate-700">ETF</th>
                    <th className="text-left p-4 font-bold text-slate-700">Manager</th>
                    <th className="text-left p-4 font-bold text-slate-700">Approach</th>
                    <th className="text-right p-4 font-bold text-slate-700">MER p.a.</th>
                    <th className="text-left p-4 font-bold text-slate-700">Key exclusions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    { ticker: "FAIR", manager: "BetaShares", approach: "Australian equities — ESG screened", mer: "0.29%", exclusions: "Fossil fuels, gambling, tobacco, weapons, prisons" },
                    { ticker: "ETHI", manager: "BetaShares", approach: "Global equities — ethical (ex-AUS)", mer: "0.59%", exclusions: "Fossil fuels, tobacco, gambling, weapons, nuclear, pornography" },
                    { ticker: "VESG", manager: "Vanguard", approach: "International equities ESG", mer: "0.18%", exclusions: "Tobacco, coal, controversial weapons, adult entertainment" },
                    { ticker: "ESGI", manager: "VanEck", approach: "MSCI international ESG leaders", mer: "0.55%", exclusions: "Best-in-class MSCI ESG scoring — lighter exclusions" },
                    { ticker: "IWLD", manager: "iShares", approach: "Global equities — ESG-integrated", mer: "0.09%", exclusions: "Controversial weapons, tobacco (limited exclusions)" },
                    { ticker: "HETH", manager: "BetaShares", approach: "Global sustainability leaders", mer: "0.49%", exclusions: "Fossil fuels, tobacco, gambling, alcohol, military, prisons" },
                  ].map((row) => (
                    <tr key={row.ticker} className="hover:bg-slate-50">
                      <td className="p-4 font-extrabold text-green-700">{row.ticker}</td>
                      <td className="p-4 text-slate-600">{row.manager}</td>
                      <td className="p-4 text-slate-600">{row.approach}</td>
                      <td className="p-4 text-right font-medium text-slate-700">{row.mer}</td>
                      <td className="p-4 text-xs text-slate-500">{row.exclusions}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500 mt-2">MER figures as at 2025-26. Verify current MER in the relevant PDS before investing. ETFs do not pay financial advice and this is not a recommendation.</p>
          </div>
        </section>

        {/* Greenwashing */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">How to identify greenwashing</h2>
            <p className="text-sm text-slate-600 mb-5">ASIC has pursued enforcement action against greenwashing claims in managed funds. The key test under RG 228 is whether sustainability claims are accurate, balanced, and not misleading. As an investor, look for these red flags:</p>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                {
                  flag: "Vague labels without specific exclusions",
                  detail: "A fund calling itself 'sustainable' or 'responsible' without listing exact exclusions in the PDS. Ask: which industries or companies are explicitly excluded?",
                },
                {
                  flag: "'Tilted' rather than screened",
                  detail: "A fund that 'tilts toward' ESG companies but doesn't exclude any industry. This usually means lower tracking error vs the benchmark but minimal real-world impact.",
                },
                {
                  flag: "Best-in-class includes harmful sectors",
                  detail: "A 'best in class' fund that still holds oil & gas companies (just the 'greenest' ones). Confirm whether your chosen ESG approach is comfortable with this.",
                },
                {
                  flag: "High overlap with conventional index",
                  detail: "Some 'ESG' ETFs differ from conventional indexes by only 3-5% in holdings. Use a tool like ETF Overlap Checker to compare holdings with their conventional equivalent.",
                },
                {
                  flag: "No PDS-level disclosure",
                  detail: "The exclusions are described only in marketing materials, not in the legally binding PDS. ASIC's view is that sustainability representations must be backed by the fund's documented investment process.",
                },
                {
                  flag: "Declining to disclose emissions data",
                  detail: "A 'climate-focused' fund that doesn't publish portfolio-weighted carbon intensity or Scope 1/2/3 emissions data is not measuring what it claims to prioritise.",
                },
              ].map((item) => (
                <div key={item.flag} className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <h3 className="font-extrabold text-amber-900 mb-1 text-sm">{item.flag}</h3>
                  <p className="text-sm text-amber-800 leading-relaxed">{item.detail}</p>
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
        <section className="py-10 bg-slate-50 border-t border-slate-200">
          <div className="container-custom max-w-4xl">
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">{GENERAL_ADVICE_WARNING}</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <Link href="/invest" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">All investment categories →</Link>
              <Link href="/invest/carbon-environmental-markets" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">Carbon &amp; environmental markets →</Link>
              <Link href="/advisors/financial-planners" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">Find a financial planner →</Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
