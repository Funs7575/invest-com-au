import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { logger } from "@/lib/logger";
import { AcceptBriefRequest } from "@/lib/api-schemas";
import { acceptBrief } from "@/lib/briefs/credits";
import { isProfessionalOnTeam } from "@/lib/expert-teams";
import { notifyConsumerOfAcceptance } from "@/lib/briefs/notify";
import { attributeBriefAccepted } from "@/lib/pro-affiliate/track";

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

    // ── Pro affiliate attribution (fire-and-forget) ──
    // Credit the originally referring pro for a real billable event.
    // Never block the response.
    void attributeBriefAccepted({ briefId: brief.id as number }).catch((err) => {
      log.warn("attributeBriefAccepted failed", {
        briefId: brief.id,
        err: err instanceof Error ? err.message : String(err),
      });
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
        briefId: brief.id as number,
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
