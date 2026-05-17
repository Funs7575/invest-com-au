/**
 * Presence indicators — server-side helpers for "is this pro/team online now?"
 *
 * The heartbeat is client-driven (POST /api/presence/ping every 90s while
 * the tab is visible). The 5-minute staleness window means a pro who closes
 * their tab disappears within 5 minutes of inactivity, which matches user
 * expectation without over-pinging.
 */
// eslint-disable-next-line no-restricted-imports -- presence_pings is anon-readable but writes happen via service-role on the caller's behalf (API route verifies ownership).
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("presence");

export const STALE_WINDOW_MS = 5 * 60 * 1000;

export function isPingFresh(lastPingAt: string | null | undefined): boolean {
  if (!lastPingAt) return false;
  return Date.now() - new Date(lastPingAt).getTime() < STALE_WINDOW_MS;
}

export interface PingInput {
  kind: "professional" | "team";
  id: number;
}

export async function pingPresence(input: PingInput): Promise<void> {
  const admin = createAdminClient();
  const column = input.kind === "professional" ? "professional_id" : "team_id";
  const row: Record<string, unknown> = {
    [column]: input.id,
    last_ping_at: new Date().toISOString(),
  };
  const { error } = await admin
    .from("presence_pings")
    .upsert(row, { onConflict: column });
  if (error) {
    log.warn("presence ping upsert failed", {
      kind: input.kind,
      id: input.id,
      err: error.message,
    });
  }
}

export async function isProOnline(professionalId: number): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("presence_pings")
      .select("last_ping_at")
      .eq("professional_id", professionalId)
      .maybeSingle();
    return isPingFresh(data?.last_ping_at as string | undefined);
  } catch {
    return false;
  }
}

export async function isTeamOnline(teamId: number): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("presence_pings")
      .select("last_ping_at")
      .eq("team_id", teamId)
      .maybeSingle();
    return isPingFresh(data?.last_ping_at as string | undefined);
  } catch {
    return false;
  }
}

export async function getOnlineProsBatch(
  professionalIds: number[],
): Promise<Set<number>> {
  if (professionalIds.length === 0) return new Set();
  try {
    const admin = createAdminClient();
    const cutoff = new Date(Date.now() - STALE_WINDOW_MS).toISOString();
    const { data } = await admin
      .from("presence_pings")
      .select("professional_id")
      .in("professional_id", professionalIds)
      .gte("last_ping_at", cutoff);
    return new Set(
      (data ?? []).map((r) => r.professional_id as number).filter(Boolean),
    );
  } catch {
    return new Set();
  }
}
