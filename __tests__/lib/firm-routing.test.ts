import { describe, it, expect } from "vitest";
import {
  parseRoutingPolicy,
  isRoutingMode,
  isEligible,
  resolveAssignee,
  type RoutingMember,
  type RoutingPolicy,
} from "@/lib/firm-routing";

// ── Fixtures ────────────────────────────────────────────────────────────────

function member(
  id: number,
  overrides: Partial<RoutingMember> = {},
): RoutingMember {
  return {
    professionalId: id,
    status: "active",
    availabilityStatus: "open",
    type: "financial_planner",
    name: `Member ${id}`,
    ...overrides,
  };
}

const lead = (leadType?: string | null) => ({ leadRef: "100", leadType });

// ── parseRoutingPolicy ───────────────────────────────────────────────────────

describe("parseRoutingPolicy", () => {
  it("defaults to manual for empty / null / non-object input", () => {
    expect(parseRoutingPolicy(null)).toEqual({ mode: "manual" });
    expect(parseRoutingPolicy(undefined)).toEqual({ mode: "manual" });
    expect(parseRoutingPolicy({})).toEqual({ mode: "manual" });
    expect(parseRoutingPolicy("round_robin")).toEqual({ mode: "manual" });
    expect(parseRoutingPolicy(42)).toEqual({ mode: "manual" });
  });

  it("defaults an unknown mode to manual", () => {
    expect(parseRoutingPolicy({ mode: "magic" })).toEqual({ mode: "manual" });
  });

  it("reads a valid mode", () => {
    expect(parseRoutingPolicy({ mode: "round_robin" })).toEqual({
      mode: "round_robin",
    });
    expect(parseRoutingPolicy({ mode: "load_balanced" })).toEqual({
      mode: "load_balanced",
    });
  });

  it("parses a valid specialty_map, coercing string ids and dropping junk", () => {
    const policy = parseRoutingPolicy({
      mode: "specialty",
      specialty_map: {
        smsf_accountant: 5,
        tax_agent: "7", // coerced
        bad: "not-a-number", // dropped
        zero: 0, // dropped (not positive)
        neg: -3, // dropped
      },
    });
    expect(policy.mode).toBe("specialty");
    expect(policy.specialty_map).toEqual({ smsf_accountant: 5, tax_agent: 7 });
  });

  it("omits specialty_map when it has no valid entries", () => {
    const policy = parseRoutingPolicy({
      mode: "specialty",
      specialty_map: { bad: "x", zero: 0 },
    });
    expect(policy).toEqual({ mode: "specialty" });
  });
});

describe("isRoutingMode", () => {
  it("accepts known modes and rejects others", () => {
    expect(isRoutingMode("manual")).toBe(true);
    expect(isRoutingMode("round_robin")).toBe(true);
    expect(isRoutingMode("load_balanced")).toBe(true);
    expect(isRoutingMode("specialty")).toBe(true);
    expect(isRoutingMode("nope")).toBe(false);
    expect(isRoutingMode(3)).toBe(false);
    expect(isRoutingMode(null)).toBe(false);
  });
});

// ── isEligible ────────────────────────────────────────────────────────────────

describe("isEligible", () => {
  it("is true for active + open/waitlist", () => {
    expect(isEligible(member(1, { availabilityStatus: "open" }))).toBe(true);
    expect(isEligible(member(1, { availabilityStatus: "waitlist" }))).toBe(true);
  });
  it("is false for closed availability", () => {
    expect(isEligible(member(1, { availabilityStatus: "closed" }))).toBe(false);
  });
  it("is false for non-active status", () => {
    expect(isEligible(member(1, { status: "pending" }))).toBe(false);
    expect(isEligible(member(1, { status: "suspended" }))).toBe(false);
  });
});

// ── manual mode ───────────────────────────────────────────────────────────────

