import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Stamp Duty for First Home Buyers — State-by-State Concessions (${CURRENT_YEAR}) | invest.com.au`,
  description: `First home buyer stamp duty concessions and exemptions by state: NSW ($800K full exemption or annual property tax), VIC ($600K), QLD ($700K), WA ($430K), SA, ACT, TAS, NT. Thresholds, worked examples, NSW property tax option explained. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `First Home Buyer Stamp Duty (${CURRENT_YEAR}) — State Concessions & NSW Property Tax`,
    description: "Stamp duty concessions for first home buyers in every state: exemption thresholds, partial concessions, worked dollar examples, NSW annual property tax option, off-the-plan rules, and foreign purchaser surcharges.",
    url: `${SITE_URL}/first-home-buyer/stamp-duty`,
    images: [{ url: `/api/og?title=${encodeURIComponent("First Home Buyer Stamp Duty")}&sub=${encodeURIComponent("NSW · VIC · QLD · All States · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/first-home-buyer/stamp-duty` },
};

const STATE_CONCESSIONS = [
  {
    state: "NSW",
    flag: "New South Wales",
    exemptionThreshold: "Full exemption on homes up to $800,000",
    concessionThreshold: "Tapered concession on homes $800,000–$1,000,000",
    maxSaving: "Up to ~$30,890",
    notes: "From January 2023: first home buyers purchasing for under $1.5M can alternatively opt for an annual property tax ($400 + 0.3% of land value) instead of upfront stamp duty. Property cap for the tax option is $1.5M.",
    highlight: true,
  },
  {
    state: "VIC",
    flag: "Victoria",
    exemptionThreshold: "Full exemption on principal place of residence up to $600,000",
    concessionThreshold: "50% concession on homes $600,000–$750,000",
    maxSaving: "Up to ~$31,000",
    notes: "Must be principal place of residence. Off-the-plan stamp duty concessions also available on certain new/refurbished apartments.",
    highlight: false,
  },
  {
    state: "QLD",
    flag: "Queensland",
    exemptionThreshold: "Full exemption on homes up to $700,000; land only up to $350,000",
    concessionThreshold: "Concession tapers for homes $700,000–$800,000; land $350,000–$450,000",
    maxSaving: "Up to ~$22,260 on a $700K home",
    notes: "Off-the-plan concession available — duty calculated on contract price rather than completed value. Applies to new dwellings only.",
    highlight: false,
  },
  {
    state: "SA",
    flag: "South Australia",
    exemptionThreshold: "Full exemption on new homes and off-the-plan purchases up to $650,000",
    concessionThreshold: "No partial concession above $650,000 — standard rates apply",
    maxSaving: "Full exemption on new builds; no concession on established",
    notes: "SA restricts the first home buyer concession to new homes and off-the-plan purchases. Buyers of established properties pay standard stamp duty rates.",
    highlight: false,
  },
  {
    state: "WA",
    flag: "Western Australia",
    exemptionThreshold: "Full exemption on established homes up to $430,000; new homes up to $530,000",
    concessionThreshold: "Concession tapers for established $430,000–$530,000; new homes $530,000–$630,000",
    maxSaving: "Up to ~$14,440 on a $430K established home",
    notes: "Western Australia operates separate thresholds for established and new homes — new homes attract a higher exemption limit.",
    highlight: false,
  },
  {
    state: "TAS",
    flag: "Tasmania",
    exemptionThreshold: "50% concession (not full exemption) on established homes up to $600,000",
    concessionThreshold: "50% concession also applies to new homes",
    maxSaving: "Up to ~$11,640 saving on a $600K home",
    notes: "Tasmania does not offer a full exemption — the standard concession is 50% off the applicable duty. Lower property prices mean the total stamp duty burden is lower than mainland capitals.",
    highlight: false,
  },
  {
    state: "NT",
    flag: "Northern Territory",
    exemptionThreshold: "Effective full exemption on homes up to $650,000 (principal residence)",
    concessionThreshold: "Full exemption on new or off-the-plan properties up to $900,000",
    maxSaving: "Up to ~$23,928",
    notes: "The Territory Home Bonus Scheme provides an additional $10,000 rebate toward stamp duty for new home purchases. The principal residence concession is broadly available, not restricted to first home buyers.",
    highlight: false,
  },
  {
    state: "ACT",
    flag: "Australian Capital Territory",
    exemptionThreshold: "No stamp duty for eligible first home buyers on homes up to $1,000,000 (2025 FHDB scheme)",
    concessionThreshold: "Income-tested: singles earning under $160,000 / couples under $190,000",
    maxSaving: "Up to ~$36,400 on a $1M property",
    notes: "The ACT replaced its traditional FHOG with the First Home Buyer Duty Concession (FHDC) and, from 2025, the enhanced First Home Duty Benefit (FHDB). The ACT does not levy stamp duty at all for eligible FHBs under the income threshold.",
    highlight: false,
  },
];

