import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { logger } from "@/lib/logger";
import { maskBriefForProvider } from "@/lib/briefs/mask";
import { getAcceptCost } from "@/lib/briefs/credits";
import { recordBriefView } from "@/lib/briefs/activity";
import { enqueueUserNotificationByEmail } from "@/lib/user-notifications";
import type { BriefRow, ProviderKind } from "@/lib/briefs/types";

const log = logger("briefs:preview");

function providerKindForPref(p: string | null): ProviderKind {
  if (p === "firm") return "firm";
  if (p === "expert_team") return "expert_team";
  return "individual";
}

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  try {
    if (!(await isAllowed("briefs_preview", ipKey(request), { max: 60, refillPerSec: 1 }))) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }
    const advisorId = await requireAdvisorSession(request);
    if (!advisorId) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }
    const { slug } = await ctx.params;
    const admin = createAdminClient();
    const { data } = await admin
      .from("advisor_auctions")
      .select("*")
      .eq("slug", slug)
      .eq("flow_type", "accept")
      .maybeSingle();
    if (!data) {
      return NextResponse.json({ error: "Brief not found." }, { status: 404 });
    }
    const brief = data as unknown as BriefRow;

    // If risk-held, providers can't preview the contents — show a stub.
    if (
      brief.risk_review_status !== "clear" &&
      brief.risk_review_status !== "approved"
    ) {
      return NextResponse.json({
        masked: true,
        held_for_review: true,
        slug: brief.slug,
        status: brief.status,
      });
    }

    const masked = maskBriefForProvider(brief);

    // If a provider preference was set but cost wasn't yet locked in,
    // surface the live cost for the calling provider's kind. The
    // accept_credits_cost stamped on the row remains the contract.
    if (masked.accept_credits_cost == null && masked.brief_template) {
      masked.accept_credits_cost = await getAcceptCost({
        briefTemplate: masked.brief_template,
        providerKind: providerKindForPref(masked.provider_preference),
      });
    }

    // Trust Centre: record the detail view; the FIRST distinct adviser
    // view drops a one-time "an adviser viewed your brief" note in the
    // consumer's in-app inbox. Fire-and-forget — never blocks the preview.
    void recordBriefView(brief.id, advisorId)
      .then(({ firstViewOfBrief }) => {
        if (!firstViewOfBrief || !brief.contact_email) return;
        return enqueueUserNotificationByEmail(brief.contact_email, {
          kind: "brief_viewed",
          title: "An adviser viewed your Match Request",
          body: `Re: ${brief.job_title || "your request"}. Advisers are looking — you'll be notified the moment one accepts.`,
          href: `/briefs/${brief.slug}`,
        });
      })
      .catch((err) => {
        log.warn("brief view tracking failed", {
          briefId: brief.id,
          err: err instanceof Error ? err.message : String(err),
        });
      });

    return NextResponse.json({ masked: true, brief: masked });
  } catch (err) {
    log.error("preview error", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Failed to load brief." }, { status: 500 });
  }
}
