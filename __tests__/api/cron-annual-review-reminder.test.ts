import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({ logger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }) }));
vi.mock("@/lib/cron-auth", () => ({ requireCronAuth: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/email-templates", () => ({ notificationFooter: () => "<footer/>" }));

import { GET } from "@/app/api/cron/annual-review-reminder/route";
import { requireCronAuth } from "@/lib/cron-auth";
import { createAdminClient } from "@/lib/supabase/admin";

const mockRequireCronAuth = vi.mocked(requireCronAuth);
const mockCreateAdmin = vi.mocked(createAdminClient);
const mockFetch = vi.fn();

function makeTableChain(result: unknown) {
  const chain: Record<string, unknown> = {};
  const methods = ["select", "eq", "gte", "lte", "neq", "is", "order", "limit", "update", "insert", "upsert", "in", "not", "or"];
  for (const m of methods) chain[m] = vi.fn(() => chain);
  chain["then"] = vi.fn((resolve: (v: unknown) => void) => Promise.resolve(resolve(result)));
  return chain;
}

function makeReq() {
  return new NextRequest("http://localhost/api/cron/annual-review-reminder", { method: "GET" });
}

beforeEach(() => {
  vi.resetAllMocks();
  mockRequireCronAuth.mockReturnValue(undefined as never);
  vi.stubGlobal("fetch", mockFetch);
  mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
  process.env.RESEND_API_KEY = "rk_test";
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.RESEND_API_KEY;
});

describe("GET /api/cron/annual-review-reminder", () => {
  it("returns 401 when cron auth fails", async () => {
    const authResp = new Response(null, { status: 401 });
    mockRequireCronAuth.mockReturnValue(authResp as never);
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns 500 when RESEND_API_KEY is missing", async () => {
    delete process.env.RESEND_API_KEY;
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it("returns sent:0 when no eligible users", async () => {
    const emailChain = makeTableChain({ data: [], error: null });
    const quizChain = makeTableChain({ data: [], error: null });
    const fromFn = vi.fn()
      .mockReturnValueOnce(emailChain)
      .mockReturnValueOnce(quizChain);
    mockCreateAdmin.mockReturnValue({ from: fromFn } as never);

    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.sent).toBe(0);
    expect(body.checked).toBe(0);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("sends email and updates reminder timestamp for each user", async () => {
    const user = { id: 1, email: "alice@example.com", name: "Alice", source: "website", created_at: "2025-05-01" };
    const emailChain = makeTableChain({ data: [user], error: null });
    const quizChain = makeTableChain({ data: [], error: null });
    const updateChain = makeTableChain({ data: null, error: null });
    const fromFn = vi.fn()
      .mockReturnValueOnce(emailChain)
      .mockReturnValueOnce(quizChain)
      .mockReturnValue(updateChain);
    mockCreateAdmin.mockReturnValue({ from: fromFn } as never);

    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.sent).toBe(1);
    expect(body.checked).toBe(1);
    expect(mockFetch).toHaveBeenCalledOnce();
  });

  it("deduplicates users by email across email_captures and quiz_leads", async () => {
    const user = { id: 1, email: "dup@example.com", name: "Dup", source: "website", created_at: "2025-05-01" };
    const quizUser = { id: 2, email: "dup@example.com", name: "Dup", created_at: "2025-05-01" };
    const emailChain = makeTableChain({ data: [user], error: null });
    const quizChain = makeTableChain({ data: [quizUser], error: null });
    const updateChain = makeTableChain({ data: null, error: null });
    const fromFn = vi.fn()
      .mockReturnValueOnce(emailChain)
      .mockReturnValueOnce(quizChain)
      .mockReturnValue(updateChain);
    mockCreateAdmin.mockReturnValue({ from: fromFn } as never);

    const res = await GET(makeReq());
    const body = await res.json();
    // Deduplication should keep only 1 user
    expect(body.checked).toBe(1);
    expect(body.sent).toBe(1);
  });

  it("continues with other users when one send fails", async () => {
    const users = [
      { id: 1, email: "ok@example.com", name: "OK", source: "website", created_at: "2025-05-01" },
      { id: 2, email: "fail@example.com", name: "Fail", source: "website", created_at: "2025-05-01" },
    ];
    const emailChain = makeTableChain({ data: users, error: null });
    const quizChain = makeTableChain({ data: [], error: null });
    const updateChain = makeTableChain({ data: null, error: null });
    const fromFn = vi.fn()
      .mockReturnValueOnce(emailChain)
      .mockReturnValueOnce(quizChain)
      .mockReturnValue(updateChain);
    mockCreateAdmin.mockReturnValue({ from: fromFn } as never);
    // First send succeeds, second throws
    mockFetch
      .mockResolvedValueOnce({ ok: true })
      .mockRejectedValueOnce(new Error("send failed"));

    const res = await GET(makeReq());
    const body = await res.json();
    // Only 1 sent (the successful one)
    expect(body.sent).toBe(1);
    expect(body.checked).toBe(2);
  });
});
