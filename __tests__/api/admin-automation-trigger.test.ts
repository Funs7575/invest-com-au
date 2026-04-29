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

vi.mock("@/lib/url", () => ({
  getSiteUrl: vi.fn(() => "https://invest.com.au"),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

// FEATURE_CONFIG — provide a minimal set with known cronNames
vi.mock("@/lib/admin/automation-metrics", () => ({
  FEATURE_CONFIG: {
    auto_resolve: { cronName: "auto-resolve-disputes" },
    advisor_dunning: { cronName: "advisor-dunning" },
    no_cron: { cronName: null },
  },
}));

// Global fetch mock
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { POST } from "@/app/api/admin/automation/trigger/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makePost(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/automation/trigger", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function setupAuth(email: string | null = "admin@test.com") {
  mockGetUser.mockResolvedValue({
    data: { user: email ? { email } : null },
    error: null,
  });
}

function setupFetchSuccess(data: unknown = { ok: true, processed: 3 }) {
  mockFetch.mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve(data),
  });
}

function setupAuditMock() {
  mockFrom.mockImplementation((table: string) => {
    if (table === "admin_audit_log") {
      return {
        insert: vi.fn().mockResolvedValue({ error: null }).mockReturnThis(),
        then: vi.fn().mockImplementation((cb: (v: { error: null }) => unknown) => cb({ error: null })),
      };
    }
    return {};
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/admin/automation/trigger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "cron-test-secret";
  });

  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it("returns 401 when no user session", async () => {
    setupAuth(null);
    const res = await POST(makePost({ cron: "auto-resolve-disputes" }));
    expect(res.status).toBe(401);
  });

  it("returns 403 when user is not an admin", async () => {
    setupAuth("notadmin@test.com");
    const res = await POST(makePost({ cron: "auto-resolve-disputes" }));
    expect(res.status).toBe(403);
  });

  it("returns 400 when cron name is missing", async () => {
    setupAuth();
    const res = await POST(makePost({}));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/missing cron/i);
  });

  it("returns 400 when cron name is not on the allowlist", async () => {
    setupAuth();
    const res = await POST(makePost({ cron: "some-unknown-cron" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/not on the allowlist/i);
  });

  it("returns 500 when CRON_SECRET is not configured", async () => {
    setupAuth();
    delete process.env.CRON_SECRET;
    const res = await POST(makePost({ cron: "auto-resolve-disputes" }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/CRON_SECRET/i);
  });

  it("fires a GET request to the cron route with Bearer token", async () => {
    setupAuth();
    setupFetchSuccess();
    setupAuditMock();
    await POST(makePost({ cron: "auto-resolve-disputes" }));
    expect(mockFetch).toHaveBeenCalledWith(
      "https://invest.com.au/api/cron/auto-resolve-disputes",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer cron-test-secret",
          "X-Admin-Manual": "1",
          "X-Admin-Email": "admin@test.com",
        }),
      })
    );
  });

  it("returns 200 with summary of numeric cron response keys", async () => {
    setupAuth();
    setupFetchSuccess({ ok: true, processed: 5, skipped: 2 });
    setupAuditMock();
    const res = await POST(makePost({ cron: "auto-resolve-disputes" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.summary).toMatch(/processed=5|skipped=2/);
  });

  it("returns 502 when cron route returns non-ok status", async () => {
    setupAuth();
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: "cron_failed" }),
    });
    const res = await POST(makePost({ cron: "auto-resolve-disputes" }));
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.ok).toBe(false);
  });

  it("returns 500 when fetch throws", async () => {
    setupAuth();
    mockFetch.mockRejectedValue(new Error("network_timeout"));
    const res = await POST(makePost({ cron: "auto-resolve-disputes" }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("network_timeout");
  });
});
