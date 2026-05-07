import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockIsAllowed = vi.fn();
vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  ipKey: (req: NextRequest) => req.headers.get("x-forwarded-for") ?? "unknown",
}));

const mockAdminFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() })),
}));

import { POST } from "@/app/api/affiliate/click/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makePost(body: unknown, ip = "10.0.0.1"): NextRequest {
  return new NextRequest("http://localhost/api/affiliate/click", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
      "user-agent": "Mozilla/5.0",
    },
    body: JSON.stringify(body),
  });
}

const BROKER_ROW = { id: "br-1", slug: "commsec", name: "CommSec", status: "active" };

function makeBrokerChain(result: { data: unknown; error: unknown }) {
  const c: Record<string, unknown> = {};
  c.select = vi.fn(() => c);
  c.eq = vi.fn(() => c);
  c.maybeSingle = vi.fn(() => Promise.resolve(result));
  return c;
}

function makeInsertChain(result: { error: unknown }) {
  const c: Record<string, unknown> = {};
  c.insert = vi.fn(() => Promise.resolve(result));
  return c;
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/affiliate/click", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
  });

  it("returns 429 when rate limit exceeded", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(makePost({ broker_slug: "commsec" }));
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.ok).toBe(false);
  });

  it("returns 400 for invalid JSON", async () => {
    const req = new NextRequest("http://localhost/api/affiliate/click", {
      method: "POST",
      body: "{ bad json }",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when broker_slug is missing", async () => {
    const res = await POST(makePost({}));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/broker_slug/i);
  });

  it("returns 400 when broker_slug is too long (>120 chars)", async () => {
    const res = await POST(makePost({ broker_slug: "x".repeat(121) }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/broker_slug/i);
  });

  it("returns 404 when broker does not exist", async () => {
    mockAdminFrom.mockReturnValue(
      makeBrokerChain({ data: null, error: null }),
    );
    const res = await POST(makePost({ broker_slug: "unknown-broker" }));
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toMatch(/Broker not found/i);
  });

  it("returns 404 when broker lookup has DB error", async () => {
    mockAdminFrom.mockReturnValue(
      makeBrokerChain({ data: null, error: { message: "connection refused" } }),
    );
    const res = await POST(makePost({ broker_slug: "commsec" }));
    expect(res.status).toBe(404);
  });

  it("returns 500 when affiliate_clicks insert fails", async () => {
    let callCount = 0;
    mockAdminFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeBrokerChain({ data: BROKER_ROW, error: null });
      return makeInsertChain({ error: { message: "insert failed" } });
    });
    const res = await POST(makePost({ broker_slug: "commsec" }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/Database error/i);
  });

  it("returns 200 on success with minimal body", async () => {
    let callCount = 0;
    mockAdminFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeBrokerChain({ data: BROKER_ROW, error: null });
      return makeInsertChain({ error: null });
    });
    const res = await POST(makePost({ broker_slug: "commsec" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("returns 200 on success with all optional fields", async () => {
    let callCount = 0;
    mockAdminFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeBrokerChain({ data: BROKER_ROW, error: null });
      return makeInsertChain({ error: null });
    });
    const res = await POST(
      makePost({
        broker_slug: "commsec",
        source: "compare-table",
        page: "/best-online-brokers",
        placement_type: "cta",
        utm_source: "google",
        utm_medium: "cpc",
        utm_campaign: "brokers-au",
        scenario: "compare",
        session_id: "sess-xyz",
        device_type: "mobile",
        layer: "organic",
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("hashes IP before storing — insert call receives ip_hash not raw IP", async () => {
    let callCount = 0;
    let insertArgs: Record<string, unknown> | null = null;
    const mockInsertChain: Record<string, unknown> = {};
    mockInsertChain.insert = vi.fn((row: Record<string, unknown>) => {
      insertArgs = row;
      return Promise.resolve({ error: null });
    });
    mockAdminFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeBrokerChain({ data: BROKER_ROW, error: null });
      return mockInsertChain;
    });
    await POST(makePost({ broker_slug: "commsec" }, "203.0.113.42"));
    expect(insertArgs).not.toBeNull();
    expect((insertArgs as unknown as Record<string, unknown>).ip_hash).not.toBe("203.0.113.42");
    expect(typeof (insertArgs as unknown as Record<string, unknown>).ip_hash).toBe("string");
  });

  it("stores null ip_hash when IP header is missing", async () => {
    let callCount = 0;
    let insertArgs: Record<string, unknown> | null = null;
    const mockInsertChain: Record<string, unknown> = {};
    mockInsertChain.insert = vi.fn((row: Record<string, unknown>) => {
      insertArgs = row;
      return Promise.resolve({ error: null });
    });
    mockAdminFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeBrokerChain({ data: BROKER_ROW, error: null });
      return mockInsertChain;
    });
    const req = new NextRequest("http://localhost/api/affiliate/click", {
      method: "POST",
      body: JSON.stringify({ broker_slug: "commsec" }),
    });
    await POST(req);
    expect((insertArgs as unknown as Record<string, unknown>)?.ip_hash).toBeNull();
  });

  it("rejects optional string fields that exceed max length with 400", async () => {
    // source max is 200 chars — 201-char string fails Zod validation
    const res = await POST(
      makePost({ broker_slug: "commsec", source: "x".repeat(201) }),
    );
    expect(res.status).toBe(400);
  });
});
