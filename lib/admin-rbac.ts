/**
 * Capability-based admin authorization (Idea #14) — ADDITIVE, dual-sourced.
 *
 * Layers fine-grained capability checks on top of the existing ADMIN_EMAILS
 * allowlist WITHOUT cutting over. Resolution:
 *
 *   1. If the email is in ADMIN_EMAILS (env) → superuser: has every
 *      capability. This keeps every current admin working unchanged
 *      during the transition.
 *   2. Else if there's an active admin_users row for the email → the
 *      capabilities of its role.
 *   3. Else → no capabilities.
 *
 * The founder owns the eventual cutover (removing the env superuser
 * branch once every admin has an admin_users row). Until then this is
 * purely additive: it can only GRANT scoped access to new support /
 * compliance staff, never restrict existing env admins.
 *
 * See docs/audits/identity-platform-expansion-2026-05-20.md (Wave 1, #14).
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminEmails } from "@/lib/admin";
import { logger } from "@/lib/logger";

const log = logger("admin-rbac");

export type AdminCapability =
  | "can_edit_advisors"
  | "can_view_pii"
  | "can_change_pricing"
  | "can_moderate"
  | "can_manage_billing"
  | "can_run_crons"
  | "can_view_audit"
  | "can_manage_admins";

export const ALL_CAPABILITIES: readonly AdminCapability[] = [
  "can_edit_advisors",
  "can_view_pii",
  "can_change_pricing",
  "can_moderate",
  "can_manage_billing",
  "can_run_crons",
  "can_view_audit",
  "can_manage_admins",
];

/**
 * Resolve the capability set for an admin email. Env admins are superusers
 * (all capabilities); otherwise read the admin_users → role → capabilities
 * chain. Returns an empty set for non-admins.
 */
export async function getAdminCapabilities(email: string | null | undefined): Promise<Set<AdminCapability>> {
  const normalized = (email ?? "").trim().toLowerCase();
  if (!normalized) return new Set();

  // 1. Env superuser bootstrap.
  if (getAdminEmails().includes(normalized)) {
    return new Set(ALL_CAPABILITIES);
  }

  // 2. DB-backed role.
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("admin_users")
      .select("role_id, active, admin_role_capabilities:admin_role_capabilities(capability)")
      .eq("email", normalized)
      .eq("active", true)
      .maybeSingle();
    if (error || !data) return new Set();
    const caps = (data as unknown as { admin_role_capabilities: { capability: string }[] })
      .admin_role_capabilities;
    return new Set((caps ?? []).map((c) => c.capability as AdminCapability));
  } catch (err) {
    log.warn("getAdminCapabilities threw", {
      email: normalized,
      err: err instanceof Error ? err.message : String(err),
    });
    return new Set();
  }
}

/**
 * True if the email holds the capability.
 */
export async function hasAdminCapability(
  email: string | null | undefined,
  capability: AdminCapability,
): Promise<boolean> {
  const caps = await getAdminCapabilities(email);
  return caps.has(capability);
}

/**
 * List the emails of active admins holding a given capability — env admins
 * always included (they hold every capability). Useful for "who can approve
 * X" notification fan-outs.
 */
export async function getAdminsWithCapability(capability: AdminCapability): Promise<string[]> {
  const envAdmins = getAdminEmails();
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("admin_users")
      .select("email, active, admin_role_capabilities:admin_role_capabilities(capability)")
      .eq("active", true);
    const dbAdmins = ((data ?? []) as unknown as {
      email: string;
      admin_role_capabilities: { capability: string }[];
    }[])
      .filter((r) => (r.admin_role_capabilities ?? []).some((c) => c.capability === capability))
      .map((r) => r.email.trim().toLowerCase());
    return [...new Set([...envAdmins, ...dbAdmins])];
  } catch {
    return envAdmins;
  }
}
