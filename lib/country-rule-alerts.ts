/**
 * Country-rule-alerts shared types + zod schemas.
 *
 * Client- and server-safe. The server-only fetch helper that pulls
 * rows from Supabase lives in `country-rule-alerts-server.ts` so this
 * module can be imported by client components (the admin editor) and
 * shared types stay in one place.
 *
 * Editorial team writes via /admin/country-rule-alerts (service-role);
 * the public client component fetches via /api/country-rule-alerts.
 *
 * Replaces the hardcoded ALERTS_BY_COUNTRY map that previously lived
 * in components/CountryRuleAlerts.tsx (W4.21).
 */

import { z } from "zod";

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