const WORKED_EXAMPLES = [
  {
    state: "VIC",
    scenario: "$620,000 apartment (Melbourne)",
    fullDuty: "~$32,440",
    fhbDuty: "~$16,220",
    saving: "~$16,220",
    explanation: "VIC provides a 50% concession for first home buyers between $600,000 and $750,000. The property is in the concession band, so duty is halved — saving just over $16,000 compared to paying full rate.",
  },
  {
    state: "QLD",
    scenario: "$680,000 house (Brisbane)",
    fullDuty: "~$22,260",
    fhbDuty: "$0",
    saving: "~$22,260",
    explanation: "QLD first home buyers are fully exempt under $700,000. This Brisbane purchase sits just under the threshold, resulting in a $0 stamp duty bill and a saving of over $22,000.",
  },
  {
    state: "NSW",
    scenario: "$750,000 apartment (Sydney)",
    fullDuty: "~$28,490",
    fhbDuty: "$0",
    saving: "~$28,490",
    explanation: "NSW first home buyers are fully exempt up to $800,000. This property qualifies for a full exemption. Alternatively, the buyer could opt for the annual property tax ($400 + 0.3% of land value) instead of stamp duty.",
  },
  {
    state: "NSW",
    scenario: "$950,000 house (Sydney)",
    fullDuty: "~$37,990",
    fhbDuty: "~$8,396",
    saving: "~$29,594",
    explanation: "NSW: Above the $800,000 full exemption threshold but below $1,000,000 concession limit. A tapered concession reduces duty — the saving is still almost $30,000 compared to a non-FHB buyer. The annual property tax option may also be attractive here: $400 + 0.3% of land value per year (typically ~$2,000–$3,500/year for this price range).",
  },
];

const OTP_STATES = [
  {
    state: "NSW",
    concession: "Standard FHB exemption applies at contract date, not settlement — protects buyers from value increases before completion.",
    dutyBase: "Contract price (at date of exchange)",
  },
  {
    state: "VIC",
    concession: "Separate off-the-plan stamp duty concession — duty calculated on base value before construction. Applies to apartments and townhouses.",
    dutyBase: "Land value + cost of construction completed at date of contract",
  },
  {
    state: "QLD",
    concession: "Off-the-plan concession available for new dwellings — stamp duty calculated on land value plus construction work already completed at the time of contract.",
    dutyBase: "Contract price less construction costs yet to be incurred",
  },
  {
    state: "SA",
    concession: "Full exemption for off-the-plan and new builds under $650,000 — the primary concession in SA is off-the-plan focused.",
    dutyBase: "Contract price",
  },
  {
    state: "WA",
    concession: "New home threshold is higher ($530,000 vs $430,000 established) — off-the-plan buyers benefit from the elevated concession band.",
    dutyBase: "Contract price",
  },
];

