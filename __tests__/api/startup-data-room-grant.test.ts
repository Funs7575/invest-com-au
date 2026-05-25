import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockRequireStartupSession, mockGetUser, mockServerFrom } = vi.hoisted(() => ({
  mockRequireStartupSession: vi.fn(),
  mockGetUser: vi.fn(),
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
    Promise.resolve({
      auth: { getUser: mockGetUser },
      from: mockServerFrom,
    }),
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

import { POST } from "@/app/api/startups/data-room/grant/route";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STARTUP_ID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
const FILE_ID = "b1ffc344-9c0b-4ef8-bb6d-6bb9bd380b22";
const INQUIRY_ID = "c2d04567-9c0b-4ef8-bb6d-6bb9bd380c33";
const INVESTOR_USER_ID = "d3e15678-9c0b-4ef8-bb6d-6bb9bd380d44";
const GRANTED_BY_USER_ID = "e4f26789-9c0b-4ef8-bb6d-6bb9bd380e55";

const VALID_BODY = { file_id: FILE_ID, inquiry_id: INQUIRY_ID };

function makeReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/startups/data-room/grant", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function setupServerFrom({
  inquiryData = { id: INQUIRY_ID, investor_user_id: INVESTOR_USER_ID, round_id: "f5b37890-9c0b-4ef8-bb6d-6bb9bd380f66" } as Record<string, unknown> | null,
  roundData = { startup_id: STARTUP_ID } as Record<string, unknown> | null,
  fileData = { id: FILE_ID } as Record<string, unknown> | null,
  existingGrant = null as Record<string, unknown> | null,
  grantInsert = { id: "grant-uuid-1" } as Record<string, unknown> | null,
  grantInsertError = null as { message: string } | null,
  grantUpdateError = null as { message: string } | null,
} = {}) {
  mockServerFrom.mockImplementation((table: string) => {
    if (table === "startup_investor_inquiries") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: inquiryData }),
        update: vi.fn().mockReturnThis(),
      };
    }
    if (table === "startup_rounds") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: roundData }),
      };
    }
    if (table === "startup_data_room_files") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: fileData }),
      };
    }
    if (table === "startup_data_room_access") {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: existingGrant }),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: grantInsert, error: grantInsertError }),
      };
      // update path
      const updateChain = {
        ...chain,
        eq: vi.fn().mockResolvedValue({ error: grantUpdateError }),
      };
      if (existingGrant?.revoked_at) {
        chain.update = vi.fn().mockReturnValue(updateChain);
      }
      return chain;
    }
    return { update: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({}) };
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("POST /api/startups/data-room/grant", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireStartupSession.mockResolvedValue(STARTUP_ID);
    mockGetUser.mockResolvedValue({ data: { user: { id: GRANTED_BY_USER_ID } } });
    setupServerFrom();
  });

  it("returns 401 when no startup session", async () => {
    mockRequireStartupSession.mockResolvedValue(null);
    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(401);
  });

  it("returns 401 when no authenticated user", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(401);
  });

  it("returns 400 on invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/startups/data-room/grant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 on missing required fields", async () => {
    const res = await POST(makeReq({ file_id: "not-a-uuid" }));
    expect(res.status).toBe(400);
    const json = await res.json() as { error: string };
    expect(json.error).toBe("Invalid request");
  });

  it("returns 404 when inquiry not found", async () => {
    setupServerFrom({ inquiryData: null });
    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(404);
  });

  it("returns 403 when round belongs to a different startup", async () => {
    setupServerFrom({ roundData: { startup_id: "different-startup" } });
    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(403);
  });

  it("returns 403 when round not found", async () => {
    setupServerFrom({ roundData: null });
    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(403);
  });

  it("returns 404 when file not found", async () => {
    setupServerFrom({ fileData: null });
    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(404);
  });

  it("returns 200 with already_granted=true when grant already active", async () => {
    setupServerFrom({ existingGrant: { id: "grant-uuid-1", revoked_at: null } });
    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(200);
    const json = await res.json() as { already_granted: boolean; id: string };
    expect(json.already_granted).toBe(true);
    expect(json.id).toBe("grant-uuid-1");
  });

  it("returns 500 on grant insert error", async () => {
    setupServerFrom({ grantInsertError: { message: "insert failed" } });
    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(500);
  });

  it("returns 201 on new grant success", async () => {
    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(201);
    const json = await res.json() as { id: string };
    expect(json.id).toBe("grant-uuid-1");
  });
});
