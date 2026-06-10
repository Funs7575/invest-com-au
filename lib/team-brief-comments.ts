/**
 * Team brief comments — private advisor↔advisor coordination notes on a
 * brief inside a Pro Squad. Never consumer-visible: a deliberately separate
 * table from `brief_messages` (whose read policies expose rows to the brief
 * owner) so internal notes cannot leak through a policy change.
 *
 * Authorisation model: callers must be ACTIVE members of the team, and the
 * brief must actually belong to the team (advisor_auctions.accepted_by_team_id)
 * — both verified here, not trusted from the client.
 */

// eslint-disable-next-line no-restricted-imports -- cross-row membership + brief-ownership checks (expert_team_members, advisor_auctions) on behalf of an advisor session; service-role legitimate per CLAUDE.md. Reads remain protected by the table's member-scoped RLS for non-admin paths.
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("team-brief-comments");

export interface TeamBriefComment {
  id: number;
  brief_id: number;
  team_id: number;
  author_professional_id: number;
  author_name: string | null;
  author_photo_url: string | null;
  body: string;
  created_at: string;
}

export type TeamBriefCommentsResult =
  | { ok: true; comments: TeamBriefComment[] }
  | { ok: false; reason: "forbidden" | "unavailable" | "error" };

export type AddCommentResult =
  | { ok: true; comment: TeamBriefComment }
  | { ok: false; reason: "forbidden" | "unavailable" | "error" };

/** Table not deployed yet (migration pending) → callers degrade gracefully. */
function isMissingTableError(err: { message?: string; code?: string } | null): boolean {
  if (!err) return false;
  if (err.code === "42P01" || err.code === "PGRST205" || err.code === "PGRST200") return true;
  const msg = (err.message ?? "").toLowerCase();
  return msg.includes("does not exist") || msg.includes("schema cache");
}

/**
 * True when the professional is an active member of the team AND the brief
 * is owned by that team.
 */
async function verifyAccess(
  professionalId: number,
  teamId: number,
  briefId: number,
): Promise<boolean> {
  const admin = createAdminClient();
  const [membership, brief] = await Promise.all([
    admin
      .from("expert_team_members")
      .select("id")
      .eq("team_id", teamId)
      .eq("professional_id", professionalId)
      .eq("status", "active")
      .maybeSingle(),
    admin
      .from("advisor_auctions")
      .select("id")
      .eq("id", briefId)
      .eq("accepted_by_team_id", teamId)
      .maybeSingle(),
  ]);
  return !!membership.data && !!brief.data;
}

const PAGE_LIMIT = 100;

export async function getCommentsForBrief(
  professionalId: number,
  teamId: number,
  briefId: number,
): Promise<TeamBriefCommentsResult> {
  if (!(await verifyAccess(professionalId, teamId, briefId))) {
    return { ok: false, reason: "forbidden" };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("team_brief_comments")
    .select("id, brief_id, team_id, author_professional_id, body, created_at")
    .eq("team_id", teamId)
    .eq("brief_id", briefId)
    .order("created_at", { ascending: true })
    .limit(PAGE_LIMIT);

  if (error) {
    if (isMissingTableError(error)) return { ok: false, reason: "unavailable" };
    log.error("getCommentsForBrief failed", { error: error.message, teamId, briefId });
    return { ok: false, reason: "error" };
  }

  const rows = (data ?? []) as Omit<TeamBriefComment, "author_name" | "author_photo_url">[];

  // Attach author display data in one lookup.
  const authorIds = Array.from(new Set(rows.map((r) => r.author_professional_id)));
  const authors = new Map<number, { name: string; photo_url: string | null }>();
  if (authorIds.length > 0) {
    const { data: pros } = await admin
      .from("professionals")
      .select("id, name, photo_url")
      .in("id", authorIds);
    for (const p of (pros ?? []) as { id: number; name: string; photo_url: string | null }[]) {
      authors.set(p.id, { name: p.name, photo_url: p.photo_url });
    }
  }

  return {
    ok: true,
    comments: rows.map((r) => ({
      ...r,
      author_name: authors.get(r.author_professional_id)?.name ?? null,
      author_photo_url: authors.get(r.author_professional_id)?.photo_url ?? null,
    })),
  };
}

export async function addComment(input: {
  professionalId: number;
  teamId: number;
  briefId: number;
  body: string;
}): Promise<AddCommentResult> {
  if (!(await verifyAccess(input.professionalId, input.teamId, input.briefId))) {
    return { ok: false, reason: "forbidden" };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("team_brief_comments")
    .insert({
      brief_id: input.briefId,
      team_id: input.teamId,
      author_professional_id: input.professionalId,
      body: input.body,
    })
    .select("id, brief_id, team_id, author_professional_id, body, created_at")
    .single();

  if (error || !data) {
    if (isMissingTableError(error)) return { ok: false, reason: "unavailable" };
    log.error("addComment failed", {
      error: error?.message ?? "no row",
      teamId: input.teamId,
      briefId: input.briefId,
    });
    return { ok: false, reason: "error" };
  }

  const { data: pro } = await admin
    .from("professionals")
    .select("name, photo_url")
    .eq("id", input.professionalId)
    .maybeSingle();

  return {
    ok: true,
    comment: {
      ...(data as Omit<TeamBriefComment, "author_name" | "author_photo_url">),
      author_name: (pro?.name as string | undefined) ?? null,
      author_photo_url: (pro?.photo_url as string | null | undefined) ?? null,
    },
  };
}
