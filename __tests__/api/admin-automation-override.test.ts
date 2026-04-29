import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockGetUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
  }),
}));

const mockAdminFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

vi.mock("@/lib/admin", () => ({
  getAdminEmails: vi.fn(() => ["admin@test.com"]),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

import { POST } from "@/app/api/admin/automation/override/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

const ADMIN = { email: "admin@test.com" };
const NON_ADMIN = { email: "user@other.com" };

function makePost(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/automation/override", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeChain(result: unknown) {
  const self: Record<string, (...a: unknown[]) => unknown> = {};
  [
    "select", "eq", "update", "insert", "upsert", "delete", "in",
    "gte", "lt", "lte", "order", "limit", "filter",
  ].forEach((k) => {
    self[k] = () => self;
  });
  self["single"] = () => Promise.resolve(result);
  self["maybeSingle"] = () => Promise.resolve(result);
  self["then"] = (cb: (v: unknown) => unknown) =>
    Promise.resolve(result).then(cb as Parameters<Promise<unknown>["then"]>[0]);
  return self;
}

function authAs(email: string | null) {
  mockGetUser.mockResolvedValue({ data: { user: email ? { email } : null } });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/admin/automation/override", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdminFrom.mockReturnValue(makeChain({ data: null, error: null }));
  });

  it("returns 401 when unauthenticated", async () => {
    authAs(null);
    const res = await POST(makePost({ feature: "listing_scam", rowId: 1, targetVerdict: "active" }));
    expect(res.status).toBe(401);
  });

  it("returns 403 when non-admin", async () => {
    authAs(NON_ADMIN.email);
    const res = await POST(makePost({ feature: "listing_scam", rowId: 1, targetVerdict: "active" }));
    expect(res.status).toBe(403);
  });

  it("returns 400 when feature missing", async () => {
    authAs(ADMIN.email);
    const res = await POST(makePost({ rowId: 1, targetVerdict: "active" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  it("returns 400 when rowId missing", async () => {
    authAs(ADMIN.email);
    const res = await POST(makePost({ feature: "listing_scam", targetVerdict: "active" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when targetVerdict missing", async () => {
    authAs(ADMIN.email);
    const res = await POST(makePost({ feature: "listing_scam", rowId: 1 }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for unknown feature", async () => {
    authAs(ADMIN.email);
    mockAdminFrom.mockReturnValue(makeChain({ data: null, error: null }));
    const res = await POST(makePost({ feature: "unknown_feature", rowId: 1, targetVerdict: "active" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/unknown/i);
  });

  it("returns 200 override listing_scam to active", async () => {
    authAs(ADMIN.email);
    mockAdminFrom.mockReturnValue(makeChain({ data: null, error: null }));
    const res = await POST(makePost({ feature: "listing_scam", rowId: 5, targetVerdict: "active" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it("returns 400 for listing_scam invalid verdict", async () => {
    authAs(ADMIN.email);
    mockAdminFrom.mockReturnValue(makeChain({ data: null, error: null }));
    const res = await POST(makePost({ feature: "listing_scam", rowId: 5, targetVerdict: "badverdict" }));
    expect(res.status).toBe(400);
  });

  it("returns 200 override text_moderation with advisor subSurface", async () => {
    authAs(ADMIN.email);
    mockAdminFrom.mockReturnValue(makeChain({ data: null, error: null }));
    const res = await POST(makePost({
      feature: "text_moderation",
      rowId: 10,
      targetVerdict: "published",
      subSurface: "advisor_review",
    }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it("returns 200 override advisor_applications to rejected", async () => {
    authAs(ADMIN.email);
    mockAdminFrom.mockReturnValue(makeChain({ data: null, error: null }));
    const res = await POST(makePost({
      feature: "advisor_applications",
      rowId: 20,
      targetVerdict: "rejected",
    }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it("returns 200 override broker_data_changes to applied", async () => {
    authAs(ADMIN.email);
    mockAdminFrom.mockReturnValue(makeChain({ data: null, error: null }));
    const res = await POST(makePost({
      feature: "broker_data_changes",
      rowId: 7,
      targetVerdict: "applied",
    }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it("returns 404 when lead dispute not found", async () => {
    authAs(ADMIN.email);
    // dispute lookup returns null
    mockAdminFrom.mockReturnValue(makeChain({ data: null, error: null }));
    const res = await POST(makePost({
      feature: "lead_disputes",
      rowId: 99,
      targetVerdict: "approved",
    }));
    expect(res.status).toBe(404);
  });

  it("returns 400 when lead dispute already in target state", async () => {
    authAs(ADMIN.email);
    // First from call = dispute select (already approved)
    let callCount = 0;
    mockAdminFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return makeChain({ data: { id: 1, status: "approved", lead_id: 2, professional_id: 3, refunded_cents: 500 }, error: null });
      }
      return makeChain({ data: null, error: null });
    });
    const res = await POST(makePost({
      feature: "lead_disputes",
      rowId: 1,
      targetVerdict: "approved",
    }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/already/i);
  });
});
