import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Annuities in Australia — Lifetime vs Term vs DLA (${CURRENT_YEAR}) | invest.com.au`,
  description: `How Australian annuities work: lifetime annuities, term annuities, and deferred lifetime annuities. Centrelink asset test treatment, providers, fee traps, and when an annuity beats an account-based pension. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Annuities in Australia (${CURRENT_YEAR}) — Lifetime, Term & DLA Compared`,
    description: "Lifetime vs term annuities vs DLAs: Centrelink treatment, longevity insurance, product fees, and when annuities beat account-based pensions.",
    url: `${SITE_URL}/retirement/annuities`,
    images: [{ url: `/api/og?title=${encodeURIComponent("Annuities Australia")}&sub=${encodeURIComponent("Lifetime · Term · DLA · Centrelink · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/retirement/annuities` },
};

const ANNUITY_TYPES = [
  {
    type: "Lifetime annuity",
    howItWorks: "Pay a lump sum; receive guaranteed income payments until death (optionally with a reversionary pension to spouse). No asset drawdown — you lose access to the lump sum.",
    centrelink: "Favourable: only 60% of the purchase price counted as assets for 1st 5 years (then 30%) — significantly better than ABP treatment.",
    providers: "Challenger, AIA, Resolution Life",
    bestFor: "Longevity protection — certainty you won&apos;t outlive your money even to 100+",
    risk: "Inflation risk (unless indexed); irrevocable; insurer solvency risk (APRA-regulated)",
  },
  {
    type: "Term annuity",
    howItWorks: "Guaranteed income for a fixed period (1–30 years). Usually returns residual capital at end of term or provides reversionary options.",
    centrelink: "Partially exempt: purchase price minus 'deductible amount' counted over the term.",
    providers: "Challenger, AIA",
    bestFor: "Bridging gap to age pension age; or specific short-term income certainty",
    risk: "Fixed term — if you outlive it, income stops unless renewed",
  },
  {
    type: "Deferred Lifetime Annuity (DLA)",
    howItWorks: "Pay now; income doesn&apos;t start until a nominated future age (e.g. 80 or 85). Cheap longevity insurance — lower cost per dollar of coverage than immediate lifetime annuity.",
    centrelink: "Since 2019 (CIPR reforms): favourable asset test treatment (only purchase price × 60% until annuity commences)",
    providers: "Challenger (LifeIncome), AIA",
    bestFor: "Combination with ABP: use DLA to cover longevity risk post-85, ABP for earlier retirement",
    risk: "No income if you die before the deferred start age; you lose the lump sum",
  },
  {
    type: "Account-Based Pension (ABP)",
    howItWorks: "Drawdown from your super balance. Full investment flexibility; capital accessible. No guaranteed income — can run out.",
    centrelink: "Entire account balance counted as an asset (no special exemption post-1 Jan 2015 for new entrants).",
    providers: "Any super fund or SMSF",
    bestFor: "Flexibility; investment control; estate planning (residual passes to estate)",
    risk: "Longevity risk — balance depletes if drawdown exceeds returns",
  },
];

const FAQS = [
  {
    q: "How much does a lifetime annuity pay?",
    a: "Payment rates depend on your age at commencement, the capital invested, interest rates at the time, and whether you want inflation-indexing or a reversionary pension for your spouse. As a rough guide, a 70-year-old investing $500,000 in a non-indexed lifetime annuity might receive approximately $30,000–$35,000 per year (6–7% payout rate). An indexed lifetime annuity paying CPI increases would be significantly lower (4–5%). Actual quotes should be obtained from Challenger's or AIA's online calculators or through a licensed financial adviser — rates change with interest rates.",
  },
  {
    q: "Is a lifetime annuity better than an account-based pension?",
    a: "It depends on three variables: your longevity expectations, your Centrelink situation, and your estate planning wishes. Annuities win on: (1) Centrelink assets test (60% treatment vs 100% for ABP), which can increase Age Pension entitlements significantly; (2) certainty — you cannot outlive the income; (3) longevity protection beyond 85–90+ where ABP balances often deplete. ABPs win on: (1) investment flexibility and upside; (2) capital access for unexpected expenses; (3) estate planning (residual passed on). Most financial planners recommend a combination: use an annuity (or DLA) for a base income floor, with an ABP for discretionary spending and liquidity.",
  },
  {
    q: "What is the Centrelink asset test treatment of annuities?",
    a: "Pre-2015 account-based pensions held by asset-tested Age Pension recipients had grandfathered treatment. Post-2015 ABPs are fully counted as assets. Lifetime and term annuities commencing after 1 January 2019 receive favourable treatment: 60% of purchase price is counted as an asset in the first 5 years, then 30% thereafter — effectively exempting 40% of the capital base for asset test purposes. This Centrelink advantage can be worth $10,000–$30,000+ per year in additional Age Pension entitlements for some retirees, which is why annuity modelling is critical for those near the assets test cutoff.",
  },
  {
    q: "What happens to a lifetime annuity when you die?",
    a: "A single-life lifetime annuity without a reversionary option or death benefit simply ends — the remaining capital is not returned to your estate. This is the mechanism that makes lifetime annuities affordable — the insurer pools longevity risk across many annuitants. To protect your estate, you can: (1) Add a reversionary pension so your spouse continues receiving income; (2) Add a capital guarantee period (e.g. 10-year guarantee — if you die in year 3, the estate receives the remaining 7 years of payments); (3) Choose a term annuity which returns residual at the end of the term. All of these reduce the payment rate in exchange for the protection.",
  },
];

export default function RetirementAnnuitiesPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Retirement", url: `${SITE_URL}/retirement` },
    { name: "Annuities" },
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
            <span className="text-slate-900 font-medium">Annuities</span>
          </nav>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">
            Annuities in Australia: lifetime, term &amp; deferred lifetime
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed mb-3">
            Australian annuities guarantee income for life or a fixed term. Compare lifetime annuities,
            term annuities, and deferred lifetime annuities — including favourable Centrelink asset test
            treatment that can significantly increase Age Pension entitlements.
          </p>
          <p className="text-xs text-slate-400">{UPDATED_LABEL} · General information only · Not financial advice</p>
        </div>
      </section>

      {/* Annuity type cards */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-5">Annuity types compared</h2>
          <div className="space-y-4">
            {ANNUITY_TYPES.map((a, i) => (
              <div key={i} className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-900 px-5 py-3">
                  <p className="text-sm font-bold text-white">{a.type}</p>
                </div>
                <div className="p-5 grid sm:grid-cols-2 gap-4 bg-white">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">How it works</p>
                    <p className="text-sm text-slate-700 leading-relaxed">{a.howItWorks}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Centrelink treatment</p>
                    <p className="text-sm text-slate-700 leading-relaxed">{a.centrelink}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Providers</p>
                    <p className="text-sm text-slate-700 leading-relaxed">{a.providers}</p>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-1">Best for</p>
                    <p className="text-xs text-amber-800 leading-relaxed">{a.bestFor}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Key insight */}
      <section className="py-8 border-b border-slate-100 bg-emerald-50">
        <div className="container-custom max-w-4xl">
          <div className="flex gap-4">
            <span className="text-2xl shrink-0" aria-hidden>💡</span>
            <div>
              <p className="font-bold text-slate-900 mb-1">The Centrelink advantage can be worth $10,000–$30,000/year</p>
              <p className="text-sm text-slate-700 leading-relaxed">
                For retirees near the Age Pension assets test threshold, converting a portion of an ABP into a lifetime annuity (with 60% assets test treatment) can restore partial or full Age Pension. A $300,000 lifetime annuity reduces the Centrelink-counted asset value by $120,000 compared to the same amount in an ABP — generating up to $7,800/year in additional pension at the 2024–25 taper rate. Modelling this tradeoff is one of the most valuable things a licensed retirement planner can do for you.
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
              { href: "/retirement/annuities-vs-abp", label: "Annuity vs ABP deep dive" },
              { href: "/retirement/age-pension", label: "Age pension guide" },
              { href: "/retirement/age-pension-assets-test", label: "Assets test thresholds" },
              { href: "/retirement/pension-phase", label: "Pension phase (ABP)" },
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
            <strong>General advice warning.</strong> {GENERAL_ADVICE_WARNING} Annuity rates change with interest rates and insurer pricing. Centrelink assessment rules change — verify current treatment at servicesaustralia.gov.au. Provider names listed are for illustration; this is not a recommendation of any specific product. This page is general information only; it is not financial advice. Consult a licensed financial adviser before purchasing an annuity.
          </p>
        </div>
      </section>
    </div>
  );
}
