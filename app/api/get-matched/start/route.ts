import { NextRequest, NextResponse } from "next/server";

import { StartGetMatchedRequest } from "@/lib/api-schemas";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { createPlan } from "@/lib/getmatched/action-plans";
import { getQuestions, nextQuestion } from "@/lib/getmatched/questions";
import { logEvent } from "@/lib/getmatched/events";
import { classifyGetMatchedError, errorResponse } from "@/lib/getmatched/errors";
import { logger } from "@/lib/logger";

const log = logger("get-matched:start");

export async function POST(request: NextRequest) {
  try {
    if (
      !(await isAllowed("gm_start", ipKey(request), { max: 20, refillPerSec: 0.2 }))
    ) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }
    const parsed = StartGetMatchedRequest.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid body." },
        { status: 400 },
      );
    }
    const { session_id, mode, prefill, source_page } = parsed.data;

    const plan = await createPlan({
      sessionId: session_id,
      initialAnswers: prefill ?? {},
    });

    const questions = await getQuestions(mode);
    const next = nextQuestion(questions, plan.answers, mode);

    void logEvent({
      sessionId: session_id,
      eventType: "started",
      sourcePage: source_page,
      payload: { mode, plan_id: plan.id },
    });

    return NextResponse.json({
      plan_id: plan.id,
      share_token: plan.share_token,
      session_id,
      next,
    });
  } catch (err) {
    const classified = classifyGetMatchedError(err);
    log.error("start error", {
      err: classified.detail,
      code: classified.code,
    });
    return errorResponse(classified, "Failed to start Get Matched.");
  }
}
