/**
 * POST /api/v1/calculators/dasp — Departing Australia Superannuation
 * Payment withholding estimator.
 *
 * Auth: Bearer ica_… API key. Body schema + worked behaviour live in
 * lib/calculators/api-registry.ts; the scaffold (auth, rate limit,
 * metering, disclaimer) in lib/calculators/api-route.ts. Math:
 * lib/calculators/dasp.ts — the same function the on-site calculator uses.
 */

import { daspCalculator } from "@/lib/calculators/api-registry";
import { buildCalculatorRoute } from "@/lib/calculators/api-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const route = buildCalculatorRoute(daspCalculator);

export const POST = route.POST;
export const OPTIONS = route.OPTIONS;
