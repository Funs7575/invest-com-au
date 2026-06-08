import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import HubAdvisorCTA from "@/components/HubAdvisorCTA";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Pension Phase Super — Account-Based Pension Guide (${CURRENT_YEAR}) | invest.com.au`,
  description: `How pension phase works in Australia: moving super from accumulation to pension phase, tax-free income rules, minimum drawdown requirements, TTR pensions, and transfer balance cap. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Pension Phase Super — Account-Based Pension Guide (${CURRENT_YEAR})`,
    description: "Account-based pensions, TTR, minimum drawdowns, tax-free income, and the transfer balance cap explained for Australian retirees.",
    url: `${SITE_URL}/retirement/pension-phase`,
    images: [{ url: `/api/og?title=${encodeURIComponent("Pension Phase Super")}&sub=${encodeURIComponent("ABP · TTR · Tax-Free · Transfer Balance Cap · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/retirement/pension-phase` },
};

const DRAWDOWN_TABLE = [
  { age: "Under 65", min: "4%" },
  { age: "65–74", min: "5%" },
  { age: "75–79", min: "6%" },
  { age: "80–84", min: "7%" },
  { age: "85–89", min: "9%" },
  { age: "90–94", min: "11%" },
  { age: "95+", min: "14%" },
];

const COMPARISON = [
  { item: "Tax on investment earnings", accum: "15%", pension: "0%", ttr: "15%" },
  { item: "Tax on pension income (under 60)", accum: "N/A", pension: "Marginal + 15% offset", ttr: "Marginal + 15% offset" },
  { item: "Tax on pension income (60+)", accum: "N/A", pension: "Tax-free", ttr: "Tax-free" },
  { item: "Minimum drawdown required", accum: "None", pension: "Age-based % (see table)", ttr: "Age-based %; max 10%" },
  { item: "Lump sum withdrawals", accum: "Allowed (tax applies)", pension: "Allowed (tax-free 60+)", ttr: "Restricted (re-contribution rules)" },
  { item: "Transfer balance cap limit", accum: "N/A (accumulation)", pension: "Yes ($1.9M cap 2024–25)", ttr: "No (counted separately)" },
];

const FAQS = [
  {
    q: "What is the difference between accumulation phase and pension phase?",
    a: "In accumulation phase, your super fund's investment earnings are taxed at 15% (capital gains at 10% after 12 months). When you move to pension phase, investment earnings become tax-free. For members aged 60+, pension income payments are also tax-free. The shift to pension phase is permanent — you can't move money back to accumulation once a pension account is started (without closing the pension). You commence a pension by instructing your fund to open an account-based pension (ABP) using your super balance.",
  },
  {
    q: "What is the transfer balance cap?",
    a: "The transfer balance cap (TBC) is the maximum you can move from accumulation into a tax-free pension account. For 2024–25, the general TBC is $1.9M. If you exceed this cap, the excess is either transferred back to accumulation or withdrawn — and an excess transfer balance tax applies. Your own personal TBC may be lower if you've previously had a pension and stopped it. The ATO's Transfer Balance Account Report (TBAR) tracks movements. Exceeding the cap is one of the most expensive SMSF mistakes — get specialist advice before commencing a pension on large balances.",
  },
  {
    q: "What is a Transition to Retirement (TTR) pension?",
    a: "A TTR pension allows members who have reached preservation age (currently 60) to draw income from super while still working. TTR pensions do NOT receive the tax-free-earnings treatment of full retirement pensions (investment earnings remain taxed at 15%). Maximum drawdown is 10%. A TTR pension becomes a full account-based pension when you retire or turn 65 — at that point investment earnings become tax-free. TTR strategies were popular for salary-sacrifice arbitrage before 2017 tax changes — the earnings tax removal eliminated most of the financial benefit for high earners.",
  },
  {
    q: "What are the minimum drawdown requirements?",
    a: "Account-based pension holders must draw at least the age-based minimum percentage each year. For 2024–25 the standard minimums are: under 65 (4%), 65–74 (5%), 75–79 (6%), 80–84 (7%), 85–89 (9%), 90–94 (11%), 95+ (14%). The minimum is calculated on the opening balance each year. If you don't take the minimum, the ATO may treat the pension as having lost its concessional status for that year — a serious consequence. There is no maximum drawdown for standard ABPs (only TTR has a 10% cap).",
  },
  {
    q: "Can I have both an accumulation account and a pension account?",
    a: "Yes. Many SMSF members have a pension account (up to the $1.9M TBC) and keep the remainder in accumulation. The fund segregates assets between pension and accumulation (either by actual or proportional method). Accumulation earnings are taxed at 15%; pension earnings are tax-free. For large balances, a segregated asset approach may deliver better tax outcomes. This is a key reason the SMSF setup costs are worth it for balances above $500k–$600k — the ability to hold both phases optimally.",
  },
];

export default function PensionPhasePage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Retirement", url: `${SITE_URL}/retirement` },
    { name: "Pension Phase" },
  ]);
  const faqLd = faqJsonLd(FAQS.map(f => ({ q: f.q, a: f.a })));

  return (
    <div className="bg-white min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />

      {/* Hero */}
      <section className="border-b border-slate-100 py-8 md:py-12">
        <div className="container-custom max-w-4xl">
          <nav aria-label="Breadcrumb" className="text-xs text-slate-500 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-slate-900">Home</Link><span>/</span>
            <Link href="/retirement" className="hover:text-slate-900">Retirement</Link><span>/</span>
            <span className="text-slate-900 font-medium">Pension Phase</span>
          </nav>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">
            Pension phase super: account-based pensions explained
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed mb-3">
            Moving super from accumulation to pension phase makes investment earnings tax-free and,
            for members aged 60+, pension income tax-free too. How account-based pensions work,
            minimum drawdowns, TTR pensions, and the $1.9M transfer balance cap.
          </p>
          <p className="text-xs text-slate-400">{UPDATED_LABEL} · General information only · Not financial advice</p>
        </div>
      </section>

      {/* Comparison table */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-5">Accumulation vs pension vs TTR</h2>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm" aria-label="Superannuation accumulation vs pension vs TTR phase comparison">
              <thead>
                <tr className="bg-slate-900">
                  <th scope="col" className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide">Feature</th>
                  <th scope="col" className="text-left px-3 py-3 text-xs font-bold text-white uppercase tracking-wide">Accumulation</th>
                  <th scope="col" className="text-left px-3 py-3 text-xs font-bold text-white uppercase tracking-wide">Pension (ABP)</th>
                  <th scope="col" className="text-left px-3 py-3 text-xs font-bold text-white uppercase tracking-wide">TTR Pension</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {COMPARISON.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-900 text-xs">{row.item}</td>
                    <td className="px-3 py-3 text-xs text-slate-600">{row.accum}</td>
                    <td className="px-3 py-3 text-xs text-emerald-700 font-semibold">{row.pension}</td>
                    <td className="px-3 py-3 text-xs text-slate-600">{row.ttr}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Minimum drawdown table */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Minimum annual drawdown rates</h2>
          <p className="text-sm text-slate-500 mb-5">Applied to the opening balance on 1 July each year. TTR pensions: same minimums but capped at 10% maximum.</p>
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm" aria-label="Minimum annual superannuation drawdown rates by age">
              <thead>
                <tr className="bg-slate-900">
                  <th scope="col" className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide">Age</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide">Minimum drawdown</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {DRAWDOWN_TABLE.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-900">{row.age}</td>
                    <td className="px-4 py-3 text-slate-700 font-mono">{row.min}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400 mt-2">COVID-era 50% reduction has ended. Standard rates apply from 2023–24 onwards.</p>
        </div>
      </section>

      {/* Transfer balance cap callout */}
      <section className="py-8 border-b border-slate-100 bg-amber-50">
        <div className="container-custom max-w-4xl">
          <div className="flex gap-4">
            <span className="text-2xl shrink-0" aria-hidden>⚠️</span>
            <div>
              <p className="font-bold text-slate-900 mb-1">$1.9M transfer balance cap (2024–25)</p>
              <p className="text-sm text-slate-700 leading-relaxed">
                You can only move up to $1.9M into a tax-free pension account over your lifetime. Amounts above this stay in accumulation (taxed at 15% on earnings). The cap is indexed in $100k increments to CPI. Exceeding the cap triggers excess transfer balance tax at up to 30%. If you expect a large defined benefit pension, get specialist advice before starting any ABP — defined benefit pensions are counted against your TBC at a multiple of their annual value.
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
                  <span className="shrink-0 text-slate-400 group-open:rotate-180 transition-transform text-lg leading-none" aria-hidden="true">▾</span>
                </summary>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Advisor CTA */}
      <HubAdvisorCTA
        heading="Get personalised pension phase advice"
        subheading="Transfer balance cap, minimum drawdown, sequencing risk, and estate planning all interact in pension phase. A licensed financial planner can help you navigate the transition."
        intent={{ need: "retirement", context: ["pension_phase", "super_strategy"] }}
        source="retirement_pension_phase"
        ctaLabel="Find a retirement income specialist"
        className="py-12 bg-amber-50 border-t border-amber-200"
      />

      {/* Related */}
      <section className="py-8 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-xl font-extrabold text-slate-900 mb-4">Related guides</h2>
          <div className="flex flex-wrap gap-3">
            {[
              { href: "/retirement/annuities", label: "Annuities vs ABP" },
              { href: "/retirement/how-much-do-you-need", label: "How much do I need?" },
              { href: "/retirement/age-pension", label: "Age pension guide" },
              { href: "/smsf/investment-strategy", label: "SMSF investment strategy" },
              { href: "/retirement", label: "Retirement hub" },
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
            <strong>General advice warning.</strong> {GENERAL_ADVICE_WARNING} Super rules, tax rates and transfer balance cap thresholds change each financial year — verify current figures at ato.gov.au. This page is general information only; it is not financial advice. Consult a licensed financial adviser before commencing a pension or making drawdown decisions.
          </p>
        </div>
      </section>
    </div>
  );
}
