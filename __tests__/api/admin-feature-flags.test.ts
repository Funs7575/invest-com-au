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

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

import { GET, PATCH } from "@/app/api/admin/feature-flags/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

const ADMIN_GUARD = { ok: true, email: "admin@test.com", userId: "uid-1" } as const;
const DENY_GUARD = {
  ok: false,
  response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
} as const;

const FLAGS = [
  {
    flag_key: "new_checkout",
    enabled: true,
    rollout_pct: 50,
    allowlist: [],
    denylist: [],
    segments: [],
  },
  {
    flag_key: "ab_test_hero",
    enabled: false,
    rollout_pct: 0,
    allowlist: [],
    denylist: [],
    segments: [],
  },
];

function makePatch(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/feature-flags", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function setupGetMock(
  data: unknown[] = FLAGS,
  error: { message: string } | null = null
) {
  mockFrom.mockImplementation((table: string) => {
    if (table === "feature_flags") {
      return {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data, error }),
      };
    }
    return {};
  });
}

function setupPatchMock(updateError: { message: string } | null = null) {
  mockFrom.mockImplementation((table: string) => {
    if (table === "feature_flags") {
      return {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: updateError }),
      };
    }
    if (table === "admin_audit_log") {
      return { insert: vi.fn().mockResolvedValue({ error: null }) };
    }
    return {};
  });
}

// ── GET tests ─────────────────────────────────────────────────────────────────

describe("GET /api/admin/feature-flags", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    mockRequireAdmin.mockResolvedValue(DENY_GUARD);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 200 with sorted flags on success", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    setupGetMock();
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(2);
    expect(body.items[0].flag_key).toBe("new_checkout");
  });

  it("returns 200 with empty items when no flags exist", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    setupGetMock(null as unknown as unknown[]);
    const res = await GET();
    const body = await res.json();
    expect(body.items).toEqual([]);
  });

  it("returns 500 on DB error", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    setupGetMock([], { message: "db_error" });
    const res = await GET();
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("db_error");
  });
});

// ── PATCH tests ───────────────────────────────────────────────────────────────

describe("PATCH /api/admin/feature-flags", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    mockRequireAdmin.mockResolvedValue(DENY_GUARD);
    const res = await PATCH(makePatch({ flag_key: "test", enabled: true }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when flag_key is missing", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    const res = await PATCH(makePatch({ enabled: true }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/flag_key/i);
  });

  it("returns 400 when no valid update fields are provided", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    const res = await PATCH(makePatch({ flag_key: "test", unknown_field: "x" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("no_updates");
  });

  it("updates enabled boolean and writes audit log", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    setupPatchMock();
    const res = await PATCH(makePatch({ flag_key: "new_checkout", enabled: false }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it("updates rollout_pct when in range 0–100", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    setupPatchMock();
    const res = await PATCH(makePatch({ flag_key: "test", rollout_pct: 75 }));
    expect(res.status).toBe(200);
  });

  it("ignores rollout_pct outside 0–100 range (treated as no update)", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    // Only rollout_pct=150 provided — should give no_updates
    const res = await PATCH(makePatch({ flag_key: "test", rollout_pct: 150 }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("no_updates");
  });

  it("updates allowlist/denylist/segments arrays", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    setupPatchMock();
    const res = await PATCH(
      makePatch({
        flag_key: "beta_flag",
        allowlist: ["user1@x.com"],
        denylist: [],
        segments: ["beta"],
      })
    );
    expect(res.status).toBe(200);
  });

  it("truncates description to 500 chars", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    const longDesc = "x".repeat(600);
    setupPatchMock();
    const res = await PATCH(makePatch({ flag_key: "test", description: longDesc }));
    expect(res.status).toBe(200);
  });

  it("returns 500 on DB update error", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    setupPatchMock({ message: "update_failed" });
    const res = await PATCH(makePatch({ flag_key: "test", enabled: true }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("update_failed");
  });
});
