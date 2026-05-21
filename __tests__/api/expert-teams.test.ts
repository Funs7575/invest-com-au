import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const mockIsAllowed = vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => true);
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

const mockListTeams = vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => [{ id: 1, name: "Alpha Team" }]);
const mockCreateTeam = vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => ({ id: 1, name: "Alpha Team" }));

vi.mock("@/lib/expert-teams", () => ({
  listTeamsForProfessional: (...args: unknown[]) => mockListTeams(...args),
  createTeam: (...args: unknown[]) => mockCreateTeam(...args),
}));

vi.mock("@/lib/api-schemas", () => ({
  CreateExpertTeamRequest: {
    safeParse: (v: unknown) => {
      if (v && typeof v === "object" && "name" in v && "team_category" in v && "team_type" in v) {
        return { success: true, data: v as Record<string, unknown>, error: null };
      }
      return { success: false, error: { issues: [{ message: "name, team_category and team_type required" }] } };
    },
  },
}));

import { GET, POST } from "@/app/api/expert-teams/route";

function makeGetReq(): NextRequest {
  return new Request("http://localhost/api/expert-teams", { method: "GET" }) as unknown as NextRequest;
}

function makePostReq(body?: unknown): NextRequest {
  return new Request("http://localhost/api/expert-teams", {
    method: "POST",
    ...(body !== undefined ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } } : {}),
  }) as unknown as NextRequest;
}

const validBody = {
  name: "Alpha Team",
  team_category: "financial_advice",
  team_type: "multi_advisor",
};

describe("/api/expert-teams", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockRequireAdvisorSession.mockResolvedValue(42);
    mockListTeams.mockResolvedValue([{ id: 1, name: "Alpha Team" }]);
    mockCreateTeam.mockResolvedValue({ id: 1, name: "Alpha Team" });
  });

  // GET tests
  it("GET returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await GET(makeGetReq());
    expect(res.status).toBe(429);
  });

  it("GET returns 401 when no session", async () => {
    mockRequireAdvisorSession.mockResolvedValue(null);
    const res = await GET(makeGetReq());
    expect(res.status).toBe(401);
  });

  it("GET returns 200 with teams", async () => {
    const res = await GET(makeGetReq());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.teams).toBeDefined();
    expect(Array.isArray(json.teams)).toBe(true);
  });

  // POST tests
  it("POST returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(makePostReq(validBody));
    expect(res.status).toBe(429);
  });

  it("POST returns 401 when no session", async () => {
    mockRequireAdvisorSession.mockResolvedValue(null);
    const res = await POST(makePostReq(validBody));
    expect(res.status).toBe(401);
  });

  it("POST returns 400 when body invalid JSON", async () => {
    const req = new Request("http://localhost/api/expert-teams", { method: "POST" }) as unknown as NextRequest;
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("POST returns 400 when required fields missing", async () => {
    const res = await POST(makePostReq({ name: "Only name" }));
    expect(res.status).toBe(400);
  });

  it("POST returns 200 on success", async () => {
    const res = await POST(makePostReq(validBody));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.team).toBeDefined();
  });
});
