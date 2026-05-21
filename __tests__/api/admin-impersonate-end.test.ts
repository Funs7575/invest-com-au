/**
 * Tests for POST /api/admin/impersonate/end
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockRequireAdmin = vi.fn();
vi.mock("@/lib/require-admin", () => ({ requireAdmin: () => mockRequireAdmin() }));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const mockIsAllowed = vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => true);
vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  ipKey: vi.fn(() => "1.2.3.4"),
}));

const mockEndImpersonation = vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => undefined);
vi.mock("@/lib/admin-impersonation", () => ({
  IMPERSONATE_COOKIE: "iv_impersonate",
  buildClearImpersonateCookieAttrs: vi.fn(() => "iv_impersonate=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0"),
  endImpersonation: (...args: unknown[]) => mockEndImpersonation(...args),
}));

// Mock next/headers cookies()
const mockCookieGet = vi.fn<(...args: unknown[]) => unknown>(() => undefined);
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: mockCookieGet })),
}));

import { POST } from "@/app/api/admin/impersonate/end/route";

function makeReq(): NextRequest {
  return new NextRequest("http://localhost/api/admin/impersonate/end", {
    method: "POST",
    headers: { "x-forwarded-for": "1.2.3.4" },
  });
}

describe("POST /api/admin/impersonate/end", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({
      ok: true, email: "admin@invest.com.au", userId: "u1",
    });
    mockIsAllowed.mockResolvedValue(true);
    mockCookieGet.mockReturnValue(undefined);
  });

  it("returns 401 when not admin", async () => {
    mockRequireAdmin.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await POST(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(makeReq());
    expect(res.status).toBe(429);
  });

  it("returns 200 with cleared cookie when no active session", async () => {
    const res = await POST(makeReq());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("iv_impersonate=;");
  });

  it("calls endImpersonation when a valid cookie row id present", async () => {
    mockCookieGet.mockReturnValue({ value: "42" });
    const res = await POST(makeReq());
    expect(res.status).toBe(200);
    expect(mockEndImpersonation).toHaveBeenCalledWith(42);
  });

  it("still returns 200 when endImpersonation throws", async () => {
    mockCookieGet.mockReturnValue({ value: "99" });
    mockEndImpersonation.mockRejectedValue(new Error("db error"));
    const res = await POST(makeReq());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });
});
