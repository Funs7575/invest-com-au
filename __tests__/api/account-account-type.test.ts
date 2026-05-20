import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const mockGetUser = vi.fn(async () => ({
  data: { user: { id: "u1", email: "user@example.com" } },
  error: null,
}));

function makeBuilder(result: unknown = { data: null, error: null }) {
  const b: Record<string, unknown> = {};
  for (const m of ["select","insert","update","upsert","delete","eq","neq","gt","gte","lt","lte","in","is","not","or","order","limit","range","single","maybeSingle","filter","contains"]) {
    b[m] = vi.fn(() => b);
  }
  b.then = (cb: (v: unknown) => unknown) => Promise.resolve(cb(result));
  return b;
}

const mockFrom = vi.fn(() => makeBuilder());

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from: mockFrom,
    auth: { getUser: mockGetUser },
  })),
}));

const mockGetInvestorProfile = vi.fn(async () => ({
  meta: { account_type: "individual" },
}));
const mockUpsertInvestorProfile = vi.fn(async () => true);

vi.mock("@/lib/investor-profiles", () => ({
  getInvestorProfile: (...args: unknown[]) => mockGetInvestorProfile(...args),
  upsertInvestorProfile: (...args: unknown[]) => mockUpsertInvestorProfile(...args),
}));

vi.mock("@/lib/account-types", () => ({
  getInvestorAccountType: vi.fn((meta: Record<string, unknown>) => meta.account_type ?? "individual"),
}));

import { GET, PUT } from "@/app/api/account/account-type/route";

function makeReq(method = "GET", body?: unknown): NextRequest {
  return new Request(`http://localhost/api/account/account-type`, {
    method,
    ...(body !== undefined
      ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } }
      : {}),
  }) as unknown as NextRequest;
}

describe("/api/account/account-type", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: "u1", email: "user@example.com" } },
      error: null,
    });
    mockGetInvestorProfile.mockResolvedValue({ meta: { account_type: "individual" } });
    mockUpsertInvestorProfile.mockResolvedValue(true);
  });

  it("GET rejects unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("GET returns account_type for authenticated user", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("account_type");
  });

  it("PUT rejects unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await PUT(makeReq("PUT", { account_type: "individual" }));
    expect(res.status).toBe(401);
  });

  it("PUT returns 400 for invalid account_type", async () => {
    const res = await PUT(makeReq("PUT", { account_type: "invalid" }));
    expect(res.status).toBe(400);
  });

  it("PUT updates account_type successfully", async () => {
    const res = await PUT(makeReq("PUT", { account_type: "couple" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.account_type).toBe("couple");
  });

  it("PUT returns 500 when upsert fails", async () => {
    mockUpsertInvestorProfile.mockResolvedValue(false);
    const res = await PUT(makeReq("PUT", { account_type: "family" }));
    expect(res.status).toBe(500);
  });
});
