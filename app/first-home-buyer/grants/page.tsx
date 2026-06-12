import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `First Home Owner Grants by State (${CURRENT_YEAR}) — FHOG Guide | invest.com.au`,
  description: `FHOG by state: NSW $10K, QLD $30K, TAS $30K, SA $15K, WA $10K, NT $10K. Eligibility, caps, and stamp duty stacking. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `First Home Owner Grants by State (${CURRENT_YEAR}) — FHOG Guide`,
    description: "Complete state-by-state FHOG guide: grant amounts, property caps, eligibility rules, and how to combine with stamp duty concessions.",
    url: `${SITE_URL}/first-home-buyer/grants`,
    images: [{ url: `/api/og?title=${encodeURIComponent("First Home Owner Grants")}&sub=${encodeURIComponent("NSW · QLD · VIC · WA · All States · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/first-home-buyer/grants` },
};

const FHOG_STATES = [
  {
    state: "NSW",
    amount: "$10,000",
    eligibleProperties: "New homes only",
    propertyCap: "$600,000 new / $750,000 land + build",
    notes: "First home buyers only",
  },
  {
    state: "VIC",
    amount: "$10,000",
    eligibleProperties: "New homes in regional VIC only (metro removed 2024)",
    propertyCap: "$750,000",
    notes: "Regional VIC only from 1 July 2023", // dated-ok — static historical/legal effective date (2026-06-11 sweep)
  },
  {
    state: "QLD",
    amount: "$30,000",
    eligibleProperties: "New homes",
    propertyCap: "$750,000",
    notes: "Increased from $15K to $30K in June 2023",
  },
  {
    state: "SA",
    amount: "$15,000",
    eligibleProperties: "New homes",
    propertyCap: "$575,000",
    notes: "",
  },
  {
    state: "WA",
    amount: "$10,000",
    eligibleProperties: "New or established homes (unique in Australia)",
    propertyCap: "$750,000 house / $400,000 land",
    notes: "Also applies to established homes",
  },
  {
    state: "TAS",
    amount: "$30,000",
    eligibleProperties: "New homes",
    propertyCap: "No cap",
    notes: "Highest grant per $ of property (with no cap)",
  },
  {
    state: "NT",
    amount: "$10,000",
    eligibleProperties: "New and established",
    propertyCap: "No cap",
    notes: "Territory Home Bonus also available",
  },
  {
    state: "ACT",
    amount: "No FHOG",
    eligibleProperties: "—",
    propertyCap: "—",
    notes: "ACT replaced FHOG with Home Buyer Concession Scheme (stamp duty relief)",
  },
];

const FEDERAL_SCHEMES = [
  {
    name: "First Home Guarantee (FHBG)",
    detail:
      "Buy with a 5% deposit and the government guarantees the remaining 15% to avoid Lenders Mortgage Insurance (LMI). 35,000 places per year. Income caps apply: $125,000 for singles, $200,000 for couples.",
  },
  {
    name: "Regional First Home Buyer Guarantee",
    detail:
      "The same 5% deposit / no LMI structure as the FHBG, but for regional areas. 10,000 additional places per year. Lower property price caps apply in some regional locations.",
  },
  {
    name: "First Home Super Saver Scheme (FHSS)",
    detail:
      "Withdraw voluntary super contributions (up to $50,000 per person) for a first home deposit. You pay tax at your marginal rate minus a 30% offset on withdrawal — a significant saving for people on 32.5% or higher. Covered in detail at invest.com.au/first-home-buyer/fhss-guide.",
  },
];

const ELIGIBILITY_CRITERIA = [
  "Must be an Australian citizen or permanent resident",
  "Must be 18 years or older",
  "First time owning a home or residential investment property in Australia (you or your spouse/partner)",
  "Must intend to live in the property as your principal place of residence for at least 12 months",
  "Property must be below the relevant price cap for your state",
  "Most states: new builds only (Western Australia is the main exception)",
];

const CLAIM_STEPS = [
  {
    n: 1,
    step: "Apply through your lender at settlement",
    detail:
      "Most major lenders process FHOG applications on your behalf. Ask your broker or lender to include the FHOG application when preparing settlement documents.",
  },
  {
    n: 2,
    step: "Or apply directly to your state Revenue Office",
    detail:
      "Some states allow direct applications to the state Revenue Office. This route is common for owner-builder situations or where settlement is delayed.",
  },
  {
    n: 3,
    step: "Timing of payment",
    detail:
      "For completed new builds, the grant is usually paid at settlement. For homes under construction (including house and land packages), payment typically occurs after first occupancy.",
  },
  {
    n: 4,
    step: "Keep eligibility documentation ready",
    detail:
      "You will need: proof of citizenship or permanent residency, the signed contract of sale or building contract, and evidence you intend to occupy the property (e.g., the contract terms, connection of utilities).",
  },
];

const COMBINED_TABLE = [
  {
    state: "NSW",
    fhog: "$10,000",
    stampDuty: "Full exemption up to $650K",
    combined: "Up to ~$34,000 total",
  },
  {
    state: "QLD",
    fhog: "$30,000",
    stampDuty: "Concession up to $700K",
    combined: "Up to ~$45,000+",
  },
  {
    state: "VIC",
    fhog: "$10,000 (regional)",
    stampDuty: "Full exemption up to $600K",
    combined: "Up to ~$39,000 (regional)",
  },
  {
    state: "SA",
    fhog: "$15,000",
    stampDuty: "Partial concession",
    combined: "Up to ~$25,000",
  },
  {
    state: "WA",
    fhog: "$10,000",
    stampDuty: "Various concessions",
    combined: "Up to ~$25,000",
  },
  {
    state: "TAS",
    fhog: "$30,000",
    stampDuty: "No separate concession",
    combined: "$30,000 grant only",
  },
  {
    state: "ACT",
    fhog: "No grant",
    stampDuty: "Full stamp duty concession (income-tested)",
    combined: "Up to $38K concession",
  },
];

const FAQS = [
  {
    q: "Can I get the First Home Owner Grant if I buy with a partner who has owned before?",
    a: "No. For most states, both you AND your partner (if buying together) must be first home buyers. If your partner has previously owned a home or investment property, you will generally not be eligible. There are some variations by state — check your state Revenue Office for specific rules.",
  },
  {
    q: "Does the FHOG apply to existing (established) homes?",
    a: "In most states, no — the FHOG is limited to new homes (either newly built or substantially renovated). Western Australia is the main exception, where the grant applies to both new and established homes. The ACT has replaced the FHOG with stamp duty concessions entirely.",
  },
  {
    q: "Can I use the First Home Owner Grant for a property I won't live in?",
    a: "No. The FHOG requires you to live in the property as your principal place of residence for at least 12 months starting within 12 months of settlement. Buying as an investment property without living in it first makes you ineligible.",
  },
  {
    q: "Is the FHOG taxable income?",
    a: "No. The First Home Owner Grant is not considered income for tax purposes and does not need to be declared on your tax return. It is a government grant.",
  },
  {
    q: "Can the FHOG be used as part of my deposit?",
    a: "Yes. The FHOG counts as genuine savings toward your deposit from most lenders' perspective. However, policies vary between lenders — your broker should confirm. The grant is typically paid at settlement, not before.",
  },
  {
    q: "What is the First Home Guarantee and how is it different from the FHOG?",
    a: "The First Home Guarantee (FHBG) is a different federal government scheme that allows eligible first home buyers to purchase with a 5% deposit without paying Lenders Mortgage Insurance (LMI). It is not a cash grant — it is a government guarantee that covers 15% of the property value. The FHOG is a cash payment. You can potentially use both — check eligibility for each independently.",
  },
];

export default function FirstHomeOwnerGrantsPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "First Home Buyer", url: `${SITE_URL}/first-home-buyer` },
    { name: "First Home Owner Grants" },
  ]);
  const faqLd = faqJsonLd(FAQS.map((f) => ({ q: f.q, a: f.a })));

  return (
    <div className="bg-white min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      {faqLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />}

      {/* Hero */}
      <section className="bg-slate-900 py-10 md:py-14">
        <div className="container-custom max-w-4xl">
          <nav aria-label="Breadcrumb" className="text-xs text-slate-500 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-white">Home</Link><span>/</span>
            <Link href="/first-home-buyer" className="hover:text-white">First Home Buyer</Link><span>/</span>
            <span className="text-slate-200 font-medium">First Home Owner Grants</span>
          </nav>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-4">
            First Home Owner Grants by State (2025&ndash;26)
          </h1>
          <p className="text-lg text-slate-300 leading-relaxed mb-8">
            The First Home Owner Grant (FHOG) is a one-off cash payment from state and territory
            governments for eligible first home buyers. Amounts vary by state — up to $30,000 in QLD
            and TAS. Most states restrict the grant to new builds. Here&apos;s the full picture.
          </p>

          {/* Key stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { stat: "Up to $30,000", label: "available (QLD, NT, TAS)" },
              { stat: "New builds only", label: "in most states" },
              { stat: "12 months", label: "owner-occupied residency required" },
              { stat: "Stackable", label: "with stamp duty concessions" },
            ].map((item) => (
              <div key={item.stat} className="bg-white/10 rounded-xl p-4 text-center">
                <p className="text-lg font-extrabold text-amber-400 mb-1">{item.stat}</p>
                <p className="text-xs text-slate-300 leading-tight">{item.label}</p>
              </div>
            ))}
          </div>

          <p className="text-xs text-slate-500 mt-6">{UPDATED_LABEL} · Grant amounts change — verify at your state Revenue Office · Not financial advice</p>
        </div>
      </section>

      {/* State-by-state FHOG table */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">FHOG by state and territory (2025&ndash;26)</h2>
          <p className="text-sm text-slate-500 mb-5">Grant amounts, eligible property types, price caps, and key notes.</p>
          <div className="rounded-xl border border-slate-200 overflow-x-auto">
            <table aria-label="First Home Owner Grant amounts and eligibility by state and territory" className="w-full text-sm">
              <thead>
                <tr className="bg-slate-900">
                  <th scope="col" className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide whitespace-nowrap">State / Territory</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-bold text-amber-300 uppercase tracking-wide whitespace-nowrap">Grant amount</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide whitespace-nowrap">Eligible properties</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide whitespace-nowrap">Property cap</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide whitespace-nowrap">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {FHOG_STATES.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-bold text-slate-900 whitespace-nowrap">{row.state}</td>
                    <td className={`px-4 py-3 font-semibold whitespace-nowrap ${row.amount === "No FHOG" ? "text-slate-500" : "text-emerald-700"}`}>
                      {row.amount}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 leading-relaxed">{row.eligibleProperties}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">{row.propertyCap}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 leading-relaxed">{row.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-500 mt-3">
            {/* // dated-ok — static historical/legal effective date (2026-06-11 sweep) */}
            ACT does not offer the FHOG — it has been replaced with the Home Buyer Concession Scheme (stamp duty relief). VIC removed the metropolitan FHOG from 1 July 2023.
          </p>
        </div>
      </section>

      {/* Federal schemes */}
      <section className="py-10 border-b border-slate-100 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Other federal first home buyer schemes</h2>
          <p className="text-sm text-slate-500 mb-5">
            Alongside the state FHOG, these federal programs can reduce your upfront costs further.
            You may be eligible for more than one simultaneously.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {FEDERAL_SCHEMES.map((scheme, i) => (
              <div key={i} className="bg-blue-50 border border-blue-100 rounded-xl p-5">
                <p className="font-bold text-slate-900 mb-2 text-sm">{scheme.name}</p>
                <p className="text-xs text-slate-600 leading-relaxed">{scheme.detail}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-4">
            The FHSS scheme is covered in detail at{" "}
            <Link href="/first-home-buyer/fhss-guide" className="underline hover:text-slate-700">
              /first-home-buyer/fhss-guide
            </Link>
            .
          </p>
        </div>
      </section>

      {/* Eligibility criteria */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Standard FHOG eligibility criteria</h2>
          <p className="text-sm text-slate-500 mb-5">
            These apply across most states and territories, though exact rules vary. Always confirm
            with your state Revenue Office.
          </p>
          <ul className="space-y-3">
            {ELIGIBILITY_CRITERIA.map((criterion, i) => (
              <li key={i} className="flex gap-3 items-start">
                <span className="mt-0.5 shrink-0 w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center">
                  {i + 1}
                </span>
                <p className="text-sm text-slate-700 leading-relaxed">{criterion}</p>
              </li>
            ))}
          </ul>
          <div className="mt-6 bg-amber-50 border border-amber-100 rounded-xl p-4">
            <p className="text-xs text-slate-700 leading-relaxed">
              <strong>Partner / spouse rule:</strong> In most states, if you are buying with a partner who has previously owned property in Australia, neither of you will be eligible for the FHOG — even if you personally have never owned. Both applicants must meet the first home buyer definition.
            </p>
          </div>
        </div>
      </section>

      {/* How to claim */}
      <section className="py-10 border-b border-slate-100 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-5">How to claim the FHOG</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {CLAIM_STEPS.map((s) => (
              <div key={s.n} className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="w-8 h-8 rounded-full bg-amber-500 text-slate-900 font-extrabold text-sm flex items-center justify-center mb-3">
                  {s.n}
                </div>
                <p className="font-bold text-slate-900 mb-1 text-sm">{s.step}</p>
                <p className="text-xs text-slate-600 leading-relaxed">{s.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FHOG + stamp duty combinations */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">FHOG + stamp duty concession combinations</h2>
          <p className="text-sm text-slate-500 mb-5">
            Many states offer both a FHOG and a stamp duty concession. Here&apos;s how the combined
            benefit stacks up. Figures are indicative — your actual saving depends on purchase price
            and eligibility.
          </p>
          <div className="rounded-xl border border-slate-200 overflow-x-auto">
            <table aria-label="FHOG and stamp duty concession combinations by state" className="w-full text-sm">
              <thead>
                <tr className="bg-slate-900">
                  <th scope="col" className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide">State</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-bold text-amber-300 uppercase tracking-wide whitespace-nowrap">FHOG available</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide whitespace-nowrap">Stamp duty concession</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-bold text-emerald-300 uppercase tracking-wide whitespace-nowrap">Combined benefit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {COMBINED_TABLE.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-bold text-slate-900">{row.state}</td>
                    <td className={`px-4 py-3 text-xs font-semibold ${row.fhog === "No grant" ? "text-slate-500" : "text-emerald-700"}`}>
                      {row.fhog}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 leading-relaxed">{row.stampDuty}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-slate-900 whitespace-nowrap">{row.combined}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-500 mt-3">
            Combined benefit estimates are approximate and based on purchasing near the concession threshold. See the{" "}
            <Link href="/first-home-buyer/stamp-duty" className="underline hover:text-slate-700">
              stamp duty guide
            </Link>{" "}
            for full concession thresholds by state.
          </p>
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
                  <span className="shrink-0 text-slate-500 group-open:rotate-180 transition-transform text-lg leading-none" aria-hidden="true">&#9662;</span>
                </summary>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Related links */}
      <section className="py-8 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-xl font-extrabold text-slate-900 mb-4">Related guides</h2>
          <div className="flex flex-wrap gap-3">
            {[
              { href: "/first-home-buyer", label: "First home buyer hub" },
              { href: "/first-home-buyer/stamp-duty", label: "Stamp duty guide" },
              { href: "/first-home-buyer/fhss-guide", label: "FHSS guide" },
              { href: "/advisors/mortgage-brokers", label: "Find a mortgage broker" },
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
            <strong>General advice warning.</strong> {GENERAL_ADVICE_WARNING} First Home Owner Grant amounts, property caps, and eligibility rules are set by state and territory governments and change regularly. Always verify current figures with your state or territory Revenue Office, or speak with a licensed mortgage broker before relying on this information. This page is general information only; it is not financial, legal, or tax advice.
          </p>
        </div>
      </section>
    </div>
  );
}
