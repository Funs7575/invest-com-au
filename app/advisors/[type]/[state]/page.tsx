import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Professional, ProfessionalType } from "@/lib/types";
import type { Metadata } from "next";
import { PROFESSIONAL_TYPE_LABELS } from "@/lib/types";
import { absoluteUrl, breadcrumbJsonLd, CURRENT_YEAR } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import AdvisorsClient from "../../AdvisorsClient";

type FaqItem = { q: string; a: string };

const PROFESSIONAL_TYPE_FAQS: Partial<Record<ProfessionalType, FaqItem[]>> = {
  financial_planner: [
    { q: "How much does a financial planner cost in Australia?", a: "Financial planners in Australia typically charge $3,000–$8,000 for an initial Statement of Advice (SOA), and $2,000–$5,000 per year for an ongoing service arrangement. Fee-for-service planners charge by the hour ($200–$500/hr) or flat project fee. Always ask for a Fee Disclosure Statement (FDS) upfront — planners are legally required to provide one before you engage." },
    { q: "What is the difference between a financial planner and a financial advisor?", a: "In Australia the terms are largely interchangeable, but 'financial planner' typically refers to a licensed professional who prepares a Statement of Advice (SOA) and provides ongoing portfolio/strategy advice. All must be registered on ASIC's Financial Advisers Register and hold an Australian Financial Services Licence (AFSL) or be an Authorised Representative of one. Check the ASIC register before engaging any adviser." },
    { q: "Do I need a financial planner?", a: "A financial planner adds most value at major life events: retirement planning, receiving an inheritance, starting or winding up an SMSF, divorce, or building a complex investment strategy. For straightforward situations (e.g. starting a share portfolio under $50,000), a robo-advisor or low-cost index fund approach may be sufficient. A free initial consultation with a planner can help you decide." },
    { q: "How do I verify a financial planner is licensed in Australia?", a: "Search ASIC's Financial Advisers Register at moneysmart.gov.au/financial-advice/check-your-financial-adviser. A legitimate financial planner must appear as a current Authorised Representative (AR) of an AFSL holder. Advisors listed on Invest.com.au are cross-checked against this register — their AFSL and AR number appear on each profile." },
  ],
  smsf_accountant: [
    { q: "What does an SMSF accountant do?", a: "An SMSF accountant handles compliance work for Self-Managed Super Funds: annual financial statements and tax returns (required by the ATO), coordination of the mandatory independent audit, member account balancing, and ensuring the fund meets ATO reporting obligations. Some SMSF accountants also provide investment strategy advice (if licensed) and wind-up services." },
    { q: "Is an SMSF accountant required by law?", a: "While you can technically prepare SMSF accounts yourself, ATO rules require: (1) an independent auditor to approve the fund's compliance each year, (2) an annual SMSF tax return lodged with the ATO. Most trustees hire a specialist SMSF accountant to prepare the accounts for auditing and lodge the return. Mistakes can result in ATO penalties — typically $220–$1,100 per shortfall or non-compliance notice." },
    { q: "How much does an SMSF accountant cost?", a: "SMSF accounting fees range from $1,500–$3,500 per year for a standard fund (2–4 members, equities only). Funds with property, borrowing (LRBA), or business real property are more complex and can cost $3,500–$6,000+. A separate mandatory audit costs $300–$900. Compare quotes from at least 2–3 SMSF accountants — price differences for the same service can exceed $1,000 per year." },
    { q: "What qualifications should an SMSF accountant have?", a: "Look for a CPA or CA-qualified accountant who is a member of the SMSF Association (SMSFA) or holds a Tax (Financial) Adviser registration. SMSF-specific experience matters more than general accounting credentials — ask how many SMSF funds they manage and whether they handle complex scenarios (property, LRBA, pensions). ATO-registered tax agents must appear on the Tax Practitioners Board register." },
  ],
  mortgage_broker: [
    { q: "What does a mortgage broker do?", a: "A mortgage broker acts as an intermediary between you and lenders. They compare home loan products across their lender panel (typically 20–50 lenders), help you apply, and manage the paperwork through to settlement. Unlike going directly to a bank, a broker can show you products from multiple institutions in one conversation. Brokers in Australia must be licensed under ASIC and hold a Credit Representative authorisation." },
    { q: "Does using a mortgage broker cost me anything?", a: "In most cases, mortgage brokers are free to borrowers. They earn an upfront commission from the lender (typically 0.5–0.7% of the loan amount) and a trailing commission (0.15–0.35% per year) while you hold the loan. Since the Royal Commission, brokers are legally required to act in your 'best interests' — not steer you toward the lender paying the highest commission." },
    { q: "Can a mortgage broker get a better rate than going direct?", a: "Often yes, for two reasons: (1) brokers know which lenders are running promotions or have discretionary rate-reduction authority, and (2) bulk-settlement volume sometimes gives them access to rates not advertised publicly. However, some lenders (e.g. ING, Macquarie) offer lower rates to direct customers. The comparison is worth making — a broker can run the numbers against publicly available products." },
    { q: "How do I verify a mortgage broker is licensed in Australia?", a: "All mortgage brokers must hold an Australian Credit Licence (ACL) or be a Credit Representative of an ACL holder. You can verify their licence status on ASIC Connect (search 'Professional Registers'). Also confirm they are a member of the Mortgage & Finance Association of Australia (MFAA) or Finance Brokers Association of Australia (FBAA), which require adherence to a code of conduct." },
  ],
  tax_agent: [
    { q: "What is the difference between an accountant and a tax agent?", a: "In Australia, only registered tax agents can charge fees to prepare and lodge tax returns on your behalf. Registration requires at minimum a recognised tax qualification and 1,000 hours of supervised experience. All registered tax agents must appear on the Tax Practitioners Board (TPB) register (search at tpb.gov.au). Not all accountants are registered tax agents — check the TPB register before engaging someone to prepare your return." },
    { q: "How much does a tax agent cost in Australia?", a: "Individual tax returns: $150–$500 depending on complexity. Investment property owners typically pay $300–$800. Business BAS lodgements: $200–$500 per quarter. SMSF tax returns: $1,500–$3,500 per year. Hourly rates range from $100–$350/hr. A tax agent's fee may itself be tax-deductible as a cost of managing your tax affairs (under Section 8-1 ITAA97)." },
    { q: "Can a tax agent help me with an ATO audit?", a: "Yes. Registered tax agents can represent you before the ATO, respond to audit queries, and manage the review process on your behalf. This is one of the key advantages over self-lodging — if the ATO questions a deduction, your agent can provide the supporting documentation and correspondence. Complex audits may require a tax lawyer or accountant specialising in disputes." },
    { q: "Do I need a tax agent if I use accounting software?", a: "Software like Xero or MYOB prepares the numbers but cannot lodge on your behalf — only a registered tax agent or business owner (self-lodging) can submit. Tax agents add value by identifying deductions you may have missed, ensuring your return complies with the current year's ATO rules, and representing you if the ATO has questions. For investment-heavy returns (shares, property, crypto), a specialist often pays for themselves." },
  ],
  property_advisor: [
    { q: "What does a property advisor do?", a: "A property advisor (also called a buyer's agent or buyers' advocate) researches and recommends investment properties on your behalf. Unlike real estate agents who represent vendors, a property advisor works exclusively for buyers. They assess rental yields, capital growth potential, vacancy rates, and local infrastructure plans. Some also negotiate the purchase price and manage due diligence. Fees: typically 1–3% of purchase price or $5,000–$20,000 flat." },
    { q: "Is a property advisor the same as a financial planner?", a: "No. A financial planner provides holistic financial strategy advice and must hold an AFSL. A property advisor (buyer's agent) focuses specifically on property selection and purchasing — they are licensed under a real estate agent licence in their state, not an AFSL. For advice on whether property suits your overall financial strategy, you need a financial planner; for help selecting and buying the right property, you need a property advisor or buyer's agent." },
    { q: "How do I know if a property advisor is giving conflicted advice?", a: "Some 'property advisors' earn referral commissions from developers for recommending off-the-plan properties — a significant conflict of interest. Warning signs: they only recommend new/off-the-plan properties, they steer you toward specific suburbs repeatedly, or they offer free advice (the commission must come from somewhere). Ask directly: 'Do you receive any referral fees or commissions from developers for properties you recommend?' A genuine buyer's advocate charges fees to you only." },
    { q: "What qualifications should a property advisor have in Australia?", a: "At a minimum, a buyer's agent must hold a real estate agent licence in the state where they practice (e.g. NSW Licensee in Charge, VIC Agent's Representative). Look for additional credentials: Property Investment Professionals of Australia (PIPA) membership and Qualified Property Investment Adviser (QPIA) designation demonstrate higher professional standards. Check their licence number with your state's real estate licensing authority." },
  ],
};

