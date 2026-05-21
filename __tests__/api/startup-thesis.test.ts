import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockGetUser, mockFromChain, mockUpsert } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFromChain: vi.fn(),
  mockUpsert: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFromChain,
  })),
}));

vi.mock("@/lib/investor-profiles", () => ({
  upsertInvestorProfile: mockUpsert,
  getInvestorProfile: vi.fn(async () => null),
}));

// ─── Imports after mocks ──────────────────────────────────────────────────────

import { GET, PUT } from "@/app/api/account/startup-thesis/route";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const USER_ID = "user-thesis-001";

const VALID_THESIS = {
  sector_tags: ["fintech", "saas"],
  stage_preferences: ["pre_seed", "seed"],
  min_ticket_aud: 10000,
  max_ticket_aud: 100000,
  geography: ["australia"],
};

function makeGetReq(): NextRequest {
  return new NextRequest("http://localhost/api/account/startup-thesis", { method: "GET" });
}

function makePutReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/account/startup-thesis", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function buildFromChain(meta: Record<string, unknown> | null = null) {
  return vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: meta ? { meta } : null, error: null }),
  }));
}

// ─── GET tests ────────────────────────────────────────────────────────────────

describe("GET /api/account/startup-thesis", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } } });
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    mockFromChain.mockImplementation(buildFromChain());
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns null thesis when no investor profile", async () => {
    mockFromChain.mockImplementation(buildFromChain(null));
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json() as { thesis: null };
    expect(body.thesis).toBeNull();
  });

  it("returns null thesis when meta has no startup_thesis key", async () => {
    mockFromChain.mockImplementation(buildFromChain({ other_key: "value" }));
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json() as { thesis: null };
    expect(body.thesis).toBeNull();
  });

  it("returns existing thesis from meta", async () => {
    mockFromChain.mockImplementation(buildFromChain({ startup_thesis: VALID_THESIS }));
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json() as { thesis: typeof VALID_THESIS };
    expect(body.thesis).toEqual(VALID_THESIS);
  });
});

// ─── PUT tests ────────────────────────────────────────────────────────────────

describe("PUT /api/account/startup-thesis", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID } } });
    mockFromChain.mockImplementation(buildFromChain({}));
    mockUpsert.mockResolvedValue(true);
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await PUT(makePutReq(VALID_THESIS));
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid sector_tag enum value", async () => {
    const res = await PUT(makePutReq({ ...VALID_THESIS, sector_tags: ["not_a_sector"] }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid stage preference", async () => {
    const res = await PUT(makePutReq({ ...VALID_THESIS, stage_preferences: ["phase_x"] }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for too many sector_tags (>10)", async () => {
    const tags = Array.from({ length: 11 }, (_, i) => VALID_THESIS.sector_tags[0]!);
    const res = await PUT(makePutReq({ ...VALID_THESIS, sector_tags: tags }));
    expect(res.status).toBe(400);
  });

  it("saves valid thesis and returns 200", async () => {
    const res = await PUT(makePutReq(VALID_THESIS));
    expect(res.status).toBe(200);
    const body = await res.json() as { thesis: typeof VALID_THESIS };
    expect(body.thesis.sector_tags).toEqual(VALID_THESIS.sector_tags);
    expect(mockUpsert).toHaveBeenCalledWith(
      USER_ID,
      expect.objectContaining({
        meta: expect.objectContaining({ startup_thesis: VALID_THESIS }),
      }),
    );
  });

  it("merges thesis into existing meta without clobbering other keys", async () => {
    mockFromChain.mockImplementation(buildFromChain({ existing_key: "keep_me" }));
    await PUT(makePutReq(VALID_THESIS));
    expect(mockUpsert).toHaveBeenCalledWith(
      USER_ID,
      expect.objectContaining({
        meta: expect.objectContaining({
          existing_key: "keep_me",
          startup_thesis: VALID_THESIS,
        }),
      }),
    );
  });

  it("accepts empty arrays (investor with no preferences yet)", async () => {
    const res = await PUT(makePutReq({ sector_tags: [], stage_preferences: [], geography: [] }));
    expect(res.status).toBe(200);
  });

  it("returns 500 when upsert fails", async () => {
    mockUpsert.mockResolvedValue(false);
    const res = await PUT(makePutReq(VALID_THESIS));
    expect(res.status).toBe(500);
  });
});
