/**
 * AFSL register — read helpers backed by the `public.afsl_register` table.
 *
 * The table has public-read RLS and is populated either by the admin CSV
 * uploader (`/admin/afsl-register`) pre-launch or, post-revenue, by a
 * weekly cron pulling from a paid vendor API.
 *
 * Consumers:
 *   - `/api/afsl/[number]` — public resolver API
 *   - `/afsl/[number]`     — SEO landing page
 *
 * The status enum matches the CHECK constraint in
 * `supabase/migrations/20260727000000_afsl_register_cache.sql`.
 */

import { createStaticClient } from "@/lib/supabase/static";

export type AfslStatus =
  | "current"
  | "cancelled"
  | "suspended"
  | "ceased"
  | "unknown";

export interface AfslLicensee {
  afsl_number: string;
  licensee_name: string;
  status: AfslStatus;
  licence_conditions: unknown;
  address: string | null;
  effective_date: string | null;
  cancelled_date: string | null;
  last_verified_at: string;
  source: string;
}

/**
 * Strip everything except digits. AFSL numbers are 6-digit integers in
 * the ASIC register but users paste them as "AFSL 123456", "AFSL: 123 456",
 * "afsl no. 123456" etc. Normalising on read keeps every caller from
 * re-implementing the regex.
 */
export function normaliseAfslNumber(input: string): string {
  return input.replace(/\D+/g, "");
}

export async function getAfslLicensee(
  afslNumber: string,
): Promise<AfslLicensee | null> {
  const normalised = normaliseAfslNumber(afslNumber);
  if (!normalised) return null;

  const supabase = createStaticClient();
  const { data, error } = await supabase
    .from("afsl_register")
    .select(
      "afsl_number, licensee_name, status, licence_conditions, address, effective_date, cancelled_date, last_verified_at, source",
    )
    .eq("afsl_number", normalised)
    .maybeSingle();

  if (error || !data) return null;
  return data as AfslLicensee;
}

export const AFSL_STATUS_LABELS: Record<AfslStatus, string> = {
  current: "Current",
  cancelled: "Cancelled",
  suspended: "Suspended",
  ceased: "Ceased",
  unknown: "Unknown",
};
