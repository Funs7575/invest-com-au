import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { logger } from "@/lib/logger";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminEmails } from "@/lib/admin";
import { getOrCreateLink } from "@/lib/pro-affiliate/links";

const log = logger("pro-affiliate:links-api");

const CreateLinkRequest = z.object({
  pro_slug: z.string().min(1).max(120),
  pro_kind: z.enum(["professional", "team"]),
});

/**
 * POST /api/pro-affiliate/links — admin or the pro themself (acting on
 * their own slug) creates / fetches their share link. Idempotent.
 */
async function handle(
  request: NextRequest,
  body: z.infer<typeof CreateLinkRequest>,
): Promise<NextResponse> {
  if (!(await isAllowed("pro_affiliate_links", ipKey(request), {
    max: 20,
    refillPerSec: 0.2,
  }))) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  // ── Authorise ─────────────────────────────────────────────────────────
  // 1. Admin: any admin can mint a link for any pro.
  // 2. Pro: can only mint a link for their own slug. For pro_kind='team'
  //    they must be an active member of that team.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAdmin =
    !!user?.email && getAdminEmails().includes(user.email.toLowerCase());

  let authorised = isAdmin;

  if (!authorised) {
    const advisorId = await requireAdvisorSession(request);
    if (!advisorId) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }
    const admin = createAdminClient();
    if (body.pro_kind === "professional") {
      const { data: pro } = await admin
        .from("professionals")
        .select("id")
        .eq("slug", body.pro_slug)
        .eq("id", advisorId)
        .maybeSingle();
      authorised = !!pro;
    } else {
      const { data: membership } = await admin
        .from("expert_team_members")
        .select("id, expert_teams!inner(slug)")
        .eq("professional_id", advisorId)
        .eq("status", "active")
        .eq("expert_teams.slug", body.pro_slug)
        .maybeSingle();
      authorised = !!membership;
    }
  }

  if (!authorised) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const link = await getOrCreateLink({
    proSlug: body.pro_slug,
    proKind: body.pro_kind,
  });
  if (!link) {
    log.error("getOrCreateLink returned null", {
      proSlug: body.pro_slug,
      proKind: body.pro_kind,
    });
    return NextResponse.json(
      { error: "Could not create affiliate link." },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, link });
}

export const POST = withValidatedBody(CreateLinkRequest, handle);
