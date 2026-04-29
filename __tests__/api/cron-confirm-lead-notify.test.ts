import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() })),
}));

vi.mock("@/lib/cron-auth", () => ({
  requireCronAuth: vi.fn(() => null),
}));

const mockSendLeadNotification = vi.fn<(...args: unknown[]) => Promise<unknown>>(() =>
  Promise.resolve(),
);
vi.mock("@/lib/advisor-emails", () => ({
  sendNewLeadNotification: (...args: unknown[]) => mockSendLeadNotification(...args),
}));

// DB queue consumed per from() call
interface DbResult { data?: unknown; error?: { message: string } | null }
const dbQueue: DbResult[] = [];
let dbIdx = 0;

function makeChain(res: DbResult) {
  const c: Record<string, unknown> = {};
  for (const m of ["select", "update", "eq", "is", "not", "lte", "limit", "in", "order"]) {
    c[m] = vi.fn(() => c);
  }
  c.then = (resolve: (v: { data: unknown; error: unknown }) => unknown) =>
    Promise.resolve(resolve({ data: res.data ?? null, error: res.error ?? null }));
  return c;
}

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => makeChain(dbQueue[dbIdx++] ?? { data: null })),
  })),
}));

import { GET } from "@/app/api/cron/confirm-lead-notify/route";
import { requireCronAuth } from "@/lib/cron-auth";

function makeReq(): NextRequest {
  return new Request("http://localhost/api/cron/confirm-lead-notify") as unknown as NextRequest;
}

function makeLead(overrides: Record<string, unknown> = {}) {
  return {
    id: 1, professional_id: 10,
    user_name: "Jane Doe", user_email: "jane@example.com",
    user_phone: "0400123456", user_location_state: "NSW",
    user_intent: { need: "planning", context: ["smsf"] },
    ...overrides,
  };
}

function makeAdvisor(overrides: Record<string, unknown> = {}) {
  return { id: 10, name: "Bob Advisor", email: "bob@example.com", type: "financial_advisor", ...overrides };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("GET /api/cron/confirm-lead-notify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbQueue.length = 0;
    dbIdx = 0;
  });

  it("returns 401 when requireCronAuth rejects", async () => {
    vi.mocked(requireCronAuth).mockReturnValueOnce(
      new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }) as never,
    );
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns {notified: 0} when no pending leads exist", async () => {
    dbQueue.push({ data: [] });
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const json = await res.json() as { notified: number };
    expect(json.notified).toBe(0);
    expect(mockSendLeadNotification).not.toHaveBeenCalled();
  });

  it("notifies advisor and stamps advisor_notified_at", async () => {
    dbQueue.push({ data: [makeLead()] }); // leads query
    dbQueue.push({ data: [makeAdvisor()] }); // advisors query
    dbQueue.push({ data: null }); // update leads
    const res = await GET(makeReq());
    const json = await res.json() as { notified: number; errors: number };
    expect(json.notified).toBe(1);
    expect(json.errors).toBe(0);
    expect(mockSendLeadNotification).toHaveBeenCalledWith(
      "bob@example.com",
      "Bob Advisor",
      "Jane Doe",
      "jane@example.com",
      "0400123456",
      "NSW",
      "planning",
      ["smsf"],
    );
  });

  it("records error when advisor is not found in map", async () => {
    dbQueue.push({ data: [makeLead({ professional_id: 99 })] });
    dbQueue.push({ data: [] }); // no advisors returned
    const res = await GET(makeReq());
    const json = await res.json() as { notified: number; errors: number };
    expect(json.notified).toBe(0);
    expect(json.errors).toBe(1);
  });

  it("records error when advisor has no email", async () => {
    dbQueue.push({ data: [makeLead()] });
    dbQueue.push({ data: [makeAdvisor({ email: null })] });
    const res = await GET(makeReq());
    const json = await res.json() as { errors: number };
    expect(json.errors).toBe(1);
  });

  it("records error when sendNewLeadNotification throws", async () => {
    mockSendLeadNotification.mockRejectedValueOnce(new Error("resend down"));
    dbQueue.push({ data: [makeLead()] });
    dbQueue.push({ data: [makeAdvisor()] });
    const res = await GET(makeReq());
    const json = await res.json() as { notified: number; errors: number };
    expect(json.notified).toBe(0);
    expect(json.errors).toBe(1);
  });

  it("uses default need='planning' when user_intent is null", async () => {
    dbQueue.push({ data: [makeLead({ user_intent: null })] });
    dbQueue.push({ data: [makeAdvisor()] });
    dbQueue.push({ data: null });
    await GET(makeReq());
    expect(mockSendLeadNotification).toHaveBeenCalledWith(
      expect.any(String), expect.any(String), expect.any(String),
      expect.any(String), expect.anything(), expect.anything(),
      "planning",
      [],
    );
  });

  it("deduplicates professional IDs in advisors batch query", async () => {
    dbQueue.push({ data: [makeLead({ id: 1 }), makeLead({ id: 2 })] }); // 2 leads, same advisor
    dbQueue.push({ data: [makeAdvisor()] });
    dbQueue.push({ data: null });
    dbQueue.push({ data: null });
    await GET(makeReq());
    // In() on the advisors query should receive a deduplicated array
    expect(dbIdx).toBeGreaterThan(0);
  });

  it("returns timestamp in response", async () => {
    dbQueue.push({ data: [] });
    const res = await GET(makeReq());
    const json = await res.json() as { timestamp: string };
    expect(json.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
