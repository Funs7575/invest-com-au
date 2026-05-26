/**
 * /api/portfolio-stress-test
 *
 * POST — run historical scenario stress test against a user-supplied
 *        portfolio allocation.
 *
 * General information only — not personal financial advice.
 * Drawdown estimates are broad asset-class averages from documented
 * historical events; individual portfolios will differ.
 *
 * Rate-limits: 30/min/IP
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import { ipKey, isAllowed } from "@/lib/rate-limit-db";
import { runStressTest, STRESS_SCENARIOS } from "@/lib/stress-scenarios";

export const runtime = "nodejs";

const AllocationSchema = z.object({
  au_equities:   z.coerce.number().min(0).max(100),
  intl_equities: z.coerce.number().min(0).max(100),
  au_property:   z.coerce.number().min(0).max(100),
  bonds:         z.coerce.number().min(0).max(100),
  cash:          z.coerce.number().min(0).max(100),
}).refine(
  (d) => d.au_equities + d.intl_equities + d.au_property + d.bonds + d.cash <= 100,
  { message: "Allocations must not exceed 100%" },
);

export const POST = withValidatedBody(AllocationSchema, async (req: NextRequest, body) => {
  if (!(await isAllowed("portfolio_stress_test", ipKey(req), { max: 30, refillPerSec: 0.5 }))) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const results = runStressTest(body);

  return NextResponse.json({
    scenarios: STRESS_SCENARIOS.map((s) => ({
      id: s.id,
      name: s.name,
      period: s.period,
      description: s.description,
    })),
    results,
    disclaimer: "Estimates are broad asset-class drawdowns from documented historical events. General information only — not personal financial advice. Past events do not predict future losses.",
  });
});
