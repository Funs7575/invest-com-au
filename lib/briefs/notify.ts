/**
 * Brief notification fan-outs — shared by the brief-creation route,
 * the manual accept route, the standing-orders auto-accept engine and
 * the SLA clawback sweep, so every path that opens or claims a brief
 * notifies the same way.
 *
 * Both helpers are defensive: any sub-step that fails (routing tables
 * missing, email send errors, missing emails) is logged and swallowed.
 * Callers fire-and-forget — these must never block an API response.
 */

// eslint-disable-next-line no-restricted-imports -- cross-user fan-out (professionals / expert_teams hydration for notification targets); service-role legitimate per CLAUDE.md, mirrors the routing engine it feeds from.
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { resolveEligibleProviders } from "./routing";
import {
  sendProviderNewMatchRequest,
  sendConsumerProviderAccepted,
} from "@/lib/marketplace-emails";
import { enqueueUserNotificationByEmail } from "@/lib/user-notifications";
import { dispatchPushToAdvisor } from "@/lib/advisor-push";

import type { BriefRow } from "./types";

const log = logger("briefs:notify");

// ─── Provider fan-out (N1) ──────────────────────────────────────────────
// Resolves up to 20 eligible providers for a brief via the routing engine,
// hydrates their email + name, and fan-outs new-match-request emails.

export async function notifyEligibleProviders(
  brief: BriefRow,
  creditsCost: number,
  opts: { excludeProfessionalId?: number | null } = {},
): Promise<void> {
  try {
    const eligible = await resolveEligibleProviders(brief);
    if (eligible.length === 0) return;

    const admin = createAdminClient();

    // Hydrate professionals (individual + firm representatives ride on
    // professionals too). Expert teams resolve to team_id; we'll fan-out
    // to all team members.
    const individualIds = eligible
      .filter((p) => p.kind === "individual" || p.kind === "firm")
      .map((p) => p.id);
    const teamIds = eligible
      .filter((p) => p.kind === "expert_team")
      .map((p) => p.id);

    const targetIds = new Set<number>(individualIds);
    if (teamIds.length > 0) {
      const { data: teamMembers } = await admin
        .from("expert_team_members")
        .select("professional_id")
        .in("team_id", teamIds)
        .eq("status", "active");
      for (const m of teamMembers ?? []) {
        if (m.professional_id) targetIds.add(m.professional_id as number);
      }
    }

    if (opts.excludeProfessionalId) targetIds.delete(opts.excludeProfessionalId);
    if (targetIds.size === 0) return;

    const { data: professionals } = await admin
      .from("professionals")
      .select("id, name, email, accepts_briefs, accepts_new_clients")
      .in("id", Array.from(targetIds))
      .eq("status", "active");

    const sendable = (professionals ?? []).filter(
      (p) =>
        typeof p.email === "string" &&
        p.email.includes("@") &&
        // accepts_new_clients gates the individual; accepts_briefs (column
        // added by PR #821) gates marketplace participation. Both must
        // be true to receive notifications.
        p.accepts_new_clients !== false &&
        p.accepts_briefs !== false,
    );

    // Hard cap fan-out — 20 emails per brief keeps spam complaints tiny.
    for (const p of sendable.slice(0, 20)) {
      void sendProviderNewMatchRequest({
        providerEmail: p.email as string,
        providerName: (p.name as string) || "Pro",
        briefTitle: brief.job_title || "New Match Request",
        briefSlug: brief.slug,
        acceptCreditsCost: creditsCost,
        briefBudgetBand: brief.budget_band,
        briefLocation: brief.location,
      });

      // Push the same fan-out to the adviser's phone (Adviser Push Command
      // Centre). Flag-gated + preference-gated + fail-soft inside the helper —
      // a no-op when `advisor_push` is off, the adviser hasn't subscribed, or
      // they've muted "new matching brief". Deep-links into the briefs inbox.
      if (typeof p.id === "number") {
        void dispatchPushToAdvisor(p.id, "new_brief", {
          title: "New matching brief",
          body: brief.job_title
            ? `${brief.job_title}${brief.location ? ` · ${brief.location}` : ""}`
            : "A new brief matches your profile — accept it first.",
          url: "/advisor-portal/briefs",
          tag: `advisor-new_brief-${brief.id}`,
        });
      }
    }
  } catch (err) {
    log.warn("notifyEligibleProviders threw", {
      briefId: brief.id,
      err: err instanceof Error ? err.message : String(err),
    });
  }
}

// ─── Consumer acceptance notification (N1 / C1) ─────────────────────────

export async function notifyConsumerOfAcceptance(input: {
  consumerEmail: string;
  consumerName: string;
  briefTitle: string;
  briefSlug: string;
  /** Enables reply-by-email into the brief chat on the consumer email. */
  briefId?: number;
  professionalId: number;
  teamId: number | null;
}): Promise<void> {
  const admin = createAdminClient();

  // Look up provider name. Team route uses the team name; individual /
  // firm route uses the professional name.
  let providerName = "A verified pro";
  let providerKind: "individual" | "firm" | "expert_team" = "individual";

  if (input.teamId) {
    const { data: team } = await admin
      .from("expert_teams")
      .select("name")
      .eq("id", input.teamId)
      .maybeSingle();
    if (team?.name) providerName = team.name as string;
    providerKind = "expert_team";
  } else {
    const { data: pro } = await admin
      .from("professionals")
      .select("name, firm_id")
      .eq("id", input.professionalId)
      .maybeSingle();
    if (pro?.name) providerName = pro.name as string;
    providerKind = pro?.firm_id ? "firm" : "individual";
  }

  await sendConsumerProviderAccepted({
    consumerEmail: input.consumerEmail,
    consumerName: input.consumerName,
    briefTitle: input.briefTitle,
    briefSlug: input.briefSlug,
    briefId: input.briefId,
    providerName,
    providerKind,
  });

  // ── In-app inbox (C1 / mm06) ─────────────────────────────────────
  // Drop a `brief_accepted` row in the consumer's notification inbox
  // alongside the email so users without inbox-monitoring habits still
  // see the news on next visit. Anonymous-brief flows have a contact
  // email that doesn't resolve to an auth.users row — the helper
  // returns `false` in that case and we silently no-op.
  try {
    await enqueueUserNotificationByEmail(input.consumerEmail, {
      kind: "brief_accepted",
      title: `${providerName} accepted your Match Request`,
      body: `Re: ${input.briefTitle}. Your contact details have been shared with the pro.`,
      href: `/briefs/${input.briefSlug}`,
    });
  } catch {
    /* silent — inbox failure must never break the accept path */
  }
}
