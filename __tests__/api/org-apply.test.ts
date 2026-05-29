import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const { mockIsRateLimited } = vi.hoisted(() => ({
  mockIsRateLimited: vi.fn(async (..._a: unknown[]): Promise<boolean> => false),
}));
vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: mockIsRateLimited,
}));

function makeBuilder(data: unknown = null, error: unknown = null) {
  const c: Record<string, unknown> = {
    then: (r: (v: { data: unknown; error: unknown }) => unknown) =>
      Promise.resolve(r({ data, error })),
  };
  for (const m of [
    "select", "insert", "update", "upsert", "delete", "eq", "neq", "gt", "gte",
    "lt", "lte", "in", "is", "not", "or", "order", "limit", "range", "single",
    "maybeSingle", "filter",
  ]) {
    c[m] = vi.fn(() => c);
  }
  return c;
}

const mockFrom = vi.fn((..._a: unknown[]) => makeBuilder());

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

// rate-limit.ts also imports createClient from server — stub it too.
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from: mockFrom,
    auth: { getUser: vi.fn(async () => ({ data: { user: null }, error: null })) },
  })),
}));

import { POST } from "@/app/api/org-apply/route";

const validBody = {
  organisation_name: "AusTech Finance",
  organisation_type: "fintech",
  abn: "12345678901",
  website: "https://austech.com.au",
  contact_name: "Jane Smith",
  contact_email: "jane@austech.com.au",
  contact_phone: "+61400000000",
  bio: "A cutting-edge fintech company.",
  cpd_provider_number: "CPD-001",
};

function makeReq(body?: unknown, ip?: string): NextRequest {
  return new Request("http://localhost/api/org-apply", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      ...(ip ? { "x-forwarded-for": ip } : {}),
    },
  }) as unknown as NextRequest;
}

describe("POST /api/org-apply", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockFrom.mockImplementation((..._a: unknown[]) => makeBuilder(null, null));
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = new Request("http://localhost/api/org-apply", {
      method: "POST",
      body: "bad-json{",
      headers: { "content-type": "application/json" },
    }) as unknown as NextRequest;
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when organisation_name is missing", async () => {
    const { organisation_name: _n, ...noName } = validBody;
    const res = await POST(makeReq(noName));
    expect(res.status).toBe(400);
  });

  it("returns 400 when organisation_name is too short (< 2 chars)", async () => {
    const res = await POST(makeReq({ ...validBody, organisation_name: "X" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when organisation_type is not in the allowed enum", async () => {
    const res = await POST(makeReq({ ...validBody, organisation_type: "hedge_fund" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when website is not a valid URL", async () => {
    const res = await POST(makeReq({ ...validBody, website: "not-a-url" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when contact_email is not a valid email", async () => {
    const res = await POST(makeReq({ ...validBody, contact_email: "not-an-email" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when contact_name is too short (< 2 chars)", async () => {
    const res = await POST(makeReq({ ...validBody, contact_name: "J" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when bio exceeds 2000 characters", async () => {
    const res = await POST(makeReq({ ...validBody, bio: "x".repeat(2001) }));
    expect(res.status).toBe(400);
  });

  it("returns 429 when rate limit is exceeded", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    const res = await POST(makeReq(validBody, "203.0.113.1"));
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.error).toMatch(/too many requests/i);
  });

  it("passes IP from x-forwarded-for to rate limiter", async () => {
    const res = await POST(makeReq(validBody, "1.2.3.4"));
    expect(res.status).toBe(201);
    expect(mockIsRateLimited).toHaveBeenCalledWith("org_apply_ip:1.2.3.4", 5, 3600);
  });

  it("uses 'unknown' as IP key when header is absent", async () => {
    const res = await POST(makeReq(validBody)); // no IP header
    expect(res.status).toBe(201);
    expect(mockIsRateLimited).toHaveBeenCalledWith("org_apply_ip:unknown", 5, 3600);
  });

  it("uses first IP when x-forwarded-for contains multiple addresses", async () => {
    const res = await POST(makeReq(validBody, "5.6.7.8, 10.0.0.1"));
    expect(res.status).toBe(201);
    expect(mockIsRateLimited).toHaveBeenCalledWith("org_apply_ip:5.6.7.8", 5, 3600);
  });

  it("returns 201 for a valid submission with all optional fields", async () => {
    const res = await POST(makeReq(validBody));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it("returns 201 with only required fields (no optional fields)", async () => {
    const minimal = {
      organisation_name: "Minimal Org",
      organisation_type: "other",
      website: "https://minimal.org",
      contact_name: "Sam Jones",
      contact_email: "sam@minimal.org",
    };
    const res = await POST(makeReq(minimal));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it("accepts all valid organisation_type enum values", async () => {
    const types = [
      "training_provider",
      "cpd_provider",
      "compliance",
      "fintech",
      "industry_body",
      "law_firm",
      "accounting_firm",
      "other",
    ] as const;
    for (const org_type of types) {
      const res = await POST(makeReq({ ...validBody, organisation_type: org_type }));
      expect(res.status).toBe(201);
    }
  });

  it("returns 500 when database insert fails", async () => {
    mockFrom.mockImplementation((..._a: unknown[]) => makeBuilder(null, { message: "duplicate key" }));
    const res = await POST(makeReq(validBody));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/failed to submit/i);
  });
});
