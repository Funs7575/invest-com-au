import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { filterByCountryEligibility } from "@/lib/country-mode/eligibility-filter";
import type { Professional, AdvisorFirm } from "@/lib/types";
import type { Metadata } from "next";
import AdvisorsClient, { type ExpertTeamCard } from "./AdvisorsClient";
import HomeToolsStrip from "@/components/HomeToolsStrip";
import { absoluteUrl, breadcrumbJsonLd, CURRENT_YEAR } from "@/lib/seo";
import { logger } from "@/lib/logger";
import NextActions from "@/components/NextActions";
import { faqJsonLd } from "@/lib/schema-markup";
import DirectoryBanners from "@/components/foreign-investment/DirectoryBanners";

const ADVISOR_FAQS = [
  {
    q: "How do I find a financial advisor in Australia?",
    a: "Start by clarifying what you need: SMSF setup, retirement planning, tax minimisation, property investment, or estate planning. Then verify the advisor holds an Australian Financial Services Licence (AFSL) or is an authorised representative of a licence holder — you can check ASIC's Financial Advisers Register at moneysmart.gov.au. On this platform, every listed advisor has been verified against ASIC's register. Use the filters to narrow by speciality, state, and fee model (fee-for-service vs commission).",
  },
  {
    q: "What does a financial advisor cost in Australia?",
    a: "Financial advisor fees in Australia typically range from $2,500–$5,000 for an initial statement of advice, and $1,500–$3,500 per year for ongoing advice relationships. Hourly rates run $200–$500/hour. Since the Future of Financial Advice (FOFA) reforms, advisors must charge fees transparently — commissions on investments are banned (though life insurance commissions continue). Fee-for-service advisors charge you directly; some advisors still receive trailing commissions on legacy products. Always ask for a fee disclosure statement before engaging.",
  },
  {
    q: "What is the difference between a financial planner and a financial advisor?",
    a: "In Australia, both titles are used interchangeably under the Corporations Act, which regulates anyone providing 'personal financial product advice'. Historically, 'financial planner' implied holistic life-goals planning while 'financial advisor' implied more investment-specific work — but this distinction is not enforced in law. More meaningful distinctions: whether the advisor is 'independently licensed' (not owned by or aligned to a product manufacturer), whether they're a Certified Financial Planner (CFP), and whether they operate under a fee-for-service or commission model.",
  },
  {
    q: "Do I need a financial advisor or can I DIY?",
    a: "DIY investing is appropriate if your situation is straightforward: you have a single accumulation-phase super account, a simple share portfolio, no business interests, and no complex tax position. You need professional advice when: establishing an SMSF (complex compliance, trustee obligations), structuring a property portfolio with debt across multiple entities, planning retirement income from multiple sources, dealing with an inheritance, business succession, or divorce. The threshold is usually: complex structure + significant assets + time-sensitive decisions. The cost of a mistake in these situations far exceeds an advisor's fee.",
  },
];

const advisorFaqLd = faqJsonLd(ADVISOR_FAQS);

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
      banners={<DirectoryBanners surface="advisors" />}
    />
  );
}

export default function AdvisorsPage() {
  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Find an Advisor" },
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      {advisorFaqLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(advisorFaqLd) }} />
      )}
      {/* DirectoryBanners now render inside AdvisorsClient, in the canonical slot
          directly below the shared DirectoryHero (passed in as a prop). */}
      <Suspense fallback={<AdvisorsLoading />}>
        <AdvisorsData />
      </Suspense>
      {/* Personalised next-action strip — advisor surface suppresses duplicate advisor CTAs */}
      <Suspense fallback={null}>
        <NextActions surface="advisors" />
      </Suspense>
      <HomeToolsStrip />
      <section className="py-10 bg-white border-t border-slate-200">
        <div className="container-custom max-w-3xl">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Frequently asked questions</h2>
          <div className="space-y-3">
            {ADVISOR_FAQS.map((faq) => (
              <details key={faq.q} className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden group">
                <summary className="px-5 py-4 text-sm font-bold text-slate-900 cursor-pointer hover:bg-slate-100 flex items-center justify-between">
                  {faq.q}
                  <span className="text-slate-400 group-open:rotate-180 transition-transform ml-2 shrink-0" aria-hidden="true">▾</span>
                </summary>
                <div className="px-5 pb-4">
                  <p className="text-sm text-slate-600 leading-relaxed">{faq.a}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>
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
