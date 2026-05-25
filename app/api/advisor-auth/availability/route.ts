import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { isRateLimited } from "@/lib/rate-limit";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";

const AvailabilityBody = z.object({
  status: z.enum(["open", "waitlist", "closed"]),
});

export const PATCH = withValidatedBody(AvailabilityBody, async (request, body) => {
  const advisorId = await requireAdvisorSession(request);
  if (!advisorId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  if (await isRateLimited(`advisor_availability:${ip}:${advisorId}`, 10, 1)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("professionals")
    .update({ availability_status: body.status })
    .eq("id", advisorId);

  if (error) return NextResponse.json({ error: "Failed to update availability" }, { status: 500 });

  return NextResponse.json({ success: true, status: body.status });
});

export async function GET(request: NextRequest) {
  const advisorId = await requireAdvisorSession(request);
  if (!advisorId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("professionals")
    .select("availability_status")
    .eq("id", advisorId)
    .single();

  if (error) return NextResponse.json({ error: "Failed to fetch availability" }, { status: 500 });

  return NextResponse.json({ status: data.availability_status ?? "open" });
}