function getTypeOrFallback(type: ProfessionalType, label: string): FaqItem[] {
  return PROFESSIONAL_TYPE_FAQS[type] ?? [
    { q: `What qualifications should a ${label.toLowerCase()} have in Australia?`, a: `All ${label.toLowerCase()}s must hold a current licence or registration relevant to their service. Ask for their licence number and verify it with the appropriate regulator before engaging. Many professions require ASIC registration (financial advice), TPB registration (tax), or state licensing (real estate, mortgage).` },
    { q: `How much does a ${label.toLowerCase()} cost?`, a: `Fees vary widely depending on the complexity of your situation, the adviser's experience, and location. Always request a written fee estimate or schedule of fees upfront before engaging. Compare quotes from at least 2–3 advisers to understand the market rate.` },
    { q: `How do I find a trusted ${label.toLowerCase()} near me?`, a: `Start by verifying the adviser's registration with their regulatory body. Read client reviews and check whether they have been the subject of any regulatory findings (searchable on ASIC Connect or the TPB register). A free initial consultation is standard in many advisory professions — use it to assess fit before committing.` },
  ];
}

export const revalidate = 1800;

const SLUG_TO_TYPE: Record<string, ProfessionalType> = {
  "smsf-accountants": "smsf_accountant",
  "financial-planners": "financial_planner",
  "property-advisors": "property_advisor",
  "tax-agents": "tax_agent",
  "mortgage-brokers": "mortgage_broker",
  "estate-planners": "estate_planner",
  "insurance-brokers": "insurance_broker",
  "buyers-agents": "buyers_agent",
  "real-estate-agents": "real_estate_agent",
  "wealth-managers": "wealth_manager",
  "aged-care-advisors": "aged_care_advisor",
  "crypto-advisors": "crypto_advisor",
  "debt-counsellors": "debt_counsellor",
};

