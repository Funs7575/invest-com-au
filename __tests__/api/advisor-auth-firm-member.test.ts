import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { createChainableBuilder } from "@/__tests__/helpers";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockServerFrom = vi.fn();
const mockAdminFrom = vi.fn();
const supabaseCalls: Record<string, { method: string; args: unknown[] }[]> = {};

// vi.hoisted() — vi.mock factories are hoisted; the captured fn must be too.
// Post-C-02 the route delegates auth to requireAdvisorSession (helper).
const { mockRequireAdvisorSession } = vi.hoisted(() => ({
  mockRequireAdvisorSession: vi.fn(),
}));

vi.mock("@/lib/require-advisor-session", () => ({
  requireAdvisorSession: mockRequireAdvisorSession,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ from: mockServerFrom })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockAdminFrom }),
}));

import { PATCH, DELETE } from "@/app/api/advisor-auth/firm/member/route";

function makePatch(body: unknown, cookie?: string): NextRequest {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (cookie) headers.cookie = `advisor_session=${cookie}`;
  return new NextRequest("http://localhost/api/advisor-auth/firm/member", {
    method: "PATCH",
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers,
  });
}

function makeDelete(memberId: number | string, cookie?: string): NextRequest {
  const headers: Record<string, string> = {};
  if (cookie) headers.cookie = `advisor_session=${cookie}`;
  return new NextRequest(
    `http://localhost/api/advisor-auth/firm/member?memberId=${memberId}`,
    {
      method: "DELETE",
      headers,
    },
  );
}

function withFirmAdmin(adminId = 42, firmId = 7) {
  // Post-C-02: helper handles auth; admin client handles professionals lookup.
  mockRequireAdvisorSession.mockResolvedValue(adminId);
  mockAdminFrom.mockImplementation((table: string) => {
    const b = createChainableBuilder(table, supabaseCalls);
    if (table === "professionals") {
      b.single = vi.fn(() =>
        Promise.resolve({
          data: {
            id: adminId,
            name: "Admin",
            firm_id: firmId,
            is_firm_admin: true,
          },
          error: null,
        }),
      );
    }
    return b;
  });
}

function resetCalls() {
  for (const k of Object.keys(supabaseCalls)) delete supabaseCalls[k];
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("PATCH /api/advisor-auth/firm/member", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetCalls();
    mockServerFrom.mockReset();
    mockAdminFrom.mockReset();
    mockServerFrom.mockImplementation((table: string) =>
      createChainableBuilder(table, supabaseCalls),
    );
    mockAdminFrom.mockImplementation((table: string) =>
      createChainableBuilder(table, supabaseCalls),
    );
    // Default: not authenticated. withFirmAdmin() flips this to 42.
    mockRequireAdvisorSession.mockResolvedValue(null);
  });

  it("returns 403 when no session cookie", async () => {
    const res = await PATCH(makePatch({ memberId: 1, role: "manager" }));
    expect(res.status).toBe(403);
  });

  it("returns 400 for invalid JSON", async () => {
    withFirmAdmin();
    const res = await PATCH(makePatch("{not-json", "valid"));
    expect(res.status).toBe(400);
  });

  it("returns 400 when memberId or role missing", async () => {
    withFirmAdmin();
    const res = await PATCH(makePatch({ memberId: 1 }, "valid"));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid role", async () => {
    withFirmAdmin();
    const res = await PATCH(
      makePatch({ memberId: 1, role: "bogus" }, "valid"),
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 when member not in same firm", async () => {
    withFirmAdmin();
    // Two single() calls on professionals: 1st = firm admin (getFirmAdmin),
    // 2nd = member-in-firm check. We want the member check to return null.
    let proCallCount = 0;
    mockAdminFrom.mockImplementation((table: string) => {
      const b = createChainableBuilder(table, supabaseCalls);
      if (table === "professionals") {
        b.single = vi.fn(() => {
          proCallCount++;
          if (proCallCount === 1) {
            return Promise.resolve({
              data: { id: 42, name: "Admin", firm_id: 7, is_firm_admin: true },
              error: null,
            });
          }
          return Promise.resolve({ data: null, error: null });
        });
      }
      return b;
    });
    const res = await PATCH(
      makePatch({ memberId: 99, role: "manager" }, "valid"),
    );
    expect(res.status).toBe(404);
  });

  it("blocks self-demotion when no other owner exists", async () => {
    withFirmAdmin();
    // Two single() calls on professionals: getFirmAdmin then member check.
    // For self-demotion both target id 42, so both can return the same row.
    mockAdminFrom.mockImplementation((table: string) => {
      const b = createChainableBuilder(table, supabaseCalls);
      if (table === "professionals") {
        b.single = vi.fn(() =>
          Promise.resolve({
            data: { id: 42, name: "Admin", firm_id: 7, is_firm_admin: true },
            error: null,
          }),
        );
        // count of other owners — return 0 via thenable
        b.neq = vi.fn(() => {
          supabaseCalls[table]?.push({ method: "neq", args: [] });
          return Object.assign(b, {
            then: (cb: (v: unknown) => void) => {
              cb({ count: 0, data: null, error: null });
              return Promise.resolve();
            },
          });
        });
      }
      return b;
    });

    const res = await PATCH(
      makePatch({ memberId: 42, role: "member" }, "valid"),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/another owner first/);
  });

  it("updates a member's role and is_firm_admin auto-derived", async () => {
    withFirmAdmin();
    // Two single() calls: getFirmAdmin (admin id=42) then member check (id=99).
    let proCallCount = 0;
    mockAdminFrom.mockImplementation((table: string) => {
      const b = createChainableBuilder(table, supabaseCalls);
      if (table === "professionals") {
        b.single = vi.fn(() => {
          proCallCount++;
          if (proCallCount === 1) {
            return Promise.resolve({
              data: { id: 42, name: "Admin", firm_id: 7, is_firm_admin: true },
              error: null,
            });
          }
          return Promise.resolve({
            data: { id: 99, is_firm_admin: false },
            error: null,
          });
        });
        // The update awaits .eq() directly
        b.eq = vi.fn(() => {
          supabaseCalls[table]?.push({ method: "eq", args: [] });
          return Object.assign(b, {
            then: (cb: (v: unknown) => void) => {
              cb({ data: null, error: null });
              return Promise.resolve();
            },
          });
        });
      }
      return b;
    });

    const res = await PATCH(
      makePatch({ memberId: 99, role: "manager" }, "valid"),
    );
    expect(res.status).toBe(200);

    const proCalls = supabaseCalls.professionals || [];
    const updateCall = proCalls.find((c) => c.method === "update");
    expect(updateCall).toBeDefined();
    const updateArgs = updateCall?.args[0] as Record<string, unknown>;
    expect(updateArgs.role).toBe("manager");
    expect(updateArgs.is_firm_admin).toBe(true);
  });

  it("respects explicit is_firm_admin=false", async () => {
    withFirmAdmin();
    let proCallCount = 0;
    mockAdminFrom.mockImplementation((table: string) => {
      const b = createChainableBuilder(table, supabaseCalls);
      if (table === "professionals") {
        b.single = vi.fn(() => {
          proCallCount++;
          if (proCallCount === 1) {
            return Promise.resolve({
              data: { id: 42, name: "Admin", firm_id: 7, is_firm_admin: true },
              error: null,
            });
          }
          return Promise.resolve({
            data: { id: 99, is_firm_admin: true },
            error: null,
          });
        });
      }
      return b;
    });

    await PATCH(
      makePatch(
        { memberId: 99, role: "manager", is_firm_admin: false },
        "valid",
      ),
    );

    const proCalls = supabaseCalls.professionals || [];
    const updateArgs = proCalls.find((c) => c.method === "update")
      ?.args[0] as Record<string, unknown>;
    expect(updateArgs.is_firm_admin).toBe(false);
  });
});

