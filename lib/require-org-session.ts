// eslint-disable-next-line no-restricted-imports -- organisations lookup bypasses deny-all RLS (only verified/active rows are public); cross-org membership queries have no auth.uid() index (see module comment)
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// adviser_sessions has deny-all RLS by design (see CLAUDE.md); organisations
// likewise uses admin for its lookup because:
//  1. The "Public can view active organisations" policy only covers
//     status='active' AND verification_status='verified', which excludes
//     pending/suspended orgs that the admin/member still needs to reach.
//  2. Membership rows have no direct auth.uid() index, so the cross-org
//     lookup is most reliably done via service-role.

export type OrgRole = "admin" | "editor" | "viewer";

export interface OrgSession {
  organisationId: number;
  role: OrgRole;
  userId: string;
}

/**
 * Resolves the authenticated user's organisation from a Supabase Auth JWT.
 *
 * Checks:
 *  1. The user is the `admin_user_id` of an organisation → role = "admin".
 *  2. The user has an active membership row → role = member's role.
 *
 * Returns null if the user is not authenticated.
 * Throws a Response (401) if authenticated but not associated with any org.
 */
export async function requireOrgSession(): Promise<OrgSession> {
  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Response(JSON.stringify({ error: "Unauthorised" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Check if user is the admin of any organisation
  const { data: ownedOrg } = await admin
    .from("organisations")
    .select("id")
    .eq("admin_user_id", user.id)
    .maybeSingle();

  if (ownedOrg) {
    return { organisationId: ownedOrg.id, role: "admin", userId: user.id };
  }

  // Check for an active membership
  const { data: membership } = await admin
    .from("organisation_members")
    .select("organisation_id, role")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (membership) {
    return {
      organisationId: membership.organisation_id,
      role: membership.role as OrgRole,
      userId: user.id,
    };
  }

  throw new Response(JSON.stringify({ error: "No organisation account found" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Non-throwing variant — returns null if the user has no org session.
 * Useful in middleware or pages that render differently for org vs non-org users.
 */
export async function getOrgSession(): Promise<OrgSession | null> {
  try {
    return await requireOrgSession();
  } catch {
    return null;
  }
}
