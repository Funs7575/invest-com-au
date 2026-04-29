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

const mockInvalidateKillSwitchCache = vi.fn();
vi.mock("@/lib/admin/classifier-config", () => ({
  invalidateKillSwitchCache: () => mockInvalidateKillSwitchCache(),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

import { GET, POST } from "@/app/api/admin/automation/kill-switch/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

const KILL_SWITCHES = [
  {
    feature: "global",
    disabled: false,
    reason: null,
    disabled_by: null,
    disabled_at: null,
  },
  {
    feature: "lead_routing",
    disabled: true,
    reason: "maintenance",
    disabled_by: "admin@test.com",
    disabled_at: "2026-04-29T00:00:00Z",
  },
];

function makePost(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/automation/kill-switch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeGet(): NextRequest {
  return new NextRequest("http://localhost/api/admin/automation/kill-switch");
}

function setupAuth(email: string | null = "admin@test.com", authError = false) {
  mockGetUser.mockResolvedValue({
    data: { user: email ? { email } : null },
    error: authError ? { message: "auth_error" } : null,
  });
}

function setupGetMock(data = KILL_SWITCHES, error: { message: string } | null = null) {
  mockFrom.mockImplementation((table: string) => {
    if (table === "automation_kill_switches") {
      return {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data, error }),
      };
    }
    return {};
  });
}

function setupPostMock(upsertError: { message: string } | null = null) {
  mockFrom.mockImplementation((table: string) => {
    if (table === "automation_kill_switches") {
      return {
        upsert: vi.fn().mockResolvedValue({ error: upsertError }),
      };
    }
    if (table === "admin_action_log" || table === "admin_audit_log") {
      return { insert: vi.fn().mockResolvedValue({ error: null }) };
    }
    return {};
  });
}

// ── GET tests ─────────────────────────────────────────────────────────────────

describe("GET /api/admin/automation/kill-switch", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when no user session", async () => {
    setupAuth(null);
    const res = await GET(makeGet());
    expect(res.status).toBe(401);
  });

  it("returns 401 when user email is missing", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { email: null } }, error: null });
    const res = await GET(makeGet());
    expect(res.status).toBe(401);
  });

  it("returns 403 when user is not an admin", async () => {
    setupAuth("notadmin@test.com");
    const res = await GET(makeGet());
    expect(res.status).toBe(403);
  });

  it("returns 200 with kill switch rows", async () => {
    setupAuth();
    setupGetMock();
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.rows).toHaveLength(2);
    expect(body.rows[0].feature).toBe("global");
  });

  it("returns 200 with empty rows when none exist", async () => {
    setupAuth();
    setupGetMock(null as unknown as typeof KILL_SWITCHES);
    const res = await GET(makeGet());
    const body = await res.json();
    expect(body.rows).toEqual([]);
  });

  it("returns 500 on DB fetch error", async () => {
    setupAuth();
    setupGetMock(KILL_SWITCHES, { message: "fetch_failed" });
    const res = await GET(makeGet());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("fetch_failed");
  });
});

// ── POST tests ────────────────────────────────────────────────────────────────

describe("POST /api/admin/automation/kill-switch", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when no user session", async () => {
    setupAuth(null);
    const res = await POST(makePost({ feature: "lead_routing", disabled: true }));
    expect(res.status).toBe(401);
  });

  it("returns 403 when user is not an admin", async () => {
    setupAuth("notadmin@test.com");
    const res = await POST(makePost({ feature: "lead_routing", disabled: true }));
    expect(res.status).toBe(403);
  });

  it("returns 400 when feature is missing", async () => {
    setupAuth();
    const res = await POST(makePost({ disabled: true }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/feature/i);
  });

  it("flips kill switch to disabled and invalidates cache", async () => {
    setupAuth();
    setupPostMock();
    const res = await POST(makePost({ feature: "lead_routing", disabled: true, reason: "maintenance" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(mockInvalidateKillSwitchCache).toHaveBeenCalledOnce();
  });

  it("flips kill switch to enabled (clears disabled_by/disabled_at)", async () => {
    setupAuth();
    setupPostMock();
    const res = await POST(makePost({ feature: "lead_routing", disabled: false }));
    expect(res.status).toBe(200);
    expect(mockInvalidateKillSwitchCache).toHaveBeenCalledOnce();
  });

  it("accepts global feature to disable all automation", async () => {
    setupAuth();
    setupPostMock();
    const res = await POST(makePost({ feature: "global", disabled: true, reason: "incident" }));
    expect(res.status).toBe(200);
  });

  it("returns 500 on upsert error", async () => {
    setupAuth();
    setupPostMock({ message: "upsert_failed" });
    const res = await POST(makePost({ feature: "lead_routing", disabled: true }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("upsert_failed");
    expect(mockInvalidateKillSwitchCache).not.toHaveBeenCalled();
  });
});
