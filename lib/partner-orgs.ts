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
