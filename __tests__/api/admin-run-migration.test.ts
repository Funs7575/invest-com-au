import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

import { GET, POST } from "@/app/api/admin/run-migration/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRequest(method: "GET" | "POST", token?: string): NextRequest {
  return new NextRequest("http://localhost/api/admin/run-migration", {
    method,
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
}

function setupAllExist() {
  mockFrom.mockImplementation(() => ({
    select: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ error: null }),
  }));
}

function setupAllMissing() {
  mockFrom.mockImplementation(() => ({
    select: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ error: { message: "table_missing" } }),
  }));
}

// ── GET tests ─────────────────────────────────────────────────────────────────

describe("GET /api/admin/run-migration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "test-cron-secret";
  });

  afterEach(() => {
    delete process.env.CRON_SECRET;
    delete process.env.INTERNAL_API_KEY;
  });

  it("returns 401 when authorization header is absent", async () => {
    const res = await GET(makeRequest("GET"));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  it("returns 401 when token does not match CRON_SECRET", async () => {
    const res = await GET(makeRequest("GET", "wrong-token"));
    expect(res.status).toBe(401);
  });

  it("returns 401 when CRON_SECRET env is not set", async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(makeRequest("GET", "any-token"));
    expect(res.status).toBe(401);
  });

  it("returns 200 with allTablesExist=true when all tables exist", async () => {
    setupAllExist();
    const res = await GET(makeRequest("GET", "test-cron-secret"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.allTablesExist).toBe(true);
    expect(body.missingCount).toBe(0);
    expect(body.results).toBeDefined();
    expect(body.message).toMatch(/database is ready/i);
  });

  it("returns 200 with success=false when tables are missing", async () => {
    setupAllMissing();
    const res = await GET(makeRequest("GET", "test-cron-secret"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.allTablesExist).toBe(false);
    expect(body.missingCount).toBeGreaterThan(0);
    expect(body.message).toMatch(/missing/i);
  });

  it("results array has entries for all checked tables", async () => {
    setupAllExist();
    const res = await GET(makeRequest("GET", "test-cron-secret"));
    const body = await res.json();
    expect(Array.isArray(body.results)).toBe(true);
    // 5 table checks + brokers revenue columns + professionals tier columns = 7
    expect(body.results.length).toBeGreaterThanOrEqual(7);
  });
});

// ── POST tests ────────────────────────────────────────────────────────────────

describe("POST /api/admin/run-migration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "test-cron-secret";
    process.env.INTERNAL_API_KEY = "internal-api-key";
  });

  afterEach(() => {
    delete process.env.CRON_SECRET;
    delete process.env.INTERNAL_API_KEY;
  });

  it("returns 401 when no auth provided", async () => {
    const res = await POST(makeRequest("POST"));
    expect(res.status).toBe(401);
  });

  it("returns 401 when token is wrong", async () => {
    const res = await POST(makeRequest("POST", "bad-token"));
    expect(res.status).toBe(401);
  });

  it("accepts CRON_SECRET for POST and returns check results", async () => {
    setupAllExist();
    const res = await POST(makeRequest("POST", "test-cron-secret"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("accepts INTERNAL_API_KEY as fallback when CRON_SECRET absent", async () => {
    delete process.env.CRON_SECRET;
    setupAllExist();
    const res = await POST(makeRequest("POST", "internal-api-key"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("POST result matches GET result given same DB state", async () => {
    setupAllMissing();
    const [getRes, postRes] = await Promise.all([
      GET(makeRequest("GET", "test-cron-secret")),
      POST(makeRequest("POST", "test-cron-secret")),
    ]);
    const [getBody, postBody] = await Promise.all([getRes.json(), postRes.json()]);
    expect(getBody.success).toBe(postBody.success);
    expect(getBody.missingCount).toBe(postBody.missingCount);
  });
});
