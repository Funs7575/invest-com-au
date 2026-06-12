/**
 * Firm Lead-Ops routing runtime — the thin I/O layer that wraps the pure
 * engine in lib/firm-routing.ts.
 *
 * Responsibilities:
 *   - Load the firm + routing_policy for a target professional.
 *   - Load the firm's members + the routing context (last-assigned cursor,
 *     open-lead counts).
 *   - Call the pure engine.
 *   - Persist the lead_assignments audit row.
 *
 * The whole entry point (`autoAssignLead`) is a NO-OP unless:
 *   - the `firm_routing` feature flag is on (fail-closed), AND
 *   - the target professional belongs to a firm whose routing_policy.mode is
 *     not "manual".
 *
 * Manual mode + flag-off both leave the lead exactly where the existing
 * lead-create path put it (addressed to the original professional), so this
 * is purely additive — it can never break today's behaviour.
 *
 * The admin client is required: advisor_firms.routing_policy, sibling
 * professionals' availability, and the firm-wide lead_assignments history are
 * not readable under the own-row / anon RLS policies, and legacy advisor
 * sessions carry no auth.uid() linkage to professionals. lead_assignments is
 * service_role-only by design (see the migration). Callers are server-side
 * lead-intake paths that have already authenticated the request.
 */

// eslint-disable-next-line no-restricted-imports -- Firm-wide routing needs cross-member reads (advisor_firms.routing_policy, sibling availability, firm lead_assignments history) that own-row/anon RLS policies don't expose; lead_assignments is service_role-only by design. Invoked only from server-side lead-intake paths gated on the firm_routing flag.
import { createAdminClient } from "@/lib/supabase/admin";
import { isFlagEnabled } from "@/lib/feature-flags";
import { logger } from "@/lib/logger";
import {
  parseRoutingPolicy,
  resolveAssignee,
  type AvailabilityStatus,
  type RoutingMember,
  type RoutingMode,
} from "@/lib/firm-routing";

const log = logger("firm-routing");

/** The feature flag gating ALL auto-routing + the routing console. */
export const FIRM_ROUTING_FLAG = "firm_routing";

type AdminClient = ReturnType<typeof createAdminClient>;

/** Open-lead statuses, for the load_balanced working set. A lead is "open"
 *  until it is converted/lost/spam. */
const OPEN_LEAD_STATUSES = ["new", "sent", "contacted"] as const;

export interface AutoAssignInput {
  /** professional_leads.id of the freshly-created lead. */
  leadId: number;
  /** The professional the lead was originally addressed to. */
  targetProfessionalId: number;
  /** The advisor type / need slug for specialty routing (optional). */
  leadType?: string | null;
  /** Test seam: inject an admin client. Production constructs its own. */
  client?: AdminClient;
}

export interface AutoAssignOutcome {
  /** Whether the lead was reassigned to a different professional. */
  reassigned: boolean;
  /** The professional the lead is now assigned to (unchanged if no-op). */
  assigneeId: number;
  /** The mechanism, when an assignment row was written. */
  assignedBy: RoutingMode | null;
  /** Machine reason (mirrors the engine), or a runtime skip reason. */
  reason: string;
}

interface FirmRow {
  id: number;
  routing_policy: unknown;
}

interface MemberRow {
  id: number;
  status: string | null;
  availability_status: string | null;
  type: string | null;
  name: string | null;
}

function normaliseAvailability(value: string | null): AvailabilityStatus {
  return value === "waitlist" || value === "closed" ? value : "open";
}

/**
 * Auto-assign a freshly-created firm lead per the firm's routing policy.
 *
 * Returns an outcome describing what happened. Never throws — any failure
 * leaves the lead with its original assignee and is logged. The caller treats
 * this as best-effort: lead delivery must not depend on routing succeeding.
 */
