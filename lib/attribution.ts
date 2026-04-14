/**
 * Multi-touch attribution helpers.
 *
 * Records a session touchpoint whenever a tracked event fires, and
 * exposes a rollup that returns first-touch / last-touch / linear
 * attribution for any date range. Used by
 * /admin/automation/attribution and the conversion analytics tile.
 *
 * The ingest is intentionally a server action hit from the client so
 * we can do bot filtering and normalise the channel server-side.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type TouchEvent =
  | "view"
  | "click"
  | "signup"
  | "lead"
  | "conversion";

export type Channel =
  | "organic"
  | "direct"
  | "paid"
  | "email"
  | "referral"
  | "social";

export interface TouchInput {
  sessionId: string;
  userKey?: string | null;
  event: TouchEvent;
  source?: string | null;
  medium?: string | null;
  campaign?: string | null;
  landingPath?: string | null;
  pagePath?: string | null;
  vertical?: string | null;
  valueCents?: number | null;
}

const ORGANIC_SOURCES = new Set([
  "google",
  "bing",
  "duckduckgo",
  "yahoo",
  "ecosia",
  "brave",
]);
const SOCIAL_SOURCES = new Set([
  "facebook",
  "instagram",
  "x",
  "twitter",
  "linkedin",
  "reddit",
  "tiktok",
  "youtube",
]);

/**
 * Pure channel classifier — keeps the ingest path deterministic and
 * testable. Order of checks matters:
 *
 *   1. Explicit utm_medium wins (cpc/paid, email, referral, etc.)
 *   2. Known organic search sources
 *   3. Known social sources
 *   4. Fallback: if referrer present → referral, else direct
 */
export function classifyChannel(opts: {
  source: string | null | undefined;
  medium: string | null | undefined;
  hasReferrer?: boolean;
}): Channel {
  const source = (opts.source || "").toLowerCase();
  const medium = (opts.medium || "").toLowerCase();

  if (["cpc", "paid", "ppc", "display", "cpm"].includes(medium)) return "paid";
  if (medium === "email" || source === "email") return "email";
  if (["organic", "search"].includes(medium) || ORGANIC_SOURCES.has(source)) return "organic";
  if (medium === "social" || SOCIAL_SOURCES.has(source)) return "social";
  if (medium === "referral" || opts.hasReferrer) return "referral";
  return "direct";
}

/**
 * Insert a touchpoint row. Never throws on DB errors — returns false.
 */
export async function recordTouch(
  supabase: SupabaseClient,
  input: TouchInput,
  hasReferrer = false,
): Promise<boolean> {
  const channel = classifyChannel({
    source: input.source,
    medium: input.medium,
    hasReferrer,
  });
  const { error } = await supabase.from("attribution_touches").insert({
    session_id: input.sessionId,
    user_key: input.userKey ?? null,
    event: input.event,
    channel,
    source: input.source ?? null,
    medium: input.medium ?? null,
    campaign: input.campaign ?? null,
    landing_path: input.landingPath ?? null,
    page_path: input.pagePath ?? null,
    vertical: input.vertical ?? null,
    value_cents: input.valueCents ?? null,
  });
  return !error;
}

// ─── Rollup helpers ───────────────────────────────────────────────

export interface AttributionRow {
  channel: Channel;
  touches: number;
  firstTouchConversions: number;
  lastTouchConversions: number;
  linearConversions: number;
  revenueCents: number;
}

/**
 * Roll up attribution_touches into per-channel counts using the
 * three common models. Caller passes in the raw rows so this can be
 * unit-tested with a fixture array.
 *
 *   - first-touch: conversion credited to the first channel in the
 *     user's journey
 *   - last-touch:  conversion credited to the last channel before
 *     the conversion event
 *   - linear:      conversion credited evenly across every channel
 *     touched in the session prior to conversion
 */
export function rollupAttribution(
  rows: Array<{
    session_id: string;
    channel: Channel | string;
    event: string;
    value_cents: number | null;
  }>,
): Record<Channel, AttributionRow> {
  const bySession = new Map<string, typeof rows>();
  for (const r of rows) {
    const list = bySession.get(r.session_id) || [];
    list.push(r);
    bySession.set(r.session_id, list);
  }

  const empty = (): AttributionRow => ({
    channel: "direct",
    touches: 0,
    firstTouchConversions: 0,
    lastTouchConversions: 0,
    linearConversions: 0,
    revenueCents: 0,
  });
  const result: Record<string, AttributionRow> = {};

  for (const [, sessionRows] of bySession) {
    // stable order
    const ordered = [...sessionRows];
    for (const r of ordered) {
      const key = r.channel as Channel;
      if (!result[key]) result[key] = { ...empty(), channel: key };
      result[key].touches++;
    }

    const conversions = ordered.filter(
      (r) => r.event === "conversion" || r.event === "lead" || r.event === "signup",
    );
    if (conversions.length === 0) continue;

    for (const conv of conversions) {
      const convRevenue = conv.value_cents || 0;
      // Everything up to and including the conv event
      const prefix = ordered.slice(
        0,
        ordered.indexOf(conv) + 1,
      );
      const distinct = Array.from(new Set(prefix.map((r) => r.channel as Channel)));
      if (distinct.length === 0) continue;

      const first = distinct[0];
      const last = distinct[distinct.length - 1];
      if (!result[first]) result[first] = { ...empty(), channel: first };
      if (!result[last]) result[last] = { ...empty(), channel: last };

      result[first].firstTouchConversions++;
      result[last].lastTouchConversions++;

      const share = 1 / distinct.length;
      for (const ch of distinct) {
        if (!result[ch]) result[ch] = { ...empty(), channel: ch };
        result[ch].linearConversions += share;
        result[ch].revenueCents += Math.round(convRevenue * share);
      }
    }
  }

  return result as Record<Channel, AttributionRow>;
}
