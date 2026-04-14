/**
 * Target Market Determinations (TMDs).
 *
 * The Design and Distribution Obligations regime (Corporations Act,
 * s994A–C) requires financial product issuers + distributors to
 * publish a TMD for every product they offer. Since Invest.com.au
 * distributes (i.e., refers readers to) brokers, advisors, and
 * managed funds, we must surface a link to each partner's TMD on
 * the product page.
 *
 * This lib wraps the `tmds` table with:
 *
 *   - getCurrentTmd(productType, productRef) — fetch the active
 *     TMD for a product. Returns the most recent row where
 *     valid_from <= now() < valid_until (or valid_until is null).
 *   - listAllTmds()               — admin index
 *   - upsertTmd(input)            — admin create/update
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("tmds");

export type TmdProductType = "broker" | "advisor" | "fund";

export interface TmdRow {
  id: number;
  product_type: TmdProductType;
  product_ref: string;
  product_name: string;
  tmd_url: string;
  tmd_version: string;
  reviewed_at: string | null;
  valid_from: string;
  valid_until: string | null;
}

export async function getCurrentTmd(
  productType: TmdProductType,
  productRef: string,
): Promise<TmdRow | null> {
  try {
    const supabase = createAdminClient();
    const nowIso = new Date().toISOString();
    const { data } = await supabase
      .from("tmds")
      .select("*")
      .eq("product_type", productType)
      .eq("product_ref", productRef)
      .lte("valid_from", nowIso)
      .or(`valid_until.is.null,valid_until.gte.${nowIso}`)
      .order("valid_from", { ascending: false })
      .limit(1)
      .maybeSingle();
    return (data as TmdRow | null) || null;
  } catch {
    return null;
  }
}

export async function listAllTmds(): Promise<TmdRow[]> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("tmds")
      .select("*")
      .order("valid_from", { ascending: false })
      .limit(500);
    return (data as TmdRow[] | null) || [];
  } catch {
    return [];
  }
}

export interface UpsertTmdInput {
  productType: TmdProductType;
  productRef: string;
  productName: string;
  tmdUrl: string;
  tmdVersion: string;
  reviewedAt?: string | null;
  validFrom?: string | null;
  validUntil?: string | null;
}

const VALID_TYPES: TmdProductType[] = ["broker", "advisor", "fund"];

export async function upsertTmd(input: UpsertTmdInput): Promise<{ ok: boolean; id?: number; error?: string }> {
  if (!VALID_TYPES.includes(input.productType)) {
    return { ok: false, error: "invalid_product_type" };
  }
  if (!/^https?:\/\//.test(input.tmdUrl)) {
    return { ok: false, error: "invalid_tmd_url" };
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("tmds")
      .upsert(
        {
          product_type: input.productType,
          product_ref: input.productRef.slice(0, 200),
          product_name: input.productName.slice(0, 200),
          tmd_url: input.tmdUrl.slice(0, 500),
          tmd_version: input.tmdVersion.slice(0, 50),
          reviewed_at: input.reviewedAt ?? null,
          valid_from: input.validFrom ?? new Date().toISOString(),
          valid_until: input.validUntil ?? null,
        },
        { onConflict: "product_type,product_ref,tmd_version" },
      )
      .select("id")
      .single();
    if (error) {
      log.warn("tmds upsert failed", { error: error.message });
      return { ok: false, error: error.message };
    }
    return { ok: true, id: data?.id as number };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
