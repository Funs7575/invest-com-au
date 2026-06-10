import { createHash, timingSafeEqual, randomBytes } from "crypto";
// eslint-disable-next-line no-restricted-imports -- service-role legitimate per CLAUDE.md: partner API-key auth is an anonymous path (no JWT — partners authenticate with an API key, not a Supabase session) and api_customers has no anon/authenticated read policy
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("partner-auth");

/**
 * Multi-tenant partner identity for the CPL (cost-per-lead) partner API.
 *
 * Keys are minted by POST /api/admin/partners and stored as SHA-256 hashes
 * in `api_customers.api_key_hash` (the table was scaffolded for the API
 * product and is the natural home — company, contact, tier, status,
 * rate limit all already exist).
 *
 * `id === null` is the legacy single-tenant key (env PARTNER_API_KEY),
 * kept for back-compat with integrations sent before partner accounts
 * existed. Its leads have no partner_id and report via the legacy
 * source_page filter.
 */
export interface PartnerIdentity {
  /** api_customers.id, or null for the legacy env-var key. */
  id: string | null;
  name: string;
  rateLimitPerMin: number;
}

/** SHA-256 hex of a partner API key — what api_customers.api_key_hash stores. */
export function hashApiKey(key: string): string {
  return createHash("sha256").update(key, "utf8").digest("hex");
}

/** Generate a new partner key. Returned ONCE at mint time; only the hash is stored. */
export function generateApiKey(): string {
  return `pk_live_${randomBytes(24).toString("base64url")}`;
}

function matchesLegacyKey(apiKey: string): boolean {
  const expected = process.env.PARTNER_API_KEY;
  if (!expected) return false;
  try {
    const a = Buffer.from(apiKey);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Resolve a partner API key to an identity, or null when invalid.
 *
 * Multi-tenant lookup is by SHA-256 hash (constant-time by construction —
 * the comparison happens on the unique index, not on secret bytes);
 * the legacy env key is compared timing-safe.
 */
export async function resolvePartner(apiKey: string | null | undefined): Promise<PartnerIdentity | null> {
  if (!apiKey || typeof apiKey !== "string" || apiKey.length < 8) return null;

  const supabase = createAdminClient();
  const { data: partner, error } = await supabase
    .from("api_customers")
    .select("id, company_name, status, rate_limit_per_min")
    .eq("api_key_hash", hashApiKey(apiKey))
    .maybeSingle();

  if (error) {
    log.error("api_customers lookup failed", { error: error.message });
    // Fall through to the legacy key rather than hard-failing partner traffic.
  }

  if (partner) {
    if (partner.status !== "active") return null;
    return {
      id: partner.id as string,
      name: partner.company_name as string,
      rateLimitPerMin: (partner.rate_limit_per_min as number) || 60,
    };
  }

  if (matchesLegacyKey(apiKey)) {
    return { id: null, name: "legacy", rateLimitPerMin: 60 };
  }

  return null;
}
