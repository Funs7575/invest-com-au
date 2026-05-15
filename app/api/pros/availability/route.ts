import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { logger } from "@/lib/logger";
import {
  createSlot,
  ConsultationError,
  listAllSlotsForPro,
} from "@/lib/consultations";

const log = logger("consultations:availability");

const Body = z.object({
  start_at: z.string().min(1).max(64),
  end_at: z.string().min(1).max(64),
  team_id: z.number().int().positive().nullable().optional(),
});

/**
 * POST /api/pros/availability — Pro publishes a new open availability slot.
 */
export async function POST(request: NextRequest) {
  try {
    if (
      !(await isAllowed("pros_availability_create", ipKey(request), {
        max: 30,
        refillPerSec: 0.5,
      }))
    ) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }

    const advisorId = await requireAdvisorSession(request);
    if (!advisorId) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }
    const parsed = Body.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid body." },
        { status: 400 },
      );
    }

    const slot = await createSlot({
      professionalId: advisorId,
      teamId: parsed.data.team_id ?? null,
      startAt: parsed.data.start_at,
      endAt: parsed.data.end_at,
    });
    log.info("availability slot created", {
      slotId: slot.id,
      professionalId: advisorId,
    });
    return NextResponse.json({ slot });
  } catch (err) {
    if (err instanceof ConsultationError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status },
      );
    }
    log.error("availability create error", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Failed to create slot." },
      { status: 500 },
    );
  }
}

/**
 * GET /api/pros/availability — Pro's own upcoming slots (any status).
 *
 * Used by the pros/availability page to render the calendar view.
 */
export async function GET(request: NextRequest) {
  try {
    if (
      !(await isAllowed("pros_availability_list", ipKey(request), {
        max: 60,
        refillPerSec: 1,
      }))
    ) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }
    const advisorId = await requireAdvisorSession(request);
    if (!advisorId) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }
    const slots = await listAllSlotsForPro(advisorId);
    return NextResponse.json({ slots });
  } catch (err) {
    log.error("availability list error", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Failed to list availability." },
      { status: 500 },
    );
  }
}
