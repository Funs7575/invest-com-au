import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockRequireAdmin = vi.fn();
vi.mock("@/lib/require-admin", () => ({
  requireAdmin: () => mockRequireAdmin(),
}));

const mockFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

const mockInvalidateFlagCache = vi.fn();
vi.mock("@/lib/feature-flags", () => ({
  invalidateFlagCache: (...args: unknown[]) => mockInvalidateFlagCache(...args),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

import { GET, POST, PATCH } from "@/app/api/admin/automation/flags/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

const ADMIN_GUARD = { ok: true, email: "admin@test.com", userId: "uid-1" } as const;
const DENY_GUARD = {
  ok: false,
  response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
} as const;

const FLAGS = [
  { flag_key: "new_checkout", enabled: true, rollout_pct: 50, allowlist: [], denylist: [], segments: [] },
  { flag_key: "ab_test_hero", enabled: false, rollout_pct: 0, allowlist: [], denylist: [], segments: [] },
];

function makePatch(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/automation/flags", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makePost(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/automation/flags", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function setupFromMock(opts: {
  selectError?: { message: string } | null;
  upsertError?: { message: string } | null;
  updateError?: { message: string } | null;
} = {}) {
  mockFrom.mockImplementation((table: string) => {
    if (table === "feature_flags") {
      return {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: FLAGS, error: opts.selectError ?? null }),
        upsert: vi.fn().mockResolvedValue({ error: opts.upsertError ?? null }),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: opts.updateError ?? null }),
      };
    }
    if (table === "admin_action_log") {
      return { insert: vi.fn().mockResolvedValue({ error: null }) };
    }
    return {};
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("GET /api/admin/automation/flags", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    setupFromMock();
  });

  it("returns 401 when not admin", async () => {
    mockRequireAdmin.mockResolvedValue(DENY_GUARD);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 200 with rows on success", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.rows).toHaveLength(2);
    expect(json.rows[0].flag_key).toBe("new_checkout");
  });

  it("returns 500 on DB error", async () => {
    setupFromMock({ selectError: { message: "connection timeout" } });
    const res = await GET();
    expect(res.status).toBe(500);
  });
});

describe("POST /api/admin/automation/flags", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    setupFromMock();
  });

  it("returns 401 when not admin", async () => {
    mockRequireAdmin.mockResolvedValue(DENY_GUARD);
    const res = await POST(makePost({ flag_key: "test_flag" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when flag_key is missing", async () => {
    const res = await POST(makePost({ enabled: true }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/flag_key/);
  });

  it("returns 200 ok=true on successful upsert", async () => {
    const res = await POST(makePost({ flag_key: "new_feature", enabled: true, rollout_pct: 25 }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("calls invalidateFlagCache with the flag_key", async () => {
    await POST(makePost({ flag_key: "my_flag" }));
    expect(mockInvalidateFlagCache).toHaveBeenCalledWith("my_flag");
  });

  it("clamps rollout_pct to 0-100 range", async () => {
    let capturedPayload: Record<string, unknown> | null = null;
    mockFrom.mockImplementation((table: string) => {
      if (table === "feature_flags") {
        return {
          upsert: vi.fn().mockImplementation((payload: Record<string, unknown>) => {
            capturedPayload = payload;
            return Promise.resolve({ error: null });
          }),
        };
      }
      if (table === "admin_action_log") {
        return { insert: vi.fn().mockResolvedValue({ error: null }) };
      }
      return {};
    });
    await POST(makePost({ flag_key: "test", rollout_pct: 150 }));
    expect(capturedPayload?.rollout_pct).toBe(100);
  });

  it("defaults enabled to false when not provided", async () => {
    let capturedPayload: Record<string, unknown> | null = null;
    mockFrom.mockImplementation((table: string) => {
      if (table === "feature_flags") {
        return {
          upsert: vi.fn().mockImplementation((payload: Record<string, unknown>) => {
            capturedPayload = payload;
            return Promise.resolve({ error: null });
          }),
        };
      }
      if (table === "admin_action_log") {
        return { insert: vi.fn().mockResolvedValue({ error: null }) };
      }
      return {};
    });
    await POST(makePost({ flag_key: "no_enabled" }));
    expect(capturedPayload?.enabled).toBe(false);
  });

  it("returns 500 on upsert error", async () => {
    setupFromMock({ upsertError: { message: "conflict" } });
    const res = await POST(makePost({ flag_key: "test" }));
    expect(res.status).toBe(500);
  });
});

describe("PATCH /api/admin/automation/flags", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    setupFromMock();
  });

  it("returns 401 when not admin", async () => {
    mockRequireAdmin.mockResolvedValue(DENY_GUARD);
    const res = await PATCH(makePatch({ flag_key: "test" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when flag_key is missing", async () => {
    const res = await PATCH(makePatch({ enabled: false }));
    expect(res.status).toBe(400);
  });

  it("returns 200 ok=true on successful update", async () => {
    const res = await PATCH(makePatch({ flag_key: "my_flag", enabled: false }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("calls invalidateFlagCache after update", async () => {
    await PATCH(makePatch({ flag_key: "feature_x" }));
    expect(mockInvalidateFlagCache).toHaveBeenCalledWith("feature_x");
  });

  it("returns 500 on update error", async () => {
    setupFromMock({ updateError: { message: "update failed" } });
    const res = await PATCH(makePatch({ flag_key: "test" }));
    expect(res.status).toBe(500);
  });
});
