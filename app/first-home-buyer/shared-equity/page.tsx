import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Shared Equity Home Loans Australia (${CURRENT_YEAR}) — Help to Buy & State Schemes | invest.com.au`,
  description: `How shared equity works: government co-owns part of your home, reducing your loan size. Covers the federal Help to Buy scheme (up to 40% equity) and state programs. Income caps, property caps, repayment explained. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Shared Equity Home Loans Australia (${CURRENT_YEAR}) — Help to Buy & State Schemes`,
    description: "Shared equity home loans: government takes an equity stake to reduce your loan. Federal Help to Buy (up to 40%), state programs, income caps, property caps, and how repayment works on sale.",
    url: `${SITE_URL}/first-home-buyer/shared-equity`,
    images: [{ url: `/api/og?title=${encodeURIComponent("Shared Equity Home Loans")}&sub=${encodeURIComponent("Help to Buy · Up to 40% · 2% Deposit · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/first-home-buyer/shared-equity` },
};

const STATE_PROGRAMS = [
  {
    state: "NSW",
    program: "Shared Equity Home Buyer Helper",
    equityShare: "40% new / 30% existing",
    incomeCap: "$90K single / $120K couple",
    propertyCap: "$950K new / $900K existing",
    status: "Active",
  },
  {
    state: "VIC",
    program: "HomesVic (closed — refer to Help to Buy)",
    equityShare: "—",
    incomeCap: "—",
    propertyCap: "—",
    status: "Closed",
  },
  {
    state: "WA",
    program: "Keystart Shared Equity (various programs)",
    equityShare: "20–40%",
    incomeCap: "Varies by program",
    propertyCap: "Varies by program",
    status: "Active",
  },
  {
    state: "SA",
    program: "HomeSeeker SA",
    equityShare: "30%",
    incomeCap: "$60K single / $80K couple",
    propertyCap: "$500K",
    status: "Active",
  },
  {
    state: "ACT",
    program: "Land Rent Scheme (different model)",
    equityShare: "—",
    incomeCap: "—",
    propertyCap: "—",
    status: "Indicative",
  },
];

const PROS_CONS = [
  { pro: "Need smaller deposit (as low as 2%)", con: "Government shares in your property capital gains" },
  { pro: "No LMI required", con: "Must repay growing equity share on eventual sale" },
  { pro: "Lower monthly loan repayments", con: "Income caps exclude higher earners" },
  { pro: "Reduces borrowing amount needed from bank", con: "Limited places available — competitive to access" },
  { pro: "Good for affordability in expensive markets", con: "Means test applies — cannot own other property" },
];

const COMPARISON_ROWS = [
  { feature: "Government role", helpToBuy: "Co-owner (equity stake in your property)", fhbg: "Guarantor only — no equity stake" },
  { feature: "Minimum deposit", helpToBuy: "2% (genuine savings)", fhbg: "5% (genuine savings)" },
  { feature: "Government share in capital growth", helpToBuy: "Yes — repay the grown share when you sell", fhbg: "No — loan guarantee only, no equity held" },
  { feature: "Effect on borrowing capacity", helpToBuy: "Reduced loan needed (government funds part)", fhbg: "Standard loan size, but guaranteed" },
  { feature: "When you sell", helpToBuy: "Repay government's equity share (grown/fallen with prices)", fhbg: "Nothing extra owed to government" },
  { feature: "Income limit (single)", helpToBuy: "$90,000", fhbg: "$125,000" },
  { feature: "Income limit (couple)", helpToBuy: "$120,000", fhbg: "$200,000" },
];

const FAQS = [
  {
    q: "How do I apply for the Help to Buy scheme?",
    a: "Applications for Help to Buy are processed through Housing Australia's approved participating lenders — you do not apply directly to the government. To apply: (1) check your eligibility at housingaustralia.gov.au; (2) choose a participating lender or mortgage broker who works with the scheme; (3) inform them you wish to use Help to Buy when you begin the loan application; (4) the lender confirms eligibility with Housing Australia; (5) once approved, the process proceeds through your normal home loan and conveyancing steps. Housing Australia then registers its equity interest on the property title at settlement.",
  },
  {
    q: "Do I pay the government rent for their share of my home?",
    a: "No. Under Help to Buy and most state shared equity schemes, no rent or ongoing fee is payable to the government for the equity share they hold. You live in the property as the sole occupant without any rental obligation to the government. The government's return comes from sharing in the capital gain (or loss) when the property is eventually sold or when you buy out their share. This is a key advantage over some other affordable housing models.",
  },
  {
    q: "Can I renovate the property if the government has an equity share?",
    a: "Generally yes, but you should check the specific conditions of your scheme. Under Help to Buy, you are treated as the owner for day-to-day purposes and can make standard improvements. However, significant structural changes or additions that materially increase the property's value may require notifying Housing Australia, as it affects the value of their equity interest. The scheme documentation will specify what approvals (if any) are needed for major renovations. Check the deed of equity mortgage registered on your title for exact terms.",
  },
  {
    q: "What happens to the government's equity if my property loses value?",
    a: "Shared equity works in both directions. If your property falls in value, the government's proportional share also falls. Using the Help to Buy example: if you bought for $800,000 with a 30% government share ($240,000), and the property drops to $700,000, the government's share is now $210,000 — not $240,000. You are not required to compensate the government for the loss. Conversely, you do not benefit from the full capital gain either; only your equity share grows. This symmetry is an important feature of how shared equity differs from a standard loan.",
  },
  {
    q: "Can I buy out the government's share before I sell?",
    a: "Yes. Both Help to Buy and most state programs allow you to progressively buy out the government's equity interest over time. You can typically do this in increments (for example, buying back 5% at a time) as your income or equity grows. The buyout price is based on the property's current market value at the time of each transaction — so if your property has increased in value, you will pay more to buy back the same percentage. Many homeowners use increases in property equity, salary growth, or lump-sum payments (such as inheritance or investment proceeds) to reduce the government's share over time.",
  },
  {
    q: "Can I use shared equity on an investment property?",
    a: "No. Shared equity schemes — including Help to Buy and all state programs — are strictly for owner-occupied properties. You must live in the home as your principal place of residence. Using the property as an investment or rental property while the government holds an equity share is prohibited under the scheme conditions and would constitute a breach of the equity deed, which could trigger a requirement to repay the government's share immediately. The schemes are specifically designed to help people get into homes they will live in, not to subsidise investment activity.",
  },
];

export default function SharedEquityPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "First Home Buyer", url: `${SITE_URL}/first-home-buyer` },
    { name: "Shared Equity Schemes" },
  ]);
  const faqLd = faqJsonLd(FAQS.map((f) => ({ q: f.q, a: f.a })));

  return (
    <div className="bg-white min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      {faqLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />}

      {/* Hero */}
      <section className="bg-slate-900 py-10 md:py-14">
        <div className="container-custom max-w-4xl">
          <nav aria-label="Breadcrumb" className="text-xs text-slate-400 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-white">Home</Link><span>/</span>
            <Link href="/first-home-buyer" className="hover:text-white">First Home Buyer</Link><span>/</span>
            <span className="text-slate-200 font-medium">Shared Equity Schemes</span>
          </nav>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-4">
            Shared equity home loans in Australia: Help to Buy &amp; state programs
          </h1>
          <p className="text-lg text-slate-300 leading-relaxed mb-8">
            Shared equity schemes let a government or housing authority co-own part of your home —
            reducing how much you need to borrow. The federal Help to Buy scheme offers up to 40%
            equity for new builds with just a 2% deposit. Here&apos;s everything you need to know.
          </p>

          {/* Key stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { stat: "Up to 40%", label: "government equity share (new builds)" },
              { stat: "2% deposit", label: "minimum genuine savings required" },
              { stat: "10,000/year", label: "Help to Buy places nationwide" },
              { stat: "$90K / $120K", label: "income caps (single / couple)" },
            ].map((item) => (
              <div key={item.stat} className="bg-white/10 rounded-xl p-4 text-center">
                <p className="text-lg font-extrabold text-amber-400 mb-1">{item.stat}</p>
                <p className="text-xs text-slate-300 leading-tight">{item.label}</p>
              </div>
            ))}
          </div>

          <p className="text-xs text-slate-500 mt-6">{UPDATED_LABEL} · Scheme rules change — verify at housingaustralia.gov.au · General information only</p>
        </div>
      </section>

      {/* What is shared equity */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">What is shared equity?</h2>
          <p className="text-slate-600 leading-relaxed mb-4">
            Shared equity is an arrangement where a government body (or in some models, a private third party)
            co-owns a portion of your home. You own 100% of the right to live in the property — but the
            government holds a registered equity interest on the title reflecting their percentage share.
          </p>
          <p className="text-slate-600 leading-relaxed mb-6">
            Because the government is funding part of the purchase price, you only need to borrow the
            remaining portion from a bank. A smaller loan means lower monthly repayments and — because
            your loan-to-value ratio is lower — you may avoid paying Lenders Mortgage Insurance (LMI)
            even with a small deposit.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                title: "Smaller loan",
                detail: "The government contributes equity so you borrow less. On an $800,000 purchase with 30% government equity, you borrow $544,000 rather than $784,000.",
              },
              {
                title: "No LMI",
                detail: "With the government equity reducing your effective LVR, you typically avoid LMI — saving $5,000–$20,000 that would otherwise be capitalised into your loan.",
              },
              {
                title: "Repay on sale",
                detail: "When you sell (or choose to buy out the government's share), you repay the government's proportional share of the current property value — which grows or falls with the market.",
              },
            ].map((card, i) => (
              <div key={i} className="bg-blue-50 border border-blue-100 rounded-xl p-5">
                <p className="font-bold text-slate-900 mb-2 text-sm">{card.title}</p>
                <p className="text-xs text-slate-600 leading-relaxed">{card.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Federal Help to Buy */}
      <section className="py-10 border-b border-slate-100 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Federal Help to Buy scheme</h2>
          <p className="text-sm text-slate-500 mb-6">
            Administered by Housing Australia. Passed into law June 2024 — applications open from the
            1 January 2024 intake. 10,000 places available per year nationwide.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
            {/* Key terms */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <p className="font-extrabold text-slate-900 mb-3 text-sm uppercase tracking-wide">Key terms</p>
              <ul className="space-y-2.5 text-sm">
                <li className="flex gap-3">
                  <span className="shrink-0 w-4 h-4 mt-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold flex items-center justify-center">✓</span>
                  <span className="text-slate-700"><strong>Equity share:</strong> up to 40% for new builds; up to 30% for existing homes</span>
                </li>
                <li className="flex gap-3">
                  <span className="shrink-0 w-4 h-4 mt-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold flex items-center justify-center">✓</span>
                  <span className="text-slate-700"><strong>Minimum deposit:</strong> 2% genuine savings</span>
                </li>
                <li className="flex gap-3">
                  <span className="shrink-0 w-4 h-4 mt-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold flex items-center justify-center">✓</span>
                  <span className="text-slate-700"><strong>Income cap:</strong> $90,000 single; $120,000 couple (combined taxable income)</span>
                </li>
                <li className="flex gap-3">
                  <span className="shrink-0 w-4 h-4 mt-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold flex items-center justify-center">✓</span>
                  <span className="text-slate-700"><strong>Places:</strong> 10,000 per year nationwide (first-come, first-served)</span>
                </li>
                <li className="flex gap-3">
                  <span className="shrink-0 w-4 h-4 mt-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold flex items-center justify-center">✓</span>
                  <span className="text-slate-700"><strong>Rent to government:</strong> none payable — government shares in growth/loss only</span>
                </li>
                <li className="flex gap-3">
                  <span className="shrink-0 w-4 h-4 mt-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold flex items-center justify-center">✓</span>
                  <span className="text-slate-700"><strong>Buy-out:</strong> can progressively purchase government&apos;s share over time</span>
                </li>
              </ul>
            </div>

            {/* Eligibility */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <p className="font-extrabold text-slate-900 mb-3 text-sm uppercase tracking-wide">Who is eligible</p>
              <ul className="space-y-2.5 text-sm">
                {[
                  "Australian citizen or permanent resident",
                  "First home buyer (or currently does not own any residential property in Australia)",
                  "Individual taxable income ≤ $90,000 (singles) or ≤ $120,000 combined (couples)",
                  "Purchasing as owner-occupier — must live in the property",
                  "Property must be within the price cap for your state",
                  "2% minimum genuine savings deposit",
                  "Must qualify for a standard home loan with a participating lender",
                ].map((item, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="shrink-0 w-4 h-4 mt-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                    <span className="text-slate-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Property price caps */}
          <h3 className="text-lg font-extrabold text-slate-900 mb-3">Help to Buy property price caps by state</h3>
          <div className="rounded-xl border border-slate-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-900">
                  <th scope="col" className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide">State / Territory</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-bold text-amber-300 uppercase tracking-wide whitespace-nowrap">New build cap</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide whitespace-nowrap">Existing home cap</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {[
                  { state: "New South Wales", newBuild: "$950,000", existing: "$900,000" },
                  { state: "Victoria", newBuild: "$850,000", existing: "$800,000" },
                  { state: "Queensland", newBuild: "$700,000", existing: "$700,000" },
                  { state: "Western Australia", newBuild: "$600,000", existing: "$550,000" },
                  { state: "South Australia", newBuild: "$600,000", existing: "$550,000" },
                  { state: "ACT", newBuild: "$750,000", existing: "$700,000" },
                  { state: "Northern Territory", newBuild: "$600,000", existing: "$550,000" },
                  { state: "Tasmania", newBuild: "$600,000", existing: "$550,000" },
                ].map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-700 text-xs">{row.state}</td>
                    <td className="px-4 py-3 font-bold text-emerald-700 text-xs">{row.newBuild}</td>
                    <td className="px-4 py-3 font-bold text-slate-700 text-xs">{row.existing}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400 mt-2">Verify current caps at housingaustralia.gov.au/support-buy-home/help-to-buy</p>
        </div>
      </section>

      {/* State programs */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">State shared equity programs</h2>
          <p className="text-sm text-slate-500 mb-5">
            Several states run their own shared equity programs alongside (or instead of) the federal scheme.
            State programs change frequently — always verify current status with the relevant state housing authority.
          </p>
          <div className="rounded-xl border border-slate-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-900">
                  <th scope="col" className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide">State</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide">Program</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-bold text-amber-300 uppercase tracking-wide whitespace-nowrap">Gov. equity</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide whitespace-nowrap">Income cap</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide whitespace-nowrap">Property cap</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {STATE_PROGRAMS.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-bold text-slate-900 whitespace-nowrap">{row.state}</td>
                    <td className="px-4 py-3 text-xs text-slate-700 leading-relaxed">{row.program}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-emerald-700 whitespace-nowrap">{row.equityShare}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">{row.incomeCap}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">{row.propertyCap}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        row.status === "Active"
                          ? "bg-emerald-100 text-emerald-700"
                          : row.status === "Closed"
                          ? "bg-slate-100 text-slate-500"
                          : "bg-amber-100 text-amber-700"
                      }`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400 mt-3">
            State programs are subject to funding availability and policy changes. Check directly with your state&apos;s housing authority for current eligibility and availability.
          </p>
        </div>
      </section>

      {/* How equity repayment works */}
      <section className="py-10 border-b border-slate-100 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">How equity repayment works — a worked example</h2>
          <p className="text-sm text-slate-500 mb-6">
            Shared equity grows and shrinks with property prices. Here is a concrete example of how the
            numbers work over a 10-year period.
          </p>

          <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
            <p className="font-extrabold text-slate-900 mb-4">At purchase</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              {[
                { label: "Purchase price", value: "$800,000" },
                { label: "Government equity (30%)", value: "$240,000" },
                { label: "Your deposit (2%)", value: "$16,000" },
                { label: "Your loan (68%)", value: "$544,000" },
              ].map((item, i) => (
                <div key={i} className="bg-slate-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-slate-500 mb-1">{item.label}</p>
                  <p className="font-extrabold text-slate-900">{item.value}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500">
              By having the government cover 30%, your loan is $544,000 instead of $784,000 — reducing repayments significantly and eliminating LMI.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
            <p className="font-extrabold text-slate-900 mb-4">After 10 years (property worth $1,200,000)</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
              {[
                { label: "Property value", value: "$1,200,000" },
                { label: "Government's 30% share", value: "$360,000" },
                { label: "Your equity (property minus loan)", value: "~$840,000 − loan balance" },
              ].map((item, i) => (
                <div key={i} className="bg-slate-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-slate-500 mb-1">{item.label}</p>
                  <p className="font-extrabold text-slate-900 text-sm">{item.value}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500">
              The government&apos;s share grew from $240,000 to $360,000 in line with the property. On sale, you repay $360,000 to Housing Australia and keep the remainder (minus your outstanding loan balance).
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
            <p className="text-xs text-slate-700 leading-relaxed">
              <strong>If you want to stay in the property:</strong> you can progressively buy out the government&apos;s equity share in increments over time — using growing income, refinancing, or lump-sum payments. Each buyout is priced at the current market value of that percentage. This gives you a path to full ownership without having to sell.
            </p>
          </div>
        </div>
      </section>

      {/* Pros and cons */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-5">Pros and cons of shared equity</h2>
          <div className="rounded-xl border border-slate-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-900">
                  <th scope="col" className="text-left px-4 py-3 text-xs font-bold text-emerald-300 uppercase tracking-wide w-1/2">Advantages</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-bold text-red-300 uppercase tracking-wide w-1/2">Disadvantages</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {PROS_CONS.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-xs text-slate-700 leading-relaxed">
                      <span className="text-emerald-600 font-bold mr-2">+</span>{row.pro}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700 leading-relaxed">
                      <span className="text-red-500 font-bold mr-2">−</span>{row.con}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Shared equity vs FHBG */}
      <section className="py-10 border-b border-slate-100 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Shared equity vs First Home Guarantee (FHBG)</h2>
          <p className="text-sm text-slate-500 mb-5">
            Both schemes help first home buyers get into the market with a small deposit — but they work
            very differently. The key distinction: Help to Buy makes the government a co-owner; the FHBG
            makes the government a guarantor only.
          </p>
          <div className="rounded-xl border border-slate-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-900">
                  <th scope="col" className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide">Feature</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-bold text-amber-300 uppercase tracking-wide whitespace-nowrap">Help to Buy (shared equity)</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-bold text-blue-300 uppercase tracking-wide whitespace-nowrap">First Home Guarantee (FHBG)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {COMPARISON_ROWS.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-700 text-xs">{row.feature}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 leading-relaxed">{row.helpToBuy}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 leading-relaxed">{row.fhbg}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400 mt-3">
            The two schemes cannot be combined — you must choose one. If you want to maximise your share of
            future capital gains, FHBG may be preferable. If you need the smallest possible loan and deposit,
            Help to Buy goes further.
          </p>
        </div>
      </section>

      {/* Who is this best for */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">Who is shared equity best suited to?</h2>
          <p className="text-sm text-slate-500 mb-5">
            Shared equity is a trade-off: smaller loan and lower repayments now, in exchange for giving up
            a portion of future capital gains. It works best for a specific profile of buyer.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {
                title: "Low-to-moderate income earners",
                detail: "If you can service a mortgage but struggle to save a large deposit, the 2% deposit requirement dramatically lowers the barrier to entry compared to a standard 20% deposit.",
              },
              {
                title: "Buyers in expensive markets",
                detail: "In Sydney or Melbourne where a 20% deposit on a median property exceeds $150,000, shared equity reduces the required deposit to a much more achievable level.",
              },
              {
                title: "People who value lower repayments",
                detail: "A smaller loan means meaningfully lower monthly repayments — freeing cash for living costs, savings, or paying down the loan faster. The trade-off is sharing in future gains.",
              },
              {
                title: "Long-term owner-occupiers",
                detail: "If you plan to stay in the property for many years, the impact of sharing capital gains is spread over a long period. Short-term buyers face a larger relative cost on quick sales.",
              },
            ].map((card, i) => (
              <div key={i} className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                <p className="font-bold text-slate-900 mb-2 text-sm">{card.title}</p>
                <p className="text-xs text-slate-600 leading-relaxed">{card.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-10 border-b border-slate-100 bg-slate-50">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Frequently asked questions</h2>
          <div className="space-y-4">
            {FAQS.map((faq, i) => (
              <details key={i} className="group border border-slate-200 rounded-xl p-4 bg-white">
                <summary className="cursor-pointer list-none font-bold text-slate-900 flex items-start justify-between gap-3">
                  {faq.q}
                  <span className="shrink-0 text-slate-400 group-open:rotate-180 transition-transform text-lg leading-none">&#9662;</span>
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
            {[
              { href: "/first-home-buyer/first-home-guarantee", label: "First Home Guarantee (FHBG)" },
              { href: "/first-home-buyer/grants", label: "First Home Owner Grants" },
              { href: "/first-home-buyer/stamp-duty", label: "Stamp duty guide" },
              { href: "/first-home-buyer/deposit-guide", label: "Saving your deposit" },
              { href: "/first-home-buyer/fhss-guide", label: "FHSS guide" },
              { href: "/home-loans", label: "Home loans hub" },
              { href: "/first-home-buyer", label: "First home buyer hub" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-full text-sm font-semibold text-slate-700 hover:border-amber-300 hover:text-amber-700 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Compliance footer */}
      <section className="py-8 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <p className="text-[11px] text-slate-500 leading-relaxed">
            <strong>General advice warning.</strong> {GENERAL_ADVICE_WARNING} Shared equity scheme eligibility rules, income caps, property price caps, equity percentages, and available places change. The Help to Buy scheme is administered by Housing Australia — verify current details at housingaustralia.gov.au before applying. State programs are subject to separate eligibility rules and funding availability; check directly with your state or territory housing authority. This page is general information only; it is not financial, legal, credit, or mortgage advice. Consult a licensed mortgage broker or financial adviser for personalised guidance on your home-buying situation.
          </p>
        </div>
      </section>
    </div>
  );
}
