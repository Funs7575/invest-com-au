/**
 * Adviser push subscription register / update / unregister.
 *
 * POST   — register (upsert) the calling adviser's browser push subscription
 *          + per-event preferences. Keyed by `endpoint` (unique per browser),
 *          stamped with owner_kind='advisor' + professional_id so the advisor
 *          dispatcher (lib/advisor-push.ts) can find it.
 * PATCH  — update just the per-event preferences for every subscription this
 *          adviser owns (used by the preference toggles, no re-subscribe).
 * DELETE — remove a subscription by endpoint (opt-out from this browser).
 *
 * Auth: requireAdvisorSession (advisor_sessions is deny-all; service-role is
 * the documented path per CLAUDE.md). All three verbs are advisor-scoped —
 * a row is only ever written/updated/removed for the authenticated advisor's
 * professional_id, so one adviser can never touch another's subscription.
 *
 * Dormancy: the route stays functional whether or not the `advisor_push` flag
 * is on (the flag gates SENDING, not storing). The opt-in UI is what's flag-
 * gated — with the flag off the UI never renders, so this route is never hit.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdvisorSession } from "@/lib/require-advisor-session";
// Service-role: advisor push rows have a NULL user_id (advisers authenticate via
// advisor_sessions, not auth.uid()), so the authenticated-self RLS policy never
// matches them — service-role is required to upsert/scope by professional_id.
// Legitimate per CLAUDE.md § "Two Supabase clients" (route-handler context).
import { createAdminClient } from "@/lib/supabase/admin";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { logger } from "@/lib/logger";
import {
  ADVISOR_PUSH_EVENTS,
  ADVISOR_PUSH_FLAG,
  defaultAdvisorPushPrefs,
} from "@/lib/advisor-push";
import { isFlagEnabled } from "@/lib/feature-flags";

const log = logger("api:advisor-portal:push-subscription");

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Per-event preference map — every key optional; the dispatcher fail-opens a
// missing key to "notify". `.strict()` rejects unknown keys (Zod rejects by
// default per CLAUDE.md).
const PrefsSchema = z
  .object(
    Object.fromEntries(
      ADVISOR_PUSH_EVENTS.map((e) => [e, z.boolean()] as const),
    ) as Record<(typeof ADVISOR_PUSH_EVENTS)[number], z.ZodBoolean>,
  )
  .partial()
  .strict();

const SubscribeBody = z.object({
  subscription: z.object({
    endpoint: z.string().min(1).max(2000),
    keys: z.object({
      p256dh: z.string().min(1).max(500),
      auth: z.string().min(1).max(500),
    }),
  }),
  preferences: PrefsSchema.optional(),
});

const PatchBody = z.object({
  preferences: PrefsSchema,
});

const DeleteBody = z.object({
  endpoint: z.string().min(1).max(2000),
});

/**
 * GET — feature status for the opt-in UI. Returns whether the `advisor_push`
 * flag is on for this advisor (drives whether the opt-in renders at all) and
 * the saved per-event preferences (defaults when no row exists yet).
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const advisorId = await requireAdvisorSession(request);
  if (!advisorId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const enabled = await isFlagEnabled(ADVISOR_PUSH_FLAG, { segment: "advisor" });
  if (!enabled) {
    // Feature dark for this advisor — the UI hides itself on `enabled:false`.
    return NextResponse.json({ enabled: false, subscribed: false, preferences: defaultAdvisorPushPrefs() });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("push_subscriptions")
    .select("notification_prefs")
    .eq("owner_kind", "advisor")
    .eq("professional_id", advisorId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    // Columns may be absent in an env where the flag was flipped before the
    // migration applied — treat as "enabled but not subscribed", defaults.
    log.warn("advisor push status fetch failed", { error: error.message, advisorId });
    return NextResponse.json({ enabled: true, subscribed: false, preferences: defaultAdvisorPushPrefs() });
  }

  const prefs = (data?.notification_prefs as Record<string, unknown> | null) ?? null;
  return NextResponse.json({
    enabled: true,
    subscribed: data != null,
    preferences: { ...defaultAdvisorPushPrefs(), ...(prefs ?? {}) },
  });
}

/** POST — register / upsert a subscription for the authed advisor. */
export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!(await isAllowed("advisor_push_subscribe", ipKey(request), { max: 10, refillPerSec: 10 / 3600 }))) {
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
  const parsed = SubscribeBody.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid subscription object." },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const { error } = await admin.from("push_subscriptions").upsert(
    {
      endpoint: parsed.data.subscription.endpoint,
      keys_p256dh: parsed.data.subscription.keys.p256dh,
      keys_auth: parsed.data.subscription.keys.auth,
      owner_kind: "advisor",
      professional_id: advisorId,
      // Anonymous-advisor rows never belong to an auth.users row.
      user_id: null,
      notification_prefs: parsed.data.preferences ?? {},
      updated_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" },
  );

  if (error) {
    log.error("advisor push subscribe failed", { error: error.message, advisorId });
    return NextResponse.json({ error: "Failed to save subscription." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

/** PATCH — update per-event preferences for all of this advisor's subscriptions. */
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  if (!(await isAllowed("advisor_push_prefs", ipKey(request), { max: 20, refillPerSec: 20 / 3600 }))) {
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
  const parsed = PatchBody.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid preferences." },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("push_subscriptions")
    .update({ notification_prefs: parsed.data.preferences, updated_at: new Date().toISOString() })
    .eq("owner_kind", "advisor")
    .eq("professional_id", advisorId);

  if (error) {
    log.error("advisor push prefs update failed", { error: error.message, advisorId });
    return NextResponse.json({ error: "Failed to save preferences." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

/** DELETE — remove one subscription (this browser) for the authed advisor. */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  if (!(await isAllowed("advisor_push_unsubscribe", ipKey(request), { max: 20, refillPerSec: 20 / 3600 }))) {
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
  const parsed = DeleteBody.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid body." },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  // Scope the delete to BOTH the endpoint AND this advisor so a caller can
  // never delete another owner's row by guessing an endpoint.
  const { error } = await admin
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", parsed.data.endpoint)
    .eq("owner_kind", "advisor")
    .eq("professional_id", advisorId);

  if (error) {
    log.error("advisor push unsubscribe failed", { error: error.message, advisorId });
    return NextResponse.json({ error: "Failed to remove subscription." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
