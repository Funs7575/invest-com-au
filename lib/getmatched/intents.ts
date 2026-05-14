/**
 * Intent taxonomy helpers — thin read layer over `intent_taxonomy`.
 *
 * Intents are admin-editable; this module is the only place server-side
 * code should look them up. Avoid hard-coding intent slugs anywhere except
 * the type union in `./types.ts`.
 */

// eslint-disable-next-line no-restricted-imports -- public read of admin config; service-role legitimate per CLAUDE.md.
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

import { FALLBACK_INTENTS } from "./fallbacks";
import type { IntentDef, IntentSlug, RouteType } from "./types";

const log = logger("getmatched:intents");

export async function getEnabledIntents(): Promise<IntentDef[]> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("intent_taxonomy")
      .select("*")
      .eq("enabled", true)
      .order("sort_order", { ascending: true });
    if (error) throw error;
    if (data && data.length > 0) return data as IntentDef[];
  } catch (err) {
    log.warn("getEnabledIntents failed (using code-defined fallback)", {
      err: err instanceof Error ? err.message : String(err),
    });
  }
  return FALLBACK_INTENTS;
}

export async function getIntent(slug: IntentSlug | string): Promise<IntentDef | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("intent_taxonomy")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  return (data as IntentDef) ?? null;
}

/**
 * Pure helper for tests + the engine: pick the default route for a given
 * intent slug, falling back to 'guide' when the intent is unknown.
 */
export function defaultRouteForIntent(
  slug: IntentSlug | string | null | undefined,
  intents: IntentDef[],
): RouteType {
  if (!slug) return "guide";
  const match = intents.find((i) => i.slug === slug);
  return (match?.default_route as RouteType) ?? "guide";
}
