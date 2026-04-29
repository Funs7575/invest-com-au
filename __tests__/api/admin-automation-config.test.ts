import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockGetUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
  }),
}));

const mockFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock("@/lib/admin", () => ({
  getAdminEmails: vi.fn(() => ["admin@test.com"]),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

const mockInvalidateClassifierConfigCache = vi.fn();
vi.mock("@/lib/admin/classifier-config", () => ({
  invalidateClassifierConfigCache: (...args: unknown[]) =>
    mockInvalidateClassifierConfigCache(...args),
}));

import { GET, POST } from "@/app/api/admin/automation/config/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

function setupAuth(email: string | null = "admin@test.com") {
  mockGetUser.mockResolvedValue({
    data: { user: email ? { email } : null },
    error: null,
  });
}

const CONFIG_ROWS = [
  {
    id: 1,
    classifier: "text_moderation",
    threshold_name: "min_score",
    value: 0.5,
    min_value: 0,
    max_value: 1,
    description: "Minimum score for flagging",
    updated_by: "admin@test.com",
    updated_at: "2026-01-01T00:00:00Z",
  },
];

function makeGet(): NextRequest {
  return new NextRequest("http://localhost/api/admin/automation/config");
}

function makePost(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/automation/config", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeConfigChain(resolvedData: unknown, resolvedError: unknown = null) {
  // Thenable chain builder for .select().order().order() terminal awaits
  const chain: Record<string, unknown> = {
    select: vi.fn(() => chain),
    order: vi.fn(() => chain),
    then: (
      onFulfilled: (v: unknown) => unknown,
      onRejected?: (v: unknown) => unknown
    ) =>
      Promise.resolve({ data: resolvedData, error: resolvedError }).then(
        onFulfilled,
        onRejected
      ),
  };
  return chain;
}

// ── GET tests ─────────────────────────────────────────────────────────────────

describe("GET /api/admin/automation/config", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when no user session", async () => {
    setupAuth(null);
    const res = await GET(makeGet());
    expect(res.status).toBe(401);
  });

  it("returns 403 when user is not admin", async () => {
    setupAuth("notadmin@test.com");
    const res = await GET(makeGet());
    expect(res.status).toBe(403);
  });

  it("returns classifier config rows", async () => {
    setupAuth();
    mockFrom.mockImplementation(() => makeConfigChain(CONFIG_ROWS));
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.rows).toHaveLength(1);
    expect(body.rows[0].classifier).toBe("text_moderation");
  });

  it("returns 500 on DB error", async () => {
    setupAuth();
    mockFrom.mockImplementation(() =>
      makeConfigChain(null, { message: "db_down" })
    );
    const res = await GET(makeGet());
    expect(res.status).toBe(500);
  });

  it("returns empty rows when no config exists", async () => {
    setupAuth();
    mockFrom.mockImplementation(() => makeConfigChain(null));
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.rows).toEqual([]);
  });
});

// ── POST tests ────────────────────────────────────────────────────────────────

describe("POST /api/admin/automation/config", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when no user session", async () => {
    setupAuth(null);
    const res = await POST(
      makePost({ classifier: "text", thresholdName: "min", value: 0.5 })
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 when user is not admin", async () => {
    setupAuth("notadmin@test.com");
    const res = await POST(
      makePost({ classifier: "text", thresholdName: "min", value: 0.5 })
    );
    expect(res.status).toBe(403);
  });

  it("returns 400 when classifier is missing", async () => {
    setupAuth();
    const res = await POST(makePost({ thresholdName: "min", value: 0.5 }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/missing/i);
  });

  it("returns 400 when thresholdName is missing", async () => {
    setupAuth();
    const res = await POST(makePost({ classifier: "text", value: 0.5 }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when value is missing", async () => {
    setupAuth();
    const res = await POST(makePost({ classifier: "text", thresholdName: "min" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when value is below configured minimum", async () => {
    setupAuth();
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi
        .fn()
        .mockResolvedValue({ data: { id: 1, min_value: 0.1, max_value: 1 }, error: null }),
    }));
    const res = await POST(
      makePost({ classifier: "text_moderation", thresholdName: "min_score", value: 0.05 })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/below/i);
  });

  it("returns 400 when value is above configured maximum", async () => {
    setupAuth();
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi
        .fn()
        .mockResolvedValue({ data: { id: 1, min_value: 0, max_value: 1 }, error: null }),
    }));
    const res = await POST(
      makePost({ classifier: "text_moderation", thresholdName: "min_score", value: 1.5 })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/above/i);
  });

  it("upserts config and invalidates cache on success", async () => {
    setupAuth();
    let classifierCallCount = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === "classifier_config") {
        classifierCallCount++;
        if (classifierCallCount === 1) {
          // bounds check — no existing row
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        // upsert
        return { upsert: vi.fn().mockResolvedValue({ error: null }) };
      }
      if (table === "admin_action_log") {
        return { insert: vi.fn().mockResolvedValue({ error: null }) };
      }
      return {};
    });
    const res = await POST(
      makePost({ classifier: "text_moderation", thresholdName: "min_score", value: 0.7 })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(mockInvalidateClassifierConfigCache).toHaveBeenCalledWith("text_moderation");
  });

  it("returns 500 when upsert fails", async () => {
    setupAuth();
    let classifierCallCount = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === "classifier_config") {
        classifierCallCount++;
        if (classifierCallCount === 1) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        return {
          upsert: vi
            .fn()
            .mockResolvedValue({ error: { message: "constraint_violation" } }),
        };
      }
      return {};
    });
    const res = await POST(
      makePost({ classifier: "text_moderation", thresholdName: "min_score", value: 0.7 })
    );
    expect(res.status).toBe(500);
    expect(mockInvalidateClassifierConfigCache).not.toHaveBeenCalled();
  });
});
