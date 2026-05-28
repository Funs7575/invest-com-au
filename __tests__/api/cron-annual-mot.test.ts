import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const mockSendEmail = vi.fn();
vi.mock("@/lib/resend", () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
}));

const mockListUsers = vi.fn();
const mockFromFn = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    auth: {
      admin: { listUsers: (...args: unknown[]) => mockListUsers(...args) },
    },
    from: (...args: unknown[]) => mockFromFn(...args),
  })),
}));

vi.mock("@/lib/cron-run-log", () => ({
  withCronRunLog: vi.fn(async (_name: string, fn: () => Promise<{ response: unknown }>) => {
    const { response } = await fn();
    return response;
  }),
  wrapCronHandler: vi.fn(
    (_name: string, handler: (req: unknown) => Promise<unknown>) => handler,
  ),
  cleanupCronRunLog: vi.fn(() => Promise.resolve(0)),
}));

import { GET, runtime, maxDuration } from "@/app/api/cron/annual-mot/route";

const CRON_SECRET = "test-cron-secret-mot";

function cronReq(headers: Record<string, string> = {}): NextRequest {
  return new Request("http://localhost/api/cron/annual-mot", { headers }) as unknown as NextRequest;
}

function makeChain(maybeSingleResult: unknown = { data: null, error: null }) {
  const chain: Record<string, unknown> = {};
  for (const m of ["select", "eq", "in", "not", "order", "limit", "upsert"]) {
    chain[m] = vi.fn(() => chain);
  }
  chain.maybeSingle = vi.fn().mockResolvedValue(maybeSingleResult);
  chain.then = (cb: (v: unknown) => unknown) =>
    Promise.resolve(cb({ data: null, error: null }));
  return chain;
}

describe("GET /api/cron/annual-mot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = CRON_SECRET;
    mockSendEmail.mockResolvedValue(undefined);
    // Default: from() returns a chain that resolves successfully
    mockFromFn.mockReturnValue(makeChain());
  });

  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it("exports runtime=nodejs and maxDuration=120", () => {
    expect(runtime).toBe("nodejs");
    expect(maxDuration).toBe(120);
  });

  it("returns 5xx when CRON_SECRET is missing from env (misconfigured)", async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(cronReq({ authorization: `Bearer ${CRON_SECRET}` }));
    expect(res.status).toBe(500);
  });

  it("returns 401 on wrong bearer token", async () => {
    const res = await GET(cronReq({ authorization: "Bearer wrong-secret" }));
    expect(res.status).toBe(401);
  });

  it("returns 200 with zero sends when no anniversary users today", async () => {
    // listUsers returns empty user list
    mockListUsers.mockResolvedValue({ data: { users: [] }, error: null });

    const res = await GET(cronReq({ authorization: `Bearer ${CRON_SECRET}` }));
    expect(res.status).toBe(200);
    const body = await res.json() as { sent: number; skipped: number };
    expect(body.sent).toBe(0);
    expect(body.skipped).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("returns 200 with zero sends when listUsers errors out", async () => {
    mockListUsers.mockResolvedValue({ data: null, error: { message: "service error" } });

    const res = await GET(cronReq({ authorization: `Bearer ${CRON_SECRET}` }));
    expect(res.status).toBe(200);
    const body = await res.json() as { sent: number; skipped: number };
    expect(body.sent).toBe(0);
  });

  it("skips user whose created_at is less than 1 year ago (no MOT yet)", async () => {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setUTCMonth(sixMonthsAgo.getUTCMonth() - 6);

    mockListUsers.mockResolvedValue({
      data: {
        users: [{
          id: "user-1",
          email: "new@example.com",
          created_at: sixMonthsAgo.toISOString(),
        }],
      },
      error: null,
    });

    const res = await GET(cronReq({ authorization: `Bearer ${CRON_SECRET}` }));
    expect(res.status).toBe(200);
    const body = await res.json() as { sent: number; skipped: number };
    // User is < 1 year old so no MOT sent — either skipped or not matched by anniversary check
    expect(body.sent).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });
});
