import { NextRequest, NextResponse } from "next/server";

import { ResolvePlanRequest } from "@/lib/api-schemas";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { getPlanById, updatePlan } from "@/lib/getmatched/action-plans";
import { getEnabledIntents } from "@/lib/getmatched/intents";
import {
  recommendedProviders,
  resolveActionPlan,
} from "@/lib/getmatched/engine";
import { computeTopMatch } from "@/lib/getmatched/top-match";
import { logEvent } from "@/lib/getmatched/events";
import { classifyGetMatchedError, errorResponse } from "@/lib/getmatched/errors";
import { logger } from "@/lib/logger";
import type { ActionPlan, ActionPlanAnswers } from "@/lib/getmatched/types";

const log = logger("get-matched:resolve");

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
      const [providers, topMatch] = await Promise.all([
        recommendedProviders({
          intent: resolved.intent,
          route: resolved.route,
          briefTemplate: resolved.recommendedBriefTemplate,
          budgetBand: resolved.budgetBand,
          locationState: resolved.locationState,
        }),
        // Only compute the top-match hero card for the `compare` route —
        // the only one where a scored top broker makes sense.
        resolved.route === "compare"
          ? computeTopMatch(answers, resolved.vertical)
          : Promise.resolve(null),
      ]);
      return NextResponse.json({
        plan: buildEphemeralPlan(answers, resolved),
        template: resolved.template,
        recommended_brief_template: resolved.recommendedBriefTemplate,
        accept_credits_cost: resolved.acceptCreditsCost,
        recommended_providers: providers,
        top_match: topMatch,
        primary_href: resolved.primaryHref,
        vertical: resolved.vertical,
        advisor_type: resolved.advisorType,
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
        const [providers, topMatch] = await Promise.all([
          recommendedProviders({
            intent: resolved.intent,
            route: resolved.route,
            briefTemplate: resolved.recommendedBriefTemplate,
            budgetBand: resolved.budgetBand,
            locationState: resolved.locationState,
          }),
          resolved.route === "compare"
            ? computeTopMatch(answers, resolved.vertical)
            : Promise.resolve(null),
        ]);
        return NextResponse.json({
          plan: buildEphemeralPlan(answers, resolved),
          template: resolved.template,
          recommended_brief_template: resolved.recommendedBriefTemplate,
          accept_credits_cost: resolved.acceptCreditsCost,
          recommended_providers: providers,
          top_match: topMatch,
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

    const [providers, topMatch] = await Promise.all([
      recommendedProviders({
        intent: resolved.intent,
        route: resolved.route,
        briefTemplate: resolved.recommendedBriefTemplate,
        budgetBand: resolved.budgetBand,
        locationState: resolved.locationState,
      }),
      resolved.route === "compare"
        ? computeTopMatch(plan.answers, resolved.vertical)
        : Promise.resolve(null),
    ]);

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
      template: resolved.template,
      recommended_brief_template: resolved.recommendedBriefTemplate,
      accept_credits_cost: resolved.acceptCreditsCost,
      recommended_providers: providers,
      top_match: topMatch,
      primary_href: resolved.primaryHref,
      vertical: resolved.vertical,
      advisor_type: resolved.advisorType,
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
        template: resolved.template,
        recommended_brief_template: resolved.recommendedBriefTemplate,
        accept_credits_cost: resolved.acceptCreditsCost,
        recommended_providers: providers,
        ephemeral: true,
      });
    } catch {
      return errorResponse(classified, "Failed to resolve action plan.");
    }
  }
}
