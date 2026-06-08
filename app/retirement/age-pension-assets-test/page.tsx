import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import ArticleReadingProgress from "@/components/ArticleReadingProgress";
import HubAdvisorCTA from "@/components/HubAdvisorCTA";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Age Pension Assets Test — Thresholds, Exempt Assets & Taper Rate (${CURRENT_YEAR}) | invest.com.au`,
  description: `Age Pension assets test — thresholds, the $3/fortnight taper, exempt assets, gifting rules, and worked examples. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Age Pension Assets Test (${CURRENT_YEAR}) — Thresholds, Exempt Assets & Taper`,
    description:
      "2024–25 assets test thresholds, the $3/fortnight taper, exempt assets, super treatment by age, gifting rules, CSHC, and 3 worked examples for the Australian Age Pension.",
    url: `${SITE_URL}/retirement/age-pension-assets-test`,
    images: [
      {
        url: `/api/og?title=${encodeURIComponent("Age Pension Assets Test")}&sub=${encodeURIComponent("Thresholds · Exempt Assets · Taper · " + CURRENT_YEAR)}`,
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/retirement/age-pension-assets-test` },
};

/* ─── Data ──────────────────────────────────────────────────────────────── */

const THRESHOLDS_2425 = [
  {
    group: "Single — homeowner",
    full: "$314,000",
    cutoff: "$695,500",
  },
  {
    group: "Single — non-homeowner",
    full: "$566,000",
    cutoff: "$947,500",
  },
  {
    group: "Couple — homeowners (combined)",
    full: "$470,000",
    cutoff: "$1,045,500",
  },
  {
    group: "Couple — non-homeowners (combined)",
    full: "$722,000",
    cutoff: "$1,297,500",
  },
];

const ASSESSABLE = [
  {
    item: "Financial investments",
    detail:
      "Shares, ETFs, managed funds, savings accounts, term deposits, and cash — all assessed at current market value.",
  },
  {
    item: "Investment property",
    detail:
      "Assessed at market value. Any mortgage on the property is NOT deducted — the gross value counts.",
  },
  {
    item: "Superannuation (at or above Age Pension age)",
    detail:
      "From Age Pension age (67), all super balances — accumulation and pension phase — are fully assessable. Below pension age, your own super is not assessed.",
  },
  {
    item: "Account-based pensions (ABP)",
    detail:
      "The full ABP account balance is assessable. For ABPs started on or after 1 January 2015, deemed income is also applied under the income test.",
  },
  {
    item: "Business interests",
    detail: "Assessed at net market value. Primary production concessions may apply for farm assets.",
  },
  {
    item: "Vehicles, caravans and boats",
    detail:
      "Cars, caravans, and recreational watercraft are assessed at reasonable second-hand resale value. A single car up to around $7,000 is often absorbed into household goods assessment.",
  },
  {
    item: "Household contents",
    detail:
      "Assessed at a low garage-sale value — typically $10,000–$15,000 for a standard household. Not a significant assessable item for most.",
  },
  {
    item: "Gifts above gifting limits",
    detail:
      "Gifts exceeding $10,000/year or $30,000 over 5 years are treated as deprived assets and remain assessed for 5 years from the date of the gift.",
  },
];

const NOT_ASSESSED = [
  {
    item: "Primary home (principal place of residence)",
    detail:
      "Fully exempt regardless of value — a $500,000 flat and a $10 million house are treated identically. No cap applies.",
  },
  {
    item: "Super of a partner below Age Pension age",
    detail:
      "If your partner has not yet reached 67, their superannuation is not counted in the assets test at all — a major planning lever for couples where there is an age gap.",
  },
  {
    item: "Funeral bonds (up to $15,000)",
    detail:
      "Funeral bonds up to $15,000 per person are exempt. Amounts above the cap are assessable.",
  },
  {
    item: "Pre-paid funeral plans",
    detail:
      "Funds paid directly to a funeral director for a pre-arranged funeral are fully exempt, with no dollar cap.",
  },
  {
    item: "Certain exempt income streams",
    detail:
      "Some lifetime income streams (complying lifetime annuities) receive partial assets test exemption — 60% of the purchase price is assessed in the first 5 years, 30% thereafter.",
  },
  {
    item: "Granny flat rights (where exempt)",
    detail:
      "Where a granny flat arrangement meets specific rules, the entry contribution may be treated as an exempt asset test item rather than a gift. Rules are complex — case-by-case assessment.",
  },
  {
    item: "Special Disability Trusts (up to $817,000)",
    detail:
      "Assets held inside a Special Disability Trust are exempt up to $817,000 (2024–25 figure, indexed annually).",
  },
];