describe("resolveAssignee — manual", () => {
  it("never auto-assigns", () => {
    const res = resolveAssignee({ mode: "manual" }, lead(), [member(1), member(2)]);
    expect(res).toEqual({ assigneeId: null, assignedBy: "manual", reason: "manual" });
  });
});

// ── empty / all-unavailable ───────────────────────────────────────────────────

describe("resolveAssignee — degenerate cases", () => {
  it("returns no_members when the firm has no members", () => {
    const res = resolveAssignee({ mode: "round_robin" }, lead(), []);
    expect(res.assigneeId).toBeNull();
    expect(res.reason).toBe("no_members");
  });

  it("returns all_unavailable when every member is closed", () => {
    const members = [
      member(1, { availabilityStatus: "closed" }),
      member(2, { status: "pending" }),
    ];
    const res = resolveAssignee({ mode: "round_robin" }, lead(), members);
    expect(res.assigneeId).toBeNull();
    expect(res.reason).toBe("all_unavailable");
  });
});

// ── round_robin ───────────────────────────────────────────────────────────────

describe("resolveAssignee — round_robin", () => {
  const members = [member(1), member(2), member(3)];

  it("picks a never-assigned member first (most stale)", () => {
    const ctx = {
      lastAssignedAt: {
        1: "2026-06-01T00:00:00Z",
        2: "2026-06-02T00:00:00Z",
        // 3 never assigned
      },
    };
    const res = resolveAssignee({ mode: "round_robin" }, lead(), members, ctx);
    expect(res.assigneeId).toBe(3);
    expect(res.assignedBy).toBe("round_robin");
    expect(res.reason).toBe("round_robin");
  });

  it("picks the least-recently-assigned when all have history", () => {
    const ctx = {
      lastAssignedAt: {
        1: "2026-06-05T00:00:00Z",
        2: "2026-06-01T00:00:00Z", // oldest
        3: "2026-06-03T00:00:00Z",
      },
    };
    const res = resolveAssignee({ mode: "round_robin" }, lead(), members, ctx);
    expect(res.assigneeId).toBe(2);
  });

  it("skips closed members", () => {
    const m = [
      member(1, { availabilityStatus: "closed" }), // would be most stale but skipped
      member(2),
      member(3),
    ];
    const ctx = { lastAssignedAt: { 2: "2026-06-02T00:00:00Z", 3: "2026-06-01T00:00:00Z" } };
    const res = resolveAssignee({ mode: "round_robin" }, lead(), m, ctx);
    expect(res.assigneeId).toBe(3);
  });

  it("prefers open over waitlist when assignment recency ties", () => {
    const m = [
      member(1, { availabilityStatus: "waitlist" }),
      member(2, { availabilityStatus: "open" }),
    ];
    // Neither assigned → equal staleness; open (2) should win on availability rank.
    const res = resolveAssignee({ mode: "round_robin" }, lead(), m, {});
    expect(res.assigneeId).toBe(2);
  });

  it("breaks remaining ties by lowest professionalId (determinism)", () => {
    const m = [member(5), member(2), member(9)];
    const res = resolveAssignee({ mode: "round_robin" }, lead(), m, {});
    expect(res.assigneeId).toBe(2);
  });
});

// ── load_balanced ─────────────────────────────────────────────────────────────

