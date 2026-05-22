import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ───────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() })),
}));

vi.mock("@/lib/cron-auth", () => ({
  requireCronAuth: vi.fn(() => null),
}));

vi.mock("@/lib/url", () => ({ getSiteUrl: () => "https://invest.com.au" }));

vi.mock("@/lib/resend", () => ({
  sendEmail: vi.fn(async () => ({ ok: true })),
}));

// DB mock: queue-based so each from() call consumes the next result
interface DbResult { data?: unknown; error?: { message: string } | null }
const dbQueue: DbResult[] = [];
let dbIdx = 0;

function makeChain(res: DbResult) {
  const c: Record<string, unknown> = {};
  for (const m of ["select", "update", "eq", "is", "not", "lt", "limit", "in", "order"]) {
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

import { GET } from "@/app/api/cron/lead-followup-reminders/route";
import { requireCronAuth } from "@/lib/cron-auth";
import { sendEmail } from "@/lib/resend";

// ─── Helpers ──────────────────────────────────────────────────────────

function makeReq(): NextRequest {
  return new Request("http://localhost/api/cron/lead-followup-reminders") as unknown as NextRequest;
}

function makeLead(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    professional_id: 10,
    user_name: "Alice Smith",
    pipeline_stage: "contacted",
    next_action_at: "2026-05-01T00:00:00Z",
    ...overrides,
  };
}

function makeAdvisor(overrides: Record<string, unknown> = {}) {
  return { id: 10, name: "Bob Advisor", email: "bob@example.com", ...overrides };
}

// ─── Tests ────────────────────────────────────────────────────────────

describe("GET /api/cron/lead-followup-reminders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbQueue.length = 0;
    dbIdx = 0;
    vi.mocked(sendEmail).mockResolvedValue({ ok: true });
  });

  it("returns 401 when requireCronAuth rejects", async () => {
    vi.mocked(requireCronAuth).mockReturnValueOnce(
      new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }) as never,
    );
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns nothing_overdue when no overdue leads exist", async () => {
    dbQueue.push({ data: [] }); // overdue leads query
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.status).toBe("nothing_overdue");
    expect(body.reminders).toBe(0);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("returns 500 when overdue leads query fails", async () => {
    dbQueue.push({ error: { message: "query failed" } }); // overdue leads error
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
  });

  it("returns 500 when advisor lookup fails", async () => {
    dbQueue.push({ data: [makeLead()] }); // overdue leads
    dbQueue.push({ error: { message: "advisor lookup failed" } }); // advisors error
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
  });

  it("sends one email per advisor with overdue leads", async () => {
    dbQueue.push({ data: [makeLead(), makeLead({ id: 2, user_name: "Carol Jones" })] });
    dbQueue.push({ data: [makeAdvisor()] });
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    expect(sendEmail).toHaveBeenCalledOnce();
    const body = await res.json() as Record<string, unknown>;
    expect(body.advisorsNotified).toBe(1);
    expect(body.overdueLeads).toBe(2);
  });

  it("sends separate emails for different advisors", async () => {
    dbQueue.push({
      data: [
        makeLead({ professional_id: 10 }),
        makeLead({ id: 2, professional_id: 20, user_name: "Carol Jones" }),
      ],
    });
    dbQueue.push({
      data: [makeAdvisor({ id: 10 }), makeAdvisor({ id: 20, email: "carol@adv.com" })],
    });
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    expect(sendEmail).toHaveBeenCalledTimes(2);
    const body = await res.json() as Record<string, unknown>;
    expect(body.advisorsNotified).toBe(2);
  });

  it("skips advisor if email is null or advisor not found", async () => {
    dbQueue.push({ data: [makeLead()] });
    dbQueue.push({ data: [] }); // no advisors returned
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    expect(sendEmail).not.toHaveBeenCalled();
    const body = await res.json() as Record<string, unknown>;
    expect(body.advisorsNotified).toBe(0);
  });

  it("counts failures when sendEmail returns ok:false", async () => {
    dbQueue.push({ data: [makeLead()] });
    dbQueue.push({ data: [makeAdvisor()] });
    vi.mocked(sendEmail).mockResolvedValue({ ok: false, error: "resend error" });
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.failures).toBe(1);
    expect(body.advisorsNotified).toBe(0);
  });

  it("includes startedAt, overdueLeads, advisorsNotified, and failures in response", async () => {
    dbQueue.push({ data: [makeLead()] });
    dbQueue.push({ data: [makeAdvisor()] });
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(typeof body.startedAt).toBe("string");
    expect(typeof body.overdueLeads).toBe("number");
    expect(typeof body.advisorsNotified).toBe("number");
    expect(typeof body.failures).toBe("number");
  });
});
