import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { isRateLimited } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const log = logger("advisor-auth:profile-details");

const ProfileDetailsSchema = z.object({
  languages_spoken: z.array(z.string().max(50)).max(10).optional(),
  min_client_assets_band: z
    .enum(["any", "100k", "250k", "500k", "1m", "2m", "5m", "10m+"])
    .optional()
    .nullable(),
  specializations: z.array(z.string().max(100)).max(20).optional(),
});

/**
 * GET /api/advisor-auth/profile-details
 * Returns the advisor's services + certifications.
 */
export async function GET(request: NextRequest) {
  const advisorId = await requireAdvisorSession(request);
  if (!advisorId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const admin = createAdminClient();

  const [services, certs] = await Promise.all([
    admin
      .from("advisor_services")
      .select("*")
      .eq("professional_id", advisorId)
      .eq("is_active", true)
      .order("sort_order"),
    admin
      .from("advisor_certifications")
      .select("*")
      .eq("professional_id", advisorId)
      .eq("is_active", true)
      .order("issued_at", { ascending: false }),
  ]);

  return NextResponse.json({
    services: services.data ?? [],
    certifications: certs.data ?? [],
  });
}

/**
 * PATCH /api/advisor-auth/profile-details
 * Update languages_spoken, min_client_assets_band, specializations on professionals.
 */
export async function PATCH(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  if (await isRateLimited(`profile_details_update:${ip}`, 20, 60)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const advisorId = await requireAdvisorSession(request);
  if (!advisorId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = ProfileDetailsSchema.safeParse(raw);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    const path = firstIssue?.path?.join(".") ?? "";
    const message = firstIssue?.message ?? "Invalid request body";
    const error = path ? `${path}: ${message}` : message;
    return NextResponse.json({ error }, { status: 400 });
  }

  const { languages_spoken, min_client_assets_band, specializations } = parsed.data;

  const updates: Record<string, unknown> = {};
  if (languages_spoken !== undefined) updates.languages_spoken = languages_spoken;
  if (min_client_assets_band !== undefined) updates.min_client_assets_band = min_client_assets_band;
  if (specializations !== undefined) updates.specializations = specializations;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ success: true });
  }

  updates.updated_at = new Date().toISOString();

  const admin = createAdminClient();
  const { error } = await admin
    .from("professionals")
    .update(updates)
    .eq("id", advisorId);

  if (error) {
    log.error("profile-details PATCH failed", { advisorId, error });
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
