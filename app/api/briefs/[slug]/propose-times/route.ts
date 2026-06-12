/**
 * POST /api/briefs/[slug]/propose-times — adviser proposes 2–3 meeting times
 * inside the brief chat. Creates free advisor_booking_appointments rows and
 * posts a chat message carrying the proposal payload in metadata.
 *
 * Auth: must be the accepting professional (or a member of the accepting team).
 * Gated behind booking_v2 (fail-closed). No payment — free booking.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { isProfessionalOnTeam } from "@/lib/expert-teams";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { logger } from "@/lib/logger";
import { sendMessage, BriefMessageError } from "@/lib/brief-messages";
import {
  isBookingV2Enabled,
  createProposalAppointments,
} from "@/lib/booking-v2";
import type { ProposeTimesPayload } from "@/lib/booking-v2/types";

export const runtime = "nodejs";

const log = logger("api:briefs:propose-times");

const Body = z.object({
  slots: z
    .array(
      z.object({
        startsAt: z.string().datetime(),
        durationMinutes: z.number().int().min(5).max(240),
      }),
    )
    .min(1)
    .max(3),
  note: z.string().max(500).optional(),
});

interface BriefMeta {
  id: number;
  accepted_at: string | null;
  accepted_by_professional_id: number | null;
  accepted_by_team_id: number | null;
}

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  try {
    if (
      !(await isAllowed("briefs_propose_times", ipKey(request), {
        max: 20,
        refillPerSec: 20 / 600,
      }))
    ) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }

    const { slug } = await ctx.params;
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }
    const parsed = Body.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid body." },
        { status: 400 },
      );
    }

    const admin = createAdminClient();
    const { data: briefRaw } = await admin
      .from("advisor_auctions")
      .select(
        "id, accepted_at, accepted_by_professional_id, accepted_by_team_id, lead_id",
      )
      .eq("slug", slug)
      .eq("flow_type", "accept")
      .maybeSingle();
    if (!briefRaw) {
      return NextResponse.json({ error: "Brief not found." }, { status: 404 });
    }
    const brief = briefRaw as BriefMeta & { lead_id: number | null };
    if (!brief.accepted_at || !brief.accepted_by_professional_id) {
      return NextResponse.json(
        { error: "Brief has not been accepted yet." },
        { status: 409 },
      );
    }

    // Auth: only the accepting pro (or accepting-team member) may propose.
    const advisorId = await requireAdvisorSession(request);
    if (!advisorId) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }
    const isAcceptingPro = brief.accepted_by_professional_id === advisorId;
    const onTeam =
      brief.accepted_by_team_id !== null &&
      (await isProfessionalOnTeam(brief.accepted_by_team_id, advisorId));
    if (!isAcceptingPro && !onTeam) {
      return NextResponse.json(
        { error: "Only the accepting adviser can propose times." },
        { status: 403 },
      );
    }

    // Flag gate (fail-closed) — keyed off nothing global here; this is the
    // adviser-facing action so a global flag-off hides it everywhere.
    if (!(await isBookingV2Enabled())) {
      return NextResponse.json({ error: "Not available." }, { status: 403 });
    }

    const result = await createProposalAppointments({
      professionalId: brief.accepted_by_professional_id,
      leadId: brief.lead_id,
      slots: parsed.data.slots,
      note: parsed.data.note ?? null,
    });
    if (!result.ok) {
      const status = result.error?.startsWith("slot_") || result.error?.startsWith("invalid_")
        ? 400
        : 500;
      return NextResponse.json({ error: result.error }, { status });
    }

    const payload: ProposeTimesPayload = {
      kind: "propose_times",
      appointmentIds: result.created.map((s) => s.id),
      slots: result.created.map((s) => ({
        id: s.id,
        startsAt: s.startsAt,
        endsAt: s.endsAt,
      })),
    };

    // Human-readable body so the message reads sensibly even if a client
    // doesn't render the structured proposal.
    const body =
      `I've proposed ${result.created.length} time${result.created.length > 1 ? "s" : ""} to meet — tap one below to confirm.` +
      (parsed.data.note ? `\n\n${parsed.data.note}` : "");

    const sendAs =
      isAcceptingPro && brief.accepted_by_team_id === null
        ? { kind: "professional" as const, professionalId: advisorId, teamId: null }
        : {
            kind: "team" as const,
            professionalId: advisorId,
            teamId: brief.accepted_by_team_id,
          };

    const message = await sendMessage({
      briefId: brief.id,
      senderKind: sendAs.kind,
      senderProfessionalId: sendAs.professionalId,
      senderTeamId: sendAs.teamId,
      body,
      metadata: payload as unknown as Record<string, unknown>,
    });

    return NextResponse.json({ message });
  } catch (err) {
    if (err instanceof BriefMessageError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    log.error("propose-times failed", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Failed to propose times." }, { status: 500 });
  }
}
