import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const { mockGetUser, mockUpsertInvestorProfile } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockUpsertInvestorProfile: vi.fn(),
}));

// from("investor_profiles").select("meta").eq().maybeSingle()
let metaResult: { data: { meta: Record<string, unknown> | null } | null } = { data: null };
const mockFrom = vi.fn(() => {
  const b: Record<string, unknown> = {};
  b.select = vi.fn(() => b);
  b.eq = vi.fn(() => b);
  b.maybeSingle = vi.fn(async () => metaResult);
  return b;
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

vi.mock("@/lib/investor-profiles", () => ({
  upsertInvestorProfile: (...args: unknown[]) => mockUpsertInvestorProfile(...args),
}));

import { GET, PUT } from "@/app/api/account/startup-thesis/route";

const USER = { id: "user-1", email: "user@example.com" };

function makePut(body: unknown): NextRequest {
  return new Request("http://localhost/api/account/startup-thesis", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

describe("/api/account/startup-thesis", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: USER }, error: null });
    mockUpsertInvestorProfile.mockResolvedValue(true);
    metaResult = { data: null };
  });

  // ── GET ──────────────────────────────────────────────────────────────────
  it("GET returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("GET returns null thesis when no profile row exists", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const json = (await res.json()) as { thesis: unknown };
    expect(json.thesis).toBeNull();
  });

  it("GET returns the stored startup_thesis from meta", async () => {
    metaResult = { data: { meta: { startup_thesis: { sector_tags: ["fintech"] }, other: 1 } } };
    const res = await GET();
    expect(res.status).toBe(200);
    const json = (await res.json()) as { thesis: { sector_tags: string[] } };
    expect(json.thesis.sector_tags).toEqual(["fintech"]);
  });

  // ── PUT ──────────────────────────────────────────────────────────────────
  it("PUT returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    const res = await PUT(makePut({ sector_tags: ["fintech"] }));
    expect(res.status).toBe(401);
  });

  it("PUT returns 400 for an invalid sector tag", async () => {
    const res = await PUT(makePut({ sector_tags: ["not_a_sector"] }));
    expect(res.status).toBe(400);
    expect(mockUpsertInvestorProfile).not.toHaveBeenCalled();
  });

  it("PUT returns 400 when sector_tags exceeds the max of 10", async () => {
    const tooMany = Array.from({ length: 11 }, () => "fintech");
    const res = await PUT(makePut({ sector_tags: tooMany }));
    expect(res.status).toBe(400);
  });

  it("PUT merges thesis into existing meta and returns the saved body", async () => {
    metaResult = { data: { meta: { existing_key: "keep" } } };
    const body = { sector_tags: ["saas"], stage_preferences: ["seed"], min_ticket_aud: 25000 };
    const res = await PUT(makePut(body));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { thesis: typeof body };
    expect(json.thesis).toEqual(body);
    // The merge must preserve other meta keys.
    const upsertArg = mockUpsertInvestorProfile.mock.calls[0]?.[1] as { meta: Record<string, unknown> };
    expect(upsertArg.meta).toMatchObject({ existing_key: "keep", startup_thesis: body });
  });

  it("PUT returns 500 when the upsert fails", async () => {
    mockUpsertInvestorProfile.mockResolvedValueOnce(false);
    const res = await PUT(makePut({ sector_tags: ["saas"] }));
    expect(res.status).toBe(500);
  });
});
