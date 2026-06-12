import { NextRequest, NextResponse } from "next/server";

import { isFlagEnabled } from "@/lib/feature-flags";
import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { listProspectsForAdviser, type ProspectFilters } from "@/lib/prospect-pool";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/advisor-portal/prospects
 *
 * Anonymised prospect cards for the signed-in adviser, with optional filters
 * (?advisorType=&state=&budgetBand=). Each card is annotated with this
 * adviser's pitch eligibility. 404 when the feature flag is off.
 *
 * Auth: requireAdvisorSession (advisor-session / JWT). The cards carry NO
 * consumer identity — only the anonymised snapshot + opaque prospect id.
 */
export async function GET(request: NextRequest) {
  if (!(await isFlagEnabled("open_to_offers", { segment: "advisor" }))) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (!(await isAllowed("oto_prospects_list", ipKey(request), { max: 60, refillPerSec: 1 }))) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }
  const professionalId = await requireAdvisorSession(request);
  if (!professionalId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const sp = request.nextUrl.searchParams;
  const filters: ProspectFilters = {
    advisorType: sp.get("advisorType") || null,
    state: sp.get("state") || null,
    budgetBand: sp.get("budgetBand") || null,
  };

  const cards = await listProspectsForAdviser(professionalId, filters);
  // Hide prospects this adviser was previously declined by (auto-suppression);
  // keep already-pitched ones visible (greyed) so the adviser sees their reach.
  const visible = cards.filter((c) => !c.previouslyDeclined);

  return NextResponse.json({
    prospects: visible.map((c) => ({
      prospectId: c.prospectId,
      snapshot: c.snapshot,
      listedAt: c.listedAt,
      alreadyPitched: c.alreadyPitched,
      estimatedPitchCost: c.estimatedPitchCost,
    })),
  });
}
