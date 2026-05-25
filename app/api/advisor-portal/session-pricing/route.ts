import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
// eslint-disable-next-line no-restricted-imports -- service-role legitimate: updates professionals row not owned by auth.uid() (advisor's auth_user_id lookup + cross-table update)
import { createAdminClient } from "@/lib/supabase/admin";
import { isRateLimited } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const log = logger("advisor-portal:session-pricing");

export const runtime = "nodejs";

const UpdateSchema = z.object({
  priceInDollars: z.number().int().min(0).max(10_000).nullable(),
});

async function getAdvisorId(userEmail: string): Promise<number | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("professionals")
    .select("id")
    .eq("email", userEmail)
    .eq("status", "active")
    .maybeSingle();
  return (data as { id: number } | null)?.id ?? null;
}

/**
 * GET /api/advisor-portal/session-pricing
 * Returns the advisor's current session_price_cents (null = free booking).
 */
export async function GET(_req: NextRequest): Promise<Response> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("professionals")
    .select("session_price_cents")
    .eq("email", user.email)
    .eq("status", "active")
    .maybeSingle();

  if (!data) {
    return NextResponse.json({ error: "Advisor not found." }, { status: 404 });
  }

  const priceCents = (data as Record<string, unknown>).session_price_cents as number | null;
  return NextResponse.json({
    sessionPriceCents: priceCents,
    priceInDollars: priceCents !== null ? priceCents / 100 : null,
  });
}

/**
 * PUT /api/advisor-portal/session-pricing
 * Sets the advisor's session_price_cents.
 * priceInDollars: null or 0 → free booking (clears the price).
 * priceInDollars: 1–10000 → sets price in whole dollars (min $1, max $10,000).
 */
export async function PUT(req: NextRequest): Promise<Response> {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (await isRateLimited(`adv-session-pricing:${ip}`, 20, 60)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request.", issues: parsed.error.issues }, { status: 400 });
  }

  const advisorId = await getAdvisorId(user.email);
  if (!advisorId) {
    return NextResponse.json({ error: "Advisor not found." }, { status: 404 });
  }

  const priceCents =
    parsed.data.priceInDollars === null || parsed.data.priceInDollars === 0
      ? null
      : parsed.data.priceInDollars * 100;

  const admin = createAdminClient();
  const { error } = await admin
    .from("professionals")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update({ session_price_cents: priceCents } as any)
    .eq("id", advisorId);

  if (error) {
    log.error("session_price_cents update failed", { advisorId, error: error.message });
    return NextResponse.json({ error: "Failed to update pricing." }, { status: 500 });
  }

  log.info("session_price_cents updated", { advisorId, priceCents });
  return NextResponse.json({ ok: true, sessionPriceCents: priceCents });
}
