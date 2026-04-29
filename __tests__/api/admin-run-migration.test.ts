import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

import { GET, POST } from "@/app/api/admin/run-migration/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeGet(bearerToken?: string): NextRequest {
  return new NextRequest("http://localhost/api/admin/run-migration", {
    method: "GET",
    headers: bearerToken ? { authorization: `Bearer ${bearerToken}` } : {},
  });
}

function makePost(bearerToken?: string): NextRequest {
  return new NextRequest("http://localhost/api/admin/run-migration", {
    method: "POST",
    headers: bearerToken ? { authorization: `Bearer ${bearerToken}` } : {},
  });
}

const ALL_EXIST_SELECT = () =>
  Promise.resolve({ error: null, data: [{}] });

const MISSING_SELECT = () =>
  Promise.resolve({ error: { message: "relation does not exist" }, data: null });

function setupAllExist() {
  mockFrom.mockImplementation(() => ({
    select: vi.fn().mockReturnThis(),
    limit: vi.fn().mockImplementation(() => ALL_EXIST_SELECT()),
  }));
}

function setupSomeMissing() {
  let callCount = 0;
  mockFrom.mockImplementation(() => ({
    select: vi.fn().mockReturnThis(),
    limit: vi.fn().mockImplementation(() => {
      callCount++;
      // Make the 3rd table check return an error
      return callCount === 3 ? MISSING_SELECT() : ALL_EXIST_SELECT();
    }),
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
  });

  it("returns 401 when no Authorization header", async () => {
    const res = await GET(makeGet());
    expect(res.status).toBe(401);
  });

  it("returns 401 when Authorization header is wrong", async () => {
    const res = await GET(makeGet("wrong-secret"));
    expect(res.status).toBe(401);
  });

  it("returns 401 when CRON_SECRET env var is not set", async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(makeGet("test-cron-secret"));
    expect(res.status).toBe(401);
  });

  it("returns success=true when all tables exist", async () => {
    setupAllExist();
    const res = await GET(makeGet("test-cron-secret"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.allTablesExist).toBe(true);
    expect(body.missingCount).toBe(0);
    expect(body.message).toMatch(/database is ready/i);
  });

  it("returns success=false when some tables are missing", async () => {
    setupSomeMissing();
    const res = await GET(makeGet("test-cron-secret"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.missingCount).toBeGreaterThan(0);
  });

  it("includes results array with step/status for each check", async () => {
    setupAllExist();
    const res = await GET(makeGet("test-cron-secret"));
    const body = await res.json();
    expect(Array.isArray(body.results)).toBe(true);
    expect(body.results.length).toBeGreaterThan(0);
    expect(body.results[0]).toHaveProperty("step");
    expect(body.results[0]).toHaveProperty("status");
  });
});

// ── POST tests ────────────────────────────────────────────────────────────────

describe("POST /api/admin/run-migration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "test-cron-secret";
  });

  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it("returns 401 when no Authorization header", async () => {
    const res = await POST(makePost());
    expect(res.status).toBe(401);
  });

  it("returns 401 when Authorization header is wrong", async () => {
    const res = await POST(makePost("bad-token"));
    expect(res.status).toBe(401);
  });

  it("accepts INTERNAL_API_KEY as an alternative bearer token", async () => {
    delete process.env.CRON_SECRET;
    process.env.INTERNAL_API_KEY = "internal-key";
    setupAllExist();
    const res = await POST(makePost("internal-key"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    delete process.env.INTERNAL_API_KEY;
  });

  it("returns success=true when all tables exist", async () => {
    setupAllExist();
    const res = await POST(makePost("test-cron-secret"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
