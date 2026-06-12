/**
 * Advisor weekly availability editor (booking-v2).
 *
 *   GET  — return the advisor's weekly template + whether booking-v2 is enabled.
 *   PUT  — replace the entire weekly template (delete-then-insert).
 *
 * Auth: advisor session (professional_id). Double-gated behind the `booking_v2`
 * feature flag — with the flag off, GET reports `enabled:false` and PUT 403s, so
 * the editor stays dormant and writes nothing.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import { isRateLimited } from "@/lib/rate-limit";
import {
  isBookingV2Enabled,
  listWeeklyTemplate,
  replaceWeeklyTemplate,
  type WeeklyTemplateInput,
} from "@/lib/booking-v2";
import type { DayOfWeek } from "@/lib/booking-v2/types";

export const runtime = "nodejs";

const HMS = /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;

const TemplateRow = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(HMS, "startTime must be HH:MM or HH:MM:SS"),
  endTime: z.string().regex(HMS, "endTime must be HH:MM or HH:MM:SS"),
  slotDurationMinutes: z.number().int().min(5).max(240),
  isActive: z.boolean().optional(),
});

const PutBody = z.object({
  // Cap the number of windows to keep the delete-then-insert bounded.
  rows: z.array(TemplateRow).max(60),
});

async function advisorEmail(advisorId: number): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("professionals")
    .select("email")
    .eq("id", advisorId)
    .maybeSingle();
  return (data?.email as string | null) ?? null;
}

export async function GET(req: NextRequest) {
  const advisorId = await requireAdvisorSession(req);
  if (!advisorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const enabled = await isBookingV2Enabled(await advisorEmail(advisorId));
  if (!enabled) {
    // Dormant: report disabled and return nothing to edit.
    return NextResponse.json({ enabled: false, rows: [] });
  }

  const rows = await listWeeklyTemplate(advisorId);
  return NextResponse.json({
    enabled: true,
    rows: rows.map((r) => ({
      id: r.id,
      dayOfWeek: r.day_of_week,
      startTime: r.start_time,
      endTime: r.end_time,
      slotDurationMinutes: r.slot_duration_minutes ?? 30,
      isActive: r.is_active ?? true,
    })),
  });
}

export const PUT = withValidatedBody(PutBody, async (req, body) => {
  const advisorId = await requireAdvisorSession(req);
  if (!advisorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  if (await isRateLimited(`advisor_availability_edit:${ip}:${advisorId}`, 20, 60)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const enabled = await isBookingV2Enabled(await advisorEmail(advisorId));
  if (!enabled) {
    return NextResponse.json({ error: "Scheduling is not enabled." }, { status: 403 });
  }

  const rows: WeeklyTemplateInput[] = body.rows.map((r) => ({
    dayOfWeek: r.dayOfWeek as DayOfWeek,
    startTime: r.startTime,
    endTime: r.endTime,
    slotDurationMinutes: r.slotDurationMinutes,
    isActive: r.isActive,
  }));

  const result = await replaceWeeklyTemplate(advisorId, rows);
  if (!result.ok) {
    const status = result.error?.startsWith("invalid_") ? 400 : 500;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({ ok: true, count: result.count });
});
