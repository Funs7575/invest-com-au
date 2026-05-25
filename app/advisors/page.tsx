import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { filterByCountryEligibility } from "@/lib/country-mode/eligibility-filter";
import type { Professional, AdvisorFirm } from "@/lib/types";
import type { Metadata } from "next";
import AdvisorsClient, { type ExpertTeamCard } from "./AdvisorsClient";
import HomeToolsStrip from "@/components/HomeToolsStrip";
import DirectoryBanners from "@/components/foreign-investment/DirectoryBanners";
import { absoluteUrl, breadcrumbJsonLd, CURRENT_YEAR } from "@/lib/seo";
import { faqJsonLd, speakableWebPageJsonLd } from "@/lib/schema-markup";
import { logger } from "@/lib/logger";

const log = logger("advisors-page");

export const revalidate = 1800;

export const metadata: Metadata = {
  title: `Find a Financial Advisor in Australia (${CURRENT_YEAR})`,
  description:
    "Browse verified SMSF accountants, financial planners, property advisors, and tax agents. Free listings, pay only when you get an enquiry.",
  openGraph: {
    title: "Find a Financial Advisor",
    description: "Browse verified Australian financial professionals. SMSF accountants, financial planners, property advisors, and more.",
    images: [{ url: "/api/og?title=Find+an+Advisor&subtitle=Verified+Australian+Financial+Professionals&type=default", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: "/advisors" },
};

async function AdvisorsData() {
  const supabase = await createClient();
  const { getIntentCountry } = await import("@/lib/intent-context-server");

  const [proResult, firmResult, teamResult, intentCountry] = await Promise.all([
    supabase
      .from("professionals")
      .select("*")
      .eq("status", "active")
      .in("profile_quality_gate", ["passed", "pending"])
      .order("verified", { ascending: false })
      .order("rating", { ascending: false }),
    supabase
      .from("advisor_firms")
      .select("*")
      .eq("status", "active")
      .order("name", { ascending: true }),
    supabase
      .from("expert_teams")
      .select(
        "id, slug, name, team_category, team_type, description, location_state, accepted_brief_templates, accepts_briefs, public, verification_status",
      )
      .eq("public", true)
      .eq("verification_status", "verified")
      .order("created_at", { ascending: false }),
    getIntentCountry(),
  ]);

  // Surface Supabase errors to the error boundary so users see a retry
  // prompt instead of a silently-empty advisor list. Previously the
  // `|| []` fallback swallowed all failures — a flaky DB or network
  // error rendered "No advisors available" and misled users into
  // thinking the platform had none.
  if (proResult.error || firmResult.error) {
    log.error("Failed to load advisors page data", {
      proError: proResult.error?.message,
      firmError: firmResult.error?.message,
    });
    throw new Error("Failed to load advisors. Please try again.");
  }
  // expert_teams missing pre-migration → log but degrade gracefully (page still
  // renders without the teams strip).
  if (teamResult.error) {
    log.warn("Expert teams fetch failed", { error: teamResult.error.message });
  }

  // Hide advisors whose country_eligibility blocks the visitor's
  // intent country. Compounds with the per-card EligibilityBadge —
  // filter hides explicit non-matches (US-only firms for a UK visitor),
  // badge highlights matches and visa-required cases. No-op when
  // intentCountry is null.
  const allProfessionals = (proResult.data as Professional[]) || [];
  const professionals = filterByCountryEligibility(allProfessionals, intentCountry);
  const firms = (firmResult.data as AdvisorFirm[]) || [];
  const firmMemberCounts: Record<number, number> = {};
  professionals.forEach(p => {
    if (p.firm_id) firmMemberCounts[p.firm_id] = (firmMemberCounts[p.firm_id] || 0) + 1;
  });

  const expertTeams = (teamResult.data ?? []) as ExpertTeamCard[];

  return (
    <AdvisorsClient
      professionals={professionals}
      firms={firms}
      firmMemberCounts={firmMemberCounts}
      expertTeams={expertTeams}
      intentCountry={intentCountry}
    />
  );
}

const advisorFaqLd = faqJsonLd([
  {
    q: "How do I find a financial advisor in Australia?",
    a: "Search Invest.com.au's directory of verified Australian financial advisers by location, specialty (financial planner, SMSF accountant, tax agent, mortgage broker), and fee model. Every listed professional holds an active AFSL licence or is authorised under one. Filter by state, rating, and whether they offer a free initial consultation.",
  },
  {
    q: "How much does a financial advisor cost in Australia?",
    a: "Fees vary widely by service. Ongoing financial planning advice typically costs $3,000–$6,000 per year for a comprehensive plan with regular reviews. One-off advice (e.g. a superannuation strategy review) may cost $1,500–$3,500. Some advisers charge hourly rates of $250–$550/hr. FOFA reforms (2013) banned conflicted remuneration — advisers must now charge transparent fees, not commissions on investment products.",
  },
  {
    q: "What is the difference between a financial planner and a financial adviser?",
    a: "In Australia the terms are interchangeable and refer to the same regulated profession. Both require an AFSL licence or authorisation, completion of the Financial Adviser Standards and Ethics Authority (FASEA) education standards (degree + ethics exam), and ongoing CPD. 'Wealth manager' and 'investment adviser' are informal titles used by some firms but carry the same regulatory obligations.",
  },
  {
    q: "Do I need a financial advisor?",
    a: "You may benefit from advice if you have a complex situation: approaching retirement, managing an inheritance, running an SMSF, crossing the super contribution caps, restructuring after divorce, or investing through a family trust. For straightforward investing (regular ETF contributions via a low-cost broker), a good-quality comparison site and a tax accountant is often sufficient without ongoing advice fees.",
  },
  {
    q: "How do I check if a financial advisor is licensed in Australia?",
    a: "Use ASIC's Financial Advisers Register at moneysmart.gov.au to confirm an adviser's licence, qualifications, and any disciplinary history. All advisers on Invest.com.au are pre-checked against the register. AFSL licence numbers are publicly searchable via ASIC Connect.",
  },
]);

const advisorSpeakableLd = speakableWebPageJsonLd({
  name: `Find a Financial Advisor in Australia (${CURRENT_YEAR})`,
  path: "/advisors",
  selectors: ["h1", ".advisor-directory-summary"],
});

export default function AdvisorsPage() {
  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Find an Advisor" },
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(advisorFaqLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(advisorSpeakableLd) }} />
      <div className="container-custom pt-4">
        <DirectoryBanners surface="advisors" />
      </div>
      <Suspense fallback={<AdvisorsLoading />}>
        <AdvisorsData />
      </Suspense>
      <HomeToolsStrip />
    </>
  );
}

function AdvisorsLoading() {
  return (
    <div className="py-5 md:py-12 animate-pulse">
      <div className="container-custom max-w-4xl">
        <div className="h-6 w-48 bg-slate-200 rounded mb-2" />
        <div className="h-4 w-72 bg-slate-100 rounded mb-6" />
        <div className="flex gap-2 mb-6">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-8 w-24 bg-slate-100 rounded-full" />)}</div>
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-32 bg-slate-100 rounded-xl" />)}</div>
      </div>
    </div>
  );
}
