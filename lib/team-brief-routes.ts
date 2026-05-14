/**
 * Shared lookup helpers for the Pro Squad brief-claim API routes
 * under /api/teams/[slug]/briefs/[briefId]/* (MM04).
 *
 * Each of the four routes (claim / handoff / complete / release) needs
 * the same preflight:
 *   1. Resolve the team by slug.
 *   2. Verify the calling professional is an active member.
 *   3. Verify the brief belongs to that team (accepted_by_team_id matches).
 *
 * Returns null on any miss; the caller maps null to a 404.
 */

// eslint-disable-next-line no-restricted-imports -- Reads expert_teams + expert_team_members + advisor_auctions across user scope; the calling JWT only authenticates the professional, not their team membership. Per CLAUDE.md § "Two Supabase clients" this is a legitimate cross-row server-side lookup.
import { createAdminClient } from "@/lib/supabase/admin";

export interface SquadRouteContext {
  teamId: number;
  teamSlug: string;
  teamName: string;
  briefId: number;
  briefSlug: string;
  briefTitle: string;
}

export async function resolveSquadRouteContext(input: {
  teamSlug: string;
  briefIdParam: string;
  professionalId: number;
}): Promise<SquadRouteContext | null> {
  const briefId = Number.parseInt(input.briefIdParam, 10);
  if (!Number.isFinite(briefId) || briefId <= 0) return null;

  const admin = createAdminClient();
  const { data: team } = await admin
    .from("expert_teams")
    .select("id, slug, name")
    .eq("slug", input.teamSlug)
    .maybeSingle();
  if (!team) return null;

  const { data: membership } = await admin
    .from("expert_team_members")
    .select("id, status")
    .eq("team_id", team.id)
    .eq("professional_id", input.professionalId)
    .maybeSingle();
  if (!membership || membership.status !== "active") return null;

  const { data: brief } = await admin
    .from("advisor_auctions")
    .select("id, slug, job_title, accepted_by_team_id")
    .eq("id", briefId)
    .maybeSingle();
  if (!brief) return null;
  if ((brief.accepted_by_team_id as number | null) !== team.id) return null;

  return {
    teamId: team.id as number,
    teamSlug: team.slug as string,
    teamName: team.name as string,
    briefId: brief.id as number,
    briefSlug: brief.slug as string,
    briefTitle: (brief.job_title as string) ?? "Match Request",
  };
}

/**
 * Fetch the other active members of a team for fan-out notifications.
 * Excludes the actor's own professional row. Returns email + name.
 */
export async function listOtherActiveMembers(input: {
  teamId: number;
  excludeProfessionalId: number;
}): Promise<{ professionalId: number; name: string; email: string }[]> {
  const admin = createAdminClient();
  const { data: members } = await admin
    .from("expert_team_members")
    .select("professional_id, status")
    .eq("team_id", input.teamId)
    .eq("status", "active");

  const proIds = ((members ?? []) as { professional_id: number }[])
    .map((m) => m.professional_id)
    .filter((id) => id !== input.excludeProfessionalId);

  if (proIds.length === 0) return [];

  const { data: pros } = await admin
    .from("professionals")
    .select("id, name, email")
    .in("id", proIds);

  return ((pros ?? []) as { id: number; name: string; email: string }[])
    .filter((p) => Boolean(p.email))
    .map((p) => ({
      professionalId: p.id,
      name: p.name,
      email: p.email,
    }));
}
