import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeRequest } from "@/__tests__/helpers";
import { NextRequest } from "next/server";

// ── Mock state ────────────────────────────────────────────────────────────────

const mockGetUser = vi.fn();
const mockAdminFrom = vi.fn();

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

// ── Import after mocks ────────────────────────────────────────────────────────

import { GET, PATCH } from "@/app/api/advisor-auth/notifications/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

const ADVISOR_ID = 55;

function makeChain(result: { data: unknown; error: unknown }) {
  const c: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const m of ["select", "update", "eq", "or", "in"]) c[m] = vi.fn(() => c);
  c.single = vi.fn(() => Promise.resolve(result));
  c.maybeSingle = vi.fn(() => Promise.resolve(result));
  c.then = vi.fn((cb: (v: unknown) => void) => {
    cb(result);
    return Promise.resolve();
  });
  return c;
}

function setupAuth() {
  mockGetUser.mockResolvedValueOnce({
    data: { user: { id: "uid-55", email: "eve@example.com" } },
  });
}

function setupAdminWithProf(emailPrefs: Record<string, unknown> | null) {
  let callCount = 0;
  mockAdminFrom.mockImplementation((table: string) => {
    callCount++;
    if (table === "professionals" && callCount === 1) {
      return makeChain({ data: { id: ADVISOR_ID }, error: null });
    }
    return makeChain({ data: { email_preferences: emailPrefs }, error: null });
  });
}

function makeGetReq(): NextRequest {
  return new NextRequest("http://localhost/api/advisor-auth/notifications", { method: "GET" });
}

function makePatchReq(body: Record<string, unknown>): NextRequest {
  return makeRequest("/api/advisor-auth/notifications", body, { method: "PATCH" });
}

// ── GET tests ─────────────────────────────────────────────────────────────────

describe("GET /api/advisor-auth/notifications", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    mockAdminFrom.mockReturnValue(makeChain({ data: null, error: null }));
    const res = await GET(makeGetReq());
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ error: "Not authenticated" });
  });

  it("returns default prefs when email_preferences is null", async () => {
    setupAuth();
    setupAdminWithProf(null);
    const res = await GET(makeGetReq());
    expect(res.status).toBe(200);
    const { prefs } = await res.json();
    expect(prefs.new_lead).toBe(true);
    expect(prefs.weekly_summary).toBe(true);
    expect(prefs.billing_alerts).toBe(true);
    expect(prefs.review_new).toBe(false);
  });

  it("returns saved prefs merged with defaults for missing keys", async () => {
    setupAuth();
    setupAdminWithProf({ new_lead: false, billing_alerts: false });
    const res = await GET(makeGetReq());
    expect(res.status).toBe(200);
    const { prefs } = await res.json();
    expect(prefs.new_lead).toBe(false);
    expect(prefs.billing_alerts).toBe(false);
    expect(prefs.weekly_summary).toBe(true);
    expect(prefs.review_new).toBe(false);
  });
});

// ── PATCH tests ───────────────────────────────────────────────────────────────

describe("PATCH /api/advisor-auth/notifications", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    mockAdminFrom.mockReturnValue(makeChain({ data: null, error: null }));
    const res = await PATCH(makePatchReq({ prefs: { new_lead: false } }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when prefs body is invalid", async () => {
    setupAuth();
    mockAdminFrom.mockReturnValue(makeChain({ data: { id: ADVISOR_ID }, error: null }));
    const res = await PATCH(makePatchReq({ prefs: "not-an-object" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "Invalid preferences" });
  });

  it("returns 200 on successful preference update", async () => {
    setupAuth();
    let callCount = 0;
    mockAdminFrom.mockImplementation(() => {
      callCount++;
      return makeChain({ data: callCount === 1 ? { id: ADVISOR_ID } : null, error: null });
    });
    const res = await PATCH(
      makePatchReq({ prefs: { new_lead: false, weekly_summary: true, billing_alerts: true, review_new: true } }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ success: true });
  });

  it("returns 200 with warning when DB column does not exist (error is non-fatal)", async () => {
    setupAuth();
    let callCount = 0;
    mockAdminFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeChain({ data: { id: ADVISOR_ID }, error: null });
      return makeChain({ data: null, error: { message: "column email_preferences does not exist" } });
    });
    const res = await PATCH(
      makePatchReq({ prefs: { new_lead: true, weekly_summary: false, billing_alerts: true, review_new: false } }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ success: true, warning: expect.any(String) });
  });
});