describe("resolveAssignee — load_balanced", () => {
  const members = [member(1), member(2), member(3)];

  it("picks the member with the fewest open leads", () => {
    const ctx = { openLeadCounts: { 1: 5, 2: 2, 3: 8 } };
    const res = resolveAssignee({ mode: "load_balanced" }, lead(), members, ctx);
    expect(res.assigneeId).toBe(2);
    expect(res.assignedBy).toBe("load_balanced");
  });

  it("treats a missing count as zero (so unknown members are preferred)", () => {
    const ctx = { openLeadCounts: { 1: 5, 2: 3 } }; // 3 absent → 0
    const res = resolveAssignee({ mode: "load_balanced" }, lead(), members, ctx);
    expect(res.assigneeId).toBe(3);
  });

  it("skips closed members even if they have the fewest leads", () => {
    const m = [
      member(1, { availabilityStatus: "closed" }),
      member(2),
      member(3),
    ];
    const ctx = { openLeadCounts: { 1: 0, 2: 4, 3: 2 } };
    const res = resolveAssignee({ mode: "load_balanced" }, lead(), m, ctx);
    expect(res.assigneeId).toBe(3);
  });

  it("breaks count ties by availability rank then id", () => {
    const m = [
      member(1, { availabilityStatus: "waitlist" }),
      member(2, { availabilityStatus: "open" }),
    ];
    const ctx = { openLeadCounts: { 1: 2, 2: 2 } };
    const res = resolveAssignee({ mode: "load_balanced" }, lead(), m, ctx);
    expect(res.assigneeId).toBe(2);
  });
});

// ── specialty ─────────────────────────────────────────────────────────────────

describe("resolveAssignee — specialty", () => {
  const policy: RoutingPolicy = {
    mode: "specialty",
    specialty_map: { smsf_accountant: 2, tax_agent: 3 },
  };
  const members = [
    member(1, { type: "financial_planner" }),
    member(2, { type: "smsf_accountant" }),
    member(3, { type: "tax_agent" }),
  ];

  it("routes a mapped lead type to its specialist", () => {
    const res = resolveAssignee(policy, lead("smsf_accountant"), members);
    expect(res.assigneeId).toBe(2);
    expect(res.assignedBy).toBe("specialty");
    expect(res.reason).toBe("specialty");
  });

  it("falls back to round_robin when the lead type is unmapped", () => {
    const ctx = { lastAssignedAt: { 1: "2026-06-05T00:00:00Z", 2: "2026-06-02T00:00:00Z", 3: "2026-06-09T00:00:00Z" } };
    const res = resolveAssignee(policy, lead("crypto_advisor"), members, ctx);
    // round_robin among eligible → least recently assigned is member 2.
    expect(res.assigneeId).toBe(2);
    expect(res.assignedBy).toBe("specialty");
    expect(res.reason).toBe("specialty_fallback_round_robin");
  });

  it("falls back to round_robin when the mapped specialist is on leave", () => {
    const m = [
      member(1, { type: "financial_planner" }),
      member(2, { type: "smsf_accountant", availabilityStatus: "closed" }),
      member(3, { type: "tax_agent" }),
    ];
    const res = resolveAssignee(policy, lead("smsf_accountant"), m, {});
    // smsf specialist (2) is closed → fallback round_robin among {1,3}.
    expect(res.assigneeId).not.toBe(2);
    expect([1, 3]).toContain(res.assigneeId);
    expect(res.reason).toBe("specialty_fallback_round_robin");
  });

  it("falls back when there is no specialty_map at all", () => {
    const res = resolveAssignee({ mode: "specialty" }, lead("smsf_accountant"), members, {});
    expect(res.reason).toBe("specialty_fallback_round_robin");
    expect(res.assigneeId).not.toBeNull();
  });

  it("returns all_unavailable when no member is eligible (even mapped)", () => {
    const m = [
      member(2, { type: "smsf_accountant", availabilityStatus: "closed" }),
    ];
    const res = resolveAssignee(policy, lead("smsf_accountant"), m, {});
    expect(res.assigneeId).toBeNull();
    expect(res.reason).toBe("all_unavailable");
  });
});

// ── single-lead allocation ────────────────────────────────────────────────────

describe("single-lead allocation principle", () => {
  it("always resolves exactly one assignee (never an array)", () => {
    const res = resolveAssignee(
      { mode: "round_robin" },
      lead(),
      [member(1), member(2), member(3)],
      {},
    );
    expect(typeof res.assigneeId).toBe("number");
  });
});
