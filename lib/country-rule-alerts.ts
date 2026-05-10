/**
 * Country-rule-alerts data layer.
 *
 * Reads `country_rule_alerts` rows for a given lowercase 2-letter
 * intent-country code (uk/us/cn/in/jp/sg/hk/kr/my/nz/ae/sa). The table
 * is RLS-public-on-active so we use the anon `createClient()` from
 * `lib/supabase/server.ts` — no service-role key needed for reads.
 *
 * Editorial team writes via /admin/country-rule-alerts (service-role);
 * the public client component fetches via /api/country-rule-alerts which
 * proxies to this helper.
 *
 * Replaces the hardcoded ALERTS_BY_COUNTRY map that previously lived in
 * components/CountryRuleAlerts.tsx (W4.21 in pre-launch-wave-master-prompt).
 */

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isKnownIntentCountry } from "@/lib/intent-context";

export const AlertSeveritySchema = z.enum(["info", "warning", "urgent"]);
export type AlertSeverity = z.infer<typeof AlertSeveritySchema>;

export const COUNTRY_RULE_ALERT_COUNTRIES = [
  "uk",
  "us",
  "cn",
  "in",
  "jp",
  "sg",
  "hk",
  "kr",
  "my",
  "nz",
  "ae",
  "sa",
] as const;

export const AlertCountrySchema = z.enum(COUNTRY_RULE_ALERT_COUNTRIES);
export type AlertCountry = z.infer<typeof AlertCountrySchema>;

/** Public-facing shape — what the client component renders. */
export const PublicRuleAlertSchema = z.object({
  alert_key: z.string(),
  severity: AlertSeveritySchema,
  headline: z.string(),
  body: z.string(),
  source: z.string(),
  cta_href: z.string().nullable(),
  cta_label: z.string().nullable(),
});
export type PublicRuleAlert = z.infer<typeof PublicRuleAlertSchema>;

/** Admin row — includes housekeeping columns the editor UI needs. */
export const AdminRuleAlertSchema = PublicRuleAlertSchema.extend({
  id: z.number(),
  country_code: AlertCountrySchema,
  stales_at: z.string(),
  display_order: z.number(),
  active: z.boolean(),
  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
});
export type AdminRuleAlert = z.infer<typeof AdminRuleAlertSchema>;

export const SEVERITY_LABELS: Record<AlertSeverity, string> = {
  info: "Info",
  warning: "Warning",
  urgent: "Urgent",
};

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
