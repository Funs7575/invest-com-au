import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Hoisted mock refs ─────────────────────────────────────────────────────────

const { mockRequireAdvisorSession, mockIsRateLimited, mockAdminFrom } = vi.hoisted(() => ({
  mockRequireAdvisorSession: vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => 20),
  mockIsRateLimited: vi.fn<(...args: unknown[]) => Promise<boolean>>(async () => false),
  mockAdminFrom: vi.fn<(...args: unknown[]) => unknown>(),
}));

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock("@/lib/require-advisor-session", () => ({
  requireAdvisorSession: (...args: unknown[]) => mockRequireAdvisorSession(...args),
}));

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: (...args: unknown[]) => mockIsRateLimited(...args),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

// ── Route under test ──────────────────────────────────────────────────────────

import { GET, PATCH } from "@/app/api/advisor-auth/profile-details/route";

// ── Builder helper ────────────────────────────────────────────────────────────

function makeBuilder(data: unknown = null, error: unknown = null) {
  const c: Record<string, unknown> = {
    then: (r: (v: { data: unknown; error: unknown }) => unknown) =>
      Promise.resolve(r({ data, error })),
  };
  for (const m of [
    "select", "insert", "update", "upsert", "delete", "eq", "neq", "gt", "gte",
    "lt", "lte", "in", "is", "not", "or", "order", "limit", "range", "single",
    "maybeSingle", "filter", "contains", "overlaps",
  ]) {
    c[m] = vi.fn(() => c);
  }
  return c;
}

function makeGet() {
  return new NextRequest(
    "http://localhost/api/advisor-auth/profile-details",
    { method: "GET" },
  );
}

function makePatch(body: unknown) {
  return new NextRequest(
    "http://localhost/api/advisor-auth/profile-details",
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "1.2.3.4" },
      body: JSON.stringify(body),
    },
  );
}

// ── GET Tests ─────────────────────────────────────────────────────────────────

describe("GET /api/advisor-auth/profile-details — auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdvisorSession.mockResolvedValue(20);
  });

  it("returns 401 when not authenticated", async () => {
    mockRequireAdvisorSession.mockResolvedValueOnce(null);
    const res = await GET(makeGet());
    expect(res.status).toBe(401);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/not authenticated/i);
  });
});

describe("GET /api/advisor-auth/profile-details — success", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdvisorSession.mockResolvedValue(20);
  });

  it("returns services and certifications for the advisor", async () => {
    const services = [{ id: 1, name: "SMSF" }];
    const certs = [{ id: 9, name: "CFP" }];

    let call = 0;
    mockAdminFrom.mockImplementation(() => {
      call += 1;
      if (call === 1) return makeBuilder(services, null); // advisor_services
      return makeBuilder(certs, null); // advisor_certifications
    });

    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const body = await res.json() as { services: unknown[]; certifications: unknown[] };
    expect(body.services).toEqual(services);
    expect(body.certifications).toEqual(certs);
  });

  it("returns empty arrays when both queries return null", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder(null, null));
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const body = await res.json() as { services: unknown[]; certifications: unknown[] };
    expect(body.services).toEqual([]);
    expect(body.certifications).toEqual([]);
  });
});

// ── PATCH Tests ───────────────────────────────────────────────────────────────

describe("PATCH /api/advisor-auth/profile-details — auth + rate-limit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockRequireAdvisorSession.mockResolvedValue(20);
  });

  it("returns 429 when rate-limited", async () => {
    mockIsRateLimited.mockResolvedValueOnce(true);
    const res = await PATCH(makePatch({ languages_spoken: ["English"] }));
    expect(res.status).toBe(429);
  });

  it("returns 401 when not authenticated", async () => {
    mockRequireAdvisorSession.mockResolvedValueOnce(null);
    const res = await PATCH(makePatch({ languages_spoken: ["English"] }));
    expect(res.status).toBe(401);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/not authenticated/i);
  });
});

describe("PATCH /api/advisor-auth/profile-details — validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockRequireAdvisorSession.mockResolvedValue(20);
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = new NextRequest(
      "http://localhost/api/advisor-auth/profile-details",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-forwarded-for": "1.2.3.4" },
        body: "not json{",
      },
    );
    const res = await PATCH(req);
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/invalid json/i);
  });

  it("returns 400 for invalid min_client_assets_band value", async () => {
    const res = await PATCH(makePatch({ min_client_assets_band: "notvalid" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when a language string exceeds 50 chars", async () => {
    const longLang = "a".repeat(51);
    const res = await PATCH(makePatch({ languages_spoken: [longLang] }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when specializations array exceeds 20 items", async () => {
    const specs = Array.from({ length: 21 }, (_, i) => `Spec${i}`);
    const res = await PATCH(makePatch({ specializations: specs }));
    expect(res.status).toBe(400);
  });

  it("returns 200 with success:true when body has no recognizable fields (no-op update)", async () => {
    // Empty object → no fields to update → early success
    const res = await PATCH(makePatch({}));
    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean };
    expect(body.success).toBe(true);
  });
});

describe("PATCH /api/advisor-auth/profile-details — DB paths", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockRequireAdvisorSession.mockResolvedValue(20);
  });

  it("returns 200 when update succeeds", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder(null, null));
    const res = await PATCH(makePatch({ languages_spoken: ["English", "Mandarin"] }));
    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean };
    expect(body.success).toBe(true);
  });

  it("returns 500 when DB update fails", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder(null, { message: "db error" }));
    const res = await PATCH(
      makePatch({ min_client_assets_band: "250k" }),
    );
    expect(res.status).toBe(500);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/update failed/i);
  });

  it("accepts null for min_client_assets_band (nullable field)", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder(null, null));
    const res = await PATCH(makePatch({ min_client_assets_band: null }));
    expect(res.status).toBe(200);
  });

  it("accepts a valid min_client_assets_band enum value", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder(null, null));
    const res = await PATCH(makePatch({ min_client_assets_band: "1m" }));
    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean };
    expect(body.success).toBe(true);
  });
});