export async function autoAssignLead(
  input: AutoAssignInput,
): Promise<AutoAssignOutcome> {
  const noop = (reason: string): AutoAssignOutcome => ({
    reassigned: false,
    assigneeId: input.targetProfessionalId,
    assignedBy: null,
    reason,
  });

  try {
    // Fail-closed flag gate. With firm_routing off, this is a pure no-op.
    if (!(await isFlagEnabled(FIRM_ROUTING_FLAG, { segment: "advisor" }))) {
      return noop("flag_off");
    }

    const admin = input.client ?? createAdminClient();

    // Resolve the target professional's firm.
    const { data: target } = await admin
      .from("professionals")
      .select("id, firm_id, type")
      .eq("id", input.targetProfessionalId)
      .maybeSingle();

    const firmId = (target as { firm_id: number | null } | null)?.firm_id;
    if (!firmId) return noop("not_in_firm");

    // Load the firm's routing policy.
    const { data: firmData } = await admin
      .from("advisor_firms")
      .select("id, routing_policy")
      .eq("id", firmId)
      .maybeSingle();
    const firm = firmData as FirmRow | null;
    if (!firm) return noop("firm_not_found");

    const policy = parseRoutingPolicy(firm.routing_policy);
    if (policy.mode === "manual") return noop("manual_mode");

    // Load the firm's members.
    const { data: memberData } = await admin
      .from("professionals")
      .select("id, status, availability_status, type, name")
      .eq("firm_id", firmId);
    const memberRows = (memberData ?? []) as MemberRow[];
    const members: RoutingMember[] = memberRows.map((m) => ({
      professionalId: m.id,
      status: m.status ?? "inactive",
      availabilityStatus: normaliseAvailability(m.availability_status),
      type: m.type,
      name: m.name,
    }));

    // Load routing context for the mode in play (only what's needed).
    const memberIds = members.map((m) => m.professionalId);
    const ctx: {
      lastAssignedAt?: Record<number, string | null>;
      openLeadCounts?: Record<number, number>;
    } = {};

    if (policy.mode === "round_robin" || policy.mode === "specialty") {
      ctx.lastAssignedAt = await loadLastAssignedAt(admin, firmId, memberIds);
    }
    if (policy.mode === "load_balanced") {
      ctx.openLeadCounts = await loadOpenLeadCounts(admin, memberIds);
    }

    // Specialty key: caller-supplied leadType wins; else the original
    // target professional's own type (the natural specialty signal).
    const targetType =
      (target as { type: string | null } | null)?.type ?? null;
    const leadType = input.leadType ?? targetType;

    const resolution = resolveAssignee(
      policy,
      { leadRef: String(input.leadId), leadType },
      members,
      ctx,
    );

    // No eligible assignee — leave the lead unassigned-to-firm (it stays with
    // the original target) and surface in logs / console.
    if (resolution.assigneeId === null) {
      log.warn("firm routing left lead unassigned", {
        firmId,
        leadId: input.leadId,
        reason: resolution.reason,
      });
      return noop(resolution.reason);
    }

    const assigneeId = resolution.assigneeId;
    const reassigned = assigneeId !== input.targetProfessionalId;

    // Point the lead at the resolved assignee (only if it changed).
    if (reassigned) {
      const { error: updateErr } = await admin
        .from("professional_leads")
        .update({ professional_id: assigneeId })
        .eq("id", input.leadId);
      if (updateErr) {
        log.error("firm routing lead update failed", {
          firmId,
          leadId: input.leadId,
          assigneeId,
          error: updateErr.message,
        });
        return noop("update_failed");
      }
    }

    // Write the audit row regardless of whether the assignee changed — the
    // audit trail records that the routing engine made a decision. For a
    // first auto-assignment reassigned_from is null; when the engine moved
    // the lead off the original target, record that as reassigned_from.
    await writeAssignment(admin, {
      firmId,
      leadRef: String(input.leadId),
      professionalId: assigneeId,
      assignedBy: resolution.assignedBy,
      reassignedFrom: reassigned ? input.targetProfessionalId : null,
    });

    log.info("firm routing assigned lead", {
      firmId,
      leadId: input.leadId,
      assigneeId,
      assignedBy: resolution.assignedBy,
      reassigned,
    });

    return {
      reassigned,
      assigneeId,
      assignedBy: resolution.assignedBy,
      reason: resolution.reason,
    };
  } catch (err) {
    log.error("firm routing unexpected error", {
      leadId: input.leadId,
      err: err instanceof Error ? err.message : String(err),
    });
    return noop("error");
  }
}

/** Most-recent assignment timestamp per member (round_robin fairness cursor). */
async function loadLastAssignedAt(
  admin: AdminClient,
  firmId: number,
  memberIds: number[],
): Promise<Record<number, string | null>> {
  const out: Record<number, string | null> = {};
  if (memberIds.length === 0) return out;
  // Newest-first; first row seen per professional_id is its latest assignment.
  const { data } = await admin
    .from("lead_assignments")
    .select("professional_id, assigned_at")
    .eq("firm_id", firmId)
    .in("professional_id", memberIds)
    .order("assigned_at", { ascending: false });
  for (const row of (data ?? []) as {
    professional_id: number;
    assigned_at: string;
  }[]) {
    if (!(row.professional_id in out)) {
      out[row.professional_id] = row.assigned_at;
    }
  }
  return out;
}

/** Count of currently-open leads per member (load_balanced working set). */
async function loadOpenLeadCounts(
  admin: AdminClient,
  memberIds: number[],
): Promise<Record<number, number>> {
  const out: Record<number, number> = {};
  if (memberIds.length === 0) return out;
  const { data } = await admin
    .from("professional_leads")
    .select("professional_id")
    .in("professional_id", memberIds)
    .in("status", OPEN_LEAD_STATUSES as unknown as string[]);
  for (const row of (data ?? []) as { professional_id: number }[]) {
    out[row.professional_id] = (out[row.professional_id] ?? 0) + 1;
  }
  return out;
}

export interface WriteAssignmentInput {
  firmId: number;
  leadRef: string;
  professionalId: number;
  assignedBy: RoutingMode;
  reassignedFrom: number | null;
}

/**
 * Insert a lead_assignments audit row. Best-effort: a failure is logged but
 * never thrown — the lead has already been (re)assigned, and a missing audit
 * row must not break lead delivery or a manual reassignment response.
 */
export async function writeAssignment(
  admin: AdminClient,
  input: WriteAssignmentInput,
): Promise<void> {
  const { error } = await admin.from("lead_assignments").insert({
    firm_id: input.firmId,
    lead_ref: input.leadRef,
    professional_id: input.professionalId,
    assigned_by: input.assignedBy,
    reassigned_from: input.reassignedFrom,
  } as Record<string, unknown>);
  if (error) {
    log.warn("lead_assignments insert failed", {
      firmId: input.firmId,
      leadRef: input.leadRef,
      error: error.message,
    });
  }
}
