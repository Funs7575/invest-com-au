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
  getFinObjectionEmails: () => ["fin@test.com"],
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

import { POST } from "@/app/api/admin/fin-objection/[id]/route";

const FIN_USER = { email: "fin@test.com" };

function makeReq(id: string): [NextRequest, { params: Promise<{ id: string }> }] {
  const req = new NextRequest(`http://localhost/api/admin/fin-objection/${id}`, {
    method: "POST",
  });
  return [req, { params: Promise.resolve({ id }) }];
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/admin/fin-objection/[id]", () => {
  it("returns 401 when no session", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const [req, ctx] = makeReq("art-1");
    const res = await POST(req, ctx);
    expect(res.status).toBe(401);
  });

  it("returns 403 when email not in fin-objection allowlist", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { email: "admin@other.com" } } });
    const [req, ctx] = makeReq("art-1");
    const res = await POST(req, ctx);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/fin-objection/i);
  });

  it("stamps fin_objection_at and writes audit log on success", async () => {
    mockGetUser.mockResolvedValue({ data: { user: FIN_USER } });
    const articleData = { id: "art-1", fin_objection_at: new Date().toISOString(), status: "review_passed" };
    let call = 0;
    mockFrom.mockImplementation(() => {
      call++;
      if (call === 1) {
        // update editorial_articles
        return {
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: articleData, error: null }),
        };
      }
      // admin_audit_log insert
      return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) };
    });
    const [req, ctx] = makeReq("art-1");
    const res = await POST(req, ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe("art-1");
    expect(body.fin_objection_at).toBeDefined();
  });

  it("returns 404 when article not found or not in review_passed state", async () => {
    mockGetUser.mockResolvedValue({ data: { user: FIN_USER } });
    mockFrom.mockReturnValue({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    });
    const [req, ctx] = makeReq("not-found");
    const res = await POST(req, ctx);
    expect(res.status).toBe(404);
  });

  it("returns 500 when DB update returns error", async () => {
    mockGetUser.mockResolvedValue({ data: { user: FIN_USER } });
    mockFrom.mockReturnValue({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: "constraint violation" } }),
    });
    const [req, ctx] = makeReq("art-err");
    const res = await POST(req, ctx);
    expect(res.status).toBe(500);
  });
});
