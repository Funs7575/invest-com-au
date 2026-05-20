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

const mockSubmitForVerification = vi.fn(async () => ({ id: 1, name: "Alpha Team", status: "pending_verification" }));

vi.mock("@/lib/expert-teams", () => ({
  submitForVerification: (...args: unknown[]) => mockSubmitForVerification(...args),
}));

import { POST } from "@/app/api/expert-teams/[id]/submit/route";

function makeReq(): NextRequest {
  return new Request("http://localhost/api/expert-teams/1/submit", {
    method: "POST",
    headers: { "content-type": "application/json" },
  }) as unknown as NextRequest;
}

function makeCtx(id = "1") {
  return { params: Promise.resolve({ id }) } as { params: Promise<{ id: string }> };
}

describe("/api/expert-teams/[id]/submit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockRequireAdvisorSession.mockResolvedValue(42);
    mockSubmitForVerification.mockResolvedValue({ id: 1, name: "Alpha Team", status: "pending_verification" });
  });

  it("returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(makeReq(), makeCtx());
    expect(res.status).toBe(429);
  });

  it("returns 401 when no session", async () => {
    mockRequireAdvisorSession.mockResolvedValue(null);
    const res = await POST(makeReq(), makeCtx());
    expect(res.status).toBe(401);
  });

  it("returns 400 when id is not a number", async () => {
    const res = await POST(makeReq(), makeCtx("not-a-number"));
    expect(res.status).toBe(400);
  });

  it("returns 404 when team not found", async () => {
    mockSubmitForVerification.mockRejectedValue(new Error("team_not_found"));
    const res = await POST(makeReq(), makeCtx());
    expect(res.status).toBe(404);
  });

  it("returns 403 when not owner", async () => {
    mockSubmitForVerification.mockRejectedValue(new Error("not_owner"));
    const res = await POST(makeReq(), makeCtx());
    expect(res.status).toBe(403);
  });

  it("returns 400 when team is incomplete", async () => {
    mockSubmitForVerification.mockRejectedValue(new Error("incomplete:name,description"));
    const res = await POST(makeReq(), makeCtx());
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.missing).toEqual(["name", "description"]);
  });

  it("returns 200 on success", async () => {
    const res = await POST(makeReq(), makeCtx());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.team).toBeDefined();
  });
});
