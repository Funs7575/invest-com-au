/**
 * POST /api/teams/new
 *
 * Self-service Pro Squad creation wizard endpoint. Pairs with the
 * `app/teams/new/page.tsx` 4-step UI.
 *
 * Hard requirements (CLAUDE.md):
 *   - Zod-validated body via withValidatedBody.
 *   - IP-rate-limited via isAllowed/ipKey — max 3 squad creations / hr / IP.
 *   - Service-role admin client is the documented escape hatch for
 *     cross-user team-member inserts + deny-all-anon team-invitations writes.
 *
 * Flow:
 *   1. Authenticate the caller as a verified active advisor.
 *   2. Generate a deduped kebab-case slug from the squad name.
 *   3. Insert `expert_teams` row with verification_status='submitted',
 *      public=false, accepts_briefs=false.
 *   4. Insert the creator's `expert_team_members` row (lead, active).
 *   5. For each invitee email:
 *        - existing active professional  → expert_team_members (pending)
 *          + sendSquadMemberInvite email.
 *        - new email                     → expert_team_invitations row
 *          + sendSquadInvitePending email.
 *   6. Fire the creator confirmation email.
 *   7. Log an admin-queue notification (admin page at /admin/expert-teams).
 *
 * Verification: the schema's CHECK constraint accepts 'submitted' but not
 * 'pending', so the row uses 'submitted' internally. The API response uses
 * `status: 'pending_review'` for the consumer-facing surface as per spec.
 */

import { NextResponse, type NextRequest } from "next/server";
import { randomBytes } from "crypto";
import { z } from "zod";

import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { logger } from "@/lib/logger";
import {
  classifyInvitee,
  dedupeSquadSlug,
  expertTeamSlugTaken,
  lookupProfessionalByEmail,
  SQUAD_MEMBER_ROLES,
} from "@/lib/squad-creation";
import {
  sendSquadCreatedConfirmation,
  sendSquadInvitePending,
  sendSquadMemberInvite,
} from "@/lib/squad-creation-emails";
import { TEAM_CATEGORIES } from "@/lib/api-schemas";
import { BRIEF_TEMPLATES } from "@/lib/briefs/templates";

const log = logger("api:teams-new");

export const runtime = "nodejs";

const InviteSchema = z.object({
  email: z.string().email().max(200),
  role: z.enum(SQUAD_MEMBER_ROLES),
});

const Body = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).optional(),
  team_category: z.enum(TEAM_CATEGORIES),
  accepted_brief_templates: z
    .array(z.enum(BRIEF_TEMPLATES))
    .min(1, "Pick at least one Match Request template")
    .max(BRIEF_TEMPLATES.length),
  invites: z.array(InviteSchema).max(6).default([]),
});

