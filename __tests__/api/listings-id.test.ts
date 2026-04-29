import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockIsRateLimited = vi.fn();
vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: (...args: unknown[]) => mockIsRateLimited(...args),
}));

const mockFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

import { GET, PUT, DELETE } from "@/app/api/listings/[id]/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

type Params = { params: Promise<{ id: string }> };

function makeParams(id: string): Params {
  return { params: Promise.resolve({ id }) };
}

function makeGet(id: string): [NextRequest, Params] {
  return [
    new NextRequest(`http://localhost/api/listings/${id}`),
    makeParams(id),
  ];
}

function makePut(id: string, body: unknown, ip = "5.5.5.5"): [NextRequest, Params] {
  return [
    new NextRequest(`http://localhost/api/listings/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
      body: JSON.stringify(body),
    }),
    makeParams(id),
  ];
}

function makeDel(id: string, body: unknown, ip = "5.5.5.5"): [NextRequest, Params] {
  return [
    new NextRequest(`http://localhost/api/listings/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
      body: JSON.stringify(body),
    }),
    makeParams(id),
  ];
}

const LISTING = {
  id: 1,
  title: "SAAS Business",
  description: "Growing SaaS",
  contact_email: "owner@example.com",
  status: "active",
  industry: "Technology",
};

// ── GET tests ─────────────────────────────────────────────────────────────────

describe("GET /api/listings/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
  });

  it("returns 400 for non-numeric id", async () => {
    const [req, params] = makeGet("abc");
    const res = await GET(req, params);
    expect(res.status).toBe(400);
  });

  it("returns 404 when listing not found", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: new Error("not found") }),
    });
    const [req, params] = makeGet("99");
    const res = await GET(req, params);
    expect(res.status).toBe(404);
  });

  it("returns 200 with listing data and enquiries_count", async () => {
    let callCount = 0;
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve({ data: LISTING, error: null });
        return Promise.resolve({ count: 7, data: null, error: null });
      }),
    }));

    let fromCalls = 0;
    mockFrom.mockImplementation(() => {
      fromCalls++;
      if (fromCalls === 1) {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: LISTING, error: null }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        then: vi.fn((cb: (v: unknown) => void) => {
          cb({ count: 7, data: null, error: null });
          return Promise.resolve();
        }),
      };
    });

    const [req, params] = makeGet("1");
    const res = await GET(req, params);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(1);
    expect(body.enquiries_count).toBe(7);
  });

  it("returns 500 on unexpected error", async () => {
    mockFrom.mockImplementation(() => { throw new Error("boom"); });
    const [req, params] = makeGet("1");
    const res = await GET(req, params);
    expect(res.status).toBe(500);
  });
});

// ── PUT tests ─────────────────────────────────────────────────────────────────

describe("PUT /api/listings/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
  });

  it("returns 429 when rate limited", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    const [req, params] = makePut("1", { contact_email: "a@b.com", title: "X" });
    const res = await PUT(req, params);
    expect(res.status).toBe(429);
  });

  it("returns 400 for non-numeric id", async () => {
    const [req, params] = makePut("xyz", { contact_email: "a@b.com" });
    const res = await PUT(req, params);
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing contact_email", async () => {
    const [req, params] = makePut("1", { title: "New Title" });
    const res = await PUT(req, params);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/contact_email/i);
  });

  it("returns 400 for invalid contact_email format", async () => {
    const [req, params] = makePut("1", { contact_email: "notanemail", title: "X" });
    const res = await PUT(req, params);
    expect(res.status).toBe(400);
  });

  it("returns 404 when listing not found or email mismatch", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: new Error("not found") }),
    });
    const [req, params] = makePut("1", { contact_email: "wrong@email.com", title: "X" });
    const res = await PUT(req, params);
    expect(res.status).toBe(404);
  });

  it("returns 404 when email does not match listing email (timing-safe merge)", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 1, contact_email: "real@owner.com" },
        error: null,
      }),
    });
    const [req, params] = makePut("1", { contact_email: "attacker@evil.com", title: "Hijack" });
    const res = await PUT(req, params);
    expect(res.status).toBe(404);
  });

  it("returns 400 when no valid fields provided", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 1, contact_email: "owner@example.com" },
        error: null,
      }),
    });
    const [req, params] = makePut("1", { contact_email: "owner@example.com", nonexistent_field: "x" });
    const res = await PUT(req, params);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/no valid fields/i);
  });

  it("returns 200 with updated listing on success", async () => {
    const updatedListing = { ...LISTING, title: "Updated SaaS" };
    let callIndex = 0;
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      single: vi.fn().mockImplementation(() => {
        callIndex++;
        if (callIndex === 1) {
          return Promise.resolve({ data: { id: 1, contact_email: "owner@example.com" }, error: null });
        }
        return Promise.resolve({ data: updatedListing, error: null });
      }),
    }));

    const [req, params] = makePut("1", { contact_email: "owner@example.com", title: "Updated SaaS" });
    const res = await PUT(req, params);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.title).toBe("Updated SaaS");
  });
});

// ── DELETE tests ──────────────────────────────────────────────────────────────

describe("DELETE /api/listings/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
  });

  it("returns 429 when rate limited", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    const [req, params] = makeDel("1", { contact_email: "a@b.com" });
    const res = await DELETE(req, params);
    expect(res.status).toBe(429);
  });

  it("returns 400 for non-numeric id", async () => {
    const [req, params] = makeDel("bad-id", { contact_email: "a@b.com" });
    const res = await DELETE(req, params);
    expect(res.status).toBe(400);
  });

  it("returns 400 when contact_email is missing", async () => {
    const [req, params] = makeDel("1", {});
    const res = await DELETE(req, params);
    expect(res.status).toBe(400);
  });

  it("returns 404 when listing not found or email mismatch", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: new Error("not found") }),
    });
    const [req, params] = makeDel("1", { contact_email: "wrong@email.com" });
    const res = await DELETE(req, params);
    expect(res.status).toBe(404);
  });

  it("returns 200 with success:true on soft-delete", async () => {
    let callIndex = 0;
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      single: vi.fn().mockImplementation(() => {
        callIndex++;
        if (callIndex === 1) {
          return Promise.resolve({ data: { id: 1, contact_email: "owner@example.com" }, error: null });
        }
        return Promise.resolve({ data: null, error: null });
      }),
      then: vi.fn((cb: (v: unknown) => void) => {
        cb({ data: null, error: null });
        return Promise.resolve();
      }),
    }));

    const [req, params] = makeDel("1", { contact_email: "owner@example.com" });
    const res = await DELETE(req, params);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
