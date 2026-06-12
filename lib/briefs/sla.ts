/**
 * Brief response SLA — the Response Guarantee engine.
 *
 * Manual and standing-order accepts unlock the consumer's contact details
 * and start a clock: the provider owes a first in-platform message within
 * RESPONSE_SLA_HOURS. The sweep (run hourly from
 * /api/cron/brief-sla-sweep) enforces it:
 *
 *   - WARNING_AT_HOURS in, no first message → one warning email to the
 *     provider ("N hours left on this brief").
 *   - RESPONSE_SLA_HOURS in, still silent → clawback: refund the accept
 *     credits (standard tier only — success_only pros were never charged
 *     at accept), release the brief back to the open pool, re-broadcast
 *     to other eligible providers (excluding the offender), and notify
 *     both sides.
 *
 * "Engaged" exemptions — no warning/clawback when the provider has done
 * anything visible: sent a brief message, or moved the tracker off "new"
 * (they may have called the consumer directly). Open disputes also exempt
 * a brief: the dispute flow owns the refund decision there.
 *
 * Strike counts are derived from brief_sla_events (no counter column).
 * They are surfaced operationally for now; folding them into the public
 * Trust Score is a methodology change that needs founder sign-off (the
 * methodology page documents every input), so it is deliberately NOT
 * wired here.
 *
 * The whole engine is gated by the `response_guarantee` feature flag —
 * absent/disabled (the default) means the sweep is a no-op, so the cron
 * can ship ahead of the founder flipping the flag.
 */

// eslint-disable-next-line no-restricted-imports -- sweep runs from cron with no JWT and mutates accepted_by_* across providers + writes refund ledger entries; service-role legitimate per CLAUDE.md (cron path).
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { isFlagEnabled } from "@/lib/feature-flags";
import { recordLedgerEntry } from "@/lib/advisor-credit-ledger";
import { enqueueUserNotificationByEmail } from "@/lib/user-notifications";
import {
  sendProviderSlaWarning,
  sendProviderSlaClawback,
  sendConsumerSlaReopened,
} from "@/lib/marketplace-emails";
import { CENTS_PER_CREDIT } from "./credits";
import { notifyEligibleProviders } from "./notify";
import { runStandingOrdersForBrief } from "./standing-orders";
import { dispatchPushToAdvisor } from "@/lib/advisor-push";

import type { BriefRow } from "./types";

const log = logger("briefs:sla");

export const RESPONSE_GUARANTEE_FLAG = "response_guarantee";
export const RESPONSE_SLA_HOURS = 24;
export const WARNING_AT_HOURS = 18;

// ─── Pure classifier (unit-tested without a DB) ─────────────────────────

export type SlaState = "ok" | "warn" | "breach" | "exempt";

export interface SlaInput {
  acceptedAt: string;
  now: Date;
  /** Provider (or team) has sent at least one brief message since accept. */
  hasProviderMessage: boolean;
  /** advisor_auctions.tracker_status — anything but "new" counts as engaged. */
  trackerStatus: string;
  /** Brief has any dispute row — dispute flow owns refunds there. */
  hasDispute: boolean;
  alreadyWarned: boolean;
  alreadyClawed: boolean;
}

export function classifySlaState(input: SlaInput): SlaState {
  if (input.hasProviderMessage || input.trackerStatus !== "new" || input.hasDispute) {
    return "exempt";
  }
  if (input.alreadyClawed) return "exempt";
  const hoursIn =
    (input.now.getTime() - new Date(input.acceptedAt).getTime()) / 3_600_000;
  if (hoursIn >= RESPONSE_SLA_HOURS) return "breach";
  if (hoursIn >= WARNING_AT_HOURS && !input.alreadyWarned) return "warn";
  return "ok";
}

/** Clawback strikes for a provider over a rolling window (default 90d). */
export async function getSlaStrikes(
  professionalId: number,
  windowDays = 90,
): Promise<number> {
  const admin = createAdminClient();
  const since = new Date(Date.now() - windowDays * 86_400_000).toISOString();
  const { count } = await admin
    .from("brief_sla_events")
    .select("id", { count: "exact", head: true })
    .eq("professional_id", professionalId)
    .eq("event_type", "clawback")
    .gte("created_at", since);
  return count ?? 0;
}

// ─── Sweep ───────────────────────────────────────────────────────────────

export interface SlaSweepStats {
  scanned: number;
  warned: number;
  clawedBack: number;
  creditsRefunded: number;
}