const STATE_NAMES: Record<string, string> = {
  nsw: "New South Wales", vic: "Victoria", qld: "Queensland",
  wa: "Western Australia", sa: "South Australia", tas: "Tasmania",
  act: "Australian Capital Territory", nt: "Northern Territory",
};

/* ─── City → State mapping for city-level pages ─── */
const CITY_MAP: Record<string, { name: string; state: string; suburbs: string[] }> = {
  sydney: { name: "Sydney", state: "NSW", suburbs: ["Sydney CBD", "North Sydney", "Parramatta", "Chatswood", "Hurstville", "Double Bay", "Ultimo", "Hornsby", "Bankstown", "Manly"] },
  melbourne: { name: "Melbourne", state: "VIC", suburbs: ["Melbourne CBD", "South Yarra", "Richmond", "Carlton", "Hawthorn", "Docklands", "Camberwell"] },
  brisbane: { name: "Brisbane", state: "QLD", suburbs: ["Fortitude Valley", "South Brisbane", "Toowong", "Spring Hill", "Newstead", "Milton"] },
  perth: { name: "Perth", state: "WA", suburbs: ["West Perth", "Cottesloe", "Subiaco", "Nedlands", "South Perth"] },
  adelaide: { name: "Adelaide", state: "SA", suburbs: ["Hyde Park", "Norwood", "Unley", "North Adelaide", "Glenelg"] },
  "gold-coast": { name: "Gold Coast", state: "QLD", suburbs: ["Surfers Paradise", "Broadbeach", "Robina", "Southport"] },
  canberra: { name: "Canberra", state: "ACT", suburbs: ["Kingston", "Braddon", "Barton", "Woden", "Belconnen"] },
  hobart: { name: "Hobart", state: "TAS", suburbs: ["Hobart CBD", "Sandy Bay", "Battery Point"] },
  darwin: { name: "Darwin", state: "NT", suburbs: ["Darwin CBD", "Stuart Park", "Parap"] },
  newcastle: { name: "Newcastle", state: "NSW", suburbs: ["Newcastle", "Hamilton", "Charlestown"] },
  wollongong: { name: "Wollongong", state: "NSW", suburbs: ["Wollongong", "Figtree"] },
  geelong: { name: "Geelong", state: "VIC", suburbs: ["Geelong", "Newtown"] },
  "sunshine-coast": { name: "Sunshine Coast", state: "QLD", suburbs: ["Maroochydore", "Noosa", "Caloundra"] },
  townsville: { name: "Townsville", state: "QLD", suburbs: ["Townsville", "Aitkenvale"] },
  cairns: { name: "Cairns", state: "QLD", suburbs: ["Cairns", "Edge Hill"] },
  toowoomba: { name: "Toowoomba", state: "QLD", suburbs: ["Toowoomba"] },
  ballarat: { name: "Ballarat", state: "VIC", suburbs: ["Ballarat"] },
  bendigo: { name: "Bendigo", state: "VIC", suburbs: ["Bendigo"] },
  launceston: { name: "Launceston", state: "TAS", suburbs: ["Launceston"] },
  "central-coast": { name: "Central Coast", state: "NSW", suburbs: ["Gosford", "Erina", "Terrigal"] },
};

