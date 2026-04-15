/**
 * Search query logging.
 *
 * Captures anonymous search queries from article/advisor/compare
 * search boxes. The capture API strips PII aggressively before
 * writing to the DB — an accidental paste of an email or phone
 * into a search box should never land in the log.
 *
 * Consumers:
 *   - /api/analytics/search-log (POST) — capture endpoint
 *   - /admin/analytics/search          — rollup view
 *   - Future: "top zero-result queries" alert cron so editorial
 *     can plug content gaps
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { createHash } from "node:crypto";
import { logger } from "@/lib/logger";

const log = logger("search-analytics");

export type SearchSurface =
  | "articles"
  | "advisors"
  | "compare"
  | "best_for"
  | "topic"
  | "tag"
  | "quiz"
  | "global";

const VALID_SURFACES: SearchSurface[] = [
  "articles",
  "advisors",
  "compare",
  "best_for",
  "topic",
  "tag",
  "quiz",
  "global",
];

export function isValidSurface(v: unknown): v is SearchSurface {
  return typeof v === "string" && (VALID_SURFACES as string[]).includes(v);
}

/**
 * Redact common PII patterns before persisting a query. We want
 * to keep the search log useful for editorial + UX research but
 * we never want to store email addresses, phone numbers, TFNs or
 * credit card numbers — even by accident.
 */
export function redactQuery(raw: string): string {
  let q = raw.trim().toLowerCase();
  // Emails
  q = q.replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[email]");
  // AU phone numbers (04xx or 02/03/07/08 area codes)
  q = q.replace(/\b0[234578]\s*\d{2}\s*\d{3}\s*\d{3}\b/g, "[phone]");
  // International AU: +61 then 9 digits in any whitespace/dash grouping
  q = q.replace(/\+61\s*\d(?:[\s-]*\d){8}/g, "[phone]");
  // 9-digit TFNs / tax file numbers (common format with spaces)
  q = q.replace(/\b\d{3}\s\d{3}\s\d{3}\b/g, "[tfn]");
  // Credit card numbers (13-19 digit run)
  q = q.replace(/\b\d{13,19}\b/g, "[card]");
  // Collapse whitespace
  q = q.replace(/\s+/g, " ").trim();
  return q;
}

export interface SearchLogInput {
  queryText: string;
  surface: SearchSurface;
  resultCount?: number | null;
  resultClicked?: boolean;
  clickedRank?: number | null;
  sessionId?: string | null;
}

function hashSession(sessionId: string | null | undefined): string | null {
  if (!sessionId) return null;
  const salt = process.env.IP_HASH_SALT || "invest-com-au";
  return createHash("sha256").update(sessionId + salt).digest("hex").slice(0, 32);
}

/**
 * Log a search query. Fire-and-forget safe — never throws.
 * Returns true on insert success for call sites that want to
 * light up a "logged" indicator in dev.
 */
export async function logSearchQuery(
  input: SearchLogInput,
): Promise<boolean> {
  if (!input.queryText || !isValidSurface(input.surface)) return false;

  // Strict cap — the longest real search we'd expect is a broker
  // + scenario phrase, about 80 chars. Anything over 200 is
  // almost certainly a paste that we don't want to store.
  const redacted = redactQuery(input.queryText).slice(0, 200);
  if (redacted.length < 2) return false;

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("search_queries").insert({
      query_text: redacted,
      query_length: redacted.length,
      surface: input.surface,
      result_count: input.resultCount ?? null,
      result_clicked: input.resultClicked ?? false,
      clicked_rank: input.clickedRank ?? null,
      session_hash: hashSession(input.sessionId),
    });
    if (error) {
      log.warn("search_queries insert failed", { error: error.message });
      return false;
    }
    return true;
  } catch (err) {
    log.warn("logSearchQuery threw", {
      err: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

// ─── Admin reads ────────────────────────────────────────────────

export interface TopQueryRow {
  query_text: string;
  count: number;
  avg_results: number | null;
  click_rate: number;
}

/**
 * Top N queries for a surface in the last N days. Grouped by
 * redacted text, sorted by count desc. Excludes sessions with
 * zero results when `resultsOnly=true`.
 */
export async function topQueries(opts: {
  surface?: SearchSurface | null;
  daysBack: number;
  limit?: number;
}): Promise<TopQueryRow[]> {
  try {
    const supabase = createAdminClient();
    const since = new Date(
      Date.now() - opts.daysBack * 86_400_000,
    ).toISOString();

    let query = supabase
      .from("search_queries")
      .select("query_text, result_count, result_clicked")
      .gte("created_at", since)
      .limit(5000);
    if (opts.surface) query = query.eq("surface", opts.surface);

    const { data } = await query;
    const rows =
      (data as Array<{
        query_text: string;
        result_count: number | null;
        result_clicked: boolean;
      }> | null) || [];

    // Aggregate in-process — for a few thousand rows this is
    // fine and avoids needing a Postgres function.
    const buckets = new Map<
      string,
      { count: number; resultsSum: number; resultsCount: number; clicks: number }
    >();
    for (const r of rows) {
      const b = buckets.get(r.query_text) || {
        count: 0,
        resultsSum: 0,
        resultsCount: 0,
        clicks: 0,
      };
      b.count += 1;
      if (r.result_count != null) {
        b.resultsSum += r.result_count;
        b.resultsCount += 1;
      }
      if (r.result_clicked) b.clicks += 1;
      buckets.set(r.query_text, b);
    }

    const rowsOut: TopQueryRow[] = [];
    for (const [text, b] of buckets.entries()) {
      rowsOut.push({
        query_text: text,
        count: b.count,
        avg_results:
          b.resultsCount > 0
            ? Math.round((b.resultsSum / b.resultsCount) * 10) / 10
            : null,
        click_rate: b.count > 0 ? b.clicks / b.count : 0,
      });
    }
    rowsOut.sort((a, b) => b.count - a.count);
    return rowsOut.slice(0, opts.limit ?? 50);
  } catch {
    return [];
  }
}

/**
 * Queries with result_count === 0. Editorial uses this list
 * to decide what content to write next — "10 users searched
 * for X, we returned nothing, write a piece about X".
 */
export async function zeroResultQueries(opts: {
  daysBack: number;
  limit?: number;
}): Promise<TopQueryRow[]> {
  try {
    const supabase = createAdminClient();
    const since = new Date(
      Date.now() - opts.daysBack * 86_400_000,
    ).toISOString();
    const { data } = await supabase
      .from("search_queries")
      .select("query_text, result_count, result_clicked")
      .gte("created_at", since)
      .eq("result_count", 0)
      .limit(5000);
    const rows = (data as Array<{
      query_text: string;
      result_count: number | null;
      result_clicked: boolean;
    }> | null) || [];
    const buckets = new Map<string, number>();
    for (const r of rows) {
      buckets.set(r.query_text, (buckets.get(r.query_text) || 0) + 1);
    }
    const out = Array.from(buckets.entries())
      .map(([query_text, count]) => ({
        query_text,
        count,
        avg_results: 0,
        click_rate: 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, opts.limit ?? 30);
    return out;
  } catch {
    return [];
  }
}
