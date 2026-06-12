import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { resolveEligibleProviders } from "@/lib/briefs/routing";
import { runStandingOrdersForBrief } from "@/lib/briefs/standing-orders";
import { assignBriefToPool } from "@/lib/briefs/demand-pools";
import { sendProviderNewMatchRequest } from "@/lib/marketplace-emails";
import { sendEmail } from "@/lib/resend";
import { SITE_URL } from "@/lib/seo";
import type { BriefRow } from "@/lib/briefs/types";
import { enqueueUserNotificationByEmail } from "@/lib/user-notifications";

const log = logger("admin:briefs:risk");

const Body = z.object({
  action: z.enum(["approve", "reject"]),
  note: z.string().max(2000).optional(),
});

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const { id } = await ctx.params;
  const briefId = Number(id);
  if (!Number.isFinite(briefId)) {
    return NextResponse.json({ error: "Invalid brief id." }, { status: 400 });
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = Body.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid body." },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const resolvedAt = new Date().toISOString();
  const updates: Record<string, unknown> =
    parsed.data.action === "approve"
      ? {
          risk_review_status: "approved",
          risk_review_resolved_at: resolvedAt,
          risk_review_decision_reason: parsed.data.note ?? null,
        }
      : {
          risk_review_status: "rejected",
          status: "closed",
          risk_review_resolved_at: resolvedAt,
          risk_review_decision_reason: parsed.data.note ?? null,
        };

  // Load the full brief row so we can fan-out notifications below.
  const { data: brief } = await admin
    .from("advisor_auctions")
    .update(updates)
    .eq("id", briefId)
    .select("*")
    .maybeSingle();

  await admin.from("brief_tracker_events").insert({
    brief_id: briefId,
    event_type: parsed.data.action === "approve" ? "risk_approved" : "risk_rejected",
    actor_kind: "admin",
    actor_id: guard.email,
    payload: { note: parsed.data.note ?? null },
  });

  log.info("Brief risk review actioned", {
    briefId,
    action: parsed.data.action,
    by: guard.email,
  });

  // ── Fan-out notifications (fire-and-forget) ──
  if (brief) {
    if (parsed.data.action === "approve") {
      // Now that the brief is cleared, fan-out to eligible providers and
      // tell the consumer their request is live.
      void notifyOnApproval(brief as BriefRow);
      // Standing orders may instant-accept the newly approved brief.
      // Flag-gated + capped inside the engine; never blocks the response.
      void runStandingOrdersForBrief(briefId).catch((err) => {
        log.warn("runStandingOrdersForBrief failed", {
          briefId,
          err: err instanceof Error ? err.message : String(err),
        });
      });
      // Group Briefs clustering — same approve hook point. Opted-in briefs
      // held for review join their demand pool once cleared. Flag-gated +
      // fail-soft; no-op otherwise. Never blocks the response.
      void assignBriefToPool(briefId).catch((err) => {
        log.warn("assignBriefToPool failed", {
          briefId,
          err: err instanceof Error ? err.message : String(err),
        });
      });
    } else {
      void notifyOnRejection(brief as BriefRow, parsed.data.note ?? null);
    }
  }

  return NextResponse.json({ success: true });
}

// ─── Notification helpers ──────────────────────────────────────────────

