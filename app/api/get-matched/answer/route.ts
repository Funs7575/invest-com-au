import { NextRequest, NextResponse } from "next/server";

import { AnswerQuestionRequest } from "@/lib/api-schemas";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { getPlanById, updatePlan } from "@/lib/getmatched/action-plans";
import { getQuestions, nextQuestion } from "@/lib/getmatched/questions";
import { logEvent } from "@/lib/getmatched/events";
import { classifyGetMatchedError, errorResponse } from "@/lib/getmatched/errors";
import { logger } from "@/lib/logger";
import type { ActionPlanAnswers } from "@/lib/getmatched/types";

const log = logger("get-matched:answer");

export async function POST(request: NextRequest) {
  try {
    if (
      !(await isAllowed("gm_answer", ipKey(request), { max: 120, refillPerSec: 2 }))
    ) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }
    const parsed = AnswerQuestionRequest.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid body." },
        { status: 400 },
      );
    }
    const { plan_id, question_slug, value, answers: clientAnswers } = parsed.data;

    const questions = await getQuestions("both");
    const question = questions.find((q) => q.slug === question_slug);
    if (!question) {
      return NextResponse.json({ error: "Unknown question." }, { status: 400 });
    }

    // ── Ephemeral path ───────────────────────────────────────────────────
    // plan_id === 0 means the client never got a persisted plan row
    // (start route degraded to ephemeral mode because the DB wasn't
    // ready). Compute the next question purely from the answers the
    // client passed and return without touching the DB.
    if (plan_id === 0) {
      const baseAnswers = (clientAnswers ?? {}) as ActionPlanAnswers;
      const mergedAnswers: ActionPlanAnswers = {
        ...baseAnswers,
        [question.maps_to]: value,
        [question_slug]: value,
      };
      const next = nextQuestion(questions, mergedAnswers, "both");
      return NextResponse.json({ plan_id: 0, next, ephemeral: true });
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
        // The plan row used to exist but the DB is now unreachable.
        // Degrade to ephemeral using whatever answers the client passed.
        log.warn("getPlanById failed — degrading to ephemeral", {
          plan_id,
          code: classified.code,
        });
        const baseAnswers = (clientAnswers ?? {}) as ActionPlanAnswers;
        const mergedAnswers: ActionPlanAnswers = {
          ...baseAnswers,
          [question.maps_to]: value,
          [question_slug]: value,
        };
        const next = nextQuestion(questions, mergedAnswers, "both");
        return NextResponse.json({ plan_id: 0, next, ephemeral: true });
      }
      throw err;
    }
    if (!plan) {
      return NextResponse.json({ error: "Plan not found." }, { status: 404 });
    }

    const mergedAnswers = {
      ...plan.answers,
      [question.maps_to]: value,
      [question_slug]: value,
    };

    const updated = await updatePlan({
      id: plan.id,
      answers: mergedAnswers,
    });

    void logEvent({
      sessionId: plan.session_id,
      authUserId: plan.auth_user_id,
      eventType: "question_answered",
      step: question.step,
      payload: { question_slug, plan_id: plan.id },
    });

    const next = nextQuestion(questions, updated.answers, "both");

    return NextResponse.json({ plan_id: plan.id, next });
  } catch (err) {
    // Outer catastrophic catch — degrade to an ephemeral next-question
    // computation rather than surfacing a 500 to the user. This is
    // pre-launch defensive: a broken /answer breaks the whole flow.
    const classified = classifyGetMatchedError(err);
    log.error("answer error (degrading to ephemeral)", {
      err: classified.detail,
      code: classified.code,
    });
    try {
      const body = (await request.clone().json().catch(() => ({}))) as {
        question_slug?: string;
        value?: unknown;
        answers?: Record<string, unknown>;
      };
      const questions = await getQuestions("both");
      const question = questions.find((q) => q.slug === body.question_slug);
      const mergedAnswers = {
        ...(body.answers ?? {}),
        ...(question
          ? { [question.maps_to]: body.value, [question.slug]: body.value }
          : {}),
      } as ActionPlanAnswers;
      const next = nextQuestion(questions, mergedAnswers, "both");
      return NextResponse.json({ plan_id: 0, next, ephemeral: true });
    } catch {
      return errorResponse(classified, "Failed to save answer.");
    }
  }
}
