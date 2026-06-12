import { NextRequest, NextResponse } from "next/server";

import { ResolvePlanRequest } from "@/lib/api-schemas";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { getPlanById, updatePlan } from "@/lib/getmatched/action-plans";
import { getEnabledIntents } from "@/lib/getmatched/intents";
import {
  recommendedProviders,
  resolveActionPlan,
} from "@/lib/getmatched/engine";
import { topMatchesForRoute } from "@/lib/getmatched/advisor-top-match";
import { listingMatchesForLanes } from "@/lib/getmatched/listing-top-match";
import { resolveLanes } from "@/lib/getmatched/resolve-lanes";
import { buildMatchExplainer } from "@/lib/getmatched/explainer";
import { logEvent } from "@/lib/getmatched/events";
import { classifyGetMatchedError, errorResponse } from "@/lib/getmatched/errors";
import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  rankByOutcomes,
  fetchAdvisorOutcomeStats,
  type MatchRequestContext,
} from "@/lib/advisor-match-ranking";
import type { ActionPlan, ActionPlanAnswers } from "@/lib/getmatched/types";

const log = logger("get-matched:resolve");

type ProviderRef = { kind: "individual" | "firm" | "expert_team"; id: number };

/**
 * Apply outcomes-weighted ranking to the `individual` providers in the list.
 *
 * Non-individual providers (firms, expert teams) are not covered by the
 * `professional_leads` outcomes data and pass through unchanged. Individual
 * providers are re-ordered by their blended match + historical-engagement
 * score, then spliced back in at their original position tier.
 *
 * Falls back silently (original order preserved) when:
 *   - outcomesStats is empty (fresh install / DB error)
 *   - no individual providers in the list
 */
function applyOutcomesRanking(
  providers: ProviderRef[],
  outcomesStats: Awaited<ReturnType<typeof fetchAdvisorOutcomeStats>>,
): ProviderRef[] {
  const individuals = providers.filter((p) => p.kind === "individual");
  if (individuals.length === 0 || outcomesStats.length === 0) return providers;

  // Use a uniform baseline matchScore — the routing engine assigned equal
  // static scores to all active individuals, so outcomes is the only
  // differentiator within this tier.
  const candidates = individuals.map((p) => ({ ...p, matchScore: 70 }));
  const ranked = rankByOutcomes(candidates, outcomesStats);

  // Re-build full list: non-individuals keep their original positions,
  // individuals are replaced in ranked order.
  const rankedIds = ranked.map((r) => r.id);
  const others = providers.filter((p) => p.kind !== "individual");
  const reorderedIndividuals: ProviderRef[] = rankedIds
    .map((id) => individuals.find((p) => p.id === id))
    .filter((p): p is ProviderRef => p !== undefined);

  // Merge: preserve original interleaving of kinds up to the list length
  const out: ProviderRef[] = [];
  let iIdx = 0;
  for (const p of providers) {
    if (p.kind === "individual") {
      const next = reorderedIndividuals[iIdx++];
      if (next) out.push(next);
    } else {
      out.push(p);
    }
  }
  // Append any others not yet included (safety — shouldn't happen)
  for (const o of others) {
    if (!out.find((x) => x.kind === o.kind && x.id === o.id)) out.push(o);
  }
  return out;
}

/**
 * Build a synthetic ephemeral plan payload that matches the shape of
 * `ActionPlan` for the client. Used when the DB-backed plan can't be
 * loaded — typically because migrations haven't been applied yet.
 */
function buildEphemeralPlan(
  answers: ActionPlanAnswers,
  resolved: Awaited<ReturnType<typeof resolveActionPlan>>,
): ActionPlan {
  const now = new Date().toISOString();
  return {
    id: 0,
    session_id: "ephemeral",
    auth_user_id: null,
    email: null,
    intent_slug: resolved.intent,
    secondary_intent_slug: resolved.secondaryIntent,
    route: resolved.route,
    goal: resolved.goal,
    answers,
    checklist: resolved.checklist,
    budget_band: resolved.budgetBand,
    timeline: resolved.timeline,
    location_state: resolved.locationState,
    country_of_residence: resolved.countryOfResidence,
    help_needed: resolved.helpNeeded,
    risk_flags: resolved.riskFlags,
    risk_severity: resolved.riskSeverity,
    linked_brief_id: null,
    share_token: "",
    status: "draft",
    meta: {},
    created_at: now,
    updated_at: now,
  };
}

