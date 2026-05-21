/**
 * Tests for POST /api/listings/owner-flow/[id]/submit
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

const { mockIsAllowed, mockGetUser, mockSubmitListingForReview } = vi.hoisted(() => ({
  mockIsAllowed: vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => true),
  mockGetUser: vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => ({ data: { user: { id: "u1", email: "owner@example.com" } }, error: null })),
  mockSubmitListingForReview: vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => ({
    ok: true,
    noOp: false,
    listing: { status: "pending_review", id: "listing-1", slug: "test" },
  })),
}));

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: mockIsAllowed,
  ipKey: () => "test-ip",
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}));

vi.mock("@/lib/listings/moderate", () => ({
  submitListingForReview: mockSubmitListingForReview,
}));

import { POST } from "@/app/api/listings/owner-flow/[id]/submit/route";

function makeReq(body?: unknown): NextRequest {
  const init: RequestInit = { method: "POST" };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
    init.headers = { "content-type": "application/json", "content-length": String(JSON.stringify(body).length) };
  }
  return new Request("http://localhost/api/listings/owner-flow/listing-1/submit", init) as unknown as NextRequest;
}

const ctx = { params: Promise.resolve({ id: "listing-1" }) } as Parameters<typeof POST>[1];

describe("POST /api/listings/owner-flow/[id]/submit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1", email: "owner@example.com" } }, error: null });
    mockSubmitListingForReview.mockResolvedValue({
      ok: true,
      noOp: false,
      listing: { status: "pending_review", id: "listing-1", slug: "test" },
    });
  });

  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(makeReq(), ctx);
    expect(res.status).toBe(429);
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await POST(makeReq(), ctx);
    expect(res.status).toBe(401);
  });

  it("returns 200 with ok:true on success", async () => {
    const res = await POST(makeReq(), ctx);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.status).toBe("pending_review");
  });

  it("returns 200 with noOp:true when already pending", async () => {
    mockSubmitListingForReview.mockResolvedValue({
      ok: true,
      noOp: true,
      listing: { status: "pending_review", id: "listing-1", slug: "test" },
    });
    const res = await POST(makeReq(), ctx);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.noOp).toBe(true);
  });

  it("returns 404 when listing not found", async () => {
    mockSubmitListingForReview.mockResolvedValue({ ok: false, error: "not_found" });
    const res = await POST(makeReq(), ctx);
    expect(res.status).toBe(404);
  });

  it("returns 403 when user does not own listing", async () => {
    mockSubmitListingForReview.mockResolvedValue({ ok: false, error: "forbidden" });
    const res = await POST(makeReq(), ctx);
    expect(res.status).toBe(403);
  });

  it("returns 409 when listing cannot be submitted from current status", async () => {
    mockSubmitListingForReview.mockResolvedValue({ ok: false, error: "cannot_submit_from_approved" });
    const res = await POST(makeReq(), ctx);
    expect(res.status).toBe(409);
  });
});