async function notifyOnApproval(brief: BriefRow): Promise<void> {
  try {
    // Fan-out to eligible providers same as the create path.
    const eligible = await resolveEligibleProviders(brief);
    const admin = createAdminClient();

    const individualIds = eligible
      .filter((p) => p.kind === "individual" || p.kind === "firm")
      .map((p) => p.id);
    const teamIds = eligible
      .filter((p) => p.kind === "expert_team")
      .map((p) => p.id);
    const targetIds = new Set<number>(individualIds);
    if (teamIds.length > 0) {
      const { data: tm } = await admin
        .from("expert_team_members")
        .select("professional_id")
        .in("team_id", teamIds)
        .eq("status", "active");
      for (const m of tm ?? []) {
        if (m.professional_id) targetIds.add(m.professional_id as number);
      }
    }
    if (targetIds.size > 0) {
      const { data: pros } = await admin
        .from("professionals")
        .select("id, name, email, accepts_briefs, accepts_new_clients")
        .in("id", Array.from(targetIds))
        .eq("status", "active");
      for (const p of (pros ?? []).slice(0, 20)) {
        if (
          typeof p.email !== "string" ||
          !p.email.includes("@") ||
          p.accepts_briefs === false ||
          p.accepts_new_clients === false
        )
          continue;
        void sendProviderNewMatchRequest({
          providerEmail: p.email as string,
          providerName: (p.name as string) || "Pro",
          briefTitle: brief.job_title || "Match Request",
          briefSlug: brief.slug,
          acceptCreditsCost: brief.accept_credits_cost ?? 2,
          briefBudgetBand: brief.budget_band,
          briefLocation: brief.location,
        });
      }
    }

    // Tell the consumer their brief is now live.
    if (brief.contact_email) {
      const trackerUrl = `${SITE_URL}/briefs/${brief.slug}`;
      void sendEmail({
        from: "Invest.com.au <hello@invest.com.au>",
        to: brief.contact_email,
        subject: `Your Match Request is live — ${brief.job_title}`,
        html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#334155;padding:24px">
          <h2 style="color:#0f172a;margin:0 0 8px 0">Your Match Request is now live</h2>
          <p style="font-size:14px">After a quick safety check, your request is now visible to verified Australian pros. The first to accept will be in touch — usually within 1-2 business days.</p>
          <p style="margin:16px 0"><a href="${trackerUrl}" style="display:inline-block;padding:10px 24px;background:#f59e0b;color:#0f172a;text-decoration:none;border-radius:6px;font-weight:600">View Quote Status</a></p>
          <p style="font-size:11px;color:#94a3b8;margin-top:20px">General information only — not personal advice.</p>
        </div>`,
      });

      // In-app inbox (C1 / mm06): drop a row alongside the email.
      void enqueueUserNotificationByEmail(brief.contact_email, {
        kind: "generic",
        title: "Your Match Request is live",
        body: `Re: ${brief.job_title ?? "Match Request"}. Verified pros can now see it.`,
        href: `/briefs/${brief.slug}`,
      });
    }
  } catch (err) {
    log.warn("notifyOnApproval threw", {
      briefId: brief.id,
      err: err instanceof Error ? err.message : String(err),
    });
  }
}

async function notifyOnRejection(brief: BriefRow, reason: string | null): Promise<void> {
  try {
    if (!brief.contact_email) return;
    const reasonLine = reason
      ? `<p style="font-size:13px;color:#475569"><strong>Reason:</strong> ${reason}</p>`
      : "";
    void sendEmail({
      from: "Invest.com.au <hello@invest.com.au>",
      to: brief.contact_email,
      subject: `Update on your Match Request — ${brief.job_title}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#334155;padding:24px">
        <h2 style="color:#0f172a;margin:0 0 8px 0">Your Match Request couldn't be sent</h2>
        <p style="font-size:14px">After our safety check we weren't able to route your request to verified pros. This is usually because something in the wording suggested a topic outside of what Australian-licensed pros can help with at this stage.</p>
        ${reasonLine}
        <p style="font-size:14px">You can rebuild a Match Request anytime — usually with a small wording change, the routing works.</p>
        <p style="margin:16px 0"><a href="${SITE_URL}/get-matched" style="display:inline-block;padding:10px 24px;background:#f59e0b;color:#0f172a;text-decoration:none;border-radius:6px;font-weight:600">Start a new request</a></p>
        <p style="font-size:11px;color:#94a3b8;margin-top:20px">General information only — not personal advice.</p>
      </div>`,
    });

    // In-app inbox (C1 / mm06): rejection notice alongside the email.
    void enqueueUserNotificationByEmail(brief.contact_email, {
      kind: "generic",
      title: "Your Match Request needs a small rewording",
      body: reason
        ? `Reason: ${reason}`
        : "Our safety check flagged the wording. Try rebuilding the request.",
      href: `/get-matched`,
    });
  } catch (err) {
    log.warn("notifyOnRejection threw", {
      briefId: brief.id,
      err: err instanceof Error ? err.message : String(err),
    });
  }
}
