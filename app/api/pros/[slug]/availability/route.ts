import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { logger } from "@/lib/logger";
import { listAvailabilityForPro } from "@/lib/consultations";

const log = logger("consultations:availability");

/**
 * GET /api/pros/[slug]/availability — Public list of a pro's open
 * availability slots. Anon-readable so the consumer can render the
 * options on the brief tracker without signing in.
 */
export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  try {
    if (
      !(await isAllowed("pros_availability_public", ipKey(request), {
        max: 120,
        refillPerSec: 2,
      }))
    ) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }
    const { slug } = await ctx.params;
    if (!slug || slug.length > 200) {
      return NextResponse.json({ error: "Invalid slug." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: pro } = await admin
      .from("professionals")
      .select("id, name, slug")
      .eq("slug", slug)
      .in("status", ["active", "pending"])
      .maybeSingle();
    if (!pro) {
      return NextResponse.json({ error: "Pro not found." }, { status: 404 });
    }

    const slots = await listAvailabilityForPro(pro.id as number);
    return NextResponse.json({
      professional: { id: pro.id, name: pro.name, slug: pro.slug },
      slots,
    });
  } catch (err) {
    log.error("public availability list error", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Failed to list availability." },
      { status: 500 },
    );
  }
}
