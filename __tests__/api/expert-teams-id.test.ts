import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

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
const mockListMembers = vi.fn(async () => [{ id: 1, professional_id: 42 }]);
const mockListInvitations = vi.fn(async () => []);
const mockIsProfessionalOnTeam = vi.fn(async () => false);

vi.mock("@/lib/expert-teams", () => ({
  getTeamById: (...args: unknown[]) => mockGetTeamById(...args),
  listMembers: (...args: unknown[]) => mockListMembers(...args),
  listInvitations: (...args: unknown[]) => mockListInvitations(...args),
  isProfessionalOnTeam: (...args: unknown[]) => mockIsProfessionalOnTeam(...args),
}));

import { GET } from "@/app/api/expert-teams/[id]/route";

function makeReq(): NextRequest {
  return new Request("http://localhost/api/expert-teams/1", { method: "GET" }) as unknown as NextRequest;
}

function makeCtx(id = "1") {
  return { params: Promise.resolve({ id }) } as { params: Promise<{ id: string }> };
}

describe("/api/expert-teams/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockRequireAdvisorSession.mockResolvedValue(42);
    mockGetTeamById.mockResolvedValue({ id: 1, name: "Alpha Team", owner_professional_id: 42 });
    mockListMembers.mockResolvedValue([{ id: 1, professional_id: 42 }]);
    mockListInvitations.mockResolvedValue([]);
    mockIsProfessionalOnTeam.mockResolvedValue(false);
  });

  it("returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await GET(makeReq(), makeCtx());
    expect(res.status).toBe(429);
  });

  it("returns 401 when no session", async () => {
    mockRequireAdvisorSession.mockResolvedValue(null);
    const res = await GET(makeReq(), makeCtx());
    expect(res.status).toBe(401);
  });

  it("returns 400 when id is not a number", async () => {
    const res = await GET(makeReq(), makeCtx("not-a-number"));
    expect(res.status).toBe(400);
  });

  it("returns 404 when team not found", async () => {
    mockGetTeamById.mockResolvedValue(null);
    const res = await GET(makeReq(), makeCtx());
    expect(res.status).toBe(404);
  });

  it("returns 403 when advisor is not a member", async () => {
    // owner_professional_id != advisorId, not on team
    mockGetTeamById.mockResolvedValue({ id: 1, name: "Alpha Team", owner_professional_id: 99 });
    mockIsProfessionalOnTeam.mockResolvedValue(false);
    const res = await GET(makeReq(), makeCtx());
    expect(res.status).toBe(403);
  });

  it("returns 200 when advisor is the owner", async () => {
    const res = await GET(makeReq(), makeCtx());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.team).toBeDefined();
    expect(json.members).toBeDefined();
    expect(json.invitations).toBeDefined();
  });

  it("returns 200 when advisor is a member but not owner", async () => {
    mockGetTeamById.mockResolvedValue({ id: 1, name: "Alpha Team", owner_professional_id: 99 });
    mockIsProfessionalOnTeam.mockResolvedValue(true);
    const res = await GET(makeReq(), makeCtx());
    expect(res.status).toBe(200);
  });
});
