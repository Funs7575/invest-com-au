import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { logger } from "@/lib/logger";
import {
  createReferral,
  ReferralError,
} from "@/lib/team-brief-referrals";
import { sendReferralReceivedEmail } from "@/lib/marketplace-squad-emails";

const log = logger("api:team-referrals:create");

const CreateReferralBody = z.object({
  briefId: z.number().int().positive(),
  toTeamId: z.number().int().positive(),
  note: z.string().max(2000).optional().nullable(),
});

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  try {
    if (
      !(await isAllowed("team_referrals_create", ipKey(request), {
        max: 20,
        refillPerSec: 0.1,
      }))
    ) {
      return NextResponse.json(
        { error: "Too many requests." },
        { status: 429 },
      );
    }

    const advisorId = await requireAdvisorSession(request);
    if (!advisorId) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }

    const { slug } = await ctx.params;
    const admin = createAdminClient();
    const { data: fromTeam, error: teamErr } = await admin
      .from("expert_teams")
      .select("id, name, verification_status")
      .eq("slug", slug)
      .maybeSingle();
    if (teamErr) {
      log.error("from-team lookup failed", { error: teamErr.message });
      return NextResponse.json(
        { error: "Failed to load team." },
        { status: 500 },
      );
    }
    if (!fromTeam) {
      return NextResponse.json({ error: "Team not found." }, { status: 404 });
    }

    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body." },
        { status: 400 },
      );
    }
    const parsed = CreateReferralBody.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            parsed.error.issues[0]?.message ?? "Invalid request body.",
        },
        { status: 400 },
      );
    }

    try {
      const referral = await createReferral({
        briefId: parsed.data.briefId,
        fromTeamId: fromTeam.id as number,
        toTeamId: parsed.data.toTeamId,
        fromProfessionalId: advisorId,
        note: parsed.data.note ?? null,
      });

      // Fire-and-forget notification email. Never block the response.
      sendReferralReceivedEmail({
        toTeamId: parsed.data.toTeamId,
        briefId: parsed.data.briefId,
        fromTeamName: fromTeam.name as string,
        note: parsed.data.note ?? null,
      }).catch((err: unknown) => {
        log.warn("referral email failed", {
          error: err instanceof Error ? err.message : String(err),
        });
      });

      return NextResponse.json({ referral }, { status: 201 });
    } catch (err) {
      if (err instanceof ReferralError) {
        const httpStatus = mapReferralErrorStatus(err.code);
        return NextResponse.json(
          { error: err.code },
          { status: httpStatus },
        );
      }
      throw err;
    }
  } catch (err) {
    log.error("create-referral error", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Failed to create referral." },
      { status: 500 },
    );
  }
}

function mapReferralErrorStatus(code: string): number {
  switch (code) {
    case "self_referral_not_allowed":
    case "team_not_verified":
      return 400;
    case "not_team_member":
      return 403;
    case "team_not_found":
    case "brief_not_found":
      return 404;
    case "duplicate_referral":
    case "brief_already_accepted":
      return 409;
    default:
      return 500;
  }
}