function resolveLocation(slug: string): { isCity: boolean; name: string; state: string; suburbs?: string[] } | null {
  const lower = slug.toLowerCase();
  if (STATE_NAMES[lower]) return { isCity: false, name: STATE_NAMES[lower], state: lower.toUpperCase() };
  if (CITY_MAP[lower]) return { isCity: true, name: CITY_MAP[lower].name, state: CITY_MAP[lower].state, suburbs: CITY_MAP[lower].suburbs };
  return null;
}

export function generateStaticParams() {
  const params: { type: string; state: string }[] = [];
  for (const type of Object.keys(SLUG_TO_TYPE)) {
    for (const state of Object.keys(STATE_NAMES)) {
      params.push({ type, state });
    }
    for (const city of Object.keys(CITY_MAP)) {
      params.push({ type, state: city });
    }
  }
  return params;
}

export async function generateMetadata({ params }: { params: Promise<{ type: string; state: string }> }): Promise<Metadata> {
  const { type: typeSlug, state: locSlug } = await params;
  const professionalType = SLUG_TO_TYPE[typeSlug];
  const loc = resolveLocation(locSlug);
  if (!professionalType || !loc) return { robots: { index: false } };

  const label = PROFESSIONAL_TYPE_LABELS[professionalType];
  const title = `${label}s in ${loc.name} (${CURRENT_YEAR})`;
  const description = loc.isCity
    ? `Find verified ${label.toLowerCase()}s in ${loc.name}. Compare fees, read reviews, and request a free consultation with local professionals.`
    : `Find verified ${label.toLowerCase()}s in ${loc.name}. Compare qualifications, fees, specialties, and request a free consultation.`;

  return {
    title,
    description,
    openGraph: { title: `${label}s in ${loc.name}`, description, images: [{ url: `/api/og?title=${encodeURIComponent("Find " + label + "s in " + loc.name)}&sub=${encodeURIComponent("Compare · Verified · Free Consultation · " + CURRENT_YEAR)}`, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image" },
    alternates: { canonical: `/advisors/${typeSlug}/${locSlug}` },
  };
}

export default async function AdvisorTypeLocationPage({ params }: { params: Promise<{ type: string; state: string }> }) {
  const { type: typeSlug, state: locSlug } = await params;
  const professionalType = SLUG_TO_TYPE[typeSlug];
  const loc = resolveLocation(locSlug);
  if (!professionalType || !loc) notFound();

  const supabase = await createClient();
  const label = PROFESSIONAL_TYPE_LABELS[professionalType];

  let professionals: Professional[] = [];

  if (loc.isCity && loc.suburbs) {
    // City page: fetch advisors from matching suburbs in that state
    const { data } = await supabase
      .from("professionals")
      .select("*")
      .eq("status", "active")
      .eq("type", professionalType)
      .eq("location_state", loc.state)
      .in("location_suburb", loc.suburbs)
      .order("verified", { ascending: false })
      .order("rating", { ascending: false });
    professionals = (data as Professional[]) || [];

    // If no exact suburb matches, fall back to all in that state
    if (professionals.length === 0) {
      const { data: stateFallback } = await supabase
        .from("professionals")
        .select("*")
        .eq("status", "active")
        .eq("type", professionalType)
        .eq("location_state", loc.state)
        .order("verified", { ascending: false })
        .order("rating", { ascending: false });
      professionals = (stateFallback as Professional[]) || [];
    }
  } else {
    // State page: original behavior
    const { data } = await supabase
      .from("professionals")
      .select("*")
      .eq("status", "active")
      .eq("type", professionalType)
      .eq("location_state", loc.state)
      .order("verified", { ascending: false })
      .order("rating", { ascending: false });
    professionals = (data as Professional[]) || [];
  }

  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Find an Advisor", url: absoluteUrl("/advisors") },
    { name: `${label}s`, url: absoluteUrl(`/advisors/${typeSlug}`) },
    ...(loc.isCity
      ? [{ name: loc.state, url: absoluteUrl(`/advisors/${typeSlug}/${loc.state.toLowerCase()}`) }, { name: loc.name }]
      : [{ name: loc.name }]
    ),
  ]);

  const pageDesc = loc.isCity
    ? `Verified ${label.toLowerCase()}s in ${loc.name}. Compare fees, reviews & specialties — request a free consultation.`
    : `Verified ${label.toLowerCase()}s in ${loc.name}. Request a free consultation — no obligation.`;

  // ItemList of the local advisors, mirroring the FinancialService
  // ListItem shape used by /find-advisor/[location] so the location
  // ranking is citable by AI answer engines.
  const listLd = professionals.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${label}s in ${loc.name}`,
    numberOfItems: professionals.length,
    itemListElement: professionals.slice(0, 10).map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "FinancialService",
        name: p.name,
        description: p.bio?.slice(0, 200),
        address: { "@type": "PostalAddress", addressRegion: loc.state, addressCountry: "AU" },
      },
    })),
  } : null;

  const pageFaqs = getTypeOrFallback(professionalType, label);
  const faqLd = faqJsonLd(pageFaqs);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      {listLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(listLd) }} />}
      {faqLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />}
      <AdvisorsClient
        professionals={professionals}
        initialType={professionalType}
        initialState={loc.state}
        pageTitle={`${label}s in ${loc.name}`}
        pageDescription={pageDesc}
      />
      <div className="container-custom max-w-3xl pb-10">
        <section className="mt-10">
          <h2 className="text-xl font-extrabold text-slate-900 mb-5">Frequently asked questions</h2>
          <div className="space-y-3">
            {pageFaqs.map((faq) => (
              <details key={faq.q} className="group rounded-xl border border-slate-200 bg-slate-50">
                <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 font-semibold text-slate-900 list-none">
                  {faq.q}
                  <span className="shrink-0 text-slate-400 group-open:rotate-180 transition-transform" aria-hidden="true">▾</span>
                </summary>
                <p className="px-5 pb-5 text-sm text-slate-600 leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
