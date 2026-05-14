import { NextRequest, NextResponse } from "next/server";

import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { maskBriefForProvider } from "@/lib/briefs/mask";
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

    const available = (openBriefs ?? [])
      .filter((row) => {
        const b = row as unknown as BriefRow;
        // Direct-targeted briefs: only the matched provider sees them.
        if (b.routing_mode === "direct") {
          if (b.target_professional_id === advisorId) return true;
          if (b.target_team_id && teamIds.includes(b.target_team_id)) return true;
          if (b.target_firm_id && advisor?.firm_id === b.target_firm_id) return true;
          return false;
        }
        // Preference filter.
        if (b.provider_preference === "expert_team" && teamIds.length === 0) return false;
        if (b.provider_preference === "firm" && !advisor?.firm_id) return false;
        if (b.provider_preference === "individual") {
          // Anyone with a professional row counts.
        }
        // Optional advisor_types filter — only if the brief specified types
        // and the professional has a type assigned.
        if (
          b.advisor_types &&
          b.advisor_types.length > 0 &&
          advisor?.type &&
          !b.advisor_types.includes(advisor.type)
        ) {
          return false;
        }
        return true;
      })
      .map((row) => maskBriefForProvider(row as unknown as BriefRow));

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
    });
  } catch (err) {
    log.error("inbox error", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Failed to load inbox." }, { status: 500 });
  }
}
