import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { NextRequest } from "next/server";

// Resolves the authenticated advisor's professional_id from either:
// 1. Supabase Auth JWT — server.ts provides the JWT; admin is still used for
//    the professionals lookup to find both active and pending advisors via
//    the auth_user_id OR email OR pattern (anon-key "Public can view active"
//    policy only covers status='active', and advisor_sessions has no auth.uid()
//    linkage so a policy-based lookup is not available for legacy sessions).
// 2. Legacy advisor_session cookie — admin required (no auth.uid() on the table).
// Returns null if the caller is unauthenticated or the session has expired.
export async function requireAdvisorSession(
  request: NextRequest,
): Promise<number | null> {
  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: advisor } = await admin
      .from("professionals")
      .select("id")
      .or(`auth_user_id.eq.${user.id},email.eq.${user.email}`)
      .in("status", ["active", "pending"])
      .maybeSingle();
    if (advisor) return advisor.id;
  }

  const sessionToken = request.cookies.get("advisor_session")?.value;
  if (!sessionToken) return null;

  const { data: session } = await admin
    .from("advisor_sessions")
    .select("professional_id, expires_at")
    .eq("session_token", sessionToken)
    .single();

  if (!session || new Date(session.expires_at) < new Date()) return null;
  return session.professional_id;
}
