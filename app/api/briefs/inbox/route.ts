import { NextRequest, NextResponse } from "next/server";

import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { maskBriefForProvider } from "@/lib/briefs/mask";
import { isBriefVisibleToProvider } from "@/lib/briefs/eligibility";
import { recordBriefReach } from "@/lib/briefs/activity";
import { logger } from "@/lib/logger";
import type { BriefRow } from "@/lib/briefs/types";

const log = logger("briefs:inbox");

/**
 * GET /api/briefs/inbox — returns the calling provider's brief inbox.
 *
 * Two buckets:
 *   - `available`: open accept-flow briefs the provider is eligible for
 *     (masked previews, no PII).
 *   - `accepted`: briefs already accepted by this provider, with full
 *     contact details.
 *
 * Eligibility heuristic (MVP):
 *   - brief.status = 'open' AND flow_type = 'accept' AND
 *     risk_review_status IN ('clear','approved') AND
 *     accepted_by_professional_id IS NULL.
 *   - Either: provider_preference = 'any'|'individual'|'multiple', OR
 *     provider is on an active expert team that matches target_team_id.
 *   - Direct-targeted briefs only show to the targeted entity.
 */
export async function GET(request: NextRequest) {
  try {
    if (!(await isAllowed("briefs_inbox", ipKey(request), { max: 60, refillPerSec: 1 }))) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }
    const advisorId = await requireAdvisorSession(request);
    if (!advisorId) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }

    const admin = createAdminClient();

    const { data: memberships } = await admin
      .from("expert_team_members")
      .select("team_id")
      .eq("professional_id", advisorId)
      .eq("status", "active");
    const teamIds = (memberships ?? []).map((m) => m.team_id as number);

    // Team names for the "accept as team" picker (AJ-9 — was bare "Team #<id>").
    let teams: { id: number; name: string }[] = [];
    if (teamIds.length > 0) {
      const { data: teamRows } = await admin
        .from("expert_teams")
        .select("id, name")
        .in("id", teamIds);
      teams = (teamRows ?? []).map((t) => ({
        id: t.id as number,
        name: (t.name as string) ?? `Team #${t.id}`,
      }));
    }

    const { data: advisor } = await admin
      .from("professionals")
      .select("type, firm_id")
      .eq("id", advisorId)
      .maybeSingle();

    // ── Available bucket ────────────────────────────────────────────
    const { data: openBriefs } = await admin
      .from("advisor_auctions")
      .select("*")
      .eq("flow_type", "accept")
      .eq("status", "open")
      .in("risk_review_status", ["clear", "approved"])
      .is("accepted_by_professional_id", null)
      .is("accepted_by_team_id", null)
      .order("created_at", { ascending: false })
      .limit(100);

    const visibilityCtx = {
      professionalId: advisorId,
      advisorType: (advisor?.type as string | null) ?? null,
      firmId: (advisor?.firm_id as number | null) ?? null,
      teamIds,
    };
    const available = (openBriefs ?? [])
      .filter((row) => isBriefVisibleToProvider(row as unknown as BriefRow, visibilityCtx))
      .map((row) => maskBriefForProvider(row as unknown as BriefRow));

    // Trust Centre: record that these briefs reached this adviser's inbox
    // (deduplicated insert-or-ignore; consumer tracker shows the count).
    void recordBriefReach(
      available.map((b) => b.id),
      advisorId,
    );

    // ── Accepted bucket ────────────────────────────────────────────
    const { data: acceptedRaw } = await admin
      .from("advisor_auctions")
      .select(
        "id, slug, job_title, brief_template, budget_band, location, tracker_status, accepted_at, contact_name, contact_email, contact_phone, accepted_by_team_id",
      )
      .eq("flow_type", "accept")
      .eq("accepted_by_professional_id", advisorId)
      .order("accepted_at", { ascending: false })
      .limit(50);

    return NextResponse.json({
      available,
      accepted: acceptedRaw ?? [],
      teamIds,
      teams,
    });
  } catch (err) {
    log.error("inbox error", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Failed to load inbox." }, { status: 500 });
  }
}
