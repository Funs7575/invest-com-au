import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminEmails } from "@/lib/admin";
import { logger } from "@/lib/logger";

const log = logger("admin:automation:override");

/**
 * POST /api/admin/automation/override
 *
 * Admin override for classifier decisions. Dispatches to the
 * right handler based on `feature`. Every override writes
 * admin_overridden_at + admin_overridden_by to the target row
 * for audit.
 *
 * Body: { feature, rowId, targetVerdict, reason? }
 *
 * Feature dispatch table:
 *   lead_disputes       → flip dispute status (approve ↔ reject)
 *   listing_scam        → flip listing status
 *   text_moderation     → flip review status (broker/advisor reviews)
 *   advisor_applications → flip application status
 *   broker_data_changes → apply a queued change or revert an auto-applied one
 */
export async function POST(request: NextRequest) {
  // ── Auth ─────────────────────────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const adminEmails = getAdminEmails();
  if (!adminEmails.includes(user.email.toLowerCase())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // eslint-disable-next-line invest/no-unvalidated-req-json -- Pre-existing admin-only route validating each field via narrow string/number type guards inline; admin gate has already authenticated. Tracked for migration to withValidatedBody in a dedicated cleanup PR.
  const body = await request.json().catch(() => ({}));
  const feature = typeof body.feature === "string" ? body.feature : null;
  const rowId = typeof body.rowId === "number" ? body.rowId : null;
  const targetVerdict = typeof body.targetVerdict === "string" ? body.targetVerdict : null;
  const reason = typeof body.reason === "string" ? body.reason : null;

  if (!feature || !rowId || !targetVerdict) {
    return NextResponse.json(
      { error: "Missing feature / rowId / targetVerdict" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const nowIso = new Date().toISOString();
  const auditPatch = {
    admin_overridden_at: nowIso,
    admin_overridden_by: user.email,
  };

  let response: NextResponse;
  try {
    switch (feature) {
      case "lead_disputes":
        response = await overrideLeadDispute(admin, rowId, targetVerdict, reason, auditPatch, user.email);
        break;
      case "listing_scam":
        response = await overrideListing(admin, rowId, targetVerdict, auditPatch);
        break;
      case "text_moderation":
        response = await overrideReview(admin, rowId, targetVerdict, body.subSurface, auditPatch);
        break;
      case "advisor_applications":
        response = await overrideApplication(admin, rowId, targetVerdict, auditPatch, user.email);
        break;
      case "broker_data_changes":
        response = await overrideBrokerChange(admin, rowId, targetVerdict, auditPatch);
        break;
      default:
        return NextResponse.json({ error: `Unknown feature: ${feature}` }, { status: 400 });
    }
  } catch (err) {
    log.error("Override handler threw", {
      feature,
      rowId,
      targetVerdict,
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "override_failed" },
      { status: 500 },
    );
  }

  await admin.from("admin_audit_log").insert({
    action: "automation:override",
    entity_type: feature,
    entity_id: String(rowId),
    admin_email: user.email,
    details: { feature, targetVerdict, reason },
  }).then(({ error: logErr }) => {
    if (logErr) log.warn("admin_audit_log insert failed", { error: logErr.message });
  });

  return response;
}

// ─── Per-feature override handlers ──────────────────────────────────

type AdminClient = ReturnType<typeof createAdminClient>;

async function overrideLeadDispute(
  admin: AdminClient,
  disputeId: number,
  targetVerdict: string,
  reason: string | null,
  auditPatch: Record<string, string>,
  adminEmail: string,
) {
  if (targetVerdict !== "approved" && targetVerdict !== "rejected") {
    return NextResponse.json({ error: "targetVerdict must be approved or rejected" }, { status: 400 });
  }

  const { data: dispute } = await admin
    .from("lead_disputes")
    .select("id, lead_id, professional_id, status, refunded_cents")
    .eq("id", disputeId)
    .maybeSingle();

  if (!dispute) {
    return NextResponse.json({ error: "Dispute not found" }, { status: 404 });
  }

  // If flipping from rejected → approved, we need to actually refund
  // the advisor. If flipping approved → rejected, we need to debit
  // the refund back. These are money-movement operations — audit
  // them carefully.
  if (dispute.status === targetVerdict) {
    return NextResponse.json({ error: "Dispute already in that state" }, { status: 400 });
  }

  const { data: lead } = await admin
    .from("professional_leads")
    .select("id, bill_amount_cents")
    .eq("id", dispute.lead_id)
    .maybeSingle();
  const billAmount = lead?.bill_amount_cents || 0;

  // All credit movements go through the ledger so admin overrides are
  // sourced + idempotent + appear in the advisor's unified history.
  const { recordLedgerEntry } = await import("@/lib/advisor-credit-ledger");

  if (targetVerdict === "approved") {
    if (!dispute.refunded_cents && billAmount > 0) {
      await recordLedgerEntry({
        professionalId: dispute.professional_id,
        amountCents: billAmount,
        kind: "lead_dispute_refund",
        description: `Admin override — dispute #${disputeId} approved (lead #${dispute.lead_id})`,
        referenceType: "advisor_lead_disputes",
        referenceId: String(disputeId),
        expiresAt: null,
        createdBy: `admin:${adminEmail}`,
        metadata: { override_reason: reason, lead_id: dispute.lead_id },
      });
      await admin
        .from("professional_leads")
        .update({ billed: false, outcome: "refunded_dispute" })
        .eq("id", dispute.lead_id);
    }
    await admin
      .from("lead_disputes")
      .update({
        status: "approved",
        resolved_at: auditPatch.admin_overridden_at,
        refunded_cents: billAmount,
        admin_override_reason: reason,
        ...auditPatch,
      })
      .eq("id", disputeId);
  } else {
    // Reversing an approved → rejected. Claw back the prior refund via
    // an admin_adjustment ledger row (negative). The unique reference
    // namespace ("admin_override_clawback") avoids colliding with the
    // original lead_dispute_refund entry. If the advisor has spent the
    // credit in the meantime, the balance can go negative — the cache
    // update will reflect that and ops can manually settle.
    if ((dispute.refunded_cents || 0) > 0) {
      await recordLedgerEntry({
        professionalId: dispute.professional_id,
        amountCents: -(dispute.refunded_cents || 0),
        kind: "admin_adjustment",
        description: `Admin override — clawback of dispute #${disputeId} refund`,
        referenceType: "admin_override_clawback",
        referenceId: String(disputeId),
        expiresAt: null,
        createdBy: `admin:${adminEmail}`,
        metadata: { override_reason: reason, original_refund_cents: dispute.refunded_cents },
      });
    }
    await admin
      .from("lead_disputes")
      .update({
        status: "rejected",
        resolved_at: auditPatch.admin_overridden_at,
        refunded_cents: 0,
        admin_override_reason: reason,
        ...auditPatch,
      })
      .eq("id", disputeId);
  }

  log.info("Lead dispute overridden", {
    disputeId,
    targetVerdict,
    adminEmail,
    refundAmount: billAmount,
  });
  return NextResponse.json({ ok: true });
}

async function overrideListing(
  admin: AdminClient,
  listingId: number,
  targetVerdict: string,
  auditPatch: Record<string, string>,
) {
  if (targetVerdict !== "active" && targetVerdict !== "rejected" && targetVerdict !== "pending") {
    return NextResponse.json({ error: "targetVerdict must be active, rejected, or pending" }, { status: 400 });
  }
  await admin
    .from("investment_listings")
    .update({ status: targetVerdict, ...auditPatch })
    .eq("id", listingId);
  return NextResponse.json({ ok: true });
}

async function overrideReview(
  admin: AdminClient,
  reviewId: number,
  targetVerdict: string,
  subSurface: string | undefined,
  auditPatch: Record<string, string>,
) {
  if (targetVerdict !== "published" && targetVerdict !== "rejected" && targetVerdict !== "pending") {
    return NextResponse.json({ error: "targetVerdict must be published, rejected, or pending" }, { status: 400 });
  }

  const table = subSurface === "advisor_review" ? "professional_reviews" : "user_reviews";
  await admin
    .from(table)
    .update({ status: targetVerdict, ...auditPatch })
    .eq("id", reviewId);
  return NextResponse.json({ ok: true });
}

async function overrideApplication(
  admin: AdminClient,
  applicationId: number,
  targetVerdict: string,
  auditPatch: Record<string, string>,
  adminEmail: string,
) {
  if (targetVerdict !== "approved" && targetVerdict !== "rejected") {
    return NextResponse.json({ error: "targetVerdict must be approved or rejected" }, { status: 400 });
  }
  await admin
    .from("advisor_applications")
    .update({
      status: targetVerdict,
      reviewed_at: auditPatch.admin_overridden_at,
      reviewed_by: adminEmail,
      ...auditPatch,
    })
    .eq("id", applicationId);
  return NextResponse.json({ ok: true });
}

async function overrideBrokerChange(
  admin: AdminClient,
  changeId: number,
  targetVerdict: string,
  auditPatch: Record<string, string>,
) {
  if (targetVerdict !== "applied" && targetVerdict !== "reverted" && targetVerdict !== "rejected") {
    return NextResponse.json({ error: "targetVerdict must be applied, reverted, or rejected" }, { status: 400 });
  }
  // For v1 we just stamp the audit columns. Actually applying the
  // change (or reverting it) back to the broker row is handled by
  // the existing /admin/brokers flow.
  await admin
    .from("broker_data_changes")
    .update({ ...auditPatch, auto_applied_at: new Date().toISOString() })
    .eq("id", changeId);
  return NextResponse.json({ ok: true });
}
