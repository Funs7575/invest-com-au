import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const mockGetUser = vi.fn(async () => ({
  data: { user: { id: "u1", email: "user@example.com" } },
  error: null,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}));

const mockGetKindsForUser = vi.fn(async () => [
  { kind: "investor", kindId: "k1", status: "active", displayLabel: "Investor" },
]);
const mockGetActiveKind = vi.fn(async () => "investor");
const mockIsWorkspaceKind = vi.fn((k: string) => ["investor", "advisor", "business", "expert_team", "firm"].includes(k));
const mockPortalForKind = vi.fn((k: string) => `/portal/${k}`);
const mockSetActiveKind = vi.fn(async () => {});

vi.mock("@/lib/account-kinds", () => ({
  getKindsForUser: (...args: unknown[]) => mockGetKindsForUser(...args),
  getActiveKind: (...args: unknown[]) => mockGetActiveKind(...args),
  isWorkspaceKind: (k: unknown) => mockIsWorkspaceKind(k as string),
  portalForKind: (k: unknown) => mockPortalForKind(k as string),
  setActiveKind: (...args: unknown[]) => mockSetActiveKind(...args),
}));

import { GET, POST } from "@/app/api/account/active-kind/route";

function makeReq(method = "GET", body?: unknown): NextRequest {
  return new Request(`http://localhost/api/account/active-kind`, {
    method,
    ...(body !== undefined
      ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } }
      : {}),
  }) as unknown as NextRequest;
}

describe("/api/account/active-kind", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1", email: "user@example.com" } }, error: null });
    mockGetKindsForUser.mockResolvedValue([
      { kind: "investor", kindId: "k1", status: "active", displayLabel: "Investor" },
    ]);
    mockGetActiveKind.mockResolvedValue("investor");
    mockIsWorkspaceKind.mockImplementation((k: string) => ["investor", "advisor", "business", "expert_team", "firm"].includes(k));
    mockPortalForKind.mockImplementation((k: string) => `/portal/${k}`);
    mockSetActiveKind.mockResolvedValue(undefined);
  });

  it("GET returns empty state for unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ memberships: [], active: null });
  });

  it("GET returns memberships for authenticated user", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.memberships).toBeDefined();
    expect(Array.isArray(json.memberships)).toBe(true);
  });

  it("POST rejects unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await POST(makeReq("POST", { kind: "investor" }));
    expect(res.status).toBe(401);
  });

  it("POST returns 400 for missing kind", async () => {
    const res = await POST(makeReq("POST", {}));
    expect(res.status).toBe(400);
  });

  it("POST returns 400 for unknown kind", async () => {
    mockIsWorkspaceKind.mockReturnValue(false);
    const res = await POST(makeReq("POST", { kind: "superadmin" }));
    expect(res.status).toBe(400);
  });

  it("POST returns 403 when user lacks membership for non-investor kind", async () => {
    mockGetKindsForUser.mockResolvedValue([]);
    mockIsWorkspaceKind.mockReturnValue(true);
    const res = await POST(makeReq("POST", { kind: "advisor" }));
    expect(res.status).toBe(403);
  });

  it("POST succeeds for investor kind (lazy-provisioned)", async () => {
    mockGetKindsForUser.mockResolvedValue([]);
    mockIsWorkspaceKind.mockReturnValue(true);
    const res = await POST(makeReq("POST", { kind: "investor" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.kind).toBe("investor");
  });
});
