import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const { mockIsAllowed } = vi.hoisted(() => ({
  mockIsAllowed: vi.fn<() => Promise<boolean>>().mockResolvedValue(true),
}));
vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (..._: unknown[]) => mockIsAllowed(),
  ipKey: vi.fn(() => "127.0.0.1"),
}));

const { mockAdvisorSession } = vi.hoisted(() => ({
  mockAdvisorSession: vi.fn<() => Promise<number | null>>().mockResolvedValue(1),
}));
vi.mock("@/lib/require-advisor-session", () => ({
  requireAdvisorSession: (_req: unknown) => mockAdvisorSession(),
}));

const { mockIsFlagEnabled } = vi.hoisted(() => ({
  mockIsFlagEnabled: vi.fn<() => Promise<boolean>>().mockResolvedValue(true),
}));
vi.mock("@/lib/feature-flags", () => ({
  isFlagEnabled: (..._: unknown[]) => mockIsFlagEnabled(),
}));

// firm-performance helper — stub to avoid DB.
vi.mock("@/lib/firm-performance", () => ({
  getFirmPerformanceSummary: vi.fn().mockResolvedValue({ members: [] }),
}));

const { state } = vi.hoisted(() => ({
  state: {
    handlers: {} as Record<string, () => unknown>,
    updates: [] as { table: string; payload: Record<string, unknown> }[],
  },
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      const h = state.handlers[table];
      return h ? h() : {};
    }),
  })),
}));

import { GET, PUT } from "@/app/api/advisor-portal/firm-routing/route";

// ── Helpers ────────────────────────────────────────────────────────────────

function single(data: unknown) {
  return () => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data }),
  });
}
function listChain(data: unknown[]) {
  return () => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    then: (resolve: (v: { data: unknown[] }) => unknown) => resolve({ data }),
  });
}
function updateRecorder(table: string) {
  return () => ({
    update: vi.fn((payload: Record<string, unknown>) => {
      state.updates.push({ table, payload });
      return { eq: vi.fn().mockResolvedValue({ error: null }) };
    }),
  });
}

function makeGet() {
  return new Request("http://localhost/api/advisor-portal/firm-routing", {
    headers: { "x-forwarded-for": "127.0.0.1" },
  });
}
function makePut(body: unknown) {
  return new Request("http://localhost/api/advisor-portal/firm-routing", {
    method: "PUT",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "127.0.0.1" },
    body: JSON.stringify(body),
  });
}

const FIRM_ADMIN = { id: 1, firm_id: 10, is_firm_admin: true };

beforeEach(() => {
  vi.clearAllMocks();
  state.handlers = {};
  state.updates = [];
  mockIsAllowed.mockResolvedValue(true);
  mockAdvisorSession.mockResolvedValue(1);
  mockIsFlagEnabled.mockResolvedValue(true);
});

// ── GET ──────────────────────────────────────────────────────────────────────

describe("GET /api/advisor-portal/firm-routing", () => {
  it("429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    expect((await GET(makeGet() as never)).status).toBe(429);
  });

  it("401 when not authenticated", async () => {
    mockAdvisorSession.mockResolvedValue(null);
    expect((await GET(makeGet() as never)).status).toBe(401);
  });

  it("403 when not a firm admin", async () => {
    state.handlers["professionals"] = single({ id: 1, firm_id: null, is_firm_admin: false });
    expect((await GET(makeGet() as never)).status).toBe(403);
  });

  it("returns policy, members, assignments and flagEnabled", async () => {
    let profCall = 0;
    state.handlers["professionals"] = () => {
      profCall++;
      if (profCall === 1) return single(FIRM_ADMIN)();
      // members list
      return listChain([
        { id: 1, name: "A", slug: "a", type: "tax_agent", status: "active", availability_status: "open" },
        { id: 2, name: "B", slug: "b", type: "smsf_accountant", status: "active", availability_status: "closed" },
      ])();
    };
    state.handlers["advisor_firms"] = single({ id: 10, name: "Firm", routing_policy: { mode: "round_robin" } });
    state.handlers["lead_assignments"] = listChain([
      { id: 5, lead_ref: "100", professional_id: 1, assigned_by: "round_robin", assigned_at: "2026-06-10T00:00:00Z", reassigned_from: 2 },
    ]);

    const res = await GET(makeGet() as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.flagEnabled).toBe(true);
    expect(json.policy).toEqual({ mode: "round_robin" });
    expect(json.members).toHaveLength(2);
    expect(json.unavailableCount).toBe(1); // member B is closed
    expect(json.assignments[0]).toMatchObject({
      leadRef: "100",
      assignedBy: "round_robin",
      reassignedFrom: 2,
      reassignedFromName: "B",
    });
  });

  it("still returns context with flagEnabled:false when the flag is off", async () => {
    mockIsFlagEnabled.mockResolvedValue(false);
    let profCall = 0;
    state.handlers["professionals"] = () => {
      profCall++;
      if (profCall === 1) return single(FIRM_ADMIN)();
      return listChain([])();
    };
    state.handlers["advisor_firms"] = single({ id: 10, name: "Firm", routing_policy: {} });
    state.handlers["lead_assignments"] = listChain([]);

    const res = await GET(makeGet() as never);
    const json = await res.json();
    expect(json.flagEnabled).toBe(false);
    expect(json.policy).toEqual({ mode: "manual" });
  });
});

// ── PUT ──────────────────────────────────────────────────────────────────────

describe("PUT /api/advisor-portal/firm-routing", () => {
  it("403 when the firm_routing flag is off (editor inert)", async () => {
    mockIsFlagEnabled.mockResolvedValue(false);
    state.handlers["professionals"] = single(FIRM_ADMIN);
    const res = await PUT(makePut({ mode: "round_robin" }) as never);
    expect(res.status).toBe(403);
    expect(state.updates).toHaveLength(0);
  });

  it("400 for an invalid mode", async () => {
    state.handlers["professionals"] = single(FIRM_ADMIN);
    const res = await PUT(makePut({ mode: "magic" }) as never);
    expect(res.status).toBe(400);
  });

  it("persists a round_robin policy", async () => {
    state.handlers["professionals"] = single(FIRM_ADMIN);
    state.handlers["advisor_firms"] = updateRecorder("advisor_firms");
    const res = await PUT(makePut({ mode: "round_robin" }) as never);
    expect(res.status).toBe(200);
    expect(state.updates[0]?.payload).toEqual({ routing_policy: { mode: "round_robin" } });
  });

  it("drops specialty_map entries that point outside the firm", async () => {
    let profCall = 0;
    state.handlers["professionals"] = () => {
      profCall++;
      if (profCall === 1) return single(FIRM_ADMIN)();
      // valid-members lookup: only id 2 is in the firm
      return listChain([{ id: 2 }])();
    };
    state.handlers["advisor_firms"] = updateRecorder("advisor_firms");
    const res = await PUT(
      makePut({ mode: "specialty", specialty_map: { tax_agent: 2, smsf_accountant: 999 } }) as never,
    );
    expect(res.status).toBe(200);
    // 999 is not in the firm → dropped; only tax_agent:2 survives.
    expect(state.updates[0]?.payload).toEqual({
      routing_policy: { mode: "specialty", specialty_map: { tax_agent: 2 } },
    });
  });
});
