import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, absoluteUrl } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

const FAQS = [
  {
    q: "What insurance types do Australian super funds offer?",
    a: "Most default super funds offer three types of insurance: (1) Life insurance (death cover) — pays a lump sum to your beneficiaries or estate on your death. (2) Total and permanent disability (TPD) insurance — pays a lump sum if you become totally and permanently disabled and cannot work again. (3) Income protection (salary continuance) insurance — pays a monthly benefit (typically 70–75% of salary) if you are temporarily unable to work due to illness or injury. Not all funds offer all three, and coverage amounts and definitions vary widely between funds.",
  },
  {
    q: "Is insurance through super cheaper than buying directly?",
    a: "Group rates in super are often cheaper than retail policies for healthy individuals, because funds negotiate bulk rates across their membership. The trade-off: default group cover has standard definitions and limited customisation. People with specific medical needs, high-risk occupations, or who need more tailored terms (e.g., own-occupation TPD vs any-occupation TPD) may be better served by retail policies outside super. Comparing the total cost and coverage quality — not just the premium — is essential.",
  },
  {
    q: "How are insurance premiums paid inside super?",
    a: "Premiums are deducted from your super account balance, not your take-home pay. This preserves cash flow, but it reduces your compounding balance over time. A $500/year premium deducted from super over 30 years at 7% p.a. growth represents approximately $47,000 less at retirement than if no premium were paid. This does not mean super insurance is bad — the protection value may far outweigh the cost — but it is important to review whether coverage levels are appropriate.",
  },
  {
    q: "What happens to my super insurance when I change jobs?",
    a: "When you join a new employer's default super fund, you will typically receive new default insurance cover from that fund. Your old fund's cover continues until you close the account or it becomes inactive. An inactive account (no contributions for 16 months) may have insurance cancelled automatically unless you notify the fund you wish to retain it (a 'continuation of cover' election). This is a common gap: people assume they are covered but the policy has lapsed. Review insurance when changing jobs.",
  },
  {
    q: "Can I claim a tax deduction for super insurance premiums?",
    a: "The premiums are deducted from your super account pre-tax, and the fund claims the deduction at the fund level. For life insurance and TPD premiums paid via super, the cost is effectively tax-effective for you: premiums reduce your taxable super earnings rather than coming from after-tax income. However, if you hold income protection insurance outside super, the premiums are personally tax-deductible. TPD outside super and life insurance outside super premiums are not tax-deductible.",
  },
  {
    q: "What is the difference between any-occupation and own-occupation TPD?",
    a: "Own-occupation TPD: pays if you can no longer work in your specific occupation. If you are a surgeon who can no longer perform surgery but could theoretically do another job, you would still be paid. Any-occupation TPD (common in group super cover): only pays if you cannot work in any occupation for which you are reasonably suited by education, training, or experience. Own-occupation TPD is broader and more valuable, but it is not available inside super (only outside super). Group cover in super is almost always any-occupation definition, which is worth knowing before relying solely on super insurance.",
  },
];

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Super Insurance in Australia (${CURRENT_YEAR}) — Life, TPD & Income Protection`,
  description:
    "Guide to insurance through super in Australia. Default cover, life insurance, TPD, income protection, how premiums work, tax treatment, and when to review your coverage.",
  alternates: { canonical: `${SITE_URL}/super/insurance` },
  openGraph: {
    title: `Super Insurance Guide Australia (${CURRENT_YEAR})`,
    description: "Default cover, life insurance, TPD and income protection through your super fund — costs, definitions, and gaps to know.",
    url: `${SITE_URL}/super/insurance`,
  },
};

export default function SuperInsurancePage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Super", url: absoluteUrl("/super") },
    { name: "Super Insurance", url: absoluteUrl("/super/insurance") },
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
              <Link href="/super" className="hover:text-white">Super</Link>
              <span className="text-slate-600">/</span>
              <span className="text-white font-medium">Super Insurance</span>
            </nav>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="text-xs font-semibold bg-amber-500 text-slate-900 px-3 py-1 rounded-full">Updated {CURRENT_YEAR}</span>
              <span className="text-xs font-semibold bg-indigo-600 text-white px-3 py-1 rounded-full">Life · TPD · Income Protection</span>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-3 max-w-3xl">
              Insurance Through Super: What You Have &amp; What You Need
            </h1>
            <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-3xl">
              Most Australians have life insurance, TPD, and income protection automatically through their super fund — but default cover is often insufficient. Here is what your policy probably covers and where the gaps are.
            </p>
          </div>
        </section>

        {/* Key Stats */}
        <section className="bg-white py-8 border-b border-slate-100">
          <div className="container-custom">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { v: "3 types", l: "Default cover", sub: "Life, TPD, income protection" },
                { v: "70–75%", l: "Income protection benefit", sub: "% of pre-disability salary" },
                { v: "16 months", l: "Inactivity threshold", sub: "Cover may cancel without notice" },
                { v: "Any-occ", l: "Default TPD definition", sub: "Not own-occupation" },
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

        {/* Three insurance types */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">The three types of super insurance</h2>
            <div className="space-y-4">
              {[
                {
                  title: "Life insurance (death cover)",
                  badge: "Lump sum on death",
                  body: "Pays a tax-free lump sum to your nominated beneficiaries (or estate) when you die. Default cover amounts vary widely — Industry funds often provide $100k–$500k default cover; retail funds may provide less. The default amount is typically not enough for people with mortgages, young children, or dependants who rely on your income. Annual review of cover amount is recommended as circumstances change.",
                  details: "Tax on super life insurance payments: tax-free for death benefit dependants (spouses, children under 18, financial dependants). Adult children who are not financial dependants pay 15% (+2% Medicare) on the taxable component.",
                },
                {
                  title: "Total and permanent disability (TPD)",
                  badge: "Lump sum on disability",
                  body: "Pays a lump sum if you become totally and permanently disabled and meet the fund's definition. Default group cover in super uses the any-occupation definition: you must be unable to work in any job suited to your education, training, or experience — not just your current job. This is a higher bar than own-occupation TPD. Medical evidence requirements are stringent. A TPD payment inside super can be accessed as a lump sum or income stream under the 'permanent incapacity' condition of release.",
                  details: "Tax: if you are under 60, the taxable component is taxed at marginal rate less a 15% tax offset. Tax-free if paid from a taxed source and you are over 60.",
                },
                {
                  title: "Income protection (salary continuance)",
                  badge: "Monthly benefit",
                  body: "Pays a monthly benefit — typically 70–75% of your pre-disability salary — while you are temporarily unable to work due to illness or injury. The waiting period (when payments start) is typically 30, 60, or 90 days. The benefit period can be 2 years, 5 years, or to age 65. Income protection payments are assessable income (taxable). Holding income protection through super means premiums are paid from your super balance, not your take-home pay — but this reduces your retirement savings.",
                  details: "Tax: income protection payments received are assessable income taxed at your marginal rate, same as salary. The fund may withhold tax before paying you.",
                },
              ].map((item) => (
                <div key={item.title} className="rounded-xl border border-slate-200 bg-white p-5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="font-extrabold text-slate-900">{item.title}</h3>
                    <span className="shrink-0 text-xs font-semibold bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">{item.badge}</span>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed mb-2">{item.body}</p>
                  <p className="text-xs text-slate-500 leading-relaxed bg-slate-50 rounded-lg p-3">{item.details}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Common gaps */}
        <section className="py-10 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">Common gaps in default super insurance</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                {
                  title: "Insufficient death cover",
                  body: "Default cover amounts often assume a single person with no dependants. If you have a mortgage, young children, or a dependent spouse, $200k of default life cover may cover only a fraction of your financial obligations. Multiply your annual income by 10–15 as a rough adequacy guide.",
                },
                {
                  title: "Any-occupation TPD definition",
                  body: "Default TPD in super is almost always any-occupation, which requires complete inability to work in any job. A skilled worker who can no longer perform their trade but could theoretically do desk work may not qualify. Retail own-occupation policies are not available inside super — consider topping up with a retail policy outside super.",
                },
                {
                  title: "Inactive account cover cancellation",
                  body: "If your super account receives no employer or personal contributions for 16 consecutive months, the fund will cancel your insurance unless you actively elect to retain it. This catches people on parental leave, between jobs, or working casually. If your account becomes inactive, you will receive a notice — respond promptly.",
                },
                {
                  title: "No cover for self-employed",
                  body: "Self-employed people who do not make regular super contributions may find their accounts become inactive and insurance lapses. Self-employed workers can add voluntary contributions to keep accounts active and retain cover, but must actively manage this.",
                },
                {
                  title: "Multiple accounts, duplicate premiums",
                  body: "If you have super with multiple funds, you may be paying insurance premiums on multiple accounts simultaneously — for coverage you cannot claim twice. Consolidating super (and reviewing insurance in each fund before closing accounts) prevents this waste.",
                },
                {
                  title: "Short income protection benefit periods",
                  body: "Some default policies only provide income protection for 2 years. If you have a long-term illness or injury, you could be left without income after 2 years. Policies with benefit periods to age 65 are more comprehensive but more expensive.",
                },
              ].map((item) => (
                <div key={item.title} className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <h3 className="font-extrabold text-amber-900 mb-1 text-sm">{item.title}</h3>
                  <p className="text-sm text-amber-800 leading-relaxed">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section className="py-12 bg-white">
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
              <Link href="/super" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">Super hub →</Link>
              <Link href="/insurance/income-protection" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">Income protection guide →</Link>
              <Link href="/advisors/financial-planners" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">Find a financial planner →</Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
