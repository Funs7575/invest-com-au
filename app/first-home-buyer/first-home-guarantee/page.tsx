/**
 * First Home Guarantee (FHBG) — comprehensive guide page.
 *
 * Covers the federal scheme (formerly FHLDS), the Family Home Guarantee,
 * and the Regional First Home Buyer Guarantee. Property price caps use
 * the post-October 2025 structure (income caps and place limits removed).
 *
 * Compliance posture: factual/general-information only. No personal advice.
 * GENERAL_ADVICE_WARNING from lib/compliance.ts in the footer.
 */

import type { Metadata } from "next";
import Link from "next/link";
import {
  breadcrumbJsonLd,
  SITE_URL,
  CURRENT_YEAR,
  UPDATED_LABEL,
  absoluteUrl,
} from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

export const revalidate = 86400;

const PAGE_TITLE = `First Home Guarantee (FHBG) ${CURRENT_YEAR}: Complete Guide to Australia's 5% Deposit Scheme`;
const PAGE_DESC = `How the First Home Guarantee lets you buy with a 5% deposit and avoid LMI. Property price caps by state, eligibility rules, how to apply, and how FHBG compares to FHSS, shared equity, and the Family Home Guarantee. ${UPDATED_LABEL}.`;

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESC,
  alternates: { canonical: `${SITE_URL}/first-home-buyer/first-home-guarantee` },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESC,
    url: `${SITE_URL}/first-home-buyer/first-home-guarantee`,
    type: "article",
  },
  twitter: { card: "summary_large_image", title: PAGE_TITLE, description: PAGE_DESC },
};

/* ─── FAQ data ────────────────────────────────────────────────────────────── */

const FAQS = [
  {
    q: "Can I use the First Home Guarantee with the First Home Owner Grant?",
    a: "Yes — you can stack the FHBG with your state or territory's First Home Owner Grant (FHOG), provided you meet the eligibility criteria for both. The FHBG covers the deposit guarantee (avoiding LMI), while the FHOG provides a cash grant for new builds. For example, a Queensland buyer purchasing a new build could receive the $30,000 FHOG on top of the FHBG. Stacking with stamp duty concessions is also generally possible. Each scheme has its own eligibility rules so confirm with your lender and state revenue office.",
  },
  {
    q: "What happens to the government guarantee if my property value falls?",
    a: "The government guarantee sits behind your lender, not behind you personally. If property values fall and you end up in negative equity (owing more than the property is worth), the guarantee does not protect you from that loss. If you default and the lender sells the property for less than the outstanding loan, Housing Australia covers the lender's loss up to the guaranteed amount (the top 15% of the original 20% deposit). You remain responsible for any residual debt above the sale proceeds. The guarantee is designed to protect lenders against LMI risk, not to protect buyers against price falls.",
  },
  {
    q: "Does the FHBG affect how much I can borrow?",
    a: "The guarantee does not change your borrowing capacity. Your lender still assesses your income, expenses, existing debts, and serviceability using standard criteria. The guarantee simply means the lender does not require you to pay Lenders Mortgage Insurance (LMI) on a loan with less than a 20% deposit. You still need to demonstrate you can afford the repayments on the loan amount. Some buyers use the LMI saving to increase their deposit slightly rather than borrowing the full 95%.",
  },
  {
    q: "How do I apply for the First Home Guarantee?",
    a: "You apply through a participating lender, not directly through Housing Australia. Step 1: check you meet the eligibility criteria (Australian citizen or PR, 18+, first home buyer, PPOR intent). Step 2: choose a participating lender from the Housing Australia approved list (Commonwealth Bank, NAB, and 27+ smaller lenders). Step 3: apply for your home loan and indicate you want the FHBG. Step 4: the lender verifies your eligibility and submits the guarantee request to Housing Australia. You do not pay any fee for the guarantee itself.",
  },
  {
    q: "Can I refinance or sell a property bought under the FHBG?",
    a: "Yes, you can sell or refinance a property bought under the FHBG at any time. Once you sell, the guarantee is released. If you refinance before you hold 20% equity (either through repayments or capital growth), you may need to pay LMI at the time of refinancing with a new lender if that lender does not participate in the scheme. Check with your new lender before refinancing. The guarantee does not restrict your ability to rent the property out after you have lived in it as your primary residence initially.",
  },
  {
    q: "What is the difference between the FHBG, Family Home Guarantee, and Regional First Home Buyer Guarantee?",
    a: "All three are administered by Housing Australia and allow buying with a smaller deposit without paying LMI. The First Home Guarantee (FHBG) requires a 5% deposit and is open to all eligible first home buyers. The Family Home Guarantee requires only a 2% deposit and is reserved for single parents or legal guardians with at least one dependent child — you do not have to be a first home buyer. The Regional First Home Buyer Guarantee (RFHBG) requires a 5% deposit and is limited to buyers purchasing in a regional area, with an additional requirement that you have lived in that region or adjacent region for at least 12 of the prior 24 months.",
  },
];

