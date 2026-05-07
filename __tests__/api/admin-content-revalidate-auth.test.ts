/**
 * A-93 auth migration tests — verify that requireCronAuth guards the three
 * admin routes that previously used open-coded CRON_SECRET comparisons.
 *
 * Scope: auth rejection only. Full integration tests for business logic are
 * out of scope (generate-draft calls Anthropic, calendar hits Supabase, etc).
 * What matters here is that (a) missing auth → 401, (b) wrong key → 401,
 * (c) valid CRON_SECRET → request proceeds past auth, (d) service-role key
 * is no longer accepted by admin/revalidate (regression guard for A-91-style
 * credential exposure).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  })),
}));

vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
}));

// Stub fetch so generate-draft doesn't actually call Anthropic.
const mockFetch = vi.fn().mockResolvedValue(
  new Response(JSON.stringify({ content: [{ type: "text", text: "draft" }] }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  }),
);
vi.stubGlobal("fetch", mockFetch);

import { POST as generateDraftPOST } from "@/app/api/admin/content/generate-draft/route";
import {
  GET as calendarGET,
  POST as calendarPOST,
} from "@/app/api/admin/content/calendar/route";
import { POST as revalidatePOST } from "@/app/api/admin/revalidate/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

const VALID_CRON_SECRET = "test-cron-secret-long-enough-16";
const SERVICE_ROLE_KEY = "fake-service-role-key-that-must-not-work";

function makeRequest(
  method: string,
  url: string,
  body?: unknown,
  authHeader?: string,
): NextRequest {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (authHeader !== undefined) headers["authorization"] = authHeader;
  return new NextRequest(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

// ── generate-draft ─────────────────────────────────────────────────────────────

describe("POST /api/admin/content/generate-draft — auth (A-93)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = VALID_CRON_SECRET;
    process.env.ANTHROPIC_API_KEY = "test-api-key";
  });

  afterEach(() => {
    delete process.env.CRON_SECRET;
    delete process.env.ANTHROPIC_API_KEY;
  });

  it("returns 401 when no auth header", async () => {
    const res = await generateDraftPOST(
      makeRequest("POST", "http://localhost/api/admin/content/generate-draft", { calendarId: 1 }),
    );
    expect(res.status).toBe(401);
  });

  it("returns 401 when wrong key", async () => {
    const res = await generateDraftPOST(
      makeRequest("POST", "http://localhost/api/admin/content/generate-draft", { calendarId: 1 }, "Bearer wrong-key"),
    );
    expect(res.status).toBe(401);
  });

  it("returns 500 when CRON_SECRET not set (fail-closed)", async () => {
    delete process.env.CRON_SECRET;
    const res = await generateDraftPOST(
      makeRequest("POST", "http://localhost/api/admin/content/generate-draft", { calendarId: 1 }, `Bearer ${VALID_CRON_SECRET}`),
    );
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toMatch(/misconfigured/i);
  });

  it("passes auth with valid CRON_SECRET", async () => {
    const res = await generateDraftPOST(
      makeRequest("POST", "http://localhost/api/admin/content/generate-draft", { calendarId: 1 }, `Bearer ${VALID_CRON_SECRET}`),
    );
    // Auth passed — we get past the 401 gate (business logic may fail without real DB)
    expect(res.status).not.toBe(401);
  });
});

// ── calendar ───────────────────────────────────────────────────────────────────

describe("GET /api/admin/content/calendar — auth (A-93)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = VALID_CRON_SECRET;
  });

  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it("returns 401 when no auth header", async () => {
    const res = await calendarGET(
      makeRequest("GET", "http://localhost/api/admin/content/calendar"),
    );
    expect(res.status).toBe(401);
  });

  it("returns 401 when wrong key", async () => {
    const res = await calendarGET(
      makeRequest("GET", "http://localhost/api/admin/content/calendar", undefined, "Bearer wrong-key"),
    );
    expect(res.status).toBe(401);
  });

  it("passes auth with valid CRON_SECRET", async () => {
    const res = await calendarGET(
      makeRequest("GET", "http://localhost/api/admin/content/calendar", undefined, `Bearer ${VALID_CRON_SECRET}`),
    );
    expect(res.status).not.toBe(401);
  });
});

describe("POST /api/admin/content/calendar — auth (A-93)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = VALID_CRON_SECRET;
  });

  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it("returns 401 when no auth header", async () => {
    const res = await calendarPOST(
      makeRequest("POST", "http://localhost/api/admin/content/calendar", { title: "Test" }),
    );
    expect(res.status).toBe(401);
  });

  it("passes auth with valid CRON_SECRET", async () => {
    const res = await calendarPOST(
      makeRequest("POST", "http://localhost/api/admin/content/calendar", { title: "Test" }, `Bearer ${VALID_CRON_SECRET}`),
    );
    expect(res.status).not.toBe(401);
  });
});

// ── admin/revalidate ───────────────────────────────────────────────────────────

describe("POST /api/admin/revalidate — auth (A-93, A-91 regression)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = VALID_CRON_SECRET;
    process.env.SUPABASE_SERVICE_ROLE_KEY = SERVICE_ROLE_KEY;
  });

  afterEach(() => {
    delete process.env.CRON_SECRET;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it("returns 401 when no auth header", async () => {
    const res = await revalidatePOST(
      makeRequest("POST", "http://localhost/api/admin/revalidate", { tags: ["brokers"] }),
    );
    expect(res.status).toBe(401);
  });

  it("returns 401 when wrong key", async () => {
    const res = await revalidatePOST(
      makeRequest("POST", "http://localhost/api/admin/revalidate", { tags: ["brokers"] }, "Bearer bad-key"),
    );
    expect(res.status).toBe(401);
  });

  it("returns 401 when service-role key used (regression: must not be accepted)", async () => {
    const res = await revalidatePOST(
      makeRequest("POST", "http://localhost/api/admin/revalidate", { tags: ["brokers"] }, `Bearer ${SERVICE_ROLE_KEY}`),
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 when tags array is missing", async () => {
    const res = await revalidatePOST(
      makeRequest("POST", "http://localhost/api/admin/revalidate", {}, `Bearer ${VALID_CRON_SECRET}`),
    );
    expect(res.status).toBe(400);
  });

  it("returns 200 and calls revalidateTag on valid request", async () => {
    const { revalidateTag } = await import("next/cache");
    const res = await revalidatePOST(
      makeRequest("POST", "http://localhost/api/admin/revalidate", { tags: ["brokers", "articles"] }, `Bearer ${VALID_CRON_SECRET}`),
    );
    expect(res.status).toBe(200);
    expect(revalidateTag).toHaveBeenCalledWith("brokers", expect.anything());
    expect(revalidateTag).toHaveBeenCalledWith("articles", expect.anything());
  });
});
