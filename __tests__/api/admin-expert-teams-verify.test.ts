/**
 * Tests for POST /api/admin/expert-teams/[id]/verify.
 *
 * Admin-gated verify/reject of an expert team. The route looks the team up
 * via `getTeamById` (404 if missing) then delegates to `adminVerify`.
 * Both helpers are mocked.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockRequireAdmin, mockGetTeamById, mockAdminVerify } = vi.hoisted(
  () => ({
    mockRequireAdmin: vi.fn(),
    mockGetTeamById: vi.fn(),
    mockAdminVerify: vi.fn(),
  }),
);

vi.mock("@/lib/require-admin", () => ({
  requireAdmin: () => mockRequireAdmin(),
}));

vi.mock("@/lib/expert-teams", () => ({
  getTeamById: (...a: unknown[]) => mockGetTeamById(...a),
  adminVerify: (...a: unknown[]) => mockAdminVerify(...a),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  })),
}));

import { POST } from "@/app/api/admin/expert-teams/[id]/verify/route";

const ADMIN_OK = {
  ok: true as const,
  email: "admin@invest.com.au",
  userId: "user-1",
};

function denyGuard(status: number) {
  return {
    ok: false as const,
    response: new Response(JSON.stringify({ error: "denied" }), { status }),
  };
}

function makeReq(id: string, body: unknown) {
  return new NextRequest(
    `http://localhost/api/admin/expert-teams/${id}/verify`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAdmin.mockResolvedValue(ADMIN_OK);
  mockGetTeamById.mockResolvedValue({ id: 3, name: "Team", status: "pending" });
  mockAdminVerify.mockResolvedValue({ id: 3, status: "verified" });
});

describe("POST /api/admin/expert-teams/[id]/verify", () => {
  it("propagates 401 when guard refuses", async () => {
    mockRequireAdmin.mockResolvedValue(denyGuard(401));
    const res = await POST(makeReq("3", { approved: true }), ctx("3"));
    expect(res.status).toBe(401);
    expect(mockGetTeamById).not.toHaveBeenCalled();
  });

  it("propagates 403 when guard forbids", async () => {
    mockRequireAdmin.mockResolvedValue(denyGuard(403));
    const res = await POST(makeReq("3", { approved: true }), ctx("3"));
    expect(res.status).toBe(403);
  });

  it("returns 400 for a non-numeric team id", async () => {
    const res = await POST(makeReq("zz", { approved: true }), ctx("zz"));
    expect(res.status).toBe(400);
  });

  it("returns 400 for an invalid JSON body", async () => {
    const req = new NextRequest(
      "http://localhost/api/admin/expert-teams/3/verify",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{bad",
      },
    );
    const res = await POST(req, ctx("3"));
    expect(res.status).toBe(400);
  });

  it("returns 400 when approved is missing", async () => {
    const res = await POST(makeReq("3", {}), ctx("3"));
    expect(res.status).toBe(400);
    expect(mockAdminVerify).not.toHaveBeenCalled();
  });

  it("returns 404 when the team does not exist", async () => {
    mockGetTeamById.mockResolvedValue(null);
    const res = await POST(makeReq("3", { approved: true }), ctx("3"));
    expect(res.status).toBe(404);
    expect(mockAdminVerify).not.toHaveBeenCalled();
  });

  it("verifies a team and returns the updated record", async () => {
    const res = await POST(
      makeReq("3", { approved: true, accepts_briefs: true }),
      ctx("3"),
    );
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      team: { id: 3, status: "verified" },
    });
    expect(mockAdminVerify).toHaveBeenCalledWith(
      expect.objectContaining({
        teamId: 3,
        approved: true,
        acceptsBriefs: true,
      }),
    );
  });

  it("rejects a team when approved is false", async () => {
    mockAdminVerify.mockResolvedValue({ id: 3, status: "rejected" });
    const res = await POST(
      makeReq("3", { approved: false, rejection_reason: "incomplete" }),
      ctx("3"),
    );
    expect(res.status).toBe(200);
    expect(mockAdminVerify).toHaveBeenCalledWith(
      expect.objectContaining({
        approved: false,
        rejectionReason: "incomplete",
      }),
    );
  });
});
