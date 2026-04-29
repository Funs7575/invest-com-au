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

import { POST } from "@/app/api/admin/foreign-investment/update/route";

const ADMIN_USER = { email: "admin@test.com" };

function makeReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/foreign-investment/update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const VALID_BODY = {
  table: "fi_tax_brackets",
  id: "uuid-1",
  updates: { rate: 0.32 },
  categoryKey: "tax_brackets",
  note: "Updated rate",
};

function makeOkChain() {
  let call = 0;
  return vi.fn(() => {
    call++;
    if (call === 1) {
      // select current row
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: "uuid-1", rate: 0.3 }, error: null }),
      };
    }
    // update + audit inserts
    return {
      update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) }),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/admin/foreign-investment/update", () => {
  it("returns 401 when no session", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(401);
  });

  it("returns 403 when user email not in admin list", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { email: "other@test.com" } } });
    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(403);
  });

  it("returns 400 on invalid JSON", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER } });
    const req = new NextRequest("http://localhost/api/admin/foreign-investment/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when required fields are missing", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER } });
    const res = await POST(makeReq({ table: "fi_tax_brackets" })); // missing id, updates, categoryKey
    expect(res.status).toBe(400);
  });

  it("returns 400 when table not in allowed list", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER } });
    const res = await POST(makeReq({ ...VALID_BODY, table: "users" }));
    expect(res.status).toBe(400);
  });

  it("returns 200 and busts cache on successful update", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER } });
    mockFrom.mockImplementation(makeOkChain());
    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.table).toBe("fi_tax_brackets");
    expect(mockRevalidateTag).toHaveBeenCalledWith("fi-data", {});
  });

  it("returns 500 when DB update fails", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER } });
    let call = 0;
    mockFrom.mockImplementation(() => {
      call++;
      if (call === 1) {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      }
      return {
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: { message: "update failed" } }),
        }),
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    });
    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(500);
  });
});
