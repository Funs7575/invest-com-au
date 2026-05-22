import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Professional, ProfessionalType } from "@/lib/types";
import type { Metadata } from "next";
import { PROFESSIONAL_TYPE_LABELS } from "@/lib/types";
import { absoluteUrl, breadcrumbJsonLd, CURRENT_YEAR } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import AdvisorsClient from "../../AdvisorsClient";

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
  if (!professionalType || !loc) return {};

  const label = PROFESSIONAL_TYPE_LABELS[professionalType];
  const title = `${label}s in ${loc.name} (${CURRENT_YEAR})`;
  const description = loc.isCity
    ? `Find verified ${label.toLowerCase()}s in ${loc.name}. Compare fees, read reviews, and request a free consultation with local professionals.`
    : `Find verified ${label.toLowerCase()}s in ${loc.name}. Compare qualifications, fees, specialties, and request a free consultation.`;

  return {
    title,
    description,
    openGraph: { title: `${label}s in ${loc.name}`, description },
    twitter: { card: "summary" },
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

  const advisorFaqLd = faqJsonLd([
    { q: `How do I find a verified ${label.toLowerCase()} in ${loc.name}?`, a: `Use the directory above to browse verified ${label.toLowerCase()}s in ${loc.name}. Each listing shows credentials, specialties, fees, and verified client reviews. You can request a free consultation directly through the platform — no obligation.` },
    { q: `How much does a ${label.toLowerCase()} charge in Australia?`, a: `Fees vary by advisor type and engagement model. Financial planners typically charge $2,000–$5,000 for a Statement of Advice; ongoing advice is $2,500–$8,000 per year. Mortgage brokers are usually paid by lenders (no fee to borrowers). Buyers' agents charge 1–3% of purchase price. SMSF accountants charge $1,500–$4,000 per year. Always ask for a fee disclosure document before engaging.` },
    { q: `What credentials should I check before hiring a ${label.toLowerCase()}?`, a: `Verify that financial planners and advisers hold an AFS Licence (AFSL) or are an authorised representative — check the ASIC Financial Advisers Register. Mortgage brokers must be licensed under the National Consumer Credit Protection Act and be members of MFAA or FBAA. Buyers' agents and real estate agents must hold a state real estate licence. SMSF accountants must be registered with the Tax Practitioners Board.` },
    { q: `How do I compare ${label.toLowerCase()}s in ${loc.name}?`, a: `Compare on: verified credentials (AFSL, licence number), years of experience, speciality alignment with your situation, fee structure (flat fee vs ongoing vs commission), client reviews, and availability. The listings above show all of these factors. Request an initial consultation (often free) with 2–3 advisors before deciding.` },
    { q: `Are ${label.toLowerCase()}s in Australia regulated?`, a: `Yes. Australia has one of the world's most comprehensive regulatory frameworks for financial advice. Financial advisers must pass the FASEA exam, hold relevant qualifications, and operate under an AFSL. Mortgage brokers are regulated by ASIC and must act in the best interests of borrowers. All professionals must comply with their relevant industry code of conduct and are subject to complaint processes via AFCA.` },
  ]);

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

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(advisorFaqLd) }} />
      <AdvisorsClient
        professionals={professionals}
        initialType={professionalType}
        initialState={loc.state}
        pageTitle={`${label}s in ${loc.name}`}
        pageDescription={pageDesc}
      />
    </>
  );
}
