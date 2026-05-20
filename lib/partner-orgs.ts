/**
 * Partner-org principal helpers (Phase 0.3 — account/identity architecture).
 *
 * Commercial partners (newsletter sponsors, partner integrations) are
 * external organisations with no auth.users row but real audit-trail value:
 * "who is this sponsor really; what other relationships do they have with
 * us; have they upgraded to a self-serve account yet". This module is the
 * runtime entry point for creating or resolving the `principals` row that
 * represents one of those orgs.
 *
 * Resolution rules:
 *   - Match by (display_name, source) on existing kind='partner_org' rows
 *   - Don't merge across source tables (a name match between newsletter
 *     and partner_integrations is treated as two separate orgs)
 *   - The future sponsor → broker_partner upgrade flow lives elsewhere
 *     (Phase 2.5 post-signin hook) — this module never mutates kind
 *
 * See docs/audits/account-architecture-master-plan-2026-05-19.md Phase 0.3.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import type { Principal } from "@/lib/principals";

const log = logger("partner-orgs");

export type PartnerSource = "newsletter_sponsors" | "partner_integrations";

interface PartnerOrgRow {
  id: string;
  kind: string;
  auth_user_id: string | null;
  display_name: string;
  slug: string | null;
  status: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

function rowToPrincipal(r: PartnerOrgRow): Principal {
  return {
    id: r.id,
    kind: "partner_org",
    authUserId: r.auth_user_id,
    displayName: r.display_name,
    slug: r.slug,
    status: r.status as Principal["status"],
    metadata: r.metadata ?? {},
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

/**
 * Find-or-create a partner_org principal for an external commercial partner.
 *
 * @param displayName  the partner's company name (used as the natural key
 *                     within the source table)
 * @param source       the source-of-truth metadata table for this partner
 * @param extraMetadata fields to merge into principals.metadata on create
 *                      (e.g. partner_type for partner_integrations source)
 */
export async function getOrCreatePartnerPrincipal(
  displayName: string,
  source: PartnerSource,
  extraMetadata: Record<string, string> = {},
): Promise<Principal | null> {
  const name = displayName.trim();
  if (!name) {
    log.warn("getOrCreatePartnerPrincipal called with empty displayName");
    return null;
  }
  const supabase = createAdminClient();

  // Build metadata filter: source plus any extra keys (e.g. partner_type).
  const metadataFilter: Record<string, string> = { source, ...extraMetadata };

  // Try to find an existing row first.
  try {
    let query = supabase
      .from("principals")
      .select("id, kind, auth_user_id, display_name, slug, status, metadata, created_at, updated_at")
      .eq("kind", "partner_org")
      .eq("display_name", name);
    for (const [key, value] of Object.entries(metadataFilter)) {
      // Postgres JSONB equality through PostgREST: ->> for text comparison.
      query = query.eq(`metadata->>${key}`, value);
    }
    const { data, error } = await query.maybeSingle();
    if (error) {
      log.warn("getOrCreatePartnerPrincipal lookup failed", {
        name,
        source,
        error: error.message,
      });
    } else if (data) {
      return rowToPrincipal(data as PartnerOrgRow);
    }
  } catch (err) {
    log.warn("getOrCreatePartnerPrincipal lookup threw", {
      name,
      source,
      err: err instanceof Error ? err.message : String(err),
    });
  }

  // Not found — create one.
  try {
    const { data, error } = await supabase
      .from("principals")
      .insert({
        kind: "partner_org",
        display_name: name,
        metadata: metadataFilter,
        status: "active",
      })
      .select("id, kind, auth_user_id, display_name, slug, status, metadata, created_at, updated_at")
      .single();
    if (error) {
      log.warn("getOrCreatePartnerPrincipal insert failed", {
        name,
        source,
        error: error.message,
      });
      return null;
    }
    return rowToPrincipal(data as PartnerOrgRow);
  } catch (err) {
    log.warn("getOrCreatePartnerPrincipal insert threw", {
      name,
      source,
      err: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/**
 * Upgrade a partner_org principal in place to a real, logged-in
 * broker_partner (Idea #1). The SAME principal row survives — its kind
 * flips to 'human' and gains auth_user_id — and a broker_accounts row is
 * created linked to it. This is what turns a one-off newsletter sponsor
 * into a recurring self-serve marketplace partner without losing the
 * relationship history attached to the principal.
 *
 * Idempotent: if the principal is already human / already linked, returns
 * the existing broker_accounts id.
 *
 * @returns the broker_accounts id on success, or null on failure.
 */
export async function upgradePartnerToBrokerPartner(opts: {
  principalId: string;
  authUserId: string;
  email: string;
  brokerSlug: string;
  companyName?: string | null;
}): Promise<string | null> {
  const supabase = createAdminClient();

  // Flip the principal to human + attach the auth user. Only if it's still
  // a partner_org (don't clobber an already-upgraded or human principal).
  try {
    const { error: upErr } = await supabase
      .from("principals")
      .update({ kind: "human", auth_user_id: opts.authUserId })
      .eq("id", opts.principalId)
      .eq("kind", "partner_org");
    if (upErr) {
      log.warn("upgradePartnerToBrokerPartner principal flip failed", {
        principalId: opts.principalId,
        error: upErr.message,
      });
      // Continue — the broker_accounts upsert below is the load-bearing part.
    }
  } catch (err) {
    log.warn("upgradePartnerToBrokerPartner principal flip threw", {
      principalId: opts.principalId,
      err: err instanceof Error ? err.message : String(err),
    });
  }

  // Create (or fetch) the broker_accounts row linked to this principal.
  try {
    const { data, error } = await supabase
      .from("broker_accounts")
      .upsert(
        {
          auth_user_id: opts.authUserId,
          principal_id: opts.principalId,
          broker_slug: opts.brokerSlug,
          email: opts.email,
          full_name: opts.companyName ?? opts.email,
          company_name: opts.companyName ?? null,
          status: "pending",
        },
        { onConflict: "auth_user_id" },
      )
      .select("id")
      .single();
    if (error) {
      log.warn("upgradePartnerToBrokerPartner broker_accounts upsert failed", {
        principalId: opts.principalId,
        error: error.message,
      });
      return null;
    }
    return (data?.id as string | undefined) ?? null;
  } catch (err) {
    log.warn("upgradePartnerToBrokerPartner broker_accounts upsert threw", {
      principalId: opts.principalId,
      err: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/**
 * Find a partner_org principal whose display_name or contact matches an
 * email's local domain / name — used by the post-signin hook to offer an
 * upgrade when a sponsor later signs up. Conservative: matches only on an
 * exact email stored in metadata.contact_email.
 */
export async function findPartnerOrgByContactEmail(email: string): Promise<Principal | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("principals")
      .select("id, kind, auth_user_id, display_name, slug, status, metadata, created_at, updated_at")
      .eq("kind", "partner_org")
      .eq("metadata->>contact_email", normalized)
      .maybeSingle();
    if (error || !data) return null;
    return rowToPrincipal(data as PartnerOrgRow);
  } catch {
    return null;
  }
}
