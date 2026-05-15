import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import {
  BriefMessageError,
  markRead,
  type MarkReadAsKind,
} from "@/lib/brief-messages";
import { isProfessionalOnTeam } from "@/lib/expert-teams";
import { logger } from "@/lib/logger";

const log = logger("api:briefs:messages:mark-read");

interface BriefMeta {
  id: number;
  contact_email: string | null;
  accepted_at: string | null;
  accepted_by_professional_id: number | null;
  accepted_by_team_id: number | null;
}

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  try {
    // Mark-read is invoked aggressively (every viewport-enter); a high
    // burst per IP is fine but cap it so a stuck client can't hammer DB.
    if (
      !(await isAllowed("brief_messages_mark_read", ipKey(request), {
        max: 60,
        refillPerSec: 1,
      }))
    ) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }

    const { slug } = await ctx.params;

    // Empty body is OK — we accept either no body or {}.
    // eslint-disable-next-line invest/no-unvalidated-req-json -- Empty/optional body. The mark-read endpoint takes no payload; only the slug + caller identity matter, both validated below.
    await request.json().catch(() => ({}));

    const admin = createAdminClient();
    const { data: briefRaw } = await admin
      .from("advisor_auctions")
      .select(
        "id, contact_email, accepted_at, accepted_by_professional_id, accepted_by_team_id",
      )
      .eq("slug", slug)
      .eq("flow_type", "accept")
      .maybeSingle();

    if (!briefRaw) {
      return NextResponse.json({ error: "Brief not found." }, { status: 404 });
    }
    const brief = briefRaw as BriefMeta;

    if (!brief.accepted_at) {
      // Nothing to mark — chat panel isn't open yet.
      return NextResponse.json({ updated: 0 });
    }

    const asKind = await resolveMarkReadKind(request, brief);
    if (!asKind) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }

    const updated = await markRead({ briefId: brief.id, asKind });
    return NextResponse.json({ updated });
  } catch (err) {
    if (err instanceof BriefMessageError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    log.error("mark-read failed", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Failed to mark read." }, { status: 500 });
  }
}

/**
 * Mark-read maps the caller to one of the two read-state columns
 * (`read_by_consumer_at` vs `read_by_pro_at`). Pros and team members
 * share the same `read_by_pro_at` column — the read state is one-per-side.
 */
async function resolveMarkReadKind(
  request: NextRequest,
  brief: BriefMeta,
): Promise<MarkReadAsKind | null> {
  const advisorId = await requireAdvisorSession(request);
  if (advisorId) {
    if (
      brief.accepted_by_professional_id !== null &&
      brief.accepted_by_professional_id === advisorId
    ) {
      return "pro";
    }
    if (brief.accepted_by_team_id !== null) {
      const onTeam = await isProfessionalOnTeam(
        brief.accepted_by_team_id,
        advisorId,
      );
      if (onTeam) return "pro";
    }
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user?.email && brief.contact_email) {
    if (user.email.toLowerCase() === brief.contact_email.toLowerCase()) {
      return "consumer";
    }
  }
  return null;
}
