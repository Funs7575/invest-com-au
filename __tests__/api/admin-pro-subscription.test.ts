import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ── Mocks ───────────────────────────────────────────────────────────────────

const mockRequireAdmin = vi.fn();
vi.mock("@/lib/require-admin", () => ({ requireAdmin: () => mockRequireAdmin() }));
vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));
vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: vi.fn(async () => true),
  ipKey: vi.fn(() => "127.0.0.1"),
}));
vi.mock("@/lib/pro-subscription", () => ({
  setProSubscriptionTier: vi.fn(async () => undefined),
}));

import { POST } from "@/app/api/admin/pro-subscription/route";

function makeReq(body?: unknown): NextRequest {
  return new Request("http://localhost/api/admin/pro-subscription", {
    method: "POST",
    ...(body !== undefined
      ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } }
      : {}),
  }) as unknown as NextRequest;
}

describe("POST /api/admin/pro-subscription", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({
      ok: true,
      email: "admin@invest.com.au",
      userId: "u1",
    });
  });

  it("denies non-admin", async () => {
    mockRequireAdmin.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await POST(makeReq({ professional_id: 1, tier: "free" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 for missing professional_id", async () => {
    const res = await POST(makeReq({ tier: "free" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid tier", async () => {
    const res = await POST(makeReq({ professional_id: 1, tier: "enterprise" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for malformed JSON", async () => {
    const req = new Request("http://localhost/api/admin/pro-subscription", {
      method: "POST",
      body: "not-json",
      headers: { "content-type": "application/json" },
    }) as unknown as NextRequest;
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 200 on happy path", async () => {
    const res = await POST(makeReq({ professional_id: 1, tier: "growth", status: "active" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });
});
