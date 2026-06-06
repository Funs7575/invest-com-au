import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL, absoluteUrl } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Work Bonus Scheme — Earn While on Age Pension (${CURRENT_YEAR}) | invest.com.au`,
  description: `How the Work Bonus lets Age Pension recipients earn $300/fortnight tax-free from employment, how the $11,800 balance accumulates, worked examples, and interaction with the income test. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Work Bonus Scheme — Age Pension Employment Income (${CURRENT_YEAR})`,
    description: "Age Pension Work Bonus: $300/fortnight exempt, up to $11,800 accumulation, worked examples and income test interaction.",
    url: absoluteUrl("/retirement/work-bonus"),
    images: [{ url: `/api/og?title=${encodeURIComponent("Work Bonus Scheme")}&sub=${encodeURIComponent("$300/fortnight exempt · $11,800 balance · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: absoluteUrl("/retirement/work-bonus") },
};

const QUALIFYING_INCOME = [
  { type: "Wages and salaries", notes: "Employment income from an employer — full-time, part-time, or casual" },
  { type: "Contract employment", notes: "Including labour-hire and temp agency arrangements where you personally perform the work" },
  { type: "Self-employment (personal exertion)", notes: "Sole traders, consultants, and tradespeople who actively provide labour" },
  { type: "Honoraria and director's fees", notes: "Where you are an active director performing real duties" },
];

const NON_QUALIFYING_INCOME = [
  { type: "Investment income", notes: "Dividends, interest, and managed fund distributions are NOT eligible for the Work Bonus" },
  { type: "Rental income", notes: "Rental property income is actual income assessed separately — Work Bonus does not apply" },
  { type: "Deemed income", notes: "Income deemed from financial assets under deeming rules is never reduced by the Work Bonus" },
  { type: "Passive business income", notes: "Income from a business you own but do not personally work in does not qualify" },
  { type: "Super income streams", notes: "Pension phase super payments (ABPs, etc.) are not employment income" },
];

const FAQS = [
  {
    q: "Can I work full-time while on the Age Pension?",
    a: "Yes — there is no restriction on how much you can work while receiving the Age Pension. However, earnings above the Work Bonus threshold ($300/fortnight plus any accumulated balance) are assessed under the income test and will reduce your pension by 50 cents per dollar above the income-free area ($212/fortnight single). At high enough income levels your pension will reduce to nil and eventually be suspended. Importantly, if your pension is suspended (not cancelled) due to income, you can have it reinstated within 26 fortnights without reapplying.",
  },
  {
    q: "Does the Work Bonus apply to rental income or investment income?",
    a: "No. The Work Bonus applies only to employment income and self-employment income from personal exertion. Rental income, dividends, interest, managed fund distributions, and deemed income on financial assets are all counted in full under the income test. Only income earned by personally performing work qualifies.",
  },
  {
    q: "What happens to my Work Bonus balance if I stop receiving the Age Pension?",
    a: "If your Age Pension is cancelled (as opposed to being suspended), your Work Bonus balance resets to nil. If you later requalify for the pension, you start accumulating a new balance from scratch. However, if your pension is merely suspended due to high income, the balance is preserved and resumes accumulating when your income drops and the pension is reinstated — no need to reapply within 26 fortnights.",
  },
  {
    q: "Can my spouse's employment income use my Work Bonus balance?",
    a: "No. Each member of a couple has their own individual Work Bonus balance. Your $300/fortnight exemption and your accumulated balance only apply to your own employment income. If your partner also receives the Age Pension and earns employment income, they have their own separate $300/fortnight exemption and their own separate accumulation balance.",
  },
  {
    q: "How do I report employment income to Services Australia?",
    a: "You must report employment income to Services Australia even if it is below the Work Bonus threshold. Reporting is done via the myGov Centrelink app, Express Plus Centrelink mobile app, or by phone. You report gross employment income paid in each fortnight. Failure to report accurately can result in debts (overpayments). If you are self-employed, you report your net business income (revenue minus business expenses) each fortnight.",
  },
  {
    q: "Does the Work Bonus help with the assets test too?",
    a: "No. The Work Bonus only applies to the income test — specifically, it reduces the amount of employment income that counts toward the income test. It has no effect on the assets test. If you have substantial financial assets assessed under the assets test, the Work Bonus will not help reduce your assets test impact. The two tests operate independently, and the lower result (higher pension reduction) applies.",
  },
];

export default function WorkBonusPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Retirement", url: `${SITE_URL}/retirement` },
    { name: "Work Bonus" },
  ]);
  const faqLd = faqJsonLd(FAQS.map((f) => ({ q: f.q, a: f.a })));

  return (
    <div className="bg-white min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      {faqLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />}

      {/* Hero */}
      <section className="bg-slate-900 text-white py-10 md:py-14">
        <div className="container-custom max-w-4xl">
          <nav aria-label="Breadcrumb" className="text-xs text-slate-400 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-white">Home</Link><span>/</span>
            <Link href="/retirement" className="hover:text-white">Retirement</Link><span>/</span>
            <span className="text-slate-200 font-medium">Work Bonus</span>
          </nav>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-4">
            Work Bonus scheme ({CURRENT_YEAR}): earn income without losing your Age Pension
          </h1>
          <p className="text-lg text-slate-300 leading-relaxed mb-6">
            The Work Bonus lets Age Pension recipients earn up to $300 per fortnight from employment
            without it counting toward the income test. Unused amounts accumulate in a balance worth up
            to $11,800 — a powerful buffer for retirees returning to occasional work.
          </p>
          {/* Key stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Fortnightly exemption", value: "$300", sub: "Per fortnight, per person" },
              { label: "Maximum balance", value: "$11,800", sub: "Accumulated unused amounts" },
              { label: "Annual accumulation", value: "$7,800", sub: "If not working at all" },
              { label: "Pension age required", value: "67+", sub: "Must be on Age Pension" },
            ].map((stat) => (
              <div key={stat.label} className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                <p className="text-xs text-slate-400 mb-1">{stat.label}</p>
                <p className="text-2xl font-extrabold text-white">{stat.value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{stat.sub}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-4">{UPDATED_LABEL} · Figures current for 2024–25; verify at servicesaustralia.gov.au</p>
        </div>
      </section>

      {/* What is the Work Bonus */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">What is the Work Bonus?</h2>
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-6 space-y-3">
            <p className="text-sm text-slate-700 leading-relaxed">
              The <strong className="text-slate-900">Work Bonus</strong> is a concession within the Age
              Pension income test that allows recipients to earn employment or self-employment income
              without it affecting their pension payment. The first <strong>$300 per fortnight</strong> of
              eligible employment income is simply excluded from the income test calculation.
            </p>
            <p className="text-sm text-slate-700 leading-relaxed">
              What makes the scheme particularly powerful is the <strong>accumulation feature</strong>. In
              any fortnight you do not use your full $300 exemption — including when you are not working at
              all — the unused amount accrues in a Work Bonus balance. This balance can be drawn down later
              to offset future employment earnings above the $300 threshold, up to a maximum balance of
              $11,800.
            </p>
            <p className="text-sm text-slate-700 leading-relaxed">
              The Work Bonus is available to all Age Pension recipients (and recipients of certain DVA
              payments) who are of Age Pension age. It applies only to income from personal exertion —
              investment income, rental income, and deemed income on financial assets are not eligible.
            </p>
          </div>
        </div>
      </section>

      {/* How the balance accumulates */}
      <section className="py-10 border-b border-slate-100 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">How the Work Bonus balance accumulates</h2>
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
            <p className="text-sm text-slate-700 leading-relaxed">
              Even when you are not working, your Work Bonus accrues at $300 per fortnight — equivalent to
              $7,800 per year. The balance accumulates silently in the background until you start earning
              employment income. Once you begin working, the accumulated balance is drawn down first before
              the income test applies to any earnings above $300/fortnight.
            </p>
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-xs font-bold text-emerald-800 uppercase tracking-wide mb-2">Accumulation rate</p>
                <p className="text-2xl font-extrabold text-emerald-900 mb-1">$300</p>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  Per fortnight — even fortnights with zero employment income. Accumulates automatically;
                  no action required.
                </p>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-2">Maximum balance</p>
                <p className="text-2xl font-extrabold text-amber-900 mb-1">$11,800</p>
                <p className="text-xs text-amber-800 leading-relaxed">
                  Cap applies at all times. Approximately 39.3 fortnights of unused Work Bonus. Balance
                  cannot exceed this cap.
                </p>
              </div>
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <p className="text-xs font-bold text-red-800 uppercase tracking-wide mb-2">Balance reset</p>
                <p className="text-2xl font-extrabold text-red-900 mb-1">Nil</p>
                <p className="text-xs text-red-800 leading-relaxed">
                  Balance resets to zero if the Age Pension is <strong>cancelled</strong>. Suspension
                  (not cancellation) preserves the balance.
                </p>
              </div>
            </div>
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <p className="text-xs font-bold text-blue-800 uppercase tracking-wide mb-2">How draw-down works when you return to work</p>
              <p className="text-sm text-blue-900 leading-relaxed">
                When you earn employment income, the $300/fortnight exemption applies first. Any earnings
                above $300 are then offset against the accumulated balance before the income test kicks in.
                For example: if you earn $500/fortnight, $300 is exempt and the remaining $200 is drawn
                from the accumulated balance — the income test sees zero employment income that fortnight
                until the balance is exhausted.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Worked examples */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Worked examples</h2>

          {/* Example 1 */}
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 mb-6">
            <h3 className="text-base font-extrabold text-slate-900 mb-1">
              Example 1 — Occasional casual work (no accumulated balance)
            </h3>
            <p className="text-xs text-slate-600 mb-4">
              Single pensioner. Full Age Pension: $1,171/fortnight. Earning $400/fortnight from casual
              retail work. No Work Bonus balance accumulated.
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center border-b border-amber-200 pb-2">
                <span className="text-slate-700">Gross employment income</span>
                <span className="font-bold text-slate-900">$400/fortnight</span>
              </div>
              <div className="flex justify-between items-center border-b border-amber-200 pb-2">
                <span className="text-slate-700">Less: Work Bonus exemption</span>
                <span className="font-bold text-emerald-700">−$300/fortnight</span>
              </div>
              <div className="flex justify-between items-center border-b border-amber-200 pb-2">
                <span className="text-slate-700">Employment income counted toward income test</span>
                <span className="font-bold text-slate-900">$100/fortnight</span>
              </div>
              <div className="flex justify-between items-center border-b border-amber-200 pb-2">
                <span className="text-slate-700">Less: income-free area (single)</span>
                <span className="font-bold text-slate-900">−$212/fortnight</span>
              </div>
              <div className="flex justify-between items-center border-b border-amber-200 pb-2">
                <span className="text-slate-700 text-xs italic">
                  ($100 assessed income is below the $212 free area — income test produces no reduction here)
                </span>
                <span className="font-bold text-emerald-700">$0 reduction</span>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="font-bold text-slate-900">Net Age Pension (unchanged)</span>
                <span className="font-bold text-emerald-700">$1,171/fortnight</span>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="font-bold text-slate-900">Total income (pension + work)</span>
                <span className="font-bold text-slate-900">$1,571/fortnight</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-3">
              Because the $100 assessable employment income sits below the $212/fortnight income-free area,
              the pension is fully maintained. If the pensioner also had other income (e.g. rental or
              deemed income) pushing total assessable income above $212, the reduction would apply.
            </p>
          </div>

          {/* Example 2 */}
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
            <h3 className="text-base font-extrabold text-slate-900 mb-1">
              Example 2 — Using an accumulated balance for a short contract
            </h3>
            <p className="text-xs text-slate-600 mb-4">
              Single pensioner. Retired for 12 months (not working). Accumulated $7,800 Work Bonus balance.
              Takes a 6-week consulting contract earning $2,500/fortnight.
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center border-b border-blue-200 pb-2">
                <span className="font-semibold text-slate-800">Fortnight 1</span>
                <span></span>
              </div>
              <div className="flex justify-between items-center border-b border-blue-200 pb-2">
                <span className="text-slate-700">Gross employment income</span>
                <span className="font-bold text-slate-900">$2,500</span>
              </div>
              <div className="flex justify-between items-center border-b border-blue-200 pb-2">
                <span className="text-slate-700">Less: ongoing Work Bonus exemption</span>
                <span className="font-bold text-emerald-700">−$300</span>
              </div>
              <div className="flex justify-between items-center border-b border-blue-200 pb-2">
                <span className="text-slate-700">Excess above $300 → drawn from $7,800 balance</span>
                <span className="font-bold text-emerald-700">−$2,200 (from balance)</span>
              </div>
              <div className="flex justify-between items-center border-b border-blue-200 pb-2">
                <span className="text-slate-700">Employment income counted toward income test</span>
                <span className="font-bold text-emerald-700">$0</span>
              </div>
              <div className="flex justify-between items-center border-b border-blue-200 pb-2">
                <span className="font-bold text-slate-900">Remaining Work Bonus balance</span>
                <span className="font-bold text-slate-900">$5,600 (= $7,800 − $2,200)</span>
              </div>
              <div className="flex justify-between items-center border-b border-blue-200 pb-2 mt-2">
                <span className="font-semibold text-slate-800">
                  Fortnights 2 and 3 (similar): balance continues drawing down
                </span>
                <span></span>
              </div>
              <div className="flex justify-between items-center border-b border-blue-200 pb-2">
                <span className="text-slate-700">After fortnight 3 (approx): balance exhausted at $3,400</span>
                <span className="font-bold text-red-600">$0 balance remaining</span>
              </div>
              <div className="flex justify-between items-center border-b border-blue-200 pb-2">
                <span className="font-semibold text-slate-800">
                  Fortnight 4 onwards: income test now applies to excess
                </span>
                <span></span>
              </div>
              <div className="flex justify-between items-center border-b border-blue-200 pb-2">
                <span className="text-slate-700">Income counted: $2,500 − $300 Work Bonus = $2,200</span>
                <span className="font-bold text-slate-900">$2,200 assessed</span>
              </div>
              <div className="flex justify-between items-center border-b border-blue-200 pb-2">
                <span className="text-slate-700">Less income-free area (single): $212</span>
                <span className="font-bold text-slate-900">$1,988 excess</span>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="font-bold text-slate-900">Income test reduction: $1,988 × 50 cents</span>
                <span className="font-bold text-red-600">−$994/fortnight pension</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-3">
              The accumulated balance provided full pension protection for approximately 3.5 fortnights
              of high contract income. Once exhausted, the income test applied normally. The contract
              still boosted total income significantly, and the pension resumes in full once the contract ends.
            </p>
          </div>
        </div>
      </section>

      {/* Who qualifies */}
      <section className="py-10 border-b border-slate-100 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-5">Who qualifies for the Work Bonus?</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { title: "Age", body: "Must be of Age Pension age (67 or older)" },
              { title: "Receiving pension", body: "Must be receiving Age Pension or a qualifying DVA payment (e.g. Service Pension)" },
              { title: "Personal exertion income", body: "Income must be from employment or self-employment where you personally perform the work" },
              { title: "Australian residency", body: "Standard Age Pension residency rules apply; overseas absences may affect both pension and Work Bonus" },
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">{item.title}</p>
                <p className="text-sm text-slate-700 leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Qualifying vs non-qualifying income */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Qualifying */}
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 mb-4">Income that qualifies</h2>
              <div className="space-y-3">
                {QUALIFYING_INCOME.map((item, i) => (
                  <div key={i} className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                    <p className="text-sm font-bold text-emerald-900">{item.type}</p>
                    <p className="text-xs text-emerald-800 leading-relaxed mt-0.5">{item.notes}</p>
                  </div>
                ))}
              </div>
            </div>
            {/* Non-qualifying */}
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 mb-4">Income that does NOT qualify</h2>
              <div className="space-y-3">
                {NON_QUALIFYING_INCOME.map((item, i) => (
                  <div key={i} className="rounded-lg border border-red-200 bg-red-50 p-3">
                    <p className="text-sm font-bold text-red-900">{item.type}</p>
                    <p className="text-xs text-red-800 leading-relaxed mt-0.5">{item.notes}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interaction with income test — full step-by-step */}
      <section className="py-10 border-b border-slate-100 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">
            How the income test calculation works with Work Bonus
          </h2>
          <p className="text-sm text-slate-600 mb-5">
            The Work Bonus reduces the amount of employment income that enters the income test — it does
            not increase the income-free area itself. The full calculation is:
          </p>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-900">
                  <th scope="col" className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide w-8">Step</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide">What you calculate</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {[
                  { step: "1", action: "Gross employment income (fortnight)", notes: "All wages, salary, or self-employment income from personal exertion before tax" },
                  { step: "2", action: "Subtract Work Bonus ($300 + any accumulated balance)", notes: "Apply the $300/fortnight first, then draw from accumulated balance for any excess above $300" },
                  { step: "3", action: "Add all other income", notes: "Rental income (net), deemed income on financial assets, any other assessable income" },
                  { step: "4", action: "Subtract income-free area ($212/fortnight single; $372/fortnight couple combined)", notes: "If total is below the free area, stop — no pension reduction from income test" },
                  { step: "5", action: "Multiply excess by 50 cents", notes: "This is the income test reduction to your fortnightly pension payment" },
                  { step: "6", action: "Maximum pension minus reduction = income-test pension amount", notes: "The lower of the income-test result and the assets-test result determines your actual pension" },
                ].map((row) => (
                  <tr key={row.step} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-extrabold text-amber-600 text-center">{row.step}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900 text-sm">{row.action}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{row.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-1">Key distinction</p>
            <p className="text-sm text-amber-900 leading-relaxed">
              The Work Bonus reduces <strong>employment income assessed</strong> — not the income-free area.
              A pensioner with $300 assessed employment income (after Work Bonus) who also has $100 in
              rental income has $400 total assessed income, compared with the $212 free area — so the
              income test does bite. Work Bonus and the income-free area are two separate levers working
              together.
            </p>
          </div>
        </div>
      </section>

      {/* Impact on other entitlements */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">Impact on other entitlements</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                Commonwealth Seniors Health Card (CSHC)
              </p>
              <p className="text-sm text-slate-700 leading-relaxed">
                The Work Bonus does <strong>not</strong> apply to the CSHC income test. If you hold a
                CSHC rather than the Age Pension (because your assets are too high), all employment income
                is counted in full for the CSHC threshold assessment.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                Pension suspension vs cancellation
              </p>
              <p className="text-sm text-slate-700 leading-relaxed">
                If your pension reduces to nil due to high employment income, it enters a{" "}
                <strong>suspended</strong> state — not cancelled. You can have it reinstated within
                26 fortnights without reapplying, and your Work Bonus balance is preserved. After
                26 fortnights of nil pension, the pension is cancelled and the balance resets.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                Concession cards
              </p>
              <p className="text-sm text-slate-700 leading-relaxed">
                Pensioner Concession Card (PCC) and other concessions attached to the Age Pension may
                be retained for a period even if the pension payment is suspended. Check with Services
                Australia about card retention rules in your specific situation.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                DVA payments
              </p>
              <p className="text-sm text-slate-700 leading-relaxed">
                Recipients of qualifying DVA payments (such as Service Pension or Income Support
                Supplement) may also be eligible for the Work Bonus under equivalent DVA rules.
                The mechanics are the same; verify with DVA directly for your payment type.
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

      {/* Related guides */}
      <section className="py-8 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-xl font-extrabold text-slate-900 mb-4">Related guides</h2>
          <div className="flex flex-wrap gap-3">
            {([
              ["/retirement/age-pension", "Age Pension overview"],
              ["/retirement/deeming-rates", "Deeming rates explained"],
              ["/retirement/income-test", "Income test in detail"],
              ["/retirement/age-pension-assets-test", "Assets test in detail"],
              ["/retirement", "Retirement hub"],
            ] as [string, string][]).map(([href, label]) => (
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
            <strong>General advice warning.</strong> {GENERAL_ADVICE_WARNING} Work Bonus thresholds,
            accumulation caps, and income-test rules are subject to change — always verify current
            figures at servicesaustralia.gov.au. Individual circumstances vary significantly; the
            worked examples on this page are illustrative only. This page is general information
            only; it is not financial, social security, or legal advice.
          </p>
        </div>
      </section>
    </div>
  );
}
