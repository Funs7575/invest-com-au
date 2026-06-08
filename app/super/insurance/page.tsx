import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL, absoluteUrl } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Super Insurance Australia (${CURRENT_YEAR}) — Life, TPD & Income Protection`,
  description:
    "Super insurance guide: default cover, life insurance, TPD definitions, income protection, MySuper reforms, and death benefit nominations. Updated 2026.",
  alternates: { canonical: `${SITE_URL}/super/insurance` },
  openGraph: {
    title: `Super Insurance Guide Australia (${CURRENT_YEAR})`,
    description:
      "How group life, TPD and income protection insurance works inside your super fund — default cover, premium costs, MySuper inactive account rules, and when to review.",
    url: `${SITE_URL}/super/insurance`,
    images: [
      {
        url: `/api/og?title=${encodeURIComponent("Super Insurance 2026")}&sub=${encodeURIComponent("Life · TPD · Income Protection · Default Cover")}`,
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
};

const INSURANCE_TYPES = [
  {
    title: "Life insurance (death cover)",
    badge: "Lump sum on death",
    badgeColor: "bg-indigo-100 text-indigo-700",
    body: "Pays a lump sum when you die or are diagnosed with a terminal illness (expected death within 24 months). The benefit is paid to your estate or your nominated beneficiary. Most Australian super funds provide life cover automatically when you join — a 35-year-old in a typical industry fund might receive three units of default cover worth $225,000. You can apply to increase or decrease that amount. Cover reduces with age and usually ceases at age 70.",
    detail: "Tax: death benefits paid to dependants (spouse, children under 18, financial dependants) are tax-free. Adult non-dependant children pay 15% tax (plus 2% Medicare levy) on the taxable component.",
  },
  {
    title: "Total and permanent disability (TPD)",
    badge: "Lump sum on disability",
    badgeColor: "bg-purple-100 text-purple-700",
    body: "Pays a lump sum if you become totally and permanently disabled and cannot work again. The definition used by the fund determines how hard it is to claim. Default group cover inside super almost always uses the any-occupation definition: you must be unable to work in any occupation for which you are reasonably suited by education, training, or experience — not just your current job. Own-occupation TPD (which pays if you cannot perform your specific role) is more generous but is not available inside super.",
    detail: "Access: a TPD payment inside super is released under the permanent incapacity condition of release. If under 60, the taxable component is taxed at marginal rate less a 15% tax offset. Tax-free from a taxed source once you are over 60.",
  },
  {
    title: "Income protection (salary continuance)",
    badge: "Monthly benefit",
    badgeColor: "bg-teal-100 text-teal-700",
    body: "Pays a monthly benefit — typically 70–75% of your pre-disability income — while you are temporarily unable to work due to illness or injury. Key variables are the waiting period (30, 60, or 90 days before payments start) and the benefit period (2 years, 5 years, or to age 65). A longer benefit period costs more in premiums but provides protection if you have a prolonged illness or injury. Payments are assessable income and taxed at your marginal rate.",
    detail: "Tax note: income protection premiums paid by a super fund on behalf of members are not deductible to the fund for policies issued after 1 July 2014 under certain structures — but this does not directly affect how your premiums work inside super. If you hold IP outside super, those premiums are personally tax-deductible.",
  },
];

const ADVANTAGES = [
  {
    title: "Pre-tax premiums",
    body: "Premiums are deducted from your super balance, which is funded by concessional (pre-tax) contributions taxed at 15%. This is more tax-effective than paying retail premiums out of after-tax take-home pay for most people on marginal rates above 19%.",
  },
  {
    title: "Group buying power",
    body: "Super funds negotiate group rates across thousands or millions of members. For healthy people in low-risk occupations, group rates inside super are typically cheaper per dollar of cover than comparable retail policies.",
  },
  {
    title: "Automatic acceptance",
    body: "Default cover is provided without medical underwriting. You do not need to answer health questions or have a medical exam to receive the standard amount. This is a major advantage for people with pre-existing conditions who might struggle to obtain retail cover.",
  },
  {
    title: "Premiums don't reduce take-home pay",
    body: "Because premiums come from your super balance, your fortnightly pay is unaffected. This removes the friction that causes many people to defer purchasing adequate cover when budgets are tight.",
  },
];

const DISADVANTAGES = [
  {
    title: "Narrower policy definitions",
    body: "TPD cover inside super uses the any-occupation definition — a materially higher bar for claims than own-occupation TPD available in retail policies outside super. Income protection benefit periods and waiting period options may also be more limited than retail.",
  },
  {
    title: "Benefit paid into super",
    body: "A TPD benefit is paid into your super account and can only be accessed once you meet a condition of release (generally preservation age, unless terminal illness). If you are 35 and become disabled, your TPD lump sum sits locked in super until you reach preservation age — unless terminal illness applies.",
  },
  {
    title: "Erodes retirement savings",
    body: "Premiums reduce your compounding balance. A $1,000/year premium at 7% per annum over 30 years reduces your retirement balance by approximately $94,000 compared to paying no premiums. That is the true long-run cost of the insurance — which may still be excellent value for the protection provided, but it is worth quantifying.",
  },
  {
    title: "IP not deductible by some funds (post-2014)",
    body: "For income protection policies taken out inside super on or after 1 July 2014, the fund may not be able to claim a tax deduction for the premium under certain product structures. The ATO's position on 'integral link' products changed the tax treatment. In practice, most industry and retail funds restructured their offerings — but it is worth checking the fund's Product Disclosure Statement.",
  },
];

const LIFE_EVENTS = [
  { event: "Marriage or de facto relationship", icon: "Marriage" },
  { event: "Separation or divorce", icon: "Separation" },
  { event: "Birth or adoption of a child", icon: "New child" },
  { event: "Taking out a mortgage", icon: "Mortgage" },
  { event: "Significant salary increase", icon: "Salary rise" },
  { event: "Starting a business", icon: "Business" },
];

const REVIEW_TRIGGERS = [
  { trigger: "Starting a new job", reason: "New employer may use a different fund with different default cover amounts." },
  { trigger: "Marriage or having children", reason: "Dependants dramatically increase the financial impact of death or disability." },
  { trigger: "Taking out a mortgage", reason: "New debt means greater financial exposure — cover should reflect outstanding liabilities." },
  { trigger: "Major salary increase", reason: "Income protection pays a percentage of salary; cover should keep pace with earnings growth." },
  { trigger: "Approaching retirement", reason: "Mortgage may be paid off, children grown — you may need less cover and can reduce premiums to preserve super." },
  { trigger: "Starting a business", reason: "Self-employed income is volatile — income protection becomes critical and default cover may be insufficient." },
];

const FAQS = [
  {
    q: "Do I automatically get insurance with my super?",
    a: "Most Australians in a MySuper-compliant fund are automatically provided with default life (death) cover and TPD cover when they join and meet certain eligibility criteria. Income protection is provided by most industry funds as part of the default package but not all funds. Default cover is usually based on your age and occupation category. However, under the Protecting Your Super legislation (2019), if your account has been inactive for 16 consecutive months (no contributions received) or your balance is below $6,000, the fund must cancel your insurance unless you have opted to keep it. Check your annual statement or call your fund to confirm your current cover.",
  },
  {
    q: "Is it cheaper to get life insurance through super?",
    a: "For most healthy people under 60 in standard occupations, group insurance through super is cheaper than equivalent retail cover because of the fund's group buying power. The trade-off is that group definitions are less generous (especially for TPD), and the policy terms cannot be tailored to your specific circumstances. If you have a pre-existing health condition, group cover may be your only accessible option since it comes with automatic acceptance. For people in high-risk occupations or with complex needs, a licensed insurance adviser can compare super and retail options to find the best value.",
  },
  {
    q: "What happens to my super insurance if I change jobs?",
    a: "When you move to a new employer's super fund, that fund will typically provide new default cover. Your old fund's insurance continues until you either close the account or the account becomes inactive (16 months without contributions). If you intend to consolidate your old super into your new fund, you must arrange replacement cover before rolling over — the insurance in the old fund is cancelled as soon as the rollover is processed. This is one of the most common insurance gaps Australians face. Check both funds' cover amounts, premiums, and definitions before consolidating.",
  },
  {
    q: "Can I increase my insurance cover in super?",
    a: "Yes. Most funds allow you to apply for additional cover above the default amount. For increases above certain thresholds, the fund will require evidence of good health (an insurance questionnaire or medical examination). However, most funds offer life events increases — the ability to increase cover by a set amount without any medical underwriting — when you experience a qualifying life event such as marriage, the birth of a child, or taking out a mortgage. These windows are time-limited (typically 60 to 90 days after the event) and are an important opportunity to boost cover while your health is not assessed.",
  },
  {
    q: "Is income protection inside super taxed differently?",
    a: "Income protection payments are always taxed as assessable income at your marginal rate, whether they come from a super fund or a retail policy outside super. The key difference is at the premium end: if you hold income protection outside super, the premiums are personally tax-deductible (reducing your assessable income). Income protection premiums inside super come from your super balance — there is no personal deduction because you are not paying the premium directly. For many people, after-tax cost is still lower inside super due to group rates, but the deductibility advantage for retail IP outside super is meaningful for higher earners. A financial adviser can model both scenarios for your specific tax position.",
  },
];

const NOMINATION_TYPES = [
  {
    title: "Binding death benefit nomination (BDBN)",
    badge: "Legally binding",
    badgeColor: "bg-blue-100 text-blue-800",
    body: "A BDBN legally requires the trustee to pay the benefit to your nominated dependants or legal personal representative (estate) in the proportions you specify. The trustee has no discretion. BDBNs typically expire every three years unless your fund offers non-lapsing BDBNs — check your PDS. You can nominate any eligible dependant: spouse, children (any age if financially dependent, under 18 unconditionally), or a financial dependant.",
  },
  {
    title: "Non-binding (preferred) nomination",
    badge: "Guides the trustee",
    badgeColor: "bg-amber-100 text-amber-800",
    body: "A non-binding nomination expresses your preferences but does not bind the trustee. The trustee will generally follow your wishes but retains discretion to pay differently if circumstances have changed. This is the default for most Australians who have not lodged a BDBN. It provides flexibility but also introduces uncertainty.",
  },
  {
    title: "Reversionary beneficiary",
    badge: "Pension continues",
    badgeColor: "bg-emerald-100 text-emerald-800",
    body: "If you are drawing an income stream (pension) from super, you can nominate a reversionary beneficiary — usually your spouse — to automatically continue receiving your pension payments after your death. The pension continues without needing to be commuted and re-established. This is the most seamless outcome for a surviving spouse who wants continued income rather than a lump sum.",
  },
];

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

        {/* ── Hero ─────────────────────────────────────────────────────── */}
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
              <span className="text-xs font-semibold bg-amber-500 text-slate-900 px-3 py-1 rounded-full">{UPDATED_LABEL}</span>
              <span className="text-xs font-semibold bg-indigo-600 text-white px-3 py-1 rounded-full">Life</span>
              <span className="text-xs font-semibold bg-purple-600 text-white px-3 py-1 rounded-full">TPD</span>
              <span className="text-xs font-semibold bg-teal-600 text-white px-3 py-1 rounded-full">Income Protection</span>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-3 max-w-3xl">
              Insurance Through Super — What You Have &amp; What You Need
            </h1>
            <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-3xl">
              Most Australians automatically receive group life, TPD, and income protection insurance through
              their super fund — often at premiums well below retail because of group buying power. But
              default cover has important limits. Here is everything you need to know about super insurance
              in {CURRENT_YEAR}.
            </p>
          </div>
        </section>

        {/* ── Key Stats ────────────────────────────────────────────────── */}
        <section className="bg-white py-8 border-b border-slate-100">
          <div className="container-custom">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { v: "3 types", l: "Default group cover", sub: "Life, TPD, income protection" },
                { v: "70–75%", l: "IP monthly benefit", sub: "% of pre-disability salary" },
                { v: "16 months", l: "Inactivity threshold", sub: "Cover may cancel — opt back in" },
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

        {/* ── Intro ─────────────────────────────────────────────────────── */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">
              How insurance inside super works
            </h2>
            <div className="prose prose-slate max-w-none text-sm leading-relaxed space-y-4 text-slate-700">
              <p>
                Australian super funds are permitted to hold group insurance policies on behalf of their
                members. When you join a MySuper-compliant fund, you are typically enrolled in default
                life and TPD cover automatically — no medical questionnaire, no underwriting, no
                decision required on your part. Many funds also include income protection (salary continuance)
                as part of the default package.
              </p>
              <p>
                Because the fund negotiates a single group policy covering its entire membership, insurers
                offer significantly discounted premiums compared to individual retail policies. A 35-year-old
                paying for retail life insurance might pay $800–$1,500 per year for $500,000 of cover;
                the equivalent group rate through an industry super fund might be $300–$600 for the
                same amount. The gap is real and meaningful.
              </p>
              <p>
                Premiums are deducted from your super balance monthly — not from your take-home pay.
                This preserves cash flow but reduces the compounding power of your retirement savings over
                time. Understanding the long-run cost of premiums is important when deciding how much cover
                to hold inside super versus outside it.
              </p>
            </div>
          </div>
        </section>

        {/* ── Three insurance types ─────────────────────────────────────── */}
        <section className="py-10 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">
              The three types of super insurance
            </h2>
            <div className="space-y-4">
              {INSURANCE_TYPES.map((item) => (
                <div key={item.title} className="rounded-xl border border-slate-200 bg-white p-5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="font-extrabold text-slate-900">{item.title}</h3>
                    <span className={`shrink-0 text-xs font-semibold px-2 py-1 rounded-full ${item.badgeColor}`}>
                      {item.badge}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed mb-3">{item.body}</p>
                  <p className="text-xs text-slate-500 leading-relaxed bg-slate-50 rounded-lg p-3">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Default vs opted-in cover ─────────────────────────────────── */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">
              Default cover vs opted-in cover
            </h2>
            <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-5 mb-6">
              <p className="text-sm font-bold text-indigo-800 mb-1">Check your annual statement</p>
              <p className="text-sm text-indigo-700 leading-relaxed">
                Your super fund&apos;s annual statement or online portal shows your current cover type,
                cover amount, and the monthly premium being deducted. Many Australians have never reviewed
                this information and do not know what they are covered for — or whether cover is even
                still active.
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="inline-block text-xs font-bold bg-slate-100 text-slate-700 px-2 py-1 rounded-full mb-3">
                  Default cover
                </div>
                <ul className="space-y-2">
                  {[
                    "Provided automatically on joining the fund",
                    "No medical underwriting or health questions",
                    "Cover amount based on age and occupation category",
                    "Illustrative example: 3 units = $225,000 life cover at age 35 in a typical industry fund",
                    "Employer-sponsored plans often provide richer defaults",
                    "Opt out if you do not need or want the cover",
                  ].map((point) => (
                    <li key={point} className="text-sm flex gap-2 text-slate-700">
                      <span className="flex-shrink-0 mt-0.5 font-bold">&bull;</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="inline-block text-xs font-bold bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full mb-3">
                  Opted-in / additional cover
                </div>
                <ul className="space-y-2">
                  {[
                    "Apply through your fund to increase above the default amount",
                    "Amounts above certain thresholds require health evidence",
                    "Life events increases available without underwriting (see below)",
                    "Some employer plans allow significantly higher default cover",
                    "Employer-sponsored plans may require staying with the employer's nominated fund",
                    "Review the Product Disclosure Statement (PDS) before increasing",
                  ].map((point) => (
                    <li key={point} className="text-sm flex gap-2 text-slate-700">
                      <span className="flex-shrink-0 mt-0.5 font-bold">&bull;</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── Advantages ────────────────────────────────────────────────── */}
        <section className="py-10 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">
              Advantages of insurance inside super
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {ADVANTAGES.map((item) => (
                <div key={item.title} className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <h3 className="font-extrabold text-emerald-900 mb-1 text-sm">{item.title}</h3>
                  <p className="text-sm text-emerald-800 leading-relaxed">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Disadvantages ─────────────────────────────────────────────── */}
        <section className="py-10 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">
              Disadvantages and limitations
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {DISADVANTAGES.map((item) => (
                <div key={item.title} className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <h3 className="font-extrabold text-amber-900 mb-1 text-sm">{item.title}</h3>
                  <p className="text-sm text-amber-800 leading-relaxed">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Premium cost illustration ──────────────────────────────────── */}
        <section className="py-10 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">
              The true long-run cost of premiums
            </h2>
            <div className="rounded-xl border border-slate-200 bg-white p-5 mb-4">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Illustrative example</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm" aria-label="Long-run cost of super insurance premiums">
                  <thead>
                    <tr className="bg-slate-900 text-white">
                      <th scope="col" className="px-4 py-3 text-left font-bold text-xs uppercase tracking-wide">Annual premium</th>
                      <th scope="col" className="px-4 py-3 text-left font-bold text-xs uppercase tracking-wide text-amber-300">Years invested</th>
                      <th scope="col" className="px-4 py-3 text-left font-bold text-xs uppercase tracking-wide text-red-300">Balance reduction at 7% p.a.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { premium: "$500/year", years: "30 years", cost: "~$47,000" },
                      { premium: "$1,000/year", years: "30 years", cost: "~$94,000" },
                      { premium: "$2,000/year", years: "30 years", cost: "~$189,000" },
                      { premium: "$1,000/year", years: "20 years", cost: "~$41,000" },
                    ].map((row, i) => (
                      <tr key={row.premium + row.years} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                        <td className="px-4 py-3 font-semibold text-slate-700 text-xs">{row.premium}</td>
                        <td className="px-4 py-3 text-xs text-amber-800 font-bold border-l border-amber-100">{row.years}</td>
                        <td className="px-4 py-3 text-xs text-red-800 font-bold border-l border-red-100">{row.cost}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-slate-500 mt-3">
                These figures represent the approximate reduction in retirement balance from paying premiums
                rather than leaving that money invested at 7% per annum. The insurance protection may still
                represent excellent value — the point is to quantify the cost and review cover levels
                periodically to ensure you are not over-insured.
              </p>
            </div>
          </div>
        </section>

        {/* ── MySuper inactive account rules ────────────────────────────── */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">
              MySuper reforms: inactive accounts and the $6,000 balance threshold
            </h2>
            <div className="rounded-xl border border-red-200 bg-red-50 p-5 mb-6">
              <p className="text-sm font-bold text-red-800 mb-1">Protecting Your Super (2019) — a common cover trap</p>
              <p className="text-sm text-red-700 leading-relaxed">
                Under the Protecting Your Super package (effective 1 July 2019), APRA-regulated super funds
                must cancel insurance on accounts that have been inactive for 16 consecutive months (no
                employer or personal contributions received) or where the account balance falls below $6,000.
                The fund must notify you before cancelling. If you receive a notice, you can elect to retain
                your cover by notifying the fund before the cancellation date.
              </p>
            </div>
            <div className="space-y-4">
              {[
                {
                  title: "Who is most at risk",
                  body: "People on parental leave (no employer contributions being paid), casual or seasonal workers, people between jobs, or self-employed individuals who have not made voluntary contributions recently. If your account has not received a contribution in 16 months, your insurance may have already been cancelled.",
                },
                {
                  title: "How to retain cover",
                  body: "Contact your fund and lodge a written election to retain your insurance before the 16-month mark. Once cover is cancelled, you may need to reapply and go through underwriting. Making a small personal contribution also restarts the inactivity clock, but it does not automatically restore cancelled insurance.",
                },
                {
                  title: "Reinstating cancelled cover",
                  body: "If your cover has already been cancelled due to inactivity, you can apply to reinstate it. The fund may require health evidence depending on how long cover was lapsed and how much cover you are seeking. Life events increases may still be available without underwriting if you have experienced a qualifying event since the cancellation.",
                },
              ].map((item) => (
                <div key={item.title} className="rounded-xl border border-slate-200 bg-white p-5">
                  <h3 className="font-extrabold text-slate-900 mb-2">{item.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Consolidation warning ─────────────────────────────────────── */}
        <section className="py-10 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">
              Consolidating super funds: the critical insurance warning
            </h2>
            <div className="rounded-xl border border-red-300 bg-red-50 p-5 mb-6">
              <p className="text-sm font-extrabold text-red-900 mb-2">
                Rolling over your super cancels the old fund&apos;s insurance immediately
              </p>
              <p className="text-sm text-red-800 leading-relaxed">
                When you transfer your super balance from one fund to another (a rollover), the insurance
                held in the old fund is cancelled the moment the rollover is processed. If you are relying
                on that policy for cover, you must confirm that your new fund provides equivalent or better
                cover — and that you are eligible for it — before initiating the rollover.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                {
                  step: "1",
                  title: "Before you roll over",
                  body: "Log in to both funds. Note your current cover type, cover amount, premiums, and any conditions attached (e.g., occupation exclusions). Check whether your new fund's default cover matches or exceeds what you currently have.",
                },
                {
                  step: "2",
                  title: "Apply for cover in the new fund",
                  body: "If the new fund's default cover is lower, apply to increase it before initiating the rollover. Life events increases (if applicable) may allow you to increase cover without underwriting. Get written confirmation that the cover is active.",
                },
                {
                  step: "3",
                  title: "Then complete the rollover",
                  body: "Only proceed with the rollover once you are confident the new cover is in place. For complex situations — high cover amounts, pre-existing conditions, or occupation exclusions — consider seeking advice from a licensed insurance adviser before consolidating.",
                },
              ].map((s) => (
                <div key={s.step} className="rounded-xl border border-slate-200 bg-white p-5">
                  <div className="w-8 h-8 rounded-full bg-slate-800 text-white font-extrabold text-sm flex items-center justify-center mb-3">
                    {s.step}
                  </div>
                  <h3 className="font-extrabold text-slate-900 mb-2">{s.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Life events increases ─────────────────────────────────────── */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">
              Life events increases: no underwriting required
            </h2>
            <p className="text-sm text-slate-600 mb-6">
              Most super funds allow members to increase their life and TPD cover by a set amount (typically
              up to $500,000 or the difference between current and maximum cover) within 60–90 days
              of a qualifying life event, without requiring any medical underwriting. This is one of the
              most valuable windows to act — particularly for people with pre-existing health
              conditions who might not otherwise qualify for additional cover.
            </p>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3 mb-6">
              {LIFE_EVENTS.map((item) => (
                <div key={item.event} className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm font-semibold text-indigo-800">
                  {item.event}
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm text-amber-800 leading-relaxed">
                <strong>Act within the window.</strong> Most funds require the application to be lodged within
                60 days of the life event. After the window closes, any increase will require evidence of
                good health. Contact your fund as soon as the qualifying event occurs.
              </p>
            </div>
          </div>
        </section>

        {/* ── When to review ────────────────────────────────────────────── */}
        <section className="py-10 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">
              When to review your super insurance
            </h2>
            <div className="space-y-3">
              {REVIEW_TRIGGERS.map((item) => (
                <div key={item.trigger} className="flex gap-4 rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex-shrink-0">
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-indigo-500 mt-1.5" />
                  </div>
                  <div>
                    <p className="text-sm font-extrabold text-slate-900">{item.trigger}</p>
                    <p className="text-sm text-slate-600">{item.reason}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Death benefit nominations ─────────────────────────────────── */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">
              Death benefit nominations: who gets your super
            </h2>
            <p className="text-sm text-slate-600 mb-6">
              Super does not automatically form part of your estate. It is held in trust and paid according
              to the fund&apos;s trust deed and your nominations. Without a valid nomination, the trustee
              exercises discretion over who receives your benefit — which may not align with your wishes
              or your will. There are three main nomination types:
            </p>
            <div className="space-y-4 mb-6">
              {NOMINATION_TYPES.map((item) => (
                <div key={item.title} className="rounded-xl border border-slate-200 bg-white p-5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="font-extrabold text-slate-900">{item.title}</h3>
                    <span className={`shrink-0 text-xs font-semibold px-2 py-1 rounded-full ${item.badgeColor}`}>
                      {item.badge}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.body}</p>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="font-extrabold text-slate-900 mb-2">Tax on death benefits paid to non-dependants</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Super death benefits paid to a dependant (spouse, children under 18, financial dependants)
                are tax-free. Adult children who are not financial dependants pay tax on the taxable component
                of the benefit — currently 15% plus 2% Medicare levy (effectively 17%). The tax-free
                component passes through to any beneficiary without tax. Large super balances with significant
                taxable components paid to adult independent children can result in substantial tax bills.
                Estate planning strategies such as re-contribution (converting taxable to tax-free) and
                directing benefits to the estate via will can sometimes reduce this — seek personal advice.
              </p>
            </div>
          </div>
        </section>

        {/* ── FAQs ─────────────────────────────────────────────────────── */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
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

        {/* ── CTA ──────────────────────────────────────────────────────── */}
        <section className="py-10 bg-gradient-to-br from-slate-900 to-slate-800">
          <div className="container-custom flex flex-col sm:flex-row items-center gap-6 justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-white mb-1">
                Get personal advice on your super insurance
              </h2>
              <p className="text-slate-400 text-sm">
                A licensed financial adviser can model your cover needs, compare inside-super vs retail
                options, and ensure your death benefit nominations are structured correctly.
              </p>
            </div>
            <div className="flex gap-3 shrink-0 flex-wrap">
              <Link
                href="/compare/super"
                className="px-5 py-3 bg-green-500 hover:bg-green-400 text-white font-bold rounded-xl text-sm transition-colors whitespace-nowrap"
              >
                Compare Super Funds
              </Link>
              <Link
                href="/advisors/financial-planners"
                className="px-5 py-3 border border-slate-600 hover:border-slate-400 text-slate-300 font-semibold rounded-xl text-sm transition-colors whitespace-nowrap"
              >
                Find a Financial Planner
              </Link>
            </div>
          </div>
        </section>

        {/* ── Related pages ────────────────────────────────────────────── */}
        <section className="py-8 bg-white border-t border-slate-100">
          <div className="container-custom max-w-4xl">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Related guides</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <Link href="/super" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">
                Super hub &rarr;
              </Link>
              <Link href="/insurance/income-protection" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">
                Income protection guide &rarr;
              </Link>
              <Link href="/super/pension-phase" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">
                Pension phase guide &rarr;
              </Link>
            </div>
          </div>
        </section>

        {/* ── Compliance disclaimer ─────────────────────────────────────── */}
        <section className="py-6 bg-slate-50 border-t border-slate-200">
          <div className="container-custom max-w-4xl">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                General advice warning — insurance advice requires a licensed adviser
              </p>
              <p className="text-xs text-slate-500 leading-relaxed">{GENERAL_ADVICE_WARNING}</p>
            </div>
          </div>
        </section>

      </div>
    </>
  );
}