/* ─── Structured data ─────────────────────────────────────────────────────── */

const breadcrumb = breadcrumbJsonLd([
  { name: "Home", url: SITE_URL },
  { name: "First Home Buyer", url: absoluteUrl("/first-home-buyer") },
  { name: "First Home Guarantee", url: absoluteUrl("/first-home-buyer/first-home-guarantee") },
]);

const faqSchema = faqJsonLd(FAQS);

/* ─── Price cap data (post-October 2025 caps) ────────────────────────────── */

const PRICE_CAPS = [
  { state: "NSW", capital: "$1,500,000", regional: "$800,000", notes: "Sydney metro / rest of state" },
  { state: "VIC", capital: "$950,000", regional: "$650,000", notes: "Melbourne metro / rest of state" },
  { state: "QLD", capital: "$1,000,000", regional: "$700,000", notes: "Brisbane metro / rest of state" },
  { state: "WA", capital: "$850,000", regional: "$600,000", notes: "Perth metro / rest of state" },
  { state: "SA", capital: "$900,000", regional: "$500,000", notes: "Adelaide metro / rest of state" },
  { state: "TAS", capital: "$700,000", regional: "$550,000", notes: "Hobart metro / rest of state" },
  { state: "ACT", capital: "$1,000,000", regional: "$1,000,000", notes: "Single cap applies across ACT" },
  { state: "NT", capital: "$600,000", regional: "$600,000", notes: "Single cap applies across NT" },
];

/* ─── Comparison table data ──────────────────────────────────────────────── */

const SCHEME_COMPARISON = [
  {
    scheme: "First Home Guarantee (FHBG)",
    deposit: "5%",
    lmiRequired: "No",
    incomeTest: "None (removed Oct 2025)",
    whoFor: "First home buyers",
    keyLimit: "Property price cap by state",
  },
  {
    scheme: "First Home Super Saver (FHSS)",
    deposit: "Varies",
    lmiRequired: "Depends on LVR",
    incomeTest: "None",
    whoFor: "First home buyers saving via super",
    keyLimit: "$50K max withdrawal ($15K/yr)",
  },
  {
    scheme: "Shared Equity (Help to Buy — federal)",
    deposit: "2%",
    lmiRequired: "No",
    incomeTest: "$90K single / $120K couple",
    whoFor: "Lower-income first home buyers",
    keyLimit: "10,000 places/yr; government owns up to 40%",
  },
  {
    scheme: "Standard 5% deposit (with LMI)",
    deposit: "5%",
    lmiRequired: "Yes",
    incomeTest: "None",
    whoFor: "Any buyer",
    keyLimit: "LMI typically $15K–$25K on $700K property",
  },
];

/* ─── Page component ─────────────────────────────────────────────────────── */

