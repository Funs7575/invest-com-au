import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Age Pension Assets Test — Thresholds & Exempt Assets (${CURRENT_YEAR}) | invest.com.au`,
  description: `Complete guide to the Age Pension assets test: 2024–25 thresholds for singles and couples, exempt assets (family home, funeral bonds), taper rate, and strategies to optimise your entitlement. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Age Pension Assets Test (${CURRENT_YEAR}) — Thresholds & Exempt Assets`,
    description: "Assets test thresholds, exempt assets, taper rate, and optimisation strategies for Australian Age Pension recipients.",
    url: `${SITE_URL}/retirement/age-pension-assets-test`,
    images: [{ url: `/api/og?title=${encodeURIComponent("Age Pension Assets Test")}&sub=${encodeURIComponent("Thresholds · Exempt · Taper Rate · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/retirement/age-pension-assets-test` },
};

const THRESHOLDS_2425 = [
  { group: "Single — homeowner", full: "$301,750", cutoff: "$674,000" },
  { group: "Single — non-homeowner", full: "$543,750", cutoff: "$916,000" },
  { group: "Couple — homeowners (combined)", full: "$451,500", cutoff: "$1,012,500" },
  { group: "Couple — non-homeowners (combined)", full: "$693,500", cutoff: "$1,254,500" },
];

const EXEMPT_ASSETS = [
  { asset: "Principal home", notes: "Fully exempt regardless of value — $500k flat or $10M house treated the same" },
  { asset: "Pre-paid funeral expenses", notes: "Up to $13,500 per person for funeral bonds/prepaid funeral expenses" },
  { asset: "Funeral bonds (capped)", notes: "Up to $13,500 per bond; amounts above cap are assessable" },
  { asset: "Super under preservation age", notes: "Super of a partner under Age Pension age is not assessed (only your own super from qualifying age)" },
  { asset: "Compensation payments (lump sum)", notes: "Some types partially exempt — refer to Services Australia for specific exclusions" },
  { asset: "Home contents, personal effects, vehicle", notes: "Assessed at reasonable second-hand resale value — typically $10–$15k for standard household" },
];

const ASSESSABLE_ASSETS = [
  { asset: "Superannuation (ABP, accumulation)", notes: "Counted from Age Pension age — full balance, not just drawdown amount" },
  { asset: "Investment properties", notes: "Market value (not equity). Mortgage is not deducted." },
  { asset: "Shares and managed funds", notes: "Market value at reporting date" },
  { asset: "Bank accounts and term deposits", notes: "Balance at reporting date" },
  { asset: "Business assets and farms", notes: "Assessed at market value; primary production concessions apply in some cases" },
  { asset: "Caravans, boats, recreational vehicles", notes: "At reasonable resale value — significant item if high-value" },
  { asset: "Lifetime annuities (post-2019)", notes: "60% of purchase price for first 5 years; 30% thereafter (favourable treatment)" },
];

const FAQS = [
  {
    q: "How does the assets test taper work?",
    a: "For every $1,000 of assets above the lower threshold (where full pension is paid), the fortnightly pension reduces by $3. For a single homeowner in 2024–25: full pension at $301,750; at $400,000 (excess of $98,250), pension reduces by $294.75/fortnight ($98,250 ÷ 1,000 × $3). At $674,000 (cut-off), the pension reaches zero. The taper rate means that spending $30,000 on a holiday reduces your assessable assets by $30,000 and increases your fortnightly pension by $90 ($3 × 30). This is not a reason to spend recklessly — but it does illustrate that assets just above the threshold are not particularly punished.",
  },
  {
    q: "Can I reduce my assessable assets to increase the Age Pension?",
    a: "Legitimate strategies to reduce assessable assets include: (1) Making additional super contributions (if your partner is under Age Pension age, their super isn&apos;t assessed); (2) Prepaying funeral expenses (up to $13,500 per person, removes from assets); (3) Home improvements/renovations — money spent on your exempt principal home isn&apos;t assessed; (4) Converting assessable assets to gifting within the gifting limits ($10,000/year, $30,000 over 5 years — amounts above limits are assessed as &apos;deprived assets&apos; for 5 years); (5) Lifetime annuity purchase (60% assets test treatment). Aggressive &apos;asset reduction&apos; strategies for pension eligibility should always be reviewed by a licensed financial adviser — some trigger adverse consequences.",
  },
  {
    q: "What are the gifting rules?",
    a: "You can gift up to $10,000 per financial year and $30,000 over any rolling 5-year period without it affecting your Age Pension. Gifts above these limits are treated as &apos;deprived assets&apos; — they remain counted in your assessable assets for 5 years from the date of the gift, regardless of whether you still have the money. Gifting to family members above the limits to reduce assessable assets is a common error — the ATO and Services Australia both monitor gifting patterns, and amounts above the limits are still assessed as if you held them.",
  },
  {
    q: "Is an investment property excluded if I live in it?",
    a: "Only your principal place of residence is exempt. If you have a granny flat or second property that you own but don&apos;t live in, it&apos;s assessable at market value. If you sell your home and move into a retirement village or granny flat, the entry contribution or ingoing fee may be partly exempt depending on the tenure arrangement. Granny flat rights — where you transfer assets to a family member in exchange for accommodation — have complex rules under the gifting provisions. Services Australia treats these on a case-by-case basis, and getting it wrong can trigger significant gifting penalties.",
  },
];

export default function AgePensionAssetsTestPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Retirement", url: `${SITE_URL}/retirement` },
    { name: "Assets Test" },
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
            <span className="text-slate-900 font-medium">Assets Test</span>
          </nav>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">
            Age Pension assets test: thresholds, exempt assets &amp; taper ({CURRENT_YEAR})
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed mb-3">
            The assets test reduces your Age Pension by $3 per fortnight for every $1,000 of assessable
            assets above the lower threshold. Your family home is fully exempt. Understanding what&apos;s
            counted — and what isn&apos;t — is key to maximising your entitlement.
          </p>
          <p className="text-xs text-slate-400">{UPDATED_LABEL} · Thresholds effective 1 July 2024; verify at servicesaustralia.gov.au</p>
        </div>
      </section>

      {/* Thresholds */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-5">2024–25 assets test thresholds</h2>
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-900">
                  <th className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide">Situation</th>
                  <th className="text-left px-3 py-3 text-xs font-bold text-white uppercase tracking-wide">Full pension (below)</th>
                  <th className="text-left px-3 py-3 text-xs font-bold text-white uppercase tracking-wide">Cut-off (nil pension)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {THRESHOLDS_2425.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-900">{row.group}</td>
                    <td className="px-3 py-3 text-emerald-700 font-bold">{row.full}</td>
                    <td className="px-3 py-3 text-red-600 font-bold">{row.cutoff}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400 mt-2">Taper: pension reduces $3/fortnight per $1,000 above the full-pension threshold. Thresholds indexed July each year.</p>
        </div>
      </section>

      {/* Exempt and assessable assets */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 mb-4">Exempt assets (not counted)</h2>
              <div className="space-y-3">
                {EXEMPT_ASSETS.map((item, i) => (
                  <div key={i} className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                    <p className="text-sm font-bold text-emerald-900">{item.asset}</p>
                    <p className="text-xs text-emerald-800 leading-relaxed mt-0.5">{item.notes}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 mb-4">Assessable assets (counted)</h2>
              <div className="space-y-3">
                {ASSESSABLE_ASSETS.map((item, i) => (
                  <div key={i} className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-sm font-bold text-slate-900">{item.asset}</p>
                    <p className="text-xs text-slate-600 leading-relaxed mt-0.5">{item.notes}</p>
                  </div>
                ))}
              </div>
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
              { href: "/retirement/age-pension", label: "Age pension overview" },
              { href: "/retirement/annuities", label: "Annuities & assets test advantage" },
              { href: "/retirement/how-much-do-you-need", label: "How much to retire?" },
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
            <strong>General advice warning.</strong> {GENERAL_ADVICE_WARNING} Assets test thresholds are indexed annually and the rules change. Always verify current thresholds at servicesaustralia.gov.au. Gifting strategies and asset restructuring should be reviewed by a licensed financial adviser before implementation. This page is general information only; it is not financial or social security advice.
          </p>
        </div>
      </section>
    </div>
  );
}
