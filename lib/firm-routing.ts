/**
 * Firm Lead-Ops routing engine (mega-session idea #13).
 *
 * Pure resolution of "which firm member should this incoming lead go to?"
 * given a firm's routing_policy + the firm's members + recent assignment
 * history + the firm's current open-lead load. NO I/O here — every input is
 * passed in by the caller (the lead-create path or the manager console),
 * which keeps the whole engine deterministic and unit-testable against
 * fixtures.
 *
 * Modes (advisor_firms.routing_policy.mode):
 *   - "manual"        — no auto-assignment. Today's behaviour: the lead stays
 *                       with whoever it was addressed to; an admin moves it by
 *                       hand. resolveAssignee returns { mode:"manual", … }.
 *   - "round_robin"   — least-recently-assigned eligible member wins (fairness
 *                       cursor from lead_assignments.assigned_at).
 *   - "load_balanced" — eligible member with the fewest currently-open leads
 *                       wins (from the firm-leads working set).
 *   - "specialty"     — map the lead's type → a specific member; if that
 *                       member is ineligible or unmapped, fall back to
 *                       round_robin among eligible members.
 *
 * Eligibility: a member is eligible when status is "active" AND
 * availability_status is NOT "closed" (vacation / not-taking-clients). A
 * "waitlist" member is still eligible — they are taking work, just slowly —
 * but is de-prioritised after "open" members. When NO member is eligible the
 * engine returns assigneeId:null with reason "all_unavailable" so the caller
 * can leave the lead unassigned and flag it in the console.
 *
 * Single-lead allocation principle: this resolves exactly ONE assignee. The
 * caller writes one lead_assignments audit row and points the lead at that
 * single professional_id.
 *
 * Dormancy: this module is pure and side-effect-free; it is only *invoked*
 * when the `firm_routing` flag is on (the caller gates). With the flag off,
 * or policy mode "manual", nothing here changes lead routing.
 */

/** Routing modes, in sync with the lead_assignments.assigned_by CHECK + the
 *  routing_policy.mode jsonb shape. */
export type RoutingMode =
  | "manual"
  | "round_robin"
  | "load_balanced"
  | "specialty";

export const ROUTING_MODES: readonly RoutingMode[] = [
  "manual",
  "round_robin",
  "load_balanced",
  "specialty",
] as const;

export function isRoutingMode(value: unknown): value is RoutingMode {
  return (
    typeof value === "string" &&
    (ROUTING_MODES as readonly string[]).includes(value)
  );
}

/** The persisted policy shape (advisor_firms.routing_policy jsonb). */
export interface RoutingPolicy {
  mode: RoutingMode;
  /**
   * Specialty mode only: maps a lead key (advisor `type` slug, or a generic
   * need slug) → the professional_id that should receive matching leads.
   */
  specialty_map?: Record<string, number>;
}

/** Availability self-status from professionals.availability_status. */
export type AvailabilityStatus = "open" | "waitlist" | "closed";

/** A firm member as the engine sees it. */
export interface RoutingMember {
  professionalId: number;
  /** professionals.status — only "active" members can receive leads. */
  status: string;
  /** professionals.availability_status. Defaults to "open" when absent. */
  availabilityStatus: AvailabilityStatus;
  /** professionals.type — used by specialty mode + as a fallback key. */
  type?: string | null;
  /** Display name (for console messaging only — not used in resolution). */
  name?: string | null;
}

/** The incoming lead, reduced to what routing needs. */
export interface RoutingLead {
  /** professional_leads.id, as the text ref written to lead_assignments. */
  leadRef: string;
  /**
   * The advisor type / need slug used by specialty mode. Usually the target
   * professional's `type`, or a quiz-derived need slug. Optional — specialty
   * mode falls back to round_robin when this is absent or unmapped.
   */
  leadType?: string | null;
}

/** Context the engine needs that isn't on the lead or members directly. */
export interface RoutingContext {
  /**
   * Most-recent assignment timestamp per professional_id, from
   * lead_assignments (ISO strings). Used by round_robin as the fairness
   * cursor. A member absent from this map has never been assigned and so
   * sorts first (most-stale).
   */
  lastAssignedAt?: Record<number, string | null>;
  /**
   * Count of currently-open (unresolved) leads per professional_id, from the
   * firm-leads working set. Used by load_balanced. A member absent from this
   * map is treated as 0 open leads.
   */
  openLeadCounts?: Record<number, number>;
}

/** Why the engine resolved (or didn't resolve) an assignee. */
export type RoutingReason =
  | "manual" // mode is manual — no auto-assignment performed
  | "round_robin"
  | "load_balanced"
  | "specialty"
  | "specialty_fallback_round_robin" // specialty had no eligible map hit
  | "no_members" // firm has no members to route to
  | "all_unavailable"; // every member is closed/inactive

export interface RoutingResolution {
  /** The chosen assignee, or null when none could be resolved. */
  assigneeId: number | null;
  /** The effective mechanism — what to write as lead_assignments.assigned_by
   *  when assigneeId is non-null (collapses fallbacks to their real mode). */
  assignedBy: RoutingMode;
  /** Machine-readable explanation (for logging + the console). */
  reason: RoutingReason;
}

/**
 * Parse an arbitrary jsonb value into a RoutingPolicy, defaulting to manual.
 * Tolerant: unknown / malformed input → { mode:"manual" } so a corrupt or
 * empty policy can never throw or accidentally enable auto-routing.
 */
