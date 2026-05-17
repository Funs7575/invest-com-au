import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { PostDisputeMessageRequest } from "@/lib/api-schemas";
import {
  DisputeError,
  addMessage,
  type DisputeSenderKind,
} from "@/lib/disputes";
import { isProfessionalOnTeam } from "@/lib/expert-teams";
import { logger } from "@/lib/logger";

const log = logger("api:disputes:messages");

interface DisputeBrief {
  id: number;
  brief_id: number;
  contact_email: string | null;
  accepted_by_professional_id: number | null;
  accepted_by_team_id: number | null;
}

interface ResolvedSender {
  kind: DisputeSenderKind;
  userId: string | null;
}

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    if (
      !(await isAllowed("brief_disputes_msg_ip", ipKey(request), {
        max: 30,
        refillPerSec: 30 / 60,
      }))
    ) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }

    const { id } = await ctx.params;
    const disputeId = Number(id);
    if (!Number.isFinite(disputeId)) {
      return NextResponse.json(
        { error: "Invalid dispute id." },
        { status: 400 },
      );
    }

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }
    const parsed = PostDisputeMessageRequest.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid body." },
        { status: 400 },
      );
    }

    const admin = createAdminClient();
    const { data: lookup } = await admin
      .from("brief_disputes")
      .select(
        "id, brief_id, advisor_auctions:advisor_auctions!brief_disputes_brief_id_fkey(contact_email, accepted_by_professional_id, accepted_by_team_id)",
      )
      .eq("id", disputeId)
      .maybeSingle();
    if (!lookup) {
      return NextResponse.json(
        { error: "Dispute not found." },
        { status: 404 },
      );
    }
    const join = (lookup as unknown as {
      id: number;
      brief_id: number;
      advisor_auctions:
        | {
            contact_email: string | null;
            accepted_by_professional_id: number | null;
            accepted_by_team_id: number | null;
          }
        | null;
    }).advisor_auctions;
    const briefMeta: DisputeBrief = {
      id: lookup.id as number,
      brief_id: lookup.brief_id as number,
      contact_email: join?.contact_email ?? null,
      accepted_by_professional_id: join?.accepted_by_professional_id ?? null,
      accepted_by_team_id: join?.accepted_by_team_id ?? null,
    };

    const sender = await resolveSender(request, briefMeta);
    if (!sender) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }

    const userKey =
      sender.userId ?? ipKey(request);
    if (
      !(await isAllowed("brief_disputes_msg_user", `${disputeId}:${userKey}`, {
        max: 30,
        refillPerSec: 30 / 60,
      }))
    ) {
      return NextResponse.json(
        { error: "You're sending messages too quickly. Try again in a minute." },
        { status: 429 },
      );
    }

    const row = await addMessage({
      disputeId,
      senderKind: sender.kind,
      senderUserId: sender.userId,
      body: parsed.data.body,
    });

    return NextResponse.json({ message: row });
  } catch (err) {
    if (err instanceof DisputeError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    log.error("post dispute message failed", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Failed to send message." },
      { status: 500 },
    );
  }
}

async function resolveSender(
  request: NextRequest,
  brief: DisputeBrief,
): Promise<ResolvedSender | null> {
  const advisorId = await requireAdvisorSession(request);
  if (advisorId) {
    if (
      brief.accepted_by_professional_id !== null &&
      brief.accepted_by_professional_id === advisorId
    ) {
      if (brief.accepted_by_team_id !== null) {
        const onTeam = await isProfessionalOnTeam(
          brief.accepted_by_team_id,
          advisorId,
        );
        if (onTeam) {
          return { kind: "team", userId: null };
        }
      }
      return { kind: "professional", userId: null };
    }
    if (brief.accepted_by_team_id !== null) {
      const onTeam = await isProfessionalOnTeam(
        brief.accepted_by_team_id,
        advisorId,
      );
      if (onTeam) return { kind: "team", userId: null };
    }
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user?.email && brief.contact_email) {
    if (user.email.toLowerCase() === brief.contact_email.toLowerCase()) {
      return { kind: "consumer", userId: user.id };
    }
  }
  return null;
}
