import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { NextRequest } from "next/server";

// Resolves the authenticated startup founder's startup_profile id from either:
// 1. Supabase Auth JWT — server.ts provides the JWT; admin is used for the
//    startup_profiles lookup to find both active and draft founders via
//    owner_user_id. (startup_sessions has no auth.uid() linkage so a
//    policy-based lookup is unavailable for cookie sessions.)
// 2. startup_session cookie — admin required (deny-all-anon by design on
//    startup_sessions, matching advisor_sessions pattern per CLAUDE.md).
// Returns null if the caller is unauthenticated or the session has expired.
export async function requireStartupSession(
  request: NextRequest,
): Promise<string | null> {
  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: startup } = await admin
      .from("startup_profiles")
      .select("id")
      .eq("owner_user_id", user.id)
      .in("status", ["active", "draft"])
      .maybeSingle();
    if (startup) return startup.id;
  }

  const sessionToken = request.cookies.get("startup_session")?.value;
  if (!sessionToken) return null;

  const { data: session } = await admin
    .from("startup_sessions")
    .select("startup_id, expires_at")
    .eq("session_token", sessionToken)
    .single();

  if (!session || new Date(session.expires_at) < new Date()) return null;
  return session.startup_id;
}
