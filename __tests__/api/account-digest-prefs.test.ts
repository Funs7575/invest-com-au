import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const mockGetUser = vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => ({
  data: { user: { id: "u1", email: "user@example.com" } },
  error: null,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}));

const mockGetInvestorProfile = vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => ({
  meta: { watchlist_digest: true, advisor_digest: false },
}));
const mockUpsertInvestorProfile = vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => true);

vi.mock("@/lib/investor-profiles", () => ({
  getInvestorProfile: (...args: unknown[]) => mockGetInvestorProfile(...args),
  upsertInvestorProfile: (...args: unknown[]) => mockUpsertInvestorProfile(...args),
}));

import { GET, PUT } from "@/app/api/account/digest-prefs/route";

function makeReq(method = "GET", body?: unknown): NextRequest {
  return new Request(`http://localhost/api/account/digest-prefs`, {
    method,
    ...(body !== undefined
      ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } }
      : {}),
  }) as unknown as NextRequest;
}

describe("/api/account/digest-prefs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1", email: "user@example.com" } }, error: null });
    mockGetInvestorProfile.mockResolvedValue({ meta: { watchlist_digest: true, advisor_digest: false } });
    mockUpsertInvestorProfile.mockResolvedValue(true);
  });

  it("GET rejects unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("GET returns digest prefs for authenticated user", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("prefs");
    expect(json.prefs).toHaveProperty("watchlist_digest");
    expect(json.prefs).toHaveProperty("advisor_digest");
  });

  it("GET defaults to false for unset prefs", async () => {
    mockGetInvestorProfile.mockResolvedValue({ meta: {} });
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.prefs.watchlist_digest).toBe(false);
    expect(json.prefs.advisor_digest).toBe(false);
  });

  it("GET defaults research_digest to true (opt-out pref)", async () => {
    mockGetInvestorProfile.mockResolvedValue({ meta: {} });
    const res = await GET();
    const json = await res.json();
    expect(json.prefs.research_digest).toBe(true);
  });

  it("GET reflects an explicit research_digest opt-out", async () => {
    mockGetInvestorProfile.mockResolvedValue({ meta: { research_digest: false } });
    const res = await GET();
    const json = await res.json();
    expect(json.prefs.research_digest).toBe(false);
  });

  it("PUT can opt out of research_digest", async () => {
    const res = await PUT(makeReq("PUT", { research_digest: false }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.prefs.research_digest).toBe(false);
    const patch = mockUpsertInvestorProfile.mock.calls[0]?.[1] as { meta: Record<string, unknown> };
    expect(patch.meta.research_digest).toBe(false);
  });

  it("PUT rejects unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await PUT(makeReq("PUT", { watchlist_digest: true }));
    expect(res.status).toBe(401);
  });

  it("PUT returns 400 for invalid body (non-boolean)", async () => {
    const res = await PUT(makeReq("PUT", { watchlist_digest: "yes" }));
    expect(res.status).toBe(400);
  });

  it("PUT updates prefs successfully", async () => {
    const res = await PUT(makeReq("PUT", { watchlist_digest: false, advisor_digest: true }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("prefs");
  });

  it("PUT returns 500 when upsert fails", async () => {
    mockUpsertInvestorProfile.mockResolvedValue(false);
    const res = await PUT(makeReq("PUT", { watchlist_digest: true }));
    expect(res.status).toBe(500);
  });
});
