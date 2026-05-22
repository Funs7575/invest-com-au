/**
 * Tests for POST /api/admin/fin-objection/[id].
 *
 * NOT gated by requireAdmin — uses a narrower FIN_OBJECTION_EMAILS allowlist
 * (admin != Fin). Auth flow: createClient().auth.getUser() then membership
 * check via getFinObjectionEmails(). On success it stamps fin_objection_at
 * on a `review_passed` editorial article (404 if no row matches) and writes
 * an admin_audit_log row.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockGetUser, mockGetFinObjectionEmails, mockAdminFrom } = vi.hoisted(
  () => ({
    mockGetUser: vi.fn(),
    mockGetFinObjectionEmails: vi.fn(),
    mockAdminFrom: vi.fn(),
  }),
);

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: mockGetUser } })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

vi.mock("@/lib/admin", () => ({
  getFinObjectionEmails: () => mockGetFinObjectionEmails(),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  })),
}));

import { POST } from "@/app/api/admin/fin-objection/[id]/route";

function makeReq(id: string) {
  return new NextRequest(`http://localhost/api/admin/fin-objection/${id}`, {
    method: "POST",
  });
}

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

const FIN = { id: "fin-1", email: "fin@invest.com.au" };

/**
 * Build an admin client whose `editorial_articles` chain resolves the given
 * single() result, and whose `admin_audit_log` insert is captured.
 */
function setupAdmin(
  singleResult: { data: unknown; error: { message: string } | null },
  auditSpy = vi.fn(),
) {
  mockAdminFrom.mockImplementation((table: string) => {
    if (table === "admin_audit_log") {
      return { insert: vi.fn(async (row: unknown) => auditSpy(row)) };
    }
    const builder: Record<string, unknown> = {};
    const chain = () => builder;
    builder.update = vi.fn(chain);
    builder.eq = vi.fn(chain);
    builder.select = vi.fn(chain);
    builder.single = vi.fn(async () => singleResult);
    return builder;
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: FIN }, error: null });
  mockGetFinObjectionEmails.mockReturnValue(["fin@invest.com.au"]);
  setupAdmin({
    data: { id: "10", fin_objection_at: "2026-05-20T00:00:00Z", status: "review_passed" },
    error: null,
  });
});

describe("POST /api/admin/fin-objection/[id]", () => {
  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await POST(makeReq("10"), ctx("10"));
    expect(res.status).toBe(401);
  });

  it("returns 403 when the user is not on the fin-objection allowlist", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "u9", email: "rando@example.com" } },
      error: null,
    });
    const res = await POST(makeReq("10"), ctx("10"));
    expect(res.status).toBe(403);
  });

  it("stamps fin_objection_at and writes an audit log row", async () => {
    const auditSpy = vi.fn();
    setupAdmin(
      {
        data: {
          id: "10",
          fin_objection_at: "2026-05-20T00:00:00Z",
          status: "review_passed",
        },
        error: null,
      },
      auditSpy,
    );
    const res = await POST(makeReq("10"), ctx("10"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.id).toBe("10");
    expect(json.fin_objection_at).toBe("2026-05-20T00:00:00Z");
    expect(auditSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "editorial_article:fin_objection",
        admin_email: "fin@invest.com.au",
      }),
    );
  });

  it("returns 500 on a DB error", async () => {
    setupAdmin({ data: null, error: { message: "boom" } });
    const res = await POST(makeReq("10"), ctx("10"));
    expect(res.status).toBe(500);
  });

  it("returns 404 when no review_passed article matches", async () => {
    setupAdmin({ data: null, error: null });
    const res = await POST(makeReq("10"), ctx("10"));
    expect(res.status).toBe(404);
  });
});
