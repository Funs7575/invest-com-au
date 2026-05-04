import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createRateLimiter } from "@/lib/rate-limiter";

const isRateLimited = createRateLimiter(60_000, 120); // 120 events/min per IP (impressions + clicks)

const AbTrackBody = z.object({
  test_id: z.number().int().positive(),
  variant: z.enum(["a", "b"]),
  event_type: z.enum(["impression", "click"]),
  broker_slug: z.string().optional(),
});

export async function POST(request: NextRequest) {
  // Rate limit by IP
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";

  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = AbTrackBody.safeParse(rawBody);
  if (!parsed.success) {
    // Surface the first failing field name so tests can assert field-specific messages.
    const firstField = parsed.error.issues[0]?.path[0] ?? "request";
    return NextResponse.json({ error: `Invalid ${String(firstField)}` }, { status: 400 });
  }
  const { test_id, variant, event_type } = parsed.data;

  const supabase = createAdminClient();

  // Atomically increment the correct counter
  // Build the column name: e.g. "impressions_a", "clicks_b"
  const column = `${event_type === "impression" ? "impressions" : "clicks"}_${variant}`;

  // Use raw SQL for atomic increment
  const { error } = await supabase.rpc("increment_ab_counter" as never, {
    p_test_id: test_id,
    p_column: column,
  } as never);

  if (error) {
    // Fallback: read-then-write (less safe but works without RPC)
    const { data: test } = await supabase
      .from("site_ab_tests")
      .select("id, impressions_a, impressions_b, clicks_a, clicks_b")
      .eq("id", test_id)
      .eq("status", "running")
      .single();

    if (!test) {
      return NextResponse.json({ error: "Test not found or not running" }, { status: 404 });
    }

    const updateData: Record<string, number> = {};
    updateData[column] = ((test as Record<string, number>)[column] || 0) + 1;

    const { error: updateError } = await supabase
      .from("site_ab_tests")
      .update(updateData)
      .eq("id", test_id);

    if (updateError) {
      return NextResponse.json({ error: "Failed to update counter" }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
