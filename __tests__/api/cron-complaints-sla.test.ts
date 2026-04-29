import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({ logger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }) }));
vi.mock("@/lib/cron-run-log", () => ({
  wrapCronHandler: (_name: string, h: unknown) => h,
}));
vi.mock("@/lib/cron-auth", () => ({ requireCronAuth: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

import { GET } from "@/app/api/cron/complaints-sla/route";
import { requireCronAuth } from "@/lib/cron-auth";
import { createAdminClient } from "@/lib/supabase/admin";

const mockRequireCronAuth = vi.mocked(requireCronAuth);
const mockCreateAdmin = vi.mocked(createAdminClient);

// Queue-based chain for multiple sequential DB calls
function makeQueuedChain(queue: unknown[]) {
  let idx = 0;
  const chain: Record<string, unknown> = {};
  const methods = ["from", "select", "eq", "update", "gte", "lt", "not", "is", "order", "limit", "in"];
  for (const m of methods) chain[m] = vi.fn(() => chain);
  chain["then"] = vi.fn((resolve: (v: unknown) => void) => Promise.resolve(resolve(queue[idx++])));
  return chain;
}

function makeReq() {
  return new NextRequest("http://localhost/api/cron/complaints-sla", { method: "GET" });
}

const nowMs = Date.now();
// Complaint past due (no auto_escalated_at)
function makeOverdue(id: number) {
  return {
    id,
    reference_id: `REF-${id}`,
    complainant_email: "user@example.com",
    assigned_to: "admin@example.com",
    submitted_at: new Date(nowMs - 35 * 86400000).toISOString(),
    sla_due_at: new Date(nowMs - 2 * 86400000).toISOString(), // 2 days past due
    status: "open",
    sla_warning_sent_at: null,
    auto_escalated_at: null,
  };
}
// Complaint approaching due date (no warning sent)
function makeApproaching(id: number) {
  return {
    id,
    reference_id: `REF-${id}`,
    complainant_email: "user@example.com",
    assigned_to: null,
    submitted_at: new Date(nowMs - 28 * 86400000).toISOString(),
    sla_due_at: new Date(nowMs + 3 * 86400000).toISOString(), // 3 days remaining
    status: "open",
    sla_warning_sent_at: null,
    auto_escalated_at: null,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  mockRequireCronAuth.mockReturnValue(undefined as never);
});

describe("GET /api/cron/complaints-sla", () => {
  it("returns 401 when cron auth fails", async () => {
    const authResp = new Response(null, { status: 401 });
    mockRequireCronAuth.mockReturnValue(authResp as never);
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns 500 on complaints fetch error", async () => {
    const chain = makeQueuedChain([{ data: null, error: { message: "DB error" } }]);
    mockCreateAdmin.mockReturnValue({ from: vi.fn(() => chain) } as never);
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.ok).toBe(false);
  });

  it("returns zero counts when no open complaints", async () => {
    const chain = makeQueuedChain([{ data: [], error: null }]);
    mockCreateAdmin.mockReturnValue({ from: vi.fn(() => chain) } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.total_open).toBe(0);
    expect(body.warnings_sent).toBe(0);
    expect(body.auto_escalated).toBe(0);
  });

  it("escalates overdue complaint and increments auto_escalated", async () => {
    const overdue = makeOverdue(1);
    // fetch returns 1 complaint; then update call returns no error
    const chain = makeQueuedChain([
      { data: [overdue], error: null },
      { data: null, error: null }, // update for escalation
    ]);
    mockCreateAdmin.mockReturnValue({ from: vi.fn(() => chain) } as never);

    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.auto_escalated).toBe(1);
    expect(body.warnings_sent).toBe(0);
  });

  it("stamps warning for approaching-due complaint", async () => {
    const approaching = makeApproaching(2);
    const chain = makeQueuedChain([
      { data: [approaching], error: null },
      { data: null, error: null }, // update for warning
    ]);
    mockCreateAdmin.mockReturnValue({ from: vi.fn(() => chain) } as never);

    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.warnings_sent).toBe(1);
    expect(body.auto_escalated).toBe(0);
  });

  it("skips warning if already warned", async () => {
    const alreadyWarned = {
      ...makeApproaching(3),
      sla_warning_sent_at: new Date(nowMs - 1000).toISOString(),
    };
    const chain = makeQueuedChain([{ data: [alreadyWarned], error: null }]);
    mockCreateAdmin.mockReturnValue({ from: vi.fn(() => chain) } as never);

    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.warnings_sent).toBe(0);
  });

  it("skips escalation if already escalated", async () => {
    const alreadyEscalated = {
      ...makeOverdue(4),
      auto_escalated_at: new Date(nowMs - 1000).toISOString(),
    };
    const chain = makeQueuedChain([{ data: [alreadyEscalated], error: null }]);
    mockCreateAdmin.mockReturnValue({ from: vi.fn(() => chain) } as never);

    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.auto_escalated).toBe(0);
  });
});
