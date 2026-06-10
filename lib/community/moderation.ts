/**
 * Forum publish gate — wraps the shared `classifyText` classifier for the
 * community surface and maps its verdict onto the forum's three outcomes:
 *
 *   - publish: insert visible (is_removed=false), bump counters
 *   - hold:    insert hidden (is_removed=true) + open an auto-moderation
 *              row in forum_reports so the /admin/community queue sees it
 *   - reject:  400 to the author, nothing persisted
 *
 * Forum content was the one UGC surface that bypassed `classifyText`
 * entirely (reviews, switch stories, advisor articles and Q&A answers all
 * run it) — every thread and reply auto-published unscreened. This module
 * closes that gap.
 *
 * Operational dials (no deploy needed):
 *   - automation_kill_switches row `community_posting` → pauses all posting
 *   - classifier_config forum_moderation.hold_all = 1 → every submission
 *     is held for human review (raid/attack mode)
 */

import { classifyText } from "@/lib/text-moderation";
import { getThreshold, isFeatureDisabled } from "@/lib/admin/classifier-config";

export const COMMUNITY_POSTING_FEATURE = "community_posting";

export type ForumGateAction = "publish" | "hold" | "reject";

export interface ForumGateInput {
  kind: "thread" | "post";
  title?: string | null;
  body: string;
}

export interface ForumGateResult {
  action: ForumGateAction;
  riskScore: number;
  reasons: string[];
}

export const FORUM_DISABLED_MESSAGE =
  "Community posting is temporarily paused. Please try again later.";

export const FORUM_REJECT_MESSAGE =
  "Your post can't be published because it appears to breach our community guidelines (spam, scam language, or prohibited content). Edit it and try again — see /community/guidelines.";

export const FORUM_HOLD_MESSAGE =
  "Thanks — your post has been submitted and is awaiting a quick moderator review before it goes live. This usually takes a few hours.";

export async function isCommunityPostingDisabled(): Promise<boolean> {
  return isFeatureDisabled(COMMUNITY_POSTING_FEATURE);
}

export async function gateForumContent(
  input: ForumGateInput,
): Promise<ForumGateResult> {
  const result = classifyText({
    text: input.body,
    title: input.title ?? null,
    surface: input.kind === "thread" ? "forum_thread" : "forum_post",
  });

  if (result.verdict === "auto_reject") {
    return { action: "reject", riskScore: result.riskScore, reasons: result.reasons };
  }

  // Raid mode: hold everything regardless of classifier verdict.
  const holdAll = await getThreshold("forum_moderation", "hold_all", 0);
  if (result.verdict === "escalate" || holdAll >= 1) {
    const reasons =
      holdAll >= 1 && result.verdict !== "escalate"
        ? ["hold_all_active", ...result.reasons]
        : result.reasons;
    return { action: "hold", riskScore: result.riskScore, reasons };
  }

  return { action: "publish", riskScore: result.riskScore, reasons: result.reasons };
}

/**
 * Reason string stored on the auto-opened forum_reports row for held
 * content. The `auto_moderation:` prefix is how the admin queue tells a
 * classifier hold apart from a user report (column is capped at 500).
 */
export function autoModerationReason(reasons: string[]): string {
  return `auto_moderation:${reasons.join(",")}`.slice(0, 500);
}

export function isAutoModerationReason(reason: string | null): boolean {
  return reason != null && reason.startsWith("auto_moderation:");
}
