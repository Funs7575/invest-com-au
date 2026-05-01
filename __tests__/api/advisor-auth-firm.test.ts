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

import { GET, PATCH } from "@/app/api/advisor-auth/firm/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeGet(cookie?: string): NextRequest {
  const headers: Record<string, string> = {};
  if (cookie) headers.cookie = `advisor_session=${cookie}`;
  return new NextRequest("http://localhost/api/advisor-auth/firm", {
    method: "GET",
    headers,
  });
}

function makePatch(body: unknown, cookie?: string): NextRequest {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (cookie) headers.cookie = `advisor_session=${cookie}`;
  return new NextRequest("http://localhost/api/advisor-auth/firm", {
    method: "PATCH",
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers,
  });
}

function withSessionAndAdvisor(opts: {
  expired?: boolean;
  advisor?: Record<string, unknown> | null;
} = {}) {
  // Post-C-02: helper handles auth (cookie + expiry); admin client handles
  // the professionals lookup.
  if (opts.expired) {
    mockRequireAdvisorSession.mockResolvedValue(null);
  } else {
    mockRequireAdvisorSession.mockResolvedValue(42);
  }
  mockAdminFrom.mockImplementation((table: string) => {
    const b = createChainableBuilder(table, supabaseCalls);
    if (table === "professionals") {
      b.single = vi.fn(() =>
        Promise.resolve({
          data:
            opts.advisor === undefined
              ? {
                  id: 42,
                  name: "Admin",
                  firm_id: 7,
                  is_firm_admin: true,
                  role: "owner",
                }
              : opts.advisor,
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

describe("GET /api/advisor-auth/firm", () => {
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
    // Default: not authenticated. withSessionAndAdvisor() flips this to 42.
    mockRequireAdvisorSession.mockResolvedValue(null);
  });

  it("returns 401 when no cookie", async () => {
    const res = await GET(makeGet());
    expect(res.status).toBe(401);
  });

  it("returns 401 when advisor has no firm_id", async () => {
    withSessionAndAdvisor({
      advisor: { id: 42, name: "Indie", firm_id: null },
    });
    const res = await GET(makeGet("valid"));
    expect(res.status).toBe(401);
  });

  it("returns 404 when firm row not found", async () => {
    withSessionAndAdvisor();
    // Combine professionals (from withSessionAndAdvisor) with advisor_firms.
    mockAdminFrom.mockImplementation((table: string) => {
      const b = createChainableBuilder(table, supabaseCalls);
      if (table === "professionals") {
        b.single = vi.fn(() =>
          Promise.resolve({
            data: {
              id: 42,
              name: "Admin",
              firm_id: 7,
              is_firm_admin: true,
              role: "owner",
            },
            error: null,
          }),
        );
      }
      if (table === "advisor_firms") {
        b.single = vi.fn(() =>
          Promise.resolve({ data: null, error: { code: "PGRST116" } }),
        );
      }
      return b;
    });
    const res = await GET(makeGet("valid"));
    expect(res.status).toBe(404);
  });

  it("returns firm and memberCount on success", async () => {
    withSessionAndAdvisor();
    // Combine professionals (from withSessionAndAdvisor) + advisor_firms +
    // member-count thenable on professionals.
    mockAdminFrom.mockImplementation((table: string) => {
      const b = createChainableBuilder(table, supabaseCalls);
      if (table === "advisor_firms") {
        b.single = vi.fn(() =>
          Promise.resolve({
            data: { id: 7, name: "Test Firm" },
            error: null,
          }),
        );
      }
      if (table === "professionals") {
        b.single = vi.fn(() =>
          Promise.resolve({
            data: {
              id: 42,
              name: "Admin",
              firm_id: 7,
              is_firm_admin: true,
              role: "owner",
            },
            error: null,
          }),
        );
        // The count query awaits eq() directly; provide a thenable count
        b.eq = vi.fn(() => {
          supabaseCalls[table]?.push({ method: "eq", args: [] });
          return Object.assign(b, {
            then: (cb: (v: unknown) => void) => {
              cb({ count: 4, data: null, error: null });
              return Promise.resolve();
            },
          });
        });
      }
      return b;
    });

    const res = await GET(makeGet("valid"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.firm.id).toBe(7);
    expect(json.memberCount).toBe(4);
  });
});

describe("PATCH /api/advisor-auth/firm", () => {
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
    // Default: not authenticated. withSessionAndAdvisor() flips this to 42.
    mockRequireAdvisorSession.mockResolvedValue(null);
  });

  it("returns 403 when not a firm admin", async () => {
    withSessionAndAdvisor({
      advisor: {
        id: 42,
        name: "Member",
        firm_id: 7,
        is_firm_admin: false,
      },
    });
    const res = await PATCH(makePatch({ name: "X" }, "valid"));
    expect(res.status).toBe(403);
  });

  it("returns 403 when not in a firm", async () => {
    withSessionAndAdvisor({
      advisor: {
        id: 42,
        name: "Indie",
        firm_id: null,
        is_firm_admin: true,
      },
    });
    const res = await PATCH(makePatch({ name: "X" }, "valid"));
    expect(res.status).toBe(403);
  });

  it("returns 400 for invalid JSON body", async () => {
    withSessionAndAdvisor();
    const res = await PATCH(makePatch("{not-json", "valid"));
    expect(res.status).toBe(400);
  });

  it("returns 400 when no allowed fields are provided", async () => {
    withSessionAndAdvisor();
    const res = await PATCH(
      makePatch({ verified: true, rating: 5 }, "valid"),
    );
    expect(res.status).toBe(400);
  });

  it("updates allowlisted fields and returns the updated firm", async () => {
    withSessionAndAdvisor();
    // Combine professionals (firm-admin check) with advisor_firms.
    mockAdminFrom.mockImplementation((table: string) => {
      const b = createChainableBuilder(table, supabaseCalls);
      if (table === "professionals") {
        b.single = vi.fn(() =>
          Promise.resolve({
            data: {
              id: 42,
              name: "Admin",
              firm_id: 7,
              is_firm_admin: true,
              role: "owner",
            },
            error: null,
          }),
        );
      }
      if (table === "advisor_firms") {
        b.single = vi.fn(() =>
          Promise.resolve({
            data: { id: 7, name: "New Name", website: "https://new.test" },
            error: null,
          }),
        );
      }
      return b;
    });

    const res = await PATCH(
      makePatch(
        {
          name: "New Name",
          website: "https://new.test",
          // disallowed
          verified: true,
        },
        "valid",
      ),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.firm.name).toBe("New Name");

    const firmCalls = supabaseCalls.advisor_firms || [];
    const updateCall = firmCalls.find((c) => c.method === "update");
    expect(updateCall).toBeDefined();
    const updateArgs = updateCall?.args[0] as Record<string, unknown>;
    expect(updateArgs.name).toBe("New Name");
    expect(updateArgs.website).toBe("https://new.test");
    expect(updateArgs.verified).toBeUndefined();
  });

  it("recomputes location_display when location fields change", async () => {
    withSessionAndAdvisor();
    let firmCallCount = 0;
    // Combine professionals (firm-admin check) with advisor_firms call counter.
    mockAdminFrom.mockImplementation((table: string) => {
      const b = createChainableBuilder(table, supabaseCalls);
      if (table === "professionals") {
        b.single = vi.fn(() =>
          Promise.resolve({
            data: {
              id: 42,
              name: "Admin",
              firm_id: 7,
              is_firm_admin: true,
              role: "owner",
            },
            error: null,
          }),
        );
      }
      if (table === "advisor_firms") {
        b.single = vi.fn(() => {
          firmCallCount++;
          if (firmCallCount === 1) {
            // current state lookup
            return Promise.resolve({
              data: { location_suburb: "Bondi", location_state: "NSW" },
              error: null,
            });
          }
          // returned firm after update
          return Promise.resolve({
            data: { id: 7, location_display: "Manly, NSW" },
            error: null,
          });
        });
      }
      return b;
    });

    const res = await PATCH(
      makePatch({ location_suburb: "Manly" }, "valid"),
    );
    expect(res.status).toBe(200);

    const firmCalls = supabaseCalls.advisor_firms || [];
    const updateCall = firmCalls.find((c) => c.method === "update");
    const updateArgs = updateCall?.args[0] as Record<string, unknown>;
    expect(updateArgs.location_display).toBe("Manly, NSW");
  });
});