export function parseRoutingPolicy(raw: unknown): RoutingPolicy {
  if (!raw || typeof raw !== "object") return { mode: "manual" };
  const obj = raw as Record<string, unknown>;
  const mode = isRoutingMode(obj.mode) ? obj.mode : "manual";

  let specialty_map: Record<string, number> | undefined;
  if (obj.specialty_map && typeof obj.specialty_map === "object") {
    const out: Record<string, number> = {};
    for (const [key, val] of Object.entries(
      obj.specialty_map as Record<string, unknown>,
    )) {
      // Coerce to a positive integer; drop anything else.
      const n = typeof val === "number" ? val : Number(val);
      if (Number.isInteger(n) && n > 0) out[key] = n;
    }
    if (Object.keys(out).length > 0) specialty_map = out;
  }

  return specialty_map ? { mode, specialty_map } : { mode };
}

/** A member is eligible if active and not closed for new clients. */
export function isEligible(member: RoutingMember): boolean {
  return member.status === "active" && member.availabilityStatus !== "closed";
}

/** Stable priority: "open" (0) before "waitlist" (1). Closed is filtered out
 *  before this is consulted. */
function availabilityRank(status: AvailabilityStatus): number {
  return status === "waitlist" ? 1 : 0;
}

/**
 * round_robin pick: among eligible members, choose the least-recently-assigned
 * (oldest lastAssignedAt; never-assigned counts as oldest). Ties broken by
 * availability rank (open before waitlist) then lowest professionalId for
 * determinism.
 */
function pickRoundRobin(
  eligible: RoutingMember[],
  ctx: RoutingContext,
): RoutingMember | null {
  if (eligible.length === 0) return null;
  const lastAssigned = ctx.lastAssignedAt ?? {};
  // Sort ascending by "staleness": members never assigned (undefined/null)
  // are the most stale and must come first.
  const sorted = [...eligible].sort((a, b) => {
    const ta = lastAssigned[a.professionalId];
    const tb = lastAssigned[b.professionalId];
    // null/undefined → -Infinity (most stale).
    const va = ta ? Date.parse(ta) : Number.NEGATIVE_INFINITY;
    const vb = tb ? Date.parse(tb) : Number.NEGATIVE_INFINITY;
    if (va !== vb) return va - vb;
    const ra = availabilityRank(a.availabilityStatus);
    const rb = availabilityRank(b.availabilityStatus);
    if (ra !== rb) return ra - rb;
    return a.professionalId - b.professionalId;
  });
  return sorted[0] ?? null;
}

/**
 * load_balanced pick: among eligible members, choose the one with the fewest
 * open leads. Ties broken by availability rank then lowest professionalId.
 */
function pickLoadBalanced(
  eligible: RoutingMember[],
  ctx: RoutingContext,
): RoutingMember | null {
  if (eligible.length === 0) return null;
  const counts = ctx.openLeadCounts ?? {};
  const sorted = [...eligible].sort((a, b) => {
    const ca = counts[a.professionalId] ?? 0;
    const cb = counts[b.professionalId] ?? 0;
    if (ca !== cb) return ca - cb;
    const ra = availabilityRank(a.availabilityStatus);
    const rb = availabilityRank(b.availabilityStatus);
    if (ra !== rb) return ra - rb;
    return a.professionalId - b.professionalId;
  });
  return sorted[0] ?? null;
}

/**
 * Resolve the single assignee for an incoming lead.
 *
 * The caller is responsible for:
 *   - gating on the `firm_routing` flag,
 *   - loading members + context (lastAssignedAt / openLeadCounts),
 *   - persisting the lead_assignments audit row + pointing the lead at the
 *     returned assigneeId.
 *
 * This function never throws and never mutates its inputs.
 */
export function resolveAssignee(
  policy: RoutingPolicy,
  lead: RoutingLead,
  members: RoutingMember[],
  ctx: RoutingContext = {},
): RoutingResolution {
  // Manual mode = today's behaviour: never auto-assign.
  if (policy.mode === "manual") {
    return { assigneeId: null, assignedBy: "manual", reason: "manual" };
  }

  if (members.length === 0) {
    return { assigneeId: null, assignedBy: policy.mode, reason: "no_members" };
  }

  const eligible = members.filter(isEligible);
  if (eligible.length === 0) {
    return {
      assigneeId: null,
      assignedBy: policy.mode,
      reason: "all_unavailable",
    };
  }

  if (policy.mode === "specialty") {
    const map = policy.specialty_map ?? {};
    const key = (lead.leadType ?? "").trim();
    const mappedId = key ? map[key] : undefined;
    if (mappedId !== undefined) {
      const target = eligible.find((m) => m.professionalId === mappedId);
      if (target) {
        return {
          assigneeId: target.professionalId,
          assignedBy: "specialty",
          reason: "specialty",
        };
      }
    }
    // Mapped member is ineligible (closed/inactive) or no mapping for this
    // lead type → fall back to round_robin among eligible members.
    const fallback = pickRoundRobin(eligible, ctx);
    return {
      assigneeId: fallback?.professionalId ?? null,
      assignedBy: "specialty",
      reason: "specialty_fallback_round_robin",
    };
  }

  if (policy.mode === "load_balanced") {
    const pick = pickLoadBalanced(eligible, ctx);
    return {
      assigneeId: pick?.professionalId ?? null,
      assignedBy: "load_balanced",
      reason: "load_balanced",
    };
  }

  // round_robin
  const pick = pickRoundRobin(eligible, ctx);
  return {
    assigneeId: pick?.professionalId ?? null,
    assignedBy: "round_robin",
    reason: "round_robin",
  };
}