export default function FirstHomeGuaranteePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}

      <main className="bg-white text-slate-900">

        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <section className="bg-slate-900 text-white py-10 md:py-14">
          <div className="container-custom max-w-4xl">
            <nav
              className="flex items-center gap-1.5 text-xs text-slate-400 mb-5"
              aria-label="Breadcrumb"
            >
              <Link href="/" className="hover:text-white">Home</Link>
              <span className="text-slate-600">/</span>
              <Link href="/first-home-buyer" className="hover:text-white">First Home Buyer</Link>
              <span className="text-slate-600">/</span>
              <span className="text-white font-medium">First Home Guarantee</span>
            </nav>

            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-800 rounded-full text-xs font-semibold text-slate-300 mb-4">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
              {UPDATED_LABEL} &mdash; Federal scheme
            </div>

            <h1 className="text-3xl md:text-4xl font-extrabold leading-tight mb-4 max-w-3xl">
              First Home Guarantee (FHBG): Australia&apos;s 5% deposit scheme explained
            </h1>
            <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-3xl mb-6">
              The First Home Guarantee lets eligible buyers purchase a home with as little as a
              5% deposit without paying Lenders Mortgage Insurance (LMI). The federal government
              guarantees the gap so lenders accept a smaller deposit — you borrow the same amount,
              you just don&apos;t pay the insurance premium.
            </p>

            {/* Key stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { value: "5%", label: "Minimum deposit" },
                { value: "No LMI", label: "Typical $15K–$30K saving" },
                { value: "15%", label: "Government guarantees" },
                { value: "No cap", label: "Places per year (from Oct 2025)" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="bg-slate-800 rounded-xl p-4"
                >
                  <p className="text-xl font-extrabold text-white mb-1">{stat.value}</p>
                  <p className="text-xs text-slate-400 leading-tight">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="container-custom max-w-4xl py-10 space-y-14">

          {/* ── How it works ─────────────────────────────────────────── */}
          <section>
            <h2 className="text-2xl font-bold mb-4">How the First Home Guarantee works</h2>
            <p className="text-slate-700 leading-relaxed mb-4">
              When you buy a property with a deposit below 20%, lenders normally require you to
              pay Lenders Mortgage Insurance. LMI protects the lender, not you — and on a
              $700,000 property with a 5% deposit, LMI typically costs $20,000&ndash;$28,000.
            </p>
            <p className="text-slate-700 leading-relaxed mb-4">
              Under the FHBG, Housing Australia (formerly NHFIC) provides a guarantee to the
              participating lender covering the top 15% of the property price. This means the
              lender treats the loan as if you had a 20% deposit even though you only have 5%,
              so no LMI is charged.
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-6">
              <h3 className="font-bold text-slate-900 mb-3">The maths at a glance</h3>
              <ul className="space-y-2 text-sm text-slate-700">
                <li className="flex gap-2">
                  <span className="font-semibold text-slate-500 w-36 shrink-0">Property price:</span>
                  <span>$700,000</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold text-slate-500 w-36 shrink-0">Your deposit (5%):</span>
                  <span>$35,000</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold text-slate-500 w-36 shrink-0">Loan amount (95%):</span>
                  <span>$665,000</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold text-slate-500 w-36 shrink-0">Gov. guarantee (15%):</span>
                  <span>$105,000 (covers the gap from 5% to 20%)</span>
                </li>
                <li className="flex gap-2 text-emerald-700 font-semibold">
                  <span className="w-36 shrink-0">LMI saving:</span>
                  <span>~$20,000&ndash;$28,000</span>
                </li>
              </ul>
              <p className="text-xs text-slate-500 italic mt-3">
                LMI estimate varies by lender. General information only — not a quote.
              </p>
            </div>

            <p className="text-slate-700 leading-relaxed">
              Importantly, the guarantee is a contingent liability to the government, not cash
              in your pocket. You borrow 95% of the property price and repay the full loan.
              The guarantee simply eliminates the LMI premium you would otherwise pay.
            </p>
          </section>

          {/* ── Eligibility ──────────────────────────────────────────── */}
          <section>
            <h2 className="text-2xl font-bold mb-4">Eligibility criteria ({CURRENT_YEAR})</h2>
            <p className="text-slate-700 leading-relaxed mb-5">
              As of 1 October 2025, Housing Australia removed the annual place limit (previously
              35,000 per year) and income caps (previously $125,000 single / $200,000 couple)
              from the FHBG. Eligibility is now governed by property price caps only.
            </p>

            <div className="grid gap-4">
              {[
                {
                  title: "Australian citizen or permanent resident",
                  body: "You must be an Australian citizen or permanent resident at the time you enter into the loan agreement. Non-residents and temporary visa holders are not eligible.",
                },
                {
                  title: "Aged 18 or over",
                  body: "All applicants must be at least 18 years old.",
                },
                {
                  title: "First home buyer",
                  body: "You must not have previously owned or had an interest in real property in Australia (either as an owner-occupier or investment property). Joint applicants — both must be first home buyers.",
                },
                {
                  title: "Principal place of residence (PPOR)",
                  body: "You must intend to move into and live in the property as your primary residence. You cannot use the FHBG to purchase an investment property.",
                },
                {
                  title: "Property price within the cap for your area",
                  body: "The property purchase price must not exceed the price cap for the capital city or regional area where the property is located. See the price caps table below.",
                },
                {
                  title: "Minimum 5% deposit (genuine savings)",
                  body: "Your 5% deposit must generally be genuine savings — funds accumulated over time. Most lenders require at least 3 months of savings history. Gifts from family may be accepted by some lenders with conditions.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="flex gap-4 bg-white border border-slate-200 rounded-xl p-5"
                >
                  <span
                    className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
                    aria-hidden="true"
                  >
                    &#10003;
                  </span>
                  <div>
                    <p className="font-semibold text-slate-900 mb-1">{item.title}</p>
                    <p className="text-sm text-slate-600 leading-relaxed">{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── Property price caps ──────────────────────────────────── */}
          <section>
            <h2 className="text-2xl font-bold mb-2">Property price caps by state ({CURRENT_YEAR})</h2>
            <p className="text-slate-600 text-sm mb-4">
              Effective 1 October 2025. Capital city caps apply to properties in capital cities
              and designated regional centres. Regional caps apply to the rest of each state.
            </p>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table aria-label="First Home Guarantee property price caps by state" className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th scope="col" className="text-left px-4 py-3 font-semibold text-slate-700">State / Territory</th>
                    <th scope="col" className="text-right px-4 py-3 font-semibold text-slate-700">Capital city cap</th>
                    <th scope="col" className="text-right px-4 py-3 font-semibold text-slate-700">Regional cap</th>
                    <th scope="col" className="text-left px-4 py-3 font-semibold text-slate-700 hidden sm:table-cell">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {PRICE_CAPS.map((row, i) => (
                    <tr
                      key={row.state}
                      className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}
                    >
                      <td className="px-4 py-3 font-semibold text-slate-900">{row.state}</td>
                      <td className="px-4 py-3 text-right font-mono text-slate-900">{row.capital}</td>
                      <td className="px-4 py-3 text-right font-mono text-slate-700">{row.regional}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs hidden sm:table-cell">{row.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Source: Housing Australia. Caps effective 1 October 2025. Verify the current caps
              at{" "}
              <a
                href="https://www.housingaustralia.gov.au/support-buy-home/first-home-guarantee"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-slate-700"
              >
                housingaustralia.gov.au
              </a>{" "}
              before applying.
            </p>
          </section>

          {/* ── How to apply ─────────────────────────────────────────── */}
          <section>
            <h2 className="text-2xl font-bold mb-4">How to apply for the FHBG</h2>
            <p className="text-slate-700 leading-relaxed mb-6">
              Applications go through a participating lender, not Housing Australia directly.
              There is no separate application form for the guarantee — you apply for your home
              loan and nominate the FHBG at the same time.
            </p>

            <ol className="space-y-4">
              {[
                {
                  n: 1,
                  title: "Check eligibility",
                  body: 'Use the eligibility checklist above. Confirm the property is within the price cap for your state and location. Use the Housing Australia eligibility checker at housingaustralia.gov.au if unsure.',
                },
                {
                  n: 2,
                  title: "Choose a participating lender",
                  body: 'Commonwealth Bank and NAB participate, along with 27+ approved smaller lenders including Bank Australia, Heritage Bank, Teachers Mutual, Greater Bank, and Newcastle Permanent. The full list is published at housingaustralia.gov.au and is updated periodically.',
                },
                {
                  n: 3,
                  title: "Apply for your home loan",
                  body: 'Apply for a standard home loan with your chosen participating lender. Tell them you wish to use the First Home Guarantee. You will need to provide standard home loan documentation (payslips, tax returns, bank statements, evidence of deposit).',
                },
                {
                  n: 4,
                  title: "Lender submits the guarantee request",
                  body: 'The lender verifies your eligibility and submits the guarantee request to Housing Australia on your behalf. You do not pay any fee for the guarantee. If approved, the guarantee is in place for the life of the loan until you reach 20% equity.',
                },
                {
                  n: 5,
                  title: "Settlement",
                  body: 'Once your loan is approved and the guarantee is confirmed, proceed to settlement as you would with any home purchase. You pay stamp duty (check if any first-home-buyer concession applies in your state), legal/conveyancing fees, and other standard purchase costs.',
                },
              ].map((step) => (
                <li
                  key={step.n}
                  className="flex gap-4 bg-white border border-slate-200 rounded-xl p-5"
                >
                  <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center font-extrabold text-sm shrink-0">
                    {step.n}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 mb-1">{step.title}</p>
                    <p className="text-sm text-slate-600 leading-relaxed">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>

            <p className="text-xs text-slate-500 italic mt-4">
              Using a mortgage broker can simplify this process — they compare participating
              lenders and handle the paperwork. See our{" "}
              <Link href="/advisor-guides/mortgage-broker-vs-bank" className="underline hover:text-slate-700">
                mortgage broker vs bank guide
              </Link>
              .
            </p>
          </section>

          {/* ── Worked example ───────────────────────────────────────── */}
          <section>
            <h2 className="text-2xl font-bold mb-4">Worked example: Sarah in Melbourne</h2>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
              <p className="text-sm font-semibold text-amber-800 mb-4 uppercase tracking-wider">Case study — general illustration only</p>

              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-bold text-slate-900 mb-3">Sarah&apos;s situation</h3>
                  <ul className="space-y-2 text-sm text-slate-700">
                    <li><span className="font-medium">Age:</span> 28</li>
                    <li><span className="font-medium">Income:</span> $85,000 p.a.</li>
                    <li><span className="font-medium">Savings:</span> $40,000</li>
                    <li><span className="font-medium">Property:</span> $700,000 apartment, Melbourne metro</li>
                    <li><span className="font-medium">Loan type:</span> Principal &amp; interest, 30 years</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-bold text-slate-900 mb-3">Without vs with FHBG</h3>
                  <div className="space-y-3 text-sm">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="font-semibold text-red-800 mb-1">Without FHBG</p>
                      <ul className="space-y-1 text-slate-700">
                        <li>Deposit: $35,000 (5%)</li>
                        <li>LMI payable: ~$22,000</li>
                        <li>Cash needed at settlement: ~$57,000+</li>
                      </ul>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                      <p className="font-semibold text-emerald-800 mb-1">With FHBG</p>
                      <ul className="space-y-1 text-slate-700">
                        <li>Deposit: $35,000 (5%)</li>
                        <li>LMI payable: $0</li>
                        <li>LMI saving: ~$22,000</li>
                        <li>Cash needed at settlement: ~$35,000+</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 border-t border-amber-200 pt-4">
                <p className="text-sm text-slate-700 leading-relaxed">
                  Sarah is under the VIC metro price cap of $950,000 and meets all eligibility
                  criteria. She applies through a participating lender, avoids ~$22,000 in LMI,
                  and can also claim Victoria&apos;s stamp duty concession (fully exempt under $600,000;
                  scaled concession to $750,000 — at $700,000 she may receive a partial concession).
                  She is also eligible to stack the FHSS if she has made voluntary super contributions.
                </p>
                <p className="text-xs text-slate-500 italic mt-2">
                  LMI estimate is illustrative. Actual LMI depends on the lender and insurer.
                  Stamp duty calculation depends on her specific circumstances — see SRO Victoria.
                  This is a general illustration, not personal advice.
                </p>
              </div>
            </div>
          </section>

          {/* ── Related schemes ──────────────────────────────────────── */}
          <section>
            <h2 className="text-2xl font-bold mb-2">Related schemes: Family Home Guarantee and RFHBG</h2>
            <p className="text-slate-700 leading-relaxed mb-5">
              Three guarantees are administered by Housing Australia. They share the same
              no-LMI mechanism but differ in who qualifies and how large a deposit is required.
            </p>

            <div className="grid gap-4 sm:grid-cols-3">
              {[
                {
                  name: "First Home Guarantee (FHBG)",
                  deposit: "5% deposit",
                  who: "First home buyers (citizen or PR, 18+)",
                  limit: "No income cap or place limit (from Oct 2025)",
                  color: "border-emerald-300 bg-emerald-50",
                  badge: "bg-emerald-600 text-white",
                },
                {
                  name: "Family Home Guarantee (FHG)",
                  deposit: "2% deposit",
                  who: "Single parents / guardians with at least one dependent. Not required to be a first home buyer.",
                  limit: "5,000 places per year",
                  color: "border-blue-300 bg-blue-50",
                  badge: "bg-blue-600 text-white",
                },
                {
                  name: "Regional First Home Buyer Guarantee (RFHBG)",
                  deposit: "5% deposit",
                  who: "First home buyers purchasing in a regional area with 12 months regional residency in prior 24 months",
                  limit: "No income cap or place limit (from Oct 2025)",
                  color: "border-violet-300 bg-violet-50",
                  badge: "bg-violet-600 text-white",
                },
              ].map((scheme) => (
                <div
                  key={scheme.name}
                  className={`border rounded-xl p-5 ${scheme.color}`}
                >
                  <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded mb-3 ${scheme.badge}`}>
                    {scheme.deposit}
                  </span>
                  <h3 className="font-bold text-slate-900 mb-2 text-sm leading-tight">{scheme.name}</h3>
                  <p className="text-xs text-slate-700 leading-relaxed mb-2">{scheme.who}</p>
                  <p className="text-xs text-slate-500 italic">{scheme.limit}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ── Scheme comparison table ───────────────────────────────── */}
          <section>
            <h2 className="text-2xl font-bold mb-2">FHBG vs FHSS vs shared equity vs standard 5% deposit</h2>
            <p className="text-slate-600 text-sm mb-4">
              These schemes are not mutually exclusive — some can be stacked. Compare what matters
              for your situation.
            </p>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table aria-label="FHBG vs FHSS vs shared equity vs standard 5% deposit comparison" className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th scope="col" className="text-left px-4 py-3 font-semibold text-slate-700 min-w-[160px]">Scheme</th>
                    <th scope="col" className="text-left px-4 py-3 font-semibold text-slate-700">Deposit</th>
                    <th scope="col" className="text-left px-4 py-3 font-semibold text-slate-700">LMI?</th>
                    <th scope="col" className="text-left px-4 py-3 font-semibold text-slate-700">Income test</th>
                    <th scope="col" className="text-left px-4 py-3 font-semibold text-slate-700 hidden md:table-cell">Key limit</th>
                  </tr>
                </thead>
                <tbody>
                  {SCHEME_COMPARISON.map((row, i) => (
                    <tr
                      key={row.scheme}
                      className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}
                    >
                      <td className="px-4 py-3 font-semibold text-slate-900">{row.scheme}</td>
                      <td className="px-4 py-3 text-slate-700">{row.deposit}</td>
                      <td className="px-4 py-3 text-slate-700">{row.lmiRequired}</td>
                      <td className="px-4 py-3 text-slate-700 text-xs">{row.incomeTest}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs hidden md:table-cell">{row.keyLimit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              The Help to Buy shared equity scheme (federal) requires separate legislation
              and may not be available in all states. Check{" "}
              <a
                href="https://www.housingaustralia.gov.au"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-slate-700"
              >
                housingaustralia.gov.au
              </a>{" "}
              for the current status.
            </p>
          </section>

          {/* ── Stacking with FHOG ───────────────────────────────────── */}
          <section>
            <h2 className="text-2xl font-bold mb-4">Can you stack FHBG with the First Home Owner Grant?</h2>
            <p className="text-slate-700 leading-relaxed mb-4">
              Yes. The FHBG (federal) and First Home Owner Grant (FHOG, state-administered) are
              separate schemes with separate eligibility criteria. Meeting both sets of criteria
              allows you to access both simultaneously.
            </p>

            <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 mb-4">
              <h3 className="font-semibold text-slate-900 mb-3">State FHOG amounts (new builds, 2025&ndash;26)</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                {[
                  { state: "NSW", amount: "$10,000" },
                  { state: "VIC", amount: "$10,000" },
                  { state: "QLD", amount: "$30,000" },
                  { state: "WA", amount: "$10,000" },
                  { state: "SA", amount: "$15,000" },
                  { state: "TAS", amount: "$30,000" },
                  { state: "ACT", amount: "N/A (see HBCS)" },
                  { state: "NT", amount: "$10,000+" },
                ].map((row) => (
                  <div key={row.state} className="bg-white border border-slate-100 rounded-lg px-3 py-2">
                    <span className="font-bold text-slate-900">{row.state}</span>{" "}
                    <span className="text-slate-600">{row.amount}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-3">
                FHOG applies to new builds or land-and-build contracts only in most states.
                QLD and TAS provide the highest grant at $30,000. NT stacks BuildBonus + HomeGrown
                Territory Grant on eligible builds. Verify eligibility with your state revenue office.
              </p>
            </div>

            <p className="text-slate-700 leading-relaxed">
              You can also stack the FHBG with stamp duty concessions where available in your state,
              and with the First Home Super Saver Scheme (FHSS) if you have made eligible voluntary
              super contributions. Using multiple schemes together can substantially reduce your
              upfront costs.
            </p>

            <div className="mt-4">
              <Link
                href="/first-home-buyer"
                className="inline-block text-emerald-700 hover:text-emerald-900 font-semibold underline underline-offset-2 text-sm"
              >
                See all first home buyer schemes and grants &rarr;
              </Link>
            </div>
          </section>

          {/* ── Negative equity / property value falls ───────────────── */}
          <section>
            <h2 className="text-2xl font-bold mb-4">What if property values fall after purchase?</h2>
            <p className="text-slate-700 leading-relaxed mb-4">
              The guarantee protects the lender, not the borrower. If property values fall after
              settlement, you are exposed to negative equity like any borrower with a high
              loan-to-value ratio.
            </p>

            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <h3 className="font-semibold text-slate-900 mb-2 text-sm">What the guarantee covers</h3>
                <ul className="space-y-1.5 text-xs text-slate-700">
                  <li className="flex gap-2">
                    <span className="text-emerald-600 font-bold">&#10003;</span>
                    Lender&apos;s LMI requirement is waived at purchase
                  </li>
                  <li className="flex gap-2">
                    <span className="text-emerald-600 font-bold">&#10003;</span>
                    Lender&apos;s shortfall if you default and sale proceeds are insufficient
                  </li>
                  <li className="flex gap-2">
                    <span className="text-emerald-600 font-bold">&#10003;</span>
                    Covers the top 15% of the property&apos;s original price
                  </li>
                </ul>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <h3 className="font-semibold text-slate-900 mb-2 text-sm">What the guarantee does NOT cover</h3>
                <ul className="space-y-1.5 text-xs text-slate-700">
                  <li className="flex gap-2">
                    <span className="text-red-500 font-bold">&#10007;</span>
                    Falls in property value
                  </li>
                  <li className="flex gap-2">
                    <span className="text-red-500 font-bold">&#10007;</span>
                    Your personal financial loss if you sell below purchase price
                  </li>
                  <li className="flex gap-2">
                    <span className="text-red-500 font-bold">&#10007;</span>
                    Repayment of your loan principal
                  </li>
                  <li className="flex gap-2">
                    <span className="text-red-500 font-bold">&#10007;</span>
                    Residual debt after lender recovery from sale
                  </li>
                </ul>
              </div>
            </div>

            <p className="text-slate-700 leading-relaxed text-sm">
              If you default and the lender sells the property at a loss, Housing Australia covers
              the lender&apos;s shortfall up to the guaranteed amount. However, if there is any residual
              debt after the sale (i.e., the sale proceeds plus the guarantee payout are less than
              the outstanding loan), you may still be personally liable for that residual amount
              depending on the terms of your loan. A mortgage broker or financial adviser can
              explain how this works for your specific loan.
            </p>
          </section>

          {/* ── CTA: find a mortgage broker ──────────────────────────── */}
          <section className="bg-emerald-50 border border-emerald-200 rounded-xl p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-3">
              Compare participating lenders or speak to a mortgage broker
            </h2>
            <p className="text-slate-700 mb-5 text-sm leading-relaxed">
              Not all participating lenders offer the same rates, fees, or cashback deals. A
              mortgage broker can compare FHBG-approved lenders, help structure your application,
              and handle the guarantee paperwork — at no cost to you (brokers are paid by lenders).
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/find-advisor?specialty=mortgage"
                className="inline-block px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-lg text-sm"
              >
                Find a mortgage broker &rarr;
              </Link>
              <Link
                href="/first-home-buyer/quiz"
                className="inline-block px-5 py-2.5 bg-white border border-emerald-300 hover:bg-emerald-50 text-emerald-800 font-semibold rounded-lg text-sm"
              >
                Take the first home buyer quiz
              </Link>
            </div>
          </section>

          {/* ── FAQ section ──────────────────────────────────────────── */}
          <section>
            <h2 className="text-2xl font-bold mb-6">
              Frequently asked questions about the First Home Guarantee
            </h2>
            <div className="space-y-3">
              {FAQS.map((item) => (
                <details
                  key={item.q}
                  className="group bg-white border border-slate-200 rounded-xl"
                >
                  <summary className="px-5 py-4 text-sm font-bold text-slate-900 cursor-pointer list-none flex items-center justify-between hover:bg-slate-50 rounded-xl transition-colors">
                    {item.q}
                    <span
                      className="text-slate-400 group-open:rotate-180 transition-transform text-base ml-3 shrink-0"
                      aria-hidden="true"
                    >
                      &#8964;
                    </span>
                  </summary>
                  <div className="px-5 pb-4 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                    {item.a}
                  </div>
                </details>
              ))}
            </div>
          </section>

          {/* ── Related guides ────────────────────────────────────────── */}
          <section>
            <h2 className="text-2xl font-bold mb-4">Related first home buyer guides</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                {
                  href: "/first-home-buyer",
                  title: "First Home Buyer Hub",
                  desc: "All schemes, grants, and guides in one place.",
                },
                {
                  href: "/tools/state-grants-calculator",
                  title: "State grants calculator",
                  desc: "Estimate your FHOG and stamp duty savings by state.",
                },
                {
                  href: "/mortgage-calculator",
                  title: "Mortgage repayment calculator",
                  desc: "See what your repayments look like at different loan sizes and rates.",
                },
                {
                  href: "/advisor-guides/mortgage-broker-vs-bank",
                  title: "Mortgage broker vs bank",
                  desc: "When to use a broker and how the FHBG application differs by channel.",
                },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex flex-col gap-1 p-4 bg-white border border-slate-200 rounded-xl hover:border-emerald-300 hover:shadow-sm transition-all"
                >
                  <span className="text-sm font-semibold text-slate-900">{item.title}</span>
                  <span className="text-xs text-slate-500 leading-relaxed">{item.desc}</span>
                </Link>
              ))}
            </div>
          </section>

          {/* ── Compliance footer ────────────────────────────────────── */}
          <footer className="text-xs text-slate-500 leading-relaxed border-t border-slate-200 pt-6">
            <p className="mb-3">{GENERAL_ADVICE_WARNING}</p>
            <p className="mb-3">
              Information on the First Home Guarantee, Family Home Guarantee, and Regional First
              Home Buyer Guarantee is based on publicly available data from Housing Australia as
              at {UPDATED_LABEL}. Scheme rules, property price caps, place limits, and eligibility
              criteria change — always verify current details at{" "}
              <a
                href="https://www.housingaustralia.gov.au"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-slate-700"
              >
                housingaustralia.gov.au
              </a>{" "}
              before applying.
            </p>
            <p>
              LMI estimates and stamp duty figures are illustrative only and will vary by lender,
              insurer, state, and individual circumstances. invest.com.au receives no commission
              or referral fee from Housing Australia or lenders participating in the FHBG.
            </p>
          </footer>

        </div>
      </main>
    </>
  );
}
