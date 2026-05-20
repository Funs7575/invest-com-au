/**
 * Lead-source conversion analytics (Idea #2).
 *
 * Reader over lead_conversion_stats. Answers "which lead sources turn into
 * real accounts" — the evidence for CPL pricing and the demand signals.
 * Read-only; admin-gated app-side.
 */

// eslint-disable-next-line no-restricted-imports -- cross-user / service-role-managed reads with no per-user JWT path (see CLAUDE.md § "Two Supabase clients").
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("lead-conversion");

export interface LeadConversionRow {
  source: string;
  vertical: string;
  totalLeads: number;
  convertedLeads: number;
  conversionRate: number;
}

export async function getLeadConversionStats(): Promise<LeadConversionRow[]> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("lead_conversion_stats")
      .select("source, vertical, total_leads, converted_leads, conversion_rate");
    if (error) {
      log.warn("getLeadConversionStats failed", { error: error.message });
      return [];
    }
    return (data ?? []).map((r) => ({
      source: r.source as string,
      vertical: r.vertical as string,
      totalLeads: Number(r.total_leads),
      convertedLeads: Number(r.converted_leads),
      conversionRate: Number(r.conversion_rate),
    }));
  } catch (err) {
    log.warn("getLeadConversionStats threw", { err: err instanceof Error ? err.message : String(err) });
    return [];
  }
}

/**
 * Pure: roll per-(source,vertical) rows up to per-source totals + a blended
 * conversion rate. Useful for the headline "best converting sources" view.
 */
export function rollUpBySource(rows: ReadonlyArray<LeadConversionRow>): LeadConversionRow[] {
  const bySource = new Map<string, { total: number; converted: number }>();
  for (const r of rows) {
    const acc = bySource.get(r.source) ?? { total: 0, converted: 0 };
    acc.total += r.totalLeads;
    acc.converted += r.convertedLeads;
    bySource.set(r.source, acc);
  }
  return [...bySource.entries()]
    .map(([source, { total, converted }]) => ({
      source,
      vertical: "(all)",
      totalLeads: total,
      convertedLeads: converted,
      conversionRate: total === 0 ? 0 : Math.round((converted / total) * 10000) / 10000,
    }))
    .sort((a, b) => b.totalLeads - a.totalLeads);
}
