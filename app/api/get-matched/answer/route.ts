import { NextRequest, NextResponse } from "next/server";

import { AnswerQuestionRequest } from "@/lib/api-schemas";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { getPlanById, updatePlan } from "@/lib/getmatched/action-plans";
import { getQuestions, nextQuestion } from "@/lib/getmatched/questions";
import { logEvent } from "@/lib/getmatched/events";
import { classifyGetMatchedError, errorResponse } from "@/lib/getmatched/errors";
import { logger } from "@/lib/logger";

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
    const { plan_id, question_slug, value } = parsed.data;

    const plan = await getPlanById(plan_id);
    if (!plan) {
      return NextResponse.json({ error: "Plan not found." }, { status: 404 });
    }

    const questions = await getQuestions("both");
    const question = questions.find((q) => q.slug === question_slug);
    if (!question) {
      return NextResponse.json({ error: "Unknown question." }, { status: 400 });
    }

    // Idempotent: same answer for same slug = no-op.
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
    const classified = classifyGetMatchedError(err);
    log.error("answer error", {
      err: classified.detail,
      code: classified.code,
    });
    return errorResponse(classified, "Failed to save answer.");
  }
}
