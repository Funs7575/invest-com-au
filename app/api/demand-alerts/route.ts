/**
 * POST /api/demand-alerts — demand-board email alert capture.
 *
 * Lets a not-yet-registered adviser say "alert me about SMSF briefs in
 * NSW" from /for-advisors/demand. Writes to the existing `prospects`
 * pipeline table (service-role-only RLS) rather than a new table:
 *
 *   source      = 'other'
 *   external_id = 'demand-alert:<email>'   (unique per (source, external_id))
 *   metadata    = { kind: 'demand_alert', states, advisor_types, ... }
 *
 * The weekly digest cron (/api/cron/demand-alerts-digest) reads these
 * rows back by the external_id prefix. Re-submitting updates interests
 * in place; a prospect who previously unsubscribed and explicitly signs
 * up again is re-activated (global suppression_list still wins at send
 * time via lib/resend).
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import { isRateLimited } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { QUOTE_ADVISOR_TYPES, QUOTE_AU_STATES } from "@/lib/api-schemas";
import { DEMAND_ALERT_EXTERNAL_PREFIX } from "@/lib/demand-board";
import { createAdminClient } from "@/lib/supabase/admin";

const log = logger("demand-alerts");

export const runtime = "nodejs";

const Body = z.object({
  email: z.string().trim().toLowerCase().pipe(z.string().email("A valid email is required.").max(254)),
  /** Empty array = "all states". */
  states: z.array(z.enum(QUOTE_AU_STATES)).max(QUOTE_AU_STATES.length).default([]),
  /** Empty array = "all advisor types". */
  advisor_types: z.array(z.enum(QUOTE_ADVISOR_TYPES)).max(QUOTE_ADVISOR_TYPES.length).default([]),
  /** Honeypot — real users never fill this. */
  website: z.string().max(200).optional(),
});

export const POST = withValidatedBody(Body, async (req, body) => {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (await isRateLimited(`demand-alerts:${ip}`, 3, 10)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  // Honeypot: pretend success, write nothing.
  if (body.website) {
    return NextResponse.json({ ok: true });
  }

  const email = body.email;
  const externalId = `${DEMAND_ALERT_EXTERNAL_PREFIX}${email}`;
  const nowIso = new Date().toISOString();
  const states = Array.from(new Set(body.states)).sort();
  const advisorTypes = Array.from(new Set(body.advisor_types)).sort();

  const supabase = createAdminClient();

  const { data: existing, error: selectErr } = await supabase
    .from("prospects")
    .select("id, status, metadata")
    .eq("source", "other")
    .eq("external_id", externalId)
    .maybeSingle();

  if (selectErr) {
    log.error("prospect lookup failed", { error: selectErr.message });
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }

  const interestMetadata = {
    kind: "demand_alert",
    states,
    advisor_types: advisorTypes,
    captured_from: "/for-advisors/demand",
    updated_at: nowIso,
  };

  if (existing) {
    const prevMetadata =
      existing.metadata && typeof existing.metadata === "object"
        ? (existing.metadata as Record<string, unknown>)
        : {};
    const update: Record<string, unknown> = {
      metadata: { ...prevMetadata, ...interestMetadata },
      updated_at: nowIso,
    };
    // Explicit re-signup re-activates an unsubscribed alert. The global
    // suppression list (lib/resend) still blocks sends if they used the
    // site-wide unsubscribe.
    if (existing.status === "unsubscribed") {
      update.status = "new";
    }

    const { error: updateErr } = await supabase.from("prospects").update(update).eq("id", existing.id);
    if (updateErr) {
      log.error("prospect update failed", { error: updateErr.message });
      return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
    }
    log.info("demand alert updated", { states: states.length, types: advisorTypes.length });
    return NextResponse.json({ ok: true });
  }

  const { error: insertErr } = await supabase.from("prospects").insert({
    source: "other",
    external_id: externalId,
    contact_email: email,
    status: "new",
    metadata: { ...interestMetadata, captured_at: nowIso },
  });

  if (insertErr) {
    // 23505 = unique violation — a concurrent submit won the race; the
    // alert exists, so the caller's intent is satisfied.
    if (insertErr.code === "23505") {
      return NextResponse.json({ ok: true });
    }
    log.error("prospect insert failed", { error: insertErr.message, code: insertErr.code });
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }

  log.info("demand alert captured", { states: states.length, types: advisorTypes.length });
  return NextResponse.json({ ok: true });
});
