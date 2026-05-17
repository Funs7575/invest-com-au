import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/require-admin";
import { ResolveDisputeRequest } from "@/lib/api-schemas";
import {
  DisputeError,
  loadRefundContext,
  setStatus,
} from "@/lib/disputes";
import { recordLedgerEntry } from "@/lib/advisor-credit-ledger";
import { awardCredits } from "@/lib/investor-referrals";
import { logger } from "@/lib/logger";

const log = logger("api:admin:disputes:resolve");

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const { id } = await ctx.params;
  const disputeId = Number(id);
  if (!Number.isFinite(disputeId)) {
    return NextResponse.json({ error: "Invalid dispute id." }, { status: 400 });
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = ResolveDisputeRequest.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid body." },
      { status: 400 },
    );
  }

  try {
    const { dispute, changed } = await setStatus({
      disputeId,
      status: parsed.data.status,
      resolutionNotes: parsed.data.resolution_notes ?? null,
      resolvedByUserId: guard.userId,
    });

    let refund: {
      proRefundCents: number;
      referrerCreditsAwarded: boolean;
    } | null = null;

    if (changed && parsed.data.status === "resolved_for_consumer") {
      refund = await applyRefundHook(disputeId);
    }

    log.info("Dispute resolved by admin", {
      disputeId,
      status: parsed.data.status,
      by: guard.email,
      refund,
    });

    return NextResponse.json({ dispute, refund });
  } catch (err) {
    if (err instanceof DisputeError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    log.error("resolve dispute failed", {
      disputeId,
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Failed to resolve dispute." },
      { status: 500 },
    );
  }
}

/**
 * Run the refund + referrer-payout side effect after a
 * 'resolved_for_consumer' verdict. Idempotent on the ledger triple
 * `(lead_dispute_refund, dispute_refund, <disputeId>)` so admin
 * re-clicking the same verdict doesn't double-refund.
 */
async function applyRefundHook(
  disputeId: number,
): Promise<{ proRefundCents: number; referrerCreditsAwarded: boolean }> {
  const ctx = await loadRefundContext(disputeId);
  if (!ctx) {
    log.warn("applyRefundHook: missing context", { disputeId });
    return { proRefundCents: 0, referrerCreditsAwarded: false };
  }

  let proRefundCents = 0;
  if (ctx.acceptedProfessionalId && ctx.leadSpendCents > 0) {
    try {
      const result = await recordLedgerEntry({
        professionalId: ctx.acceptedProfessionalId,
        amountCents: ctx.leadSpendCents,
        kind: "lead_dispute_refund",
        description: `Brief #${ctx.briefId} dispute resolved for consumer — lead-spend refunded`,
        referenceType: "dispute_refund",
        referenceId: String(disputeId),
        metadata: {
          brief_id: ctx.briefId,
          dispute_id: disputeId,
          original_lead_spend_ledger_id: ctx.leadSpendEntryId,
        },
      });
      proRefundCents = result.idempotent ? 0 : ctx.leadSpendCents;
    } catch (err) {
      log.error("applyRefundHook: ledger refund failed", {
        disputeId,
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }

  let referrerCreditsAwarded = false;
  if (ctx.consumerReferrerUserId) {
    try {
      await awardCredits({
        authUserId: ctx.consumerReferrerUserId,
        event: "brief_accepted",
        attributedUserId: ctx.consumerAuthUserId ?? null,
        attributedBriefId: ctx.briefId,
      });
      referrerCreditsAwarded = true;
    } catch (err) {
      log.warn("applyRefundHook: referrer credit award failed", {
        disputeId,
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { proRefundCents, referrerCreditsAwarded };
}
