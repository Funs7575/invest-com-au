import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  listOpenSlots,
  claimSlot,
} from "@/lib/advisor-booking";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { logger } from "@/lib/logger";

const log = logger("api:advisor-appointments");

const AppointmentBody = z.object({
  slot_id: z.number().int().positive(),
  email: z.string().email(),
  name: z.string().min(1),
  lead_id: z.number().int().positive().optional(),
});

export const runtime = "nodejs";

/**
 * /api/advisor-appointments
 *
 * Wave 17 first-party booking appointments (concrete time slots).
 * Distinct from the existing /api/advisor-booking route which
 * walks the recurring weekly advisor_booking_slots table to
 * generate free-form slot proposals.
 *
 *   GET  ?professional_id=42 — list open future slots
 *   POST                      — claim a slot
 *                                Body: { slot_id, email, name, lead_id? }
 *
 * Concurrency: claimSlot() uses a conditional update so two
 * clients hitting the same slot see one success, one 409.
 */
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("professional_id");
  if (!id) {
    return NextResponse.json(
      { error: "Missing professional_id" },
      { status: 400 },
    );
  }
  const n = parseInt(id, 10);
  if (!Number.isInteger(n) || n <= 0) {
    return NextResponse.json(
      { error: "Invalid professional_id" },
      { status: 400 },
    );
  }
  const items = await listOpenSlots(n);
  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  if (
    !(await isAllowed("advisor_booking_claim", ipKey(request), {
      max: 10,
      refillPerSec: 10 / 600,
    }))
  ) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const rawBody = await request.json().catch(() => null);
  const bodyResult = AppointmentBody.safeParse(rawBody);
  if (!bodyResult.success) {
    return NextResponse.json(
      { error: "Missing slot_id, email or name" },
      { status: 400 },
    );
  }
  const { slot_id: slotId, email, name, lead_id: leadId } = bodyResult.data;

  const result = await claimSlot({
    slotId,
    bookedByEmail: email,
    bookedByName: name,
    leadId,
  });

  if (!result.ok) {
    const status = result.error === "already_taken" ? 409 : 400;
    log.info("claim failed", { slotId, error: result.error });
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ ok: true, slot: result.slot });
}
