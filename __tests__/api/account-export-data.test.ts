import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { createChainableBuilder } from "@/__tests__/helpers";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockGetUser = vi.fn();
const mockIsRateLimited = vi.fn();
const mockServerFrom = vi.fn();

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: (...args: unknown[]) => mockIsRateLimited(...args),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockServerFrom,
  })),
}));

import { POST } from "@/app/api/account/export-data/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makePost(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest("http://localhost/api/account/export-data", {
    method: "POST",
    headers: {
      "x-forwarded-for": "1.2.3.4",
      "user-agent": "Mozilla/5.0 Test Browser",
      ...headers,
    },
  });
}

function authedUser(id = "user-abc", email = "user@test.com") {
  mockGetUser.mockResolvedValue({ data: { user: { id, email } } });
}

function setupExportChain(result: {
  data: { id: string; requested_at: string } | null;
  error: null | { message: string };
}) {
  const supabaseCalls: Record<string, { method: string; args: unknown[] }[]> = {};
  const chain = createChainableBuilder("data_export_requests", supabaseCalls);
  chain.single = vi.fn(() => Promise.resolve(result));
  mockServerFrom.mockReturnValue(chain);
  return { chain, supabaseCalls };
}

describe("POST /api/account/export-data", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
  });

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(makePost());
    expect(res.status).toBe(401);
  });

  it("returns 429 when rate limited", async () => {
    authedUser();
    mockIsRateLimited.mockResolvedValue(true);
    setupExportChain({ data: null, error: null });
    const res = await POST(makePost());
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.error).toMatch(/24 hours/i);
  });

  it("includes user.id in rate limit key", async () => {
    authedUser("my-user-id");
    mockIsRateLimited.mockResolvedValue(false);
    setupExportChain({
      data: { id: "req-1", requested_at: "2026-04-27T12:00:00Z" },
      error: null,
    });
    await POST(makePost());
    const rateLimitArgs = mockIsRateLimited.mock.calls[0] as [string, number, number];
    expect(rateLimitArgs[0]).toContain("my-user-id");
  });

  it("returns 500 when DB insert fails", async () => {
    authedUser();
    setupExportChain({ data: null, error: { message: "insert failed" } });
    const res = await POST(makePost());
    expect(res.status).toBe(500);
  });

  it("returns 200 with request_id and requested_at on success", async () => {
    authedUser();
    setupExportChain({
      data: { id: "export-req-99", requested_at: "2026-04-27T12:30:00Z" },
      error: null,
    });
    const res = await POST(makePost());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.request_id).toBe("export-req-99");
    expect(json.requested_at).toBe("2026-04-27T12:30:00Z");
  });

  it("response message references Australian Privacy Principles", async () => {
    authedUser();
    setupExportChain({
      data: { id: "r1", requested_at: "2026-04-27T00:00:00Z" },
      error: null,
    });
    const res = await POST(makePost());
    const json = await res.json();
    expect(json.message).toMatch(/Australian Privacy Principles/);
  });

  it("captures IP from x-forwarded-for header in DB insert", async () => {
    authedUser();
    const { supabaseCalls } = setupExportChain({
      data: { id: "r1", requested_at: "2026-04-27T00:00:00Z" },
      error: null,
    });
    await POST(makePost({ "x-forwarded-for": "5.6.7.8, 10.0.0.1" }));
    const insertCall = supabaseCalls["data_export_requests"]?.find(
      (c) => c.method === "insert",
    );
    const insertArgs = insertCall?.args[0] as Record<string, unknown>;
    expect(insertArgs.ip_address).toBe("5.6.7.8");
  });

  it("captures user-agent header (up to 500 chars) in DB insert", async () => {
    authedUser();
    const longAgent = "X".repeat(600);
    const { supabaseCalls } = setupExportChain({
      data: { id: "r1", requested_at: "2026-04-27T00:00:00Z" },
      error: null,
    });
    await POST(makePost({ "user-agent": longAgent }));
    const insertCall = supabaseCalls["data_export_requests"]?.find(
      (c) => c.method === "insert",
    );
    const insertArgs = insertCall?.args[0] as Record<string, unknown>;
    expect((insertArgs.user_agent as string).length).toBeLessThanOrEqual(500);
  });

  it("inserts status=pending in DB", async () => {
    authedUser();
    const { supabaseCalls } = setupExportChain({
      data: { id: "r1", requested_at: "2026-04-27T00:00:00Z" },
      error: null,
    });
    await POST(makePost());
    const insertCall = supabaseCalls["data_export_requests"]?.find(
      (c) => c.method === "insert",
    );
    const insertArgs = insertCall?.args[0] as Record<string, unknown>;
    expect(insertArgs.status).toBe("pending");
  });

  it("inserts user_id from authenticated user in DB", async () => {
    authedUser("uid-xyz");
    const { supabaseCalls } = setupExportChain({
      data: { id: "r1", requested_at: "2026-04-27T00:00:00Z" },
      error: null,
    });
    await POST(makePost());
    const insertCall = supabaseCalls["data_export_requests"]?.find(
      (c) => c.method === "insert",
    );
    const insertArgs = insertCall?.args[0] as Record<string, unknown>;
    expect(insertArgs.user_id).toBe("uid-xyz");
  });
});
