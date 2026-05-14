import { NextRequest, NextResponse } from "next/server";

import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { CreateIntakeQuestionRequest } from "@/lib/api-schemas";
import { IntakeError, upsertQuestion } from "@/lib/pro-intake";
import { logger } from "@/lib/logger";

const log = logger("api:intake:create");

export async function POST(request: NextRequest) {
  try {
    if (!(await isAllowed("intake_questions_create", ipKey(request), { max: 10, refillPerSec: 0.1 }))) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }
    const advisorId = await requireAdvisorSession(request);
    if (!advisorId) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }
    const parsed = CreateIntakeQuestionRequest.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid body." },
        { status: 400 },
      );
    }
    const question = await upsertQuestion({
      owner_kind: parsed.data.owner_kind,
      owner_id: parsed.data.owner_id,
      acting_professional_id: advisorId,
      prompt: parsed.data.prompt,
      kind: parsed.data.kind,
      options: parsed.data.options,
      required: parsed.data.required,
      sort_order: parsed.data.sort_order,
      enabled: parsed.data.enabled,
    });
    return NextResponse.json({ question });
  } catch (err) {
    if (err instanceof IntakeError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    log.error("create intake question failed", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Failed to save question." }, { status: 500 });
  }
}