const STRATEGIES = [
  {
    strategy: "Prepay funeral bonds or funeral expenses",
    detail:
      "Up to $15,000 per person in funeral bonds is exempt. Pre-paying a funeral plan with a licensed funeral director removes those funds from assessable assets entirely — no dollar cap.",
  },
  {
    strategy: "Home renovations and improvements",
    detail:
      "Money spent on your principal residence converts assessable cash into exempt home equity. New kitchen, bathroom renovation, solar system, insulation — all reduce assessable assets without triggering gifting rules.",
  },
  {
    strategy: "Contribute to super for a younger partner",
    detail:
      "If your partner is below Age Pension age, their super is not assessed. Shifting money into their super (within contribution cap limits) can meaningfully reduce the household&apos;s assessable asset total.",
  },
  {
    strategy: "Complying lifetime annuity",
    detail:
      "Certain complying lifetime annuity products receive favourable assets test treatment — 60% of purchase price for the first 5 years, 30% thereafter. Converting a large lump sum may reduce assessable assets substantially.",
  },
  {
    strategy: "Large non-deductible expenses before pension age",
    detail:
      "Spending on a car upgrade, travel, or other major purchases in the years before reaching Age Pension age reduces assessable assets and does not trigger the gifting rules — because the spending occurs before you are a pensioner.",
  },
];

const FAQS = [
  {
    q: "Does my home count toward the assets test?",
    a: "No. Your principal place of residence is completely exempt from the Age Pension assets test, regardless of its value. A $500,000 unit and a $5 million harbour-view home are treated identically — neither counts as an assessable asset. However, if you sell your home, the proceeds become assessable assets (cash or investments). A temporary 24-month asset-test exemption may apply to certain sale proceeds in some circumstances — Services Australia assesses this case-by-case.",
  },
  {
    q: "How is my superannuation assessed for the assets test?",
    a: "The treatment depends entirely on your age relative to Age Pension age (currently 67). If you are below Age Pension age, your own super in the accumulation phase is NOT counted in the assets test. Once you reach 67, all super — whether in accumulation or pension phase (account-based pension) — becomes fully assessable. If your partner is under 67, their super is also not assessed, even if you are over 67. This creates a significant planning window for couples with an age gap.",
  },
  {
    q: "What happens if I give assets away before applying for the pension?",
    a: "Gifting is subject to strict deprivation rules. You can gift up to $10,000 per financial year and no more than $30,000 over any rolling 5-year period without affecting your pension. Gifts above these limits are treated as &apos;deprived assets&apos; — they continue to be assessed as if you still own them for 5 years from the date of the gift, regardless of whether the money is gone. This is one of the most common planning mistakes retirees make: giving large lump sums to children to reduce assessable assets before applying for the pension, only to find that Centrelink still counts those funds.",
  },
  {
    q: "How do I reduce my assessable assets legally?",
    a: "Several strategies are available within the rules: (1) Prepay funeral bonds or a funeral plan — up to $15,000 per person exempt for bonds, unlimited for pre-paid funeral plans; (2) Spend on home renovations — money converted into your exempt principal home is no longer assessable; (3) Contribute to a younger partner&apos;s super if they are below pension age; (4) Purchase a complying lifetime annuity for favourable 60%/30% assets test treatment; (5) Make larger non-deductible purchases before reaching Age Pension age. These strategies have varying tax, estate, and income test implications — always consult a licensed financial adviser before restructuring assets specifically to maximise a pension entitlement.",
  },
  {
    q: "What is the assets test threshold for couples?",
    a: "In 2024–25, the full pension threshold for a couple who are homeowners is $470,000 (combined assessable assets). Above this, the pension tapers at $3 per fortnight per $1,000 of excess. The cut-off — where the pension reaches nil — is $1,045,500 (combined, homeowners). Non-homeowner couples have higher thresholds: $722,000 for a full pension and $1,297,500 before the pension cuts out entirely. These thresholds are indexed and adjusted each July.",
  },
];

/* ─── Page ───────────────────────────────────────────────────────────────── */

