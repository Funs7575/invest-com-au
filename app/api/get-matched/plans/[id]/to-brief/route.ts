import { NextRequest, NextResponse } from "next/server";

import { PlanToBriefRequest } from "@/lib/api-schemas";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidEmail, isDisposableEmail } from "@/lib/validate-email";
import {
  getPlanById,
  linkBriefToPlan,
  updatePlan,
} from "@/lib/getmatched/action-plans";
import { getEnabledIntents } from "@/lib/getmatched/intents";
import { resolveActionPlan } from "@/lib/getmatched/engine";
import { scanBrief } from "@/lib/briefs/risk-flags";
import { getAcceptCost } from "@/lib/briefs/credits";
import { logEvent } from "@/lib/getmatched/events";
import { logger } from "@/lib/logger";

const log = logger("get-matched:plan:to-brief");

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    if (
      !(await isAllowed("gm_to_brief", ipKey(request), { max: 10, refillPerSec: 0.1 }))
    ) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }
    const { id } = await ctx.params;
    const planId = Number(id);
    if (!Number.isFinite(planId)) {
      return NextResponse.json({ error: "Invalid plan id." }, { status: 400 });
    }

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }
    const parsed = PlanToBriefRequest.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid body." },
        { status: 400 },
      );
    }

    if (
      !isValidEmail(parsed.data.contact_email) ||
      isDisposableEmail(parsed.data.contact_email)
    ) {
      return NextResponse.json(
        { error: "Please use a real email address." },
        { status: 400 },
      );
    }

    const plan = await getPlanById(planId);
    if (!plan) {
      return NextResponse.json({ error: "Plan not found." }, { status: 404 });
    }

    // Re-run the resolver so the brief is created from the latest answers
    // (the plan may have been updated since the user last saw the result).
    const intents = await getEnabledIntents();
    const resolved = await resolveActionPlan({
      answers: plan.answers,
      intents,
    });

    const template =
      resolved.recommendedBriefTemplate ??
      (plan.intent_slug
        ? intents.find((i) => i.slug === plan.intent_slug)?.default_brief_template
        : null) ??
      "general";

    const title = plan.goal ?? resolved.template.headline ?? "Investor brief";
    const briefDescription = buildDescription(plan);
    const risk = await scanBrief([title, briefDescription].join(" "));
    if (risk.severity === "block") {
      return NextResponse.json(
        {
          error:
            "We can't accept briefs containing this kind of content. Please contact our team if you believe this is a mistake.",
        },
        { status: 400 },
      );
    }

    const providerKind =
      resolved.route === "expert_team"
        ? "expert_team"
        : resolved.route === "firm"
          ? "firm"
          : "individual";
    const credits = await getAcceptCost({
      briefTemplate: template,
      providerKind,
    });

    const admin = createAdminClient();
    const slug = `${slugify(title)}-${Date.now().toString(36)}`;
    const endsAt = new Date(Date.now() + 30 * 86_400_000).toISOString();

    const insertRow: Record<string, unknown> = {
      flow_type: "accept",
      source: "public_brief",
      is_public: false,
      slug,
      job_title: title,
      job_description: briefDescription,
      budget_band: plan.budget_band ?? "not_sure",
      advisor_types: [],
      location: plan.location_state ?? "NSW",
      contact_name: parsed.data.contact_name.trim(),
      contact_email: parsed.data.contact_email.toLowerCase().trim(),
      contact_phone: parsed.data.contact_phone?.trim() || null,
      status: "open",
      ends_at: endsAt,
      brief_template: template,
      brief_payload: plan.answers,
      provider_preference:
        parsed.data.provider_preference ??
        (resolved.route === "expert_team"
          ? "expert_team"
          : resolved.route === "firm"
            ? "firm"
            : resolved.route === "individual"
              ? "individual"
              : "any"),
      routing_mode: parsed.data.routing_mode,
      accept_credits_cost: credits,
      tracker_status: "new",
      risk_flags: risk.flags,
      risk_review_status: risk.reviewStatus,
      linked_action_plan_id: plan.id,
    };

    const { data: brief, error } = await admin
      .from("advisor_auctions")
      .insert(insertRow)
      .select("id, slug")
      .single();
    if (error || !brief) {
      log.error("plan->brief insert failed", { error: error?.message });
      return NextResponse.json({ error: "Failed to create brief." }, { status: 500 });
    }

    await admin.from("brief_tracker_events").insert({
      brief_id: brief.id,
      event_type: "created",
      actor_kind: "user",
      actor_id: parsed.data.contact_email.toLowerCase().trim(),
      payload: {
        from_plan_id: plan.id,
        brief_template: template,
        risk_flags: risk.flags,
        risk_severity: risk.severity,
        credits_cost: credits,
      },
    });
    if (risk.flags.length > 0) {
      await admin.from("brief_tracker_events").insert({
        brief_id: brief.id,
        event_type: "risk_flagged",
        actor_kind: "system",
        payload: { flags: risk.flags, severity: risk.severity },
      });
    }

    await linkBriefToPlan(plan.id, brief.id as number);

    await updatePlan({
      id: plan.id,
      email: parsed.data.contact_email.toLowerCase().trim(),
    });

    void logEvent({
      sessionId: plan.session_id,
      authUserId: plan.auth_user_id,
      eventType: "brief_submitted",
      payload: { plan_id: plan.id, brief_id: brief.id },
    });

    return NextResponse.json({
      success: true,
      brief_id: brief.id,
      brief_slug: brief.slug,
      risk_review_status: risk.reviewStatus,
    });
  } catch (err) {
    log.error("plan->brief error", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Failed to create brief." }, { status: 500 });
  }
}

function buildDescription(plan: ReturnType<typeof Object>): string {
  // Compose a human description from the answer payload so brief cards
  // render meaningfully. `plan.answers` is a record of slug→value.
  const p = plan as {
    goal?: string | null;
    answers?: Record<string, unknown>;
    budget_band?: string | null;
    timeline?: string | null;
    help_needed?: string[] | null;
    country_of_residence?: string | null;
    location_state?: string | null;
  };
  const parts: string[] = [];
  if (p.goal) parts.push(`Goal: ${p.goal}`);
  if (p.budget_band) parts.push(`Budget: ${formatBand(p.budget_band)}`);
  if (p.timeline) parts.push(`Timeline: ${formatTimeline(p.timeline)}`);
  if (p.location_state) parts.push(`Location: ${p.location_state}`);
  if (p.country_of_residence) parts.push(`Country: ${p.country_of_residence}`);
  if (p.help_needed && p.help_needed.length > 0) {
    parts.push(`Help needed: ${p.help_needed.join(", ")}`);
  }
  const notes = (p.answers as Record<string, unknown> | undefined)?.notes;
  if (typeof notes === "string" && notes.trim()) {
    parts.push(`Notes: ${notes.trim()}`);
  }
  return parts.length > 0
    ? parts.join("\n")
    : "Investor brief created from Get Matched action plan.";
}

function formatBand(band: string): string {
  return band.replace(/_/g, "–").replace("plus", "+");
}

function formatTimeline(value: string): string {
  return value.replace(/_/g, " ");
}