const FAQS = [
  {
    q: "Do I pay stamp duty on a first home in every state?",
    a: "No — if your purchase price is below your state's exemption threshold, you pay zero stamp duty. In NSW, VIC, QLD, WA, and ACT, first home buyers can pay nothing if the purchase price is below the relevant cut-off ($800,000 in NSW, $600,000 in VIC, $700,000 in QLD, $430,000 established or $530,000 new in WA, and $1,000,000 in ACT for income-eligible buyers). Tasmania offers a 50% concession rather than full exemption. SA restricts concessions to new homes only. NT offers an effective full exemption up to $650,000 for principal residences.",
  },
  {
    q: "How is stamp duty calculated?",
    a: "Stamp duty is calculated using progressive brackets — similar to income tax. Each state publishes its own rate schedule. A base amount applies to the bracket floor, and a marginal rate applies to the excess above that floor. For example, in NSW, a non-FHB buying at $800,000 would pay: $13,490 (base for the $300,001–$1,000,000 band) plus 4.5% of the amount over $300,000 ($500,000 x 4.5% = $22,500), totalling approximately $35,990. First home buyer concessions then reduce or eliminate this figure. Each state revenue office provides a free online calculator — always use the official calculator for accurate figures.",
  },
  {
    q: "Can I add stamp duty to my home loan?",
    a: "In most circumstances, no — stamp duty must be paid upfront at settlement and cannot be included in the home loan principal. This is why stamp duty is counted as a separate upfront cost you need to save, alongside your deposit. However, some lenders do allow stamp duty to be capitalised into the loan under specific circumstances (for example, if your deposit is large enough to keep the LVR below 80% even after including stamp duty). This varies by lender and scenario. Ask your mortgage broker whether this is possible in your situation.",
  },
  {
    q: "What is the NSW annual property tax and should I choose it?",
    a: "From January 2023, eligible NSW first home buyers purchasing for under $1.5M can choose an annual property tax ($400 plus 0.3% of land value per year) instead of paying stamp duty upfront. The tax is ongoing and moves with the property at sale. The break-even point is typically 7–10 years depending on land value. If you plan to sell within 5–7 years, the annual property tax is usually cheaper in total. If you plan to hold the property for 20+ years, paying stamp duty upfront is cheaper over the long run. Example: $800,000 property with $500,000 land value: annual property tax = $400 + $1,500 = $1,900 per year. If that property also qualifies for the NSW FHB full exemption (under $800,000), the stamp duty bill is already $0 — making the choice less significant for sub-$800K buyers.",
  },
  {
    q: "Does stamp duty apply to off-the-plan purchases?",
    a: "Yes, stamp duty applies to off-the-plan purchases — but the amount can be significantly reduced because duty is calculated on the contract price at the date of exchange, not the completed value. If you sign a contract when only the land value and partial construction costs have been incurred, you may pay stamp duty on a lower base than the finished property's market value. Most state FHB concessions also apply to off-the-plan purchases. VIC has a specific off-the-plan concession that reduces stamp duty even further for new apartments and townhouses.",
  },
  {
    q: "Do I still pay stamp duty if I am buying with a partner who has owned before?",
    a: "Yes — if you are buying with a co-purchaser who has previously owned residential property in Australia, you will generally not be eligible for first home buyer stamp duty concessions. Most states require all purchasers on the contract to meet the first home buyer definition. If one applicant has previously owned a property, the purchase typically disqualifies the pair from the FHB concession and you pay standard (full) stamp duty rates. The rules vary slightly by state — for example, ACT has income-tested concessions that are not strictly limited to first home buyers. Always confirm with a solicitor or your state revenue office before assuming you qualify.",
  },
];

