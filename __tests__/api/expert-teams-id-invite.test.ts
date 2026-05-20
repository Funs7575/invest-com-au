import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const mockIsAllowed = vi.fn(async () => true);
vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  ipKey: vi.fn(() => "test-ip"),
}));

const { mockRequireAdvisorSession } = vi.hoisted(() => ({
  mockRequireAdvisorSession: vi.fn(async () => 42 as number | null),
}));

vi.mock("@/lib/require-advisor-session", () => ({
  requireAdvisorSession: mockRequireAdvisorSession,
}));

const mockGetTeamById = vi.fn(async () => ({ id: 1, name: "Alpha Team", owner_professional_id: 42 }));
const mockInviteMember = vi.fn(async () => ({ id: 1, email: "invited@test.com", status: "pending" }));

vi.mock("@/lib/expert-teams", () => ({
  getTeamById: (...args: unknown[]) => mockGetTeamById(...args),
  inviteMember: (...args: unknown[]) => mockInviteMember(...args),
}));

vi.mock("@/lib/api-schemas", () => ({
  InviteExpertTeamMemberRequest: {
    safeParse: (v: unknown) => {
      if (v && typeof v === "object" && "email" in v && "role" in v) {
        return { success: true, data: v as Record<string, unknown>, error: null };
      }
      return { success: false, error: { issues: [{ message: "email and role required" }] } };
    },
  },
}));

import { POST } from "@/app/api/expert-teams/[id]/invite/route";

function makeReq(body?: unknown): NextRequest {
  return new Request("http://localhost/api/expert-teams/1/invite", {
    method: "POST",
    ...(body !== undefined ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } } : {}),
  }) as unknown as NextRequest;
}

function makeCtx(id = "1") {
  return { params: Promise.resolve({ id }) } as { params: Promise<{ id: string }> };
}

const validBody = { email: "invited@test.com", role: "member", name: "Invited Pro" };

describe("/api/expert-teams/[id]/invite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockRequireAdvisorSession.mockResolvedValue(42);
    mockGetTeamById.mockResolvedValue({ id: 1, name: "Alpha Team", owner_professional_id: 42 });
    mockInviteMember.mockResolvedValue({ id: 1, email: "invited@test.com", status: "pending" });
  });

  it("returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(makeReq(validBody), makeCtx());
    expect(res.status).toBe(429);
  });

  it("returns 401 when no session", async () => {
    mockRequireAdvisorSession.mockResolvedValue(null);
    const res = await POST(makeReq(validBody), makeCtx());
    expect(res.status).toBe(401);
  });

  it("returns 400 when id is not a number", async () => {
    const res = await POST(makeReq(validBody), makeCtx("not-a-number"));
    expect(res.status).toBe(400);
  });

  it("returns 404 when team not found", async () => {
    mockGetTeamById.mockResolvedValue(null);
    const res = await POST(makeReq(validBody), makeCtx());
    expect(res.status).toBe(404);
  });

  it("returns 403 when advisor is not owner", async () => {
    mockGetTeamById.mockResolvedValue({ id: 1, name: "Alpha Team", owner_professional_id: 99 });
    const res = await POST(makeReq(validBody), makeCtx());
    expect(res.status).toBe(403);
  });

  it("returns 400 when body invalid JSON", async () => {
    const req = new Request("http://localhost/api/expert-teams/1/invite", { method: "POST" }) as unknown as NextRequest;
    const res = await POST(req, makeCtx());
    expect(res.status).toBe(400);
  });

  it("returns 400 when email missing", async () => {
    const res = await POST(makeReq({ role: "member" }), makeCtx());
    expect(res.status).toBe(400);
  });

  it("returns 200 on success", async () => {
    const res = await POST(makeReq(validBody), makeCtx());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.invitation).toBeDefined();
  });

  it("returns 409 when already pending", async () => {
    mockInviteMember.mockRejectedValue(new Error("invitation_already_pending"));
    const res = await POST(makeReq(validBody), makeCtx());
    expect(res.status).toBe(409);
  });

  it("returns 409 when already member", async () => {
    mockInviteMember.mockRejectedValue(new Error("already_member"));
    const res = await POST(makeReq(validBody), makeCtx());
    expect(res.status).toBe(409);
  });
});
