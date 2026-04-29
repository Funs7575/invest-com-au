import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

const mockIsRateLimited = vi.fn();
vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: (...args: unknown[]) => mockIsRateLimited(...args),
}));

const mockGetUser = vi.fn();
vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
  })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({})),
}));

const mockAdjustWallet = vi.fn();
vi.mock("@/lib/marketplace/wallet", () => ({
  adjustWallet: (...args: unknown[]) => mockAdjustWallet(...args),
}));

vi.mock("@/lib/admin", () => ({
  ADMIN_EMAILS: ["admin@invest.com.au"],
  getAdminEmails: vi.fn(() => ["admin@invest.com.au"]),
}));

import { POST } from "@/app/api/marketplace/wallet-adjust/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makePost(
  body: Record<string, unknown>,
  cookie = "auth-cookie=test"
): NextRequest {
  return new NextRequest("http://localhost/api/marketplace/wallet-adjust", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie,
      "x-forwarded-for": "1.2.3.4",
    },
    body: JSON.stringify(body),
  });
}

const ADMIN_USER = { id: "admin-id", email: "admin@invest.com.au" };

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/marketplace/wallet-adjust", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER } });
    mockAdjustWallet.mockResolvedValue({ id: "txn-99", amount_cents: 5000 });
  });

  it("returns 429 when rate-limited", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    const res = await POST(makePost({ broker_slug: "commsec", amount_cents: 1000, description: "test" }));
    expect(res.status).toBe(429);
  });

  it("returns 401 when user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(makePost({ broker_slug: "commsec", amount_cents: 1000, description: "test" }));
    expect(res.status).toBe(401);
  });

  it("returns 403 when user is not admin", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1", email: "user@example.com" } } });
    const res = await POST(makePost({ broker_slug: "commsec", amount_cents: 1000, description: "test" }));
    expect(res.status).toBe(403);
  });

  it("returns 400 when required fields are missing", async () => {
    const res = await POST(makePost({ broker_slug: "commsec" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/required/i);
  });

  it("calls adjustWallet with correct arguments on success", async () => {
    const res = await POST(makePost({
      broker_slug: "commsec",
      amount_cents: 5000,
      description: "Manual credit from founder",
    }));
    expect(res.status).toBe(200);
    expect(mockAdjustWallet).toHaveBeenCalledWith(
      "commsec",
      5000,
      "Manual credit from founder",
      "admin@invest.com.au"
    );
  });

  it("returns success:true and transaction on happy path", async () => {
    const res = await POST(makePost({
      broker_slug: "commsec",
      amount_cents: 5000,
      description: "Manual credit",
    }));
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.transaction).toBeDefined();
  });

  it("returns 500 when adjustWallet throws", async () => {
    mockAdjustWallet.mockRejectedValue(new Error("DB failure"));
    const res = await POST(makePost({
      broker_slug: "commsec",
      amount_cents: 5000,
      description: "test",
    }));
    expect(res.status).toBe(500);
  });
});
