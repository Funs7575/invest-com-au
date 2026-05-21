/**
 * PATCH /api/advisor-portal/slack-settings
 *
 * Saves or clears the advisor's Slack Incoming Webhook URL.
 * The URL is validated to be a Slack webhook domain before storage.
 *
 * Auth: requireAdvisorSession
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("api:advisor-portal:slack-settings");

const Body = z.object({
  slack_webhook_url: z
    .string()
    .url()
    .refine(
      (url) => url.startsWith("https://hooks.slack.com/"),
      "URL must be a Slack Incoming Webhook (https://hooks.slack.com/…)",
    )
    .nullable(),
});

export async function PATCH(request: NextRequest): Promise<NextResponse> {
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

  const admin = createAdminClient();
  const { error } = await admin
    .from("professionals")
    .update({ slack_webhook_url: parsed.data.slack_webhook_url })
    .eq("id", advisorId);

  if (error) {
    log.error("slack_webhook_url update failed", {
      error: error.message,
      advisorId,
    });
    return NextResponse.json({ error: "Failed to save." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
