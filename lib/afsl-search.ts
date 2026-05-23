/**
 * AFSL register — fuzzy search helpers backed by `public.afsl_register`.
 *
 * Powers the public `/afsl-lookup` tool and its `/api/afsl-search` API.
 * The single-record path (`getAfslLicensee` in `lib/afsl-register.ts`) is an
 * exact AFSL-number lookup; this module does the *name + partial number*
 * search the lookup page needs, then cross-links any matched licensee to an
 * advisor profile in our directory (`professionals.afsl_number`) so qualified
 * traffic can convert.
 *
 * Reuse, don't duplicate: status enum, labels and the AFSL-number normaliser
 * all come from `lib/afsl-register.ts`.
 *
 * RLS: `afsl_register` has a public anon SELECT policy, so the anon-key
 * static client is the correct (and intended) read path. We deliberately do
 * NOT touch `authorised_representatives` — that table is service-role-only and
 * holds our *own* ARs (with contact emails), not the public ASIC register.
 */

import { createStaticClient } from "@/lib/supabase/static";
import {
  type AfslStatus,
  AFSL_STATUS_LABELS,
  normaliseAfslNumber,
} from "@/lib/afsl-register";

/** Hard ceiling on rows returned — keeps the response small and the query
 * cheap. The lookup page is a "find the one you mean" tool, not a bulk export. */
export const AFSL_SEARCH_MAX_RESULTS = 25;
/** Minimum characters before we hit the DB. Below this the result set is
 * meaningless and the query is just load. */
export const AFSL_SEARCH_MIN_QUERY = 2;

/** A licensee match, plus the directory cross-link when we list the holder. */
export interface AfslSearchResult {
  afsl_number: string;
  licensee_name: string;
  status: AfslStatus;
  /** Short, human-readable summary of licence conditions (if any on file). */
  conditions_summary: string | null;
  last_verified_at: string;
  /** Slug of a matching advisor profile in our directory, or null. */
  advisor_slug: string | null;
  /** Display name of the matched advisor profile (for the CTA label). */
  advisor_name: string | null;
}

/**
 * `licence_conditions` is free-form JSONB. Different upload sources shape it
 * differently (a string, an array of strings, or `{ summary, items }`). Reduce
 * whatever is there to a single short sentence for the result card; never throw
 * on an unexpected shape.
 */
export function summariseConditions(raw: unknown): string | null {
  if (raw == null) return null;
  if (typeof raw === "string") {
    const t = raw.trim();
    return t.length ? t.slice(0, 240) : null;
  }
  if (Array.isArray(raw)) {
    const parts = raw
      .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
      .map((x) => x.trim());
    return parts.length ? parts.join("; ").slice(0, 240) : null;
  }
  if (typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if (typeof obj.summary === "string" && obj.summary.trim().length) {
      return obj.summary.trim().slice(0, 240);
    }
    if (Array.isArray(obj.items)) {
      return summariseConditions(obj.items);
    }
  }
  return null;
}

/** PostgREST `or`/`ilike` treat `%`, `,` and `(` specially — neutralise them
 * so a pasted firm name with a comma can't break the filter or widen it. */
function sanitiseTerm(input: string): string {
  return input.replace(/[%,()*\\]/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Fuzzy search the public AFSL register by licensee name or (partial) number.
 *
 * - Pure-digit queries match the AFSL number by prefix (e.g. "2401" →
 *   "240145"), exploiting the primary-key/text ordering.
 * - Everything else does a case-insensitive substring match on the licensee
 *   name (the `idx_afsl_register_licensee_lower` index backs the lower() form).
 *
 * Returns `[]` (never throws) for empty/too-short queries or on DB error —
 * the caller renders an empty state, not a 500.
 */
export async function searchAfslRegister(
  rawQuery: string,
): Promise<AfslSearchResult[]> {
  const query = sanitiseTerm(rawQuery);
  if (query.length < AFSL_SEARCH_MIN_QUERY) return [];

  const supabase = createStaticClient();
  const digits = normaliseAfslNumber(query);
  // Treat as a number search when, after stripping a leading "AFSL"/"AFS
  // no."/"#"/":" prefix, what's left is essentially just digits — so both
  // "240145" and "AFSL 240 145" hit the number path, while a firm name like
  // "AMP" (no digits) or "Acme 360" (mostly letters) stays a name search.
  const numericRemainder = query
    .replace(/^\s*afs(l)?\b/i, "")
    .replace(/^[\s.:#-]*no\.?\b/i, "")
    .replace(/[\s.:#-]+/g, "");
  const isNumberSearch =
    digits.length >= 3 && /^\d+$/.test(numericRemainder);

  let builder = supabase
    .from("afsl_register")
    .select(
      "afsl_number, licensee_name, status, licence_conditions, last_verified_at",
    );

  builder = isNumberSearch
    ? builder.ilike("afsl_number", `${digits}%`)
    : builder.ilike("licensee_name", `%${query}%`);

  const { data, error } = await builder
    .order("licensee_name", { ascending: true })
    .limit(AFSL_SEARCH_MAX_RESULTS);

  if (error || !data || data.length === 0) return [];

  type Row = {
    afsl_number: string;
    licensee_name: string;
    status: AfslStatus;
    licence_conditions: unknown;
    last_verified_at: string;
  };
  const rows = data as Row[];

  // Cross-link: which of these AFSL holders also have an advisor profile in our
  // directory? One IN() query keyed on the public `professionals.afsl_number`.
  const numbers = rows.map((r) => r.afsl_number);
  const advisorByAfsl = new Map<string, { slug: string; name: string }>();
  if (numbers.length > 0) {
    const { data: advisors } = await supabase
      .from("professionals")
      .select("slug, name, afsl_number")
      .eq("status", "active")
      .in("afsl_number", numbers);
    for (const a of (advisors ?? []) as {
      slug: string;
      name: string;
      afsl_number: string | null;
    }[]) {
      if (a.afsl_number && !advisorByAfsl.has(a.afsl_number)) {
        advisorByAfsl.set(a.afsl_number, { slug: a.slug, name: a.name });
      }
    }
  }

  return rows.map((r) => {
    const advisor = advisorByAfsl.get(r.afsl_number) ?? null;
    return {
      afsl_number: r.afsl_number,
      licensee_name: r.licensee_name,
      status: r.status,
      conditions_summary: summariseConditions(r.licence_conditions),
      last_verified_at: r.last_verified_at,
      advisor_slug: advisor?.slug ?? null,
      advisor_name: advisor?.name ?? null,
    };
  });
}

export { AFSL_STATUS_LABELS };
