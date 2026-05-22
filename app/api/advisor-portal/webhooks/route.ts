/**
 * GET  /api/advisor-portal/webhooks — list outbound webhook endpoints
 *                                    owned by the calling pro.
 * POST /api/advisor-portal/webhooks — register a new endpoint. Returns
 *                                    the signing secret once.
 * DELETE /api/advisor-portal/webhooks?id=<id> — disable an endpoint.
 *
 * Auth: requireAdvisorSession (active or pending professionals).
 * Ownership: owner_kind=professional, owner_id=advisorId.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import {
  createEndpoint,
  disableEndpoint,
  listEndpoints,
} from "@/lib/outbound-webhooks";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("api:advisor-portal:webhooks");

const PostBody = z.object({
  url: z.string().url().max(2048),
  eventSubscriptions: z
    .array(z.string().min(1).max(80))
    .min(1)
    .max(20),
});

export const ALLOWED_EVENTS = [
  "brief.accepted",
  "brief.completed",
  "brief.message_received",
  "brief.dispute_opened",
  "brief.outcome_submitted",
  "consultation.booked",
  "payment.succeeded",
] as const;

export async function GET(request: NextRequest) {
  const advisorId = await requireAdvisorSession(request);
  if (!advisorId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  const endpoints = await listEndpoints("professional", String(advisorId));
  // Never return the signing secret in list responses.
  return NextResponse.json({
    endpoints: endpoints.map((e) => ({
      id: e.id,
      url: e.url,
      enabled: e.enabled,
      event_subscriptions: e.event_subscriptions,
    })),
    allowedEvents: ALLOWED_EVENTS,
  });
}

export async function POST(request: NextRequest) {
  if (
    !(await isAllowed("advisor_webhooks_create", ipKey(request), {
      max: 5,
      refillPerSec: 0.05,
    }))
  ) {
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
  const parsed = PostBody.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid body." },
      { status: 400 },
    );
  }
  // Filter to allowed events only — a typo here would just silently never
  // fire, which is worse than a 400.
  const events = parsed.data.eventSubscriptions.filter((e) =>
    (ALLOWED_EVENTS as readonly string[]).includes(e),
  );
  if (events.length === 0) {
    return NextResponse.json(
      {
        error:
          "No supported events. Allowed: " + ALLOWED_EVENTS.join(", "),
      },
      { status: 400 },
    );
  }
  try {
    const { endpoint, signingSecret } = await createEndpoint({
      ownerKind: "professional",
      ownerId: String(advisorId),
      url: parsed.data.url,
      eventSubscriptions: events,
    });
    return NextResponse.json({
      endpoint: {
        id: endpoint.id,
        url: endpoint.url,
        event_subscriptions: endpoint.event_subscriptions,
        enabled: endpoint.enabled,
      },
      signingSecret,
    });
  } catch (err) {
    log.error("createEndpoint failed", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Failed to create endpoint." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const advisorId = await requireAdvisorSession(request);
  if (!advisorId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  const idStr = new URL(request.url).searchParams.get("id");
  const id = idStr ? Number(idStr) : NaN;
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: "Missing or invalid id." }, { status: 400 });
  }
  // Ownership check via service-role select.
  const admin = createAdminClient();
  const { data: owned } = await admin
    .from("outbound_webhook_endpoints")
    .select("id")
    .eq("id", id)
    .eq("owner_kind", "professional")
    .eq("owner_id", String(advisorId))
    .maybeSingle();
  if (!owned) {
    return NextResponse.json({ error: "Endpoint not found." }, { status: 404 });
  }
  await disableEndpoint(id);
  return NextResponse.json({ ok: true });
}
