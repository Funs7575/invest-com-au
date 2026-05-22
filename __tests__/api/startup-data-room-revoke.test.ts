import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockRequireStartupSession, mockServerFrom } = vi.hoisted(() => ({
  mockRequireStartupSession: vi.fn(),
  mockServerFrom: vi.fn(),
}));

vi.mock("@/lib/require-startup-session", () => ({
  requireStartupSession: mockRequireStartupSession,
}));
vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: () =>
    Promise.resolve({ from: mockServerFrom }),
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

import { POST } from "@/app/api/startups/data-room/revoke/route";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STARTUP_ID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
const GRANT_ID = "b1ffc344-9c0b-4ef8-bb6d-6bb9bd380b22";

function makeReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/startups/data-room/revoke", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeRevokeChain(data: { id: string } | null, error: { message: string } | null = null) {
  return {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data, error }),
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("POST /api/startups/data-room/revoke", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireStartupSession.mockResolvedValue(STARTUP_ID);
    mockServerFrom.mockReturnValue(makeRevokeChain({ id: GRANT_ID }));
  });

  it("returns 401 when no startup session", async () => {
    mockRequireStartupSession.mockResolvedValue(null);
    const res = await POST(makeReq({ grant_id: GRANT_ID }));
    expect(res.status).toBe(401);
  });

  it("returns 400 on invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/startups/data-room/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 on invalid grant_id (not UUID)", async () => {
    const res = await POST(makeReq({ grant_id: "not-a-uuid" }));
    expect(res.status).toBe(400);
  });

  it("returns 500 on DB update error", async () => {
    mockServerFrom.mockReturnValue(makeRevokeChain(null, { message: "update failed" }));
    const res = await POST(makeReq({ grant_id: GRANT_ID }));
    expect(res.status).toBe(500);
  });

  it("returns 404 when grant not found or not owned by caller", async () => {
    mockServerFrom.mockReturnValue(makeRevokeChain(null));
    const res = await POST(makeReq({ grant_id: GRANT_ID }));
    expect(res.status).toBe(404);
  });

  it("returns 200 ok on successful revoke", async () => {
    const res = await POST(makeReq({ grant_id: GRANT_ID }));
    expect(res.status).toBe(200);
    const json = await res.json() as { ok: boolean };
    expect(json.ok).toBe(true);
  });
});
