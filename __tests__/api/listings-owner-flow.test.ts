/**
 * Tests for POST /api/listings/owner-flow
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

const { mockIsAllowed, mockGetUser, mockCreateListing } = vi.hoisted(() => ({
  mockIsAllowed: vi.fn(async () => true),
  mockGetUser: vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => ({ data: { user: { id: "u1", email: "owner@example.com" } }, error: null })),
  mockCreateListing: vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => ({
    ok: true,
    listing: { id: "listing-1", slug: "test-title", status: "draft" },
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

vi.mock("@/lib/listings/create", () => ({
  createListing: mockCreateListing,
}));

import { POST } from "@/app/api/listings/owner-flow/route";

const VALID_BODY = {
  title: "My Test Property",
  kind: "property",
};

function makeReq(body?: unknown): NextRequest {
  return new Request("http://localhost/api/listings/owner-flow", {
    method: "POST",
    body: JSON.stringify(body ?? VALID_BODY),
    headers: { "content-type": "application/json" },
  }) as unknown as NextRequest;
}

describe("POST /api/listings/owner-flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1", email: "owner@example.com" } }, error: null });
    mockCreateListing.mockResolvedValue({
      ok: true,
      listing: { id: "listing-1", slug: "test-title", status: "draft" },
    });
  });

  it("returns 400 for missing title", async () => {
    const res = await POST(makeReq({ kind: "property" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid kind", async () => {
    const res = await POST(makeReq({ title: "My Title", kind: "invalid_kind" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for title too short", async () => {
    const res = await POST(makeReq({ title: "ab", kind: "property" }));
    expect(res.status).toBe(400);
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await POST(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns 200 with listing id/slug/status on success", async () => {
    const res = await POST(makeReq());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.id).toBe("listing-1");
    expect(json.slug).toBe("test-title");
    expect(json.status).toBe("draft");
  });

  it("returns 500 when createListing fails", async () => {
    mockCreateListing.mockResolvedValue({ ok: false, error: "db_error" });
    const res = await POST(makeReq());
    expect(res.status).toBe(500);
  });
});
