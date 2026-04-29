import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockGetUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => ({ auth: { getUser: () => mockGetUser() } })),
}));

const mockFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock("@/lib/admin", () => ({
  getAdminEmails: () => ["admin@test.com"],
}));

const mockRevalidateTag = vi.fn();
vi.mock("next/cache", () => ({
  revalidateTag: (...args: unknown[]) => mockRevalidateTag(...args),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

import { POST } from "@/app/api/admin/foreign-investment/verify/route";

const ADMIN_USER = { email: "admin@test.com" };

function makeReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/foreign-investment/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeOkChain() {
  return vi.fn(() => ({
    update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) }),
    insert: vi.fn().mockResolvedValue({ data: null, error: null }),
  }));
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/admin/foreign-investment/verify", () => {
  it("returns 401 when no session", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(makeReq({ categoryKey: "tax_brackets" }));
    expect(res.status).toBe(401);
  });

  it("returns 403 when user email not in admin list", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { email: "other@test.com" } } });
    const res = await POST(makeReq({ categoryKey: "tax_brackets" }));
    expect(res.status).toBe(403);
  });

  it("returns 400 on invalid JSON", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER } });
    const req = new NextRequest("http://localhost/api/admin/foreign-investment/verify", {
      method: "POST",
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when categoryKey is missing", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER } });
    const res = await POST(makeReq({}));
    expect(res.status).toBe(400);
  });

  it("marks category verified and busts fi-data + fi-data-categories cache", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER } });
    mockFrom.mockImplementation(makeOkChain());
    const res = await POST(makeReq({ categoryKey: "tax_brackets", note: "Manually checked" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.categoryKey).toBe("tax_brackets");
    expect(body.verifiedBy).toBe("admin@test.com");
    expect(mockRevalidateTag).toHaveBeenCalledWith("fi-data", {});
    expect(mockRevalidateTag).toHaveBeenCalledWith("fi-data-categories", {});
  });

  it("returns 500 when DB update fails", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER } });
    mockFrom.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: { message: "db error" } }),
      }),
    });
    const res = await POST(makeReq({ categoryKey: "tax_brackets" }));
    expect(res.status).toBe(500);
  });
});
