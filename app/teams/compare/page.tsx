import type { Metadata } from "next";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { absoluteUrl, breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import Icon from "@/components/Icon";
import OutcomeBadge from "@/components/outcomes/OutcomeBadge";
import { getProviderOutcomeBadge } from "@/lib/outcomes/profile-display";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Compare verified expert teams (${CURRENT_YEAR}) — Invest.com.au`,
  description:
    "Side-by-side comparison of verified Pro Squads — outcome score, members, accepted briefs, location, and price band.",
  alternates: { canonical: `${SITE_URL}/teams/compare` },
  robots: { index: false, follow: true },
};

interface TeamRow {
  id: number;
  slug: string;
  name: string;
  team_category: string;
  team_type: string;
  description: string | null;
  location_state: string | null;
  service_areas: string[] | null;
  accepted_brief_templates: string[] | null;
  accepts_briefs: boolean;
}

const MAX_COMPARE = 3;

export default async function CompareTeamsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const rawSlugs = sp.slugs;
  const slugs = (
    typeof rawSlugs === "string"
      ? rawSlugs.split(",")
      : Array.isArray(rawSlugs)
        ? rawSlugs
        : []
  )
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, MAX_COMPARE);

  const admin = await createClient();
  const { data: teamsRaw } = slugs.length
    ? await admin
        .from("expert_teams")
        .select(
          "id, slug, name, team_category, team_type, description, location_state, service_areas, accepted_brief_templates, accepts_briefs",
        )
        .eq("public", true)
        .eq("verification_status", "verified")
        .in("slug", slugs)
    : { data: [] };
  // Preserve user-requested ordering.
  const teamsBySlug = new Map(
    ((teamsRaw ?? []) as TeamRow[]).map((t) => [t.slug, t]),
  );
  const teams = slugs.map((s) => teamsBySlug.get(s)).filter((t): t is TeamRow => !!t);

  // Member counts (per team) + outcome badges.
  const teamIds = teams.map((t) => t.id);
  const [{ data: memberRows }, badges] = await Promise.all([
    teamIds.length
      ? admin
          .from("expert_team_members")
          .select("team_id")
          .in("team_id", teamIds)
          .eq("status", "active")
          .eq("can_appear_publicly", true)
      : Promise.resolve({ data: [] }),
    Promise.all(
      teams.map((t) => getProviderOutcomeBadge({ teamId: t.id })),
    ),
  ]);
  const memberCountByTeam = new Map<number, number>();
  for (const row of (memberRows ?? []) as { team_id: number }[]) {
    memberCountByTeam.set(row.team_id, (memberCountByTeam.get(row.team_id) ?? 0) + 1);
  }

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Experts", url: absoluteUrl("/advisors") },
    { name: "Compare teams" },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />

      <div className="min-h-screen bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 py-10">
          <div className="text-xs text-slate-500 mb-3 flex items-center gap-1.5">
            <Link href="/" className="hover:text-slate-800">Home</Link>
            <span>/</span>
            <Link href="/advisors" className="hover:text-slate-800">Experts</Link>
            <span>/</span>
            <span className="text-slate-800 font-medium">Compare teams</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-1">
            Compare verified expert teams
          </h1>
          <p className="text-sm text-slate-600 mb-6">
            Side-by-side detail for up to {MAX_COMPARE} verified Pro Squads.
            Add or remove teams with the URL <code className="text-xs">?slugs=team-a,team-b</code>{" "}
            or pick from <Link href="/advisors" className="underline">the directory</Link>.
          </p>

          {teams.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
              <p className="text-sm text-slate-600">
                No teams to compare yet. Pick verified Pro Squads from the{" "}
                <Link href="/advisors" className="text-amber-700 font-semibold underline">
                  expert directory
                </Link>{" "}
                and add them to the compare list.
              </p>
            </div>
          ) : (
            <div
              className={`grid gap-4 ${
                teams.length === 1
                  ? "grid-cols-1 max-w-md"
                  : teams.length === 2
                    ? "grid-cols-1 sm:grid-cols-2"
                    : "grid-cols-1 sm:grid-cols-3"
              }`}
            >
              {teams.map((t, idx) => {
                const memberCount = memberCountByTeam.get(t.id) ?? 0;
                const badge = badges[idx];
                return (
                  <article
                    key={t.id}
                    className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h2 className="text-lg font-extrabold text-slate-900 leading-tight">
                        <Link
                          href={`/teams/${t.slug}`}
                          className="hover:text-amber-700"
                        >
                          {t.name}
                        </Link>
                      </h2>
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                        <Icon name="shield-check" size={11} /> Verified
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 mb-3">
                      {String(t.team_category).replace(/_/g, " ")} ·{" "}
                      {String(t.team_type).replace(/_/g, " ")}
                    </p>

                    {badge && (
                      <div className="mb-3">
                        <OutcomeBadge badge={badge} />
                      </div>
                    )}

                    <p className="text-sm text-slate-700 mb-4 line-clamp-4">
                      {t.description || "—"}
                    </p>

                    <dl className="text-xs space-y-2 mb-4">
                      <Row label="Members" value={`${memberCount} active`} />
                      <Row label="Based in" value={t.location_state || "—"} />
                      <Row
                        label="Service areas"
                        value={(t.service_areas ?? []).join(", ") || "—"}
                      />
                      <Row
                        label="Accepts brief types"
                        value={
                          (t.accepted_brief_templates ?? [])
                            .map((b) => b.replace(/_/g, " "))
                            .join(", ") || "—"
                        }
                      />
                      <Row
                        label="Open to briefs"
                        value={t.accepts_briefs ? "Yes" : "Not currently"}
                      />
                    </dl>

                    <div className="mt-auto flex flex-col gap-2">
                      <Link
                        href={`/teams/${t.slug}`}
                        className="text-center text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-900 rounded-lg px-3 py-2"
                      >
                        View team profile →
                      </Link>
                      {t.accepts_briefs && (
                        <Link
                          href={`/briefs/new?team=${t.slug}`}
                          className="text-center text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 rounded-lg px-3 py-2"
                        >
                          Send this team a brief
                        </Link>
                      )}
                      <Link
                        href={`/teams/compare?slugs=${slugs.filter((s) => s !== t.slug).join(",")}`}
                        className="text-center text-[11px] text-slate-500 hover:text-slate-800"
                      >
                        Remove from compare
                      </Link>
                    </div>
                  </article>
                );
              })}
              {teams.length < MAX_COMPARE && (
                <div className="bg-slate-100 border border-dashed border-slate-300 rounded-2xl p-5 flex flex-col items-center justify-center text-center min-h-[200px]">
                  <p className="text-sm font-semibold text-slate-700">
                    Add another team
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Compare up to {MAX_COMPARE} Pro Squads side-by-side.
                  </p>
                  <Link
                    href="/advisors"
                    className="mt-3 text-xs font-semibold text-amber-700 hover:underline"
                  >
                    Pick from the directory →
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="text-slate-800">{value}</dd>
    </div>
  );
}
