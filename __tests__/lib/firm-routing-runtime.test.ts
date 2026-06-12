import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const { mockIsFlagEnabled } = vi.hoisted(() => ({
  mockIsFlagEnabled: vi.fn<() => Promise<boolean>>().mockResolvedValue(true),
}));
vi.mock("@/lib/feature-flags", () => ({
  isFlagEnabled: (..._: unknown[]) => mockIsFlagEnabled(),
}));

// The admin client mock is configured per-test via `tableHandlers`.
const { state } = vi.hoisted(() => ({
  state: {
    handlers: {} as Record<string, () => unknown>,
    inserts: [] as { table: string; row: Record<string, unknown> }[],
    updates: [] as { table: string; payload: Record<string, unknown> }[],
  },
}));

function makeAdmin() {
  return {
    from: vi.fn((table: string) => {
      const handler = state.handlers[table];
      const base = handler ? handler() : {};
      return base;
    }),
  };
}

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => makeAdmin()),
}));

import { autoAssignLead } from "@/lib/firm-routing-runtime";

// ── Builders ────────────────────────────────────────────────────────────────

/** A select(...).eq(...).maybeSingle() chain resolving to `data`. */
function single(data: unknown) {
  return () => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data }),
  });
}

/** A select(...).eq(...) chain resolving to `data` (list). */
function list(data: unknown[]) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    then: (resolve: (v: { data: unknown[] }) => unknown) => resolve({ data }),
  };
  return () => chain;
}

