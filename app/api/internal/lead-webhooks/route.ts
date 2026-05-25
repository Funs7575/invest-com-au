/**
 * POST /api/internal/lead-webhooks
 *
 * Fires outbound webhooks (HMAC-signed) and Slack Incoming Webhook
 * notifications when a lead is matched to an advisor.
 *
 * Called fire-and-forget from /api/submit-lead (edge runtime) immediately
 * after a lead row is inserted. Node runtime is required because
 * lib/outbound-webhooks uses node:crypto for HMAC signing.
 *
 * Auth: INTERNAL_API_SECRET header — same pattern as the auction trigger.
 * This route is not exposed publicly and has no user-facing JWT auth.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendOutboundWebhook } from "@/lib/outbound-webhooks";
import { sendSlackLeadNotification } from "@/lib/slack-lead-notify";
import { logger } from "@/lib/logger";

const log = logger("api:internal:lead-webhooks");

const Body = z.object({
  professionalId: z.number().int().positive(),
  leadId: z.union([z.string(), z.number()]).nullable(),
  userName: z.string().nullable(),
  userEmail: z.string().email(),
  userPhone: z.string().nullable(),
  userState: z.string().nullable(),
  need: z.string(),
  context: z.array(z.string()).default([]),
  sourcePage: z.string().nullable(),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Internal-secret gate — same auth pattern as /api/advisor-auction
  const secret = request.headers.get("x-internal-secret");
  if (!secret || secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid body" },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const admin = createAdminClient();

  // Fetch the professional's slack_webhook_url in one query
  const { data: pro } = await admin
    .from("professionals")
    .select("slack_webhook_url")
    .eq("id", data.professionalId)
    .maybeSingle();

  const leadPayload = {
    userName: data.userName,
    userEmail: data.userEmail,
    userPhone: data.userPhone,
    userState: data.userState,
    need: data.need,
    context: data.context,
    leadId: data.leadId,
    sourcePage: data.sourcePage,
  };

  // Fire outbound webhooks (HMAC-signed, CRM / Zapier integrations)
  sendOutboundWebhook(
    "lead.received",
    {
      lead_id: data.leadId,
      professional_id: data.professionalId,
      user_name: data.userName,
      user_email: data.userEmail,
      user_phone: data.userPhone,
      user_state: data.userState,
      need: data.need,
      context: data.context,
      source_page: data.sourcePage,
    },
    "professional" as const,
    String(data.professionalId),
  ).catch((err: unknown) => {
    log.error("sendOutboundWebhook failed", {
      err: err instanceof Error ? err.message : String(err),
      professionalId: data.professionalId,
    });
  });

  // Fire Slack notification if advisor has configured one
  if (pro?.slack_webhook_url) {
    sendSlackLeadNotification(pro.slack_webhook_url, leadPayload).catch(
      (err: unknown) => {
        log.error("Slack notification failed", {
          err: err instanceof Error ? err.message : String(err),
          professionalId: data.professionalId,
        });
      },
    );
  }

  return NextResponse.json({ ok: true });
}
