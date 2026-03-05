import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Professional, ProfessionalType } from "@/lib/types";
import type { Metadata } from "next";
import { PROFESSIONAL_TYPE_LABELS, AU_STATES } from "@/lib/types";
import { absoluteUrl, breadcrumbJsonLd, CURRENT_YEAR } from "@/lib/seo";
import AdvisorsClient from "../AdvisorsClient";

export const revalidate = 1800;

const SLUG_TO_TYPE: Record<string, ProfessionalType> = {
  "smsf-accountants": "smsf_accountant",
  "financial-planners": "financial_planner",
  "property-advisors": "property_advisor",
  "tax-agents": "tax_agent",
  "mortgage-brokers": "mortgage_broker",
  "estate-planners": "estate_planner",
};

const TYPE_DESCRIPTIONS: Record<string, string> = {
  "smsf-accountants": "Compare verified SMSF accountants across Australia. Specialists in SMSF setup, compliance, audit, and tax planning.",
  "financial-planners": "Find a qualified financial planner for retirement planning, wealth management, super consolidation, and investment strategy.",
  "property-advisors": "Browse property investment advisors who can help with investment property analysis, SMSF property, and portfolio construction.",
  "tax-agents": "Find tax agents specialising in investment tax, CGT optimisation, crypto tax, and complex investment structures.",
  "mortgage-brokers": "Compare mortgage brokers for investment property loans, refinancing, and home loan structuring.",
  "estate-planners": "Find estate planning specialists for wills, trusts, succession planning, and intergenerational wealth transfer.",
};

export function generateStaticParams() {
  return Object.keys(SLUG_TO_TYPE).map((type) => ({ type }));
}

export async function generateMetadata({ params }: { params: Promise<{ type: string }> }): Promise<Metadata> {
  const { type: typeSlug } = await params;
  const professionalType = SLUG_TO_TYPE[typeSlug];
  if (!professionalType) return {};

  const label = PROFESSIONAL_TYPE_LABELS[professionalType];
  const title = `Best ${label}s in Australia (${CURRENT_YEAR}) — Find & Compare`;
  const description = TYPE_DESCRIPTIONS[typeSlug] || `Find verified ${label.toLowerCase()}s across Australia. Free consultation requests.`;

  return {
    title,
    description,
    openGraph: { title: `${label}s — Invest.com.au`, description },
    twitter: { card: "summary_large_image" },
    alternates: { canonical: `/advisors/${typeSlug}` },
  };
}

export default async function AdvisorTypePage({ params }: { params: Promise<{ type: string }> }) {
  const { type: typeSlug } = await params;
  const professionalType = SLUG_TO_TYPE[typeSlug];
  if (!professionalType) notFound();

  const supabase = await createClient();
  const { data: professionals } = await supabase
    .from("professionals")
    .select("*")
    .eq("status", "active")
    .eq("type", professionalType)
    .order("verified", { ascending: false })
    .order("rating", { ascending: false });

  const label = PROFESSIONAL_TYPE_LABELS[professionalType];

  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Find an Advisor", url: absoluteUrl("/advisors") },
    { name: `${label}s` },
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <AdvisorsClient
        professionals={(professionals as Professional[]) || []}
        initialType={professionalType}
        pageTitle={`${label}s in Australia`}
        pageDescription={TYPE_DESCRIPTIONS[typeSlug]}
      />
    </>
  );
}
