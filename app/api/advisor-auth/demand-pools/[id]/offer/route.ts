import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { isFlagEnabled } from "@/lib/feature-flags";
import { logger } from "@/lib/logger";
import { submitPoolOffer, POOL_OFFER_MAX_BODY } from "@/lib/briefs/demand-pools-actions";
import { DEMAND_POOLS_FLAG } from "@/lib/briefs/demand-pools";

const log = logger("advisor-auth:demand-pools:offer");

const Body = z.object({
  body: z.string().min(1).max(POOL_OFFER_MAX_BODY),
  package_rate_band: z.string().max(80).optional(),
});

/**
 * POST /api/advisor-auth/demand-pools/[id]/offer — submit ONE structured group
 * offer to a pool (one per adviser per pool). 404 when the `demand_pools` flag
 * is off. The accept money path is unaffected here — this only records the
 * offer; a member acceptance debits the adviser later via the established path.
 */
export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  if (!(await isAllowed("pool_offer_write", ipKey(request), { max: 20, refillPerSec: 0.2 }))) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }
  const advisorId = await requireAdvisorSession(request);
  if (!advisorId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const enabled = await isFlagEnabled(DEMAND_POOLS_FLAG, { segment: "advisor" });
  if (!enabled) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { id } = await ctx.params;
  const poolId = Number(id);
  if (!Number.isFinite(poolId)) {
    return NextResponse.json({ error: "Invalid pool id." }, { status: 400 });
  }

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid body." },
      { status: 400 },
    );
  }

  const result = await submitPoolOffer({
    poolId,
    professionalId: advisorId,
    body: parsed.data.body,
    packageRateBand: parsed.data.package_rate_band ?? null,
  });

  if (!result.ok) {
    const map: Record<string, { code: number; message: string }> = {
      flag_off: { code: 404, message: "Not found." },
      pool_not_found: { code: 404, message: "Pool not found." },
      pool_closed: { code: 409, message: "This pool is closed and no longer accepting offers." },
      already_offered: { code: 409, message: "You have already made an offer on this pool." },
      invalid: { code: 400, message: "Your offer is empty or too long." },
      error: { code: 500, message: "Could not submit your offer." },
    };
    const m = map[result.reason] ?? { code: 400, message: "Could not submit your offer." };
    return NextResponse.json({ error: m.message, reason: result.reason }, { status: m.code });
  }

  log.info("pool offer submitted via API", { advisorId, poolId, offerId: result.offer.id });
  return NextResponse.json({
    success: true,
    offer: result.offer,
    member_count: result.memberCount,
  });
}
