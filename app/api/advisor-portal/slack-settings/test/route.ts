/**
 * POST /api/advisor-portal/slack-settings/test
 *
 * Sends a test ping to a Slack Incoming Webhook URL so the advisor can
 * confirm the URL is valid before (or after) saving it.
 *
 * The URL is re-validated here — the body is never passed to Slack
 * unvalidated.  We intentionally do NOT require the URL to already be
 * saved in the database so the advisor can test before hitting Save.
 *
 * Auth: requireAdvisorSession
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { logger } from "@/lib/logger";

const log = logger("api:advisor-portal:slack-settings:test");

const Body = z.object({
  slack_webhook_url: z
    .string()
    .url()
    .refine(
      (url) => url.startsWith("https://hooks.slack.com/"),
      "URL must be a Slack Incoming Webhook (https://hooks.slack.com/…)",
    ),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!await isAllowed("advisor_slack_test", ipKey(request), { max: 5, refillPerSec: 0.05 })) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const advisorId = await requireAdvisorSession(request);
  if (!advisorId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid body." },
      { status: 400 },
    );
  }

  const webhookUrl = parsed.data.slack_webhook_url;

  let slackRes: Response;
  try {
    slackRes = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: ":white_check_mark: *Test successful!* Your Invest.com.au Slack integration is working — new leads will appear here.",
      }),
      // 5-second timeout so a bad URL doesn't stall the advisor's browser
      signal: AbortSignal.timeout(5_000),
    });
  } catch (err) {
    log.warn("slack test fetch failed", { advisorId, error: String(err) });
    return NextResponse.json({ error: "Could not reach Slack." }, { status: 502 });
  }

  if (!slackRes.ok) {
    log.warn("slack test rejected by Slack", { advisorId, status: slackRes.status });
    return NextResponse.json({ error: "Slack rejected the request." }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
