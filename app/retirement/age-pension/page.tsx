import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL, absoluteUrl } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Age Pension Australia — Eligibility, Rates & Assets Test (${CURRENT_YEAR}) | invest.com.au`,
  description: `Australian Age Pension guide: eligibility age (67), 2024–25 payment rates (single $1,144.40/fortnight, couple $862.60 each), assets test thresholds, income test, deeming, Work Bonus, super interaction and worked examples. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Age Pension Australia — Eligibility, Rates & Assets Test (${CURRENT_YEAR})`,
    description:
      "Age Pension eligibility, 2024–25 payment rates, assets test thresholds, income test, deeming, Work Bonus, super interaction, CSHC and 3 worked examples.",
    url: absoluteUrl("/retirement/age-pension"),
    images: [
      {
        url: `/api/og?title=${encodeURIComponent("Age Pension Australia")}&sub=${encodeURIComponent("Eligibility · Rates · Assets Test · " + CURRENT_YEAR)}`,
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: absoluteUrl("/retirement/age-pension") },
};

const PAYMENT_RATES = [
  {
    type: "Single person",
    base: "$933.40/fortnight",
    supplement: "$83.60",
    energy: "$14.10",
    max: "$1,144.40/fortnight",
  },
  {
    type: "Couple (each)",
    base: "$703.20/fortnight",
    supplement: "$63.00",
    energy: "$10.60",
    max: "$862.60/fortnight",
  },
  {
    type: "Couple (combined)",
    base: "$1,406.40/fortnight",
    supplement: "$126.00",
    energy: "$21.20",
    max: "$1,725.20/fortnight",
  },
];

const ASSETS_THRESHOLDS = [
  {
    situation: "Single (homeowner)",
    full: "$301,750",
    cutoff: "$674,000",
  },
  {
    situation: "Single (non-homeowner)",
    full: "$543,750",
    cutoff: "$916,000",
  },
  {
    situation: "Couple (homeowners, combined)",
    full: "$451,500",
    cutoff: "$1,012,500",
  },
  {
    situation: "Couple (non-homeowners, combined)",
    full: "$693,500",
    cutoff: "$1,254,500",
  },
];

const FAQS = [
  {
    q: "What is the Age Pension eligibility age in Australia?",
    a: "The qualifying age is 67 for anyone born on or after 1 January 1957. The phased increases from age 65 are now complete. You must also be an Australian resident for at least 10 years (with 5 consecutive years), and satisfy both the assets and income tests. Australian citizens and permanent residents qualify. New Zealand citizens on special category visas have different rules.",
  },
  {
    q: "Does my family home count in the assets test?",
    a: "No. Your principal place of residence is fully exempt from the assets test regardless of its value — a $3 million Sydney home and a $200,000 regional flat are treated the same way. However, if you sell your home, the proceeds temporarily become assessable assets. Downsizer contribution rules and a 24-month asset-test exemption for sale proceeds exist in certain circumstances; seek advice specific to your situation.",
  },
  {
    q: "How does superannuation interact with the Age Pension?",
    a: "Super in the accumulation phase is NOT assessed for the assets test until you reach Age Pension age. Once you reach pension age (67), any remaining accumulation balance becomes fully assessable. If your super is already in pension phase (account-based pension, or ABP), the full account balance is assessed under the assets test AND deemed under the income test — unless your ABP started before 1 January 2015 and has grandfathered status, in which case only actual payments are assessed for the income test.",
  },
  {
    q: "What is the difference between the assets test and the income test?",
    a: "Both tests are applied independently and the one that produces the lower pension amount wins. The assets test looks at what you own: superannuation balances (from pension age), shares, cash, investment properties, vehicles, and other non-exempt assets. The income test looks at what you earn: actual income (rent, work) plus deemed income calculated on financial assets at the deeming rates. There is no way to choose which test applies — Services Australia applies both and pays the lower result.",
  },
  {
    q: "Can I travel overseas and still receive the Age Pension?",
    a: "Yes, for up to 26 weeks. If you are absent from Australia for more than 26 weeks, portability rules apply: the pension may continue at a reduced rate based on your period of Australian residence, and after 2 years overseas it may be reassessed using only your working-life residence for rate calculation. Brief trips under 6 weeks have no impact. Always notify Services Australia before an extended trip.",
  },
  {
    q: "What is the Commonwealth Seniors Health Card and who qualifies?",
    a: "The CSHC is for self-funded retirees of Age Pension age who do not qualify for the Age Pension (usually because their assets exceed the pension cut-off). It provides access to cheaper PBS medicines, bulk-billed GP appointments in many practices, and various state and territory concessions. The income test for CSHC in 2024-25 is $99,025/year (single) and $158,440/year (couple combined). Unlike the Age Pension, the CSHC has no assets test — but deemed income on financial assets counts toward the income threshold.",
  },
];

export default function AgePensionPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Retirement", url: `${SITE_URL}/retirement` },
    { name: "Age Pension" },
  ]);
  const faqLd = faqJsonLd(FAQS.map((f) => ({ q: f.q, a: f.a })));

  return (
    <div className="bg-white min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      {faqLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      )}

      {/* Hero */}
      <section className="bg-slate-900 text-white py-10 md:py-14">
        <div className="container-custom max-w-4xl">
          <nav aria-label="Breadcrumb" className="text-xs text-slate-400 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-white">Home</Link>
            <span>/</span>
            <Link href="/retirement" className="hover:text-white">Retirement</Link>
            <span>/</span>
            <span className="text-slate-200 font-medium">Age Pension</span>
          </nav>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-4">
            Age Pension Australia: eligibility, rates &amp; assets test ({CURRENT_YEAR})
          </h1>
          <p className="text-lg text-slate-300 leading-relaxed mb-6">
            The Australian Age Pension pays up to $1,144.40/fortnight (single) or $1,725.20/fortnight
            (couple combined) in 2024–25. Qualifying requires being 67 or older, meeting a 10-year
            residency rule, and passing both the assets test and income test. Most retirees are eligible
            for at least a part-pension.
          </p>
          {/* Key stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Eligibility age", value: "67", sub: "Born on or after 1 Jan 1957" },
              { label: "Max rate (single)", value: "$1,144", sub: "Per fortnight (2024–25)" },
              { label: "Max rate (couple)", value: "$1,725", sub: "Combined per fortnight" },
              { label: "Assets taper", value: "$3/1k", sub: "Per $1,000 over threshold" },
            ].map((stat) => (
              <div key={stat.label} className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                <p className="text-xs text-slate-400 mb-1">{stat.label}</p>
                <p className="text-2xl font-extrabold text-white">{stat.value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{stat.sub}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-4">
            {UPDATED_LABEL} · Rates and thresholds for 2024–25; indexed March and September · Verify at servicesaustralia.gov.au
          </p>
        </div>
      </section>

      {/* What is the Age Pension */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">What is the Age Pension?</h2>
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-6 space-y-3">
            <p className="text-sm text-slate-700 leading-relaxed">
              The <strong className="text-slate-900">Age Pension</strong> is a fortnightly income support
              payment funded by the federal government and administered by Services Australia (Centrelink).
              It is designed to provide a safety net for older Australians who do not have sufficient
              assets or income to fund their own retirement.
            </p>
            <p className="text-sm text-slate-700 leading-relaxed">
              Unlike a defined-benefit scheme, the Age Pension is{" "}
              <strong className="text-slate-900">means-tested</strong> — both your assets and your income
              are assessed. The pension you receive is the lower of what the assets test and income test
              each produce. Many retirees receive a{" "}
              <strong className="text-slate-900">part-pension</strong>: a reduced amount that tapers as
              assets or income rise toward the relevant cut-off.
            </p>
            <p className="text-sm text-slate-700 leading-relaxed">
              As well as the base rate, recipients receive the{" "}
              <strong className="text-slate-900">Pension Supplement</strong> (covering phone, utilities,
              and pharmaceutical costs) and the{" "}
              <strong className="text-slate-900">Energy Supplement</strong>. Most also qualify for the{" "}
              <strong className="text-slate-900">Pensioner Concession Card (PCC)</strong>, which provides
              cheaper PBS medicines, free or heavily discounted public transport in most states, and
              discounts on rates, utilities, and motor vehicle registration.
            </p>
          </div>
        </div>
      </section>

      {/* Payment rates */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Payment rates (2024–25)</h2>
          <p className="text-sm text-slate-500 mb-5">
            Rates are indexed to the higher of CPI or the Pensioner and Beneficiary Living Cost Index
            (PBLCI), reviewed each March and September.
          </p>
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-900">
                  <th className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide">
                    Situation
                  </th>
                  <th className="text-left px-3 py-3 text-xs font-bold text-white uppercase tracking-wide">
                    Base rate
                  </th>
                  <th className="text-left px-3 py-3 text-xs font-bold text-white uppercase tracking-wide">
                    Pension Supplement
                  </th>
                  <th className="text-left px-3 py-3 text-xs font-bold text-white uppercase tracking-wide">
                    Energy Supplement
                  </th>
                  <th className="text-left px-3 py-3 text-xs font-bold text-white uppercase tracking-wide">
                    Maximum total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {PAYMENT_RATES.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-900">{row.type}</td>
                    <td className="px-3 py-3 text-slate-700">{row.base}</td>
                    <td className="px-3 py-3 text-slate-600">{row.supplement}</td>
                    <td className="px-3 py-3 text-slate-600">{row.energy}</td>
                    <td className="px-3 py-3 text-emerald-700 font-extrabold">{row.max}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            All amounts are per fortnight. Pension Supplement minimum amount is paid if you are overseas for
            more than 6 weeks. Verify current rates at servicesaustralia.gov.au.
          </p>
        </div>
      </section>

      {/* Eligibility */}
      <section className="py-10 border-b border-slate-100 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-5">Eligibility requirements</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              {
                title: "Age — 67 or older",
                body: "You must have reached Age Pension age, currently 67, applicable to anyone born on or after 1 January 1957. The phased increase from 65 is complete.",
              },
              {
                title: "Australian residency — 10 years",
                body: "You must be an Australian resident and have lived in Australia for at least 10 years total, including one period of at least 5 consecutive years. Some international social security agreements can help count overseas periods.",
              },
              {
                title: "Assets test",
                body: "Your assessable assets must be below the cut-off threshold for your situation. The principal home is excluded. Assets above the lower threshold reduce the pension by $3/fortnight per $1,000.",
              },
              {
                title: "Income test",
                body: "Your income (actual plus deemed) must be below the income cut-off. The pension reduces by 50 cents for every dollar of income above the income-free area.",
              },
              {
                title: "Residency status",
                body: "Australian citizens, permanent residents, and some temporary protection visa holders qualify. New Zealand citizens on special category visas have a different set of rules — check with Services Australia.",
              },
              {
                title: "Not in gaol or detention",
                body: "The Age Pension is generally not payable during periods of imprisonment or psychiatric detention, though rules vary for remand versus sentenced periods.",
              },
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">{item.title}</p>
                <p className="text-sm text-slate-700 leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Assets test */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">The assets test</h2>
          <p className="text-sm text-slate-500 mb-5">
            Assets above the full-pension threshold reduce the pension by{" "}
            <strong className="text-slate-700">$3 per fortnight for every $1,000</strong> of excess.
            Above the cut-off, the pension is nil.
          </p>

          <div className="overflow-x-auto rounded-xl border border-slate-200 mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-900">
                  <th className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide">
                    Situation
                  </th>
                  <th className="text-left px-3 py-3 text-xs font-bold text-white uppercase tracking-wide">
                    Full pension below
                  </th>
                  <th className="text-left px-3 py-3 text-xs font-bold text-white uppercase tracking-wide">
                    Cut-off (nil pension above)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {ASSETS_THRESHOLDS.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-900 text-xs">{row.situation}</td>
                    <td className="px-3 py-3 text-emerald-700 font-bold text-xs">{row.full}</td>
                    <td className="px-3 py-3 text-red-600 font-bold text-xs">{row.cutoff}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Homeowner vs non-homeowner */}
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 mb-6">
            <h3 className="text-base font-extrabold text-slate-900 mb-3">
              Homeowner vs non-homeowner: why it matters
            </h3>
            <p className="text-sm text-slate-700 leading-relaxed mb-3">
              Services Australia classifies you as a <strong>homeowner</strong> if you own or have a
              life interest in the home where you live — including those in retirement villages with
              a resident-owned unit scheme. The lower homeowner threshold reflects that your home
              is an exempt asset (not counted) while a non-homeowner must hold their housing wealth
              in cash or investments which are counted.
            </p>
            <p className="text-sm text-slate-700 leading-relaxed">
              The difference in full-pension thresholds is <strong>$242,000</strong> — the estimated
              value of shelter that an owner-occupier receives that a renter must fund from assessable
              assets. If you rent and hold $300,000 in savings, you may still qualify for a full
              pension (non-homeowner threshold $543,750). If you own your home and hold the same
              $300,000, the homeowner threshold ($301,750) means you are barely above the full-pension
              line.
            </p>
          </div>

          {/* What counts */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 mb-3 uppercase tracking-wide">
                Assessable assets (counted)
              </h3>
              <div className="space-y-2">
                {[
                  "Superannuation (from Age Pension age)",
                  "Account-based pensions and allocated pensions",
                  "Bank accounts, term deposits, and cash",
                  "Shares, ETFs, and managed funds",
                  "Investment properties (at market value)",
                  "Vehicles, caravans, and boats",
                  "Business assets (net value)",
                  "Life insurance surrender value",
                  "Loans made to others",
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <span className="text-red-500 font-bold mt-0.5 shrink-0">–</span>
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 mb-3 uppercase tracking-wide">
                Exempt assets (not counted)
              </h3>
              <div className="space-y-2">
                {[
                  "Principal home (regardless of value)",
                  "Prepaid funeral expenses (up to $13,500)",
                  "Accommodation bonds in aged care",
                  "Compensation payments (structured settlements)",
                  "Some rural property if it meets primary production rules",
                  "Superannuation of a partner below Age Pension age",
                  "Aids and personal care equipment",
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <span className="text-emerald-600 font-bold mt-0.5 shrink-0">+</span>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Income test */}
      <section className="py-10 border-b border-slate-100 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">The income test</h2>
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 mb-6">
            <p className="text-sm text-slate-700 leading-relaxed">
              Under the income test, the pension reduces by{" "}
              <strong className="text-slate-900">50 cents for every dollar</strong> of assessable income
              above the income-free area. Assessable income includes actual income (rent, wages,
              business profit) plus <em>deemed income</em> on financial assets.
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                  Income-free area (2024–25)
                </p>
                <p className="text-sm text-slate-700">
                  <strong>$212/fortnight</strong> — single
                </p>
                <p className="text-sm text-slate-700 mt-1">
                  <strong>$372/fortnight</strong> — couple (combined)
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                  Taper rate
                </p>
                <p className="text-sm text-slate-700">
                  <strong>50 cents</strong> reduction per $1 of income above the free area
                </p>
                <p className="text-sm text-slate-500 mt-1 text-xs">
                  (Same rate for singles and couples)
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">
              <strong className="text-slate-900">Deeming</strong> applies to financial assets: instead
              of counting actual investment returns, Services Australia applies a standard rate
              (0.25% on the first $62,600 for singles / $103,800 for couples combined; 2.25% above
              that). The deemed figure is then tested against the income-free area.{" "}
              <Link
                href="/retirement/income-test"
                className="text-amber-700 underline hover:text-amber-900"
              >
                Full income test guide &rarr;
              </Link>
            </p>
          </div>

          {/* Work Bonus callout */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
            <h3 className="text-base font-extrabold text-slate-900 mb-2">Work Bonus</h3>
            <p className="text-sm text-slate-700 leading-relaxed">
              Pensioners who work can exclude the first{" "}
              <strong className="text-slate-900">$300/fortnight</strong> of employment income from the
              income test. Unused Work Bonus accumulates up to a maximum balance of $11,800 — providing
              a substantial buffer for retirees who return to occasional work.{" "}
              <Link
                href="/retirement/work-bonus"
                className="text-amber-700 underline hover:text-amber-900"
              >
                Full Work Bonus guide &rarr;
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* Super interaction */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">
            How superannuation interacts with the Age Pension
          </h2>
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                Accumulation phase (under Age Pension age)
              </p>
              <p className="text-sm text-slate-700 leading-relaxed">
                Super held in the <strong>accumulation phase</strong> by a person who has{" "}
                <em>not yet</em> reached Age Pension age is{" "}
                <strong className="text-slate-900">not assessed</strong> under either the assets test or
                the income test. This means that if one member of a couple is still below 67, their super
                balance is completely invisible to Centrelink — a significant planning lever.
              </p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
              <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-2">
                From Age Pension age onwards
              </p>
              <p className="text-sm text-slate-700 leading-relaxed mb-3">
                Once you reach Age Pension age, any remaining accumulation balance becomes{" "}
                <strong className="text-slate-900">fully assessable</strong> under the assets test. If you
                convert to a pension phase (account-based pension), the full ABP balance is also subject
                to <strong>deeming</strong> under the income test for pensions started on or after
                1 January 2015.
              </p>
              <p className="text-sm text-slate-700 leading-relaxed">
                Reaching 67 with a large accumulation balance will therefore affect both tests
                simultaneously — this is why many advisers recommend converting super to pension phase
                before reaching pension age, in a structured way.
              </p>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
              <p className="text-xs font-bold text-blue-800 uppercase tracking-wide mb-2">
                Pre-2015 ABP grandfathering
              </p>
              <p className="text-sm text-slate-700 leading-relaxed">
                Account-based pensions (ABPs) that commenced before{" "}
                <strong className="text-slate-900">1 January 2015</strong> retain a{" "}
                <em>grandfathered</em> status: only the actual pension payments received are assessed
                for the income test (not the full account balance under deeming). This is typically more
                favourable, especially for large balances drawing minimum drawdowns. However,
                grandfathering is <strong>permanently and irreversibly lost</strong> if you switch super
                funds, roll over, or otherwise restructure the ABP — so never alter a pre-2015 ABP
                without licensed financial advice.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Downsizer contribution */}
      <section className="py-10 border-b border-slate-100 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">
            Downsizer contributions and pension strategy
          </h2>
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <p className="text-sm text-slate-700 leading-relaxed">
              If you sell a home you have owned for 10 or more years, you can make a{" "}
              <strong className="text-slate-900">downsizer contribution</strong> of up to $300,000 per
              person ($600,000 per couple) into superannuation from the sale proceeds. You must be 55 or
              older (from 1 January 2023).
            </p>
            <p className="text-sm text-slate-700 leading-relaxed">
              The immediate Age Pension impact depends on timing and phase:{" "}
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                  Before Age Pension age
                </p>
                <p className="text-sm text-slate-700 leading-relaxed">
                  Contributions sitting in super accumulation phase are not assessed — the proceeds are
                  effectively sheltered until the person reaches 67.
                </p>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-2">
                  After Age Pension age
                </p>
                <p className="text-sm text-slate-700 leading-relaxed">
                  Super is assessable at pension age, so downsizer contributions going into an assessed
                  super balance will likely reduce the pension. The assets-test exemption previously
                  given to the home is replaced by assessable super.
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">
              <Link
                href="/retirement/downsizer-contribution"
                className="text-amber-700 underline hover:text-amber-900"
              >
                Downsizer contribution strategy guide &rarr;
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* Pensioner Concession Card and CSHC */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-5">
            Pensioner Concession Card &amp; Commonwealth Seniors Health Card
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
              <p className="text-xs font-bold text-emerald-800 uppercase tracking-wide mb-2">
                Pensioner Concession Card (PCC)
              </p>
              <p className="text-sm text-slate-700 leading-relaxed mb-3">
                Automatically issued to Age Pension recipients. Benefits include:
              </p>
              <ul className="space-y-1.5">
                {[
                  "Cheaper medicines on the Pharmaceutical Benefits Scheme (PBS)",
                  "Bulk-billed GP visits (at discretion of doctor)",
                  "Free or discounted public transport (most states)",
                  "Discounted council rates and utilities (varies by state)",
                  "Discounted motor vehicle registration",
                  "Reduced hearing services costs",
                ].map((b, i) => (
                  <li key={i} className="text-xs text-slate-700 flex items-start gap-2">
                    <span className="text-emerald-600 shrink-0 mt-0.5">✓</span>
                    {b}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
              <p className="text-xs font-bold text-blue-800 uppercase tracking-wide mb-2">
                Commonwealth Seniors Health Card (CSHC)
              </p>
              <p className="text-sm text-slate-700 leading-relaxed mb-3">
                For self-funded retirees of pension age who don&apos;t qualify for the Age Pension
                because assets exceed cut-offs. No assets test, but income test applies
                ($99,025/year single; $158,440/year couple in 2024-25).
              </p>
              <p className="text-sm text-slate-700 leading-relaxed mb-2">
                Provides cheaper PBS medicines, bulk-billing support, and various concessions — but
                not the full range of transport and rates discounts available to PCC holders.
              </p>
              <p className="text-xs text-slate-500 mt-2">
                Note: deemed income on financial assets counts toward the CSHC income threshold, even
                though there is no assets test.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Overseas travel */}
      <section className="py-10 border-b border-slate-100 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">Overseas travel and portability</h2>
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <p className="text-sm text-slate-700 leading-relaxed">
              You can travel overseas and continue receiving the full Age Pension for up to{" "}
              <strong className="text-slate-900">26 weeks</strong>. During this period, payments
              continue at the same rate (you may lose some supplements depending on the duration).
            </p>
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-xs font-bold text-emerald-800 uppercase tracking-wide mb-1">
                  Under 6 weeks
                </p>
                <p className="text-xs text-emerald-900">
                  No impact. Full pension including supplements continues without any notification
                  requirement in most cases — though it is best practice to advise Services Australia.
                </p>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-1">
                  6 weeks to 26 weeks
                </p>
                <p className="text-xs text-amber-900">
                  The Pension Supplement reduces to the minimum rate. Energy Supplement is not payable
                  after 6 weeks overseas. Base rate continues in full for up to 26 weeks.
                </p>
              </div>
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <p className="text-xs font-bold text-red-800 uppercase tracking-wide mb-1">
                  Over 26 weeks
                </p>
                <p className="text-xs text-red-900">
                  Portability rules apply. Rate may be recalculated based on Australian working-life
                  residence. Some international social security agreements modify these rules.
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-500 text-xs">
              Always notify Services Australia before a planned absence of more than 4 weeks. Failing
              to notify can create overpayment debts.
            </p>
          </div>
        </div>
      </section>

      {/* Worked examples */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Worked examples</h2>

          {/* Example 1 — single $400k super */}
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 mb-6">
            <h3 className="text-base font-extrabold text-slate-900 mb-1">
              Example 1 — Single person, $400,000 in super (pension phase)
            </h3>
            <p className="text-xs text-slate-600 mb-4">
              Single homeowner, age 68, owns home outright, $400,000 in an account-based pension
              (started 2018 — post-2015, so fully deemed). No other assessable assets.
            </p>
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">Assets test</p>
            <div className="space-y-1.5 text-sm mb-4">
              <div className="flex justify-between items-center border-b border-amber-200 pb-1.5">
                <span className="text-slate-700">ABP balance</span>
                <span className="font-bold text-slate-900">$400,000</span>
              </div>
              <div className="flex justify-between items-center border-b border-amber-200 pb-1.5">
                <span className="text-slate-700">Single homeowner full-pension threshold</span>
                <span className="font-bold text-slate-900">$301,750</span>
              </div>
              <div className="flex justify-between items-center border-b border-amber-200 pb-1.5">
                <span className="text-slate-700">Excess above threshold</span>
                <span className="font-bold text-slate-900">$98,250</span>
              </div>
              <div className="flex justify-between items-center pb-1.5">
                <span className="text-slate-700">Assets test reduction ($98,250 / $1,000 × $3)</span>
                <span className="font-bold text-red-600">−$294.75/fortnight</span>
              </div>
            </div>
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">Income test (deeming)</p>
            <div className="space-y-1.5 text-sm mb-4">
              <div className="flex justify-between items-center border-b border-amber-200 pb-1.5">
                <span className="text-slate-700">First $62,600 × 0.25%</span>
                <span className="font-bold text-slate-900">$157/year = $6.04/fortnight</span>
              </div>
              <div className="flex justify-between items-center border-b border-amber-200 pb-1.5">
                <span className="text-slate-700">Remaining $337,400 × 2.25%</span>
                <span className="font-bold text-slate-900">$7,592/year = $292.00/fortnight</span>
              </div>
              <div className="flex justify-between items-center border-b border-amber-200 pb-1.5">
                <span className="text-slate-700">Total deemed income</span>
                <span className="font-bold text-slate-900">$298.04/fortnight</span>
              </div>
              <div className="flex justify-between items-center border-b border-amber-200 pb-1.5">
                <span className="text-slate-700">Less income-free area (single)</span>
                <span className="font-bold text-slate-900">−$212.00</span>
              </div>
              <div className="flex justify-between items-center pb-1.5">
                <span className="text-slate-700">Income test reduction ($86.04 × 50c)</span>
                <span className="font-bold text-red-600">−$43.02/fortnight</span>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-amber-300 p-3">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">Result</p>
              <p className="text-sm text-slate-700">
                Assets test produces: $1,144.40 − $294.75 = <strong>$849.65/fortnight</strong>
              </p>
              <p className="text-sm text-slate-700">
                Income test produces: $1,144.40 − $43.02 = <strong>$1,101.38/fortnight</strong>
              </p>
              <p className="text-sm font-extrabold text-emerald-700 mt-2">
                Age Pension payable: $849.65/fortnight (assets test is the binding constraint)
              </p>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Illustrative only. Actual result depends on all assets and income; use the Centrelink
              online estimator for a personalised figure.
            </p>
          </div>

          {/* Example 2 — couple downsizing */}
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 mb-6">
            <h3 className="text-base font-extrabold text-slate-900 mb-1">
              Example 2 — Couple selling the family home to downsize
            </h3>
            <p className="text-xs text-slate-600 mb-4">
              Couple, both 70, sell the family home for $1.4 million. They buy a smaller home for
              $900,000. Net proceeds after purchase: $500,000. Both over 55 — eligible for downsizer.
              Prior to sale: no assessable assets beyond the home (full pension).
            </p>
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <div className="rounded-lg bg-white border border-blue-200 p-3">
                <p className="text-xs font-bold text-slate-700 mb-2">Before downsizing</p>
                <p className="text-xs text-slate-600">Home: exempt — no assessable assets</p>
                <p className="text-xs text-emerald-700 font-bold mt-1">Full pension: $1,725.20/fortnight combined</p>
              </div>
              <div className="rounded-lg bg-white border border-blue-200 p-3">
                <p className="text-xs font-bold text-slate-700 mb-2">After downsizing ($500k proceeds)</p>
                <p className="text-xs text-slate-600">New home: exempt. $500,000 in bank/super: assessable.</p>
                <p className="text-xs text-slate-600 mt-1">Couple homeowner threshold: $451,500</p>
                <p className="text-xs text-slate-600">Excess: $48,500 → reduction: $48.50/fortnight × $3 = $145.50</p>
                <p className="text-xs text-red-600 font-bold mt-1">Pension: ~$1,579/fortnight combined</p>
              </div>
            </div>
            <div className="rounded-lg bg-white border border-amber-300 p-3">
              <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-2">
                Strategy: downsizer contribution
              </p>
              <p className="text-xs text-slate-700">
                If the couple contributes up to $300,000 each (total $600,000) to super as a downsizer
                contribution, those funds remain assessable at pension age. However, if one partner is
                still under 67, their super contribution is not yet assessed — reducing the couple&apos;s
                combined assessable assets. The full pension may be partially or wholly restored depending
                on the amounts involved.
              </p>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Illustrative only. Tax implications, gifting rules, and individual circumstances affect the
              actual outcome — seek licensed financial advice before proceeding.
            </p>
          </div>

          {/* Example 3 — maximising pension */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
            <h3 className="text-base font-extrabold text-slate-900 mb-1">
              Example 3 — Strategies to maximise the Age Pension
            </h3>
            <p className="text-xs text-slate-600 mb-4">
              Couple, both 67, owning their home. Combined assessable assets: $700,000 (currently above
              the $451,500 homeowner threshold, receiving a part-pension).
            </p>
            <div className="space-y-3">
              {[
                {
                  strategy: "Prepay funeral expenses",
                  detail:
                    "Each partner can prepay up to $13,500 in funeral bonds. Combined: $27,000 removed from assessable assets, increasing the pension by ~$81/fortnight.",
                },
                {
                  strategy: "Home improvements",
                  detail:
                    "Money spent on the principal home is not an assessable asset. Renovations, landscaping, or home energy improvements are a legitimate way to convert assessable assets into exempt home equity.",
                },
                {
                  strategy: "Spend down one year before pension age",
                  detail:
                    "Large purchases (car upgrades, home improvements) in the year before pension age can legitimately reduce assessable assets. Once at pension age, any further transfers can trigger gifting rules.",
                },
                {
                  strategy: "Keep super in accumulation if under pension age",
                  detail:
                    "If one partner is still under 67, their super remains non-assessable. Delaying commencement of their pension phase until both are over pension age is sometimes suboptimal — get advice on timing.",
                },
              ].map((item, i) => (
                <div key={i} className="rounded-lg bg-white border border-emerald-200 p-3">
                  <p className="text-sm font-bold text-emerald-900 mb-0.5">{item.strategy}</p>
                  <p className="text-xs text-slate-700 leading-relaxed">{item.detail}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-3">
              These strategies are illustrative. Some have tax, estate planning, or other implications.
              Always seek advice from a licensed financial adviser before implementing strategies to
              maximise the Age Pension.
            </p>
          </div>
        </div>
      </section>

      {/* Gifting rules */}
      <section className="py-10 border-b border-slate-100 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">Gifting rules</h2>
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-3">
            <p className="text-sm text-slate-700 leading-relaxed">
              Attempting to reduce assessable assets by giving money or property to family members is
              subject to strict <strong className="text-slate-900">gifting (deprivation) rules</strong>.
              Any gift above the allowed limits is treated as if you still own the asset for five years.
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-xs font-bold text-emerald-800 uppercase tracking-wide mb-2">
                  Allowed gifting limits
                </p>
                <p className="text-sm text-emerald-900 font-bold">$10,000/financial year</p>
                <p className="text-xs text-emerald-800 mt-1">And no more than $30,000 over any 5-year rolling period.</p>
                <p className="text-xs text-emerald-800 mt-2">
                  Gifts within these limits are not assessed — the assets and income test impact is nil.
                </p>
              </div>
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <p className="text-xs font-bold text-red-800 uppercase tracking-wide mb-2">
                  Excess gifting — deprived assets
                </p>
                <p className="text-sm text-red-900">
                  Gifts above the limits are treated as <em>deprived assets</em>. Centrelink continues to
                  assess both the asset value and the deemed income on the deprived amount for
                  5 years, even though you no longer own it.
                </p>
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
                  <span className="shrink-0 text-slate-400 group-open:rotate-180 transition-transform text-lg leading-none">
                    ▾
                  </span>
                </summary>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Related guides */}
      <section className="py-8 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-xl font-extrabold text-slate-900 mb-4">Related guides</h2>
          <div className="flex flex-wrap gap-3">
            {(
              [
                ["/retirement/age-pension-assets-test", "Assets test in detail"],
                ["/retirement/income-test", "Income test & deeming"],
                ["/retirement/deeming-rates", "Deeming rates explained"],
                ["/retirement/work-bonus", "Work Bonus scheme"],
                ["/retirement/downsizer-contribution", "Downsizer contribution"],
                ["/retirement/pension-phase", "Pension phase super"],
                ["/retirement/annuities", "Annuities & Centrelink"],
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

      {/* Compliance footer */}
      <section className="py-8 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <p className="text-[11px] text-slate-500 leading-relaxed">
            <strong>General advice warning.</strong> {GENERAL_ADVICE_WARNING} Age Pension rates,
            thresholds, and eligibility rules are subject to change — always verify current figures at
            servicesaustralia.gov.au or by contacting Services Australia. The worked examples on this
            page are illustrative only; individual circumstances vary significantly. This page is general
            information only; it is not financial, social security, or legal advice. For personalised
            entitlement estimates, use the Centrelink online estimator or consult a licensed financial
            adviser.
          </p>
        </div>
      </section>
    </div>
  );
}