describe("DELETE /api/advisor-auth/firm/member", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetCalls();
    mockServerFrom.mockReset();
    mockAdminFrom.mockReset();
    mockServerFrom.mockImplementation((table: string) =>
      createChainableBuilder(table, supabaseCalls),
    );
    mockAdminFrom.mockImplementation((table: string) =>
      createChainableBuilder(table, supabaseCalls),
    );
    // Default: not authenticated. withFirmAdmin() flips this to 42.
    mockRequireAdvisorSession.mockResolvedValue(null);
  });

  it("returns 403 when no session", async () => {
    const res = await DELETE(makeDelete(99));
    expect(res.status).toBe(403);
  });

  it("returns 400 when memberId missing", async () => {
    withFirmAdmin();
    const res = await DELETE(makeDelete("", "valid"));
    expect(res.status).toBe(400);
  });

  it("blocks removing self", async () => {
    withFirmAdmin(42);
    const res = await DELETE(makeDelete(42, "valid"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/cannot remove yourself/);
  });

  it("returns 404 when member not in firm", async () => {
    withFirmAdmin();
    let proCallCount = 0;
    mockAdminFrom.mockImplementation((table: string) => {
      const b = createChainableBuilder(table, supabaseCalls);
      if (table === "professionals") {
        b.single = vi.fn(() => {
          proCallCount++;
          if (proCallCount === 1) {
            return Promise.resolve({
              data: { id: 42, name: "Admin", firm_id: 7, is_firm_admin: true },
              error: null,
            });
          }
          return Promise.resolve({ data: null, error: null });
        });
      }
      return b;
    });
    const res = await DELETE(makeDelete(99, "valid"));
    expect(res.status).toBe(404);
  });

  it("detaches member from firm without deleting the row", async () => {
    withFirmAdmin();
    let proCallCount = 0;
    mockAdminFrom.mockImplementation((table: string) => {
      const b = createChainableBuilder(table, supabaseCalls);
      if (table === "professionals") {
        b.single = vi.fn(() => {
          proCallCount++;
          if (proCallCount === 1) {
            return Promise.resolve({
              data: { id: 42, name: "Admin", firm_id: 7, is_firm_admin: true },
              error: null,
            });
          }
          return Promise.resolve({
            data: { id: 99, name: "Bob" },
            error: null,
          });
        });
      }
      return b;
    });

    const res = await DELETE(makeDelete(99, "valid"));
    expect(res.status).toBe(200);

    const proCalls = supabaseCalls.professionals || [];
    const updateCall = proCalls.find((c) => c.method === "update");
    expect(updateCall).toBeDefined();
    const updateArgs = updateCall?.args[0] as Record<string, unknown>;
    expect(updateArgs.firm_id).toBe(null);
    expect(updateArgs.is_firm_admin).toBe(false);
    expect(updateArgs.account_type).toBe("individual");
    expect(updateArgs.role).toBe(null);
  });
});
