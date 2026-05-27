import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Age Pension Australia — Eligibility, Rates & Assets Test (${CURRENT_YEAR}) | invest.com.au`,
  description: `Australian Age Pension guide: eligibility age (67), assets test thresholds, income test rules, deeming rates, residency requirements, and how super, investments and property affect your entitlement. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Age Pension Australia — Eligibility & Rates (${CURRENT_YEAR})`,
    description: "Age pension eligibility, 2024–25 payment rates, assets test, income test, deeming — and how to maximise your entitlement.",
    url: `${SITE_URL}/retirement/age-pension`,
    images: [{ url: `/api/og?title=${encodeURIComponent("Age Pension Australia")}&sub=${encodeURIComponent("Eligibility · Rates · Assets Test · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/retirement/age-pension` },
};

const PAYMENT_RATES = [
  { type: "Single person", base: "$1,096.70/fortnight", max: "$1,171.30/fortnight (incl. Pension Supplement + ES)" },
  { type: "Couple (each)", base: "$826.70/fortnight", max: "$883.20/fortnight (incl. supplements)" },
  { type: "Couple (combined)", base: "$1,653.40/fortnight", max: "$1,766.40/fortnight (incl. supplements)" },
];

const ASSETS_THRESHOLDS = [
  { situation: "Single (homeowner)", full: "$301,750", partPart: "$301,750–$674,000", nil: ">$674,000" },
  { situation: "Single (non-homeowner)", full: "$543,750", partPart: "$543,750–$916,000", nil: ">$916,000" },
  { situation: "Couple (homeowners, combined)", full: "$451,500", partPart: "$451,500–$1,012,500", nil: ">$1,012,500" },
  { situation: "Couple (non-homeowners, combined)", full: "$693,500", partPart: "$693,500–$1,254,500", nil: ">$1,254,500" },
];

const FAQS = [
  {
    q: "What is the Age Pension eligibility age in Australia?",
    a: "The qualifying age for the Age Pension is 67 for anyone born on or after 1 January 1957. The age was progressively increased from 65 — the phased increases are now complete. You must also meet the residency requirement (10 years' Australian residence, with at least 5 continuous years) and satisfy the income and assets tests. Australian citizens and permanent residents qualify; New Zealand citizens on special category visas have different rules.",
  },
  {
    q: "How does the assets test work?",
    a: "The assets test assesses the value of assets you own (or part-own). Assessable assets include: superannuation balances (from age pension age), investment accounts, shares, investment property, vehicles, boats, and most personal property above $10,000. Excluded assets include: your principal home (regardless of value), prepaid funeral expenses (up to $13,500), and certain compensation-related amounts. The pension reduces by $3 for every $1,000 of assets above the lower threshold. At the upper threshold (cut-off point), the pension reduces to nil.",
  },
  {
    q: "What is deeming and how does it affect my Age Pension?",
    a: "Deeming is how Services Australia calculates the income from your financial assets (super, bank accounts, shares, managed funds). Rather than using your actual income, it assumes a set rate of return: 0.25% p.a. on the first $62,600 (single) / $103,800 (couple, combined), and 2.25% above that threshold (2024–25 rates). The deemed income is added to your actual income from other sources (rental income, employment) and compared against the income-test free area. If your actual earnings on financial assets exceed the deeming rate, only the deemed income is counted — you keep the difference. If earnings are below the deeming rate, you're treated as earning the deemed amount anyway.",
  },
  {
    q: "Does my family home affect the Age Pension?",
    a: "Your principal place of residence is exempt from the assets test regardless of value. A $3M family home in Sydney has no impact on Age Pension eligibility. However: (1) If you sell your home and downsize, the sale proceeds become assessable — though the government introduced a 24-month exemption for downsizer proceeds under certain circumstances; (2) If you live in a retirement village, the entry contribution (ingoing fee) may be partly exempt; (3) If you rent out a room, the rental income is counted in the income test. The family home exemption has been debated politically, but as of 2025 remains intact.",
  },
  {
    q: "Can I work part-time and still receive the Age Pension?",
    a: "Yes. The Work Bonus scheme allows pensioners to earn up to $300/fortnight from employment without it affecting the income test (the unused amount accumulates up to $11,800). Employment earnings above the Work Bonus threshold are counted under the income test. The pension reduces by 50 cents for every dollar of income above the income-test free area ($212/fortnight single, $372/fortnight combined couple). Self-employment income is assessed differently (net profit). Many part-time retirees receive a part-pension alongside employment income.",
  },
];

export default function AgePensionPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Retirement", url: `${SITE_URL}/retirement` },
    { name: "Age Pension" },
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
            <span className="text-slate-900 font-medium">Age Pension</span>
          </nav>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">
            Age Pension Australia: eligibility, rates &amp; assets test ({CURRENT_YEAR})
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed mb-3">
            The Australian Age Pension pays up to $1,171/fortnight (single) or $1,766/fortnight (couple).
            Eligibility depends on age (67), residency, and passing both the assets test and income test.
            Most retirees are entitled to at least a part-pension.
          </p>
          <p className="text-xs text-slate-400">{UPDATED_LABEL} · General information only · Rates correct at time of writing; verify at servicesaustralia.gov.au</p>
        </div>
      </section>

      {/* Payment rates */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-5">Payment rates (2024–25)</h2>
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-900">
                  <th className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide">Situation</th>
                  <th className="text-left px-3 py-3 text-xs font-bold text-white uppercase tracking-wide">Base rate</th>
                  <th className="text-left px-3 py-3 text-xs font-bold text-white uppercase tracking-wide">Maximum (with supplements)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {PAYMENT_RATES.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-900">{row.type}</td>
                    <td className="px-3 py-3 text-slate-700">{row.base}</td>
                    <td className="px-3 py-3 text-emerald-700 font-semibold">{row.max}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400 mt-2">Pension Supplement ($83.60/fortnight single) + Energy Supplement ($14.10) are included in the maximum. Rates indexed March and September. Verify at servicesaustralia.gov.au.</p>
        </div>
      </section>

      {/* Assets test thresholds */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Assets test thresholds (2024–25)</h2>
          <p className="text-sm text-slate-500 mb-5">Pension reduces by $3 per fortnight for every $1,000 of assets above the full pension threshold. Below the cut-off: part-pension. Above cut-off: nil pension.</p>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-900">
                  <th className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide">Situation</th>
                  <th className="text-left px-3 py-3 text-xs font-bold text-white uppercase tracking-wide">Full pension</th>
                  <th className="text-left px-3 py-3 text-xs font-bold text-white uppercase tracking-wide">Part pension range</th>
                  <th className="text-left px-3 py-3 text-xs font-bold text-white uppercase tracking-wide">Cut-off (nil)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {ASSETS_THRESHOLDS.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-900 text-xs">{row.situation}</td>
                    <td className="px-3 py-3 text-emerald-700 font-bold text-xs">&lt;{row.full}</td>
                    <td className="px-3 py-3 text-xs text-slate-600">{row.partPart}</td>
                    <td className="px-3 py-3 text-red-600 font-bold text-xs">{row.nil}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400 mt-2">Thresholds indexed July each year. Principal home is excluded from assets test. Verify at servicesaustralia.gov.au/agepensioncalculator.</p>
        </div>
      </section>

      {/* Eligibility checklist */}
      <section className="py-8 border-b border-slate-100 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-5">Eligibility checklist</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              { title: "Age", body: "67 years or older (born on or after 1 Jan 1957)" },
              { title: "Residency", body: "Australian citizen or permanent resident; 10 years in Australia, including 5 consecutive" },
              { title: "Assets test", body: "Assessable assets below the cut-off threshold for your situation" },
              { title: "Income test", body: "Income (actual + deemed) below the income-test cut-off" },
              { title: "Principal home", body: "Excluded from assets test — whether a $200k flat or a $5M house" },
              { title: "Super", body: "Counted as an asset from Age Pension age (not before)" },
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">{item.title}</p>
                <p className="text-sm text-slate-700 leading-relaxed">{item.body}</p>
              </div>
            ))}
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
              { href: "/retirement/age-pension-assets-test", label: "Assets test in detail" },
              { href: "/retirement/annuities", label: "Annuities & Centrelink" },
              { href: "/retirement/pension-phase", label: "Pension phase super" },
              { href: "/aged-care/centrelink", label: "Aged care Centrelink" },
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
            <strong>General advice warning.</strong> {GENERAL_ADVICE_WARNING} Age Pension rates, thresholds, and eligibility rules change — always verify at servicesaustralia.gov.au or contact Services Australia directly. This page is general information only; it is not financial, social security, or legal advice. For personalised entitlement estimates, use the Centrelink online estimator or consult a licensed financial adviser.
          </p>
        </div>
      </section>
    </div>
  );
}
