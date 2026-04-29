import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockGetUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: () => mockGetUser() },
  })),
}));

const mockFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock("@/lib/admin", () => ({
  getAdminEmails: () => ["admin@test.com"],
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

const mockInvalidateCache = vi.fn();
vi.mock("@/lib/admin/classifier-config", () => ({
  invalidateClassifierConfigCache: (...a: unknown[]) => mockInvalidateCache(...a),
}));

import { GET, POST } from "@/app/api/admin/automation/config/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

const ADMIN_USER = { email: "admin@test.com" };
const NON_ADMIN = { email: "user@other.com" };
const ANON_USER = null;

function makePost(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/automation/config", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const VALID_POST = {
  classifier: "text_moderation",
  thresholdName: "spam_score",
  value: 0.75,
};

// ── GET ───────────────────────────────────────────────────────────────────────

describe("GET /api/admin/automation/config", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated (no user)", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ANON_USER } });
    const req = new NextRequest("http://localhost/api/admin/automation/config");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns 403 when non-admin email", async () => {
    mockGetUser.mockResolvedValue({ data: { user: NON_ADMIN } });
    const req = new NextRequest("http://localhost/api/admin/automation/config");
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it("returns 200 with rows list", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER } });
    const rows = [
      { id: 1, classifier: "text_moderation", threshold_name: "spam_score", value: 0.7 },
    ];
    const okResult = Promise.resolve({ data: rows, error: null });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnValue({ order: vi.fn().mockReturnValue(okResult) }),
    });
    const req = new NextRequest("http://localhost/api/admin/automation/config");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("rows");
    expect(body.rows).toHaveLength(1);
  });

  it("returns 500 on DB error", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER } });
    const errorResult = Promise.resolve({ data: null, error: { message: "db_error" } });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnValue({ order: vi.fn().mockReturnValue(errorResult) }),
    });
    const req = new NextRequest("http://localhost/api/admin/automation/config");
    const res = await GET(req);
    expect(res.status).toBe(500);
  });
});

// ── POST ──────────────────────────────────────────────────────────────────────

describe("POST /api/admin/automation/config", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ANON_USER } });
    const res = await POST(makePost(VALID_POST));
    expect(res.status).toBe(401);
  });

  it("returns 403 when non-admin email", async () => {
    mockGetUser.mockResolvedValue({ data: { user: NON_ADMIN } });
    const res = await POST(makePost(VALID_POST));
    expect(res.status).toBe(403);
  });

  it("returns 400 when classifier is missing", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER } });
    const res = await POST(makePost({ thresholdName: "spam_score", value: 0.75 }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when value is missing", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER } });
    const res = await POST(makePost({ classifier: "text_moderation", thresholdName: "spam_score" }));
    expect(res.status).toBe(400);
  });

  it("rejects value below existing min_value", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER } });
    // Existing row has min_value=0.5
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: 1, min_value: 0.5, max_value: 1.0 } }),
    });
    const res = await POST(makePost({ ...VALID_POST, value: 0.1 }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/minimum/i);
  });

  it("rejects value above existing max_value", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER } });
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: 1, min_value: 0.0, max_value: 0.9 } }),
    });
    const res = await POST(makePost({ ...VALID_POST, value: 0.95 }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/maximum/i);
  });

  it("upserts config, invalidates cache, writes audit log", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER } });
    // Call order: maybeSingle (existing), upsert, audit insert
    mockFrom
      .mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null }),
      })
      .mockReturnValueOnce({
        upsert: vi.fn().mockResolvedValue({ error: null }),
      })
      .mockReturnValueOnce({
        insert: vi.fn().mockResolvedValue({ error: null }),
      });

    const res = await POST(makePost(VALID_POST));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(mockInvalidateCache).toHaveBeenCalledWith("text_moderation");
  });

  it("returns 500 on upsert error", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER } });
    mockFrom
      .mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null }),
      })
      .mockReturnValueOnce({
        upsert: vi.fn().mockResolvedValue({ error: { message: "upsert_failed" } }),
      });
    const res = await POST(makePost(VALID_POST));
    expect(res.status).toBe(500);
  });

  it("audit log writes to admin_action_log with action='config'", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER } });
    const auditInsert = vi.fn().mockResolvedValue({ error: null });
    mockFrom
      .mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null }),
      })
      .mockReturnValueOnce({ upsert: vi.fn().mockResolvedValue({ error: null }) })
      .mockReturnValueOnce({ insert: auditInsert });
    await POST(makePost(VALID_POST));
    expect(mockFrom).toHaveBeenCalledWith("admin_action_log");
    expect(auditInsert).toHaveBeenCalledWith(
      expect.objectContaining({ action: "config", feature: "text_moderation" })
    );
  });
});