export default function StampDutyConcessionsPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "First Home Buyer", url: `${SITE_URL}/first-home-buyer` },
    { name: "Stamp Duty Concessions" },
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
            <span className="text-slate-200 font-medium">Stamp Duty Concessions</span>
          </nav>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-4">
            Stamp duty concessions for first home buyers ({CURRENT_YEAR})
          </h1>
          <p className="text-lg text-slate-300 leading-relaxed mb-8">
            Stamp duty (transfer duty) is one of the largest upfront costs when buying a home — often
            $15,000&ndash;$50,000 in major cities. Every state and territory offers first home buyer
            concessions or exemptions that can reduce this to zero. In NSW, you can also opt for an
            annual property tax instead of paying stamp duty at all.
          </p>

          {/* Key stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { stat: "Up to $36,400", label: "maximum saving (ACT)" },
              { stat: "$0 stamp duty", label: "for FHBs in most states under threshold" },
              { stat: "NSW option", label: "annual property tax from Jan 2023" },
              { stat: "8 states", label: "all offer first home buyer concessions" },
            ].map((item) => (
              <div key={item.stat} className="bg-white/10 rounded-xl p-4 text-center">
                <p className="text-lg font-extrabold text-amber-400 mb-1">{item.stat}</p>
                <p className="text-xs text-slate-300 leading-tight">{item.label}</p>
              </div>
            ))}
          </div>

          <p className="text-xs text-slate-500 mt-6">{UPDATED_LABEL} · Thresholds change — always verify at your state Revenue Office · Not legal or financial advice</p>
        </div>
      </section>

      {/* What is stamp duty */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">What is stamp duty?</h2>
          <p className="text-slate-600 leading-relaxed mb-4">
            Stamp duty — formally called transfer duty in most states — is a tax levied by state and
            territory governments when property changes hands. It is calculated on the purchase price
            (or market value, whichever is higher) and must be paid at or shortly after settlement. It
            is separate from your deposit and cannot typically be added to your home loan.
          </p>
          <p className="text-slate-600 leading-relaxed mb-6">
            On a $900,000 Sydney property without any concession, stamp duty is approximately $35,835.
            On a $700,000 Melbourne property without concession, it is around $37,070. These are
            significant costs that must be planned for — yet most first home buyers are entitled to
            substantial reductions or full exemptions, provided they buy within the right price range
            in their state.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                title: "Calculated on purchase price",
                detail: "Stamp duty uses the higher of the purchase price or the property's market value. Rates are progressive — the more expensive the property, the higher the marginal rate applied.",
              },
              {
                title: "Due at settlement",
                detail: "Unlike your deposit (paid on exchange), stamp duty is due at settlement or shortly after. You need to have this amount available in cash — it cannot be deferred in most cases.",
              },
              {
                title: "First home buyers get concessions",
                detail: "Every state offers exemptions or concessions for first home buyers. The saving can range from a few thousand dollars to a complete $0 stamp duty bill, depending on your state and purchase price.",
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

      {/* State-by-state concessions — summary table */}
      <section className="py-10 border-b border-slate-100 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">State-by-state concessions at a glance</h2>
          <p className="text-sm text-slate-500 mb-5">Quick-reference table. Full detail for each state is in the section below.</p>
          <div className="rounded-xl border border-slate-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-900">
                  <th className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide whitespace-nowrap">State</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-emerald-300 uppercase tracking-wide whitespace-nowrap">Full exemption threshold</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-amber-300 uppercase tracking-wide whitespace-nowrap">Concession / partial relief</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide whitespace-nowrap">Key notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {[
                  { state: "NSW", exempt: "Up to $800,000", concession: "$800K–$1M tapered", note: "Or opt for annual property tax" },
                  { state: "VIC", exempt: "Up to $600,000", concession: "50% off $600K–$750K", note: "Principal place of residence" },
                  { state: "QLD", exempt: "Home up to $700,000; land up to $350K", concession: "Tapers to $800K (home)", note: "Off-the-plan concession available" },
                  { state: "SA", exempt: "New homes up to $650,000 only", concession: "None above — standard rates", note: "Established homes: full standard duty" },
                  { state: "WA", exempt: "Established up to $430K; new up to $530K", concession: "Tapers to $530K / $630K", note: "Separate thresholds new vs established" },
                  { state: "TAS", exempt: "50% concession (not full) up to $600K", concession: "50% concession on all homes", note: "No full exemption in TAS" },
                  { state: "NT", exempt: "Effective full exemption up to $650K", concession: "Up to $900K new/off-plan", note: "Territory Home Bonus $10K rebate" },
                  { state: "ACT", exempt: "Up to $1,000,000 (income-tested 2025 FHDB)", concession: "Income test: single <$160K / couple <$190K", note: "ACT has no FHOG — stamp duty relief is the primary benefit" },
                ].map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-bold text-slate-900 whitespace-nowrap">{row.state}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-emerald-700 leading-relaxed">{row.exempt}</td>
                    <td className="px-4 py-3 text-xs text-amber-700 leading-relaxed">{row.concession}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 leading-relaxed">{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400 mt-3">
            All thresholds are indicative for {CURRENT_YEAR}. Verify at your state revenue office before budgeting. Rules for new vs established homes differ.
          </p>
        </div>
      </section>

      {/* Detailed state breakdowns */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Detailed state-by-state breakdown</h2>
          <p className="text-sm text-slate-500 mb-6">
            Exemption thresholds, concession bands, maximum savings, and important notes for each state and territory.
          </p>
          <div className="space-y-4">
            {STATE_CONCESSIONS.map((s, i) => (
              <div key={i} className={`rounded-xl border overflow-hidden ${s.highlight ? "border-amber-300" : "border-slate-200"}`}>
                <div className={`px-5 py-3 flex items-center justify-between ${s.highlight ? "bg-amber-900" : "bg-slate-900"}`}>
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-extrabold text-white">{s.state}</p>
                    <p className="text-xs text-slate-400 hidden sm:block">{s.flag}</p>
                    {s.highlight && (
                      <span className="text-[10px] font-bold bg-amber-400 text-slate-900 px-2 py-0.5 rounded-full uppercase tracking-wide">
                        Annual tax option
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-amber-300 font-semibold whitespace-nowrap">{s.maxSaving}</p>
                </div>
                <div className="p-5 grid sm:grid-cols-2 gap-4 bg-white">
                  <div>
                    <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide mb-1">Full exemption</p>
                    <p className="text-sm text-slate-700 leading-relaxed">{s.exemptionThreshold}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-1">Partial concession band</p>
                    <p className="text-sm text-slate-700 leading-relaxed">{s.concessionThreshold}</p>
                  </div>
                  <div className="sm:col-span-2 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                    <p className="text-xs text-slate-600 leading-relaxed"><strong>Note:</strong> {s.notes}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-4">
            Verify current thresholds: Revenue NSW (nsw.gov.au), State Revenue Office VIC (sro.vic.gov.au), Queensland Revenue Office, RevenueSA, Department of Finance WA, TasRevenue, NT Treasury, ACT Revenue Office.
          </p>
        </div>
      </section>

      {/* NSW Spotlight — annual property tax */}
      <section className="py-10 border-b border-slate-100 bg-amber-50">
        <div className="container-custom max-w-4xl">
          <div className="flex items-start gap-3 mb-4">
            <div className="shrink-0 w-8 h-8 rounded-full bg-amber-500 text-slate-900 font-extrabold text-xs flex items-center justify-center mt-0.5">NSW</div>
            <h2 className="text-2xl font-extrabold text-slate-900">NSW spotlight: the annual property tax option</h2>
          </div>
          <p className="text-slate-600 leading-relaxed mb-6">
            From 16 January 2023, NSW first home buyers purchasing a property for $1.5 million or less can
            choose between two approaches to stamp duty:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <p className="font-extrabold text-slate-900 mb-3 text-sm uppercase tracking-wide text-amber-700">Option A: Traditional stamp duty (upfront)</p>
              <ul className="space-y-2 text-sm">
                <li className="flex gap-3 items-start">
                  <span className="shrink-0 w-4 h-4 mt-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold flex items-center justify-center">+</span>
                  <span className="text-slate-700">One-off payment at settlement — nothing ongoing</span>
                </li>
                <li className="flex gap-3 items-start">
                  <span className="shrink-0 w-4 h-4 mt-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold flex items-center justify-center">+</span>
                  <span className="text-slate-700">Cheaper in total if you hold the property for 20+ years</span>
                </li>
                <li className="flex gap-3 items-start">
                  <span className="shrink-0 w-4 h-4 mt-0.5 rounded-full bg-red-100 text-red-500 text-[10px] font-bold flex items-center justify-center">−</span>
                  <span className="text-slate-700">Can be $15,000–$50,000+ upfront cash required at settlement</span>
                </li>
                <li className="flex gap-3 items-start">
                  <span className="shrink-0 w-4 h-4 mt-0.5 rounded-full bg-red-100 text-red-500 text-[10px] font-bold flex items-center justify-center">−</span>
                  <span className="text-slate-700">$0 for FHBs under $800K — but above that, significant cost</span>
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-xl border border-amber-200 p-5">
              <p className="font-extrabold text-slate-900 mb-3 text-sm uppercase tracking-wide text-amber-700">Option B: Annual property tax (ongoing)</p>
              <ul className="space-y-2 text-sm">
                <li className="flex gap-3 items-start">
                  <span className="shrink-0 w-4 h-4 mt-0.5 rounded-full bg-emerald-100 text-emerald-600 text-[10px] font-bold flex items-center justify-center">+</span>
                  <span className="text-slate-700">$400 base + 0.3% of land value per year — far lower upfront</span>
                </li>
                <li className="flex gap-3 items-start">
                  <span className="shrink-0 w-4 h-4 mt-0.5 rounded-full bg-emerald-100 text-emerald-600 text-[10px] font-bold flex items-center justify-center">+</span>
                  <span className="text-slate-700">Better cash flow — frees deposit savings for the loan itself</span>
                </li>
                <li className="flex gap-3 items-start">
                  <span className="shrink-0 w-4 h-4 mt-0.5 rounded-full bg-emerald-100 text-emerald-600 text-[10px] font-bold flex items-center justify-center">+</span>
                  <span className="text-slate-700">Usually cheaper in total if you sell within 7–10 years</span>
                </li>
                <li className="flex gap-3 items-start">
                  <span className="shrink-0 w-4 h-4 mt-0.5 rounded-full bg-red-100 text-red-500 text-[10px] font-bold flex items-center justify-center">−</span>
                  <span className="text-slate-700">Ongoing obligation — rises if land value increases over time</span>
                </li>
              </ul>
            </div>
          </div>

          {/* NSW worked example */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4">
            <p className="font-extrabold text-slate-900 mb-3 text-sm">Worked example: $900,000 Sydney property, land value $550,000</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500 mb-1">Stamp duty (no FHB concession)</p>
                <p className="font-extrabold text-slate-900">~$35,835</p>
                <p className="text-xs text-slate-400">one-off at settlement</p>
              </div>
              <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
                <p className="text-xs text-slate-500 mb-1">Stamp duty (FHB concession)</p>
                <p className="font-extrabold text-amber-700">~$6,335</p>
                <p className="text-xs text-slate-400">tapered between $800K–$1M</p>
              </div>
              <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-100">
                <p className="text-xs text-slate-500 mb-1">Annual property tax (FHB)</p>
                <p className="font-extrabold text-emerald-700">$400 + $1,650 = $2,050/yr</p>
                <p className="text-xs text-slate-400">~3 years to match $6,335</p>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-3">
              In this example: the annual property tax breaks even with the FHB stamp duty concession in about 3 years. If you plan to hold longer than 3 years, paying stamp duty upfront is cheaper. If you are uncertain about your timeline, the annual tax offers flexibility and preserves cash.
            </p>
          </div>

          <div className="bg-amber-100 border border-amber-200 rounded-xl p-4">
            <p className="text-xs text-slate-700 leading-relaxed">
              <strong>Important:</strong> Under $800,000 in NSW, first home buyers pay $0 stamp duty — the annual property tax is still an option but the break-even calculus changes significantly when the alternative upfront cost is already nil. Discuss the choice with your solicitor or financial adviser before committing.
            </p>
          </div>
        </div>
      </section>

      {/* Worked examples */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Worked examples — how much can first home buyers save?</h2>
          <p className="text-sm text-slate-500 mb-6">
            Concrete examples across different states and price points. All figures are approximate — use
            your state revenue office calculator for an accurate amount.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {WORKED_EXAMPLES.map((ex, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-900 px-5 py-3 flex items-center justify-between">
                  <p className="text-sm font-bold text-white">{ex.scenario}</p>
                  <span className="text-xs font-bold bg-white/20 text-white px-2 py-0.5 rounded-full">{ex.state}</span>
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-3 gap-3 mb-4 text-center">
                    <div className="bg-red-50 rounded-lg p-2">
                      <p className="text-[10px] text-slate-500 mb-0.5">Full rate</p>
                      <p className="font-extrabold text-red-700 text-sm">{ex.fullDuty}</p>
                    </div>
                    <div className="bg-emerald-50 rounded-lg p-2">
                      <p className="text-[10px] text-slate-500 mb-0.5">FHB rate</p>
                      <p className={`font-extrabold text-sm ${ex.fhbDuty === "$0" ? "text-emerald-700" : "text-amber-700"}`}>{ex.fhbDuty}</p>
                    </div>
                    <div className="bg-amber-50 rounded-lg p-2">
                      <p className="text-[10px] text-slate-500 mb-0.5">Saving</p>
                      <p className="font-extrabold text-amber-700 text-sm">{ex.saving}</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{ex.explanation}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-4">
            Stamp duty figures are approximate and for illustrative purposes. Exact amounts depend on purchase price, property type, and current state thresholds. Always use your state revenue office calculator.
          </p>
        </div>
      </section>

      {/* Off-the-plan */}
      <section className="py-10 border-b border-slate-100 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Off-the-plan stamp duty concessions</h2>
          <p className="text-slate-600 leading-relaxed mb-6">
            Purchasing off-the-plan — signing a contract before the property is completed — can reduce your
            stamp duty bill in most states. The key reason: stamp duty is usually calculated on the value of
            the property <strong>at the date of the contract</strong>, not at completion. If the property
            appreciates in value between signing and settlement (common with new builds over 12&ndash;24 months),
            the stamp duty base is lower than the completed market value.
          </p>
          <div className="rounded-xl border border-slate-200 overflow-x-auto mb-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-900">
                  <th className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide">State</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-amber-300 uppercase tracking-wide">Off-the-plan concession</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide whitespace-nowrap">Duty calculated on</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {OTP_STATES.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-bold text-slate-900 whitespace-nowrap">{row.state}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 leading-relaxed">{row.concession}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 leading-relaxed">{row.dutyBase}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
            <p className="text-xs text-slate-700 leading-relaxed">
              <strong>Watch out for:</strong> Some states have wound back off-the-plan investor concessions in recent years — these changes do not necessarily affect first home buyer off-the-plan concessions, but always confirm the current rules with your solicitor or conveyancer before exchange. Off-the-plan purchases also carry completion risk — verify the developer&apos;s track record and financial position.
            </p>
          </div>
        </div>
      </section>

      {/* Foreign buyer surcharges */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">Foreign purchaser surcharges</h2>
          <p className="text-slate-600 leading-relaxed mb-5">
            If you are a foreign person under your state&apos;s definition — which varies by state and does not
            simply mean &quot;not an Australian citizen&quot; — you will pay an additional stamp duty surcharge on
            top of the standard rate. This applies even to permanent residents in some states.
          </p>
          <div className="rounded-xl border border-slate-200 overflow-x-auto mb-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-900">
                  <th className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide">State</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-red-300 uppercase tracking-wide whitespace-nowrap">Foreign purchaser surcharge</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {[
                  { state: "NSW", surcharge: "8%", note: "Applies to foreign persons (not NZ citizens via SCV visa)" },
                  { state: "VIC", surcharge: "8%", note: "One of the highest surcharges in Australia" },
                  { state: "QLD", surcharge: "7%", note: "Additional foreign acquirer duty" },
                  { state: "SA", surcharge: "7%", note: "Foreign purchaser additional duty" },
                  { state: "WA", surcharge: "7%", note: "Foreign transfer duty surcharge" },
                  { state: "TAS", surcharge: "Nil", note: "No foreign purchaser surcharge in Tasmania" },
                  { state: "NT", surcharge: "Nil", note: "No foreign purchaser surcharge in NT" },
                  { state: "ACT", surcharge: "Nil", note: "No specific foreign purchaser surcharge" },
                ].map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-bold text-slate-900 whitespace-nowrap">{row.state}</td>
                    <td className={`px-4 py-3 text-xs font-semibold whitespace-nowrap ${row.surcharge === "Nil" ? "text-slate-400" : "text-red-700"}`}>{row.surcharge}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 leading-relaxed">{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="bg-red-50 border border-red-100 rounded-xl p-4">
            <p className="text-xs text-slate-700 leading-relaxed">
              <strong>Who counts as a &quot;foreign person&quot;?</strong> Each state has its own definition. Generally it includes foreign citizens and foreign corporations, but may also include permanent residents in some states, or those on certain visa types. Even an Australian permanent resident who has not obtained citizenship may be classed as a foreign person for stamp duty surcharge purposes. If your residency status is not straightforward, get legal advice before exchange — the surcharge can add tens of thousands of dollars to your purchase cost.
            </p>
          </div>
        </div>
      </section>

      {/* How stamp duty is calculated */}
      <section className="py-10 border-b border-slate-100 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">How stamp duty is calculated — progressive brackets</h2>
          <p className="text-slate-600 leading-relaxed mb-5">
            Stamp duty uses a tiered (progressive) structure — you pay a base amount for the bracket your
            property sits in, plus a marginal rate on the portion above the lower bracket boundary. This is
            similar to how income tax brackets work.
          </p>
          <div className="bg-white rounded-xl border border-slate-200 p-5 mb-5">
            <p className="font-extrabold text-slate-900 mb-3 text-sm">Example: NSW non-FHB rate for a $700,000 property</p>
            <div className="space-y-2 text-sm mb-4">
              {[
                { label: "First $14,000", rate: "1.25%", amount: "$175" },
                { label: "$14,001–$30,000", rate: "1.5%", amount: "$240" },
                { label: "$30,001–$80,000", rate: "1.75%", amount: "$875" },
                { label: "$80,001–$300,000", rate: "3.5%", amount: "$7,700" },
                { label: "$300,001–$700,000 (i.e. $400,000)", rate: "4.5%", amount: "$18,000" },
              ].map((row, i) => (
                <div key={i} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                  <span className="text-slate-600 text-xs">{row.label}</span>
                  <span className="text-slate-500 text-xs">@ {row.rate}</span>
                  <span className="font-semibold text-slate-900 text-xs">{row.amount}</span>
                </div>
              ))}
              <div className="flex items-center justify-between bg-slate-900 rounded-lg px-3 py-2">
                <span className="text-white text-xs font-bold">Total (non-FHB)</span>
                <span className="text-amber-300 text-xs font-bold">~$26,990</span>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Under the NSW first home buyer exemption (full exemption up to $800,000), this $700,000 property would cost $0 in stamp duty — a saving of ~$26,990.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { title: "Use official calculators", detail: "Every state revenue office has a free online stamp duty calculator. These are always up to date and include concession calculations. Use them — they take 30 seconds and give you an exact figure." },
              { title: "Ask your solicitor", detail: "Your conveyancer or solicitor will confirm the exact stamp duty applicable to your contract as part of their work before settlement. They will also apply any FHB concession forms on your behalf." },
              { title: "Budget separately", detail: "Treat stamp duty as a separate upfront cost from your deposit. Even with a full FHB exemption, confirm this before signing — eligibility has conditions that must be met." },
            ].map((card, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-xl p-4">
                <p className="font-bold text-slate-900 mb-2 text-sm">{card.title}</p>
                <p className="text-xs text-slate-600 leading-relaxed">{card.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-10 border-b border-slate-100">
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
      <section className="py-8 border-b border-slate-100 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <h2 className="text-xl font-extrabold text-slate-900 mb-4">Related guides</h2>
          <div className="flex flex-wrap gap-3">
            {[
              { href: "/first-home-buyer", label: "First home buyer hub" },
              { href: "/first-home-buyer/grants", label: "First Home Owner Grants" },
              { href: "/first-home-buyer/fhss-guide", label: "FHSS guide" },
              { href: "/first-home-buyer/first-home-guarantee", label: "First Home Guarantee" },
              { href: "/first-home-buyer/deposit-guide", label: "Saving your deposit" },
              { href: "/first-home-buyer/shared-equity", label: "Shared equity schemes" },
              { href: "/advisors/mortgage-brokers", label: "Find a mortgage broker" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-4 py-2 bg-white border border-slate-200 rounded-full text-sm font-semibold text-slate-700 hover:border-amber-300 hover:text-amber-700 transition-colors"
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
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-[11px] text-slate-500 leading-relaxed">
              <strong>General advice warning.</strong> {GENERAL_ADVICE_WARNING} Stamp duty thresholds, first home buyer concessions, off-the-plan rules, and foreign purchaser surcharges are set by state and territory governments and change regularly. The NSW annual property tax option, ACT FHDB scheme, and all state concession thresholds listed on this page are indicative for {CURRENT_YEAR} and may have since changed. Always verify current figures directly with your state or territory Revenue Office before signing a contract or budgeting for a purchase. This page is general information only and is not legal, financial, tax, or conveyancing advice. Consult a licensed solicitor or conveyancer for stamp duty advice on your specific transaction.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
