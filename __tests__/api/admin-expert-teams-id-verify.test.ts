import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockRequireAdmin = vi.fn();
vi.mock("@/lib/require-admin", () => ({ requireAdmin: () => mockRequireAdmin() }));
vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

const mockGetTeamById = vi.fn();
const mockAdminVerify = vi.fn();
vi.mock("@/lib/expert-teams", () => ({
  getTeamById: (...args: unknown[]) => mockGetTeamById(...args),
  adminVerify: (...args: unknown[]) => mockAdminVerify(...args),
}));

import { POST } from "@/app/api/admin/expert-teams/[id]/verify/route";

function makeReq(body?: unknown): NextRequest {
  return new Request("http://localhost/api/admin/expert-teams/1/verify", {
    method: "POST",
    ...(body !== undefined
      ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } }
      : {}),
  }) as unknown as NextRequest;
}

const ctx = (id: string) => ({ params: Promise.resolve({ id }) }) as { params: Promise<{ id: string }> };

describe("/api/admin/expert-teams/[id]/verify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({
      ok: true,
      email: "admin@invest.com.au",
      userId: "u1",
    });
    mockGetTeamById.mockResolvedValue({ id: 1, name: "Alpha Team" });
    mockAdminVerify.mockResolvedValue({ id: 1, verification_status: "verified" });
  });

  it("POST denies non-admin", async () => {
    mockRequireAdmin.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await POST(makeReq({ approved: true }), ctx("1"));
    expect(res.status).toBe(401);
  });

  it("POST returns 400 for non-numeric id", async () => {
    const res = await POST(makeReq({ approved: true }), ctx("abc"));
    expect(res.status).toBe(400);
  });

  it("POST returns 400 for invalid JSON body", async () => {
    const req = new Request("http://localhost/api/admin/expert-teams/1/verify", {
      method: "POST",
      body: "not-json",
      headers: { "content-type": "application/json" },
    }) as unknown as NextRequest;
    const res = await POST(req, ctx("1"));
    expect(res.status).toBe(400);
  });

  it("POST returns 400 when body fails Zod validation (missing approved)", async () => {
    const res = await POST(makeReq({}), ctx("1"));
    expect(res.status).toBe(400);
  });

  it("POST returns 404 when team not found", async () => {
    mockGetTeamById.mockResolvedValue(null);
    const res = await POST(makeReq({ approved: true }), ctx("99"));
    expect(res.status).toBe(404);
  });

  it("POST verifies team when valid", async () => {
    const res = await POST(makeReq({ approved: true }), ctx("1"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.team).toBeDefined();
  });

  it("POST rejects team when approved=false with rejection_reason", async () => {
    mockAdminVerify.mockResolvedValue({ id: 1, verification_status: "rejected" });
    const res = await POST(
      makeReq({ approved: false, rejection_reason: "Insufficient documentation" }),
      ctx("1"),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.team).toBeDefined();
  });
});