/** An update(...).eq() that records the payload and resolves ok. */
function updateRecorder(table: string, error: { message: string } | null = null) {
  return () => ({
    update: vi.fn((payload: Record<string, unknown>) => {
      state.updates.push({ table, payload });
      return { eq: vi.fn().mockResolvedValue({ error }) };
    }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  state.handlers = {};
  state.inserts = [];
  state.updates = [];
  mockIsFlagEnabled.mockResolvedValue(true);
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe("autoAssignLead — dormancy", () => {
  it("is a no-op when the firm_routing flag is off (no DB reads)", async () => {
    mockIsFlagEnabled.mockResolvedValue(false);
    const res = await autoAssignLead({ leadId: 1, targetProfessionalId: 10 });
    expect(res).toEqual({
      reassigned: false,
      assigneeId: 10,
      assignedBy: null,
      reason: "flag_off",
    });
    expect(state.inserts).toHaveLength(0);
    expect(state.updates).toHaveLength(0);
  });

  it("is a no-op when the target advisor is not in a firm", async () => {
    state.handlers["professionals"] = single({ id: 10, firm_id: null, type: "tax_agent" });
    const res = await autoAssignLead({ leadId: 1, targetProfessionalId: 10 });
    expect(res.reason).toBe("not_in_firm");
    expect(res.reassigned).toBe(false);
    expect(state.inserts).toHaveLength(0);
  });

  it("is a no-op when the firm policy is manual", async () => {
    let profCall = 0;
    state.handlers["professionals"] = () => {
      profCall++;
      // first call: target lookup
      return single({ id: 10, firm_id: 99, type: "tax_agent" })();
    };
    state.handlers["advisor_firms"] = single({ id: 99, routing_policy: { mode: "manual" } });
    const res = await autoAssignLead({ leadId: 1, targetProfessionalId: 10 });
    expect(res.reason).toBe("manual_mode");
    expect(state.inserts).toHaveLength(0);
    expect(profCall).toBe(1);
  });
});

describe("autoAssignLead — round_robin assignment", () => {
  function wireFirm(members: unknown[], lastAssigned: unknown[]) {
    let profCall = 0;
    state.handlers["professionals"] = () => {
      profCall++;
      if (profCall === 1) {
        // target lookup
        return single({ id: 10, firm_id: 99, type: "tax_agent" })();
      }
      // members list
      return list(members)();
    };
    state.handlers["advisor_firms"] = single({
      id: 99,
      routing_policy: { mode: "round_robin" },
    });
    state.handlers["lead_assignments"] = () => {
      // Two distinct uses: read history (select+eq+in+order → then) and
      // insert audit row. Return an object that supports both.
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        then: (resolve: (v: { data: unknown[] }) => unknown) => resolve({ data: lastAssigned }),
        insert: vi.fn((row: Record<string, unknown>) => {
          state.inserts.push({ table: "lead_assignments", row });
          return Promise.resolve({ error: null });
        }),
      };
    };
    state.handlers["professional_leads"] = updateRecorder("professional_leads");
  }

  it("reassigns to the least-recently-assigned member and writes an audit row", async () => {
    wireFirm(
      [
        { id: 10, status: "active", availability_status: "open", type: "tax_agent", name: "A" },
        { id: 11, status: "active", availability_status: "open", type: "tax_agent", name: "B" },
      ],
      [
        { professional_id: 10, assigned_at: "2026-06-10T00:00:00Z" },
        { professional_id: 11, assigned_at: "2026-06-01T00:00:00Z" }, // staler → wins
      ],
    );

    const res = await autoAssignLead({ leadId: 500, targetProfessionalId: 10 });
    expect(res.assigneeId).toBe(11);
    expect(res.reassigned).toBe(true);
    expect(res.assignedBy).toBe("round_robin");

    // Lead pointed at the new assignee.
    const leadUpdate = state.updates.find((u) => u.table === "professional_leads");
    expect(leadUpdate?.payload).toEqual({ professional_id: 11 });

    // Audit row with reassigned_from = original target.
    const audit = state.inserts.find((i) => i.table === "lead_assignments");
    expect(audit?.row).toMatchObject({
      firm_id: 99,
      lead_ref: "500",
      professional_id: 11,
      assigned_by: "round_robin",
      reassigned_from: 10,
    });
  });

  it("writes an audit row with reassigned_from null when the assignee is unchanged", async () => {
    wireFirm(
      [
        { id: 10, status: "active", availability_status: "open", type: "tax_agent", name: "A" },
        { id: 11, status: "active", availability_status: "open", type: "tax_agent", name: "B" },
      ],
      [
        { professional_id: 10, assigned_at: "2026-06-01T00:00:00Z" }, // staler → 10 wins (== target)
        { professional_id: 11, assigned_at: "2026-06-10T00:00:00Z" },
      ],
    );

    const res = await autoAssignLead({ leadId: 501, targetProfessionalId: 10 });
    expect(res.assigneeId).toBe(10);
    expect(res.reassigned).toBe(false);
    // No lead update needed when unchanged.
    expect(state.updates.find((u) => u.table === "professional_leads")).toBeUndefined();
    const audit = state.inserts.find((i) => i.table === "lead_assignments");
    expect(audit?.row).toMatchObject({ professional_id: 10, reassigned_from: null });
  });
});

describe("autoAssignLead — all unavailable", () => {
  it("leaves the lead unassigned and writes no audit row", async () => {
    let profCall = 0;
    state.handlers["professionals"] = () => {
      profCall++;
      if (profCall === 1) return single({ id: 10, firm_id: 99, type: "tax_agent" })();
      return list([
        { id: 10, status: "active", availability_status: "closed", type: "tax_agent", name: "A" },
      ])();
    };
    state.handlers["advisor_firms"] = single({ id: 99, routing_policy: { mode: "round_robin" } });
    state.handlers["lead_assignments"] = () => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      then: (resolve: (v: { data: unknown[] }) => unknown) => resolve({ data: [] }),
      insert: vi.fn((row: Record<string, unknown>) => {
        state.inserts.push({ table: "lead_assignments", row });
        return Promise.resolve({ error: null });
      }),
    });
    state.handlers["professional_leads"] = updateRecorder("professional_leads");

    const res = await autoAssignLead({ leadId: 1, targetProfessionalId: 10 });
    expect(res.assigneeId).toBe(10); // unchanged (no-op)
    expect(res.reassigned).toBe(false);
    expect(res.reason).toBe("all_unavailable");
    expect(state.inserts).toHaveLength(0);
  });
});

describe("autoAssignLead — resilience", () => {
  it("returns a safe no-op outcome (never throws) on unexpected error", async () => {
    state.handlers["professionals"] = () => {
      throw new Error("boom");
    };
    const res = await autoAssignLead({ leadId: 1, targetProfessionalId: 10 });
    expect(res.reassigned).toBe(false);
    expect(res.assigneeId).toBe(10);
    expect(res.reason).toBe("error");
  });
});
