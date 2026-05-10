/**
 * Server-only country-rule-alerts fetcher.
 *
 * Split from `country-rule-alerts.ts` because the supabase server
 * client transitively imports `next/headers`, which is forbidden in
 * client bundles. Mirrors the `intent-context-server.ts` pattern.
 *
 * The table is RLS-public-on-active so we use the anon `createClient()`
 * — no service-role key needed for reads.
 */

import { createClient } from "@/lib/supabase/server";
import { isKnownIntentCountry } from "@/lib/intent-context";
import {
  PublicRuleAlertSchema,
  type PublicRuleAlert,
} from "@/lib/country-rule-alerts";

const PUBLIC_COLUMNS =
  "alert_key, severity, headline, body, source, cta_href, cta_label";

/**
 * Fetch active alerts for a country, ordered by display_order.
 * Returns [] for unknown countries or on any DB error — the alerts
 * banner is best-effort and must never break a page render.
 */
export async function getActiveAlertsForCountry(
  countryCode: string,
): Promise<PublicRuleAlert[]> {
  const code = countryCode.trim().toLowerCase();
  if (!isKnownIntentCountry(code)) return [];

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("country_rule_alerts")
      .select(PUBLIC_COLUMNS)
      .eq("country_code", code)
      .eq("active", true)
      .order("display_order", { ascending: true });

    if (!data) return [];

    return data
      .map((row) => PublicRuleAlertSchema.safeParse(row))
      .flatMap((parsed) => (parsed.success ? [parsed.data] : []));
  } catch {
    return [];
  }
}
