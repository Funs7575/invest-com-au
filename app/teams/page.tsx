import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { listVerifiedTeams } from "@/lib/expert-teams";
import { absoluteUrl, breadcrumbJsonLd, CURRENT_YEAR } from "@/lib/seo";
import { TEAM_CATEGORY_LABELS } from "@/lib/api-schemas";
import { faqJsonLd } from "@/lib/schema-markup";

export const revalidate = 1800;

export const metadata: Metadata = {
  title: `Expert Teams — Specialist Adviser Squads in Australia (${CURRENT_YEAR})`,
  description:
    "Browse verified expert teams — squads of complementary financial professionals (SMSF, tax, property, planning) who collaborate on complex briefs. Compare teams or post a request.",
  openGraph: {
    title: "Expert Teams — Specialist Adviser Squads",
    description:
      "Verified squads of complementary Australian financial professionals who collaborate on complex briefs.",
    images: [{ url: `/api/og?title=${encodeURIComponent("Expert Financial Teams Australia")}&sub=${encodeURIComponent("SMSF · Tax · Property · Planning · Verified Squads")}`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: "/teams" },
};

async function TeamsList() {
  const teams = await listVerifiedTeams();

  if (teams.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center">
        <p className="text-slate-600 font-medium">No expert teams are listed yet.</p>
        <p className="text-sm text-slate-500 mt-1">
          Squads of complementary specialists are being onboarded. In the
          meantime you can{" "}
          <Link href="/get-matched" className="text-violet-700 underline">
            post a request
          </Link>{" "}
          and we&apos;ll match you.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {teams.map((team) => (
        <Link
          key={team.id}
          href={`/teams/${team.slug}`}
          className="block rounded-xl border border-slate-200 bg-white p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[0.62rem] font-bold text-violet-700 bg-violet-100 px-2 py-0.5 rounded-full uppercase tracking-wide">
              {TEAM_CATEGORY_LABELS[team.team_category as keyof typeof TEAM_CATEGORY_LABELS] ?? team.team_category}
            </span>
            {team.accepts_briefs && (
              <span className="text-[0.62rem] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                Accepting briefs
              </span>
            )}
          </div>
          <h2 className="text-base font-bold text-slate-900">{team.name}</h2>
          {team.location_state && (
            <p className="text-xs text-slate-500 mt-0.5">{team.location_state}</p>
          )}
          {team.description && (
            <p className="text-sm text-slate-600 mt-2 line-clamp-3">
              {team.description}
            </p>
          )}
          <span className="inline-block mt-3 text-sm font-semibold text-violet-700">
            View team &rarr;
          </span>
        </Link>
      ))}
    </div>
  );
}

function TeamsLoading() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 animate-pulse">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-40 bg-slate-100 rounded-xl" />
      ))}
    </div>
  );
}

const TEAMS_FAQS = [
  {
    q: "What is an Expert Team and how is it different from a single adviser?",
    a: "An Expert Team is a pre-formed squad of two or more complementary financial professionals who collaborate on complex briefs. Unlike a single adviser, a team combines different specialisations — for example, an SMSF accountant, a financial planner, and a tax agent who already work together. This coordination means you get consistent, integrated advice rather than needing to brief three separate professionals who don't know each other's work. Expert Teams are typically suited to complex situations: business owners needing tax and investment planning, SMSF trustees with multiple assets, or retirees transitioning from accumulation to drawdown phase.",
  },
  {
    q: "How are Expert Teams verified?",
    a: "Every team member holds a verified profile on Invest.com.au — their AFSL, professional registration, or relevant licence is confirmed before they can join the platform. For a team to be listed as an 'Expert Team', all members must have verified profiles, the team must nominate a primary contact, and the team's collaboration must be genuine (not just a loose referral arrangement). Teams are reviewed by our onboarding team before going live. Verification confirms professional credentials, not advice quality — always evaluate the team's experience and fit for your situation.",
  },
  {
    q: "How do I engage an Expert Team?",
    a: "Click on a team's card to view their profile, which shows team members, specialisations, location, and whether they are currently accepting new briefs. If they are, click 'Post a brief' to describe your situation and requirements. The team will review your brief and respond with whether they can help and an indicative scope. You can also post a general request via the Quotes marketplace (/quotes) and specify that you need a multi-specialist team — we'll match you to suitable teams from there.",
  },
  {
    q: "Can I compare Expert Teams before choosing?",
    a: "Yes. Use the 'Compare teams' button at the top of this page to compare up to 4 teams side-by-side across specialisations, team size, location, and whether they are accepting briefs. You can also filter teams by category (SMSF, tax, property, planning, or cross-specialty) and state. Reviews from verified clients are shown on each team's profile page. We recommend shortlisting two or three teams, reading each profile, and having a brief introductory call before committing to an engagement.",
  },
];

const teamsFaqLd = faqJsonLd(TEAMS_FAQS);

export default function TeamsIndexPage() {
  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Find an Advisor", url: absoluteUrl("/advisors") },
    { name: "Expert Teams" },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      {teamsFaqLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(teamsFaqLd) }}
        />
      )}
      <div className="container-custom max-w-4xl py-6 md:py-10">
        <nav aria-label="Breadcrumb" className="text-sm text-slate-500 mb-4">
          <ol className="flex items-center gap-1 flex-wrap">
            <li>
              <Link href="/" className="hover:text-slate-700">
                Home
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li>
              <Link href="/advisors" className="hover:text-slate-700">
                Find an Advisor
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li className="text-slate-700">Expert Teams</li>
          </ol>
        </nav>

        <header className="mb-6">
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">
            Expert Teams
          </h1>
          <p className="text-sm md:text-base text-slate-500 mt-2 max-w-2xl">
            Squads of complementary financial professionals — SMSF accountants,
            tax agents, planners and property specialists — who collaborate on
            complex briefs so you get one coordinated team instead of juggling
            several advisers.
          </p>
          <div className="flex flex-wrap gap-2 mt-4">
            <Link
              href="/teams/compare"
              className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Compare teams
            </Link>
            <Link
              href="/teams/new"
              className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700"
            >
              Create a team
            </Link>
          </div>
        </header>

        <Suspense fallback={<TeamsLoading />}>
          <TeamsList />
        </Suspense>
      </div>

      <div className="border-t border-slate-200 bg-white">
        <div className="container-custom max-w-4xl py-8 md:py-10">
          <h2 className="text-lg font-extrabold text-slate-900 mb-5">Frequently asked questions</h2>
          <div className="space-y-3">
            {TEAMS_FAQS.map((faq) => (
              <details key={faq.q} className="group rounded-xl border border-slate-200 bg-slate-50">
                <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 font-semibold text-slate-900 list-none">
                  {faq.q}
                  <span className="shrink-0 text-slate-400 group-open:rotate-180 transition-transform" aria-hidden="true">▾</span>
                </summary>
                <p className="px-5 pb-5 text-sm text-slate-600 leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
