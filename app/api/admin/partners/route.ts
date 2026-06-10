import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/require-admin";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import { generateApiKey, hashApiKey } from "@/lib/partner-auth";
import { logger } from "@/lib/logger";

const log = logger("admin:partners");

const CreatePartnerSchema = z.object({
  company_name: z.string().min(2).max(120),
  contact_email: z.string().email().max(200),
  rate_limit_per_min: z.number().int().min(1).max(600).optional(),
});

/**
 * GET /api/admin/partners — list CPL partner accounts (never the key hashes).
 */
export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("api_customers")
    .select("id, company_name, contact_email, status, tier, rate_limit_per_min, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    log.error("partners list failed", { error: error.message });
    return NextResponse.json({ error: "Failed to list partners." }, { status: 500 });
  }

  return NextResponse.json({ partners: data ?? [] });
}

/**
 * POST /api/admin/partners — mint a partner account + API key.
 *
 * The plaintext key is returned ONCE in this response and never stored —
 * only its SHA-256 hash lands in api_customers.api_key_hash (the same
 * contract as Stripe-style secret keys). Hand it to the partner over a
 * secure channel; rotating means minting a new account row.
 */
export const POST = withValidatedBody(CreatePartnerSchema, async (_req: NextRequest, body) => {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const apiKey = generateApiKey();
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("api_customers")
    .insert({
      company_name: body.company_name.trim(),
      contact_email: body.contact_email.trim().toLowerCase(),
      api_key_hash: hashApiKey(apiKey),
      rate_limit_per_min: body.rate_limit_per_min ?? 60,
      metadata: { kind: "cpl_partner", created_by: guard.email },
    })
    .select("id, company_name, contact_email, status, created_at")
    .single();

  if (error || !data) {
    log.error("partner create failed", { error: error?.message });
    return NextResponse.json({ error: "Failed to create partner." }, { status: 500 });
  }

  log.info("partner account created", { partnerId: data.id, by: guard.email });

  return NextResponse.json({ partner: data, api_key: apiKey }, { status: 201 });
});