export const POST = withValidatedBody(Body, async (req, body) => {
  // 1. IP rate-limit — max 3 squad creations / hr / IP.
  if (
    !(await isAllowed("teams_new_create", ipKey(req), {
      max: 3,
      refillPerSec: 3 / 3600,
    }))
  ) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  // 2. Advisor session — must be verified + active.
  const advisorId = await requireAdvisorSession(req as NextRequest);
  if (!advisorId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: creator } = await admin
    .from("professionals")
    .select("id, name, email, status, verification_status")
    .eq("id", advisorId)
    .maybeSingle();

  if (
    !creator ||
    creator.status !== "active" ||
    creator.verification_status !== "verified"
  ) {
    return NextResponse.json(
      { error: "Only verified active professionals can create a Pro Squad." },
      { status: 403 },
    );
  }

  // 3. Slug dedup.
  let slug: string;
  try {
    slug = await dedupeSquadSlug(body.name, expertTeamSlugTaken);
  } catch (err) {
    log.error("slug dedup failed", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Could not allocate a unique URL for that name. Try another." },
      { status: 409 },
    );
  }

  // 4. Insert the expert_teams row in 'submitted' verification status.
  //    public=false + accepts_briefs=false until admin approves.
  const { data: team, error: teamErr } = await admin
    .from("expert_teams")
    .insert({
      slug,
      name: body.name.trim(),
      team_category: body.team_category,
      team_type: "independent",
      description: body.description ?? null,
      owner_professional_id: creator.id,
      lead_professional_id: creator.id,
      accepted_brief_templates: body.accepted_brief_templates,
      accepts_briefs: false,
      verification_status: "submitted",
      public: false,
    })
    .select("id, slug, name")
    .single();

  if (teamErr || !team) {
    log.error("expert_teams insert failed", {
      err: teamErr?.message,
      slug,
    });
    return NextResponse.json(
      { error: "Failed to create squad. Please try again." },
      { status: 500 },
    );
  }

  // 5. Creator becomes the lead active member.
  const { error: memberErr } = await admin.from("expert_team_members").insert({
    team_id: team.id,
    professional_id: creator.id,
    member_role: "lead",
    can_receive_briefs: true,
    can_appear_publicly: true,
    status: "active",
    accepted_at: new Date().toISOString(),
  });
  if (memberErr) {
    log.error("creator membership insert failed", {
      err: memberErr.message,
      teamId: team.id,
    });
    // Don't fail the request — the team still exists and admin can repair.
  }

  // 6. Process invites.
  const seen = new Set<string>();
  const creatorEmail = (creator.email as string | null)?.toLowerCase().trim();
  for (const invite of body.invites) {
    const normEmail = invite.email.toLowerCase().trim();
    if (!normEmail || normEmail === creatorEmail || seen.has(normEmail)) {
      continue;
    }
    seen.add(normEmail);

    const classification = await classifyInvitee(
      normEmail,
      lookupProfessionalByEmail,
    );

    if (classification.kind === "existing") {
      const { error: invErr } = await admin
        .from("expert_team_members")
        .insert({
          team_id: team.id,
          professional_id: classification.professionalId,
          member_role: invite.role,
          can_receive_briefs: invite.role !== "observer",
          can_appear_publicly: invite.role !== "observer",
          status: "pending",
        });
      if (invErr) {
        log.warn("invitee membership insert failed", {
          err: invErr.message,
          teamId: team.id,
          email: normEmail,
        });
        continue;
      }
      // Best-effort name lookup for the salutation.
      const { data: pro } = await admin
        .from("professionals")
        .select("name")
        .eq("id", classification.professionalId)
        .maybeSingle();
      void sendSquadMemberInvite({
        inviteeEmail: normEmail,
        inviteeName: (pro?.name as string | null) ?? null,
        creatorName: (creator.name as string | null) ?? "A colleague",
        squadName: team.name as string,
        squadSlug: team.slug as string,
        role: invite.role,
      });
    } else {
      const token = randomBytes(32).toString("hex");
      const { error: pendingErr } = await admin
        .from("expert_team_invitations")
        .insert({
          team_id: team.id,
          email: normEmail,
          invited_role: invite.role,
          invited_by: creator.id,
          token,
          status: "pending",
        });
      if (pendingErr) {
        log.warn("expert_team_invitations insert failed", {
          err: pendingErr.message,
          teamId: team.id,
          email: normEmail,
        });
        continue;
      }
      void sendSquadInvitePending({
        inviteeEmail: normEmail,
        creatorName: (creator.name as string | null) ?? "A colleague",
        squadName: team.name as string,
        invitationToken: token,
        role: invite.role,
      });
    }
  }

  // 7. Creator confirmation + admin notification.
  if (creator.email) {
    void sendSquadCreatedConfirmation({
      creatorEmail: creator.email as string,
      creatorName: (creator.name as string | null) ?? "",
      squadName: team.name as string,
      squadSlug: team.slug as string,
    });
  }

  log.info("Pro Squad created (pending verification)", {
    teamId: team.id,
    slug: team.slug,
    creatorId: creator.id,
    inviteCount: seen.size,
  });

  return NextResponse.json({
    slug: team.slug,
    status: "pending_review",
  });
});
