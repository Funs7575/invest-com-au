import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { OpenDisputeRequest } from "@/lib/api-schemas";
import {
  DisputeError,
  openDispute,
  type DisputeOpenedByKind,
} from "@/lib/disputes";
import { isProfessionalOnTeam } from "@/lib/expert-teams";
import { dispatchPushToAdvisor } from "@/lib/advisor-push";
import { logger } from "@/lib/logger";

const log = logger("api:briefs:disputes:open");

interface BriefMeta {
  id: number;
  contact_email: string | null;
  accepted_at: string | null;
  accepted_by_professional_id: number | null;
  accepted_by_team_id: number | null;
}

interface ResolvedOpener {
  kind: DisputeOpenedByKind;
  userId: string | null;
  email: string;
}

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  try {
    if (
      !(await isAllowed("brief_disputes_open_ip", ipKey(request), {
        max: 5,
        refillPerSec: 5 / 60,
      }))
    ) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }

    const { slug } = await ctx.params;

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }
    const parsed = OpenDisputeRequest.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid body." },
        { status: 400 },
      );
    }

    const admin = createAdminClient();
    const { data: briefRaw } = await admin
      .from("advisor_auctions")
      .select(
        "id, contact_email, accepted_at, accepted_by_professional_id, accepted_by_team_id",
      )
      .eq("slug", slug)
      .eq("flow_type", "accept")
      .maybeSingle();

    if (!briefRaw) {
      return NextResponse.json({ error: "Brief not found." }, { status: 404 });
    }
    const brief = briefRaw as BriefMeta;

    const opener = await resolveOpener(request, brief);
    if (!opener) {
      return NextResponse.json(
        { error: "Sign in as the brief's consumer or the accepted pro to open a dispute." },
        { status: 401 },
      );
    }

    const row = await openDispute({
      briefId: brief.id,
      openedByKind: opener.kind,
      openedByUserId: opener.userId,
      openedByEmail: opener.email,
      reason: parsed.data.reason,
      evidenceUrls: parsed.data.evidence_urls ?? [],
    });

    // ── Push the accepted adviser (Adviser Push Command Centre) ──────────
    // Only when the CONSUMER opens — a pro/team opening a dispute is their own
    // action and must not self-ping. Flag-gated + preference-gated + fail-soft
    // in the helper. Deep-links to the shared brief tracker (dispute surface).
    if (opener.kind === "consumer" && brief.accepted_by_professional_id) {
      void dispatchPushToAdvisor(brief.accepted_by_professional_id, "dispute", {
        title: "Dispute opened on your brief",
        body: "A consumer raised a dispute — open the brief to respond.",
        url: `/briefs/${slug}`,
        tag: `advisor-dispute-${brief.id}`,
      });
    }

    return NextResponse.json({ dispute: row });
  } catch (err) {
    if (err instanceof DisputeError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    log.error("open dispute failed", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Failed to open dispute." }, { status: 500 });
  }
}

async function resolveOpener(
  request: NextRequest,
  brief: BriefMeta,
): Promise<ResolvedOpener | null> {
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
          return {
            kind: "team",
            userId: null,
            email: await advisorEmail(advisorId),
          };
        }
      }
      return {
        kind: "professional",
        userId: null,
        email: await advisorEmail(advisorId),
      };
    }
    if (brief.accepted_by_team_id !== null) {
      const onTeam = await isProfessionalOnTeam(
        brief.accepted_by_team_id,
        advisorId,
      );
      if (onTeam) {
        return {
          kind: "team",
          userId: null,
          email: await advisorEmail(advisorId),
        };
      }
    }
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user?.email && brief.contact_email) {
    if (user.email.toLowerCase() === brief.contact_email.toLowerCase()) {
      return {
        kind: "consumer",
        userId: user.id,
        email: user.email,
      };
    }
  }
  return null;
}

async function advisorEmail(advisorId: number): Promise<string> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("professionals")
    .select("email")
    .eq("id", advisorId)
    .maybeSingle();
  return (data?.email as string | null) ?? `pro-${advisorId}@invest.com.au`;
}
