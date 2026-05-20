import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { listVerifiedTeams } from "@/lib/expert-teams";
import { absoluteUrl, breadcrumbJsonLd, CURRENT_YEAR } from "@/lib/seo";

export const revalidate = 1800;

export const metadata: Metadata = {
  title: `Expert Teams — Specialist Adviser Squads in Australia (${CURRENT_YEAR})`,
  description:
    "Browse verified expert teams — squads of complementary financial professionals (SMSF, tax, property, planning) who collaborate on complex briefs. Compare teams or post a request.",
  openGraph: {
    title: "Expert Teams — Specialist Adviser Squads",
    description:
      "Verified squads of complementary Australian financial professionals who collaborate on complex briefs.",
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
              {team.team_category}
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
    </>
  );
}