export async function sweepBriefSla(
  now: Date = new Date(),
): Promise<SlaSweepStats> {
  const stats: SlaSweepStats = { scanned: 0, warned: 0, clawedBack: 0, creditsRefunded: 0 };

  const enabled = await isFlagEnabled(RESPONSE_GUARANTEE_FLAG, { segment: "advisor" });
  if (!enabled) return stats;

  const admin = createAdminClient();
  const warningCutoff = new Date(now.getTime() - WARNING_AT_HOURS * 3_600_000).toISOString();

  // Accepted briefs old enough to be in warning or breach territory, still
  // open and never moved off tracker_status='new' by the provider.
  const { data: candidates, error } = await admin
    .from("advisor_auctions")
    .select("*")
    .eq("flow_type", "accept")
    .eq("status", "open")
    .eq("tracker_status", "new")
    .not("accepted_by_professional_id", "is", null)
    .lt("accepted_at", warningCutoff)
    .order("accepted_at", { ascending: true })
    .limit(100);
  if (error) {
    log.warn("sla sweep scan failed", { err: error.message });
    return stats;
  }

  for (const row of candidates ?? []) {
    const brief = row as unknown as BriefRow;
    stats.scanned += 1;
    try {
      const outcome = await processBrief(brief, now);
      if (outcome === "warned") stats.warned += 1;
      if (typeof outcome === "number") {
        stats.clawedBack += 1;
        stats.creditsRefunded += outcome;
      }
    } catch (err) {
      log.error("sla sweep brief failed", {
        briefId: brief.id,
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return stats;
}

/** Returns "warned", credits refunded (number) on clawback, or null. */
async function processBrief(
  brief: BriefRow,
  now: Date,
): Promise<"warned" | number | null> {
  const admin = createAdminClient();
  const professionalId = brief.accepted_by_professional_id;
  if (!professionalId || !brief.accepted_at) return null;

  // Hydrate exemption signals.
  const [{ data: msg }, { data: dispute }, { data: events }] = await Promise.all([
    admin
      .from("brief_messages")
      .select("id")
      .eq("brief_id", brief.id)
      .in("sender_kind", ["professional", "team"])
      .gte("created_at", brief.accepted_at)
      .limit(1),
    admin.from("brief_disputes").select("id").eq("brief_id", brief.id).limit(1),
    admin
      .from("brief_sla_events")
      .select("event_type, professional_id")
      .eq("brief_id", brief.id),
  ]);

  const eventsForThisAccept = (events ?? []).filter(
    (e) => e.professional_id === professionalId,
  );
  const state = classifySlaState({
    acceptedAt: brief.accepted_at,
    now,
    hasProviderMessage: (msg ?? []).length > 0,
    trackerStatus: brief.tracker_status,
    hasDispute: (dispute ?? []).length > 0,
    alreadyWarned: eventsForThisAccept.some((e) => e.event_type === "warning"),
    alreadyClawed: eventsForThisAccept.some((e) => e.event_type === "clawback"),
  });

  if (state === "warn") {
    await admin.from("brief_sla_events").insert({
      brief_id: brief.id,
      professional_id: professionalId,
      team_id: brief.accepted_by_team_id,
      event_type: "warning",
      credits_refunded: 0,
    });
    const hoursLeft = Math.max(
      1,
      Math.round(
        RESPONSE_SLA_HOURS -
          (now.getTime() - new Date(brief.accepted_at as string).getTime()) / 3_600_000,
      ),
    );
    void notifyProvider(professionalId, (email, name) =>
      sendProviderSlaWarning({
        providerEmail: email,
        providerName: name,
        briefTitle: brief.job_title || "Match Request",
        briefSlug: brief.slug,
        briefId: brief.id,
        hoursLeft,
      }),
    );
    // Push the SLA countdown to the adviser's phone (Adviser Push Command
    // Centre). Flag-gated + preference-gated + fail-soft in the helper.
    void dispatchPushToAdvisor(professionalId, "sla_warning", {
      title: `${hoursLeft}h left to respond`,
      body: `Send a first message on "${brief.job_title || "your brief"}" or the credits are refunded and it reopens.`,
      url: `/briefs/${brief.slug}`,
      tag: `advisor-sla_warning-${brief.id}`,
    });
    return "warned";
  }

  if (state !== "breach") return null;

  // ── Clawback ────────────────────────────────────────────────────────
  const credits = brief.accept_credits_cost ?? 2;
  const chargedAtAccept =
    (brief as unknown as { pricing_tier_at_accept?: string | null })
      .pricing_tier_at_accept !== "success_only";
  let refunded = 0;

  if (chargedAtAccept) {
    // Idempotent on (kind, reference) — a crash after this but before the
    // release below re-runs safely next sweep. The reference is scoped to
    // brief + provider: a re-accepted brief that breaches again under a
    // different provider must produce a fresh refund, not dedupe against
    // the first offender's.
    await recordLedgerEntry({
      professionalId,
      amountCents: credits * CENTS_PER_CREDIT,
      kind: "sla_refund",
      description: `Brief #${brief.id} released — no response within ${RESPONSE_SLA_HOURS}h`,
      referenceType: "brief_sla_refund",
      referenceId: `${brief.id}:${professionalId}`,
      metadata: { team_id: brief.accepted_by_team_id ?? null, credits },
    });
    refunded = credits;
  }

  // Release the brief back to the pool — guarded on the offender still
  // holding it so a concurrent legitimate state change wins.
  const { data: released } = await admin
    .from("advisor_auctions")
    .update({
      accepted_by_professional_id: null,
      accepted_by_team_id: null,
      accepted_at: null,
      tracker_status: "new",
      pricing_tier_at_accept: null,
    })
    .eq("id", brief.id)
    .eq("accepted_by_professional_id", professionalId)
    .select("id")
    .maybeSingle();
  if (!released) {
    log.warn("sla clawback release lost race", { briefId: brief.id, professionalId });
    return null;
  }

  await admin.from("brief_sla_events").insert({
    brief_id: brief.id,
    professional_id: professionalId,
    team_id: brief.accepted_by_team_id,
    event_type: "clawback",
    credits_refunded: refunded,
  });
  await admin.from("brief_tracker_events").insert({
    brief_id: brief.id,
    event_type: "sla_clawback",
    actor_kind: "system",
    actor_id: "brief-sla-sweep",
    payload: {
      professional_id: professionalId,
      team_id: brief.accepted_by_team_id ?? null,
      credits_refunded: refunded,
      sla_hours: RESPONSE_SLA_HOURS,
    },
  });

  log.info("sla clawback executed", {
    briefId: brief.id,
    professionalId,
    creditsRefunded: refunded,
  });

  // ── Fan-outs (fire-and-forget) ─────────────────────────────────────
  void notifyProvider(professionalId, (email, name) =>
    sendProviderSlaClawback({
      providerEmail: email,
      providerName: name,
      briefTitle: brief.job_title || "Match Request",
      creditsRefunded: refunded,
      slaHours: RESPONSE_SLA_HOURS,
    }),
  );
  if (brief.contact_email) {
    void sendConsumerSlaReopened({
      consumerEmail: brief.contact_email,
      consumerName: brief.contact_name ?? "",
      briefTitle: brief.job_title || "Your Match Request",
      briefSlug: brief.slug,
      slaHours: RESPONSE_SLA_HOURS,
    }).catch((err) => {
      log.warn("sla consumer email failed", {
        briefId: brief.id,
        err: err instanceof Error ? err.message : String(err),
      });
    });
    void enqueueUserNotificationByEmail(brief.contact_email, {
      kind: "brief_reopened",
      title: "Your Match Request is open again",
      body: `The provider who accepted "${brief.job_title}" didn't respond within ${RESPONSE_SLA_HOURS} hours, so we've released it to other providers.`,
      href: `/briefs/${brief.slug}`,
    }).catch(() => {
      /* silent — inbox failure must never break the sweep */
    });
  }
  // Re-broadcast to other eligible providers + give standing orders a shot,
  // excluding the offender on both paths.
  const reopened: BriefRow = {
    ...brief,
    accepted_by_professional_id: null,
    accepted_by_team_id: null,
    accepted_at: null,
  };
  void notifyEligibleProviders(reopened, credits, {
    excludeProfessionalId: professionalId,
  }).catch((err) => {
    log.warn("sla re-broadcast failed", {
      briefId: brief.id,
      err: err instanceof Error ? err.message : String(err),
    });
  });
  void runStandingOrdersForBrief(brief.id, {
    excludeProfessionalId: professionalId,
  }).catch((err) => {
    log.warn("sla standing-orders rerun failed", {
      briefId: brief.id,
      err: err instanceof Error ? err.message : String(err),
    });
  });

  return refunded;
}

async function notifyProvider(
  professionalId: number,
  send: (email: string, name: string) => Promise<boolean>,
): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data: pro } = await admin
      .from("professionals")
      .select("name, email")
      .eq("id", professionalId)
      .maybeSingle();
    if (!pro?.email || typeof pro.email !== "string") return;
    await send(pro.email, (pro.name as string) || "Pro");
  } catch (err) {
    log.warn("sla provider notify failed", {
      professionalId,
      err: err instanceof Error ? err.message : String(err),
    });
  }
}
