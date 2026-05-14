import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { logger } from "@/lib/logger";
import { AcceptBriefRequest } from "@/lib/api-schemas";
import { acceptBrief } from "@/lib/briefs/credits";
import { isProfessionalOnTeam } from "@/lib/expert-teams";
import { sendConsumerProviderAccepted } from "@/lib/marketplace-emails";
import { enqueueUserNotificationByEmail } from "@/lib/user-notifications";

const log = logger("briefs:accept");

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  try {
    if (!(await isAllowed("briefs_accept", ipKey(request), { max: 30, refillPerSec: 0.5 }))) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }
    const advisorId = await requireAdvisorSession(request);
    if (!advisorId) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }
    const { slug } = await ctx.params;

    let rawBody: unknown = {};
    try {
      rawBody = await request.json();
    } catch {
      // Body is optional — empty defaults handled by schema.
    }
    const parsed = AcceptBriefRequest.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid body." },
        { status: 400 },
      );
    }

    const admin = createAdminClient();
    const { data: brief } = await admin
      .from("advisor_auctions")
      .select("id, slug, job_title, contact_email, contact_name, contact_phone")
      .eq("slug", slug)
      .eq("flow_type", "accept")
      .maybeSingle();

    if (!brief) {
      return NextResponse.json({ error: "Brief not found." }, { status: 404 });
    }

    // If team_id supplied, verify the advisor is an active member.
    const teamId = parsed.data.team_id ?? null;
    if (teamId !== null) {
      const isMember = await isProfessionalOnTeam(teamId, advisorId);
      if (!isMember) {
        return NextResponse.json(
          { error: "You are not an active member of this team." },
          { status: 403 },
        );
      }
    }

    const result = await acceptBrief({
      briefId: brief.id as number,
      professionalId: advisorId,
      teamId,
    });

    if (!result.accepted) {
      const map: Record<string, { code: number; message: string }> = {
        already_accepted: {
          code: 409,
          message: "Another provider has already accepted this brief.",
        },
        not_acceptable: {
          code: 400,
          message: "This brief is no longer accepting providers.",
        },
        insufficient_credits: {
          code: 402,
          message: "You do not have enough credits. Top up to accept this brief.",
        },
        brief_not_found: { code: 404, message: "Brief not found." },
        risk_held: {
          code: 403,
          message: "This brief is held for review and is not available yet.",
        },
      };
      const m = map[result.reason] ?? { code: 400, message: "Could not accept." };
      return NextResponse.json({ error: m.message, reason: result.reason }, { status: m.code });
    }

    log.info("Brief accepted", {
      briefId: brief.id,
      professionalId: advisorId,
      teamId,
      credits: result.creditsSpent,
    });

    // ── Notify the consumer their brief was accepted (N1) ──
    // Fire-and-forget. We need to look up the accepting provider's name
    // for the email body. Failures swallowed.
    if (brief.contact_email && typeof brief.contact_email === "string") {
      void notifyConsumerOfAcceptance({
        consumerEmail: brief.contact_email as string,
        consumerName: (brief.contact_name as string) ?? "",
        briefTitle: (brief.job_title as string) ?? "Your Match Request",
        briefSlug: brief.slug as string,
        professionalId: advisorId,
        teamId,
      }).catch((err) => {
        log.warn("notifyConsumerOfAcceptance failed", {
          err: err instanceof Error ? err.message : String(err),
        });
      });
    }

    return NextResponse.json({
      success: true,
      credits_spent: result.creditsSpent,
      balance_after_cents: result.balanceAfterCents,
      contact: {
        name: brief.contact_name,
        email: brief.contact_email,
        phone: brief.contact_phone,
      },
      brief: result.brief,
    });
  } catch (err) {
    log.error("accept error", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Failed to accept brief." }, { status: 500 });
  }
}

// ─── Consumer notification helper (N1) ───────────────────────────────────

async function notifyConsumerOfAcceptance(input: {
  consumerEmail: string;
  consumerName: string;
  briefTitle: string;
  briefSlug: string;
  professionalId: number;
  teamId: number | null;
}): Promise<void> {
  const admin = createAdminClient();

  // Look up provider name. Team route uses the team name; individual /
  // firm route uses the professional name.
  let providerName = "A verified pro";
  let providerKind: "individual" | "firm" | "expert_team" = "individual";

  if (input.teamId) {
    const { data: team } = await admin
      .from("expert_teams")
      .select("name")
      .eq("id", input.teamId)
      .maybeSingle();
    if (team?.name) providerName = team.name as string;
    providerKind = "expert_team";
  } else {
    const { data: pro } = await admin
      .from("professionals")
      .select("name, firm_id")
      .eq("id", input.professionalId)
      .maybeSingle();
    if (pro?.name) providerName = pro.name as string;
    providerKind = pro?.firm_id ? "firm" : "individual";
  }

  await sendConsumerProviderAccepted({
    consumerEmail: input.consumerEmail,
    consumerName: input.consumerName,
    briefTitle: input.briefTitle,
    briefSlug: input.briefSlug,
    providerName,
    providerKind,
  });

  // ── In-app inbox (C1 / mm06) ─────────────────────────────────────
  // Drop a `brief_accepted` row in the consumer's notification inbox
  // alongside the email so users without inbox-monitoring habits still
  // see the news on next visit. Anonymous-brief flows have a contact
  // email that doesn't resolve to an auth.users row — the helper
  // returns `false` in that case and we silently no-op.
  try {
    await enqueueUserNotificationByEmail(input.consumerEmail, {
      kind: "brief_accepted",
      title: `${providerName} accepted your Match Request`,
      body: `Re: ${input.briefTitle}. Your contact details have been shared with the pro.`,
      href: `/briefs/${input.briefSlug}`,
    });
  } catch {
    /* silent — inbox failure must never break the accept response */
  }
}