export default function AgePensionAssetsTestPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Retirement", url: `${SITE_URL}/retirement` },
    { name: "Age Pension Assets Test" },
  ]);
  const faqLd = faqJsonLd(FAQS.map((f) => ({ q: f.q, a: f.a })));

  return (
    <div className="bg-white min-h-screen">
      <ArticleReadingProgress />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      {faqLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
        />
      )}

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="bg-slate-900 text-white py-10 md:py-14">
        <div className="container-custom max-w-4xl">
          <nav aria-label="Breadcrumb" className="text-xs text-slate-400 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-white">Home</Link>
            <span>/</span>
            <Link href="/retirement" className="hover:text-white">Retirement</Link>
            <span>/</span>
            <span className="text-slate-200 font-medium">Age Pension Assets Test</span>
          </nav>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-4">
            Age Pension assets test: thresholds, exempt assets &amp; taper ({CURRENT_YEAR})
          </h1>
          <p className="text-lg text-slate-300 leading-relaxed mb-6">
            The assets test determines your eligibility for the Age Pension. Assets above the full-pension
            threshold reduce the pension by <strong className="text-white">$3 per fortnight for every $1,000</strong> of
            excess. Homeowners and non-homeowners have different thresholds, and your family home is
            completely exempt — no matter how much it is worth.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Taper rate", value: "$3/1k", sub: "Per $1,000 above lower threshold" },
              { label: "Single homeowner", value: "$314k", sub: "Full pension threshold" },
              { label: "Couple homeowners", value: "$470k", sub: "Full pension threshold (combined)" },
              { label: "Home exemption", value: "100%", sub: "Principal home — always exempt" },
            ].map((stat) => (
              <div key={stat.label} className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                <p className="text-xs text-slate-400 mb-1">{stat.label}</p>
                <p className="text-2xl font-extrabold text-white">{stat.value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{stat.sub}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-4">
            {UPDATED_LABEL} &middot; 2024–25 thresholds effective 1 July 2024 &middot; Indexed annually &middot; Verify at servicesaustralia.gov.au
          </p>
        </div>
      </section>

      {/* ── How the assets test works ───────────────────────────────────── */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">How the assets test works</h2>
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-6 space-y-4">
            <p className="text-sm text-slate-700 leading-relaxed">
              The assets test sits alongside the income test as one of two means tests for the Age
              Pension. Centrelink applies <strong className="text-slate-900">both</strong> tests
              independently and pays the lower of the two results. You cannot choose which test applies.
            </p>
            <p className="text-sm text-slate-700 leading-relaxed">
              There are two key threshold levels for each household type:
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="rounded-lg border border-emerald-200 bg-white p-4">
                <p className="text-xs font-bold text-emerald-800 uppercase tracking-wide mb-2">
                  Lower threshold — full pension
                </p>
                <p className="text-sm text-slate-700 leading-relaxed">
                  If your assessable assets are <em>below</em> this threshold, you receive the maximum
                  fortnightly pension for your situation (up to $1,144.40 for singles,
                  $1,725.20 combined for couples in 2024–25).
                </p>
              </div>
              <div className="rounded-lg border border-red-200 bg-white p-4">
                <p className="text-xs font-bold text-red-800 uppercase tracking-wide mb-2">
                  Upper threshold — cut-off (nil pension)
                </p>
                <p className="text-sm text-slate-700 leading-relaxed">
                  If your assessable assets exceed this threshold, you receive no Age Pension at all.
                  Between the two thresholds, a part-pension is paid at the taper rate.
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">
              <strong className="text-slate-900">Homeowners</strong> have lower thresholds than{" "}
              <strong className="text-slate-900">non-homeowners</strong>. The difference reflects the
              fact that a homeowner&apos;s housing wealth is held in an exempt asset, whereas a
              non-homeowner must fund housing from assessable savings or investments.
            </p>
          </div>
        </div>
      </section>

      {/* ── Thresholds table ────────────────────────────────────────────── */}
      <section className="py-10 border-b border-slate-100 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">
            2024–25 assets test thresholds
          </h2>
          <p className="text-sm text-slate-500 mb-5">
            Thresholds are indexed and updated each 1 July. The figures below apply for the 2024–25
            financial year.
          </p>
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm" aria-label="Age Pension assets test thresholds 2024–25">
              <thead>
                <tr className="bg-slate-900">
                  <th scope="col" className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide">
                    Situation
                  </th>
                  <th scope="col" className="text-left px-3 py-3 text-xs font-bold text-white uppercase tracking-wide">
                    Full pension (below)
                  </th>
                  <th scope="col" className="text-left px-3 py-3 text-xs font-bold text-white uppercase tracking-wide">
                    Cut-off — nil pension (above)
                  </th>
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
          <p className="text-xs text-slate-400 mt-2">
            Taper: pension reduces $3 per fortnight per $1,000 of assessable assets above the lower
            threshold. Couple thresholds are combined household totals. Verify current rates at
            servicesaustralia.gov.au.
          </p>
        </div>
      </section>

      {/* ── Taper rate & worked example ─────────────────────────────────── */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">
            The taper rate: $3 per fortnight per $1,000
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-6">
            For every $1,000 of assessable assets above the lower threshold, your fortnightly Age
            Pension reduces by $3. The calculation is straightforward: subtract the relevant full-pension
            threshold from your assessable assets, divide by 1,000, and multiply by $3.
          </p>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 mb-6">
            <h3 className="text-base font-extrabold text-slate-900 mb-4">
              Worked example — single homeowner with $450,000 in assets
            </h3>
            <div className="space-y-2 text-sm mb-5">
              <div className="flex justify-between items-center border-b border-amber-200 pb-2">
                <span className="text-slate-700">Total assessable assets</span>
                <span className="font-bold text-slate-900">$450,000</span>
              </div>
              <div className="flex justify-between items-center border-b border-amber-200 pb-2">
                <span className="text-slate-700">
                  Single homeowner full-pension threshold (2024–25)
                </span>
                <span className="font-bold text-slate-900">$314,000</span>
              </div>
              <div className="flex justify-between items-center border-b border-amber-200 pb-2">
                <span className="text-slate-700">Excess above threshold</span>
                <span className="font-bold text-slate-900">$136,000</span>
              </div>
              <div className="flex justify-between items-center border-b border-amber-200 pb-2">
                <span className="text-slate-700">
                  Taper calculation ($136,000 &divide; $1,000 &times; $3)
                </span>
                <span className="font-bold text-red-600">$408 reduction per fortnight</span>
              </div>
              <div className="flex justify-between items-center border-b border-amber-200 pb-2">
                <span className="text-slate-700">
                  Maximum single pension rate (2024–25)
                </span>
                <span className="font-bold text-slate-900">$1,144.40/fortnight</span>
              </div>
              <div className="flex justify-between items-center pb-2">
                <span className="text-slate-700 font-semibold">
                  Assets-test pension result
                </span>
                <span className="font-extrabold text-emerald-700 text-base">
                  $736.40/fortnight
                </span>
              </div>
            </div>
            <div className="rounded-lg border border-amber-300 bg-white p-3">
              <p className="text-xs text-slate-600 leading-relaxed">
                <strong className="text-slate-800">Note:</strong> This is the assets test result only.
                Centrelink also applies the income test. The lower of the two results is what is
                actually paid. The worked example above is illustrative — your actual pension will
                depend on all assessed assets and income.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <h3 className="text-sm font-extrabold text-slate-900 mb-2 uppercase tracking-wide">
              What the taper means in practice
            </h3>
            <p className="text-sm text-slate-700 leading-relaxed">
              Each additional $1,000 in assessable assets costs you $3 per fortnight — or $78 per year —
              in pension. Conversely, reducing your assessable assets by $10,000 increases your
              fortnightly pension by $30 (or $780/year). This relationship is why strategies that
              convert assessable assets into exempt assets — such as home renovations or pre-paid funeral
              plans — can have a meaningful and ongoing impact on pension income.
            </p>
          </div>
        </div>
      </section>

      {/* ── What is and isn't counted ───────────────────────────────────── */}
      <section className="py-10 border-b border-slate-100 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">
            What is — and isn&apos;t — counted
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Assessable */}
            <div>
              <h3 className="text-base font-extrabold text-slate-900 mb-4 flex items-center gap-2">
                <span className="text-red-500 text-lg leading-none">&#9679;</span>
                Assessable assets (counted)
              </h3>
              <div className="space-y-3">
                {ASSESSABLE.map((item, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-slate-200 bg-white p-3"
                  >
                    <p className="text-sm font-bold text-slate-900">{item.item}</p>
                    <p className="text-xs text-slate-600 leading-relaxed mt-0.5">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>
            {/* Not assessed */}
            <div>
              <h3 className="text-base font-extrabold text-slate-900 mb-4 flex items-center gap-2">
                <span className="text-emerald-500 text-lg leading-none">&#9679;</span>
                Exempt assets (not counted)
              </h3>
              <div className="space-y-3">
                {NOT_ASSESSED.map((item, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-emerald-200 bg-emerald-50 p-3"
                  >
                    <p className="text-sm font-bold text-emerald-900">{item.item}</p>
                    <p className="text-xs text-emerald-800 leading-relaxed mt-0.5">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── The home exemption ──────────────────────────────────────────── */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">
            The home exemption: no cap, no questions
          </h2>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 space-y-4">
            <p className="text-sm text-slate-700 leading-relaxed">
              The family home — your principal place of residence — is fully exempt from the assets test
              regardless of value. There is no cap. A retiree in a $1 million home and a retiree in a
              $200,000 home are assessed identically: the home does not count.
            </p>
            <p className="text-sm text-slate-700 leading-relaxed">
              This creates the classic{" "}
              <strong className="text-slate-900">&ldquo;asset-rich, income-poor&rdquo;</strong> retiree
              profile — someone who owns a large home but has relatively few other assets and qualifies
              for a full or part pension. The home exemption is also why many financial planners advise
              retirees with assets just above the threshold to invest in home improvements rather than
              holding excess cash.
            </p>
            <div className="rounded-lg border border-amber-300 bg-white p-4">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
                Homeowner vs non-homeowner threshold difference
              </p>
              <p className="text-sm text-slate-700 leading-relaxed">
                In 2024–25, the full-pension threshold for a single{" "}
                <strong>homeowner</strong> is $314,000, while for a single{" "}
                <strong>non-homeowner</strong> it is $566,000 — a difference of $252,000. The higher
                non-homeowner threshold compensates for the fact that renters must fund their housing from
                assessable assets (cash, investments) rather than from an exempt property.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Super treatment ─────────────────────────────────────────────── */}
      <section className="py-10 border-b border-slate-100 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">
            Superannuation and the assets test
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-6">
            The assets test treatment of super depends critically on whether you have reached Age
            Pension age (currently 67).
          </p>
          <div className="space-y-4 mb-6">
            <div className="rounded-xl border border-emerald-200 bg-white p-5">
              <p className="text-xs font-bold text-emerald-800 uppercase tracking-wide mb-2">
                Below Age Pension age — own super NOT assessed
              </p>
              <p className="text-sm text-slate-700 leading-relaxed">
                If you or your partner are below the Age Pension age of 67, your super in the
                accumulation phase is <strong className="text-slate-900">not counted</strong> in the
                assets test at all. This creates a significant planning window: a younger partner can
                hold a large super balance that is invisible to Centrelink until they too reach 67. For
                couples with an age gap, this is often the most impactful planning lever available.
              </p>
            </div>
            <div className="rounded-xl border border-red-200 bg-white p-5">
              <p className="text-xs font-bold text-red-800 uppercase tracking-wide mb-2">
                At or above Age Pension age — all super is fully assessed
              </p>
              <p className="text-sm text-slate-700 leading-relaxed">
                Once you reach 67, all superannuation — whether in accumulation phase or converted to
                a pension (account-based pension) — becomes fully assessable under the assets test.
                Reaching pension age with a large accumulation balance therefore affects both the assets
                test and the income test simultaneously.
              </p>
            </div>
            <div className="rounded-xl border border-blue-200 bg-white p-5">
              <p className="text-xs font-bold text-blue-800 uppercase tracking-wide mb-2">
                Account-based pensions (ABP) — pre-2015 grandfathering
              </p>
              <p className="text-sm text-slate-700 leading-relaxed mb-3">
                For the <strong>assets test</strong>, all ABP balances are fully assessable regardless
                of when they started. The distinction between pre-2015 and post-2015 ABPs matters for
                the <em>income test</em> only:
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
                  <p className="text-xs font-bold text-blue-900 mb-1.5">
                    ABP started before 1 January 2015
                  </p>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    Under the income test, only the actual pension payments received are assessed
                    (not deemed income on the full balance). This grandfathered treatment is
                    usually more favourable for large balances. Grandfathering is{" "}
                    <strong>permanently lost</strong> if the ABP is restructured, rolled over, or
                    switched — never alter a pre-2015 ABP without specialist advice.
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-bold text-slate-800 mb-1.5">
                    ABP started on or after 1 January 2015
                  </p>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    The full ABP balance is subject to deeming under the income test — standard
                    deeming rates apply to the account balance, regardless of actual investment
                    returns or the drawdown amount.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Gifting rules ───────────────────────────────────────────────── */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">
            Gifting rules (disposal of assets)
          </h2>
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
            <p className="text-sm text-slate-700 leading-relaxed">
              Transferring assets — whether cash, property, or other items — to reduce your assessable
              assets is subject to strict <strong className="text-slate-900">deprivation rules</strong>.
              Centrelink does not simply ignore gifts; it treats excess gifts as if you still own them.
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-xs font-bold text-emerald-800 uppercase tracking-wide mb-2">
                  Allowed — within gifting limits
                </p>
                <p className="text-sm text-emerald-900 font-bold">$10,000 per financial year</p>
                <p className="text-xs text-emerald-800 mt-1">
                  And no more than $30,000 over any rolling 5-year period.
                </p>
                <p className="text-xs text-emerald-800 mt-2">
                  Gifts within these limits are not assessed under either the assets test or the income
                  test — they are simply gone.
                </p>
              </div>
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <p className="text-xs font-bold text-red-800 uppercase tracking-wide mb-2">
                  Excess gifts — treated as deprived assets
                </p>
                <p className="text-sm text-red-900 leading-relaxed">
                  Any gift above these limits is a <em>deprived asset</em>. Centrelink assesses the
                  excess amount as if you still hold it — including deemed income on it — for{" "}
                  <strong>5 years</strong> from the date of the gift.
                </p>
              </div>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-2">
                Common mistake: large lump sums to children
              </p>
              <p className="text-sm text-slate-700 leading-relaxed">
                Many retirees give large amounts to children or grandchildren in the year or two before
                claiming the Age Pension, expecting this to reduce their assessable assets. If the gift
                exceeds the annual ($10,000) or 5-year ($30,000) limit, the excess remains assessed.
                Both Services Australia and the ATO monitor gifting patterns. Getting it wrong creates an
                overpayment that must be repaid.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Assets vs income test ───────────────────────────────────────── */}
      <section className="py-10 border-b border-slate-100 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">
            Assets test vs income test — which one applies?
          </h2>
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <p className="text-sm text-slate-700 leading-relaxed">
              Centrelink applies <strong className="text-slate-900">both</strong> tests independently
              and pays whichever produces the <em>lower</em> pension (i.e., whichever results in the
              greater reduction). You cannot elect which test applies.
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                  Assets test looks at
                </p>
                <p className="text-sm text-slate-700 leading-relaxed">
                  What you <strong>own</strong> — superannuation balances (from pension age), shares,
                  cash, investment properties, vehicles, and other non-exempt assets. The taper is
                  $3/fortnight per $1,000 above the lower threshold.
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                  Income test looks at
                </p>
                <p className="text-sm text-slate-700 leading-relaxed">
                  What you <strong>earn</strong> — actual income (rent, wages, business profit) plus
                  deemed income on financial assets calculated at the deeming rates. The taper is 50
                  cents per dollar of income above the income-free area.
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">
              In practice, the assets test is the binding constraint for most retirees with moderate
              to large super balances or investment portfolios. The income test tends to bind when a
              retiree has high actual income (rental income, part-time work) but relatively fewer
              assets.{" "}
              <Link
                href="/retirement/income-test"
                className="text-amber-700 underline hover:text-amber-900"
              >
                Full income test guide &rarr;
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* ── Worked examples ─────────────────────────────────────────────── */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">
            Worked examples — three couple scenarios
          </h2>

          {/* Example 1 — full pension */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 mb-6">
            <h3 className="text-base font-extrabold text-slate-900 mb-1">
              Scenario 1 — Couple at the lower threshold (full pension)
            </h3>
            <p className="text-xs text-slate-600 mb-4">
              Couple, both 68, own their home. Combined assessable assets: $460,000 (super in pension
              phase plus savings). No other income beyond the pension.
            </p>
            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between border-b border-emerald-200 pb-1.5">
                <span className="text-slate-700">Assessable assets (combined)</span>
                <span className="font-bold text-slate-900">$460,000</span>
              </div>
              <div className="flex justify-between border-b border-emerald-200 pb-1.5">
                <span className="text-slate-700">Couple homeowner full-pension threshold</span>
                <span className="font-bold text-slate-900">$470,000</span>
              </div>
              <div className="flex justify-between pb-1.5">
                <span className="text-slate-700">Assets below threshold — no taper applies</span>
                <span className="font-bold text-emerald-700">Full pension payable</span>
              </div>
            </div>
            <div className="rounded-lg border border-emerald-300 bg-white p-3">
              <p className="text-sm font-extrabold text-emerald-700">
                Outcome: maximum couple pension — $1,725.20/fortnight combined (subject to income test,
                which at nil income would also produce the full rate).
              </p>
            </div>
          </div>

          {/* Example 2 — part pension */}
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 mb-6">
            <h3 className="text-base font-extrabold text-slate-900 mb-1">
              Scenario 2 — Couple with $750,000 in assessable assets (part pension)
            </h3>
            <p className="text-xs text-slate-600 mb-4">
              Couple, both 69, homeowners. Combined assessable assets: $750,000 (super plus managed
              funds). No rental income.
            </p>
            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between border-b border-amber-200 pb-1.5">
                <span className="text-slate-700">Assessable assets (combined)</span>
                <span className="font-bold text-slate-900">$750,000</span>
              </div>
              <div className="flex justify-between border-b border-amber-200 pb-1.5">
                <span className="text-slate-700">Couple homeowner full-pension threshold</span>
                <span className="font-bold text-slate-900">$470,000</span>
              </div>
              <div className="flex justify-between border-b border-amber-200 pb-1.5">
                <span className="text-slate-700">Excess above threshold</span>
                <span className="font-bold text-slate-900">$280,000</span>
              </div>
              <div className="flex justify-between border-b border-amber-200 pb-1.5">
                <span className="text-slate-700">
                  Taper ($280,000 &divide; $1,000 &times; $3)
                </span>
                <span className="font-bold text-red-600">$840 reduction per fortnight</span>
              </div>
              <div className="flex justify-between border-b border-amber-200 pb-1.5">
                <span className="text-slate-700">Maximum couple pension (combined)</span>
                <span className="font-bold text-slate-900">$1,725.20/fortnight</span>
              </div>
              <div className="flex justify-between pb-1.5">
                <span className="text-slate-700 font-semibold">Assets-test pension result</span>
                <span className="font-extrabold text-emerald-700 text-base">$885.20/fortnight</span>
              </div>
            </div>
            <div className="rounded-lg border border-amber-300 bg-white p-3">
              <p className="text-sm text-slate-700">
                This couple receives a <strong>part pension</strong> of approximately $885.20/fortnight
                combined (assets test result). The income test would also be run — the lower result is
                paid.
              </p>
            </div>
          </div>

          {/* Example 3 — above cut-off */}
          <div className="rounded-xl border border-red-200 bg-red-50 p-5">
            <h3 className="text-base font-extrabold text-slate-900 mb-1">
              Scenario 3 — Couple above the cut-off threshold (no pension)
            </h3>
            <p className="text-xs text-slate-600 mb-4">
              Couple, homeowners. Combined assessable assets: $1,100,000 — above the homeowner
              cut-off of $1,045,500.
            </p>
            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between border-b border-red-200 pb-1.5">
                <span className="text-slate-700">Assessable assets (combined)</span>
                <span className="font-bold text-slate-900">$1,100,000</span>
              </div>
              <div className="flex justify-between border-b border-red-200 pb-1.5">
                <span className="text-slate-700">Couple homeowner cut-off threshold</span>
                <span className="font-bold text-slate-900">$1,045,500</span>
              </div>
              <div className="flex justify-between pb-1.5">
                <span className="text-slate-700">Result</span>
                <span className="font-bold text-red-600">No Age Pension</span>
              </div>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 mt-2">
              <p className="text-xs font-bold text-blue-800 uppercase tracking-wide mb-2">
                Commonwealth Seniors Health Card (CSHC) may still be available
              </p>
              <p className="text-xs text-slate-700 leading-relaxed">
                Self-funded retirees above the pension threshold may qualify for the CSHC — which
                has an income test but <strong>no assets test</strong>. For a single person, the 2024–25
                income threshold is $95,400/year; for a couple it is $152,640/year (combined). The CSHC
                provides cheaper PBS medicines, bulk-billing support, and other concessions. Deemed
                income on financial assets counts toward the CSHC income threshold.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Strategies ──────────────────────────────────────────────────── */}
      <section className="py-10 border-b border-slate-100 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">
            General strategies to reduce assessable assets
          </h2>
          <p className="text-sm text-slate-500 mb-6">
            The following are general information only — not personal financial advice. Always consult a
            licensed financial adviser before restructuring assets.
          </p>
          <div className="space-y-3">
            {STRATEGIES.map((s, i) => (
              <div
                key={i}
                className="rounded-xl border border-slate-200 bg-white p-5"
              >
                <p className="text-sm font-extrabold text-slate-900 mb-1.5">{s.strategy}</p>
                <p className="text-sm text-slate-600 leading-relaxed">{s.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CSHC callout ────────────────────────────────────────────────── */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">
            Commonwealth Seniors Health Card (CSHC)
          </h2>
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-6 space-y-4">
            <p className="text-sm text-slate-700 leading-relaxed">
              Retirees who have reached Age Pension age but whose assets exceed the pension cut-off
              may still qualify for the CSHC — a concession card providing access to cheaper PBS
              medicines, bulk-billing, and other concessions.
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="rounded-lg border border-blue-200 bg-white p-4">
                <p className="text-xs font-bold text-blue-800 uppercase tracking-wide mb-2">
                  CSHC — no assets test
                </p>
                <p className="text-sm text-slate-700">
                  Unlike the Age Pension, the CSHC has <strong>no assets test</strong>. Retirees with
                  very large asset bases who fail the pension assets test may still qualify for the card.
                </p>
              </div>
              <div className="rounded-lg border border-blue-200 bg-white p-4">
                <p className="text-xs font-bold text-blue-800 uppercase tracking-wide mb-2">
                  CSHC income threshold (2024–25)
                </p>
                <p className="text-sm text-slate-700">
                  $95,400/year for singles. $152,640/year combined for couples. Deemed income on
                  financial assets counts, even though there is no assets test.
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              CSHC thresholds are indexed annually. Check current thresholds at servicesaustralia.gov.au.
            </p>
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────────── */}
      <section className="py-10 border-b border-slate-100 bg-slate-50">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">
            Frequently asked questions
          </h2>
          <div className="space-y-4">
            {FAQS.map((faq, i) => (
              <details key={i} className="group border border-slate-200 rounded-xl bg-white p-4">
                <summary className="cursor-pointer list-none font-bold text-slate-900 flex items-start justify-between gap-3">
                  {faq.q}
                  <span className="shrink-0 text-slate-400 group-open:rotate-180 transition-transform text-lg leading-none" aria-hidden="true">
                    &#9660;
                  </span>
                </summary>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Advisor CTA */}
      <HubAdvisorCTA
        heading="Get your Age Pension assets test modelled"
        subheading="The assets test threshold, pension taper rate, and super drawdown strategy all interact. A licensed financial planner can model your entitlements and optimise your asset allocation."
        intent={{ need: "retirement", context: ["age_pension", "assets_test", "centrelink"] }}
        source="retirement_age_pension_assets_test"
        ctaLabel="Find a retirement planner"
        className="py-12 bg-amber-50 border-t border-amber-200"
      />

      {/* ── Related guides ──────────────────────────────────────────────── */}
      <section className="py-8 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-xl font-extrabold text-slate-900 mb-4">Related guides</h2>
          <div className="flex flex-wrap gap-3">
            {(
              [
                ["/retirement/age-pension", "Age Pension overview"],
                ["/retirement/income-test", "Income test & deeming"],
                ["/retirement/deeming-rates", "Deeming rates explained"],
                ["/retirement/work-bonus", "Work Bonus scheme"],
                ["/retirement/downsizer-contribution", "Downsizer contribution"],
                ["/retirement/pension-phase", "Pension phase super"],
                ["/retirement/annuities", "Annuities & Centrelink"],
                ["/retirement/annuities-vs-abp", "Annuities vs account-based pension"],
                ["/retirement", "Retirement hub"],
              ] as [string, string][]
            ).map(([href, label]) => (
              <Link
                key={href}
                href={href}
                className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-full text-sm font-semibold text-slate-700 hover:border-amber-300 hover:text-amber-700 transition-colors"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Compliance footer ───────────────────────────────────────────── */}
      <section className="py-8 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <p className="text-[11px] text-slate-500 leading-relaxed">
            <strong>General advice warning.</strong> {GENERAL_ADVICE_WARNING} Age Pension assets test
            thresholds are indexed annually and the rules can change. The thresholds, examples, and
            strategies on this page reflect 2024–25 figures and are general information only — not
            financial, social security, or legal advice. Individual circumstances, including your full
            asset and income position, significantly affect pension entitlements. Always verify current
            thresholds and eligibility at servicesaustralia.gov.au. For a personalised estimate, use
            the Centrelink online estimator or consult a licensed financial adviser before implementing
            any asset restructuring strategy.
          </p>
        </div>
      </section>
    </div>
  );
}
