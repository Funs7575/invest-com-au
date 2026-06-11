/**
 * POST /api/firm-portal/careers/interest
 *
 * Demand-probe endpoint: records a firm admin's interest in hiring
 * through Invest.com.au before the full careers/posting tools exist.
 *
 * Writes a revenue_opportunities row (deduplicated per firm) so demand
 * is visible in the ops queue. Rate limited per IP.
 *
 * Auth: authenticated firm admin only (same gate as /firm-portal/jobs).
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isRateLimited } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const log = logger("firm-portal:careers:interest");

export const runtime = "nodejs";

const InterestSchema = z.object({
  message: z
    .string()
    .max(1000, "Message must be 1000 characters or fewer.")
    .optional(),
});

/** Resolves firm admin context for the calling user. Returns null if not authorised. */
async function resolveFirmAdmin(userId: string, userEmail: string | undefined) {
  const admin = createAdminClient();
  const orClause = userEmail
    ? `auth_user_id.eq.${userId},email.eq.${userEmail}`
    : `auth_user_id.eq.${userId}`;
  const { data } = await admin
    .from("professionals")
    .select("id, firm_id, is_firm_admin, status")
    .or(orClause)
    .in("status", ["active", "pending"])
    .maybeSingle();

  if (!data || !data.firm_id || !data.is_firm_admin) return null;
  return { proId: data.id as string, firmId: data.firm_id as string };
}

export const POST = withValidatedBody(
  InterestSchema,
  async (req: NextRequest, body) => {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

    if (await isRateLimited(`firm-careers-interest:${ip}`, 10, 60)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 },
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
    }

    const ctx = await resolveFirmAdmin(user.id, user.email ?? undefined);
    if (!ctx) {
      return NextResponse.json(
        { error: "Firm admin access required." },
        { status: 403 },
      );
    }

    const admin = createAdminClient();

    // Upsert a revenue_opportunity row so demand shows up in the ops queue.
    // One row per firm — ignoreDuplicates prevents double-counting.
    const { error: oppError } = await admin
      .from("revenue_opportunities")
      .upsert(
        {
          opportunity_type: "firm_careers_demand",
          title: `Firm ${ctx.firmId} — wants to hire via careers board`,
          description:
            body.message?.trim() ||
            "Firm admin expressed interest in hiring via Invest.com.au careers board.",
          confidence: "medium",
          status: "new",
          surfaced_by_agent: "CO-stream",
          detail: {
            firm_id: ctx.firmId,
            pro_id: ctx.proId,
            message: body.message?.trim() ?? null,
          },
        },
        {
          onConflict: "opportunity_type,title",
          ignoreDuplicates: true,
        },
      );

    if (oppError) {
      log.error("firm careers interest: upsert failed", {
        error: oppError.message,
        firmId: ctx.firmId,
      });
      return NextResponse.json(
        { error: "Failed to record interest. Please try again." },
        { status: 500 },
      );
    }

    log.info("firm careers interest: recorded", { firmId: ctx.firmId });
    return NextResponse.json({ ok: true });
  },
);
