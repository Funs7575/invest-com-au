/**
 * Privacy Act + GDPR data subject helpers.
 *
 * Central config for which tables hold PII keyed by email, and how
 * to delete/export each one. Add a new surface here and the
 * /api/privacy endpoints automatically cover it.
 *
 * Each entry:
 *   - table:       Supabase table name
 *   - emailColumn: column to match against the user's email
 *   - exportable:  whether to include in the export bundle
 *   - deletable:   whether to erase on deletion request (true)
 *                  or anonymise (false) — some rows (e.g. reviews
 *                  on brokers) stay but lose the email.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export interface PiiSurface {
  table: string;
  emailColumn: string;
  exportable: boolean;
  /** 'delete' removes the row; 'anonymise' nulls the email column */
  deleteStrategy: "delete" | "anonymise";
}

export const PII_SURFACES: PiiSurface[] = [
  { table: "email_captures", emailColumn: "email", exportable: true, deleteStrategy: "delete" },
  { table: "quiz_leads", emailColumn: "email", exportable: true, deleteStrategy: "delete" },
  { table: "fee_alert_subscriptions", emailColumn: "email", exportable: true, deleteStrategy: "delete" },
  { table: "professional_leads", emailColumn: "email", exportable: true, deleteStrategy: "anonymise" },
  { table: "advisor_applications", emailColumn: "email", exportable: true, deleteStrategy: "anonymise" },
  { table: "user_reviews", emailColumn: "email", exportable: true, deleteStrategy: "anonymise" },
  { table: "professional_reviews", emailColumn: "email", exportable: true, deleteStrategy: "anonymise" },
  { table: "switch_stories", emailColumn: "email", exportable: true, deleteStrategy: "anonymise" },
  { table: "lead_disputes", emailColumn: "email", exportable: true, deleteStrategy: "anonymise" },
];

/**
 * Pull every PII row for an email into a single JSON bundle.
 */
export async function exportUserData(
  supabase: SupabaseClient,
  email: string,
): Promise<Record<string, unknown[]>> {
  const lower = email.toLowerCase();
  const bundle: Record<string, unknown[]> = {};
  for (const surface of PII_SURFACES) {
    if (!surface.exportable) continue;
    const { data } = await supabase
      .from(surface.table)
      .select("*")
      .eq(surface.emailColumn, lower);
    bundle[surface.table] = data || [];
  }
  return bundle;
}

/**
 * Delete or anonymise every PII row for an email.
 * Returns a map of table → rows affected for the audit trail.
 */
export async function eraseUserData(
  supabase: SupabaseClient,
  email: string,
): Promise<Record<string, number>> {
  const lower = email.toLowerCase();
  const result: Record<string, number> = {};
  for (const surface of PII_SURFACES) {
    if (surface.deleteStrategy === "delete") {
      const { count, error } = await supabase
        .from(surface.table)
        .delete({ count: "exact" })
        .eq(surface.emailColumn, lower);
      if (!error) result[surface.table] = count || 0;
    } else {
      // Anonymise: replace email with a deterministic placeholder so
      // the row still exists for aggregate stats / review rendering.
      const placeholder = `anonymised-${hashEmail(lower)}@privacy.invest.com.au`;
      const { count, error } = await supabase
        .from(surface.table)
        .update({ [surface.emailColumn]: placeholder }, { count: "exact" })
        .eq(surface.emailColumn, lower);
      if (!error) result[surface.table] = count || 0;
    }
  }
  return result;
}

function hashEmail(email: string): string {
  // Simple FNV-1a so we don't need a dep. Output is deterministic
  // across process restarts so a user requesting deletion twice
  // produces the same placeholder.
  let h = 0x811c9dc5;
  for (let i = 0; i < email.length; i++) {
    h ^= email.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16);
}
