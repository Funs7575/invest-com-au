import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `How Much Super Do You Need to Retire? (${CURRENT_YEAR} Guide) | invest.com.au`,
  description: `ASFA retirement standard, comfortable vs modest living benchmarks, the 4% rule, and how to calculate your personal retirement number in Australia. Includes Age Pension interaction. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `How Much Super Do You Need to Retire? (${CURRENT_YEAR})`,
    description: "ASFA retirement standards, the 4% rule, Age Pension interaction — how to calculate your retirement number in Australia.",
    url: `${SITE_URL}/retirement/how-much-do-you-need`,
    images: [{ url: `/api/og?title=${encodeURIComponent("How Much Super to Retire?")}&sub=${encodeURIComponent("ASFA · 4% Rule · Age Pension · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/retirement/how-much-do-you-need` },
};

const ASFA_BENCHMARKS = [
  { lifestyle: "Modest — single", annual: "$33,134", super: "~$100,000 (Age Pension tops up significantly)", notes: "Basic activities; annual holiday within Australia; older car" },
  { lifestyle: "Modest — couple", annual: "$47,731", super: "~$100,000 (Age Pension tops up significantly)", notes: "Similar to single modest but joint expenditure" },
  { lifestyle: "Comfortable — single", annual: "$51,630", super: "~$595,000", notes: "Private health; annual overseas holiday; renovations; newer car" },
  { lifestyle: "Comfortable — couple", annual: "$72,663", super: "~$690,000", notes: "Comfortable activities; overseas travel; eating out regularly" },
];

const RULES_OF_THUMB = [
  { rule: "ASFA Comfortable standard", approach: "Use published benchmarks as a starting point; adjust for your actual lifestyle spending", limit: "Assumes own home; no mortgage; average health spending" },
  { rule: "4% drawdown rule (Bengen)", approach: "Multiply desired annual income by 25 (e.g. $60k/year → $1.5M needed). Withdraw 4% in year 1; increase with inflation each year", limit: "US data; 30-year horizon; no Age Pension credit; may be conservative for shorter retirements" },
  { rule: "Replacement rate (70–80%)", approach: "Target 70–80% of pre-retirement income. If you earn $150k, target $105k–$120k in retirement", limit: "Ignores commuting, work costs, and lifestyle changes; high earners over-estimate needs" },
  { rule: "Age Pension-adjusted target", approach: "Subtract expected Age Pension ($28k single / $42k couple) from your target. Model assets test taper.", limit: "Age Pension rates, thresholds, and means test change frequently" },
];

const FAQS = [
  {
    q: "What is the ASFA Retirement Standard?",
    a: "The Association of Superannuation Funds of Australia (ASFA) publishes quarterly retirement expenditure benchmarks for both 'modest' and 'comfortable' retirements for singles and couples. As of September 2024: comfortable single needs $51,630/year; comfortable couple needs $72,663/year; modest single $33,134/year; modest couple $47,731/year. These benchmarks assume you own your home outright. They are a useful starting point but don't reflect everyone's circumstances — your actual number may be higher (if you travel extensively, have high medical costs, or rent) or lower (if you live frugally).",
  },
  {
    q: "Does the 4% rule work for Australian retirees?",
    a: "The 4% rule (Bengen rule) says you can withdraw 4% of your portfolio in year 1 and adjust for inflation, with low risk of running out over 30 years. For Australia: (1) It doesn't account for the Age Pension, which reduces the amount you need to draw from super; (2) Australian retirees have minimum drawdown requirements (4% at 65–74) that roughly align with the 4% rule anyway; (3) 30-year horizons assume retirement at 65 — if you retire at 60, you need 35+ years of funding. Most Australian financial planners use a version of the 4% rule as a sanity check, not as a precise target.",
  },
  {
    q: "How do I account for the Age Pension when calculating my retirement number?",
    a: "The Age Pension can significantly reduce the super balance you need. For a homeowner couple: if you have $600,000 in super, you're within the part-pension assets test — you'll receive ~$400–$600/fortnight from Centrelink, worth $10,000–$15,000/year. This reduces the amount you need to draw from your own super. The interaction is complex because: (1) the assets test reduces your pension at $3 per $1,000 above the threshold; (2) the income test (deeming) runs simultaneously; (3) the higher-value test applies. The Services Australia retirement estimator (servicesaustralia.gov.au) can model your entitlement at different asset levels.",
  },
  {
    q: "What about inflation and healthcare costs in retirement?",
    a: "Two factors significantly erode retirement purchasing power: (1) Inflation: even at 3% p.a., $70,000 today becomes equivalent to $120,000 in 20 years. Index-linked annuities and inflation-linked bonds help hedge this. (2) Healthcare: medical costs tend to rise faster than CPI in retirement, particularly after 75 when out-of-pocket costs for specialists, dental, hearing aids, and aged care can be significant. The Grattan Institute estimates Australians underestimate medical costs in retirement by $50,000–$100,000+ over their lifetime. Building a medical contingency reserve into your retirement number is conservative but prudent.",
  },
];

export default function HowMuchRetirementPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Retirement", url: `${SITE_URL}/retirement` },
    { name: "How Much Do You Need?" },
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
            <Link href="/retirement" className="hover:text-slate-900">Retirement</Link><span>/</span>
            <span className="text-slate-900 font-medium">How Much Do You Need?</span>
          </nav>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">
            How much super do you need to retire in Australia?
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed mb-3">
            ASFA comfortable benchmarks, the 4% rule, Age Pension interaction, and how to build your
            personal retirement number. Most Australians need less than they think once the Age Pension
            is modelled correctly.
          </p>
          <p className="text-xs text-slate-400">{UPDATED_LABEL} · General information only · Not financial advice</p>
        </div>
      </section>

      {/* ASFA benchmarks */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">ASFA retirement benchmarks (September 2024)</h2>
          <p className="text-sm text-slate-500 mb-5">Assumes home owned outright. Adjustments needed for renters, high healthcare costs, or frequent overseas travel.</p>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-900">
                  <th className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide">Lifestyle</th>
                  <th className="text-left px-3 py-3 text-xs font-bold text-white uppercase tracking-wide">Annual spend</th>
                  <th className="text-left px-3 py-3 text-xs font-bold text-white uppercase tracking-wide">Super needed</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide">What it covers</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {ASFA_BENCHMARKS.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-900">{row.lifestyle}</td>
                    <td className="px-3 py-3 text-amber-700 font-bold">{row.annual}</td>
                    <td className="px-3 py-3 text-slate-700">{row.super}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 leading-relaxed">{row.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400 mt-2">ASFA benchmarks are updated quarterly. The &quot;super needed&quot; figures assume full Age Pension access. Verify latest at asfa.asn.au.</p>
        </div>
      </section>

      {/* Rules of thumb */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-5">Retirement number approaches</h2>
          <div className="space-y-4">
            {RULES_OF_THUMB.map((rule, i) => (
              <div key={i} className="rounded-xl border border-slate-200 p-5 bg-white">
                <p className="font-bold text-slate-900 mb-1">{rule.rule}</p>
                <p className="text-sm text-slate-600 leading-relaxed mb-2">{rule.approach}</p>
                <p className="text-xs text-slate-400 border-t border-slate-100 pt-2"><strong>Limitation:</strong> {rule.limit}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Key insight */}
      <section className="py-8 border-b border-slate-100 bg-amber-50">
        <div className="container-custom max-w-4xl">
          <div className="flex gap-4">
            <span className="text-2xl shrink-0" aria-hidden>💡</span>
            <div>
              <p className="font-bold text-slate-900 mb-1">The Age Pension is worth $28k–$42k/year — don&apos;t ignore it</p>
              <p className="text-sm text-slate-700 leading-relaxed">
                Most retirement calculators undercount the Age Pension. A homeowner couple with $600k in super will receive a part-pension worth approximately $400/fortnight ($10,400/year) even after the assets test taper. At $400k in super they&apos;d receive nearly the full pension ($1,766/fortnight combined). For modest lifestyle retirees, the combination of Age Pension + $300k–$400k in super can fund a comfortable retirement indefinitely — the super draws down slowly and the Age Pension increases as assets deplete.
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
              { href: "/retirement/age-pension", label: "Age pension guide" },
              { href: "/retirement/pension-phase", label: "Account-based pension" },
              { href: "/retirement/annuities", label: "Annuities for income" },
              { href: "/super", label: "Super hub" },
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
            <strong>General advice warning.</strong> {GENERAL_ADVICE_WARNING} ASFA benchmarks, Age Pension rates, and assets test thresholds change frequently. This page is general information only; it is not financial advice. Your personal retirement number depends on your specific circumstances, lifestyle goals, health, family obligations, and tax situation. Consult a licensed financial adviser for a retirement projection model.
          </p>
        </div>
      </section>
    </div>
  );
}
