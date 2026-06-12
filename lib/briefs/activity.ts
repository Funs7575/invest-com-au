/**
 * Brief activity — the Trust Centre's data layer ("who's seen my brief").
 *
 * Records two honest, deduplicated signals per (brief, adviser):
 *   - reached: the brief appeared in the adviser's inbox payload
 *   - viewed:  the adviser opened the full masked details
 * and answers the consumer-side questions: how many advisers has my
 * brief reached / how many opened it / how fast do briefs like mine
 * usually get accepted.
 *
 * Identities are never returned — the tracker shows aggregates only, so
 * nothing here can leak which adviser looked before acceptance.
 *
 * All writers are fire-and-forget from hot paths (inbox list, preview)
 * and must never throw into their callers; failures are logged and
 * swallowed. A missing table (migration not yet applied) degrades to
 * zero counts.
 */

// eslint-disable-next-line no-restricted-imports -- activity rows span advisers (cross-user writes from advisor-session routes; aggregate reads from the anonymous email-link tracker); brief_views is service-role-only by design like the other marketplace ledgers.
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("briefs:activity");

// ─── Writers ─────────────────────────────────────────────────────────────

/** Batch-record that these briefs reached an adviser's inbox (idempotent). */
export async function recordBriefReach(
  briefIds: number[],
  professionalId: number,
): Promise<void> {
  if (briefIds.length === 0) return;
  try {
    const admin = createAdminClient();
    const rows = briefIds.map((briefId) => ({
      brief_id: briefId,
      professional_id: professionalId,
      kind: "reached",
    }));
    const { error } = await admin
      .from("brief_views")
      .upsert(rows, {
        onConflict: "brief_id,professional_id,kind",
        ignoreDuplicates: true,
      });
    if (error) throw error;
  } catch (err) {
    log.warn("recordBriefReach failed", {
      professionalId,
      count: briefIds.length,
      err: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Record that an adviser opened the brief's full details. Returns whether
 * this was the first distinct adviser-view of the brief — the caller uses
 * that to trigger the consumer's one-time notification.
 */
export async function recordBriefView(
  briefId: number,
  professionalId: number,
): Promise<{ firstViewOfBrief: boolean }> {
  try {
    const admin = createAdminClient();
    // Insert-or-ignore this adviser's view…
    const { error: insertError } = await admin
      .from("brief_views")
      .upsert(
        { brief_id: briefId, professional_id: professionalId, kind: "viewed" },
        { onConflict: "brief_id,professional_id,kind", ignoreDuplicates: true },
      );
    if (insertError) throw insertError;
    // …then ask whether the brief now has exactly one distinct viewer.
    const { count, error: countError } = await admin
      .from("brief_views")
      .select("id", { count: "exact", head: true })
      .eq("brief_id", briefId)
      .eq("kind", "viewed");
    if (countError) throw countError;
    return { firstViewOfBrief: (count ?? 0) === 1 };
  } catch (err) {
    log.warn("recordBriefView failed", {
      briefId,
      professionalId,
      err: err instanceof Error ? err.message : String(err),
    });
    return { firstViewOfBrief: false };
  }
}

// ─── Readers ─────────────────────────────────────────────────────────────

export interface BriefActivity {
  reached: number;
  viewed: number;
}

export async function getBriefActivity(briefId: number): Promise<BriefActivity> {
  try {
    const admin = createAdminClient();
    const [reachedRes, viewedRes] = await Promise.all([
      admin
        .from("brief_views")
        .select("id", { count: "exact", head: true })
        .eq("brief_id", briefId)
        .eq("kind", "reached"),
      admin
        .from("brief_views")
        .select("id", { count: "exact", head: true })
        .eq("brief_id", briefId)
        .eq("kind", "viewed"),
    ]);
    return { reached: reachedRes.count ?? 0, viewed: viewedRes.count ?? 0 };
  } catch (err) {
    log.warn("getBriefActivity failed", {
      briefId,
      err: err instanceof Error ? err.message : String(err),
    });
    return { reached: 0, viewed: 0 };
  }
}

/** Pure: median of (accepted_at − created_at) in whole hours; null when empty. */
export function medianAcceptHours(
  rows: { created_at: string; accepted_at: string }[],
): number | null {
  const deltas = rows
    .map((r) => new Date(r.accepted_at).getTime() - new Date(r.created_at).getTime())
    .filter((ms) => Number.isFinite(ms) && ms >= 0)
    .sort((a, b) => a - b);
  if (deltas.length === 0) return null;
  const mid = Math.floor(deltas.length / 2);
  const ms =
    deltas.length % 2 === 1 ? deltas[mid]! : (deltas[mid - 1]! + deltas[mid]!) / 2;
  return Math.max(1, Math.round(ms / 3_600_000));
}

/** Suppress the stat below this sample size — a 2-brief median is noise. */
export const MEDIAN_MIN_SAMPLE = 5;

const medianCache = new Map<string, { value: number | null; at: number }>();
const MEDIAN_CACHE_TTL_MS = 60 * 60 * 1000;

/**
 * Median time-to-accept for briefs of this template over the last 90 days
 * (falls back to all templates when the template sample is too small).
 * Cached in-process for an hour — it powers a low-traffic tracker page.
 */
export async function getMedianAcceptHours(
  template: string | null,
): Promise<number | null> {
  const key = template ?? "__all__";
  const cached = medianCache.get(key);
  if (cached && Date.now() - cached.at < MEDIAN_CACHE_TTL_MS) return cached.value;

  try {
    const admin = createAdminClient();
    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    let query = admin
      .from("advisor_auctions")
      .select("created_at, accepted_at")
      .eq("flow_type", "accept")
      .not("accepted_at", "is", null)
      .gte("created_at", since)
      .limit(500);
    if (template) query = query.eq("brief_template", template);
    const { data, error } = await query;
    if (error) throw error;

    const rows = (data ?? []) as { created_at: string; accepted_at: string }[];
    let value: number | null = null;
    if (rows.length >= MEDIAN_MIN_SAMPLE) {
      value = medianAcceptHours(rows);
    } else if (template) {
      // Template sample too thin — fall back to the all-templates median.
      value = await getMedianAcceptHours(null);
    }
    medianCache.set(key, { value, at: Date.now() });
    return value;
  } catch (err) {
    log.warn("getMedianAcceptHours failed", {
      template,
      err: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/** Test hook — drop the in-process median cache. */
export function clearMedianCacheForTests(): void {
  medianCache.clear();
}
