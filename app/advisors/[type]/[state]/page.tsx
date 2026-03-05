import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Professional, ProfessionalType } from "@/lib/types";
import type { Metadata } from "next";
import { PROFESSIONAL_TYPE_LABELS, AU_STATES } from "@/lib/types";
import { absoluteUrl, breadcrumbJsonLd, CURRENT_YEAR } from "@/lib/seo";
import AdvisorsClient from "../../AdvisorsClient";

export const revalidate = 1800;

const SLUG_TO_TYPE: Record<string, ProfessionalType> = {
  "smsf-accountants": "smsf_accountant",
  "financial-planners": "financial_planner",
  "property-advisors": "property_advisor",
  "tax-agents": "tax_agent",
  "mortgage-brokers": "mortgage_broker",
  "estate-planners": "estate_planner",
};

const STATE_NAMES: Record<string, string> = {
  nsw: "New South Wales",
  vic: "Victoria",
  qld: "Queensland",
  wa: "Western Australia",
  sa: "South Australia",
  tas: "Tasmania",
  act: "Australian Capital Territory",
  nt: "Northern Territory",
};

export function generateStaticParams() {
  const params: { type: string; state: string }[] = [];
  for (const type of Object.keys(SLUG_TO_TYPE)) {
    for (const state of Object.keys(STATE_NAMES)) {
      params.push({ type, state });
    }
  }
  return params;
}

export async function generateMetadata({ params }: { params: Promise<{ type: string; state: string }> }): Promise<Metadata> {
  const { type: typeSlug, state: stateSlug } = await params;
  const professionalType = SLUG_TO_TYPE[typeSlug];
  const stateName = STATE_NAMES[stateSlug.toLowerCase()];
  const stateCode = stateSlug.toUpperCase();
  if (!professionalType || !stateName) return {};

  const label = PROFESSIONAL_TYPE_LABELS[professionalType];
  const title = `${label}s in ${stateName} (${CURRENT_YEAR})`;
  const description = `Find verified ${label.toLowerCase()}s in ${stateName}. Compare qualifications, fees, specialties, and request a free consultation.`;

  return {
    title,
    description,
    openGraph: { title: `${label}s in ${stateCode} — Invest.com.au`, description },
    twitter: { card: "summary" },
    alternates: { canonical: `/advisors/${typeSlug}/${stateSlug}` },
  };
}

export default async function AdvisorTypeStatePage({ params }: { params: Promise<{ type: string; state: string }> }) {
  const { type: typeSlug, state: stateSlug } = await params;
  const professionalType = SLUG_TO_TYPE[typeSlug];
  const stateName = STATE_NAMES[stateSlug.toLowerCase()];
  const stateCode = stateSlug.toUpperCase();
  if (!professionalType || !stateName) notFound();

  const supabase = await createClient();
  const { data: professionals } = await supabase
    .from("professionals")
    .select("*")
    .eq("status", "active")
    .eq("type", professionalType)
    .eq("location_state", stateCode)
    .order("verified", { ascending: false })
    .order("rating", { ascending: false });

  const label = PROFESSIONAL_TYPE_LABELS[professionalType];

  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Find an Advisor", url: absoluteUrl("/advisors") },
    { name: `${label}s`, url: absoluteUrl(`/advisors/${typeSlug}`) },
    { name: stateName },
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <AdvisorsClient
        professionals={(professionals as Professional[]) || []}
        initialType={professionalType}
        initialState={stateCode}
        pageTitle={`${label}s in ${stateName}`}
        pageDescription={`Verified ${label.toLowerCase()}s in ${stateName}. Request a free consultation — no obligation.`}
      />
    </>
  );
}
