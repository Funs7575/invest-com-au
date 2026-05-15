import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";

// eslint-disable-next-line no-restricted-imports -- Pro Squad inbox: members-only authenticated surface. We resolve the caller via the auth cookie then read cross-table (expert_teams, members, professionals, advisor_auctions, team_brief_assignments) under admin. Per CLAUDE.md § "Two Supabase clients", a logged-in-required portal page joining team membership + brief acceptance is a legitimate cross-row server-side lookup. The page redirects unauthenticated visitors first and 404s non-members.
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { BRIEF_TEMPLATE_LABELS } from "@/lib/briefs/templates";
import {
  listAssignmentsForBriefs,
  type TeamBriefAssignmentRow,
} from "@/lib/team-brief-assignments";
import SquadInboxClaimRow from "./SquadInboxClaimRow";

// Private surface — keep out of the index. JSON-LD coverage gate
// auto-exempts pages with `robots: { index: false }`.
export const metadata: Metadata = {
  title: "Pro Squad inbox — Invest.com.au",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

interface BriefRow {
  id: number;
  slug: string;
  job_title: string;
  brief_template: string | null;
  created_at: string;
}

interface MemberRow {
  professional_id: number;
  member_role: string;
  pro_name: string;
  pro_slug: string | null;
  pro_photo_url: string | null;
}

const PAGE_SIZE = 20;

export default async function SquadInboxPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const sp = (await searchParams) ?? {};
  const rawPage =
    typeof sp.page === "string" ? Number.parseInt(sp.page, 10) : 1;
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const offset = (page - 1) * PAGE_SIZE;

  // 1. Auth — redirect unauthenticated to /account/login.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/account/login?redirect=/teams/${slug}/inbox`);
  }

  // 2. Resolve calling professional + team membership.
  const admin = createAdminClient();
  const { data: caller } = await admin
    .from("professionals")
    .select("id, name")
    .or(`auth_user_id.eq.${user.id},email.eq.${user.email}`)
    .in("status", ["active", "pending"])
    .maybeSingle();
  if (!caller) notFound();

  const { data: team } = await admin
    .from("expert_teams")
    .select("id, slug, name, team_category")
    .eq("slug", slug)
    .maybeSingle();
  if (!team) notFound();

  const { data: callerMembership } = await admin
    .from("expert_team_members")
    .select("status")
    .eq("team_id", team.id)
    .eq("professional_id", caller.id)
    .maybeSingle();
  if (!callerMembership || (callerMembership.status as string) !== "active") {
    notFound();
  }

  // 3. Member roster for header (avatars + names).
  const { data: membersRaw } = await admin
    .from("expert_team_members")
    .select("professional_id, member_role")
    .eq("team_id", team.id)
    .eq("status", "active");
  const memberPros = (membersRaw ?? []) as {
    professional_id: number;
    member_role: string;
  }[];
  const memberProIds = memberPros.map((m) => m.professional_id);

  let prosById: Record<
    number,
    { name: string; slug: string | null; photo_url: string | null }
  > = {};
  if (memberProIds.length > 0) {
    const { data: pros } = await admin
      .from("professionals")
      .select("id, name, slug, photo_url")
      .in("id", memberProIds);
    prosById = Object.fromEntries(
      ((pros ?? []) as {
        id: number;
        name: string;
        slug: string | null;
        photo_url: string | null;
      }[]).map((p) => [p.id, p]),
    );
  }
  const members: MemberRow[] = memberPros
    .map((m) => {
      const pro = prosById[m.professional_id];
      if (!pro) return null;
      return {
        professional_id: m.professional_id,
        member_role: m.member_role,
        pro_name: pro.name,
        pro_slug: pro.slug,
        pro_photo_url: pro.photo_url,
      };
    })
    .filter((m): m is MemberRow => m !== null);

  // 4. Accepted briefs for this team.
  const { data: briefsRaw } = await admin
    .from("advisor_auctions")
    .select("id, slug, job_title, brief_template, created_at")
    .eq("accepted_by_team_id", team.id)
    .order("accepted_at", { ascending: false, nullsFirst: false })
    .range(offset, offset + PAGE_SIZE - 1);
  const briefs = (briefsRaw ?? []) as BriefRow[];

  // 5. Claim assignments for those briefs.
  const briefIds = briefs.map((b) => b.id);
  const assignments = await listAssignmentsForBriefs(briefIds);

  // Index latest active assignment per brief for the row UI.
  const activeByBrief = new Map<number, TeamBriefAssignmentRow>();
  for (const a of assignments) {
    if (a.status === "claimed" || a.status === "handed_off") {
      if (!activeByBrief.has(a.brief_id)) {
        activeByBrief.set(a.brief_id, a);
      }
    }
  }

  // KPI strip counts (across all assignments for this team — global, not
  // just the page window — so the metrics don't shift when paging).
  const { data: kpiRaw } = await admin
    .from("team_brief_assignments")
    .select("status")
    .eq("team_id", team.id);
  const kpiRows = (kpiRaw ?? []) as { status: string }[];
  const activeCount = kpiRows.filter(
    (r) => r.status === "claimed" || r.status === "handed_off",
  ).length;
  const completedCount = kpiRows.filter((r) => r.status === "completed").length;
  // "Open" = accepted briefs with no active claim (any team member).
  const { count: acceptedTotal } = await admin
    .from("advisor_auctions")
    .select("id", { count: "exact", head: true })
    .eq("accepted_by_team_id", team.id);
  const openCount = Math.max(0, (acceptedTotal ?? 0) - activeCount - completedCount);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
          <Link href={`/teams/${team.slug}`} className="hover:text-slate-700">
            {team.name as string}
          </Link>
          <span>/</span>
          <span className="text-slate-700">Squad inbox</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-1">
          {team.name as string} — Squad inbox
        </h1>
        <p className="text-sm text-slate-500 mb-6">
          Match Requests your Pro Squad has accepted. Claim a brief so the rest
          of the squad knows you have it.
        </p>

        {/* Member roster */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-6">
          <p className="text-xs uppercase tracking-widest text-slate-500 mb-3">
            Active members
          </p>
          <ul className="flex flex-wrap gap-3">
            {members.map((m) => (
              <li
                key={m.professional_id}
                className="flex items-center gap-2 bg-slate-50 rounded-full pl-1 pr-3 py-1"
              >
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-200 overflow-hidden text-[10px] font-semibold text-slate-600">
                  {m.pro_photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element -- small inline avatar, no LCP concern
                    <img
                      src={m.pro_photo_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    m.pro_name
                      .split(" ")
                      .map((s) => s[0])
                      .filter(Boolean)
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()
                  )}
                </span>
                <span className="text-xs font-semibold text-slate-700">
                  {m.pro_name}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* KPI strip — stays 3-up across all sizes; 3 short numerals fit at 375px. */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-8">
          <KpiTile label="Active claims" value={activeCount} accent="amber" />
          <KpiTile label="Open" value={openCount} accent="slate" />
          <KpiTile label="Completed" value={completedCount} accent="emerald" />
        </div>

        {/* Brief list */}
        <h2 className="text-base font-bold text-slate-900 mb-3">
          Accepted Match Requests
        </h2>

        {briefs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-500">
            No accepted Match Requests yet. When the squad accepts one, it will
            show up here.
          </div>
        ) : (
          <ul className="space-y-3">
            {briefs.map((b) => {
              const active = activeByBrief.get(b.id) ?? null;
              const claimerPro = active
                ? prosById[active.professional_id] ?? null
                : null;
              return (
                <li
                  key={b.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        {b.job_title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {b.brief_template
                          ? BRIEF_TEMPLATE_LABELS[
                              b.brief_template as keyof typeof BRIEF_TEMPLATE_LABELS
                            ] ?? b.brief_template
                          : "Match Request"}{" "}
                        ·{" "}
                        {new Date(b.created_at).toLocaleDateString("en-AU", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <Link
                      href={`/briefs/${b.slug}`}
                      className="text-xs font-semibold text-amber-700 hover:underline whitespace-nowrap"
                    >
                      View tracker →
                    </Link>
                  </div>

                  <SquadInboxClaimRow
                    teamSlug={team.slug as string}
                    briefId={b.id}
                    callerProfessionalId={caller.id}
                    callerName={(caller.name as string) ?? "You"}
                    activeAssignment={active}
                    claimerName={claimerPro?.name ?? null}
                    claimerPhotoUrl={claimerPro?.photo_url ?? null}
                  />
                </li>
              );
            })}
          </ul>
        )}

        {/* Simple pager — only show "next" if we filled the page. */}
        {briefs.length === PAGE_SIZE && (
          <div className="mt-6 flex justify-between text-sm">
            {page > 1 ? (
              <Link
                href={`/teams/${team.slug}/inbox?page=${page - 1}`}
                className="text-amber-700 font-semibold hover:underline"
              >
                ← Newer
              </Link>
            ) : (
              <span />
            )}
            <Link
              href={`/teams/${team.slug}/inbox?page=${page + 1}`}
              className="text-amber-700 font-semibold hover:underline"
            >
              Older →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function KpiTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: "amber" | "slate" | "emerald";
}) {
  const accentClass =
    accent === "amber"
      ? "text-amber-700"
      : accent === "emerald"
        ? "text-emerald-700"
        : "text-slate-700";
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4">
      <p className="text-[11px] sm:text-xs uppercase tracking-widest text-slate-500">{label}</p>
      <p className={`text-xl sm:text-2xl font-extrabold ${accentClass} mt-1`}>{value}</p>
    </div>
  );
}
