import { NextRequest, NextResponse } from "next/server";

import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { getPlanById } from "@/lib/getmatched/action-plans";
import { getEnabledIntents } from "@/lib/getmatched/intents";
import { logger } from "@/lib/logger";

const log = logger("get-matched:plan:by-id");

/**
 * Pre-fill endpoint for `/briefs/new?plan_id=…`. Returns the plan + the
 * recommended brief template + a human-readable description string so the
 * BriefForm can paint the contact step without re-running the full
 * resolver client-side.
 *
 * Anonymous-allowed (token would be ideal but we don't have the token on
 * the redirect path; access is rate-limited and only exposes information
 * the user already saw on their own action plan screen).
 */
export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    if (
      !(await isAllowed("gm_plan_by_id", ipKey(request), {
        max: 30,
        refillPerSec: 0.5,
      }))
    ) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }
    const { id } = await ctx.params;
    const planId = Number(id);
    if (!Number.isFinite(planId)) {
      return NextResponse.json({ error: "Invalid plan id." }, { status: 400 });
    }
    const plan = await getPlanById(planId);
    if (!plan) {
      return NextResponse.json({ error: "Plan not found." }, { status: 404 });
    }
    const intents = await getEnabledIntents();
    const recommended =
      intents.find((i) => i.slug === plan.intent_slug)?.default_brief_template ??
      null;

    const description = buildDescription(plan);
    return NextResponse.json({
      plan,
      recommended_brief_template: recommended,
      description,
    });
  } catch (err) {
    log.error("plan by-id error", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Failed to load plan." }, { status: 500 });
  }
}

function buildDescription(plan: {
  goal: string | null;
  budget_band: string | null;
  timeline: string | null;
  location_state: string | null;
  country_of_residence: string | null;
  help_needed: string[];
  answers: Record<string, unknown>;
}): string {
  const parts: string[] = [];
  if (plan.goal) parts.push(`Goal: ${plan.goal}`);
  if (plan.budget_band) parts.push(`Budget band: ${plan.budget_band}`);
  if (plan.timeline) parts.push(`Timeline: ${plan.timeline}`);
  if (plan.location_state) parts.push(`Location: ${plan.location_state}`);
  if (plan.country_of_residence)
    parts.push(`Country: ${plan.country_of_residence}`);
  if (plan.help_needed && plan.help_needed.length > 0) {
    parts.push(`Help needed: ${plan.help_needed.join(", ")}`);
  }
  const notes = plan.answers?.notes;
  if (typeof notes === "string" && notes.trim()) {
    parts.push(`Notes: ${notes.trim()}`);
  }
  return parts.length > 0
    ? parts.join("\n")
    : "Investor brief from Get Matched action plan.";
}
