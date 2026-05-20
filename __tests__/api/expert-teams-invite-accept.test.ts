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

const mockAcceptInvitation = vi.fn(async () => ({ teamId: 1 }));

vi.mock("@/lib/expert-teams", () => ({
  acceptInvitation: (...args: unknown[]) => mockAcceptInvitation(...args),
}));

vi.mock("@/lib/api-schemas", () => ({
  AcceptExpertTeamInvitationRequest: {
    safeParse: (v: unknown) => {
      if (v && typeof v === "object" && "token" in v && typeof (v as Record<string, unknown>).token === "string") {
        return { success: true, data: v as Record<string, unknown>, error: null };
      }
      return { success: false, error: { issues: [{ message: "token required" }] } };
    },
  },
}));

import { POST } from "@/app/api/expert-teams/invite/accept/route";

function makeReq(body?: unknown): NextRequest {
  return new Request("http://localhost/api/expert-teams/invite/accept", {
    method: "POST",
    ...(body !== undefined ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } } : {}),
  }) as unknown as NextRequest;
}

describe("/api/expert-teams/invite/accept", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockRequireAdvisorSession.mockResolvedValue(42);
    mockAcceptInvitation.mockResolvedValue({ teamId: 1 });
  });

  it("returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(makeReq({ token: "tok123" }));
    expect(res.status).toBe(429);
  });

  it("returns 401 when no session", async () => {
    mockRequireAdvisorSession.mockResolvedValue(null);
    const res = await POST(makeReq({ token: "tok123" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when body invalid JSON", async () => {
    const req = new Request("http://localhost/api/expert-teams/invite/accept", { method: "POST" }) as unknown as NextRequest;
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when token missing", async () => {
    const res = await POST(makeReq({ something: "else" }));
    expect(res.status).toBe(400);
  });

  it("returns 200 on success", async () => {
    const res = await POST(makeReq({ token: "tok123" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.team_id).toBe(1);
  });

  it("returns 404 when invitation invalid", async () => {
    mockAcceptInvitation.mockRejectedValue(new Error("invalid_invitation"));
    const res = await POST(makeReq({ token: "bad-token" }));
    expect(res.status).toBe(404);
  });

  it("returns 410 when invitation unavailable", async () => {
    mockAcceptInvitation.mockRejectedValue(new Error("invitation_unavailable"));
    const res = await POST(makeReq({ token: "used-token" }));
    expect(res.status).toBe(410);
  });

  it("returns 410 when invitation expired", async () => {
    mockAcceptInvitation.mockRejectedValue(new Error("invitation_expired"));
    const res = await POST(makeReq({ token: "expired-token" }));
    expect(res.status).toBe(410);
  });
});
