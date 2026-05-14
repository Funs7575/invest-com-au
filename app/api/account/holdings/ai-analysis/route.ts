/**
 * POST /api/account/holdings/ai-analysis — AI portfolio analysis (PR-X5j).
 *
 * COMPLIANCE NOTICE — read before changing this file:
 *
 *   Pre-AFSL: this route returns 404 unless the `investor_ai_analysis_enabled`
 *   feature flag is true. Even when enabled, outputs MUST pass
 *   `filterFactualOutput()` and the system prompt forbids advice language.
 *   Enabling this flag pre-AFSL would be a compliance violation — only
 *   flip after AFSL grants (~2026-11).
 *
 *   The 404 (rather than 403) is intentional: it does not leak that this
 *   route exists, matching the rest of the platform's gating posture
 *   while we are operating under the s766B(6)/(7) factual-information
 *   carve-out.
 *
 *   The route also requires the caller to send `acknowledge_general_information: true`
 *   in the body — an explicit, in-line acknowledgement that the output is
 *   general information / factual comparison only, not personal advice.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import { isFlagEnabled } from "@/lib/feature-flags";
import { isRateLimited } from "@/lib/rate-limit";
import { getInvestorProfile } from "@/lib/investor-profiles";
import { logger } from "@/lib/logger";
import {
  runHoldingsAnalysis,
  ANALYSIS_DISCLAIMER,
  type HoldingForAnalysis,
} from "@/lib/holdings/ai-analysis";
import { RISK_WARNING_CTA } from "@/lib/compliance";

const log = logger("api:account:ai-analysis");

export const runtime = "nodejs";
export const maxDuration = 60;

const FEATURE_FLAG_KEY = "investor_ai_analysis_enabled";

/**
 * Rate-limit window: 5 analyses per user per 24 hours. Tuned to permit
 * a few legitimate re-runs (e.g. after editing holdings) while bounding
 * per-user model spend. `lib/rate-limit.ts` uses DB-backed counters so
 * the limit survives serverless cold starts.
 */
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MINUTES = 24 * 60;

const RequestBody = z.object({
  /**
   * Explicit per-request acknowledgement that the output is comparison /
   * factual information only, not personal advice. Required `true` literal
   * — anything else fails Zod parse and 400s.
   */
  acknowledge_general_information: z.literal(true),
});

export const POST = withValidatedBody(RequestBody, async (_req, _body) => {
  // ── 1. Auth ────────────────────────────────────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // ── 2. Feature flag gate ───────────────────────────────────────────────
  // 404 (not 403) so we do not leak that the route exists. This is
  // deliberate — see the file header re: pre-AFSL posture.
  const enabled = await isFlagEnabled(FEATURE_FLAG_KEY, {
    userKey: user.email ?? user.id,
    segment: "user",
  });
  if (!enabled) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // ── 3. Rate limit ──────────────────────────────────────────────────────
  if (
    await isRateLimited(
      `ai_analysis:${user.id}`,
      RATE_LIMIT_MAX,
      RATE_LIMIT_WINDOW_MINUTES,
    )
  ) {
    return NextResponse.json(
      {
        error: "rate_limited",
        message: `Limit ${RATE_LIMIT_MAX} analyses per 24 hours.`,
      },
      { status: 429 },
    );
  }

  // ── 4. Fetch holdings (user-scoped — RLS enforces ownership) ──────────
  const { data: holdingsRows, error: holdingsError } = await supabase
    .from("investor_holdings")
    .select(
      "ticker, exchange, shares, cost_basis_per_share_cents, acquired_at, broker_slug",
    )
    .order("acquired_at", { ascending: false });

  if (holdingsError) {
    log.warn("holdings fetch failed", { error: holdingsError.message });
    return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  }

  const holdings: HoldingForAnalysis[] = (holdingsRows ?? []).map((row) => ({
    ticker: String(row.ticker),
    exchange: String(row.exchange),
    shares: Number(row.shares),
    cost_basis_per_share_cents: Number(row.cost_basis_per_share_cents),
    acquired_at: String(row.acquired_at),
    broker_slug: (row.broker_slug as string | null) ?? null,
  }));

  if (holdings.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        reason: "no_holdings",
        message: "Add at least one holding before running an analysis.",
      },
      { status: 400 },
    );
  }

  // ── 5. Fetch profile (best-effort — engine handles null profile) ──────
  const profile = await getInvestorProfile(user.id);
  const profileFlags = {
    isFhb: profile?.isFhb === true,
    isPreRetiree: profile?.isPreRetiree === true,
    isBusinessOwner: profile?.isBusinessOwner === true,
    isCrossBorder: profile?.isCrossBorder === true,
    isHnw: profile?.isHnw === true,
  };

  // ── 6. Anthropic config check ─────────────────────────────────────────
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    log.warn("ANTHROPIC_API_KEY missing — analysis cannot run");
    return NextResponse.json(
      { ok: false, reason: "not_configured" },
      { status: 503 },
    );
  }

  // ── 7. Run analysis ───────────────────────────────────────────────────
  const anthropicClient = new Anthropic({ apiKey });
  const result = await runHoldingsAnalysis(holdings, profileFlags, {
    anthropicClient,
  });

  if (!result.ok) {
    log.warn("analysis returned non-ok result", {
      reason: result.reason,
      detail: result.detail,
      user_id: user.id,
    });
    return NextResponse.json(
      {
        ok: false,
        reason: result.reason,
        // Standard short risk-warning still surfaced on failure so the
        // caller's UI can show the appropriate footer copy.
        disclaimer: RISK_WARNING_CTA,
      },
      { status: 200 },
    );
  }

  return NextResponse.json({
    ok: true,
    observations: result.observations,
    raw_text: result.rawText,
    disclaimer: ANALYSIS_DISCLAIMER,
  });
});
