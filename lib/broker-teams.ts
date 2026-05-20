/**
 * Broker partner team helpers (Phase 2.3).
 *
 * Models a broker partner ORG with multiple SEATS — mirrors the
 * advisor_firms pattern at lib/advisor-firms (if/when extracted) but
 * scoped to broker_accounts. Today's broker_accounts table is one row
 * per person; an affiliate partner is normally an organisation with
 * sales + finance + ops + technical contacts. This module lets the
 * portal manage that.
 *
 * Roles: owner | finance | ops | technical | member.
 * Capability gates live at the API route layer — see app/broker-portal/team.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import crypto from "node:crypto";

const log = logger("broker-teams");

export type BrokerTeamRole = "owner" | "finance" | "ops" | "technical" | "member";

export interface BrokerPartnerOrg {
  id: number;
  slug: string;
  name: string;
  primaryContactEmail: string | null;
  status: "pending" | "active" | "suspended" | "terminated";
  maxSeats: number;
  principalId: string | null;
}

export interface BrokerTeamMembership {
  id: number;
  orgId: number;
  brokerAccountId: string;
  role: BrokerTeamRole;
  status: "active" | "pending" | "removed";
  joinedAt: string;
}

interface OrgRow {
  id: number;
  slug: string;
  name: string;
  primary_contact_email: string | null;
  status: string;
  max_seats: number;
  principal_id: string | null;
}

interface MembershipRow {
  id: number;
  org_id: number;
  broker_account_id: string;
  role: string;
  status: string;
  joined_at: string;
}

function rowToOrg(r: OrgRow): BrokerPartnerOrg {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    primaryContactEmail: r.primary_contact_email,
    status: r.status as BrokerPartnerOrg["status"],
    maxSeats: r.max_seats,
    principalId: r.principal_id,
  };
}

function rowToMembership(r: MembershipRow): BrokerTeamMembership {
  return {
    id: r.id,
    orgId: r.org_id,
    brokerAccountId: r.broker_account_id,
    role: r.role as BrokerTeamRole,
    status: r.status as BrokerTeamMembership["status"],
    joinedAt: r.joined_at,
  };
}

/**
 * Look up the broker partner org for a given broker_account, via the
 * memberships join.
 */
export async function getBrokerOrgForAccount(
  brokerAccountId: string,
): Promise<BrokerPartnerOrg | null> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("broker_team_memberships")
      .select("broker_partner_orgs(id, slug, name, primary_contact_email, status, max_seats, principal_id)")
      .eq("broker_account_id", brokerAccountId)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();
    if (error) {
      log.warn("getBrokerOrgForAccount failed", {
        brokerAccountId,
        error: error.message,
      });
      return null;
    }
    const org = (data as unknown as { broker_partner_orgs: OrgRow | null } | null)
      ?.broker_partner_orgs;
    return org ? rowToOrg(org) : null;
  } catch (err) {
    log.warn("getBrokerOrgForAccount threw", {
      brokerAccountId,
      err: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/**
 * List active members of a broker org.
 */
export async function listBrokerTeamMembers(orgId: number): Promise<BrokerTeamMembership[]> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("broker_team_memberships")
      .select("id, org_id, broker_account_id, role, status, joined_at")
      .eq("org_id", orgId)
      .order("joined_at", { ascending: true });
    if (error) {
      log.warn("listBrokerTeamMembers failed", { orgId, error: error.message });
      return [];
    }
    return ((data ?? []) as MembershipRow[]).map(rowToMembership);
  } catch (err) {
    log.warn("listBrokerTeamMembers threw", {
      orgId,
      err: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}

/**
 * Check whether a broker_account has a capability for an org. Capabilities
 * are derived from roles:
 *
 *   manage_billing → owner | finance
 *   manage_webhook → owner | technical
 *   manage_team    → owner
 *   view_dashboard → any active member
 */
export type BrokerCapability =
  | "manage_billing"
  | "manage_webhook"
  | "manage_team"
  | "view_dashboard";

const CAPABILITY_ROLES: Record<BrokerCapability, ReadonlySet<BrokerTeamRole>> = {
  manage_billing: new Set(["owner", "finance"]),
  manage_webhook: new Set(["owner", "technical"]),
  manage_team: new Set(["owner"]),
  view_dashboard: new Set(["owner", "finance", "ops", "technical", "member"]),
};

export async function hasBrokerCapability(opts: {
  brokerAccountId: string;
  orgId: number;
  capability: BrokerCapability;
}): Promise<boolean> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("broker_team_memberships")
      .select("role, status")
      .eq("broker_account_id", opts.brokerAccountId)
      .eq("org_id", opts.orgId)
      .eq("status", "active")
      .maybeSingle();
    if (error || !data) {
      return false;
    }
    return CAPABILITY_ROLES[opts.capability].has(data.role as BrokerTeamRole);
  } catch (err) {
    log.warn("hasBrokerCapability threw", {
      ...opts,
      err: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

/**
 * Create a pending invitation for a new team member. Returns the token
 * the caller should embed in the invite email link.
 */
export async function createBrokerTeamInvitation(opts: {
  orgId: number;
  email: string;
  role: BrokerTeamRole;
  invitedByBrokerAccountId?: string | null;
}): Promise<{ token: string; expiresAt: string } | null> {
  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("broker_team_invitations").insert({
      org_id: opts.orgId,
      email: opts.email.trim().toLowerCase(),
      role: opts.role,
      token,
      invited_by: opts.invitedByBrokerAccountId ?? null,
      expires_at: expiresAt,
    });
    if (error) {
      log.warn("createBrokerTeamInvitation failed", {
        orgId: opts.orgId,
        error: error.message,
      });
      return null;
    }
    return { token, expiresAt };
  } catch (err) {
    log.warn("createBrokerTeamInvitation threw", {
      orgId: opts.orgId,
      err: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}
