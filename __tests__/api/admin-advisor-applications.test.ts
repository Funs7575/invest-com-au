import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockGetUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: () => mockGetUser() },
  })),
}));

const mockAdminFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

vi.mock("@/lib/admin", () => ({
  ADMIN_EMAILS: ["admin@test.com"],
}));

vi.mock("@/lib/url", () => ({
  getSiteUrl: vi.fn(() => "https://invest.com.au"),
}));

const mockSendApproved = vi.fn();
const mockSendRejected = vi.fn();
vi.mock("@/lib/advisor-emails", () => ({
  sendApplicationApproved: (...a: unknown[]) => mockSendApproved(...a),
  sendApplicationRejected: (...a: unknown[]) => mockSendRejected(...a),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

import { GET, PATCH } from "@/app/api/admin/advisor-applications/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

const ADMIN_EMAIL = "admin@test.com";
const NON_ADMIN = "user@other.com";

function authAs(email: string | null) {
  mockGetUser.mockResolvedValue({ data: { user: email ? { email } : null } });
}

function makeGet(status?: string): NextRequest {
  const url = status
    ? `http://localhost/api/admin/advisor-applications?status=${status}`
    : "http://localhost/api/admin/advisor-applications";
  return new NextRequest(url, { method: "GET" });
}

function makePatch(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/advisor-applications", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeChain(result: unknown) {
  const self: Record<string, (...a: unknown[]) => unknown> = {};
  ["select", "eq", "update", "insert", "ilike", "order", "limit", "filter", "gte", "lt"].forEach(
    (k) => { self[k] = () => self; },
  );
  self["single"] = () => Promise.resolve(result);
  self["maybeSingle"] = () => Promise.resolve(result);
  self["then"] = (cb: (v: unknown) => unknown) =>
    Promise.resolve(result).then(cb as Parameters<Promise<unknown>["then"]>[0]);
  return self;
}

const PENDING_APP = {
  id: 1,
  name: "Jane Smith",
  email: "jane@example.com",
  status: "pending",
  type: "financial_advisor",
  phone: "0411111111",
  account_type: "individual",
  location_suburb: "Sydney",
  location_state: "NSW",
  specialties: "superannuation, retirement",
  bio: "Experienced advisor",
  firm_name: null,
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("GET /api/admin/advisor-applications", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    authAs(null);
    const res = await GET(makeGet());
    expect(res.status).toBe(401);
  });

  it("returns 401 when non-admin email", async () => {
    authAs(NON_ADMIN);
    const res = await GET(makeGet());
    expect(res.status).toBe(401);
  });

  it("returns pending applications by default", async () => {
    authAs(ADMIN_EMAIL);
    const apps = [PENDING_APP];
    mockAdminFrom.mockReturnValue(makeChain({ data: apps, error: null }));
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.applications).toHaveLength(1);
    expect(body.applications[0].name).toBe("Jane Smith");
  });

  it("filters by custom status param", async () => {
    authAs(ADMIN_EMAIL);
    mockAdminFrom.mockReturnValue(makeChain({ data: [], error: null }));
    const res = await GET(makeGet("approved"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.applications).toHaveLength(0);
  });

  it("returns 500 on DB error", async () => {
    authAs(ADMIN_EMAIL);
    mockAdminFrom.mockReturnValue(makeChain({ data: null, error: { message: "connection error" } }));
    const res = await GET(makeGet());
    expect(res.status).toBe(500);
  });
});

describe("PATCH /api/admin/advisor-applications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSendApproved.mockResolvedValue(undefined);
    mockSendRejected.mockResolvedValue(undefined);
  });

  it("returns 401 when unauthenticated", async () => {
    authAs(null);
    const res = await PATCH(makePatch({ applicationId: 1, action: "reject" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when applicationId missing", async () => {
    authAs(ADMIN_EMAIL);
    const res = await PATCH(makePatch({ action: "reject" }));
    expect(res.status).toBe(400);
  });

  it("returns 404 when application not found", async () => {
    authAs(ADMIN_EMAIL);
    // first from call = get application (returns null)
    mockAdminFrom.mockReturnValue(makeChain({ data: null, error: null }));
    const res = await PATCH(makePatch({ applicationId: 99, action: "reject" }));
    expect(res.status).toBe(404);
  });

  it("returns 400 when application already processed", async () => {
    authAs(ADMIN_EMAIL);
    mockAdminFrom.mockReturnValue(
      makeChain({ data: { ...PENDING_APP, status: "approved" }, error: null }),
    );
    const res = await PATCH(makePatch({ applicationId: 1, action: "reject" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/already processed/i);
  });

  it("rejects application and sends rejection email fire-and-forget", async () => {
    authAs(ADMIN_EMAIL);
    mockAdminFrom.mockReturnValue(makeChain({ data: PENDING_APP, error: null }));
    const res = await PATCH(
      makePatch({ applicationId: 1, action: "reject", rejectionReason: "Incomplete documents" }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    // rejection email called fire-and-forget
    expect(mockSendRejected).toHaveBeenCalledWith(
      PENDING_APP.email,
      PENDING_APP.name,
      "Incomplete documents",
    );
  });

  it("approves application: creates professional, auth token, and audit log", async () => {
    authAs(ADMIN_EMAIL);
    let callCount = 0;
    mockAdminFrom.mockImplementation(() => {
      callCount++;
      // 1: get application
      if (callCount === 1) return makeChain({ data: PENDING_APP, error: null });
      // 2: check slug uniqueness (no existing)
      if (callCount === 2) return makeChain({ data: null, error: null });
      // 3: geocode postcode (no match)
      if (callCount === 3) return makeChain({ data: null, error: null });
      // 4: insert professional
      if (callCount === 4) return makeChain({ data: { id: 55 }, error: null });
      // 5+: update application, insert token, audit log
      return makeChain({ data: null, error: null });
    });
    const res = await PATCH(makePatch({ applicationId: 1, action: "approve" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.professionalId).toBe(55);
    expect(body.firmId).toBeNull();
    expect(mockSendApproved).toHaveBeenCalledWith(
      PENDING_APP.email,
      PENDING_APP.name,
      expect.stringContaining("token="),
    );
  });

  it("approve with firm account type creates advisor_firm and links professional", async () => {
    authAs(ADMIN_EMAIL);
    const firmApp = { ...PENDING_APP, account_type: "firm", firm_name: "Smith & Co" };
    let callCount = 0;
    mockAdminFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeChain({ data: firmApp, error: null });
      if (callCount === 2) return makeChain({ data: null, error: null }); // slug uniqueness
      if (callCount === 3) return makeChain({ data: null, error: null }); // geocode
      if (callCount === 4) return makeChain({ data: { id: 66 }, error: null }); // insert pro
      if (callCount === 5) return makeChain({ data: { id: 10 }, error: null }); // insert firm
      return makeChain({ data: null, error: null });
    });
    const res = await PATCH(makePatch({ applicationId: 1, action: "approve" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.professionalId).toBe(66);
    expect(body.firmId).toBe(10);
  });
});
