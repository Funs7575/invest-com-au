import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { getBriefDossier } from "@/lib/brief-intel";
import { logger } from "@/lib/logger";

const log = logger("briefs:dossier");

const ParamsSchema = z.object({ slug: z.string().min(1).max(120) });

/**
 * GET /api/briefs/[slug]/dossier — intelligence dossier for one masked
 * brief, fetched lazily when an adviser expands the Dossier section in
 * their inbox (never bulk-fetched, so inbox render stays O(1) queries).
 *
 * Auth: advisor session (same gate as the masked preview endpoint).
 * Content is aggregate-only: suburb context from public datasets,
 * anonymised similar-brief stats, and the calling adviser's OWN track
 * record. No consumer PII, no other advisers' identities or bids.
 */
export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  try {
    if (!(await isAllowed("briefs_dossier", ipKey(request), { max: 30, refillPerSec: 0.5 }))) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }
    const advisorId = await requireAdvisorSession(request);
    if (!advisorId) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }

    const parsed = ParamsSchema.safeParse(await ctx.params);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid brief reference." }, { status: 400 });
    }

    const dossier = await getBriefDossier(parsed.data.slug, advisorId);
    if (!dossier) {
      return NextResponse.json({ error: "Brief not found." }, { status: 404 });
    }

    return NextResponse.json(
      { dossier },
      // Market aggregates move slowly; private cache keeps re-expands snappy.
      { headers: { "Cache-Control": "private, max-age=300" } },
    );
  } catch (err) {
    log.error("dossier error", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Failed to load dossier." }, { status: 500 });
  }
}
