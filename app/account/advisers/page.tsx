import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
// engagement_registry and the provider/brief hydration tables are
// service-role-only; the page scopes everything to the signed-in user's
// own email before rendering.
import { createAdminClient } from "@/lib/supabase/admin";
import { listEngagementsForEmail, type EngagementRow } from "@/lib/briefs/engagements";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My advisers — My Account",
  robots: "noindex, nofollow",
};

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  active: { label: "Matched", cls: "bg-amber-50 border-amber-200 text-amber-700" },
  engaged: { label: "Working together", cls: "bg-emerald-50 border-emerald-200 text-emerald-700" },
  completed: { label: "Wrapped up", cls: "bg-slate-100 border-slate-200 text-slate-600" },
  ended: { label: "Didn't proceed", cls: "bg-slate-100 border-slate-200 text-slate-500" },
};

interface HydratedEngagement extends EngagementRow {
  providerName: string;
  briefTitle: string;
  briefSlug: string | null;
}

async function hydrate(rows: EngagementRow[]): Promise<HydratedEngagement[]> {
  if (rows.length === 0) return [];
  const admin = createAdminClient();
  const proIds = Array.from(
    new Set(rows.map((r) => r.professional_id).filter((v): v is number => v !== null)),
  );
  const teamIds = Array.from(
    new Set(rows.map((r) => r.team_id).filter((v): v is number => v !== null)),
  );
  const briefIds = Array.from(new Set(rows.map((r) => r.brief_id)));

  const [prosRes, teamsRes, briefsRes] = await Promise.all([
    proIds.length > 0
      ? admin.from("professionals").select("id, name").in("id", proIds)
      : Promise.resolve({ data: [] }),
    teamIds.length > 0
      ? admin.from("expert_teams").select("id, name").in("id", teamIds)
      : Promise.resolve({ data: [] }),
    admin.from("advisor_auctions").select("id, slug, job_title").in("id", briefIds),
  ]);

  const proName = new Map(
    (prosRes.data ?? []).map((p) => [p.id as number, (p.name as string) || "Pro"]),
  );
  const teamName = new Map(
    (teamsRes.data ?? []).map((t) => [t.id as number, (t.name as string) || "Team"]),
  );
  const briefById = new Map(
    (briefsRes.data ?? []).map((b) => [
      b.id as number,
      { slug: (b.slug as string) ?? null, title: (b.job_title as string) || "Match Request" },
    ]),
  );

  return rows.map((r) => ({
    ...r,
    providerName: r.team_id
      ? (teamName.get(r.team_id) ?? "Team")
      : r.professional_id
        ? (proName.get(r.professional_id) ?? "Pro")
        : "Pro",
    briefTitle: briefById.get(r.brief_id)?.title ?? "Match Request",
    briefSlug: briefById.get(r.brief_id)?.slug ?? null,
  }));
}

export default async function MyAdvisersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/account/advisers");

  const rows = await listEngagementsForEmail(user.email ?? "");
  const engagements = await hydrate(rows);

  return (
    <main className="bg-slate-50 min-h-[60vh]">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <header className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 mb-2">
            <span aria-hidden className="mr-1.5">🤝</span>
            My advisers
          </p>
          <h1 className="text-2xl font-bold text-slate-900">
            Your professional relationships
          </h1>
          <p className="text-sm text-slate-600 mt-2">
            Every pro who accepted one of your Match Requests, with where
            things stand. We check in at 30 days, 90 days and once a year —
            you can update the status any time. Factual record only, never
            shared publicly.
          </p>
        </header>

        {engagements.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
            <p className="text-sm font-semibold text-slate-800 mb-1">
              No relationships tracked yet
            </p>
            <p className="text-xs text-slate-500 mb-4">
              When a verified pro accepts one of your Match Requests, the
              relationship shows up here automatically.
            </p>
            <Link
              href="/briefs/new"
              className="inline-block rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
            >
              Post a Match Request
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {engagements.map((e) => {
              const chip = STATUS_LABELS[e.status] ?? STATUS_LABELS.active!;
              return (
                <li
                  key={e.id}
                  className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900">{e.providerName}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {e.briefTitle} · since{" "}
                      {new Date(e.started_at).toLocaleDateString("en-AU", {
                        month: "short",
                        year: "numeric",
                      })}
                      {e.annual_review_at && " · annual review done"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${chip.cls}`}
                    >
                      {chip.label}
                    </span>
                    <Link
                      href={`/engagement/${e.checkin_token}`}
                      className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Update
                    </Link>
                    {e.briefSlug && (
                      <Link
                        href={`/briefs/${e.briefSlug}`}
                        className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Brief
                      </Link>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
