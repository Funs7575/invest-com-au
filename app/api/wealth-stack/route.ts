import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "crypto";

import { createClient } from "@/lib/supabase/server";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { logger } from "@/lib/logger";
import type { Broker, PlatformType } from "@/lib/types";
import { buildWealthStack, STACK_KINDS, type StackKind } from "@/lib/wealth-stack";
import type { QuizWeights } from "@/lib/quiz-scoring";

export const runtime = "nodejs";

const log = logger("wealth-stack");

// FIN_NOTEBOOK Revenue #1 (concierge wealth-stack) — the API surface
// that calls `buildWealthStack()` and returns a multi-product
// recommendation for the user. The scoring module + types shipped in
// the previous PR (lib/wealth-stack.ts). This endpoint wires it to the
// real broker/weights data so /wealth-stack can render.

const RequestSchema = z.object({
  answers: z.array(z.string().max(64)).max(20),
  // Same enum as scoreQuizResults's `goal` parameter — the buildWealthStack
  // module narrows the kind ordering based on this.
  goal: z.string().max(64).optional(),
  amount: z.enum(["small", "medium", "large", "xlarge", "whale"]).optional(),
});

export async function POST(request: NextRequest) {
  if (!(await isAllowed("wealth_stack", ipKey(request), { max: 20, refillPerSec: 0.2 }))) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { answers, goal, amount } = parsed.data;

  const supabase = await createClient();

  // Pull every active broker once, group by platform_type into the
  // per-kind slice the scorer needs. Avoids 5 round-trips for the 5
  // kinds at the cost of one wider query — brokers is ~115 rows so
  // the extra payload is trivial.
  const { data: brokerRows, error: brokerErr } = await supabase
    .from("brokers")
    .select("*")
    .eq("status", "active");

  if (brokerErr) {
    log.error("brokers query failed", { err: brokerErr.message });
    return NextResponse.json({ error: brokerErr.message }, { status: 500 });
  }

  // Quiz weights live in the public `weights` table, keyed by broker slug.
  // The exact shape mirrors scoreQuizResults: { [slug]: QuizWeights }.
  const { data: weightRows, error: weightErr } = await supabase
    .from("weights")
    .select("broker_slug, weights");

  if (weightErr) {
    log.error("weights query failed", { err: weightErr.message });
    return NextResponse.json({ error: weightErr.message }, { status: 500 });
  }

  const weightsBySlug: Record<string, QuizWeights> = {};
  for (const row of (weightRows ?? []) as Array<{ broker_slug: string; weights: QuizWeights }>) {
    weightsBySlug[row.broker_slug] = row.weights;
  }

  const brokers = (brokerRows ?? []) as Broker[];
  const perKind: Partial<Record<StackKind, { brokers: Broker[]; weights: Record<string, QuizWeights> }>> = {};

  for (const kind of STACK_KINDS) {
    const kindBrokers = brokers.filter((b) => (b.platform_type as PlatformType | null) === kind);
    if (kindBrokers.length === 0) continue;

    const kindWeights: Record<string, QuizWeights> = {};
    for (const b of kindBrokers) {
      if (weightsBySlug[b.slug]) {
        kindWeights[b.slug] = weightsBySlug[b.slug];
      }
    }
    perKind[kind] = { brokers: kindBrokers, weights: kindWeights };
  }

  const stackId = `stack_${Date.now().toString(36)}_${randomBytes(4).toString("hex")}`;
  const stack = buildWealthStack({
    answers,
    amount,
    goal,
    perKind,
    stackId,
  });

  return NextResponse.json({ stack });
}