export async function POST(request: NextRequest) {
  try {
    if (
      !(await isAllowed("gm_resolve", ipKey(request), { max: 30, refillPerSec: 0.5 }))
    ) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }
    const parsed = ResolvePlanRequest.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid body." },
        { status: 400 },
      );
    }
    const { plan_id, answers: clientAnswers } = parsed.data;

    const intents = await getEnabledIntents();

    // ── Ephemeral path ───────────────────────────────────────────────────
    // plan_id === 0 means the start route degraded to ephemeral mode.
    // Resolve the plan purely from the client-supplied answers without
    // touching the DB.
    if (plan_id === 0) {
      const answers = (clientAnswers ?? {}) as ActionPlanAnswers;
      const resolved = await resolveActionPlan({ answers, intents });
      const ctx: MatchRequestContext = {
        intentSlug: resolved.intent,
        budgetBand: resolved.budgetBand,
        locationState: resolved.locationState,
      };
      const lanes = resolveLanes(answers);
      const [rawProviders, topMatch, outcomesStats, listingMatches] =
        await Promise.all([
          recommendedProviders({
            intent: resolved.intent,
            route: resolved.route,
            briefTemplate: resolved.recommendedBriefTemplate,
            budgetBand: resolved.budgetBand,
            locationState: resolved.locationState,
          }),
          // Lane-aware top matches: brokers for `compare` or when the
          // platforms lane surfaces, real ranked advisors for advisor-shaped
          // routes (flag-gated), [] otherwise.
          topMatchesForRoute(answers, resolved, 3, lanes),
          fetchAdvisorOutcomeStats(createAdminClient(), ctx),
          // Specific scored listings — only when the lanes surface them.
          listingMatchesForLanes(answers, lanes, 3),
        ]);
      const providers = applyOutcomesRanking(rawProviders, outcomesStats);
      return NextResponse.json({
        plan: buildEphemeralPlan(answers, resolved),
        lanes,
        listing_matches: listingMatches,
        template: resolved.template,
        recommended_brief_template: resolved.recommendedBriefTemplate,
        accept_credits_cost: resolved.acceptCreditsCost,
        recommended_providers: providers,
        top_matches: topMatch,
        primary_href: resolved.primaryHref,
        vertical: resolved.vertical,
        advisor_type: resolved.advisorType,
        match_explainer: buildMatchExplainer({
          answers,
          intent: resolved.intent,
          route: resolved.route,
          vertical: resolved.vertical,
          advisorType: resolved.advisorType,
        }),
        ephemeral: true,
      });
    }

    // ── DB-backed path ───────────────────────────────────────────────────
    let plan;
    try {
      plan = await getPlanById(plan_id);
    } catch (err) {
      const classified = classifyGetMatchedError(err);
      if (
        classified.code === "database_not_ready" ||
        classified.code === "supabase_not_configured" ||
        classified.code === "supabase_unreachable"
      ) {
        log.warn("getPlanById failed during resolve — degrading to ephemeral", {
          plan_id,
          code: classified.code,
        });
        const answers = (clientAnswers ?? {}) as ActionPlanAnswers;
        const resolved = await resolveActionPlan({ answers, intents });
        const ctx2: MatchRequestContext = {
          intentSlug: resolved.intent,
          budgetBand: resolved.budgetBand,
          locationState: resolved.locationState,
        };
        const lanes2 = resolveLanes(answers);
        const [rawProviders2, topMatch2, outcomesStats2, listingMatches2] =
          await Promise.all([
            recommendedProviders({
              intent: resolved.intent,
              route: resolved.route,
              briefTemplate: resolved.recommendedBriefTemplate,
              budgetBand: resolved.budgetBand,
              locationState: resolved.locationState,
            }),
            topMatchesForRoute(answers, resolved, 3, lanes2),
            fetchAdvisorOutcomeStats(createAdminClient(), ctx2),
            listingMatchesForLanes(answers, lanes2, 3),
          ]);
        const providers2 = applyOutcomesRanking(rawProviders2, outcomesStats2);
        return NextResponse.json({
          plan: buildEphemeralPlan(answers, resolved),
          lanes: lanes2,
          listing_matches: listingMatches2,
          template: resolved.template,
          recommended_brief_template: resolved.recommendedBriefTemplate,
          accept_credits_cost: resolved.acceptCreditsCost,
          recommended_providers: providers2,
          top_matches: topMatch2,
          primary_href: resolved.primaryHref,
          vertical: resolved.vertical,
          advisor_type: resolved.advisorType,
          ephemeral: true,
        });
      }
      throw err;
    }
    if (!plan) {
      return NextResponse.json({ error: "Plan not found." }, { status: 404 });
    }

    const resolved = await resolveActionPlan({
      answers: plan.answers,
      intents,
    });

    const updated = await updatePlan({
      id: plan.id,
      intent_slug: resolved.intent,
      secondary_intent_slug: resolved.secondaryIntent,
      route: resolved.route,
      goal: resolved.goal,
      checklist: resolved.checklist,
      budget_band: resolved.budgetBand,
      timeline: resolved.timeline,
      location_state: resolved.locationState,
      country_of_residence: resolved.countryOfResidence,
      help_needed: resolved.helpNeeded,
      risk_flags: resolved.riskFlags,
      risk_severity: resolved.riskSeverity,
      status: plan.status === "draft" ? "draft" : plan.status,
    });

    const ctx3: MatchRequestContext = {
      intentSlug: resolved.intent,
      budgetBand: resolved.budgetBand,
      locationState: resolved.locationState,
    };
    const lanes3 = resolveLanes(plan.answers);
    const [rawProviders3, topMatch, outcomesStats3, listingMatches3] =
      await Promise.all([
        recommendedProviders({
          intent: resolved.intent,
          route: resolved.route,
          briefTemplate: resolved.recommendedBriefTemplate,
          budgetBand: resolved.budgetBand,
          locationState: resolved.locationState,
        }),
        topMatchesForRoute(plan.answers, resolved, 3, lanes3),
        fetchAdvisorOutcomeStats(createAdminClient(), ctx3),
        listingMatchesForLanes(plan.answers, lanes3, 3),
      ]);
    const providers = applyOutcomesRanking(rawProviders3, outcomesStats3);

    void logEvent({
      sessionId: plan.session_id,
      authUserId: plan.auth_user_id,
      eventType: "plan_shown",
      payload: {
        plan_id: plan.id,
        intent: resolved.intent,
        route: resolved.route,
        risk_severity: resolved.riskSeverity,
      },
    });
    if (resolved.riskFlags.length > 0) {
      void logEvent({
        sessionId: plan.session_id,
        authUserId: plan.auth_user_id,
        eventType: "risk_flagged",
        payload: { plan_id: plan.id, flags: resolved.riskFlags },
      });
    }

    return NextResponse.json({
      plan: updated,
      lanes: lanes3,
      listing_matches: listingMatches3,
      template: resolved.template,
      recommended_brief_template: resolved.recommendedBriefTemplate,
      accept_credits_cost: resolved.acceptCreditsCost,
      recommended_providers: providers,
      top_matches: topMatch,
      primary_href: resolved.primaryHref,
      vertical: resolved.vertical,
      advisor_type: resolved.advisorType,
      match_explainer: buildMatchExplainer({
        answers: plan.answers,
        intent: resolved.intent,
        route: resolved.route,
        vertical: resolved.vertical,
        advisorType: resolved.advisorType,
      }),
    });
  } catch (err) {
    // Outer catastrophic catch — try to compute the plan from whatever
    // answers the client passed, so the user still sees a working action
    // plan rather than a 500.
    const classified = classifyGetMatchedError(err);
    log.error("resolve error (degrading to ephemeral)", {
      err: classified.detail,
      code: classified.code,
    });
    try {
      const body = (await request.clone().json().catch(() => ({}))) as {
        answers?: Record<string, unknown>;
      };
      const answers = (body.answers ?? {}) as ActionPlanAnswers;
      const intents = await getEnabledIntents();
      const resolved = await resolveActionPlan({ answers, intents });
      const providers = await recommendedProviders({
        intent: resolved.intent,
        route: resolved.route,
        briefTemplate: resolved.recommendedBriefTemplate,
        budgetBand: resolved.budgetBand,
        locationState: resolved.locationState,
      });
      return NextResponse.json({
        plan: buildEphemeralPlan(answers, resolved),
        lanes: resolveLanes(answers),
        template: resolved.template,
        recommended_brief_template: resolved.recommendedBriefTemplate,
        accept_credits_cost: resolved.acceptCreditsCost,
        recommended_providers: providers,
        match_explainer: buildMatchExplainer({
          answers,
          intent: resolved.intent,
          route: resolved.route,
          vertical: resolved.vertical,
          advisorType: resolved.advisorType,
        }),
        ephemeral: true,
      });
    } catch {
      return errorResponse(classified, "Failed to resolve action plan.");
    }
  }
}
