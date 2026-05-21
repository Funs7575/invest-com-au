import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockGetUser, mockIsAllowed, mockIpKey, mockSubmit } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockIsAllowed: vi.fn(),
  mockIpKey: vi.fn(() => "ip:1.2.3.4"),
  mockSubmit: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}));

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: mockIsAllowed,
  ipKey: mockIpKey,
}));

vi.mock("@/lib/listings/moderate", () => ({
  submitListingForReview: mockSubmit,
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

import { POST } from "@/app/api/listings/owner-flow/[id]/submit/route";

const USER = { id: "user-uuid-1", email: "alice@example.com" };
const LISTING_ID = "list-uuid-1";

function makeReq(body?: unknown): NextRequest {
  const init: { method: string; headers: Record<string, string>; body?: string } = {
    method: "POST",
    headers: {},
  };
  if (body !== undefined) {
    init.headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }
  return new NextRequest(`http://localhost/api/listings/owner-flow/${LISTING_ID}/submit`, init);
}

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

describe("POST /api/listings/owner-flow/[id]/submit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
  });

  it("returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValueOnce(false);
    const res = await POST(makeReq(), ctx(LISTING_ID));
    expect(res.status).toBe(429);
  });

  it("returns 400 when a non-empty body is sent", async () => {
    const payload = JSON.stringify({ status: "approved" });
    const req = new NextRequest(`http://localhost/api/listings/owner-flow/${LISTING_ID}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "content-length": String(payload.length) },
      body: payload,
    });
    const res = await POST(req, ctx(LISTING_ID));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Submit takes no body fields." });
  });

  it("returns 400 for invalid JSON", async () => {
    const req = new NextRequest(`http://localhost/api/listings/owner-flow/${LISTING_ID}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "content-length": "5" },
      body: "{bad",
    });
    const res = await POST(req, ctx(LISTING_ID));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid JSON body" });
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await POST(makeReq(), ctx(LISTING_ID));
    expect(res.status).toBe(401);
  });

  it("returns 404 when the listing is not found", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockSubmit.mockResolvedValueOnce({ ok: false, error: "not_found" });
    const res = await POST(makeReq(), ctx(LISTING_ID));
    expect(res.status).toBe(404);
  });

  it("returns 403 when forbidden", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockSubmit.mockResolvedValueOnce({ ok: false, error: "forbidden" });
    const res = await POST(makeReq(), ctx(LISTING_ID));
    expect(res.status).toBe(403);
  });

  it("returns 409 for a bad lifecycle transition", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockSubmit.mockResolvedValueOnce({ ok: false, error: "cannot_submit_from_approved" });
    const res = await POST(makeReq(), ctx(LISTING_ID));
    expect(res.status).toBe(409);
  });

  it("returns 500 for an unexpected failure", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockSubmit.mockResolvedValueOnce({ ok: false, error: "db exploded" });
    const res = await POST(makeReq(), ctx(LISTING_ID));
    expect(res.status).toBe(500);
  });

  it("submits successfully and returns status", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockSubmit.mockResolvedValueOnce({
      ok: true,
      noOp: false,
      listing: { status: "pending_review" },
    });
    const res = await POST(makeReq(), ctx(LISTING_ID));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, noOp: false, status: "pending_review" });
    expect(mockSubmit).toHaveBeenCalledWith(LISTING_ID, USER.id);
  });

  it("is idempotent — returns noOp:true for already-pending", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockSubmit.mockResolvedValueOnce({
      ok: true,
      noOp: true,
      listing: { status: "pending_review" },
    });
    const res = await POST(makeReq(), ctx(LISTING_ID));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ noOp: true });
  });
});
