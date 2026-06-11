/**
 * POST /api/v1/calculators/investment-income-tax — progressive-scale
 * estimator for investment income stacked on other income.
 *
 * Auth: Bearer ica_… API key. Body schema + worked behaviour live in
 * lib/calculators/api-registry.ts; the scaffold (auth, rate limit,
 * metering, disclaimer) in lib/calculators/api-route.ts. Math:
 * lib/calculators/investment-income-tax.ts — the same function the
 * on-site calculator uses.
 */

import { investmentIncomeTaxCalculator } from "@/lib/calculators/api-registry";
import { buildCalculatorRoute } from "@/lib/calculators/api-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const route = buildCalculatorRoute(investmentIncomeTaxCalculator);

export const POST = route.POST;
export const OPTIONS = route.OPTIONS;
