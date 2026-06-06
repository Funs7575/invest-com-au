import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "crypto";

import { createClient } from "@/lib/supabase/server";
import { stripInternalBrokerFields } from "@/lib/request-cache";
// `weights` is service-role-only RLS (commercially-sensitive ranking weights);
// this public route reads it server-side and returns only aggregated results.
import { createAdminClient } from "@/lib/supabase/admin";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { sendEmail } from "@/lib/resend";
import { isValidEmail, isDisposableEmail } from "@/lib/validate-email";
import { getSiteUrl } from "@/lib/url";
import { logger } from "@/lib/logger";
import type { Broker, PlatformType } from "@/lib/types";
import { buildWealthStack, STACK_KINDS, type StackKind, type WealthStack } from "@/lib/wealth-stack";
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
  // Optional: email-the-stack capture. When set, we still return the
  // stack synchronously AND fire-and-forget a recap email so the user
  // can come back to it. Disposable / suppressed emails are silently
  // dropped (no error to the client — the recommendation still renders).
  email: z.string().email().max(254).optional(),
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

  const { answers, goal, amount, email } = parsed.data;

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

  // Ranking weights live in the `weights` table, keyed by broker slug (shape
  // mirrors scoreQuizResults: { [slug]: QuizWeights }). Like quiz_weights these
  // are commercially sensitive and the table is service-role-only RLS, so read
  // it with the admin client (server-side; only aggregated stack results are
  // returned to the browser).
  const { data: weightRows, error: weightErr } = await createAdminClient()
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

  // This is a public, unauthenticated endpoint and the broker rows end up in
  // the response (stack.components[].broker). `select("*")` pulls in internal
  // commercial columns (cpa_value, sponsorship fees, commission terms, EPC,
  // promoted-placement); strip them before they reach the browser. The scorer
  // uses none of those fields, so sanitising before scoring leaves ranking
  // unchanged.
  const brokers = (brokerRows ?? []).map((b) => stripInternalBrokerFields(b as Broker));
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

  // Email-the-stack: best-effort, never blocks the response. Suppression
  // check is built into sendEmail, so we don't need to gate here.
  if (email && isValidEmail(email) && !isDisposableEmail(email)) {
    void sendStackEmail(email, stack).catch((err) => {
      log.warn("email-the-stack failed", {
        err: err instanceof Error ? err.message : String(err),
        stackId,
      });
    });
  }

  return NextResponse.json({ stack });
}

async function sendStackEmail(toEmail: string, stack: WealthStack): Promise<void> {
  if (stack.components.length === 0) return;
  const siteUrl = getSiteUrl();
  const rows = stack.components
    .map((c) => {
      const kindLabel = {
        share_broker: "Share broker",
        super_fund: "Super fund",
        savings_account: "Savings account",
        crypto_exchange: "Crypto exchange",
        robo_advisor: "Robo advisor",
      }[c.kind];
      return `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:12px;color:#64748b">${kindLabel}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:14px;color:#0f172a;font-weight:600">${c.broker.name}</td>
        </tr>
      `;
    })
    .join("");

  await sendEmail({
    to: toEmail,
    subject: `Your ${stack.components.length}-piece wealth stack`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#334155">
        <div style="background:#0f172a;padding:20px 24px;border-radius:12px 12px 0 0">
          <h1 style="color:white;margin:0;font-size:18px">Your Wealth Stack</h1>
        </div>
        <div style="background:#f8fafc;padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px">
          <p style="font-size:14px;margin-top:0">Here's the ${stack.components.length}-piece stack we built for you.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;background:white;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
            ${rows}
          </table>
          <div style="text-align:center;margin:20px 0">
            <a href="${siteUrl}/wealth-stack"
               style="display:inline-block;padding:12px 32px;background:#7c3aed;color:white;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600">
              Open your stack &rarr;
            </a>
          </div>
          <p style="font-size:11px;color:#94a3b8">General information only — not personal advice. Always check the relevant PDS before opening an account. Stack ID: ${stack.stackId}</p>
        </div>
      </div>
    `,
  });
}
