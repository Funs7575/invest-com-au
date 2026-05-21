import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const mockGetUser = vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => ({
  data: { user: { id: "u1", email: "user@example.com" } },
  error: null,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}));

const mockSyncSharesightHoldings = vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => ({
  inserted: 5,
  skippedAsDuplicate: 2,
  errors: 0,
}));

const { MockSharesightSyncError } = vi.hoisted(() => {
  class MockSharesightSyncError extends Error {
    code: string;
    status: number;
    constructor(code: string, message: string, status: number) {
      super(message);
      this.code = code;
      this.status = status;
      this.name = "SharesightSyncError";
    }
  }
  return { MockSharesightSyncError };
});

vi.mock("@/lib/sharesight/sync", () => ({
  syncSharesightHoldings: (...args: unknown[]) => mockSyncSharesightHoldings(...args),
  SharesightSyncError: MockSharesightSyncError,
}));

import { POST } from "@/app/api/account/holdings/sharesight/sync/route";

describe("/api/account/holdings/sharesight/sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1", email: "user@example.com" } }, error: null });
    mockSyncSharesightHoldings.mockResolvedValue({ inserted: 5, skippedAsDuplicate: 2, errors: 0 });
  });

  it("rejects unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await POST();
    expect(res.status).toBe(401);
  });

  it("returns sync result on success", async () => {
    const res = await POST();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("inserted");
    expect(json).toHaveProperty("skippedAsDuplicate");
    expect(json).toHaveProperty("errors");
  });

  it("returns 404 when not connected", async () => {
    mockSyncSharesightHoldings.mockRejectedValue(
      new MockSharesightSyncError("not_connected", "No Sharesight connection found.", 404),
    );
    const res = await POST();
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe("not_connected");
  });

  it("returns 503 when config is missing", async () => {
    mockSyncSharesightHoldings.mockRejectedValue(
      new MockSharesightSyncError("config_missing", "Sharesight not configured.", 503),
    );
    const res = await POST();
    expect(res.status).toBe(503);
  });

  it("returns 500 on unexpected error", async () => {
    mockSyncSharesightHoldings.mockRejectedValue(new Error("unexpected"));
    const res = await POST();
    expect(res.status).toBe(500);
  });
});
