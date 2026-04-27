import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { createChainableBuilder } from "@/__tests__/helpers";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockGetUser = vi.fn();
const mockServerFrom = vi.fn();
const mockAdminFrom = vi.fn();
const supabaseCalls: Record<string, { method: string; args: unknown[] }[]> = {};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockServerFrom,
  })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockAdminFrom }),
}));

import { GET, PATCH } from "@/app/api/advisor-auth/notifications/route";

function makeGet(): NextRequest {
  return new NextRequest("http://localhost/api/advisor-auth/notifications", {
    method: "GET",
  });
}

function makePatch(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/advisor-auth/notifications", {
    method: "PATCH",
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function authedAdvisor() {
  mockGetUser.mockResolvedValue({
    data: { user: { id: "u-1", email: "advisor@test.com" } },
  });
}

function resetCalls() {
  for (const k of Object.keys(supabaseCalls)) delete supabaseCalls[k];
}

describe("GET /api/advisor-auth/notifications", () => {
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
  });

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await GET(makeGet());
    expect(res.status).toBe(401);
  });

  it("returns DEFAULT_PREFS when advisor has no saved preferences", async () => {
    authedAdvisor();
    mockAdminFrom.mockImplementation((table: string) => {
      const b = createChainableBuilder(table, supabaseCalls);
      if (table === "professionals") {
        b.maybeSingle = vi.fn(() =>
          Promise.resolve({ data: { id: 42 }, error: null }),
        );
        b.single = vi.fn(() =>
          Promise.resolve({
            data: { email_preferences: null },
            error: null,
          }),
        );
      }
      return b;
    });

    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.prefs).toEqual({
      new_lead: true,
      weekly_summary: true,
      billing_alerts: true,
      review_new: false,
    });
  });

  it("merges saved preferences with defaults", async () => {
    authedAdvisor();
    mockAdminFrom.mockImplementation((table: string) => {
      const b = createChainableBuilder(table, supabaseCalls);
      if (table === "professionals") {
        b.maybeSingle = vi.fn(() =>
          Promise.resolve({ data: { id: 42 }, error: null }),
        );
        b.single = vi.fn(() =>
          Promise.resolve({
            data: {
              email_preferences: {
                new_lead: false,
                review_new: true,
              },
            },
            error: null,
          }),
        );
      }
      return b;
    });

    const res = await GET(makeGet());
    const json = await res.json();
    // saved overrides
    expect(json.prefs.new_lead).toBe(false);
    expect(json.prefs.review_new).toBe(true);
    // defaults preserved for unspecified keys
    expect(json.prefs.weekly_summary).toBe(true);
    expect(json.prefs.billing_alerts).toBe(true);
  });
});

describe("PATCH /api/advisor-auth/notifications", () => {
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
  });

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await PATCH(makePatch({ prefs: { new_lead: true } }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when prefs are missing", async () => {
    authedAdvisor();
    mockAdminFrom.mockImplementation((table: string) => {
      const b = createChainableBuilder(table, supabaseCalls);
      if (table === "professionals") {
        b.maybeSingle = vi.fn(() =>
          Promise.resolve({ data: { id: 42 }, error: null }),
        );
      }
      return b;
    });
    const res = await PATCH(makePatch({}));
    expect(res.status).toBe(400);
  });

  it("returns 400 when prefs is not an object", async () => {
    authedAdvisor();
    mockAdminFrom.mockImplementation((table: string) => {
      const b = createChainableBuilder(table, supabaseCalls);
      if (table === "professionals") {
        b.maybeSingle = vi.fn(() =>
          Promise.resolve({ data: { id: 42 }, error: null }),
        );
      }
      return b;
    });
    const res = await PATCH(makePatch({ prefs: "yes" }));
    expect(res.status).toBe(400);
  });

  it("coerces all preference fields to booleans", async () => {
    authedAdvisor();
    mockAdminFrom.mockImplementation((table: string) => {
      const b = createChainableBuilder(table, supabaseCalls);
      if (table === "professionals") {
        b.maybeSingle = vi.fn(() =>
          Promise.resolve({ data: { id: 42 }, error: null }),
        );
      }
      return b;
    });

    const res = await PATCH(
      makePatch({
        prefs: {
          new_lead: 1,
          weekly_summary: 0,
          billing_alerts: "yes",
          review_new: null,
        },
      }),
    );
    expect(res.status).toBe(200);

    const proCalls = supabaseCalls.professionals || [];
    const updateCall = proCalls.find((c) => c.method === "update");
    expect(updateCall).toBeDefined();
    const updateArgs = updateCall?.args[0] as Record<string, unknown>;
    const prefs = updateArgs.email_preferences as Record<string, unknown>;
    expect(prefs.new_lead).toBe(true);
    expect(prefs.weekly_summary).toBe(false);
    expect(prefs.billing_alerts).toBe(true);
    expect(prefs.review_new).toBe(false);
  });

  it("returns success with warning when column is missing", async () => {
    authedAdvisor();
    mockAdminFrom.mockImplementation((table: string) => {
      const b = createChainableBuilder(table, supabaseCalls);
      if (table === "professionals") {
        b.maybeSingle = vi.fn(() =>
          Promise.resolve({ data: { id: 42 }, error: null }),
        );
        // Override the awaited update result via .eq() terminal
        b.eq = vi.fn(() =>
          Promise.resolve({
            data: null,
            error: { message: "column does not exist" },
          }),
        );
      }
      return b;
    });

    const res = await PATCH(
      makePatch({ prefs: { new_lead: true } }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.warning).toMatch(/in memory only/);
  });
});
