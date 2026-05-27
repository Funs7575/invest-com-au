import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `First Home Super Saver Scheme (FHSS) Guide — ${CURRENT_YEAR} | invest.com.au`,
  description: `Complete FHSS guide for Australians: how to contribute ($15k/year, $50k total), eligible contributions, tax savings, how to withdraw, and what happens if you change your mind. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `First Home Super Saver Scheme (FHSS) Guide (${CURRENT_YEAR})`,
    description: "FHSS guide: contributions, $50k cap, tax savings, withdrawal process, and pitfalls to avoid for Australian first home buyers.",
    url: `${SITE_URL}/first-home-buyer/fhss-guide`,
    images: [{ url: `/api/og?title=${encodeURIComponent("FHSS Guide Australia")}&sub=${encodeURIComponent("First Home Super Saver · $50k Cap · Tax Savings · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/first-home-buyer/fhss-guide` },
};

const KEY_RULES = [
  { rule: "Annual contribution cap", detail: "$15,000 per person per financial year can be designated for FHSS (from eligible contributions)" },
  { rule: "Lifetime cap", detail: "$50,000 per person total — couples can access up to $100,000 combined" },
  { rule: "Eligible contributions", detail: "Voluntary concessional (salary sacrifice) and voluntary non-concessional contributions only — employer SG contributions are NOT eligible" },
  { rule: "Tax on contributions", detail: "Concessional contributions taxed at 15% inside super (vs marginal rate if taken as salary) — significant tax saving for people on 32.5%–45% marginal rates" },
  { rule: "Tax on withdrawal", detail: "FHSS withdrawn amount taxed at marginal rate minus a 30% tax offset — in practice, effectively 0%–15% for most earners" },
  { rule: "Earnings included", detail: "The ATO uses a deemed earnings rate (FHSS shortfall interest charge rate) rather than actual fund returns — currently around 5–6% p.a." },
  { rule: "First home requirement", detail: "You must not have previously owned property in Australia. You must live in the property for at least 6 months within 12 months of purchase" },
  { rule: "Age", detail: "Must be 18+ to request release (but can make contributions under 18)" },
];

const PROCESS_STEPS = [
  { n: 1, step: "Make voluntary contributions", detail: "Make salary sacrifice or personal deductible contributions to your super fund. Designate them as eligible for FHSS in your tax return each year." },
  { n: 2, step: "Annual designation", detail: "When lodging your tax return, claim a deduction for personal contributions you want treated as concessional. The ATO tracks your FHSS balance." },
  { n: 3, step: "Request a FHSS determination", detail: "Before signing a contract, request a FHSS determination from the ATO — this tells you your maximum releasable amount. Done via myGov/ATO." },
  { n: 4, step: "Sign a property contract", detail: "You must sign a contract within 14 days before or after your FHSS release request. Planning is critical — the release takes 15–20 business days." },
  { n: 5, step: "Apply for release", detail: "Apply via myGov for the ATO to instruct your super fund to release the funds. The ATO releases directly to you (not the super fund). One request only — irreversible." },
  { n: 6, step: "Use funds for property", detail: "Funds must be used to purchase the property within 12 months of release. If not used, a FHSS tax is applied at 20% to deter misuse." },
];

const FAQS = [
  {
    q: "How much can I actually save using the FHSS scheme?",
    a: "The FHSS tax saving depends on your marginal rate. For someone on a 32.5% marginal rate: salary sacrifice $15,000/year saves 32.5% − 15% = 17.5% in tax = $2,625/year. Over 3 years of contributing $15,000 (total $45,000), the tax saving is approximately $7,875. For someone on 37%: the annual saving is $3,300/year. For 45%: $4,500/year. The deemed earnings rate (currently ~5–6%) means your balance also grows with notional earnings during the accumulation period. The scheme works best for people on 32.5%+ marginal rates saving over 3–4 years.",
  },
  {
    q: "Can both members of a couple use the FHSS scheme?",
    a: "Yes — each eligible person has their own $50,000 lifetime cap. A couple buying together could theoretically access $100,000 combined from FHSS. Both must meet the eligibility requirements (not previously owned property, will live in the home for 6 months). Both members apply separately and each receives their own release. For couples with different income levels, the higher-earning partner benefits more from the tax advantage, but both should contribute if possible to maximise the combined release.",
  },
  {
    q: "What happens if I don&apos;t buy a house after withdrawing FHSS funds?",
    a: "If you&apos;ve received FHSS released amounts and don&apos;t enter a contract to purchase or construct a home within 12 months, you have two options: (1) Recontribute the funds back to super within 12 months (treated as a non-concessional contribution — subject to annual caps); (2) Keep the funds and pay a FHSS tax of 20% of the released amount (applied at tax time). The 20% tax is less punitive than re-contribution in some circumstances but is still significant. If plans fall through, seek tax advice before the 12-month window closes.",
  },
  {
    q: "Can I use the FHSS for a house and land package or off-the-plan purchase?",
    a: "Yes. The FHSS can be used for house and land packages and off-the-plan purchases. The key requirement is that a contract must be signed within 14 days of your FHSS release request (or you can request the release within 14 days of signing). For off-the-plan purchases where settlement is 12–24 months away, timing is critical: you need to request and receive the FHSS funds, hold them, and use them at settlement within 12 months of receiving the release. If your settlement date is more than 12 months after FHSS release, you may face the recontribution/tax consequence. The ATO can extend the 12-month period in some cases — apply early.",
  },
];

export default function FhssGuidePage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "First Home Buyer", url: `${SITE_URL}/first-home-buyer` },
    { name: "FHSS Guide" },
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
            <Link href="/first-home-buyer" className="hover:text-slate-900">First Home Buyer</Link><span>/</span>
            <span className="text-slate-900 font-medium">FHSS Guide</span>
          </nav>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">
            First Home Super Saver Scheme (FHSS) — complete guide ({CURRENT_YEAR})
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed mb-3">
            The FHSS lets you save for a first home inside super and withdraw up to $50,000 ($100,000
            for couples) with a significant tax advantage. For someone on a 37% tax rate, the scheme
            saves $3,300/year compared to saving in a bank account. Here&apos;s exactly how it works.
          </p>
          <p className="text-xs text-slate-400">{UPDATED_LABEL} · General information only · Not financial advice</p>
        </div>
      </section>

      {/* Key rules */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-5">FHSS key rules at a glance</h2>
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-900">
                  <th className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide">Rule</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {KEY_RULES.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-900 text-xs w-1/3">{row.rule}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 leading-relaxed">{row.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Step by step */}
      <section className="py-10 border-b border-slate-100 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-5">How to use the FHSS: step by step</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {PROCESS_STEPS.map(s => (
              <div key={s.n} className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="w-8 h-8 rounded-full bg-amber-500 text-slate-900 font-extrabold text-sm flex items-center justify-center mb-3">{s.n}</div>
                <p className="font-bold text-slate-900 mb-1">{s.step}</p>
                <p className="text-sm text-slate-600 leading-relaxed">{s.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tax savings callout */}
      <section className="py-8 border-b border-slate-100 bg-amber-50">
        <div className="container-custom max-w-4xl">
          <div className="flex gap-4">
            <span className="text-2xl shrink-0" aria-hidden>💡</span>
            <div>
              <p className="font-bold text-slate-900 mb-1">The tax saving is real — but timing is everything</p>
              <p className="text-sm text-slate-700 leading-relaxed">
                Start early: with a 3-year horizon, a couple on combined $200k income can accumulate ~$90,000 FHSS balance ($45k each) and save approximately $15,000–$18,000 in tax versus saving in a bank account. The ATO processes FHSS release requests in 15–20 business days — don&apos;t sign a contract and then apply for FHSS; the timing window is tight. Use the ATO&apos;s FHSS determination process before signing to know exactly how much you can access.
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
              { href: "/first-home-buyer/first-home-guarantee", label: "First Home Guarantee (5% deposit)" },
              { href: "/first-home-buyer/deposit-guide", label: "Saving your deposit" },
              { href: "/first-home-buyer/stamp-duty", label: "Stamp duty guide" },
              { href: "/super/contributions", label: "Super contributions guide" },
              { href: "/first-home-buyer", label: "First home buyer hub" },
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
            <strong>General advice warning.</strong> {GENERAL_ADVICE_WARNING} FHSS rules, caps, and ATO processing timelines change. Verify current rules at ato.gov.au/individuals-and-families/super-for-individuals-and-families/super/growing-and-keeping-track-of-your-super/first-home-super-saver-scheme. This page is general information only; it is not financial or tax advice. Consult a registered tax agent for personalised FHSS planning.
          </p>
        </div>
      </section>
    </div>
  );
}
